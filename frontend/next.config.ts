import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permitir el dev server desde la LAN y Tailscale (Next bloquea Hosts no
  // confiables por anti-DNS-rebinding → 403 en los chunks → React no hidrata).
  allowedDevOrigins: ["192.168.1.69", "100.94.104.18", "*.local", "*.tailscale.io"],
  // Proxy del backend: el frontend sirve /api/* desde el mismo origin (3000)
  // y Next reenvía a Quinto (8788). Así funciona desde cualquier dispositivo
  // sin depender de localhost ni de CORS.
  async rewrites() {
    return [
      { source: "/api/:path*", destination: "http://localhost:8788/api/:path*" },
    ];
  },
};

export default nextConfig;
