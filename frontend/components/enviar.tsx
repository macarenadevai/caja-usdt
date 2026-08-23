"use client";

import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { api, type Transfer, type Contact, formatUsd, shortAddress, friendlyLabel } from "@/lib/api";
import { Check, CircleAlert, Clock, Loader2, RotateCcw, Send, TriangleAlert, BookUser } from "lucide-react";
import Recibo from "./recibo";
import Contactos from "./contactos";

interface LedgerEntry {
  type: "invoice" | "send";
  id: string;
  title: string;
  amount: number;
  token: string;
  status: string;
  createdAt: string;
}

function timeAgo(iso: string) {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "ahora";
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  return `hace ${Math.floor(s / 3600)} h`;
}

const STATUS_STYLE: Record<string, string> = {
  confirmed: "bg-[#9BE8C8]/10 text-[#9BE8C8]",
  sent: "bg-amber-400/10 text-amber-400",
  failed: "bg-red-400/10 text-red-400",
};

const STATUS_LABEL: Record<string, string> = {
  confirmed: "Confirmed",
  sent: "In transit",
  failed: "Failed",
};

export default function Enviar() {
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [history, setHistory] = useState<LedgerEntry[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [verContactos, setVerContactos] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [aliasInput, setAliasInput] = useState("");
  const [guardarError, setGuardarError] = useState("");

  // Saved contacts (alias → address)
  useEffect(() => {
    api.contacts
      .list()
      .then(setContacts)
      .catch(() => {});
  }, []);

  const aliasDe = (addr: string) =>
    contacts.find((c) => c.address.toLowerCase() === (addr || "").toLowerCase())?.alias;
  const esDireccion = /^0x[a-fA-F0-9]{40}$/.test(to.trim());
  const sug = contacts.filter(
    (c) =>
      to.trim() &&
      (c.alias.toLowerCase().includes(to.trim().toLowerCase()) ||
        c.address.toLowerCase().startsWith(to.trim().toLowerCase()))
  );

  // Transfer history (server ledger, polled every 8s)
  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      try {
        const { transactions } = await api.transactions();
        if (!alive) return;
        const sends = (transactions as unknown as LedgerEntry[])
          .filter((t) => t.type === "send")
          .slice(0, 6);
        setHistory(sends);
      } catch {
        /* backend apagado */
      }
    };
    refresh();
    const t = setInterval(refresh, 8000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const submit = useCallback(() => {
    const amt = Number(amount);
    // Accepts a contact alias or a 0x address
    const c = contacts.find((x) => x.alias.toLowerCase() === to.trim().toLowerCase());
    const destino = c?.address || to.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(destino)) {
      setError("Choose a contact or enter a valid 0x address");
      return;
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Enter a valid amount");
      return;
    }
    setError("");
    setTo(destino);
    setConfirming(true);
  }, [to, amount, contacts]);

  const guardarContacto = async () => {
    if (!esDireccion) return;
    if (!aliasInput.trim()) {
      setGuardarError("Type an alias to save it");
      return;
    }
    setGuardarError("");
    try {
      await api.contacts.create(aliasInput.trim(), to.trim());
      const cs = await api.contacts.list();
      setContacts(cs);
      setGuardando(false);
      setAliasInput("");
    } catch (e: any) {
      setGuardarError(e?.message || "Could not save");
    }
  };

  const confirmSend = async () => {
    setSending(true);
    setError("");
    try {
      const tr = await api.send({ to: to.trim(), amount: Number(amount), confirm: true });
      setTransfer(tr);
      setSending(false);
      setConfirming(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send");
      setSending(false);
      setConfirming(false);
    }
  };

  // Poll transfer status (sent → confirmed via on-chain receipts)
  const transferId = transfer?.id;
  const transferDone = transfer?.status === "confirmed" || transfer?.status === "failed";
  useEffect(() => {
    if (!transferId || transferDone) return;
    const t = setInterval(async () => {
      try {
        const tr = await api.getTransfer(transferId);
        setTransfer(tr);
      } catch {
        /* reintenta */
      }
    }, 2000);
    return () => clearInterval(t);
  }, [transferId, transferDone]);

  const reset = () => {
    setTransfer(null);
    setTo("");
    setAmount("");
    setError("");
    setConfirming(false);
    setSending(false);
  };

  const stepIndex = transfer
    ? transfer.status === "sent"
      ? 0
      : transfer.status === "confirmed"
        ? 1
        : -1
    : -1;

  return (
    <div className="mx-auto w-full max-w-md">
      {!transfer && (
        <div className="rounded-2xl border border-[#2A3050] bg-[#1C2038] p-8">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-zinc-400" htmlFor="destino">
              Who are you paying?
            </label>
            <button
              onClick={() => setVerContactos(true)}
              className="flex items-center gap-1.5 rounded-lg border border-[#2A3050] bg-[#1C2038] px-2.5 py-1.5 text-xs font-bold text-[#9BE8C8] transition hover:border-[#9BE8C8]/50"
            >
              <BookUser className="h-3.5 w-3.5" /> Contacts ({contacts.length})
            </button>
          </div>
          <input
            id="destino"
            type="text"
            placeholder="Type a contact or paste the address…"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setGuardando(false);
              setGuardarError("");
            }}
            className="w-full rounded-xl border border-[#2A3050] bg-[#14172B] px-4 py-3 font-mono text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#9BE8C8]"
          />
          {to && sug.length > 0 && (
            <div className="mt-2 space-y-1 rounded-xl border border-[#2A3050] bg-[#14172B] p-2">
              {sug.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setTo(c.address);
                    setAliasInput("");
                    setGuardando(false);
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-zinc-300 transition hover:bg-[#9BE8C8]/10"
                >
                  <span className="font-bold text-[#9BE8C8]">{c.alias}</span>
                  <span className="font-mono text-xs text-zinc-500">{shortAddress(c.address)}</span>
                </button>
              ))}
            </div>
          )}
          {esDireccion && !aliasDe(to) && (
            <div className="mt-3 rounded-xl border border-dashed border-[#F2D98C]/60 bg-[#F2D98C]/5 p-3">
              {!guardando ? (
                <>
                  <p className="text-xs font-bold text-[#F2D98C]">
                    💾 Save this address as a contact?
                  </p>
                  <button
                    onClick={() => setGuardando(true)}
                    className="mt-2 w-full rounded-lg border border-[#F2D98C]/50 py-2.5 text-sm font-bold text-[#F2D98C] transition hover:bg-[#F2D98C]/10"
                  >
                    Save as contact
                  </button>
                </>
              ) : (
                <>
                  <p className="text-xs font-bold text-[#F2D98C]">
                    Give it a name so you can use it faster:
                  </p>
                  <input
                    value={aliasInput}
                    onChange={(e) => setAliasInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && guardarContacto()}
                    placeholder="Name (e.g. López Hardware Store)"
                    autoFocus
                    className="mt-2 w-full rounded-lg border border-[#2A3050] bg-[#14172B] px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#F2D98C]"
                  />
                  {guardarError && <p className="mt-1 text-xs text-red-400">{guardarError}</p>}
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={guardarContacto}
                      className="flex-1 rounded-lg bg-[#F2D98C] py-2.5 text-sm font-bold text-black transition hover:bg-[#E8C978]"
                    >
                      Save contact
                    </button>
                    <button
                      onClick={() => {
                        setGuardando(false);
                        setGuardarError("");
                      }}
                      className="rounded-lg border border-[#2A3050] px-4 py-2.5 text-sm font-bold text-zinc-400"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          <label className="mb-2 mt-4 block text-sm font-medium text-zinc-400" htmlFor="monto-enviar">
            Amount
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-[#2A3050] bg-[#14172B] px-4 py-3 focus-within:border-[#9BE8C8]">
            <span className="text-2xl font-bold text-[#9BE8C8]">$</span>
            <input
              id="monto-enviar"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              className="w-full bg-transparent text-4xl font-bold text-white outline-none placeholder:text-zinc-500"
            />
          </div>
          {error && (
            <p className="mt-3 flex items-center gap-2 text-sm text-red-400">
              <TriangleAlert className="h-4 w-4" /> {error}
            </p>
          )}
          <button
            onClick={submit}
            disabled={!to || !amount}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#9BE8C8] py-4 text-lg font-bold text-black transition hover:bg-[#7BCFAF] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-5 w-5" /> Send
          </button>
        </div>
      )}

      {/* Confirmation modal */}
      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[#2A3050] bg-[#1C2038] p-8">
            <p className="text-sm uppercase tracking-widest text-zinc-500">Confirm transfer</p>
            <p className="mt-4 text-5xl font-black text-white">{formatUsd(Number(amount))}</p>
            <p className="mt-2 break-all font-mono text-sm text-zinc-400">
              {aliasDe(to) ? (
                <span className="font-sans font-bold text-[#9BE8C8]">{aliasDe(to)}</span>
              ) : (
                shortAddress(to)
              )}
            </p>
            <p className="mt-2 text-xs text-zinc-400">Network: Sepolia · Digital dollars</p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setConfirming(false)}
                disabled={sending}
                className="flex-1 rounded-xl border border-[#2A3050] py-3 font-bold text-zinc-300 transition hover:bg-[#14172B] disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={confirmSend}
                disabled={sending}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#9BE8C8] py-3 font-bold text-black transition hover:bg-[#7BCFAF] disabled:opacity-40"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {sending ? "Sending…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer tracking */}
      {transfer && (
        <div className="rounded-2xl border border-[#2A3050] bg-[#1C2038] p-8 text-center">
          {stepIndex === -1 ? (
            <>
              <CircleAlert className="mx-auto h-10 w-10 text-red-400" />
              <p className="mt-4 text-xl font-bold text-red-400">Transfer failed</p>
              <p className="mt-2 text-sm text-zinc-400">{transfer.error || "Unknown error"}</p>
            </>
          ) : (
            <>
              <p className="text-sm uppercase tracking-widest text-zinc-500">Transfer in transit</p>
              <p className="mt-2 text-4xl font-black text-white">{formatUsd(transfer.amount)}</p>
              <p className="mt-1 break-all font-mono text-sm text-zinc-400">→ {shortAddress(transfer.to)}</p>
              <p className="mt-1 text-xs text-zinc-400">
                {transfer.txHash ? `Tx: ${shortAddress(transfer.txHash)}` : "Signing…"}
              </p>

              {/* Rocket trail — the tx flies from the cashbox to the destination */}
              <div className="mt-8">
                <div className="relative h-12">
                  {/* Base line */}
                  <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-[#2A3050]" />
                  {/* Progress line */}
                  <div
                    className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-gradient-to-r from-[#9BE8C8] to-[#A5C9FF] shadow-[0_0_12px_rgba(155,232,200,0.45)] transition-all duration-1000 ease-out"
                    style={{ width: stepIndex >= 1 ? "100%" : "15%" }}
                  />
                  {/* Cohete */}
                  <div
                    className={`absolute top-1/2 z-10 transition-all duration-1000 ease-out ${
                      stepIndex === 0 ? "rocket-travel" : ""
                    }`}
                    style={{ left: stepIndex >= 1 ? "calc(100% - 15px)" : "12%" }}
                  >
                    <div
                      className={`relative -translate-y-1/2 ${
                        stepIndex === 0 ? "animate-rocket-flight" : ""
                      }`}
                    >
                      {/* Estela de llamas mientras vuela */}
                      {stepIndex === 0 && (
                        <div className="rocket-flame absolute -bottom-0.5 left-1/2 h-3 w-1.5 -translate-x-1/2 rounded-full bg-gradient-to-t from-[#F2D98C] via-[#F0A8C9] to-transparent" />
                      )}
                      <span className="text-2xl drop-shadow-[0_0_10px_rgba(155,232,200,0.7)]">
                        🚀
                      </span>
                      {/* Star explosion on landing */}
                      {stepIndex >= 1 && (
                        <div className="pointer-events-none absolute -inset-3">
                          {[
                            { tx: "0px", ty: "-34px" },
                            { tx: "26px", ty: "-26px" },
                            { tx: "34px", ty: "0px" },
                            { tx: "26px", ty: "26px" },
                            { tx: "-26px", ty: "-26px" },
                            { tx: "-34px", ty: "0px" },
                          ].map((d, i) => (
                            <span
                              key={i}
                              className="star-burst absolute left-1/2 top-1/2 text-sm"
                              style={
                                {
                                  "--tx": d.tx,
                                  "--ty": d.ty,
                                  animationDelay: `${i * 0.07}s`,
                                  marginLeft: "-7px",
                                  marginTop: "-7px",
                                } as CSSProperties
                              }
                            >
                              {["✦", "✧", "★", "✧", "✦", "★"][i]}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Etiquetas de estado */}
                <div className="mt-3 flex justify-between px-1">
                  <span
                    className={`text-xs font-bold uppercase tracking-widest ${
                      stepIndex >= 0 ? "text-[#9BE8C8]" : "text-zinc-500"
                    }`}
                  >
                    Sent
                  </span>
                  <span
                    className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold transition-all duration-700 ${
                      stepIndex >= 1 ? "bg-[#9BE8C8]/15 text-[#9BE8C8]" : "bg-[#1C2038] text-zinc-500"
                    }`}
                  >
                    Confirmed
                  </span>
                </div>
              </div>

              {stepIndex === 1 && (
                <>
                  <p className="mt-6 flex items-center justify-center gap-2 text-sm text-[#9BE8C8]">
                    <Check className="h-4 w-4" /> Confirmed onchain (Sepolia)
                  </p>
                  <Recibo
                    id={transfer.id}
                    tipo="Transfer"
                    monto={transfer.amount}
                    desde="your cashbox"
                    hacia={aliasDe(transfer.to) || friendlyLabel(transfer.to)}
                    estado="Confirmed"
                    txHash={transfer.txHash}
                  />
                </>
              )}
            </>
          )}
          <button
            onClick={reset}
            className="mt-6 inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-zinc-300"
          >
            <RotateCcw className="h-3.5 w-3.5" /> New transfer
          </button>
        </div>
      )}
      {/* Transfer history */}
      {!transfer && history.length > 0 && (
        <div className="mt-6">
          <p className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-zinc-500">
            <Clock className="h-4 w-4" /> Transfer history
          </p>
          <div className="space-y-2">
            {history.map((h) => {
              const style = STATUS_STYLE[h.status] || STATUS_STYLE.sent;
              return (
                <div
                  key={h.id}
                  className="flex items-center justify-between rounded-xl border border-[#2A3050] bg-[#1C2038] px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-bold text-white tabular-nums">{formatUsd(h.amount)}</p>
                    <p className="text-xs text-zinc-500">{timeAgo(h.createdAt)}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${style}`}>
                    {STATUS_LABEL[h.status] || h.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {verContactos && (
        <Contactos
          onSeleccionar={(c) => {
            setTo(c.address);
            setVerContactos(false);
          }}
          onCerrar={() => setVerContactos(false)}
        />
      )}
    </div>
  );
}
