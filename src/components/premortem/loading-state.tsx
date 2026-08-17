"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { JobPhase } from "@/lib/premortem/job-store";

const SPECIALISTS = [
  { role: "Estratega pesimista", task: "buscando el peor escenario razonable", glyph: "🔴" },
  { role: "Director financiero", task: "rastreando costos ocultos y flujo de caja", glyph: "💰" },
  { role: "Experto en personas", task: "identificando dependencias críticas", glyph: "👥" },
  { role: "Arquiteto tecnológico", task: "revisando puntos únicos de falla", glyph: "💻" },
  { role: "Director de operaciones", task: "detectando cuellos de botella", glyph: "⚙️" },
  { role: "Compliance & reputación", task: "declarando incertidumbres", glyph: "⚖️" },
  { role: "Adversario estratégico", task: "intentando destruir la idea", glyph: "🧠" },
];

// Phase → progress percentage + human label.
const PHASE_MAP: Record<JobPhase, { pct: number; label: string }> = {
  queued: { pct: 5, label: "En cola…" },
  extracting: { pct: 18, label: "Extrayendo evidencia de archivos…" },
  generating: { pct: 55, label: "El equipo virtual está atacando el proyecto…" },
  saving: { pct: 92, label: "Guardando el análisis…" },
  finished: { pct: 100, label: "Completado" },
};

interface LoadingStateProps {
  phase?: JobPhase;
  phaseMessage?: string | null;
}

export function LoadingState({ phase, phaseMessage }: LoadingStateProps) {
  const [specialistIdx, setSpecialistIdx] = React.useState(0);

  React.useEffect(() => {
    const s = setInterval(() => {
      setSpecialistIdx((i) => (i + 1) % SPECIALISTS.length);
    }, 2600);
    return () => clearInterval(s);
  }, []);

  const sp = SPECIALISTS[specialistIdx];
  const phaseInfo = phase ? PHASE_MAP[phase] : { pct: 0, label: "" };
  const displayLabel = phaseMessage ?? phaseInfo.label;
  // When no real phase yet, animate to 85% as a fallback (decorative).
  const targetPct = phase ? phaseInfo.pct : 85;

  return (
    <div
      className="flex flex-col items-center justify-center gap-6 px-4 py-16 text-center"
      role="status"
      aria-live="polite"
      aria-label="Análisis pre-mortem en curso"
    >
      <div className="relative flex h-24 w-24 items-center justify-center">
        <motion.span
          className="absolute inset-0 rounded-full border-2 border-amber-500/30"
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.2, 0.6] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.span
          className="absolute inset-2 rounded-full border-2 border-amber-500/50 border-t-amber-400"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
        />
        <span className="text-4xl" aria-hidden>
          💣
        </span>
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-medium uppercase tracking-wider text-amber-400">
          Pre-mortem en curso
        </p>
        <p className="max-w-md text-xs text-muted-foreground">
          El equipo virtual está analizando tu proyecto. Esto puede tardar entre
          30 y 90 segundos según la profundidad.
        </p>
      </div>

      <div className="h-16 w-full max-w-sm">
        <AnimatePresence mode="wait">
          <motion.div
            key={specialistIdx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
            className="flex items-center justify-center gap-2 text-sm"
          >
            <span className="text-lg" aria-hidden>
              {sp.glyph}
            </span>
            <span className="font-semibold text-foreground">{sp.role}</span>
            <span className="text-muted-foreground">{sp.task}</span>
          </motion.div>
        </AnimatePresence>
        <AnimatePresence mode="wait">
          <motion.p
            key={displayLabel}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="mt-2 text-center text-xs italic text-muted-foreground/80"
          >
            {displayLabel}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-1 flex items-center justify-between text-[0.65rem] text-muted-foreground">
          <span>Progreso</span>
          <span className="tabular-nums">{Math.round(targetPct)}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500"
            initial={{ width: "0%" }}
            animate={{ width: `${targetPct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>
    </div>
  );
}
