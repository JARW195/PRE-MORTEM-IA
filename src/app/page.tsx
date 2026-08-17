"use client";

// Prevent Next.js from statically caching the page HTML — this ensures the
// server always renders fresh code, eliminating SSR/CSR mismatches that
// happened when a stale cached HTML was served alongside a fresh JS bundle.
export const dynamic = "force-dynamic";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  BarChart3,
  Brain,
  FileSearch,
  GitCompare,
  ScrollText,
  ShieldAlert,
  Skull,
  Sparkles,
  X,
} from "lucide-react";
import { AnalysisForm } from "@/components/premortem/analysis-form";
import { HistoryPanel } from "@/components/premortem/history-panel";
import { LoadingState } from "@/components/premortem/loading-state";
import { Markdown } from "@/components/premortem/markdown";
import { ReportView } from "@/components/premortem/report-view";
import { ThemeToggle } from "@/components/premortem/theme-toggle";
import { useLanguage } from "@/components/premortem/language-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import type {
  Depth,
  Horizon,
  PremortemResult,
  ProjectType,
} from "@/lib/premortem/types";
import type { JobPhase } from "@/lib/premortem/job-store";

const TEAM = [
  { glyph: "🔴", name: "Estratega pesimista" },
  { glyph: "💰", name: "Director financiero" },
  { glyph: "👥", name: "Experto en personas" },
  { glyph: "💻", name: "Arquitecto tecnológico" },
  { glyph: "⚙️", name: "Director de operaciones" },
  { glyph: "⚖️", name: "Compliance & reputación" },
  { glyph: "🧠", name: "Adversario estratégico" },
];

const PIPELINE = [
  { icon: FileSearch, label: "Comprender", desc: "Objetivo, problema, recursos y supuestos." },
  { icon: Skull, label: "Declarar el fracaso", desc: "Asumimos que el proyecto ya fracasó." },
  { icon: AlertTriangle, label: "Atacar", desc: "Equipo multidisciplinario busca causas." },
  { icon: ShieldAlert, label: "Priorizar", desc: "Matriz de riesgo con score 1–125." },
  { icon: ScrollText, label: "Defender", desc: "Plan concreto y ejecutable." },
  { icon: Brain, label: "Segundo ataque", desc: "Vulnerabilidades residuales." },
];

