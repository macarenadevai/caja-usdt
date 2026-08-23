import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Quinto — your business in USD₮",
    short_name: "Quinto",
    description: "Collect, send and delegate payments in USD₮. Your phone is your point-of-sale terminal.",
    start_url: "/",
    display: "standalone",
    background_color: "#14172B",
    theme_color: "#14172B",
    lang: "en",
    orientation: "portrait",
    categories: ["business", "finance", "payments"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
