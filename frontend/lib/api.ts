// lib/api.ts — Quinto backend client.
// Paths already include /api/* → API_URL empty by default (same origin).
// Next proxies /api/* → localhost:8788 (see next.config.ts): works from any
// origin (localhost, LAN, Tailscale) without CORS.
const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

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
  // 12s timeout: if the backend doesn't respond, the UI doesn't hang.
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
      throw new Error("Server did not respond (timeout)");
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
  send: async (payload: { to: string; amount: number; confirm: boolean }) => {
    const res = await req<{ transfer: Transfer; estimate?: unknown }>("/api/send", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return res.transfer; // backend returns {transfer, estimate} — extract the transfer
  },
  getTransfer: (id: string) => req<Transfer>(`/api/transfer/${id}`),
  contacts: {
    list: () => req<{ contacts: Contact[] }>("/api/contacts").then((r) => r.contacts),
    create: (alias: string, address: string) =>
      req<{ contact: Contact }>("/api/contacts", {
        method: "POST",
        body: JSON.stringify({ alias, address }),
      }).then((r) => r.contact),
    remove: (id: string) => req<{ ok: boolean }>(`/api/contacts/${id}`, { method: "DELETE" }),
  },
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

export interface Contact {
  id: string;
  alias: string;
  address: string;
}

export const formatUsd = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

export const shortAddress = (a: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");

/* ── "Web2" layer ── friendly aliases, receipt folios, dates */

export const KNOWN_ALIASES: Record<string, string> = {
  "0x5a6b8b635b6674681682db4f713faf4001ac6cb2": "your cashbox",
  "0x66dec61c81105249fd38480157c37acfb45a1a8b": "your test customer",
  "0x9dabbf114698bd9bfbf6222b9fd6cd967ecd3850": "your personal account",
};

/** Friendly label for an address: known alias or short address. */
export const friendlyLabel = (addr: string) =>
  KNOWN_ALIASES[(addr || "").toLowerCase()] || shortAddress(addr);

/** Extra safety: replaces known addresses with their alias in any text. */
export const friendlyText = (text: string) => {
  let t = text;
  for (const addr of Object.keys(KNOWN_ALIASES)) {
    t = t.replace(new RegExp(addr, "gi"), KNOWN_ALIASES[addr]);
  }
  return t;
};

/** Short ticket-style folio: QNT-8F3K2A (deterministic from the internal id). */
export const folioFromId = (id: string) => {
  let h = 5381;
  for (const c of id) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0;
  return `QNT-${h.toString(36).toUpperCase().padStart(6, "0").slice(0, 6)}`;
};

/** Short date, e.g. "Aug 23, 2026, 2:32 PM". */
export const formatFecha = (d = new Date()) =>
  d.toLocaleString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
