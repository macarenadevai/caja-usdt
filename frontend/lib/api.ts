// lib/api.ts — Cliente del backend Caja (localhost:8788)

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8788";

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
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string })?.error || `HTTP ${res.status}`);
  }
  return data as T;
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
