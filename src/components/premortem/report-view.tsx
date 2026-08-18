"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Bell,
  BellRing,
  Check,
  Copy,
  Download,
  Eye,
  FileDown,
  FileSpreadsheet,
  Link2,
  ListChecks,
  Loader2,
  Pencil,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Markdown } from "./markdown";
import { RiskDashboard } from "./risk-dashboard";
import { ScoreGauge } from "./score-gauge";
import {
  DEPTH_LABELS,
  HORIZON_LABELS,
  PROJECT_TYPE_LABELS,
  type PremortemResult,
} from "@/lib/premortem/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ReportViewProps {
  result: PremortemResult | null;
  loading: boolean;
  error: string | null;
  onReset: () => void;
  onEdit?: (
    id: string,
    patch: { title?: string; tags?: string[]; notes?: string }
  ) => Promise<void>;
  onShare?: (id: string) => Promise<string | null>;
  onReminder?: (id: string, date: string) => Promise<void>;
}

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

export function ReportView({
  result,
  loading,
  error,
  onReset,
  onEdit,
  onShare,
  onReminder,
}: ReportViewProps) {
  const [copied, setCopied] = React.useState(false);
  const [shared, setShared] = React.useState(false);
  const [shareUrl, setShareUrl] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState(false);
  const [editTitle, setEditTitle] = React.useState("");
  const [reminderOpen, setReminderOpen] = React.useState(false);

  // #14 — "Plan de Acción" follow-up
  const [actionPlan, setActionPlan] = React.useState<string | null>(
    result?.actionPlan ?? null
  );
  const [actionPlanLoading, setActionPlanLoading] = React.useState(false);
  const [actionPlanError, setActionPlanError] = React.useState<string | null>(null);

  // Reset local action-plan state whenever the displayed analysis changes
  // (adjust state during render instead of an effect, per React's guidance
  // for resetting state when a prop changes).
  const [lastResultId, setLastResultId] = React.useState(result?.id);
  if (result?.id !== lastResultId) {
    setLastResultId(result?.id);
    setActionPlan(result?.actionPlan ?? null);
    setActionPlanError(null);
    setActionPlanLoading(false);
  }

  async function generateActionPlan(force = false) {
    if (!result?.id) return;
    setActionPlanLoading(true);
    setActionPlanError(null);
    try {
      const res = await fetch(
        `/api/analyses/${result.id}/action-plan${force ? "?force=1" : ""}`,
        { method: "POST" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Error ${res.status}`);
      }
      if (data.status === "done" && data.actionPlan) {
        setActionPlan(data.actionPlan);
        setActionPlanLoading(false);
        return;
      }
      const jobId = data.jobId;
      if (!jobId) {
        throw new Error("El servidor no devolvió un identificador de trabajo.");
      }

      const maxWaitMs = 3 * 60 * 1000;
      const startedAt = Date.now();
      while (true) {
        if (Date.now() - startedAt > maxWaitMs) {
          throw new Error(
            "El plan de acción tardó demasiado en generarse. Intenta nuevamente."
          );
        }
        await new Promise((r) => setTimeout(r, 2500));
        let pollRes: Response;
        try {
          pollRes = await fetch(`/api/analyses/${result.id}/action-plan/${jobId}`, {
            cache: "no-store",
          });
        } catch {
          continue;
        }
        if (!pollRes.ok) {
          if (pollRes.status === 404) {
            throw new Error("El trabajo expiró o no se encontró. Intenta nuevamente.");
          }
          continue;
        }
        const pollData = await pollRes.json().catch(() => null);
        if (pollData?.status === "done" && pollData.actionPlan) {
          setActionPlan(pollData.actionPlan);
          setActionPlanLoading(false);
          toast.success("Plan de acción generado");
          return;
        }
        if (pollData?.status === "error") {
          throw new Error(pollData.error || "Error desconocido al generar el plan.");
        }
        // "pending" | "running" → keep polling
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo generar el plan de acción.";
      setActionPlanError(message);
      setActionPlanLoading(false);
      toast.error("Falló la generación del plan", { description: message });
    }
  }

  function copyActionPlan() {
    if (!actionPlan) return;
    navigator.clipboard.writeText(actionPlan).catch(() => {});
    toast.success("Plan de acción copiado");
  }

  async function copyReport() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  function downloadReport() {
    if (!result) return;
    const blob = new Blob([result.report], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safe = result.title.replace(/[^\w\-]+/g, "_").slice(0, 50) || "premortem";
    a.href = url;
    a.download = `premortem_${safe}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleShare() {
    if (!result?.id || !onShare) return;
    try {
      const token = await onShare(result.id);
      if (token) {
        const url = `${window.location.origin}/shared/${token}`;
        setShareUrl(url);
        setShared(true);
        await navigator.clipboard.writeText(url);
        toast.success("Enlace copiado", {
          description: "Cualquiera con el enlace puede ver el análisis.",
        });
      }
    } catch (err) {
      toast.error("No se pudo compartir", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  async function saveEdit() {
    if (!result?.id || !onEdit) return;
    try {
      await onEdit(result.id, { title: editTitle });
      setEditing(false);
      toast.success("Análisis actualizado");
    } catch (err) {
      toast.error("No se pudo guardar", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  async function setReminder(days: number) {
    if (!result?.id || !onReminder) return;
    const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    try {
      await onReminder(result.id, date);
      setReminderOpen(false);
      toast.success("Recordatorio configurado", {
        description: `Te avisaremos en ${days} día${days === 1 ? "" : "s"}.`,
      });
    } catch (err) {
      toast.error("No se pudo configurar", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  if (loading) return null;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-4 py-16 text-center">
        <div className="text-4xl">⚠️</div>
        <div>
          <p className="font-semibold text-red-400">No se pudo generar el análisis</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">{error}</p>
        </div>
        <Button variant="outline" onClick={onReset}>
          <RotateCcw className="size-4" />
          Reintentar
        </Button>
      </div>
    );
  }

  if (!result) return null;

  const hasId = !!result.id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      {/* Meta header */}
      <div className="mb-5 flex flex-col gap-4 border-b border-border/60 pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="font-normal">
            {PROJECT_TYPE_LABELS[
              result.projectType as keyof typeof PROJECT_TYPE_LABELS
            ] ?? result.projectType}
          </Badge>
          <Badge variant="outline" className="font-normal">
            {HORIZON_LABELS[result.horizon as keyof typeof HORIZON_LABELS] ??
              result.horizon}
          </Badge>
          <Badge variant="outline" className="font-normal">
            {DEPTH_LABELS[result.depth as keyof typeof DEPTH_LABELS] ?? result.depth}
          </Badge>
          <Badge
            variant="outline"
            className="gap-1 border-amber-500/30 bg-amber-500/5 font-normal text-amber-400"
          >
            <ShieldCheck className="size-3" />
            ISO-aware
          </Badge>
          {result.verdict && (
            <span
              className={cn(
                "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide",
                verdictStyle(result.verdict)
              )}
            >
              {result.verdict.replace(/_/g, " ")}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {editing ? (
            <div className="flex flex-1 items-center gap-2">
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="h-8 text-sm"
                aria-label="Editar título"
              />
              <Button size="sm" className="h-8" onClick={saveEdit} disabled={!editTitle.trim()}>
                Guardar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8"
                onClick={() => setEditing(false)}
              >
                <X className="size-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => {
                setEditTitle(result.title);
                setEditing(true);
              }}
              disabled={!hasId || !onEdit}
            >
              <Pencil className="size-3.5" />
              Editar
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={copyReport} className="h-8">
            {copied ? (
              <>
                <Check className="size-3.5 text-emerald-400" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="size-3.5" />
                Copiar
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadReport}
            className="h-8"
          >
            <Download className="size-3.5" />
            .md
          </Button>
          <Button asChild variant="outline" size="sm" className="h-8" disabled={!hasId}>
            <a href={`/api/analyses/${result.id}/pdf`} download>
              <FileDown className="size-3.5" />
              PDF
            </a>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-8" disabled={!hasId}>
            <a
              href={`/api/analyses/${result.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Eye className="size-3.5" />
              Ver PDF
            </a>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-8" disabled={!hasId}>
            <a href={`/api/analyses/${result.id}/xlsx`} download>
              <FileSpreadsheet className="size-3.5" />
              Excel
            </a>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={handleShare}
            disabled={!hasId || !onShare}
          >
            <Link2 className="size-3.5" />
            {shared ? "Enlace" : "Compartir"}
          </Button>
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => setReminderOpen((o) => !o)}
              disabled={!hasId || !onReminder}
            >
              <BellRing className="size-3.5" />
              Recordar
            </Button>
            {reminderOpen && (
              <div className="absolute right-0 top-10 z-30 w-44 rounded-lg border border-border/60 bg-popover p-1 text-xs shadow-lg">
                <button
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-muted"
                  onClick={() => setReminder(7)}
                >
                  <Bell className="size-3" /> En 7 días
                </button>
                <button
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-muted"
                  onClick={() => setReminder(30)}
                >
                  <Bell className="size-3" /> En 30 días
                </button>
                <button
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-muted"
                  onClick={() => setReminder(90)}
                >
                  <Bell className="size-3" /> En 90 días
                </button>
              </div>
            )}
          </div>
        </div>
        {shareUrl && (
          <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-1.5 text-xs">
            <Link2 className="size-3 text-emerald-400" />
            <span className="truncate text-emerald-300">{shareUrl}</span>
            <button
              className="ml-auto text-muted-foreground hover:text-foreground"
              onClick={() => {
                setShareUrl(null);
                setShared(false);
              }}
              aria-label="Cerrar"
            >
              <X className="size-3" />
            </button>
          </div>
        )}
      </div>

      {/* Score gauge (only when score present) */}
      {result.score != null && (
        <div className="mb-6 flex flex-col items-center gap-3 rounded-xl border border-border/60 bg-muted/20 p-6 sm:flex-row sm:gap-6">
          <ScoreGauge score={result.score} size={156} />
          <div className="text-center sm:text-left">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Índice de preparación
            </p>
            <p className="mt-1 text-sm text-foreground/80">
              Evaluación heurística de IA — no es una medición científica ni
              auditoría certificada. Refleja la preparación global estimada según
              los riesgos, omisiones y puntos únicos de falla detectados.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Análisis generado el{" "}
              {new Date(result.createdAt).toLocaleString("es", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          </div>
        </div>
      )}

      {/* Visual risk dashboard (#2) */}
      <div className="mb-6">
        <RiskDashboard report={result.report} />
      </div>

      {/* The report markdown */}
      <article className="premortem-report">
        <Markdown content={result.report} />
      </article>

      {/* #14 follow-up — Plan de Acción */}
      <div className="mt-8 rounded-xl border border-amber-500/30 bg-amber-500/[0.03] p-5">
        {!actionPlan && !actionPlanLoading && (
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex items-center gap-2 font-semibold text-foreground">
                <ListChecks className="size-4 text-amber-400" />
                ¿Convertimos esto en un Plan de Acción?
              </p>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Genera un plan concreto y priorizado que incorpora todas las
                defensas y elimina las vulnerabilidades detectadas en el
                informe.
              </p>
            </div>
            <Button
              onClick={() => generateActionPlan(false)}
              disabled={!hasId}
              className="shrink-0 bg-gradient-to-r from-amber-500 to-red-600 text-white hover:from-amber-600 hover:to-red-700"
            >
              <ListChecks className="size-4" />
              Generar Plan de Acción
            </Button>
          </div>
        )}

        {actionPlanLoading && (
          <div className="flex items-center gap-3 py-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-amber-400" />
            Generando el plan de acción… puede tardar hasta un minuto.
          </div>
        )}

        {actionPlanError && !actionPlanLoading && (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-red-400">{actionPlanError}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => generateActionPlan(false)}
            >
              <RotateCcw className="size-3.5" />
              Reintentar
            </Button>
          </div>
        )}

        {actionPlan && !actionPlanLoading && (
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-2 font-semibold text-foreground">
                <ListChecks className="size-4 text-amber-400" />
                Plan de Acción
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={copyActionPlan}>
                  <Copy className="size-3.5" />
                  Copiar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => generateActionPlan(true)}
                >
                  <RefreshCw className="size-3.5" />
                  Regenerar
                </Button>
              </div>
            </div>
            <article className="premortem-report">
              <Markdown content={actionPlan} />
            </article>
          </div>
        )}
      </div>
    </motion.div>
  );
}
