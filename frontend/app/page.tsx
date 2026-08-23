"use client";

import { useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ArrowRight, Banknote, Bot, HandCoins, Send, WifiOff } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Caja — landing (ruta "/")                                          */
/*  4 piezas de info: qué es · para qué sirve · cómo funciona ·        */
/*  problemática. Minimalista y animada (CSS-only + IntersectionObs).  */
/* ------------------------------------------------------------------ */

/**
 * Reveal on scroll — patrón seguro: el contenido nace VISIBLE.
 * El JS solo lo oculta si está fuera de viewport y va a animar.
 * Si el JS falla o el observer no existe, la página se ve completa.
 */
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

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const rect = el.getBoundingClientRect();
    const inView = rect.top < window.innerHeight && rect.bottom > 0;
    if (inView) return; // ya visible → sin animación necesaria

    // Ocultar SOLO para animar (JS activo y elemento fuera de viewport)
    el.classList.add("reveal-hidden");

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.remove("reveal-hidden");
          io.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    io.observe(el);

    // Fallback 1: si el observer no dispara pero el elemento ya está en
    // viewport (usuario llegó), forzar visible en ≤1s.
    const t = setInterval(() => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) {
        el.classList.remove("reveal-hidden");
        io.disconnect();
        clearInterval(t);
      }
    }, 1000);

    // Fallback 2 (garantía total): pase lo que pase (webview, observer roto,
    // scroll en contenedor interno), el contenido SIEMPRE se revela a los 3.5s.
    // La animación es un refuerzo estético, nunca un bloqueo de contenido.
    const max = setTimeout(() => {
      el.classList.remove("reveal-hidden");
      io.disconnect();
      clearInterval(t);
    }, 3500);

    return () => {
      clearInterval(t);
      clearTimeout(max);
      io.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${className}`}
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

/**
 * Mockup del teléfono-terminal — CSS puro.
 * Comunica la tesis "tu celular es tu terminal punto de venta":
 * marco de iPhone con isla dinámica, la app de Caja en pantalla
 * (monto + QR + confirmación) y tabs inferiores, todo animado.
 */
function PhoneMockup() {
  return (
    <div className="relative mx-auto w-[310px]">
      {/* Glow */}
      <div className="pointer-events-none absolute -inset-12 rounded-[4.5rem] bg-[#9BE8C8]/15 blur-3xl" />
      {/* Botones laterales */}
      <div className="absolute -left-[4px] top-24 h-9 w-[4px] rounded-l-md bg-[#333] " />
      <div className="absolute -left-[4px] top-36 h-9 w-[4px] rounded-l-md bg-[#333] " />
      <div className="absolute -right-[4px] top-32 h-16 w-[4px] rounded-r-md bg-[#333] " />

      {/* Marco — titanio oscuro, esquinas muy redondeadas (iPhone real) */}
      <div className="relative animate-float rounded-[3.1rem] border-[9px] border-[#2E3554] bg-[#14172B] p-2.5 shadow-[0_30px_90px_rgba(0,0,0,0.75)]">
        {/* Isla dinámica */}
        <div className="relative mx-auto mt-0.5 flex h-7 w-28 items-center justify-center rounded-full bg-black">
          <div className="absolute left-7 flex h-3 w-3 items-center justify-center rounded-full bg-[#111]">
            <div className="h-1.5 w-1.5 rounded-full bg-[#2A4365]" />
          </div>
          <div className="h-3 w-12 rounded-full bg-[#0B0E1A]" />
        </div>

        {/* Pantalla */}
        <div className="mt-2.5 overflow-hidden rounded-[2.4rem] bg-[#14172B] px-4 pb-3.5">
          {/* Status bar */}
          <div className="flex items-center justify-between px-1 pt-2 text-[10px] font-bold text-zinc-500">
            <span>9:41</span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-3.5 rounded-[2px] bg-zinc-500" />
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-zinc-500" />
              <span className="inline-block h-2 w-4 rounded-[3px] border border-zinc-500 p-[1px]">
                <span className="block h-full w-2/3 rounded-[1px] bg-zinc-500" />
              </span>
            </span>
          </div>

          {/* Header de la app */}
          <div className="mt-2.5 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#9BE8C8] text-xs font-black text-black">
              ₮
            </span>
            <span className="text-xs font-black tracking-tight">Caja</span>
            <span className="ml-auto rounded-md bg-[#9BE8C8]/10 px-2 py-0.5 font-mono text-[9px] font-bold text-[#9BE8C8]">
              93.75 USDT
            </span>
          </div>

          {/* Monto + QR */}
          <div className="mt-4 text-center">
            <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500">
              Monto a cobrar
            </p>
            <p className="mt-1.5 text-5xl font-black leading-none tracking-tight tabular-nums">
              $12.50
            </p>
            <div className="mx-auto mt-3 w-fit animate-pulse-ring rounded-xl bg-white p-2">
              <QRCodeSVG
                value="caja://demo-12.50"
                size={96}
                fgColor="#14172B"
                bgColor="#FFFFFF"
                level="M"
                className="h-auto w-[96px]"
              />
            </div>
            <p className="mt-2.5 text-[10px] font-medium text-[#9BE8C8]">Escanea y paga · confirmación en vivo</p>
            <div className="mx-auto mt-1.5 w-fit rounded-lg border border-[#9BE8C8]/20 bg-[#9BE8C8]/5 px-2.5 py-1 font-mono text-[9px] text-[#9BE8C8]">
              ✓ Cobro confirmado · 23s
            </div>
          </div>

          {/* Tabs de la app */}
          <div className="mt-4 flex items-center justify-around rounded-xl bg-[#1C2038] py-2 text-[9px] font-bold">
            <span className="text-[#9BE8C8]">Cobrar</span>
            <span className="text-zinc-500">Enviar</span>
            <span className="text-zinc-500">Agente</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <main className="min-h-dvh bg-[#14172B] text-white antialiased">
      {/* ===== Nav ===== */}
      <header className="sticky top-0 z-20 border-b border-white/5 bg-[#14172B]/70 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
          <a href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#9BE8C8] text-lg font-black text-black">
              ₮
            </span>
            <span className="text-lg font-black tracking-tight">Caja</span>
          </a>
          <a
            href="/app"
            className="inline-flex items-center gap-2 rounded-xl bg-[#9BE8C8] px-4 py-2 text-sm font-bold text-black transition-all hover:bg-[#7BCFAF] hover:shadow-[0_0_24px_rgba(0,255,170,0.35)]"
          >
            Abrir la app <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </header>

      {/* ===== Hero: qué es + para qué sirve ===== */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-32 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-[#9BE8C8]/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-4xl items-center gap-12 px-5 pb-20 pt-16 md:grid-cols-[1.1fr_0.9fr] md:pb-28 md:pt-24">
          <div>
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#9BE8C8]/25 bg-[#9BE8C8]/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#9BE8C8]">
                Aleph 2026 · WDK by Tether
              </span>
            </Reveal>
            <Reveal delay={120}>
              <h1 className="mt-6 text-[2.75rem] font-black leading-[1.02] tracking-tight md:text-6xl">
                La caja registradora de tu negocio, <span className="text-[#9BE8C8]">en USD₮</span>
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
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#9BE8C8] px-6 py-3.5 text-lg font-bold text-black transition-all hover:bg-[#7BCFAF] hover:shadow-[0_0_32px_rgba(0,255,170,0.4)]"
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

          {/* Mockup del teléfono-terminal */}
          <Reveal delay={300} className="md:mt-0 mt-8">
            <PhoneMockup />
          </Reveal>
        </div>
      </section>

      {/* ===== Problema ===== */}
      <section className="border-t border-white/5 py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-5">
          <Reveal>
            <h2 className="max-w-xl text-2xl font-black leading-tight tracking-tight md:text-3xl">
              Operar en dólares desde LATAM <span className="text-[#9BE8C8]">es caro o imposible</span>
            </h2>
          </Reveal>
          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {PROBLEMAS.map((p, i) => {
              const Icon = p.icon;
              return (
                <Reveal key={p.titulo} delay={i * 140}>
                  <div className="h-full rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#9BE8C8]/40">
                    <Icon className="h-5 w-5 text-[#9BE8C8]" />
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
              De QR a confirmación <span className="text-[#9BE8C8]">en segundos</span>
            </h2>
          </Reveal>
          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {PASOS.map((p, i) => {
              const Icon = p.icon;
              return (
                <Reveal key={p.titulo} delay={i * 140}>
                  <div className="group h-full rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#9BE8C8]/40 hover:bg-white/[0.04]">
                    <div className="flex items-center justify-between">
                      <Icon className="h-5 w-5 text-[#9BE8C8]" />
                      <span className="font-mono text-2xl font-black text-white/10 transition-colors group-hover:text-[#9BE8C8]/30">
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
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-[#9BE8C8]/10 blur-3xl" />
        <Reveal className="relative mx-auto max-w-2xl px-5 text-center">
          <h2 className="text-3xl font-black leading-tight tracking-tight md:text-5xl">
            Abre tu caja en <span className="text-[#9BE8C8]">10 segundos</span>
          </h2>
          <p className="mt-4 text-zinc-400">Sepolia testnet · sin registro · sin tarjeta</p>
          <a
            href="/app"
            className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-[#9BE8C8] px-8 py-4 text-xl font-black text-black transition-all hover:bg-[#7BCFAF] hover:shadow-[0_0_40px_rgba(0,255,170,0.45)]"
          >
            Abrir la app <ArrowRight className="h-6 w-6" />
          </a>
        </Reveal>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t border-white/5 py-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 text-xs text-zinc-600">
          <span className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#9BE8C8] text-xs font-black text-black">
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
