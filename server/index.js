/**
 * index.js — API REST de Caja (localhost:8788)
 *
 * Fase 1: status, balance, address, send, transactions.
 * Fase 2 (a continuación): invoices + detector de pagos.
 * Fase 5: rutas del agente.
 */
import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

import * as wdk from "./wdk.js";
import * as state from "./state.js";
import * as payments from "./payments.js";
import * as agent from "./agent.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8788;

// Helpers
function fail(res, code, message, http = 400) {
  return res.status(http).json({ error: message, code });
}

function isValidEvmAddress(addr) {
  return typeof addr === "string" && /^0x[a-fA-F0-9]{40}$/.test(addr);
}

// ---- GET /api/status ----
app.get("/api/status", async (req, res) => {
  try {
    const [balance, address, wallets] = await Promise.all([
      wdk.getBalance().catch((e) => ({ error: e.message })),
      wdk.getAddress().catch((e) => ({ error: e.message })),
      wdk.getWallets().catch((e) => ({ error: e.message })),
    ]);
    res.json({
      wallet: wdk.WALLET,
      defaultNetwork: wdk.DEFAULT_NETWORK,
      token: wdk.DEFAULT_TOKEN,
      balance,
      address,
      wallets,
      serverTime: new Date().toISOString(),
    });
  } catch (e) {
    fail(res, "STATUS_ERROR", e.message, 500);
  }
});

// ---- GET /api/balance?network=&token= ----
app.get("/api/balance", async (req, res) => {
  const network = req.query.network || wdk.DEFAULT_NETWORK;
  const token = req.query.token ?? wdk.DEFAULT_TOKEN;
  try {
    const balance = await wdk.getBalance({ network, token });
    res.json(balance);
  } catch (e) {
    fail(res, "BALANCE_ERROR", e.message, 500);
  }
});

// ---- GET /api/address?network= ----
app.get("/api/address", async (req, res) => {
  const network = req.query.network || wdk.DEFAULT_NETWORK;
  try {
    const address = await wdk.getAddress({ network });
    res.json(address);
  } catch (e) {
    fail(res, "ADDRESS_ERROR", e.message, 500);
  }
});

// ---- GET /api/transactions ----
app.get("/api/transactions", (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  res.json({ transactions: state.getLedger(limit) });
});

// ---- POST /api/invoice ----
// Body: {amount, token?, network?} → crea cobro con QR
app.post("/api/invoice", async (req, res) => {
  const { amount, token, network } = req.body || {};

  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) {
    return fail(res, "INVALID_AMOUNT", "Monto inválido");
  }

  try {
    const net = network || wdk.DEFAULT_NETWORK;
    const tok = token || wdk.DEFAULT_TOKEN;
    const address = await wdk.getAddress({ network: net });
    const invoice = state.addInvoice({
      amount: amt,
      token: tok,
      network: net,
      address: address.address,
    });
    // Payload del QR: dirección + monto (el pagador escanea y paga ese monto)
    res.status(201).json({
      ...invoice,
      qrPayload: `${address.address}?amount=${amt}&token=${tok}`,
    });
  } catch (e) {
    fail(res, "INVOICE_ERROR", e.message, 500);
  }
});

// ---- GET /api/invoice/:id ----
app.get("/api/invoice/:id", (req, res) => {
  const invoice = state.getInvoice(req.params.id);
  if (!invoice) return fail(res, "NOT_FOUND", "Invoice no encontrada", 404);
  res.json(invoice);
});

// ---- GET /api/transfer/:id ----
app.get("/api/transfer/:id", (req, res) => {
  const transfer = state.getTransfer(req.params.id);
  if (!transfer) return fail(res, "NOT_FOUND", "Envío no encontrado", 404);
  res.json(transfer);
});

// ---- POST /api/send ----
// Body: {to, amount, token?, network?, confirm: true}
app.post("/api/send", async (req, res) => {
  const { to, amount, token, network, confirm } = req.body || {};

  if (!isValidEvmAddress(to)) {
    return fail(res, "INVALID_ADDRESS", "Dirección inválida (esperaba 0x... 40 hex)");
  }
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) {
    return fail(res, "INVALID_AMOUNT", "Monto inválido");
  }
  if (confirm !== true) {
    return fail(res, "CONFIRM_REQUIRED", "Se requiere confirm:true para ejecutar un envío");
  }

  try {
    // 1. Estimar primero (dry-run): valida saldo/fees sin gastar
    let estimate;
    try {
      estimate = await wdk.estimateSend({ to, amount: amt, token, network });
    } catch (e) {
      const msg = String(e.message || e);
      if (msg.toLowerCase().includes("balance") || msg.toLowerCase().includes("insufficient")) {
        return fail(res, "INSUFFICIENT_BALANCE", "Saldo insuficiente", 409);
      }
      return fail(res, "ESTIMATE_FAILED", msg, 422);
    }

    // 2. Ejecutar
    const result = await wdk.sendTokens({ to, amount: amt, token, network });
    const txHash = result?.txHash || result?.hash || result?.txid || null;

    // 3. Registrar en estado
    const transfer = state.addTransfer({
      to,
      amount: amt,
      token: token || wdk.DEFAULT_TOKEN,
      network: network || wdk.DEFAULT_NETWORK,
      txHash,
    });

    res.json({ transfer, estimate });
  } catch (e) {
    fail(res, "SEND_ERROR", e.message, 500);
  }
});

// ---- Root ----
app.get("/", (req, res) => {
  res.json({ name: "Caja API", version: "1.0.0", endpoints: ["/api/status", "/api/balance", "/api/address", "/api/send", "/api/transactions"] });
});

// ---- Agente (Fase 5) ----
// POST /api/agent/message {text} → respuesta del agente (+ propuesta si hay envío)
app.post("/api/agent/message", async (req, res) => {
  const { text } = req.body || {};
  if (!text || !text.trim()) return fail(res, "EMPTY_MESSAGE", "Mensaje vacío");
  try {
    const out = await agent.processMessage(text, []);
    res.json(out);
  } catch (e) {
    fail(res, "AGENT_ERROR", e.message, 500);
  }
});

// POST /api/agent/confirm {proposalId} → ejecuta el envío propuesto
app.post("/api/agent/confirm", async (req, res) => {
  const { proposalId } = req.body || {};
  if (!proposalId) return fail(res, "MISSING_PROPOSAL", "Falta proposalId");
  try {
    const out = await agent.confirmProposal(proposalId);
    res.status(out.ok ? 200 : 400).json(out);
  } catch (e) {
    fail(res, "AGENT_CONFIRM_ERROR", e.message, 500);
  }
});

// GET /api/agent/proposals → propuestas pendientes
app.get("/api/agent/proposals", (_req, res) => {
  res.json({ proposals: state.getPendingProposals() });
});

app.listen(PORT, () => {
  console.log(`⚡ Caja API escuchando en http://localhost:${PORT}`);
  payments.startPoller();
});
