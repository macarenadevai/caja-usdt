/**
 * payments.js — Detector de pagos + confirmación de envíos (Fase 2)
 *
 * - Cada 5s revisa el balance USDT de la caja y marca invoices FIFO como pagadas.
 * - Cada 5s verifica en-chain (RPC público Sepolia) el receipt de envíos "sent"
 *   y los pasa a "confirmed" cuando la red confirma la tx.
 */
import * as wdk from "./wdk.js";
import * as state from "./state.js";

const POLL_MS = 5000;
const SEPOLIA_RPC = process.env.SEPOLIA_RPC || "https://ethereum-sepolia-rpc.publicnode.com";

let timer = null;

/** Verifica el receipt de una tx en Sepolia (status 0x1 = éxito). */
async function getReceipt(txHash) {
  const res = await fetch(SEPOLIA_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getTransactionReceipt",
      params: [txHash],
    }),
  });
  const data = await res.json();
  return data?.result || null;
}

/** Marca invoices pending como pagadas (FIFO) según el balance actual. */
async function checkInvoices() {
  const pending = state.getPendingInvoices();
  if (pending.length === 0) return;

  const balanceRes = await wdk.getBalance().catch(() => null);
  if (!balanceRes || balanceRes.balance === undefined) return;

  const balance = Number(balanceRes.balance) / 10 ** Number(balanceRes.decimals || 6);

  // FIFO: acumular montos de las primeras N invoices; si el balance cubre la suma, pagar todas
  let acc = 0;
  const toPay = [];
  for (const inv of pending) {
    acc += inv.amount;
    if (balance >= acc - 1e-9) toPay.push(inv);
    else break;
  }
  for (const inv of toPay) {
    state.markInvoicePaid(inv.id);
    console.log(`✅ Invoice ${inv.id} pagada (${inv.amount} ${inv.token.toUpperCase()})`);
  }
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
      // receipt null = aún pendiente en mempool; reintentar en el siguiente tick
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
  console.log(`🔍 Detector de pagos activo (cada ${POLL_MS / 1000}s) — invoices FIFO + receipts on-chain`);
  return timer;
}

export default { startPoller, tick };
