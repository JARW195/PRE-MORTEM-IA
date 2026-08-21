import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Video promocional — PRE-MORTEM IA",
  description:
    "Descubre cómo PRE-MORTEM IA descubre cómo podría fracasar tu proyecto antes de que sea tarde.",
  openGraph: {
    title: "PRE-MORTEM IA — Video promocional",
    description:
      "Un equipo virtual de especialistas ataca tu proyecto antes de que lo ejecutes.",
    type: "video.other",
  },
};

export default function VideoPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-4xl">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Volver a PRE-MORTEM IA
        </Link>

        <div className="mb-6 text-center sm:text-left">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            PRE-MORTEM IA
          </h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Descubre cómo podría fracasar tu proyecto antes de que sea tarde.
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-border/60 bg-black shadow-2xl shadow-black/20">
          <video
            className="aspect-video w-full"
            src="/videos/premortem-promo.mp4"
            controls
            playsInline
            preload="metadata"
          >
            Tu navegador no soporta la reproducción de video.
          </video>
        </div>

        <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-amber-500 to-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 transition-transform hover:scale-[1.02]"
          >
            Probar PRE-MORTEM IA
          </Link>
          <p className="text-sm text-muted-foreground">
            Aplicación creada por{" "}
            <span className="font-medium text-foreground">
              Johnathan Alexander Richardson Witt
            </span>
          </p>
        </div>
      </div>
    </main>
  );
}
