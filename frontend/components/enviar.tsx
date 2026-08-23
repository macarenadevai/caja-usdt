"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type Transfer, formatUsd, shortAddress } from "@/lib/api";
import { Check, CircleAlert, Loader2, RotateCcw, Send, TriangleAlert } from "lucide-react";

const STEPS = [
  { key: "sent", label: "Enviado" },
  { key: "confirmed", label: "Confirmado" },
] as const;

export default function Enviar() {
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [transfer, setTransfer] = useState<Transfer | null>(null);

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
        <div className="rounded-2xl border border-[#1A1A1A] bg-[#111111] p-8">
          <label className="mb-2 block text-sm font-medium text-zinc-400" htmlFor="destino">
            Dirección destino (EVM)
          </label>
          <input
            id="destino"
            type="text"
            placeholder="0x…"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full rounded-xl border border-[#1A1A1A] bg-[#0A0A0A] px-4 py-3 font-mono text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#00FFAA]"
          />
          <label className="mb-2 mt-4 block text-sm font-medium text-zinc-400" htmlFor="monto-enviar">
            Monto (USD₮)
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-[#1A1A1A] bg-[#0A0A0A] px-4 py-3 focus-within:border-[#00FFAA]">
            <span className="text-2xl font-bold text-[#00FFAA]">$</span>
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
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#00FFAA] py-4 text-lg font-bold text-black transition hover:bg-[#00CC88] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-5 w-5" /> Enviar
          </button>
        </div>
      )}

      {/* Modal de confirmación */}
      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[#1A1A1A] bg-[#111111] p-8">
            <p className="text-sm uppercase tracking-widest text-zinc-500">Confirmar envío</p>
            <p className="mt-4 text-5xl font-black text-white">{formatUsd(Number(amount))}</p>
            <p className="mt-2 break-all font-mono text-sm text-zinc-400">{shortAddress(to)}</p>
            <p className="mt-2 text-xs text-zinc-400">Red: Sepolia · Token: USDT</p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setConfirming(false)}
                disabled={sending}
                className="flex-1 rounded-xl border border-[#1A1A1A] py-3 font-bold text-zinc-300 transition hover:bg-[#0A0A0A] disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                onClick={confirmSend}
                disabled={sending}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#00FFAA] py-3 font-bold text-black transition hover:bg-[#00CC88] disabled:opacity-40"
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
        <div className="rounded-2xl border border-[#1A1A1A] bg-[#111111] p-8 text-center">
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

              {/* Stepper */}
              <div className="mt-8 flex items-center gap-2">
                {STEPS.map((s, i) => {
                  const done = stepIndex >= i;
                  const active = stepIndex === i && !done;
                  return (
                    <div key={s.key} className="flex flex-1 flex-col items-center gap-2">
                      <div className="flex w-full items-center">
                        {i > 0 && (
                          <div className="h-0.5 flex-1 overflow-hidden bg-[#1A1A1A]">
                            <div className={`h-full bg-[#00FFAA] ${done ? "animate-track-fill" : ""}`} />
                          </div>
                        )}
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 ${
                            done
                              ? "border-[#00FFAA] bg-[#00FFAA] text-black"
                              : active
                                ? "border-[#00FFAA] text-[#00FFAA]"
                                : "border-[#1A1A1A] text-zinc-400"
                          }`}
                        >
                          {done ? (
                            <Check className="h-4 w-4" />
                          ) : active ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <span className="text-xs">{i + 1}</span>
                          )}
                        </div>
                        {i < STEPS.length - 1 && (
                          <div className={`h-0.5 flex-1 ${stepIndex > i ? "bg-[#00FFAA]" : "bg-[#1A1A1A]"}`} />
                        )}
                      </div>
                      <span className={`text-xs font-medium ${done ? "text-[#00FFAA]" : "text-zinc-500"}`}>
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {stepIndex === 1 && (
                <p className="mt-6 flex items-center justify-center gap-2 text-sm text-[#00FFAA]">
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
    </div>
  );
}
