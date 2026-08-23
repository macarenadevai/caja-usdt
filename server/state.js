/**
 * state.js — Persistencia del estado de Caja (TD-2: JSON, cero deps)
 *
 * state.json guarda invoices, transfers, proposals y ledger.
 * Escritura atómica: temp file + rename (evita corrupción si el proceso muere).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_FILE = path.join(__dirname, "data", "state.json");

let cache = null;

function defaultState() {
  return {
    version: 1,
    invoices: [],     // {id, amount, token, network, address, status, createdAt, paidAt, txHash?}
    transfers: [],    // {id, to, amount, token, network, status, txHash?, createdAt, confirmedAt?, error?}
    proposals: [],    // {id, text, to, amount, token, network, status: pending|confirmed|cancelled, createdAt, executedAt?}
    ledger: [],       // {type, id, title, amount, token, status, createdAt, meta?}
    meta: {},         // key/value (último bloque escaneado, etc.)
  };
}

export function loadState() {
  if (cache) return cache;
  try {
    const raw = fs.readFileSync(STATE_FILE, "utf8");
    cache = { ...defaultState(), ...JSON.parse(raw) };
  } catch {
    cache = defaultState();
  }
  return cache;
}

export function saveState() {
  const state = loadState();
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  const tmp = `${STATE_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, STATE_FILE);
  return state;
}

// ---- IDs ----
import crypto from "node:crypto";

export function newId(prefix) {
  return `${prefix}_${Date.now().toString(36)}${crypto.randomUUID().slice(0, 6)}`;
}

// ---- Invoices ----
export function addInvoice({ amount, token, network, address }) {
  const state = loadState();
  const invoice = {
    id: newId("inv"),
    amount: Number(amount),
    token,
    network,
    address,
    status: "pending", // pending | paid | expired
    createdAt: new Date().toISOString(),
    paidAt: null,
    txHash: null,
  };
  state.invoices.unshift(invoice);
  addLedger({
    type: "invoice",
    id: invoice.id,
    title: `Cobro de ${amount} ${token.toUpperCase()}`,
    amount: invoice.amount,
    token,
    status: "pending",
    meta: { network },
  });
  saveState();
  return invoice;
}

export function getInvoice(id) {
  return loadState().invoices.find((i) => i.id === id) || null;
}

export function getPendingInvoices() {
  return loadState().invoices.filter((i) => i.status === "pending");
}

export function markInvoicePaid(id, { txHash = null } = {}) {
  const state = loadState();
  const inv = state.invoices.find((i) => i.id === id);
  if (!inv) return null;
  inv.status = "paid";
  inv.paidAt = new Date().toISOString();
  if (txHash) inv.txHash = txHash;
  const entry = state.ledger.find((l) => l.id === id && l.type === "invoice");
  if (entry) entry.status = "paid";
  saveState();
  return inv;
}

// ---- Meta (avance de escaneo, etc.) ----
export function getMeta(key, fallback = null) {
  return loadState().meta?.[key] ?? fallback;
}

export function setMeta(key, value) {
  const state = loadState();
  state.meta[key] = value;
  saveState();
}

// ---- Transfers (envíos con tracking) ----
export function addTransfer({ to, amount, token, network, txHash }) {
  const state = loadState();
  const transfer = {
    id: newId("trx"),
    to,
    amount: Number(amount),
    token,
    network,
    status: "sent", // sent | confirmed | failed
    txHash: txHash || null,
    createdAt: new Date().toISOString(),
    confirmedAt: null,
    error: null,
  };
  state.transfers.unshift(transfer);
  addLedger({
    type: "send",
    id: transfer.id,
    title: `Envío de ${amount} ${token.toUpperCase()}`,
    amount: transfer.amount,
    token,
    status: "sent",
    meta: { network, to },
  });
  saveState();
  return transfer;
}

export function getTransfer(id) {
  return loadState().transfers.find((t) => t.id === id) || null;
}

export function getSentTransfers() {
  return loadState().transfers.filter((t) => t.status === "sent");
}

export function markTransferConfirmed(id) {
  const state = loadState();
  const tr = state.transfers.find((t) => t.id === id);
  if (!tr) return null;
  tr.status = "confirmed";
  tr.confirmedAt = new Date().toISOString();
  const entry = state.ledger.find((l) => l.id === id && l.type === "send");
  if (entry) entry.status = "confirmed";
  saveState();
  return tr;
}

export function markTransferFailed(id, error) {
  const state = loadState();
  const tr = state.transfers.find((t) => t.id === id);
  if (!tr) return null;
  tr.status = "failed";
  tr.error = String(error).slice(0, 300);
  const entry = state.ledger.find((l) => l.id === id && l.type === "send");
  if (entry) entry.status = "failed";
  saveState();
  return tr;
}

// ---- Proposals (agente) ----
export function addProposal({ text, to, amount, token, network }) {
  const state = loadState();
  const proposal = {
    id: newId("prop"),
    text,
    to,
    amount: Number(amount),
    token,
    network,
    status: "pending", // pending | confirmed | cancelled | executed
    createdAt: new Date().toISOString(),
    executedAt: null,
  };
  state.proposals.unshift(proposal);
  saveState();
  return proposal;
}

export function getProposal(id) {
  return loadState().proposals.find((p) => p.id === id) || null;
}

export function setProposalStatus(id, status) {
  const state = loadState();
  const p = state.proposals.find((x) => x.id === id);
  if (!p) return null;
  p.status = status;
  if (status === "executed") p.executedAt = new Date().toISOString();
  saveState();
  return p;
}

export function getPendingProposals() {
  return loadState().proposals.filter((p) => p.status === "pending");
}

// ---- Ledger ----
export function addLedger(entry) {
  const state = loadState();
  state.ledger.unshift({
    ...entry,
    createdAt: entry.createdAt || new Date().toISOString(),
  });
  return entry;
}

export function getLedger(limit = 100) {
  return loadState().ledger.slice(0, limit);
}

export default {
  loadState,
  saveState,
  addInvoice,
  getInvoice,
  getPendingInvoices,
  markInvoicePaid,
  addTransfer,
  getTransfer,
  getSentTransfers,
  markTransferConfirmed,
  markTransferFailed,
  addProposal,
  getProposal,
  setProposalStatus,
  getPendingProposals,
  addLedger,
  getLedger,
};
