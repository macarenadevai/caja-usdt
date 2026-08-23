"use client";

import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { api, type Transfer, formatUsd, shortAddress } from "@/lib/api";
import { Check, CircleAlert, Clock, Loader2, RotateCcw, Send, TriangleAlert } from "lucide-react";

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
  confirmed: "Confirmado",
  sent: "En camino",
  failed: "Fallido",
};

export default function Enviar() {
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [history, setHistory] = useState<LedgerEntry[]>([]);

  // Historial de remesas (ledger del server, polling cada 8s)
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
    if (!/^0x[a-fA-F0-9]{40}$/.test(to.trim())) {
      setError("Dirección EVM inválida (0x + 40 caracteres)");
      return;
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Ingresa un monto válido");
      return;
    }
    setError("");
    setConfirming(true);
  }, [to, amount]);

  const confirmSend = async () => {
    setSending(true);
    setError("");
    try {
      const tr = await api.send({ to: to.trim(), amount: Number(amount), confirm: true });
      setTransfer(tr);
      setSending(false);
      setConfirming(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar");
      setSending(false);
      setConfirming(false);
    }
  };

  // Polling del estado del envío (sent → confirmed vía receipts on-chain)
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
          <label className="mb-2 block text-sm font-medium text-zinc-400" htmlFor="destino">
            Dirección destino (EVM)
          </label>
          <input
            id="destino"
            type="text"
            placeholder="0x…"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full rounded-xl border border-[#2A3050] bg-[#14172B] px-4 py-3 font-mono text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#9BE8C8]"
          />
          <label className="mb-2 mt-4 block text-sm font-medium text-zinc-400" htmlFor="monto-enviar">
            Monto (USD₮)
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
            <Send className="h-5 w-5" /> Enviar
          </button>
        </div>
      )}

      {/* Modal de confirmación */}
      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[#2A3050] bg-[#1C2038] p-8">
            <p className="text-sm uppercase tracking-widest text-zinc-500">Confirmar envío</p>
            <p className="mt-4 text-5xl font-black text-white">{formatUsd(Number(amount))}</p>
            <p className="mt-2 break-all font-mono text-sm text-zinc-400">{shortAddress(to)}</p>
            <p className="mt-2 text-xs text-zinc-400">Red: Sepolia · Token: USDT</p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setConfirming(false)}
                disabled={sending}
                className="flex-1 rounded-xl border border-[#2A3050] py-3 font-bold text-zinc-300 transition hover:bg-[#14172B] disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                onClick={confirmSend}
                disabled={sending}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#9BE8C8] py-3 font-bold text-black transition hover:bg-[#7BCFAF] disabled:opacity-40"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {sending ? "Enviando…" : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tracking del envío */}
      {transfer && (
        <div className="rounded-2xl border border-[#2A3050] bg-[#1C2038] p-8 text-center">
          {stepIndex === -1 ? (
            <>
              <CircleAlert className="mx-auto h-10 w-10 text-red-400" />
              <p className="mt-4 text-xl font-bold text-red-400">Envío fallido</p>
              <p className="mt-2 text-sm text-zinc-400">{transfer.error || "Error desconocido"}</p>
            </>
          ) : (
            <>
              <p className="text-sm uppercase tracking-widest text-zinc-500">Envío en camino</p>
              <p className="mt-2 text-4xl font-black text-white">{formatUsd(transfer.amount)}</p>
              <p className="mt-1 break-all font-mono text-sm text-zinc-400">→ {shortAddress(transfer.to)}</p>
              <p className="mt-1 text-xs text-zinc-400">
                {transfer.txHash ? `Tx: ${shortAddress(transfer.txHash)}` : "Firmando…"}
              </p>

              {/* Pista del cohete — la tx vuela de la caja al destino */}
              <div className="mt-8">
                <div className="relative h-12">
                  {/* Línea base */}
                  <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-[#2A3050]" />
                  {/* Línea de progreso */}
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
                      {/* Explosión de estrellas al aterrizar */}
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
                    Enviado
                  </span>
                  <span
                    className={`text-xs font-bold uppercase tracking-widest ${
                      stepIndex >= 1 ? "text-[#9BE8C8]" : "text-zinc-500"
                    }`}
                  >
                    Confirmado
                  </span>
                </div>
              </div>

              {stepIndex === 1 && (
                <p className="mt-6 flex items-center justify-center gap-2 text-sm text-[#9BE8C8]">
                  <Check className="h-4 w-4" /> Confirmado en-chain (Sepolia)
                </p>
              )}
            </>
          )}
          <button
            onClick={reset}
            className="mt-6 inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-zinc-300"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Nuevo envío
          </button>
        </div>
      )}
      {/* Historial de remesas */}
      {!transfer && history.length > 0 && (
        <div className="mt-6">
          <p className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-zinc-500">
            <Clock className="h-4 w-4" /> Historial de envíos
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
    </div>
  );
}
