"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ArrowRight, Banknote, Bot, HandCoins, Send, WifiOff } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Caja — landing (ruta "/")                                          */
/*  4 piezas de info: qué es · para qué sirve · cómo funciona ·        */
/*  problemática. Minimalista y animada (CSS-only + IntersectionObs).  */
/* ------------------------------------------------------------------ */

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        shown ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

const PROBLEMAS = [
  {
    icon: Banknote,
    titulo: "Cobrar en dólares",
    detalle: "Sin banco en EE.UU., las pasarelas te cobran 5-8% o te rechazan.",
  },
  {
    icon: Send,
    titulo: "Remesas",
    detalle: "6-10% de comisión en intermediarios y sin tracking real.",
  },
  {
    icon: WifiOff,
    titulo: "Apps cripto",
    detalle: "Hechas para traders, no para negocios que solo quieren cobrar.",
  },
] as const;

const PASOS = [
  {
    icon: HandCoins,
    titulo: "Cobra",
    detalle: "Pon el monto y genera un QR. Tu cliente paga con cualquier wallet y la confirmación llega en vivo.",
  },
  {
    icon: Send,
    titulo: "Envía",
    detalle: "Remesas y pagos directos, rastreados en-chain: Enviado → Confirmado.",
  },
  {
    icon: Bot,
    titulo: "Delega",
    detalle: "Tu agente revisa saldos y propone pagos — nada se ejecuta sin tu confirmación.",
  },
] as const;

