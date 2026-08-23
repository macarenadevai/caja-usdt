// lib/api.ts — Cliente del backend Quinto.
// Los paths ya incluyen /api/* → API_URL vacío por defecto (misma origin).
// Next proxya /api/* → localhost:8788 (ver next.config.ts): funciona desde
// cualquier origin (localhost, LAN, Tailscale) sin CORS.
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
  send: async (payload: { to: string; amount: number; confirm: boolean }) => {
    const res = await req<{ transfer: Transfer; estimate?: unknown }>("/api/send", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return res.transfer; // el backend devuelve {transfer, estimate} — extraer el transfer
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

/* ── Capa "web2" ── aliases amigables, folios de comprobante, fechas */

export const KNOWN_ALIASES: Record<string, string> = {
  "0x5a6b8b635b6674681682db4f713faf4001ac6cb2": "tu caja",
  "0x66dec61c81105249fd38480157c37acfb45a1a8b": "tu cliente de prueba",
  "0x9dabbf114698bd9bfbf6222b9fd6cd967ecd3850": "tu cuenta personal",
};

/** Nombre amigable de una dirección: alias conocido o dirección corta. */
export const friendlyLabel = (addr: string) =>
  KNOWN_ALIASES[(addr || "").toLowerCase()] || shortAddress(addr);

/** Seguro extra: reemplaza direcciones conocidas por su alias en cualquier texto. */
export const friendlyText = (text: string) => {
  let t = text;
  for (const addr of Object.keys(KNOWN_ALIASES)) {
    t = t.replace(new RegExp(addr, "gi"), KNOWN_ALIASES[addr]);
  }
  return t;
};

/** Folio corto tipo ticket: QNT-8F3K2A (determinístico desde el id interno). */
export const folioFromId = (id: string) => {
  let h = 5381;
  for (const c of id) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0;
  return `QNT-${h.toString(36).toUpperCase().padStart(6, "0").slice(0, 6)}`;
};

/** Fecha en formato México corto: "23 ago 2026, 14:32". */
export const formatFecha = (d = new Date()) =>
  d.toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
