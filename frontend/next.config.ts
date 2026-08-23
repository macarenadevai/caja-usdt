import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the dev server from the LAN and Tailscale (Next blocks Host mismatches)
  // confiables por anti-DNS-rebinding → 403 en los chunks → React no hidrata).
  allowedDevOrigins: ["192.168.1.69", "100.94.104.18", "*.local", "*.tailscale.io"],
  // Proxy del backend: el frontend sirve /api/* desde el mismo origin y Next
  // proxies to Quinto (8788). In production (Vercel) set BACKEND_URL
  // con la URL pública del backend (Tailscale Funnel, ej: https://xxx.ts.net).
  async rewrites() {
    const backend = process.env.BACKEND_URL || "http://localhost:8788";
    return [{ source: "/api/:path*", destination: `${backend}/api/:path*` }];
  },
};

export default nextConfig;