export default function Landing() {
  return (
    <main className="min-h-dvh bg-[#0A0A0A] text-white antialiased">
      {/* ===== Nav ===== */}
      <header className="sticky top-0 z-20 border-b border-white/5 bg-[#0A0A0A]/70 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
          <a href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00FFAA] text-lg font-black text-black">
              ₮
            </span>
            <span className="text-lg font-black tracking-tight">Caja</span>
          </a>
          <a
            href="/app"
            className="inline-flex items-center gap-2 rounded-xl bg-[#00FFAA] px-4 py-2 text-sm font-bold text-black transition-all hover:bg-[#00CC88] hover:shadow-[0_0_24px_rgba(0,255,170,0.35)]"
          >
            Abrir la app <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </header>

      {/* ===== Hero: qué es + para qué sirve ===== */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-32 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-[#00FFAA]/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-4xl items-center gap-12 px-5 pb-20 pt-16 md:grid-cols-[1.1fr_0.9fr] md:pb-28 md:pt-24">
          <div>
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#00FFAA]/25 bg-[#00FFAA]/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#00FFAA]">
                Aleph 2026 · WDK by Tether
              </span>
            </Reveal>
            <Reveal delay={120}>
              <h1 className="mt-6 text-[2.75rem] font-black leading-[1.02] tracking-tight md:text-6xl">
                La caja registradora de tu negocio, <span className="text-[#00FFAA]">en USD₮</span>
              </h1>
            </Reveal>
            <Reveal delay={240}>
              <p className="mt-5 max-w-md text-lg text-zinc-400">
                Cobra, envía y delega pagos en dólares estables desde tu celular.
                Sin banco, sin comisiones de 8%, sin KYC.
              </p>
            </Reveal>
            <Reveal delay={360}>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="/app"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#00FFAA] px-6 py-3.5 text-lg font-bold text-black transition-all hover:bg-[#00CC88] hover:shadow-[0_0_32px_rgba(0,255,170,0.4)]"
                >
                  Abrir Caja <ArrowRight className="h-5 w-5" />
                </a>
                <a
                  href="#como-funciona"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-6 py-3.5 text-lg font-bold text-zinc-300 transition-colors hover:border-white/25 hover:text-white"
                >
                  Cómo funciona
                </a>
              </div>
            </Reveal>
          </div>

          {/* Mockup del terminal */}
          <Reveal delay={300}>
            <div className="relative mx-auto w-full max-w-[300px]">
              <div className="pointer-events-none absolute inset-0 rounded-3xl bg-[#00FFAA]/10 blur-2xl" />
              <div className="relative animate-float rounded-3xl border border-white/10 bg-[#111111] p-8 text-center">
                <p className="text-[11px] uppercase tracking-[0.3em] text-zinc-500">Esperando pago</p>
                <p className="mt-3 text-5xl font-black leading-none tracking-tight tabular-nums">$12.50</p>
                <div className="mx-auto mt-6 w-fit rounded-2xl bg-white p-4 animate-pulse-ring">
                  <QRCodeSVG
                    value="caja://demo-12.50"
                    size={150}
                    fgColor="#0A0A0A"
                    bgColor="#FFFFFF"
                    level="M"
                    className="h-auto w-[150px]"
                  />
                </div>
                <p className="mt-5 text-sm text-[#00FFAA]">Escanea y paga · confirmación en vivo</p>
                <p className="mt-4 rounded-lg border border-[#00FFAA]/20 bg-[#00FFAA]/5 px-3 py-2 font-mono text-[11px] text-[#00FFAA]">
                  ✓ Cobro confirmado · 23s
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== Problema ===== */}
      <section className="border-t border-white/5 py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-5">
          <Reveal>
            <h2 className="max-w-xl text-2xl font-black leading-tight tracking-tight md:text-3xl">
              Operar en dólares desde LATAM <span className="text-[#00FFAA]">es caro o imposible</span>
            </h2>
          </Reveal>
          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {PROBLEMAS.map((p, i) => {
              const Icon = p.icon;
              return (
                <Reveal key={p.titulo} delay={i * 140}>
                  <div className="h-full rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#00FFAA]/40">
                    <Icon className="h-5 w-5 text-[#00FFAA]" />
                    <h3 className="mt-4 text-base font-black">{p.titulo}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-400">{p.detalle}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
          <Reveal delay={200}>
            <p className="mt-6 text-sm text-zinc-500">
              Caja lo resuelve: tu celular se vuelve la terminal y el USD₮ tu moneda.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ===== Cómo funciona ===== */}
      <section id="como-funciona" className="border-t border-white/5 py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-5">
          <Reveal>
            <h2 className="text-2xl font-black tracking-tight md:text-3xl">
              De QR a confirmación <span className="text-[#00FFAA]">en segundos</span>
            </h2>
          </Reveal>
          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {PASOS.map((p, i) => {
              const Icon = p.icon;
              return (
                <Reveal key={p.titulo} delay={i * 140}>
                  <div className="group h-full rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#00FFAA]/40 hover:bg-white/[0.04]">
                    <div className="flex items-center justify-between">
                      <Icon className="h-5 w-5 text-[#00FFAA]" />
                      <span className="font-mono text-2xl font-black text-white/10 transition-colors group-hover:text-[#00FFAA]/30">
                        0{i + 1}
                      </span>
                    </div>
                    <h3 className="mt-5 text-lg font-black">{p.titulo}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{p.detalle}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== CTA final ===== */}
      <section className="relative overflow-hidden py-20 md:py-24">
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-[#00FFAA]/10 blur-3xl" />
        <Reveal className="relative mx-auto max-w-2xl px-5 text-center">
          <h2 className="text-3xl font-black leading-tight tracking-tight md:text-5xl">
            Abre tu caja en <span className="text-[#00FFAA]">10 segundos</span>
          </h2>
          <p className="mt-4 text-zinc-400">Sepolia testnet · sin registro · sin tarjeta</p>
          <a
            href="/app"
            className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-[#00FFAA] px-8 py-4 text-xl font-black text-black transition-all hover:bg-[#00CC88] hover:shadow-[0_0_40px_rgba(0,255,170,0.45)]"
          >
            Abrir la app <ArrowRight className="h-6 w-6" />
          </a>
        </Reveal>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t border-white/5 py-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 text-xs text-zinc-600">
          <span className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#00FFAA] text-xs font-black text-black">
              ₮
            </span>
            Caja · tu negocio en USD₮
          </span>
          <span>Aleph 2026 · WDK by Tether</span>
        </div>
      </footer>
    </main>
  );
}
