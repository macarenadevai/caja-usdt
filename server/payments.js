/**
 * payments.js — Payment detector + transfer confirmation (Phase 2, fix v2)
 *
 * - Payments: scans USDT Transfer events on Sepolia (eth_getLogs) to the
 *   cashbox address and matches by EXACT AMOUNT against pending invoices.
 *   An external top-up (e.g. faucet) does NOT count as a payment.
 * - Transfers: verifies on-chain receipts of "sent" transfers and marks them
 *   "confirmed" when the network confirms the tx.
 */
import * as wdk from "./wdk.js";
import * as state from "./state.js";

const POLL_MS = 5000;
const SEPOLIA_RPC = process.env.SEPOLIA_RPC || "https://ethereum-sepolia-rpc.publicnode.com";
const USDT_SEPOLIA = "0xd077A400968890Eacc75cdc901F0356c943e4fDb";
const USDT_DECIMALS = 6;
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"; // keccak("Transfer(address,address,uint256)")

let timer = null;
let cachedCajaAddress = null;

async function cajaAddress() {
  if (!cachedCajaAddress) {
    const r = await wdk.getAddress();
    cachedCajaAddress = r.address;
  }
  return cachedCajaAddress;
}

async function rpc(method, params) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetch(SEPOLIA_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: ctrl.signal,
    });
    const data = await res.json();
    if (data?.error) throw new Error(`${method}: ${data.error.message}`);
    return data?.result;
  } finally {
    clearTimeout(to);
  }
}

/** 0x + 24 ceros + address (para topics) */
function pad32(address) {
  return "0x" + "0".repeat(24) + address.slice(2).toLowerCase();
}

/** Receipt of a tx (status 0x1 = success). */
async function getReceipt(txHash) {
  return rpc("eth_getTransactionReceipt", [txHash]);
}

/** USDT Transfer events to the cashbox from a given block. */
async function getIncomingTransfers(fromBlock) {
  const logs = await rpc("eth_getLogs", [
    {
      fromBlock: `0x${fromBlock.toString(16)}`,
      toBlock: "latest",
      address: USDT_SEPOLIA,
      topics: [TRANSFER_TOPIC, null, pad32(await cajaAddress())],
    },
  ]);
  if (!Array.isArray(logs)) return [];
  return logs.map((l) => ({
    txHash: l.transactionHash,
    from: `0x${l.topics[1].slice(26)}`,
    amount: Number(BigInt(l.data)) / 10 ** USDT_DECIMALS,
    block: parseInt(l.blockNumber, 16),
  }));
}

/** True si el txHash ya fue consumido por otra invoice/transfer (evita doble match). */
function txHashUsed(txHash) {
  const s = state.loadState();
  return (
    s.invoices.some((i) => i.txHash === txHash) ||
    s.transfers.some((t) => t.txHash === txHash)
  );
}

/** Marks pending invoices as paid ONLY if there is a real Transfer with exact amount. */
async function checkInvoices() {
  const pending = state.getPendingInvoices();
  if (pending.length === 0) return;

  const lastScanned = state.getMeta("lastScannedBlock");
  let latestBlock;
  try {
    latestBlock = parseInt(await rpc("eth_blockNumber", []), 16);
  } catch (e) {
    console.error("payments: no se pudo leer eth_blockNumber:", e.message);
    return;
  }

  // First start: don't scan history, start from the current block.
  if (lastScanned == null) {
    state.setMeta("lastScannedBlock", latestBlock);
    return;
  }

  if (latestBlock <= lastScanned) return;

  let transfers;
  try {
    transfers = await getIncomingTransfers(lastScanned);
  } catch (e) {
    console.error("payments: eth_getLogs failed:", e.message);
    return;
  }

  const fresh = transfers.filter((t) => t.block > lastScanned && !txHashUsed(t.txHash));
  for (const inv of pending) {
    const match = fresh.find((t) => Math.abs(t.amount - inv.amount) < 1e-6);
    if (match) {
      state.markInvoicePaid(inv.id, { txHash: match.txHash });
      console.log(
        `✅ Invoice ${inv.id} pagada (${inv.amount} ${inv.token.toUpperCase()}) tx ${match.txHash.slice(0, 10)}…`
      );
      const idx = fresh.indexOf(match);
      fresh.splice(idx, 1);
    }
  }

  state.setMeta("lastScannedBlock", latestBlock);
}

/** Verifies receipts of sent transfers and marks them confirmed. */
async function checkTransfers() {
  const sent = state.getSentTransfers();
  for (const tr of sent) {
    if (!tr.txHash) continue;
    try {
      const receipt = await getReceipt(tr.txHash);
      if (receipt) {
        const ok = receipt.status === "0x1";
        if (ok) {
          state.markTransferConfirmed(tr.id);
          console.log(`✅ Transfer ${tr.id} confirmed on-chain`);
        } else {
          state.markTransferFailed(tr.id, "tx revertida en-chain");
          console.log(`❌ Transfer ${tr.id} reverted on-chain`);
        }
      }
    } catch (e) {
      console.error("Error verificando receipt:", e.message);
    }
  }
}

export async function tick() {
  try {
    await checkInvoices();
  } catch (e) {
    console.error("payments.checkInvoices:", e.message);
  }
  try {
    await checkTransfers();
  } catch (e) {
    console.error("payments.checkTransfers:", e.message);
  }
}

export function startPoller() {
  if (timer) return timer;
  timer = setInterval(tick, POLL_MS);
  console.log(`🔍 Payment detector active (every ${POLL_MS / 1000}s) — Transfer logs + on-chain receipts`);
  return timer;
}

export default { startPoller, tick };
