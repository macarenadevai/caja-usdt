import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permitir el dev server desde la LAN y Tailscale (Next bloquea Hosts no
  // confiables por anti-DNS-rebinding → 403 en los chunks → React no hidrata).
  allowedDevOrigins: ["192.168.1.69", "100.94.104.18", "*.local", "*.tailscale.io"],
  // Proxy del backend: el frontend sirve /api/* desde el mismo origin y Next
  // reenvía a Quinto (8788). En producción (Vercel) se configura BACKEND_URL
  // con la URL pública del backend (Tailscale Funnel, ej: https://xxx.ts.net).
  async rewrites() {
    const backend = process.env.BACKEND_URL || "http://localhost:8788";
    return [{ source: "/api/:path*", destination: `${backend}/api/:path*` }];
  },
};

export default nextConfig;
