"use client";

import { useEffect, useState } from "react";
import Pdv from "@/components/pdv";
import Enviar from "@/components/enviar";
import Agente from "@/components/agente";
import { api, formatUsd } from "@/lib/api";
import { HandCoins, Send, Sparkles } from "lucide-react";

type Tab = "cobrar" | "enviar" | "agente";

const TABS: { id: Tab; label: string; icon: typeof Send }[] = [
  { id: "cobrar", label: "Cobrar", icon: HandCoins },
  { id: "enviar", label: "Enviar", icon: Send },
  { id: "agente", label: "Agente", icon: Sparkles },
];

export default function Home() {
  const [tab, setTab] = useState<Tab>("cobrar");
  const [balance, setBalance] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      try {
        const b = await api.balance();
        if (alive && b?.formatted) setBalance(b.formatted);
      } catch {
        /* backend apagado: mantener el último valor */
      }
    };
    refresh();
    const t = setInterval(refresh, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[#1A1A1A] bg-[#0A0A0A]/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00FFAA] text-lg font-black text-black">
              C
            </div>
            <div>
              <h1 className="text-lg font-black leading-none">Caja</h1>
              <p className="text-xs text-zinc-500">tu negocio en USD₮</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-widest text-zinc-500">Saldo</p>
            <p className="font-mono text-lg font-bold text-[#00FFAA]">{balance ?? "—"}</p>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="mx-auto flex max-w-3xl gap-1 px-4 pt-6">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${
                active
                  ? "bg-[#00FFAA] text-black"
                  : "border border-[#1A1A1A] bg-[#111111] text-zinc-400 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </nav>

      {/* Contenido */}
      <div className="mx-auto max-w-3xl px-4 pt-6 pb-16">
        {tab === "cobrar" && <Pdv />}
        {tab === "enviar" && <Enviar />}
        {tab === "agente" && <Agente />}
      </div>
    </main>
  );
}
