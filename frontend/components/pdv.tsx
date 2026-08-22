"use client";

import { useCallback, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { api, type Invoice, formatUsd, shortAddress } from "@/lib/api";
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
  useEffect(() => {
    if (!invoiceId || invoicePaid) return;
    const t = setInterval(async () => {
      try {
        const inv = await api.getInvoice(invoiceId);
        setInvoice((prev) => (prev && prev.id === inv.id ? inv : prev));
      } catch {
        /* reintenta en el siguiente tick */
      }
    }, 2000);
    return () => clearInterval(t);
  }, [invoiceId, invoicePaid]);

  const copyAddress = async () => {
    if (!invoice) return;
    await navigator.clipboard.writeText(invoice.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const reset = () => {
    setInvoice(null);
    setAmount("");
    setError("");
  };

  return (
    <div className="mx-auto w-full max-w-md">
      {!invoice && (
        <div className="rounded-2xl border border-[#1A1A1A] bg-[#111111] p-8 shadow-[0_0_60px_rgba(0,255,170,0.05)]">
          <label className="mb-2 block text-sm font-medium text-zinc-400" htmlFor="monto">
            Monto a cobrar (USD₮)
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-[#1A1A1A] bg-[#0A0A0A] px-4 py-3 focus-within:border-[#00FFAA]">
            <span className="text-2xl font-bold text-[#00FFAA]">$</span>
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
              className="w-full bg-transparent text-4xl font-bold text-white outline-none placeholder:text-zinc-500"
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
            className="mt-6 w-full rounded-xl bg-[#00FFAA] py-4 text-lg font-bold text-black transition hover:bg-[#00CC88] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Generar QR de cobro
          </button>
        </div>
      )}

      {invoice && (
        <div className="rounded-2xl border border-[#1A1A1A] bg-[#111111] p-8 text-center shadow-[0_0_60px_rgba(0,255,170,0.08)]">
          {!invoicePaid ? (
            <>
              <p className="text-sm uppercase tracking-widest text-zinc-500">Esperando pago</p>
              <p className="mt-2 text-5xl font-black text-white">{formatUsd(invoice.amount)}</p>
              <p className="mt-1 text-sm text-zinc-500">
                {invoice.token.toUpperCase()} · {invoice.network}
              </p>

              <div className="mx-auto mt-6 w-fit rounded-xl bg-white p-4 animate-pulse-ring">
                <QRCodeSVG
                  value={invoice.qrPayload || invoice.address}
                  size={200}
                  fgColor="#0A0A0A"
                  bgColor="#FFFFFF"
                  level="M"
                  className="h-auto w-[200px] max-w-full"
                />
              </div>

              <button
                onClick={copyAddress}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#1A1A1A] bg-[#0A0A0A] px-3 py-2 font-mono text-sm text-zinc-300 transition hover:border-[#00FFAA]"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-[#00FFAA]" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {shortAddress(invoice.address)}
              </button>

              <div className="mt-6 flex items-center justify-center gap-2 text-[#00FFAA]">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Detectando el pago…</span>
              </div>

              <button
                onClick={reset}
                className="mt-4 inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-zinc-300"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Nuevo cobro
              </button>
            </>
          ) : (
            <div className="py-6">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#00FFAA]/10 ring-4 ring-[#00FFAA]/30 animate-in zoom-in-0 fade-in-0 duration-500 ease-out">
                <Check className="h-10 w-10 text-[#00FFAA] animate-in zoom-in-0 duration-500 delay-150" />
              </div>
              <p className="mt-6 text-2xl font-black text-[#00FFAA] animate-in fade-in slide-in-from-bottom-2 duration-500 delay-150">
                ¡Pago recibido!
              </p>
              <p className="mt-2 text-4xl font-black text-white animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200">
                {formatUsd(invoice.amount)}
              </p>
              <p className="mt-1 text-sm text-zinc-500 animate-in fade-in duration-500 delay-300">
                {invoice.txHash ? `Tx: ${shortAddress(invoice.txHash)}` : "Confirmado en Sepolia"}
              </p>
              <button
                onClick={reset}
                className="mt-8 w-full rounded-xl bg-[#00FFAA] py-3 font-bold text-black transition hover:bg-[#00CC88] animate-in fade-in slide-in-from-bottom-2 duration-500 delay-400"
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
