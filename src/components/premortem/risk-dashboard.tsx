"use client";

/**
 * PRE-MORTEM IA — Visual Risk Dashboard.
 *
 * Renders three visual sections from the markdown report:
 *   1. TOP 5 Riesgos  — horizontal scrollable row of compact risk cards,
 *      each with a colored left border by level and a prominent Score badge.
 *   2. Matriz de riesgo — 5×5 grid (Probability × Impact) heatmap with a
 *      numbered dot per risk placed at its (P, I) position, plus a legend.
 *   3. Distribución de conformidad ISO — stat chips summarizing the
 *      CONFORME / PARCIAL / NO CONFORME / INCIERTO / NO APLICA counts.
 *
 * Degrades gracefully: returns null when no risks can be parsed.
 *
 * Pure presentational — uses parseTopRisks / parsePreparationScore /
 * parseVerdict / parseIsoConformity from the standalone risk-parser.
 */

import * as React from "react";
import {
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  HelpCircle,
  MinusCircle,
  Grid3x3,
  Target,
} from "lucide-react";
import {
  parseTopRisks,
  parsePreparationScore,
  parseVerdict,
  parseIsoConformity,
  type IsoConformityRow,
  type IsoEstado,
  type ParsedRisk,
  type RiskLevel,
} from "@/lib/premortem/risk-parser";
import { cn } from "@/lib/utils";

interface RiskDashboardProps {
  report: string;
  className?: string;
}

// ---------------------------------------------------------------------------
// Visual config maps
// ---------------------------------------------------------------------------

const LEVEL_BORDER: Record<RiskLevel, string> = {
  CRITICO: "border-l-red-500",
  ALTO: "border-l-orange-500",
  MODERADO: "border-l-amber-400",
  BAJO: "border-l-emerald-500",
};

const LEVEL_BADGE: Record<RiskLevel, string> = {
  CRITICO: "bg-red-500/15 text-red-300 border-red-500/30",
  ALTO: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  MODERADO: "bg-amber-400/15 text-amber-200 border-amber-400/30",
  BAJO: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
};

const LEVEL_DOT: Record<RiskLevel, string> = {
  CRITICO: "bg-red-500",
  ALTO: "bg-orange-500",
  MODERADO: "bg-amber-400",
  BAJO: "bg-emerald-500",
};

const LEVEL_LABEL: Record<RiskLevel, string> = {
  CRITICO: "CRÍTICO",
  ALTO: "ALTO",
  MODERADO: "MODERADO",
  BAJO: "BAJO",
};

const LEVEL_EMOJI: Record<RiskLevel, string> = {
  CRITICO: "🔴",
  ALTO: "🟠",
  MODERADO: "🟡",
  BAJO: "🟢",
};

/**
 * Map a Probability×Impact cell value (1-25) to a heatmap bg + text color.
 *   1-4   → Bajo     (emerald)
 *   5-9   → Moderado (amber)
 *   10-15 → Alto     (orange)
 *   16-25 → Crítico  (red)
 */
function cellHeat(prob: number, impact: number): {
  className: string;
  band: RiskLevel;
} {
  const v = prob * impact;
  if (v >= 16) return { className: "bg-red-500/30 border-red-500/40", band: "CRITICO" };
  if (v >= 10) return { className: "bg-orange-500/25 border-orange-500/35", band: "ALTO" };
  if (v >= 5) return { className: "bg-amber-400/20 border-amber-400/30", band: "MODERADO" };
  return { className: "bg-emerald-500/15 border-emerald-500/25", band: "BAJO" };
}

const ESTADO_CONFIG: Record<
  IsoEstado,
  { emoji: string; label: string; chipClass: string; Icon: typeof ShieldCheck }
