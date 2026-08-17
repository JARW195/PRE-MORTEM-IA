"use client";

import * as React from "react";
import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Markdown } from "@/components/premortem/markdown";
import { ScoreGauge } from "@/components/premortem/score-gauge";
import {
  DEPTH_LABELS,
  HORIZON_LABELS,
  PROJECT_TYPE_LABELS,
  type PremortemResult,
} from "@/lib/premortem/types";
import { cn } from "@/lib/utils";

function verdictStyle(verdict: string | null) {
  switch (verdict) {
    case "ROBUSTO":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-400";
    case "REQUIERE ATENCION":
      return "border-amber-500/40 bg-amber-500/10 text-amber-400";
    case "VULNERABLE":
      return "border-orange-500/40 bg-orange-500/10 text-orange-400";
    case "ALTO RIESGO":
      return "border-red-500/40 bg-red-500/10 text-red-400";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

export default function SharedAnalysisPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const [data, setData] = React.useState<PremortemResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      const { token } = await params;
      try {
        const res = await fetch(`/api/shared/${token}`, { cache: "no-store" });
        const d = await res.json();
        if (!res.ok) {
          setError(d.error || "No se pudo cargar el análisis.");
        } else {
          setData(d.analysis);
        }
      } catch {
        setError("Error de conexión.");
      } finally {
        setLoading(false);
      }
    })();
  }, [params]);

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 opacity-60"
        style={{
          background:
            "radial-gradient(900px 500px at 15% -10%, rgba(245,158,11,0.10), transparent 60%), radial-gradient(700px 500px at 95% 0%, rgba(239,68,68,0.08), transparent 55%)",
        }}
      />
      {/* Brand watermark */}
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
      <div className="relative z-10 flex flex-1 flex-col">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-4xl items-center gap-2.5 px-4">
          <img
            src="/logo.png"
            alt="PRE-MORTEM IA"
            className="h-8 w-auto rounded-md object-contain"
            draggable={false}
          />
          <div className="leading-none">
            <p className="text-sm font-bold tracking-tight">PRE-MORTEM IA</p>
            <p className="text-[0.65rem] text-muted-foreground">
              Análisis compartido públicamente
            </p>
          </div>
          <Badge
            variant="outline"
            className="ml-auto gap-1 border-amber-500/30 bg-amber-500/5 font-normal text-amber-400"
          >
            <ShieldCheck className="size-3" />
            Solo lectura
          </Badge>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Cargando análisis…
          </div>
        ) : error ? (
          <div className="py-16 text-center">
            <div className="text-4xl">⚠️</div>
            <p className="mt-2 font-semibold text-red-400">{error}</p>
          </div>
        ) : data ? (
          <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
            <CardContent>
              <div className="mb-5 flex flex-wrap items-center gap-2 border-b border-border/60 pb-5">
                <Badge variant="outline" className="font-normal">
                  {PROJECT_TYPE_LABELS[
                    data.projectType as keyof typeof PROJECT_TYPE_LABELS
                  ] ?? data.projectType}
                </Badge>
                <Badge variant="outline" className="font-normal">
                  {HORIZON_LABELS[data.horizon as keyof typeof HORIZON_LABELS] ??
                    data.horizon}
                </Badge>
                <Badge variant="outline" className="font-normal">
                  {DEPTH_LABELS[data.depth as keyof typeof DEPTH_LABELS] ??
                    data.depth}
                </Badge>
                {data.verdict && (
                  <span
                    className={cn(
                      "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide",
                      verdictStyle(data.verdict)
                    )}
                  >
                    {data.verdict.replace(/_/g, " ")}
                  </span>
                )}
              </div>
              {data.score != null && (
                <div className="mb-6 flex flex-col items-center gap-3 rounded-xl border border-border/60 bg-muted/20 p-6 sm:flex-row sm:gap-6">
                  <ScoreGauge score={data.score} size={156} />
                  <div className="text-center sm:text-left">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Índice de preparación
                    </p>
                    <p className="mt-1 text-sm text-foreground/80">
                      Análisis compartido el{" "}
                      {new Date(data.createdAt).toLocaleString("es", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                </div>
              )}
              <article className="premortem-report">
                <Markdown content={data.report} />
              </article>
            </CardContent>
          </Card>
        ) : null}
      </main>

      <footer className="mt-auto border-t border-border/60 bg-background/80 py-4 text-center">
        <p className="text-xs text-muted-foreground">
          PRE-MORTEM IA · Análisis heurístico de IA — no constituye auditoría
          profesional certificada ni garantía de éxito.
        </p>
        <p className="mt-1.5 text-[0.7rem] text-muted-foreground">
          Creado por{" "}
          <span className="font-bold tracking-wide text-amber-400">JARW</span>
          {" · "}
          <span className="tabular-nums">17 de agosto de 2026</span>
        </p>
      </footer>
      </div>
    </div>
  );
}
