"use client";

import { useEffect, useState } from "react";
import Pdv from "@/components/pdv";
import Enviar from "@/components/enviar";
import Agente from "@/components/agente";
import { api, formatUsd } from "@/lib/api";
import { HandCoins, Send, Sparkles } from "lucide-react";

type Tab = "cobrar" | "enviar" | "agente";

const TABS: { id: Tab; label: string; icon: typeof Send }[] = [
  { id: "cobrar", label: "Collect", icon: HandCoins },
  { id: "enviar", label: "Send", icon: Send },
  { id: "agente", label: "Agent", icon: Sparkles },
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
        /* backend down: keep the last known value */
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
    <main className="min-h-dvh bg-[#14172B] text-white pb-[max(4rem,env(safe-area-inset-bottom))]">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[#2A3050] bg-[#14172B]/80 backdrop-blur pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#9BE8C8] text-lg font-black text-black shadow-[0_0_20px_rgba(0,255,170,0.4)]">
              ₮
            </div>
            <div>
              <h1 className="text-lg font-black leading-none">Quinto</h1>
              <p className="mt-0.5 text-xs text-zinc-500">your business in USD₮</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-widest text-zinc-500">Balance</p>
            <p className="font-mono text-lg font-bold tabular-nums text-[#9BE8C8]">{balance ?? "—"}</p>
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
                  ? "bg-[#9BE8C8] text-black"
                  : "border border-[#2A3050] bg-[#1C2038] text-zinc-400 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </nav>

      {/* Contenido */}
      <div key={tab} className="mx-auto max-w-3xl px-4 pt-6 pb-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
        {tab === "cobrar" && <Pdv />}
        {tab === "enviar" && <Enviar />}
        {tab === "agente" && <Agente />}
      </div>
    </main>
  );
}
