"use client";

import { useRef, useState } from "react";
import { api, type Transfer, formatUsd, shortAddress } from "@/lib/api";
import { Check, Loader2, Send, Sparkles, X } from "lucide-react";

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
      text: "Hola 👋 Soy tu agente de caja. Pregúntame el saldo o pídeme hacer un envío, por ejemplo: \"envía 5 USDT a 0x…\".",
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
    setMsgs((m) => m.map((x) => (x.id === msg.id ? { ...x, proposalId: undefined, text: x.text } : x)));
    setLoading(true);
    try {
      if (!ok) {
        setMsgs((m) => [...m, { id: nextId++, role: "agent", text: "❌ Envío cancelado." }]);
        return;
      }
      const res = await api.agentConfirm(msg.proposalId);
      if (res.ok) {
        setMsgs((m) => [
          ...m,
          { id: nextId++, role: "agent", text: res.message, transfer: res.transfer },
        ]);
      } else {
        setMsgs((m) => [...m, { id: nextId++, role: "agent", text: res.message, error: true }]);
      }
    } catch (e) {
      setMsgs((m) => [...m, { id: nextId++, role: "agent", text: "Error: " + (e instanceof Error ? e.message : "desconocido"), error: true }]);
    } finally {
      setLoading(false);
      scrollDown();
    }
  };

  return (
    <div className="mx-auto flex h-[70vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-[#1A1A1A] bg-[#111111]">
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {msgs.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === "user"
                  ? "rounded-br-md bg-[#00FFAA] font-medium text-black"
                  : m.error
                    ? "rounded-bl-md border border-red-400/30 bg-red-400/10 text-red-300"
                    : "rounded-bl-md border border-[#1A1A1A] bg-[#0A0A0A] text-zinc-200"
              }`}
            >
              <p className="whitespace-pre-wrap">{m.text}</p>

              {m.proposalId && (
                <div className="mt-3 rounded-xl border border-[#00FFAA]/30 bg-[#00FFAA]/5 p-3">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-[#00FFAA]">
                    <Sparkles className="h-3.5 w-3.5" /> Propuesta de envío
                  </p>
                  <p className="break-all font-mono text-xs text-zinc-300">{m.proposalText}</p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => confirm(m, true)}
                      disabled={loading}
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#00FFAA] py-2 text-xs font-bold text-black transition hover:bg-[#00CC88] disabled:opacity-40"
                    >
                      <Check className="h-3.5 w-3.5" /> Confirmar
                    </button>
                    <button
                      onClick={() => confirm(m, false)}
                      disabled={loading}
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-[#1A1A1A] py-2 text-xs font-bold text-zinc-300 transition hover:bg-[#0A0A0A] disabled:opacity-40"
                    >
                      <X className="h-3.5 w-3.5" /> Rechazar
                    </button>
                  </div>
                </div>
              )}

              {m.transfer && (
                <div className="mt-3 rounded-xl border border-[#00FFAA]/30 bg-[#00FFAA]/5 p-3">
                  <p className="text-xs font-bold text-[#00FFAA]">📦 Envío en tracking</p>
                  <p className="mt-1 text-xl font-black text-white">{formatUsd(m.transfer.amount)}</p>
                  <p className="break-all font-mono text-xs text-zinc-400">→ {shortAddress(m.transfer.to)}</p>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    Estado: {m.transfer.status === "confirmed" ? "Confirmado ✓" : "Enviado…"}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-[#1A1A1A] bg-[#0A0A0A] px-4 py-3 text-sm text-zinc-400">
              <div className="flex items-center gap-1">
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-[#00FFAA]" />
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-[#00FFAA]" />
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-[#00FFAA]" />
              </div>
              <span className="ml-1">Caja está pensando…</span>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-[#1A1A1A] p-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Pregunta o pide un envío…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            disabled={loading}
            className="flex-1 rounded-xl border border-[#1A1A1A] bg-[#0A0A0A] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-[#00FFAA] disabled:opacity-50"
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00FFAA] text-black transition hover:bg-[#00CC88] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
