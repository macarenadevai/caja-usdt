"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ArrowRight, Bot, HandCoins, Send } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Caja — landing (ruta "/") — minimalista, directa, animada          */
/*  La app vive en "/app". Animaciones CSS-only + IntersectionObserver.*/
/* ------------------------------------------------------------------ */

/** Reveal on scroll: fade + slide-up cuando entra en viewport. */
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

const PASOS = [
  { icon: HandCoins, titulo: "Cobra", detalle: "Monto → QR. Tu cliente paga con cualquier wallet." },
  { icon: Send, titulo: "Envía", detalle: "Remesas y pagos con tracking en vivo." },
  { icon: Bot, titulo: "Delega", detalle: "Tu agente propone, tú confirmas." },
] as const;

const DOLORES = ["Bancos que te excluyen", "Remesas con 8% de comisión", "Wallets hechas para traders"];

const STACK = ["WDK CLI", "wdk-mcp", "PWA", "Self-custody"];

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

      {/* ===== Hero ===== */}
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
                Tu celular es tu <span className="text-[#00FFAA]">terminal de cobro</span>
              </h1>
            </Reveal>
            <Reveal delay={240}>
              <p className="mt-5 max-w-md text-lg text-zinc-400">
                Cobra, envía y delega pagos en USD₮. Sin banco, sin comisiones, sin KYC.
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
            <Reveal delay={480}>
              <ul className="mt-8 space-y-2 text-sm text-zinc-500">
                {DOLORES.map((d) => (
                  <li key={d} className="flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-[#00FFAA]" />
                    {d}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>

          {/* Mockup del terminal — animación flotante sutil */}
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

      {/* ===== Cómo funciona ===== */}
      <section id="como-funciona" className="border-t border-white/5 py-20 md:py-24">
        <div className="mx-auto max-w-4xl px-5">
          <Reveal>
            <h2 className="text-2xl font-black tracking-tight md:text-3xl">
              De QR a confirmación <span className="text-[#00FFAA]">en segundos</span>
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-3 md:grid-cols-3">
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
          <Reveal delay={200}>
            <p className="mt-8 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-zinc-500">
              {STACK.map((s, i) => (
                <span key={s} className="flex items-center gap-2">
                  {i > 0 && <span className="text-white/15">·</span>}
                  <span className="font-bold text-zinc-400">{s}</span>
                </span>
              ))}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ===== CTA final ===== */}
      <section className="relative overflow-hidden py-20 md:py-28">
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
