// lib/api.ts — Cliente del backend Quinto.
// Usa ruta relativa: Next proxya /api/* → localhost:8788 (ver next.config.ts).
// Así funciona desde cualquier origin (localhost, LAN, Tailscale) sin CORS.
const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

export interface Invoice {
  id: string;
  amount: number;
  token: string;
  network: string;
  address: string;
  status: "pending" | "paid" | "expired";
  createdAt: string;
  paidAt: string | null;
  txHash: string | null;
  qrPayload?: string;
}

export interface Transfer {
  id: string;
  to: string;
  amount: number;
  token: string;
  network: string;
  status: "sent" | "confirmed" | "failed";
  txHash: string | null;
  createdAt: string;
  confirmedAt: string | null;
  error?: string;
}

export interface StatusResponse {
  wallet: string;
  defaultNetwork: string;
  token: string;
  balance?: { formatted?: string; balance?: string; usd?: number };
  address?: { address?: string };
  wallets?: { wallets?: Array<{ name: string; default: boolean; unlocked: boolean }> };
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  // Timeout de 12s: si el backend no responde, la UI no se queda colgada.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12_000);
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...init,
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error((data as { error?: string })?.error || `HTTP ${res.status}`);
    }
    return data as T;
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new Error("El servidor no respondió (timeout)");
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  status: () => req<StatusResponse>("/api/status"),
  balance: () => req<StatusResponse["balance"]>("/api/balance"),
  address: () => req<StatusResponse["address"]>("/api/address"),
  transactions: () => req<{ transactions: Array<Transfer | Invoice> }>("/api/transactions"),
  createInvoice: (amount: number) =>
    req<Invoice>("/api/invoice", { method: "POST", body: JSON.stringify({ amount }) }),
  getInvoice: (id: string) => req<Invoice>(`/api/invoice/${id}`),
  send: (payload: { to: string; amount: number; confirm: boolean }) =>
    req<Transfer>("/api/send", { method: "POST", body: JSON.stringify(payload) }),
  getTransfer: (id: string) => req<Transfer>(`/api/transfer/${id}`),
  agentMessage: (text: string) =>
    req<{ reply: string; proposal?: Proposal }>("/api/agent/message", {
      method: "POST",
      body: JSON.stringify({ text }),
    }),
  agentConfirm: (proposalId: string) =>
    req<{ ok: boolean; message: string; transfer?: Transfer }>("/api/agent/confirm", {
      method: "POST",
      body: JSON.stringify({ proposalId }),
    }),
  agentReject: (proposalId: string) =>
    req<{ ok: boolean; message: string }>("/api/agent/reject", {
      method: "POST",
      body: JSON.stringify({ proposalId }),
    }),
};

export interface Proposal {
  id: string;
  text: string;
  to: string;
  amount: string;
  token: string;
  network: string;
  status: string;
}

export const formatUsd = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

export const shortAddress = (a: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");