export default function Home() {
  const { t } = useLanguage();
  const [result, setResult] = React.useState<PremortemResult | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [history, setHistory] = React.useState<PremortemResult[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = React.useState(true);
  const [jobPhase, setJobPhase] = React.useState<JobPhase | undefined>(undefined);
  const [jobMessage, setJobMessage] = React.useState<string | null>(null);
  const [compareIds, setCompareIds] = React.useState<string[]>([]);
  const [comparing, setComparing] = React.useState<PremortemResult[] | null>(null);
  // Static creation date of the software (does not change).
  const creationDate = "17 de agosto de 2026";

  // Load history on mount
  const loadHistory = React.useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/analyses", { cache: "no-store" });
      const data = await res.json();
      if (data.analyses) {
        setHistory(data.analyses);
      }
    } catch {
      /* silent */
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  React.useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  async function handleRun(input: {
    projectDescription: string;
    projectType: ProjectType;
    horizon: Horizon;
    depth: Depth;
    context: string;
    files?: { id: string; file: File }[];
  }) {
    setLoading(true);
    setError(null);
    setResult(null);
    setJobPhase("queued");
    setJobMessage(null);
    // Scroll to the report on mobile
    requestAnimationFrame(() => {
      document
        .getElementById("report-zone")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    // Polling state for cancellation
    let cancelled = false;
    const cancelGuard = () => cancelled;

    try {
      // Step 1: submit the analysis — the server starts it in the background
      // and returns a job id immediately. This keeps the POST request short so
      // the gateway never times out with 502 Bad Gateway.
      const submitController = new AbortController();
      const submitTimeout = setTimeout(() => submitController.abort(), 30000);
      let res: Response;
      if (input.files && input.files.length > 0) {
        const form = new FormData();
        form.append("projectDescription", input.projectDescription);
        form.append("projectType", input.projectType);
        form.append("horizon", input.horizon);
        form.append("depth", input.depth);
        if (input.context.trim()) form.append("context", input.context);
        for (const f of input.files) {
          form.append("files", f.file, f.file.name);
        }
        res = await fetch("/api/premortem", {
          method: "POST",
          body: form,
          signal: submitController.signal,
        });
      } else {
        res = await fetch("/api/premortem", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
          signal: submitController.signal,
        });
      }
      clearTimeout(submitTimeout);

      const submitText = await res.text();
      let submitData: { jobId?: string; error?: string; detail?: string } | null = null;
      if (submitText) {
        try {
          submitData = JSON.parse(submitText);
        } catch {
          if (!res.ok) {
            throw new Error(
              `El servidor respondió ${res.status} ${res.statusText}. ` +
                "Puede deberse a una caída temporal del servicio. Intenta nuevamente."
            );
          }
          throw new Error(
            "El servidor devolvió una respuesta inesperada. Intenta nuevamente."
          );
        }
      }
      if (!res.ok) {
        throw new Error(
          submitData?.error || submitData?.detail || `Error ${res.status}`
        );
      }
      const jobId = submitData?.jobId;
      if (!jobId) {
        throw new Error("El servidor no devolvió un identificador de trabajo.");
      }

      // Step 2: poll the job status until done or error.
      // Each poll is a short request, so the gateway never holds a long
      // connection open. Total wait can be up to ~6 minutes.
      const maxWaitMs = 6 * 60 * 1000;
      const startedAt = Date.now();
      const pollIntervalMs = 2500;
      let lastError: string | null = null;

      while (!cancelGuard()) {
        if (Date.now() - startedAt > maxWaitMs) {
          throw new Error(
            "El análisis tardó demasiado en completarse. El modelo puede estar saturado; intenta nuevamente en unos segundos."
          );
        }
        await new Promise((r) => setTimeout(r, pollIntervalMs));
        if (cancelGuard()) break;

        let pollRes: Response;
        try {
          pollRes = await fetch(`/api/premortem/${jobId}`, {
            cache: "no-store",
          });
        } catch {
          // network blips during polling are recoverable; keep trying
          continue;
        }
        if (!pollRes.ok) {
          // 404 means the job expired or was never found
          if (pollRes.status === 404) {
            throw new Error(
              "El trabajo de análisis expiró o no se encontró. Intenta nuevamente."
            );
          }
          continue;
        }
        const pollText = await pollRes.text();
        let pollData: {
          status?: string;
          phase?: JobPhase;
          phaseMessage?: string | null;
          result?: PremortemResult;
          error?: string;
        } | null = null;
        try {
          pollData = JSON.parse(pollText);
        } catch {
          continue;
        }
        // Update the real progress indicator from the job phase.
        if (pollData?.phase) {
          setJobPhase(pollData.phase);
          setJobMessage(pollData.phaseMessage ?? null);
        }
        const status = pollData?.status;
        if (status === "done" && pollData?.result) {
          const result = pollData.result;
          setResult(result);
          setActiveId(result.id);
          setJobPhase("finished");
          setHistory((prev) => {
            const next = [
              result,
              ...prev.filter((h) => h.id !== result.id),
            ];
            return next;
          });
          toast.success("Pre-mortem completado", {
            description: `Índice de preparación: ${result.score ?? "—"}/100`,
          });
          return;
        }
        if (status === "error") {
          lastError = pollData?.error ?? "Error desconocido al generar el análisis.";
          throw new Error(lastError);
        }
        // status === "pending" | "running" → keep polling
      }
    } catch (err) {
      if (cancelGuard()) return;
      let message: string;
      if (err instanceof Error) {
        const name = err.name;
        const msg = err.message.toLowerCase();
        if (name === "AbortError" || msg.includes("aborted")) {
          message =
            "La conexión con el servidor se interrumpió. Intenta nuevamente.";
        } else if (msg.includes("failed to fetch") || msg.includes("network")) {
          message =
            "Error de conexión con el servidor. Verifica tu red e intenta nuevamente.";
        } else {
          message = err.message;
        }
      } else {
        message = "Error al ejecutar el análisis.";
      }
      setError(message);
      toast.error("Falló el análisis", {
        description: message,
        duration: 8000,
      });
    } finally {
      if (!cancelGuard()) setLoading(false);
    }
  }

  async function handleSelect(item: PremortemResult) {
    // If we already have the full report, just use it
    if (item.report) {
      setResult(item);
      setActiveId(item.id);
      setError(null);
      document
        .getElementById("report-zone")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    // Otherwise fetch the full analysis
    setActiveId(item.id);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/analyses/${item.id}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.analysis) {
        throw new Error(data.error || "No se pudo cargar el análisis.");
      }
      setResult(data.analysis);
      // Update history item with full report
      setHistory((prev) =>
        prev.map((h) => (h.id === item.id ? { ...h, ...data.analysis } : h))
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al cargar el análisis.";
      setError(message);
      toast.error("Error", { description: message });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    const prev = history;
    setHistory((p) => p.filter((h) => h.id !== id));
    if (activeId === id) {
      setResult(null);
      setActiveId(null);
    }
    try {
      await fetch(`/api/analyses/${id}`, { method: "DELETE" });
      toast.success("Análisis eliminado");
    } catch {
      setHistory(prev);
      toast.error("No se pudo eliminar");
    }
  }

  async function handleClear() {
    const prev = history;
    setHistory([]);
    setResult(null);
    setActiveId(null);
    try {
      await fetch("/api/analyses", { method: "DELETE" });
      toast.success("Historial limpiado");
    } catch {
      setHistory(prev);
      toast.error("No se pudo limpiar el historial");
    }
  }

  function handleReset() {
    setResult(null);
    setError(null);
    setActiveId(null);
    setJobPhase(undefined);
    setJobMessage(null);
  }

  // #4 — edit title/tags
  async function handleEdit(
    id: string,
    patch: { title?: string; tags?: string[]; notes?: string }
  ) {
    const res = await fetch(`/api/analyses/${id}/edit`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "No se pudo actualizar.");
    }
    const updated = await res.json();
    setHistory((prev) =>
      prev.map((h) =>
        h.id === id
          ? { ...h, title: updated.title, tags: JSON.stringify(updated.tags) }
          : h
      )
    );
    if (result?.id === id) {
      setResult((r) => (r ? { ...r, title: updated.title } : r));
    }
  }

  // #8 — share
  async function handleShare(id: string): Promise<string | null> {
    const res = await fetch(`/api/analyses/${id}/share`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "No se pudo generar el enlace.");
    }
    const data = await res.json();
    return data.shareToken ?? null;
  }

  // #9 — reminder
  async function handleReminder(id: string, date: string) {
    const res = await fetch(`/api/analyses/${id}/edit`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reminderAt: date }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "No se pudo configurar el recordatorio.");
    }
  }

  // #3 — comparison
  function toggleCompare(id: string) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  }

  async function runCompare() {
    if (compareIds.length !== 2) return;
    setComparing(null);
    try {
      const results = await Promise.all(
        compareIds.map(async (id) => {
          const r = await fetch(`/api/analyses/${id}`, { cache: "no-store" });
          const d = await r.json();
          return d.analysis as PremortemResult;
        })
      );
      setComparing(results);
      document
        .getElementById("report-zone")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      toast.error("No se pudo comparar", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  const hasResult = !!(result || loading || error);

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      {/* Ambient background */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 opacity-60"
        style={{
          background:
            "radial-gradient(900px 500px at 15% -10%, rgba(245,158,11,0.10), transparent 60%), radial-gradient(700px 500px at 95% 0%, rgba(239,68,68,0.08), transparent 55%)",
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="PRE-MORTEM IA"
              className="h-8 w-auto rounded-md object-contain"
              draggable={false}
            />
            <div className="leading-none">
              <p className="text-sm font-bold tracking-tight">
                PRE-MORTEM IA
              </p>
              <p className="text-[0.65rem] text-muted-foreground">
                Simulador de fracaso preventivo
              </p>
            </div>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            {compareIds.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1"
                onClick={runCompare}
                disabled={compareIds.length !== 2}
              >
                <GitCompare className="size-3.5" />
                Comparar ({compareIds.length}/2)
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1"
              onClick={() => {
                const el = document.getElementById("metrics-zone");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <BarChart3 className="size-3.5" />
              Métricas
            </Button>
            <Badge variant="outline" className="gap-1 font-normal text-muted-foreground">
              <Sparkles className="size-3 text-amber-400" />
              Powered by LLM
            </Badge>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto w-full max-w-7xl px-4 pt-10 pb-6 sm:px-6 sm:pt-14">
        {/* Featured logo — the visual anchor of the app */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8 flex flex-col items-center justify-center"
        >
          <div className="relative">
            {/* Glow behind the logo */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10 blur-2xl"
              style={{
                background:
                  "radial-gradient(closest-side, rgba(34,211,238,0.18), transparent 70%)",
              }}
            />
            <img
              src="/logo.png"
              alt="PRE-MORTEM IA — Simulador de Fracaso Preventivo"
              className="h-auto w-[min(80vw,420px)] select-none object-contain drop-shadow-[0_4px_24px_rgba(34,211,238,0.25)] sm:w-[min(70vw,460px)]"
              draggable={false}
            />
          </div>
          <p className="mt-3 text-[0.7rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            AI Failure Simulator
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-3xl"
        >
          <Badge variant="outline" className="mb-3 gap-1.5 border-amber-500/30 bg-amber-500/5 text-amber-400">
            <Skull className="size-3" />
            Análisis adversarial preventivo
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Descubre cómo podría fracasar tu proyecto{" "}
            <span className="bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
              antes de que sea tarde
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Un equipo virtual de 7 especialistas intenta destruir intelectualmente
            tu idea: busca supuestos débiles, omisiones, puntos únicos de falla y
            riesgos invisibles. No busca agradarte. Busca lo que tú no estás viendo.
          </p>
        </motion.div>

        {/* Pipeline */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6"
        >
          {PIPELINE.map((step, i) => (
            <div
              key={step.label}
              className="rounded-lg border border-border/60 bg-muted/20 p-3"
            >
              <div className="flex items-center gap-2">
                <step.icon className="size-4 text-amber-400" />
                <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <p className="mt-1.5 text-xs font-semibold text-foreground">
                {step.label}
              </p>
              <p className="mt-0.5 text-[0.7rem] leading-snug text-muted-foreground">
                {step.desc}
              </p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Main grid */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-16 sm:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
          {/* Left: form + history */}
          <div className="flex flex-col gap-6">
            <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="text-lg">🎯</span>
                  Proyecto a analizar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AnalysisForm onRun={handleRun} loading={loading} />
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
              <CardContent className="p-0">
                <HistoryPanel
                  items={history}
                  activeId={activeId}
                  onSelect={handleSelect}
                  onDelete={handleDelete}
                  onClear={handleClear}
                  onEdit={handleEdit}
                />
                {compareIds.length > 0 && (
                  <div className="border-t border-border/40 px-3 py-2">
                    <p className="mb-1 text-[0.65rem] text-muted-foreground">
                      Modo comparación: selecciona 2 análisis.
                    </p>
                    <div className="flex gap-1">
                      {history
                        .filter((h) => compareIds.includes(h.id))
                        .map((h) => (
                          <button
                            key={h.id}
                            onClick={() => toggleCompare(h.id)}
                            className="rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[0.65rem] text-amber-400"
                          >
                            {h.title.slice(0, 20)}…
                          </button>
                        ))}
                    </div>
                  </div>
                )}
                {loadingHistory && (
                  <div className="px-4 pb-4 text-center text-xs text-muted-foreground">
                    Cargando historial…
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Virtual team reference */}
            <Card className="border-border/60 bg-card/40 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Equipo virtual
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-1.5 pt-0 text-xs sm:grid-cols-2">
                {TEAM.map((m) => (
                  <div
                    key={m.name}
                    className="flex items-center gap-2 rounded-md border border-border/40 bg-muted/20 px-2 py-1.5"
                  >
                    <span aria-hidden>{m.glyph}</span>
                    <span className="text-foreground/80">{m.name}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right: report / loading / empty / comparison */}
          <div id="report-zone" className="min-h-[60vh] scroll-mt-20">
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
                    <CardContent>
                      <LoadingState phase={jobPhase} phaseMessage={jobMessage} />
                    </CardContent>
                  </Card>
                </motion.div>
              ) : comparing ? (
                <motion.div
                  key="comparison"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
                    <CardContent>
                      <ComparisonView analyses={comparing} onClose={() => setComparing(null)} />
                    </CardContent>
                  </Card>
                </motion.div>
              ) : hasResult ? (
                <motion.div
                  key="report"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
                    <CardContent>
                      <ReportView
                        result={result}
                        loading={loading}
                        error={error}
                        onReset={handleReset}
                        onEdit={handleEdit}
                        onShare={handleShare}
                        onReminder={handleReminder}
                      />
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <EmptyState />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Metrics section (#15) */}
        <div id="metrics-zone" className="mt-8 scroll-mt-20">
          <MetricsView />
        </div>
      </main>

      <Separator className="bg-border/60" />

      {/* Footer (sticky bottom) */}
      <footer className="mt-auto border-t border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-center sm:flex-row sm:px-6 sm:text-left">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground/80">PRE-MORTEM IA</span>{" "}
            · Análisis heurístico de IA — no constituye auditoría profesional certificada
            ni garantía de éxito.
          </p>
          <p className="text-xs text-muted-foreground">
            Principio rector:{" "}
            <span className="italic text-foreground/70">
              «descubre cómo perder antes de que sea demasiado tarde»
            </span>
          </p>
        </div>
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 border-t border-border/40 px-4 py-2.5 sm:px-6">
          <p className="text-[0.7rem] text-muted-foreground">
            Creado por{" "}
            <span className="font-bold tracking-wide text-amber-400">JARW</span>
            {" · "}
            <span className="tabular-nums">{creationDate}</span>
          </p>
        </div>
      </footer>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-6 rounded-xl border border-dashed border-border/60 bg-muted/10 px-6 py-16 text-center">
      <div className="grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-red-600/20 text-3xl">
        🧠
      </div>
      <div className="max-w-md space-y-2">
        <h2 className="text-xl font-semibold text-foreground">
          Aún no hay análisis
        </h2>
        <p className="text-sm text-muted-foreground">
          Describe tu proyecto a la izquierda y pulsa{" "}
          <span className="font-medium text-amber-400">Ejecutar Pre-Mortem</span>.
          El equipo virtual asumirá que tu proyecto ya fracasó y buscará exactamente
          por qué.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
        <span>¿Qué obtendrás?</span>
        <Badge variant="outline" className="font-normal">TOP 5 riesgos</Badge>
        <Badge variant="outline" className="font-normal">Score 1–125</Badge>
        <Badge variant="outline" className="font-normal">Riesgo invisible</Badge>
        <Badge variant="outline" className="font-normal">Plan de defensa</Badge>
        <Badge variant="outline" className="font-normal">Segundo ataque</Badge>
        <Badge variant="outline" className="font-normal">Veredicto final</Badge>
      </div>
    </div>
  );
}

// #3 — Comparison view (two analyses side by side)
function ComparisonView({
  analyses,
  onClose,
}: {
  analyses: PremortemResult[];
  onClose: () => void;
}) {
  const [a, b] = analyses;
  if (!a || !b) return null;
  const scoreDiff = (a.score ?? 0) - (b.score ?? 0);
  return (
    <div className="py-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitCompare className="size-5 text-amber-400" />
          <h2 className="text-lg font-semibold">Comparación de análisis</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="size-4" /> Cerrar
        </Button>
      </div>
      {/* Score diff */}
      <div className="mb-4 flex items-center justify-center gap-4 rounded-lg border border-border/60 bg-muted/20 p-4">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Análisis A</p>
          <p className="font-mono text-2xl font-bold text-amber-400">{a.score ?? "—"}</p>
          <p className="mt-0.5 max-w-[140px] truncate text-xs text-muted-foreground" title={a.title}>
            {a.title}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Diferencia</p>
          <p
            className={
              "font-mono text-2xl font-bold " +
              (scoreDiff > 0
                ? "text-emerald-400"
                : scoreDiff < 0
                  ? "text-red-400"
                  : "text-muted-foreground")
            }
          >
            {scoreDiff > 0 ? "+" : ""}
            {scoreDiff}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">puntos</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Análisis B</p>
          <p className="font-mono text-2xl font-bold text-amber-400">{b.score ?? "—"}</p>
          <p className="mt-0.5 max-w-[140px] truncate text-xs text-muted-foreground" title={b.title}>
            {b.title}
          </p>
        </div>
      </div>
      {/* Side-by-side reports */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {analyses.map((an, idx) => (
          <div key={an.id} className="rounded-lg border border-border/60 bg-muted/10 p-3">
            <div className="mb-2 flex items-center gap-2">
              <span className="grid size-5 place-items-center rounded bg-amber-500/20 text-[0.65rem] font-bold text-amber-400">
                {idx === 0 ? "A" : "B"}
              </span>
              <span className="text-sm font-semibold truncate">{an.title}</span>
            </div>
            <div className="max-h-[60vh] overflow-y-auto premortem-scroll pr-2">
              <article className="premortem-report text-sm">
                <Markdown content={an.report} />
              </article>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// #15 — Metrics view
function MetricsView() {
  const [metrics, setMetrics] = React.useState<{
    total: number;
    last7Days: number;
    avgScore: number | null;
    byType: Record<string, number>;
    byVerdict: Record<string, number>;
  } | null>(null);

  React.useEffect(() => {
    fetch("/api/metrics", { cache: "no-store" })
      .then((r) => r.json())
      .then(setMetrics)
      .catch(() => {});
  }, []);

  if (!metrics) return null;
  if (metrics.total === 0) return null;

  const verdictLabels: Record<string, string> = {
    ROBUSTO: "🟢 Robusto",
    "REQUIERE ATENCION": "🟡 Requiere atención",
    VULNERABLE: "🟠 Vulnerable",
    "ALTO RIESGO": "🔴 Alto riesgo",
  };
  const verdictColors: Record<string, string> = {
    ROBUSTO: "bg-emerald-500",
    "REQUIERE ATENCION": "bg-amber-500",
    VULNERABLE: "bg-orange-500",
    "ALTO RIESGO": "bg-red-500",
  };
  const maxVerdict = Math.max(1, ...Object.values(metrics.byVerdict));
  const maxType = Math.max(1, ...Object.values(metrics.byType));

  return (
    <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="size-4 text-amber-400" />
          Métricas de uso
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-border/40 bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Total análisis</p>
            <p className="font-mono text-2xl font-bold text-foreground">
              {metrics.total}
            </p>
          </div>
          <div className="rounded-lg border border-border/40 bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Últimos 7 días</p>
            <p className="font-mono text-2xl font-bold text-foreground">
              {metrics.last7Days}
            </p>
          </div>
          <div className="rounded-lg border border-border/40 bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Score promedio</p>
            <p className="font-mono text-2xl font-bold text-amber-400">
              {metrics.avgScore ?? "—"}
            </p>
          </div>
          <div className="rounded-lg border border-border/40 bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Tipos únicos</p>
            <p className="font-mono text-2xl font-bold text-foreground">
              {Object.keys(metrics.byType).length}
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Por veredicto
            </p>
            <div className="space-y-1.5">
              {Object.entries(metrics.byVerdict).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2">
                  <span className="w-28 shrink-0 text-xs text-muted-foreground">
                    {verdictLabels[k] ?? k}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={"h-full rounded-full " + (verdictColors[k] ?? "bg-muted-foreground")}
                      style={{ width: `${(v / maxVerdict) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right font-mono text-xs text-foreground/80">
                    {v}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Por tipo de proyecto
            </p>
            <div className="space-y-1.5">
              {Object.entries(metrics.byType).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2">
                  <span className="w-28 shrink-0 truncate text-xs text-muted-foreground">
                    {k}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-amber-500"
                      style={{ width: `${(v / maxType) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right font-mono text-xs text-foreground/80">
                    {v}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
