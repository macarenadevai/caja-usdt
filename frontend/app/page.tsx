"use client";

import { useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ArrowRight, Banknote, Bot, HandCoins, Send, WifiOff } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Quinto — landing page (route "/")                                  */
/*  4 pieces of info: what it is · what it's for · how it works ·      */
/*  the problem. Minimalist and animated (CSS-only + IntersectionObs). */
/* ------------------------------------------------------------------ */

/**
 * Reveal on scroll — safe pattern: content starts VISIBLE.
 * JS only hides it when it's outside the viewport and about to animate.
 * If JS fails or the observer is missing, the page is fully readable.
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
    if (inView) return; // already visible → no animation needed

    // Hide ONLY to animate (JS active and element outside viewport)
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

    // Fallback 1: if the observer never fires but the element is already in
    // the viewport (user scrolled to it), force it visible within ≤1s.
    const t = setInterval(() => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) {
        el.classList.remove("reveal-hidden");
        io.disconnect();
        clearInterval(t);
      }
    }, 1000);

    // Fallback 2 (total guarantee): whatever happens (webview, broken observer,
    // scroll in an inner container), content ALWAYS reveals at 3.5s.
    // Animation is a cosmetic enhancement, never a content blocker.
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
    titulo: "Collect in dollars",
    detalle: "Without a US bank account, gateways charge 5-8% or reject you.",
  },
  {
    icon: Send,
    titulo: "Remittances",
    detalle: "6-10% fees through intermediaries and no real tracking.",
  },
  {
    icon: WifiOff,
    titulo: "Crypto apps",
    detalle: "Built for experienced people, not businesses that just want to get paid.",
  },
] as const;

const PASOS = [
  {
    icon: HandCoins,
    titulo: "Collect",
    detalle: "Set the amount and generate a QR. Your customer pays with any wallet and confirmation arrives live.",
  },
  {
    icon: Send,
    titulo: "Send",
    detalle: "Remittances and direct payments, tracked onchain: Sent → Confirmed.",
  },
  {
    icon: Bot,
    titulo: "Delegate",
    detalle: "Your agent checks balances and proposes payments — nothing executes without your confirmation.",
  },
] as const;

/**
 * Phone-terminal mockup — pure CSS.
 * Communicates the thesis "your phone is your point-of-sale terminal":
 * iPhone frame with dynamic island, the Quinto app on screen
 * (amount + QR + confirmation) and bottom tabs, all animated.
 */
