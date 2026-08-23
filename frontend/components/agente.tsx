"use client";

import { useEffect, useRef, useState } from "react";
import { api, type Transfer, formatUsd, friendlyLabel, friendlyText } from "@/lib/api";
import { Check, Send, Sparkles, X } from "lucide-react";
import Recibo from "./recibo";

interface Msg {
  id: number;
  role: "user" | "agent";
  text: string;
  proposalId?: string;
  proposalText?: string;
  transfer?: Transfer;
  error?: boolean;
}

let nextId = 1;

export default function Agente() {
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      id: nextId++,
      role: "agent",
      text: "Hola 👋 Soy tu agente de Quinto. Pregúntame el saldo o pídeme un envío, por ejemplo: \"envía 5 dólares a tu cliente\".",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollDown = () => {
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 50);
  };

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");
    setMsgs((m) => [...m, { id: nextId++, role: "user", text: msg }]);
    setLoading(true);
    scrollDown();
    try {
      const res = await api.agentMessage(msg);
      const agentMsg: Msg = { id: nextId++, role: "agent", text: res.reply };
      if (res.proposal) {
        agentMsg.proposalId = res.proposal.id;
        agentMsg.proposalText = res.proposal.text;
      }
      setMsgs((m) => [...m, agentMsg]);
    } catch (e) {
      setMsgs((m) => [...m, { id: nextId++, role: "agent", text: "Error: " + (e instanceof Error ? e.message : "desconocido"), error: true }]);
    } finally {
      setLoading(false);
      scrollDown();
    }
  };

  const confirm = async (msg: Msg, ok: boolean) => {
    if (!msg.proposalId) return;
    setMsgs((m) => m.map((x) => (x.id === msg.id ? { ...x, proposalId: undefined } : x)));
    setLoading(true);
    try {
      if (!ok) {
        // Cancelar también en el server: la propuesta no debe quedar pendiente.
        try {
          await api.agentReject(msg.proposalId);
        } catch {
          /* el rechazo local es suficiente para la demo */
        }
        setMsgs((m) => [...m, { id: nextId++, role: "agent", text: "❌ Envío cancelado." }]);
      } else {
        const res = await api.agentConfirm(msg.proposalId);
        if (res.ok) {
          setMsgs((m) => [
            ...m,
            { id: nextId++, role: "agent", text: res.message, transfer: res.transfer },
          ]);
        } else {
          setMsgs((m) => [...m, { id: nextId++, role: "agent", text: res.message, error: true }]);
        }
      }
    } catch (e) {
      setMsgs((m) => [...m, { id: nextId++, role: "agent", text: "Error: " + (e instanceof Error ? e.message : "desconocido"), error: true }]);
    } finally {
      setLoading(false);
      scrollDown();
    }
  };

  // Polling del envío del agente: sent → confirmed (receipts on-chain)
  const activeTransferId = [...msgs]
    .reverse()
    .find((m) => m.transfer?.status === "sent")?.transfer?.id;
  useEffect(() => {
    if (!activeTransferId) return;
    const t = setInterval(async () => {
      try {
        const tr = await api.getTransfer(activeTransferId);
        setMsgs((m) =>
          m.map((x) => (x.transfer && x.transfer.id === tr.id ? { ...x, transfer: tr } : x))
        );
      } catch {
        /* reintenta */
      }
    }, 2000);
    return () => clearInterval(t);
  }, [activeTransferId]);

  return (
    <div className="mx-auto flex h-[70vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-[#2A3050] bg-[#1C2038]">
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {msgs.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`min-w-0 max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed [overflow-wrap:anywhere] ${
                m.role === "user"
                  ? "rounded-br-md bg-[#9BE8C8] font-medium text-black"
                  : m.error
                    ? "rounded-bl-md border border-red-400/30 bg-red-400/10 text-red-300"
                    : "rounded-bl-md border border-[#2A3050] bg-[#14172B] text-zinc-200"
              }`}
            >
              <p className="whitespace-pre-wrap">{friendlyText(m.text)}</p>

              {m.proposalId && (
                <div className="mt-3 rounded-xl border border-[#9BE8C8]/30 bg-[#9BE8C8]/5 p-3">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-[#9BE8C8]">
                    <Sparkles className="h-3.5 w-3.5" /> Propuesta de envío
                  </p>
                  <p className="break-all font-mono text-xs text-zinc-300">
                    {friendlyText(m.proposalText || "")}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => confirm(m, true)}
                      disabled={loading}
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#9BE8C8] py-2 text-xs font-bold text-black transition hover:bg-[#7BCFAF] disabled:opacity-40"
                    >
                      <Check className="h-3.5 w-3.5" /> Confirmar
                    </button>
                    <button
                      onClick={() => confirm(m, false)}
                      disabled={loading}
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-[#2A3050] py-2 text-xs font-bold text-zinc-300 transition hover:bg-[#14172B] disabled:opacity-40"
                    >
                      <X className="h-3.5 w-3.5" /> Rechazar
                    </button>
                  </div>
                </div>
              )}

              {m.transfer &&
                (m.transfer.status === "confirmed" ? (
                  <Recibo
                    id={m.transfer.id}
                    tipo="Envío del agente"
                    monto={m.transfer.amount}
                    desde="tu caja"
                    hacia={friendlyLabel(m.transfer.to)}
                    estado="Confirmado"
                    txHash={m.transfer.txHash}
                  />
                ) : (
                  <div className="mt-3 rounded-xl border border-[#9BE8C8]/30 bg-[#9BE8C8]/5 p-3">
                    <p className="text-xs font-bold text-[#9BE8C8]">📦 Envío en curso</p>
                    <p className="mt-1 text-xl font-black text-white">{formatUsd(m.transfer.amount)}</p>
                    <p className="text-xs text-zinc-400">→ {friendlyLabel(m.transfer.to)}</p>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      {m.transfer.status === "failed" ? "Fallido ✗" : "Enviado…"}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-[#2A3050] bg-[#14172B] px-4 py-3 text-sm text-zinc-400">
              <div className="flex items-center gap-1">
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-[#9BE8C8]" />
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-[#9BE8C8]" />
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-[#9BE8C8]" />
              </div>
              <span className="ml-1">Quinto está pensando…</span>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-[#2A3050] p-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Pregunta o pide un envío…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            disabled={loading}
            className="flex-1 rounded-xl border border-[#2A3050] bg-[#14172B] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#9BE8C8] disabled:opacity-50"
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#9BE8C8] text-black transition hover:bg-[#7BCFAF] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
