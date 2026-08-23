// Sonido de caja registradora ("cha-ching") con Web Audio API — cero assets,
// cero dependencias. Se dispara al confirmarse un cobro.

let ctx: AudioContext | null = null;

function ensureCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null; // audio no disponible: silencio
  }
}

/** Dos campanadas estilo caja registradora (G6 → C7). */
export function playCashSound() {
  const ac = ensureCtx();
  if (!ac) return;
  const now = ac.currentTime;

  const ding = (freq: number, at: number, dur = 0.18) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(ac.destination);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.35, at + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.start(at);
    osc.stop(at + dur + 0.05);
  };

  // El clásico "cha-ching": campanada alta, luego una más aguda
  ding(1567.98, now);       // G6
  ding(2093.0, now + 0.16); // C7
  // Tercer armónico sutil para calidez
  ding(3135.96, now + 0.16, 0.1);
}
