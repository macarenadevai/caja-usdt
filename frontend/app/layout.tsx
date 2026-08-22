import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import SwRegister from "@/components/sw-register";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Caja — tu negocio en USD₮",
  description: "Cobra, envía y delega pagos en USD₮. Tu celular es tu terminal de punto de venta.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Caja",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        <SwRegister />
      </body>
    </html>
  );
}
