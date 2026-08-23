"use client";

import { useEffect } from "react";

export default function SwRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // In dev the SW caches old chunks and breaks hot-reload / hydration.
    // Only registered in production (installable PWA); in dev it cleans up
    // anything left from previous visits.
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
