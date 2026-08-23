"use client";

import { useEffect } from "react";

export default function SwRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // En desarrollo el SW cachea chunks viejos y rompe el hot-reload / hidratación.
    // Solo se registra en producción (PWA instalable); en dev se limpia lo que
    // haya quedado de visitas anteriores.
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const r of regs) r.unregister();
      });
      if (window.caches?.keys) {
        window.caches.keys().then((keys) => {
          for (const k of keys) window.caches.delete(k);
        });
      }
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* sin soporte — silencioso */
    });
  }, []);
  return null;
}
