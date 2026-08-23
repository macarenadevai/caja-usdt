"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { api, type Invoice, formatUsd, shortAddress } from "@/lib/api";
import { playCashSound } from "@/lib/sound";
import { Check, Copy, Loader2, RotateCcw, TriangleAlert } from "lucide-react";

export default function Pdv() {
  const [amount, setAmount] = useState("");
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Ingresa un monto válido");
      return;
    }
    setError("");
    setInvoice(null);
    try {
      const inv = await api.createInvoice(amt);
      setInvoice(inv);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear el cobro");
    }
  }, [amount]);

  // Polling del estado de la invoice hasta que se pague
  const invoiceId = invoice?.id;
  const invoicePaid = invoice?.status === "paid";
  const prevPaidRef = useRef(false);
  useEffect(() => {
    if (!invoiceId || invoicePaid) return;
    prevPaidRef.current = false;
    const t = setInterval(async () => {
      try {
        const inv = await api.getInvoice(invoiceId);
        // Side effect FUERA del updater: el sonido se dispara una sola vez
        // al detectar la transición pending → paid (evita dobles ding).
        if (inv.status === "paid" && !prevPaidRef.current) {
          prevPaidRef.current = true;
          playCashSound();
        }
        setInvoice((prev) => (prev && prev.id === inv.id ? inv : prev));
      } catch {
        /* reintenta en el siguiente tick */
      }
    }, 2000);
    return () => clearInterval(t);
  }, [invoiceId, invoicePaid]);

  const copyAddress = async () => {
    if (!invoice) return;
    try {
      await navigator.clipboard.writeText(invoice.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard no disponible (contexto no seguro): ignorar */
    }
  };

  const reset = () => {
    setInvoice(null);
    setAmount("");
    setError("");
  };

  return (
    <div className="mx-auto w-full max-w-md">
      {!invoice && (
        <div className="rounded-2xl border border-[#2A3050] bg-[#1C2038] p-8 shadow-[0_0_60px_rgba(0,255,170,0.05)]">
          <label className="mb-2 block text-sm font-medium text-zinc-400" htmlFor="monto">
            Monto a cobrar (USD₮)
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-[#2A3050] bg-[#14172B] px-4 py-3 focus-within:border-[#9BE8C8]">
            <span className="text-2xl font-bold text-[#9BE8C8]">$</span>
            <input
              id="monto"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && generate()}
              className="w-full bg-transparent text-5xl font-black tracking-tight tabular-nums text-white outline-none placeholder:text-zinc-500"
              autoFocus
            />
          </div>
          {error && (
            <p className="mt-3 flex items-center gap-2 text-sm text-red-400">
              <TriangleAlert className="h-4 w-4" /> {error}
            </p>
          )}
          <button
            onClick={generate}
            disabled={!amount}
            className="mt-6 w-full rounded-xl bg-[#9BE8C8] py-4 text-lg font-bold text-black transition hover:bg-[#7BCFAF] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Generar QR de cobro
          </button>
        </div>
      )}

      {invoice && (
        <div className="relative overflow-hidden rounded-3xl border border-[#2A3050] bg-[#1C2038] p-8 text-center shadow-[0_0_80px_rgba(0,255,170,0.10)]">
          {/* Halo sutil de fondo */}
          <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-[#9BE8C8]/10 blur-3xl" />

          {!invoicePaid ? (
            <>
              <p className="relative text-sm uppercase tracking-[0.3em] text-zinc-500">Esperando pago</p>
              <p className="relative mt-3 text-7xl font-black leading-none tracking-tight tabular-nums text-white">
                {formatUsd(invoice.amount)}
              </p>
              <p className="relative mt-2 text-sm text-zinc-500">
                {invoice.token.toUpperCase()} · {invoice.network}
              </p>

              <div className="relative mx-auto mt-8 w-fit rounded-2xl bg-white p-5 shadow-[0_0_60px_rgba(0,255,170,0.15)] animate-pulse-ring">
                <QRCodeSVG
                  value={invoice.qrPayload || invoice.address}
                  size={240}
                  fgColor="#14172B"
                  bgColor="#FFFFFF"
                  level="M"
                  className="h-auto w-[240px] max-w-full"
                />
              </div>

              <button
                onClick={copyAddress}
                className="relative mt-6 inline-flex items-center gap-2 rounded-lg border border-[#2A3050] bg-[#14172B] px-3 py-2 font-mono text-sm text-zinc-300 transition hover:border-[#9BE8C8]"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-[#9BE8C8]" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {shortAddress(invoice.address)}
              </button>

              <div className="relative mt-6 flex items-center justify-center gap-2 text-[#9BE8C8]">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Escanea y paga — confirmación en vivo</span>
              </div>

              <button
                onClick={reset}
                className="relative mt-4 inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-zinc-300"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Nuevo cobro
              </button>
            </>
          ) : (
            <div className="relative py-6">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[#9BE8C8]/10 ring-4 ring-[#9BE8C8]/30 animate-in zoom-in-0 fade-in-0 duration-500 ease-out">
                <Check className="h-12 w-12 text-[#9BE8C8] animate-in zoom-in-0 duration-500 delay-150" />
              </div>
              <p className="mt-6 text-3xl font-black text-[#9BE8C8] animate-in fade-in slide-in-from-bottom-2 duration-500 delay-150">
                ¡Pago recibido!
              </p>
              <p className="mt-3 text-6xl font-black leading-none tracking-tight tabular-nums text-white animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200">
                {formatUsd(invoice.amount)}
              </p>
              <p className="mt-2 text-sm text-zinc-500 animate-in fade-in duration-500 delay-300">
                {invoice.txHash ? `Tx: ${shortAddress(invoice.txHash)}` : "Confirmado en Sepolia"}
              </p>
              <button
                onClick={reset}
                className="mt-8 w-full rounded-xl bg-[#9BE8C8] py-4 text-lg font-bold text-black transition hover:bg-[#7BCFAF] animate-in fade-in slide-in-from-bottom-2 duration-500 delay-400"
              >
                Hacer otro cobro
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
