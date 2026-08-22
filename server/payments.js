/**
 * payments.js — Detector de pagos + confirmación de envíos (Fase 2, fix v2)
 *
 * - Pagos: escanea eventos Transfer del USDT en Sepolia (eth_getLogs) hacia la
 *   dirección de la caja y matchea por MONTO EXACTO con invoices pendientes.
 *   Un fondeo externo (ej. faucet) NO marca pagos falsos.
 * - Envíos: verifica en-chain el receipt de transfers "sent" y los pasa a
 *   "confirmed" cuando la red confirma la tx.
 */
import * as wdk from "./wdk.js";
import * as state from "./state.js";

const POLL_MS = 5000;
const SEPOLIA_RPC = process.env.SEPOLIA_RPC || "https://ethereum-sepolia-rpc.publicnode.com";
const USDT_SEPOLIA = "0xd077A400968890Eacc75cdc901F0356c943e4fDb";
const USDT_DECIMALS = 6;
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"; // keccak("Transfer(address,address,address)")

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
  const res = await fetch(SEPOLIA_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const data = await res.json();
  if (data?.error) throw new Error(`${method}: ${data.error.message}`);
  return data?.result;
}

/** 0x + 24 ceros + address (para topics) */
function pad32(address) {
  return "0x" + "0".repeat(24) + address.slice(2).toLowerCase();
}

/** Receipt de una tx (status 0x1 = éxito). */
async function getReceipt(txHash) {
  return rpc("eth_getTransactionReceipt", [txHash]);
}

/** Eventos Transfer del USDT hacia la caja desde un bloque dado. */
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

/** Marca invoices pending como pagadas SOLO si hay una Transfer real de monto exacto. */
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

  // Primer arranque: no escanear histórico, empezar desde el bloque actual.
  if (lastScanned == null) {
    state.setMeta("lastScannedBlock", latestBlock);
    return;
  }

  if (latestBlock <= lastScanned) return;

  let transfers;
  try {
    transfers = await getIncomingTransfers(lastScanned);
  } catch (e) {
    console.error("payments: eth_getLogs falló:", e.message);
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

/** Verifica receipts de envíos sent y los marca confirmed. */
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
          console.log(`✅ Envío ${tr.id} confirmado en-chain`);
        } else {
          state.markTransferFailed(tr.id, "tx revertida en-chain");
          console.log(`❌ Envío ${tr.id} revertido en-chain`);
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
  console.log(`🔍 Detector de pagos activo (cada ${POLL_MS / 1000}s) — Transfer logs + receipts on-chain`);
  return timer;
}

export default { startPoller, tick };