> = {
  CONFORME: {
    emoji: "🟢",
    label: "Conforme",
    chipClass: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
    Icon: ShieldCheck,
  },
  PARCIAL: {
    emoji: "🟡",
    label: "Parcial",
    chipClass: "bg-amber-400/10 text-amber-200 border-amber-400/30",
    Icon: ShieldAlert,
  },
  "NO CONFORME": {
    emoji: "🔴",
    label: "No conforme",
    chipClass: "bg-red-500/10 text-red-300 border-red-500/30",
    Icon: ShieldX,
  },
  INCIERTO: {
    emoji: "🔵",
    label: "Incierto",
    chipClass: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
    Icon: HelpCircle,
  },
  "NO APLICA": {
    emoji: "⚪",
    label: "No aplica",
    chipClass: "bg-zinc-500/10 text-zinc-300 border-zinc-500/30",
    Icon: MinusCircle,
  },
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function RiskDashboard({ report, className }: RiskDashboardProps) {
  // Parse once per render. Parsing is regex-based and cheap (the report is
  // ~15 KB), and memoizing avoids re-parsing on parent re-renders that pass
  // the same report string.
  const data = React.useMemo(() => {
    const risks = parseTopRisks(report);
    const score = parsePreparationScore(report);
    const verdict = parseVerdict(report);
    const iso = parseIsoConformity(report);
    return { risks, score, verdict, iso };
  }, [report]);

  if (data.risks.length === 0) return null;

  return (
    <section
      id="risk-dashboard"
      className={cn(
        "scroll-mt-20 space-y-6 rounded-xl border border-border/60 bg-card/30 p-4 sm:p-6",
        className
      )}
      aria-label="Visual risk dashboard"
    >
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="grid size-9 place-items-center rounded-lg bg-red-500/15 text-red-300">
            <AlertTriangle className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
              Panel de riesgos
            </h2>
            <p className="text-xs text-muted-foreground">
              Visualización interactiva del TOP 5, la matriz de riesgo y la
              conformidad ISO.
            </p>
          </div>
        </div>
        {data.score != null && (
          <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-1.5">
            <Target className="size-3.5 text-amber-400" />
            <span className="text-xs text-muted-foreground">
              Índice de preparación
            </span>
            <span className="text-sm font-semibold text-amber-300">
              {data.score}/100
            </span>
            {data.verdict && (
              <span className="ml-1 text-xs text-muted-foreground">
                · {data.verdict}
              </span>
            )}
          </div>
        )}
      </header>

      {/* Section 1: TOP 5 risk cards (horizontal scroll on desktop, stacked on mobile) */}
      <RiskCards risks={data.risks} />

      {/* Section 2: 5x5 risk matrix */}
      <RiskMatrix risks={data.risks} />

      {/* Section 3: ISO conformity distribution (only if ISO data exists) */}
      {data.iso.length > 0 && <IsoDistribution rows={data.iso} />}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: Risk cards
// ---------------------------------------------------------------------------

function RiskCards({ risks }: { risks: ParsedRisk[] }) {
  return (
    <div>
      <SectionTitle
        icon={<AlertTriangle className="size-3.5" />}
        title="TOP 5 riesgos"
        subtitle="Tarjetas con score, nivel y probabilidad × impacto × detectabilidad."
      />
      <div className="flex gap-3 overflow-x-auto pb-2 lg:grid lg:grid-cols-5 lg:overflow-visible lg:pb-0">
        {risks.map((risk) => (
          <RiskCard key={risk.number} risk={risk} />
        ))}
      </div>
    </div>
  );
}

function RiskCard({ risk }: { risk: ParsedRisk }) {
  const level = risk.level ?? "ALTO";
  return (
    <article
      className={cn(
        "flex w-[280px] shrink-0 flex-col gap-2 rounded-lg border border-border/60 border-l-4 bg-card/50 p-3 transition-colors hover:border-border",
        "lg:w-auto",
        LEVEL_BORDER[level]
      )}
    >
      {/* Header: number + score */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "grid size-5 place-items-center rounded-full text-[10px] font-bold",
              LEVEL_BADGE[level]
            )}
          >
            {risk.number}
          </span>
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
              LEVEL_BADGE[level]
            )}
          >
            {LEVEL_EMOJI[level]} {LEVEL_LABEL[level]}
          </span>
        </div>
        <div className="flex flex-col items-end leading-none">
          <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
            Score
          </span>
          <span
            className={cn(
              "text-sm font-bold tabular-nums",
              risk.score >= 81
                ? "text-red-300"
                : risk.score >= 51
                  ? "text-orange-300"
                  : risk.score >= 21
                    ? "text-amber-200"
                    : "text-emerald-300"
            )}
          >
            {risk.score}
            <span className="text-[9px] font-normal text-muted-foreground">
              /125
            </span>
          </span>
        </div>
      </div>

      {/* Title */}
      <h3 className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
        {risk.title}
      </h3>

      {/* Category badge */}
      {risk.category && (
        <span className="inline-flex w-fit items-center rounded-md border border-border/70 bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
          {risk.category}
        </span>
      )}

      {/* P/I/D pills */}
      <div className="flex flex-wrap gap-1">
        <Pill label="P" value={risk.probability} />
        <Pill label="I" value={risk.impact} />
        <Pill label="D" value={risk.detectability} />
      </div>

      {/* Compact text fields */}
      <div className="mt-1 space-y-1 text-[11px] leading-snug">
        {risk.cause && (
          <p className="text-muted-foreground">
            <span className="font-semibold text-amber-300/80">Causa:</span>{" "}
            {risk.cause}
          </p>
        )}
        {risk.consequence && (
          <p className="text-muted-foreground">
            <span className="font-semibold text-orange-300/80">Consec.:</span>{" "}
            {risk.consequence}
          </p>
        )}
        {risk.defense && (
          <p className="text-muted-foreground">
            <span className="font-semibold text-emerald-300/80">Defensa:</span>{" "}
            {risk.defense}
          </p>
        )}
      </div>
    </article>
  );
}

