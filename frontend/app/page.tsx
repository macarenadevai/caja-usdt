import { QRCodeSVG } from "qrcode.react";
import {
  ArrowRight,
  Banknote,
  Bot,
  CheckCircle2,
  HandCoins,
  Phone,
  QrCode,
  Send,
  ShieldCheck,
  Sparkles,
  WifiOff,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Caja — landing (ruta "/")                                          */
/*  La app vive en "/app". Server component: cero JS en el cliente.    */
/* ------------------------------------------------------------------ */

const PROBLEMAS = [
  {
    icon: Banknote,
    title: "Cobrar en dólares es un privilegio",
    body: "Sin cuenta bancaria en EE.UU., una visa de negocios o décadas de trámites, cobrar en USD es casi imposible en LATAM. Las pasarelas te exigen empresa constituida y te cobran 5-8% de entrada.",
  },
  {
    icon: Send,
    title: "Las remesas son caras y opacas",
    body: "Enviar dinero a tu familia cuesta 6-10% en comisiones y el tracking es una caja negra: no sabes cuándo llegó ni cuánto se comieron los intermediarios.",
  },
  {
    icon: WifiOff,
    title: "Las herramientas son para otro mundo",
    body: "Las apps cripto están hechas para traders. Un negocio no quiere charts ni gas wars — quiere una caja registradora que funcione como las de siempre, pero en USD₮.",
  },
];

const PILARES = [
  {
    icon: HandCoins,
    num: "01",
    title: "Cobra",
    body: "Tu celular es tu terminal punto de venta. Genera un QR con el monto, el cliente lo escanea con cualquier wallet y la confirmación aparece en vivo, con sonido de caja registradora.",
  },
  {
    icon: Send,
    num: "02",
    title: "Envía",
    body: "Paga proveedores o manda remesas directo, sin intermediarios. Cada envío se rastrea en-chain: Enviado → Confirmado, con historial completo.",
  },
  {
    icon: Bot,
    num: "03",
    title: "Delega",
    body: "Tu agente AI maneja la wallet por ti: revisa saldos, propone pagos y prepara todo. Pero nunca ejecuta sin tu confirmación — tú tienes la última palabra.",
  },
];

const PASOS = [
  {
    title: "Generas un cobro",
    body: "Escribes el monto y Caja crea un QR con la dirección de tu wallet y el monto exacto.",
  },
  {
    title: "El cliente paga",
    body: "Escanea con su wallet y envía USD₮. No necesita app de Caja, no necesita crear cuenta.",
  },
  {
    title: "Confirmación en vivo",
    body: "Caja detecta la transacción on-chain en segundos y suena la caja registradora. Listo para el siguiente cliente.",
  },
];

const STACK = [
  "WDK CLI (Tether)",
  "wdk-mcp",
  "Self-custody",
  "PWA instalable",
  "Sepolia testnet",
  "Next.js",
];

export default function Landing() {
  return (
    <main className="min-h-dvh bg-[#0A0A0A] text-white">
      {/* ===== Nav ===== */}
      <header className="sticky top-0 z-20 border-b border-[#1A1A1A] bg-[#0A0A0A]/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00FFAA] text-lg font-black text-black shadow-[0_0_20px_rgba(0,255,170,0.4)]">
              ₮
            </div>
            <span className="text-lg font-black">Caja</span>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-zinc-400 md:flex">
            <a href="#problema" className="transition hover:text-white">El problema</a>
            <a href="#como-funciona" className="transition hover:text-white">Cómo funciona</a>
            <a href="#tecnologia" className="transition hover:text-white">Tecnología</a>
          </nav>
          <a
            href="/app"
            className="inline-flex items-center gap-2 rounded-xl bg-[#00FFAA] px-4 py-2 text-sm font-bold text-black transition hover:bg-[#00CC88]"
          >
            Abrir la app <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </header>

      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-[#00FFAA]/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-5xl items-center gap-12 px-4 pb-16 pt-14 md:grid-cols-2 md:pt-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#00FFAA]/30 bg-[#00FFAA]/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#00FFAA]">
              <Sparkles className="h-3.5 w-3.5" /> Aleph Hackathon 2026 · WDK by Tether
            </span>
            <h1 className="mt-6 text-4xl font-black leading-[1.05] tracking-tight md:text-6xl">
              Tu celular es tu{" "}
              <span className="text-[#00FFAA]">terminal de cobro</span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-zinc-400">
              <strong className="text-white">Caja</strong> convierte tu negocio en USD₮:
              cobra con un QR, envía remesas con tracking y delega pagos a un agente
              que siempre te pide confirmación. Sin banco, sin comisiones de 8%.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="/app"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#00FFAA] px-6 py-3.5 text-lg font-bold text-black transition hover:bg-[#00CC88]"
              >
                Abrir Caja <ArrowRight className="h-5 w-5" />
              </a>
              <a
                href="#como-funciona"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#1A1A1A] bg-[#111111] px-6 py-3.5 text-lg font-bold text-zinc-300 transition hover:text-white"
              >
                Ver cómo funciona
              </a>
            </div>
            <p className="mt-4 flex items-center gap-2 text-sm text-zinc-500">
              <Phone className="h-4 w-4" /> Funciona en cualquier celular — instálala como app
            </p>
          </div>

          {/* Mockup del terminal */}
          <div className="relative mx-auto w-full max-w-sm">
            <div className="pointer-events-none absolute inset-0 rounded-3xl bg-[#00FFAA]/10 blur-2xl" />
            <div className="relative rounded-3xl border border-[#1A1A1A] bg-[#111111] p-8 text-center shadow-[0_0_80px_rgba(0,255,170,0.12)]">
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Esperando pago</p>
              <p className="mt-3 text-5xl font-black leading-none tracking-tight tabular-nums">
                $12.50
              </p>
              <div className="mx-auto mt-6 w-fit rounded-2xl bg-white p-4">
                <QRCodeSVG
                  value="caja://demo-12.50"
                  size={176}
                  fgColor="#0A0A0A"
                  bgColor="#FFFFFF"
                  level="M"
                  className="h-auto w-[176px]"
                />
              </div>
              <p className="mt-5 flex items-center justify-center gap-2 text-sm text-[#00FFAA]">
                <QrCode className="h-4 w-4" /> Escanea y paga — confirmación en vivo
              </p>
              <div className="mt-5 rounded-xl border border-[#00FFAA]/20 bg-[#00FFAA]/5 p-3 text-left">
                <p className="flex items-center gap-2 text-sm font-bold text-[#00FFAA]">
                  <CheckCircle2 className="h-4 w-4" /> Cobro confirmado
                </p>
                <p className="mt-1 font-mono text-xs text-zinc-400">
                  0x1a2b…9f3d · tx en 23s
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Problema ===== */}
      <section id="problema" className="border-t border-[#1A1A1A] bg-[#0D0D0D] py-16">
        <div className="mx-auto max-w-5xl px-4">
          <p className="text-sm font-bold uppercase tracking-widest text-[#00FFAA]">
            El problema
          </p>
          <h2 className="mt-3 max-w-2xl text-3xl font-black leading-tight tracking-tight md:text-4xl">
            En LATAM, cobrar en dólares es un privilegio reservado a pocos
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {PROBLEMAS.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.title}
                  className="rounded-2xl border border-[#1A1A1A] bg-[#111111] p-6 transition hover:border-[#00FFAA]/40"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00FFAA]/10">
                    <Icon className="h-5 w-5 text-[#00FFAA]" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">{p.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== Solución / Pilares ===== */}
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-4">
          <p className="text-sm font-bold uppercase tracking-widest text-[#00FFAA]">
            La solución
          </p>
          <h2 className="mt-3 max-w-2xl text-3xl font-black leading-tight tracking-tight md:text-4xl">
            La caja registradora de tu negocio, pero en USD₮
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {PILARES.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.num}
                  className="rounded-2xl border border-[#1A1A1A] bg-[#111111] p-6 transition hover:border-[#00FFAA]/40"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00FFAA]/10">
                      <Icon className="h-5 w-5 text-[#00FFAA]" />
                    </div>
                    <span className="font-mono text-3xl font-black text-[#1F1F1F]">{p.num}</span>
                  </div>
                  <h3 className="mt-4 text-xl font-bold">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">{p.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== Cómo funciona ===== */}
      <section id="como-funciona" className="border-t border-[#1A1A1A] bg-[#0D0D0D] py-16">
        <div className="mx-auto max-w-5xl px-4">
          <p className="text-sm font-bold uppercase tracking-widest text-[#00FFAA]">
            Cómo funciona
          </p>
          <h2 className="mt-3 max-w-2xl text-3xl font-black leading-tight tracking-tight md:text-4xl">
            De QR a confirmación en 3 pasos
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {PASOS.map((s, i) => (
              <div
                key={s.title}
                className="relative rounded-2xl border border-[#1A1A1A] bg-[#111111] p-6"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00FFAA] font-black text-black">
                  {i + 1}
                </div>
                <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Seguridad ===== */}
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-4">
          <div className="rounded-3xl border border-[#00FFAA]/20 bg-gradient-to-br from-[#00FFAA]/5 to-transparent p-8 md:p-12">
            <div className="grid items-center gap-8 md:grid-cols-2">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00FFAA]/10">
                  <ShieldCheck className="h-6 w-6 text-[#00FFAA]" />
                </div>
                <h2 className="mt-4 text-2xl font-black leading-tight tracking-tight md:text-3xl">
                  La IA propone. Tú decides.
                </h2>
                <p className="mt-3 max-w-md text-zinc-400">
                  El agente revisa saldos, arma la propuesta de pago y te la presenta.
                  Nada se ejecuta sin tu confirmación — un modelo de seguridad pensado
                  para negocios reales, no para traders.
                </p>
              </div>
              <div className="rounded-2xl border border-[#1A1A1A] bg-[#0A0A0A] p-5 font-mono text-sm">
                <p className="text-zinc-500"># chat con tu agente</p>
                <p className="mt-3 text-zinc-300">
                  <span className="text-zinc-500">tú:</span> paga $25 a la ferretería de ahorita
                </p>
                <p className="mt-2 text-[#00FFAA]">
                  <span className="text-zinc-500">agente:</span> Saldo: 93.75 USDT · Propongo
                  enviar 25 USDT a 0x1a2b…9f3d
                </p>
                <div className="mt-3 flex gap-2">
                  <span className="rounded-lg bg-[#00FFAA] px-3 py-1.5 font-bold text-black">Confirmar ✓</span>
                  <span className="rounded-lg border border-[#1A1A1A] px-3 py-1.5 text-zinc-400">Rechazar</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Tecnología ===== */}
      <section id="tecnologia" className="border-t border-[#1A1A1A] bg-[#0D0D0D] py-16">
        <div className="mx-auto max-w-5xl px-4">
          <p className="text-sm font-bold uppercase tracking-widest text-[#00FFAA]">
            Tecnología
          </p>
          <h2 className="mt-3 max-w-2xl text-3xl font-black leading-tight tracking-tight md:text-4xl">
            Construido sobre la wallet development kit de Tether
          </h2>
          <p className="mt-4 max-w-2xl text-zinc-400">
            Cada operación de wallet pasa por el <strong className="text-white">WDK CLI</strong> como
            bloque central, y el agente conversa con tu wallet vía{" "}
            <strong className="text-white">wdk-mcp</strong>. Tú tienes las llaves — self-custody
            real, cero smart contracts, cero custodios.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {STACK.map((s) => (
              <span
                key={s}
                className="rounded-full border border-[#1A1A1A] bg-[#111111] px-4 py-2 text-sm font-bold text-zinc-300"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA final ===== */}
      <section className="relative overflow-hidden py-20">
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#00FFAA]/10 blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-black leading-tight tracking-tight md:text-5xl">
            Abre tu caja en <span className="text-[#00FFAA]">10 segundos</span>
          </h2>
          <p className="mt-4 text-zinc-400">
            Corre en Sepolia testnet — sin registrarte, sin KYC, sin tarjeta. Tu celular es el terminal.
          </p>
          <a
            href="/app"
            className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-[#00FFAA] px-8 py-4 text-xl font-black text-black transition hover:bg-[#00CC88]"
          >
            Abrir la app <ArrowRight className="h-6 w-6" />
          </a>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t border-[#1A1A1A] py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 text-sm text-zinc-500 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#00FFAA] text-sm font-black text-black">
              ₮
            </div>
            <span className="font-bold text-zinc-300">Caja</span>
            <span>· tu negocio en USD₮</span>
          </div>
          <p>
            Demo en Sepolia testnet · Aleph Hackathon 2026 · WDK by Tether
          </p>
        </div>
      </footer>
    </main>
  );
}
