import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "@/components/premortem/language-provider";
import { PwaRegister } from "@/components/premortem/pwa-register";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PRE-MORTEM IA — Simulador de Fracaso Preventivo",
  description:
    "Un equipo virtual de 7 especialistas intenta destruir tu proyecto antes de que lo ejecutes. Análisis adversarial: supuestos, riesgos, puntos únicos de falla y plan de defensa.",
  keywords: [
    "pre-mortem",
    "análisis de riesgos",
    "gestión de riesgos",
    "pensamiento crítico",
    "planificación de contingencias",
    "IA",
    "análisis preventivo",
  ],
  authors: [{ name: "PRE-MORTEM IA" }],
  icons: {
    icon: [
      { url: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icon-192.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "PRE-MORTEM IA",
    description:
      "Simulador de fracaso preventivo. Descubre cómo podría fracasar tu proyecto antes de que sea tarde.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#f59e0b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <LanguageProvider>
            {/* Brand watermark — fixed, non-interactive, subtle */}
            <div
              aria-hidden
              className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center"
            >
              <img
                src="/logo-watermark.png"
                alt=""
                className="select-none opacity-[0.18] dark:opacity-[0.12]"
                style={{ maxWidth: "min(70vw, 520px)", width: "auto", height: "auto" }}
                draggable={false}
              />
            </div>
            {/* Actual app content sits above the watermark */}
            <div className="relative z-10">
              {children}
            </div>
            <Toaster
              position="bottom-right"
              richColors
              closeButton
              toastOptions={{
                classNames: {
                  toast: "border-border",
                },
              }}
            />
            <PwaRegister />
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