function Pill({ label, value }: { label: string; value: number }) {
  const v = value || 0;
  const tone =
    v >= 4
      ? "bg-red-500/15 text-red-300 border-red-500/30"
      : v === 3
        ? "bg-orange-500/15 text-orange-300 border-orange-500/30"
        : v === 2
          ? "bg-amber-400/15 text-amber-200 border-amber-400/30"
          : v === 1
            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
            : "bg-muted/40 text-muted-foreground border-border/60";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
        tone
      )}
    >
      <span className="opacity-70">{label}:</span>
      <span className="font-semibold">{v || "-"}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: 5x5 risk matrix
// ---------------------------------------------------------------------------

function RiskMatrix({ risks }: { risks: ParsedRisk[] }) {
  // Group risks by (probability, impact) so multiple dots can stack in one
  // cell. Only risks with valid probability & impact (1-5) are placed.
  const placed = risks.filter(
    (r) => r.probability >= 1 && r.probability <= 5 && r.impact >= 1 && r.impact <= 5
  );
  const cellMap = new Map<string, ParsedRisk[]>();
  for (const r of placed) {
    const key = `${r.probability}-${r.impact}`;
    const arr = cellMap.get(key) ?? [];
    arr.push(r);
    cellMap.set(key, arr);
  }

  // Render with probability on Y (5 at top, 1 at bottom) and impact on X
  // (1 at left, 5 at right). We iterate prob from 5 down to 1, and impact
  // from 1 to 5, so the matrix reads naturally.
  const probs = [5, 4, 3, 2, 1];
  const impacts = [1, 2, 3, 4, 5];

  return (
    <div>
      <SectionTitle
        icon={<Grid3x3 className="size-3.5" />}
        title="Matriz de riesgo"
        subtitle="Probabilidad × Impacto. El color de cada celda refleja la severidad combinada."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        {/* Matrix grid */}
        <div className="flex-1 overflow-x-auto">
          <div className="inline-flex flex-col gap-1.5">
            {/* Top axis label */}
            <div className="flex items-center justify-center pb-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Impacto →
              </span>
            </div>

            <div className="flex gap-1.5">
              {/* Y axis label column */}
              <div className="flex w-4 flex-col items-center justify-center">
                <span
                  className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
                  style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                >
                  Probabilidad →
                </span>
              </div>

              {/* Grid: rows = probability (5 at top), cols = impact (1 at left) */}
              <div className="flex flex-col gap-1.5">
                {probs.map((p) => (
                  <div key={`row-${p}`} className="flex items-center gap-1.5">
                    <span className="w-4 text-right text-[10px] font-semibold tabular-nums text-muted-foreground">
                      {p}
                    </span>
                    <div className="flex gap-1.5">
                      {impacts.map((i) => {
                        const cell = cellHeat(p, i);
                        const here = cellMap.get(`${p}-${i}`) ?? [];
                        return (
                          <div
                            key={`cell-${p}-${i}`}
                            className={cn(
                              "relative grid size-12 place-items-center rounded-md border sm:size-14",
                              cell.className
                            )}
                            title={`P=${p} I=${i}`}
                          >
                            {here.length > 0 && (
                              <div className="flex flex-wrap items-center justify-center gap-0.5">
                                {here.map((r) => (
                                  <span
                                    key={`dot-${r.number}`}
                                    className={cn(
                                      "grid size-5 place-items-center rounded-full text-[10px] font-bold text-white ring-1 ring-white/30",
                                      LEVEL_DOT[r.level ?? "ALTO"]
                                    )}
                                    title={`${r.title} (Score ${r.score})`}
                                  >
                                    {r.number}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {/* X axis numbers */}
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="w-4" />
                  <div className="flex gap-1.5">
                    {impacts.map((i) => (
                      <span
                        key={`xnum-${i}`}
                        className="grid size-12 place-items-center text-[10px] font-semibold tabular-nums text-muted-foreground sm:size-14"
                      >
                        {i}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex shrink-0 flex-col gap-1.5 rounded-lg border border-border/60 bg-muted/20 p-3 sm:w-44">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Niveles de celda
          </span>
          <LegendRow emoji="🟢" label="Bajo" sub="1-4" tone="text-emerald-300" />
          <LegendRow emoji="🟡" label="Moderado" sub="5-9" tone="text-amber-200" />
          <LegendRow emoji="🟠" label="Alto" sub="10-15" tone="text-orange-300" />
          <LegendRow emoji="🔴" label="Crítico" sub="16-25" tone="text-red-300" />
          <div className="mt-1 border-t border-border/60 pt-1.5 text-[10px] text-muted-foreground">
            Cada número indica un riesgo del TOP 5 en esa posición.
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendRow({
  emoji,
  label,
  sub,
  tone,
}: {
  emoji: string;
  label: string;
  sub: string;
  tone: string;
}) {
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span className="flex items-center gap-1.5">
        <span>{emoji}</span>
        <span className={cn("font-medium", tone)}>{label}</span>
      </span>
      <span className="text-muted-foreground">{sub}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: ISO conformity distribution
// ---------------------------------------------------------------------------

function IsoDistribution({ rows }: { rows: IsoConformityRow[] }) {
  const counts = React.useMemo(() => {
    const c: Record<IsoEstado, number> = {
      CONFORME: 0,
      PARCIAL: 0,
      "NO CONFORME": 0,
      INCIERTO: 0,
      "NO APLICA": 0,
    };
    for (const r of rows) {
      if (r.estado) c[r.estado]++;
    }
    return c;
  }, [rows]);

  const total = rows.length || 1;
  const order: IsoEstado[] = [
    "CONFORME",
    "PARCIAL",
    "NO CONFORME",
    "INCIERTO",
    "NO APLICA",
  ];

  return (
    <div>
      <SectionTitle
        icon={<ShieldCheck className="size-3.5" />}
        title="Distribución de conformidad ISO"
        subtitle={`${rows.length} ${rows.length === 1 ? "norma evaluada" : "normas evaluadas"}.`}
      />

      {/* Stacked horizontal bar */}
      <div
        className="mb-3 flex h-2.5 w-full overflow-hidden rounded-full bg-muted/40"
        role="img"
        aria-label="Distribución de conformidad ISO"
      >
        {order.map((estado) => {
          const n = counts[estado];
          if (n === 0) return null;
          const pct = (n / total) * 100;
          return (
            <div
              key={estado}
              className={cn("h-full", ESTADO_BAR[estado])}
              style={{ width: `${pct}%` }}
              title={`${ESTADO_CONFIG[estado].label}: ${n}`}
            />
          );
        })}
      </div>

      {/* Stat chips */}
      <div className="flex flex-wrap gap-2">
        {order.map((estado) => {
          const cfg = ESTADO_CONFIG[estado];
          const n = counts[estado];
          const Icon = cfg.Icon;
          return (
            <div
              key={estado}
              className={cn(
                "inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5",
                cfg.chipClass
              )}
            >
              <Icon className="size-3.5" />
              <div className="flex flex-col leading-none">
                <span className="text-[9px] uppercase tracking-wide opacity-80">
                  {cfg.emoji} {cfg.label}
                </span>
                <span className="text-sm font-bold tabular-nums">{n}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ESTADO_BAR: Record<IsoEstado, string> = {
  CONFORME: "bg-emerald-500/70",
  PARCIAL: "bg-amber-400/70",
  "NO CONFORME": "bg-red-500/70",
  INCIERTO: "bg-cyan-500/70",
  "NO APLICA": "bg-zinc-500/70",
};

// ---------------------------------------------------------------------------
// Shared sub-component: section title
// ---------------------------------------------------------------------------

function SectionTitle({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="grid size-6 place-items-center rounded-md bg-muted/60 text-amber-400">
        {icon}
      </span>
      <div>
        <h3 className="text-sm font-semibold tracking-tight text-foreground">
          {title}
        </h3>
        {subtitle && (
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

export default RiskDashboard;