function PhoneMockup() {
  return (
    <div className="relative mx-auto w-[310px]">
      {/* Glow */}
      <div className="pointer-events-none absolute -inset-12 rounded-[4.5rem] bg-[#9BE8C8]/15 blur-3xl" />
      {/* Side buttons */}
      <div className="absolute -left-[4px] top-24 h-9 w-[4px] rounded-l-md bg-[#333] " />
      <div className="absolute -left-[4px] top-36 h-9 w-[4px] rounded-l-md bg-[#333] " />
      <div className="absolute -right-[4px] top-32 h-16 w-[4px] rounded-r-md bg-[#333] " />

      {/* Frame — dark titanium, very rounded corners (real iPhone) */}
      <div className="relative flex aspect-[9/19.5] animate-float flex-col rounded-[3.4rem] border-[9px] border-[#2E3554] bg-[#14172B] p-2.5 shadow-[0_30px_90px_rgba(0,0,0,0.75)]">
        {/* Dynamic island */}
        <div className="relative mx-auto mt-1 flex h-8 w-32 shrink-0 items-center justify-center rounded-full bg-black">
          <div className="absolute left-8 flex h-3 w-3 items-center justify-center rounded-full bg-[#111]">
            <div className="h-1.5 w-1.5 rounded-full bg-[#2A4365]" />
          </div>
          <div className="h-3 w-14 rounded-full bg-[#0B0E1A]" />
        </div>

        {/* Screen */}
        <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[2.6rem] bg-[#14172B] px-5 pb-4">
          {/* Status bar */}
          <div className="flex shrink-0 items-center justify-between px-1 pt-3 text-[11px] font-bold text-zinc-500">
            <span>9:41</span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-4 rounded-[2px] bg-zinc-500" />
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-zinc-500" />
              <span className="inline-block h-2.5 w-5 rounded-[3px] border border-zinc-500 p-[1px]">
                <span className="block h-full w-2/3 rounded-[1px] bg-zinc-500" />
              </span>
            </span>
          </div>

          {/* App header */}
          <div className="mt-3 flex shrink-0 items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#9BE8C8] text-sm font-black text-black">
              ₮
            </span>
            <span className="text-sm font-black tracking-tight">Quinto</span>
            <span className="ml-auto rounded-md bg-[#9BE8C8]/10 px-2 py-0.5 font-mono text-[10px] font-bold text-[#9BE8C8]">
              $93.75
            </span>
          </div>

          {/* Amount + QR — central block, breathes between header and tabs */}
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center py-2 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
              Amount to collect
            </p>
            <p className="mt-2 text-5xl font-black leading-none tracking-tight tabular-nums">
              $12.50
            </p>
            <div className="mx-auto mt-4 w-fit animate-pulse-ring rounded-2xl bg-white p-2.5">
              <QRCodeSVG
                value="quinto://demo-12.50"
                size={110}
                fgColor="#14172B"
                bgColor="#FFFFFF"
                level="M"
                className="h-auto w-[110px]"
              />
            </div>
            <p className="mt-3 text-[11px] font-medium text-[#9BE8C8]">Scan & pay · live confirmation</p>
            <div className="mt-2 w-fit rounded-lg border border-[#9BE8C8]/20 bg-[#9BE8C8]/5 px-3 py-1.5 font-mono text-[10px] text-[#9BE8C8]">
              ✓ Payment confirmed · 23s
            </div>
          </div>

          {/* App tabs */}
          <div className="flex shrink-0 items-center justify-around rounded-xl bg-[#1C2038] py-2.5 text-[10px] font-bold">
            <span className="text-[#9BE8C8]">Collect</span>
            <span className="text-zinc-500">Send</span>
            <span className="text-zinc-500">Agent</span>
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
            <span className="text-lg font-black tracking-tight">Quinto</span>
          </a>
          <a
            href="/app"
            className="inline-flex items-center gap-2 rounded-xl bg-[#9BE8C8] px-4 py-2 text-sm font-bold text-black transition-all hover:bg-[#7BCFAF] hover:shadow-[0_0_24px_rgba(0,255,170,0.35)]"
          >
            Open the app <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </header>

      {/* ===== Hero: what it is + what it's for ===== */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-32 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-[#9BE8C8]/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-4xl items-center gap-12 px-5 pb-20 pt-16 md:grid-cols-[1.1fr_0.9fr] md:pb-28 md:pt-24">
          <div>
            <Reveal delay={120}>
              <h1 className="mt-6 text-[2.75rem] font-black leading-[1.02] tracking-tight md:text-6xl">
                The point of sale for your business, collecting in <span className="text-[#9BE8C8]">digital dollars</span>
              </h1>
            </Reveal>
            <Reveal delay={240}>
              <p className="mt-5 max-w-md text-lg text-zinc-400">
                Collect, send and make autonomous payments in digital dollars from your phone.
                No banks, excessive fees, or unnecessary personal data.
              </p>
            </Reveal>
            <Reveal delay={360}>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="/app"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#9BE8C8] px-6 py-3.5 text-lg font-bold text-black transition-all hover:bg-[#7BCFAF] hover:shadow-[0_0_32px_rgba(0,255,170,0.4)]"
                >
                  Open Quinto <ArrowRight className="h-5 w-5" />
                </a>
                <a
                  href="#como-funciona"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-6 py-3.5 text-lg font-bold text-zinc-300 transition-colors hover:border-white/25 hover:text-white"
                >
                  How it works
                </a>
              </div>
            </Reveal>
          </div>

          {/* Phone-terminal mockup */}
          <Reveal delay={300} className="md:mt-0 mt-8">
            <PhoneMockup />
          </Reveal>
        </div>
      </section>

      {/* ===== Problem ===== */}
      <section className="border-t border-white/5 py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-5">
          <Reveal>
            <h2 className="max-w-xl text-2xl font-black leading-tight tracking-tight md:text-3xl">
              Operating in dollars from LATAM <span className="text-[#9BE8C8]">is expensive or impossible</span>
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
            <p className="mt-8 text-center text-lg font-black leading-snug tracking-tight md:text-2xl">
              Quinto solves it: <span className="text-[#9BE8C8]">your phone becomes the terminal</span> and
              <span className="text-[#9BE8C8]"> digital dollars your currency</span>
            </p>
          </Reveal>
        </div>
      </section>

      {/* ===== How it works ===== */}
      <section id="como-funciona" className="border-t border-white/5 py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-5">
          <Reveal>
            <h2 className="text-2xl font-black tracking-tight md:text-3xl">
              From QR to confirmation <span className="text-[#9BE8C8]">in seconds</span>
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

      {/* ===== Final CTA ===== */}
      <section className="relative overflow-hidden py-20 md:py-24">
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-[#9BE8C8]/10 blur-3xl" />
        <Reveal className="relative mx-auto max-w-2xl px-5 text-center">
          <h2 className="text-3xl font-black leading-tight tracking-tight md:text-5xl">
            Ready to go in <span className="text-[#9BE8C8]">10 seconds</span>
          </h2>
          <p className="mt-4 text-zinc-400">No sign-up · No card</p>
          <a
            href="/app"
            className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-[#9BE8C8] px-8 py-4 text-xl font-black text-black transition-all hover:bg-[#7BCFAF] hover:shadow-[0_0_40px_rgba(0,255,170,0.45)]"
          >
            Open the app <ArrowRight className="h-6 w-6" />
          </a>
        </Reveal>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t border-white/5 py-6">
        <div className="mx-auto max-w-4xl px-5 text-center text-xs text-zinc-500">
          Built by{" "}
          <a
            href="https://www.zerotwolabs.xyz/"
            target="_blank"
            rel="noreferrer"
            className="font-bold text-zinc-300 transition-colors hover:text-[#9BE8C8]"
          >
            Zero Two Labs
          </a>
        </div>
      </footer>
    </main>
  );
}
