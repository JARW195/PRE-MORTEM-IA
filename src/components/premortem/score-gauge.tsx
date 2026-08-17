"use client";

import * as React from "react";

interface ScoreGaugeProps {
  score: number;
  size?: number;
}

function classify(score: number) {
  if (score <= 39)
    return {
      label: "Altamente vulnerable",
      color: "#ef4444",
      ring: "#f87171",
      glyph: "🔴",
    };
  if (score <= 59)
    return {
      label: "Vulnerable",
      color: "#fb923c",
      ring: "#fb923c",
      glyph: "🟠",
    };
  if (score <= 79)
    return {
      label: "Preparación moderada",
      color: "#facc15",
      ring: "#fde047",
      glyph: "🟡",
    };
  if (score <= 94)
    return {
      label: "Bien preparado",
      color: "#22c55e",
      ring: "#4ade80",
      glyph: "🟢",
    };
  return {
    label: "Altamente preparado",
    color: "#16a34a",
    ring: "#86efac",
    glyph: "🟢",
  };
}

export function ScoreGauge({ score, size = 168 }: ScoreGaugeProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const info = classify(clamped);
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;

  return (
    <div
      className="relative flex flex-col items-center"
      style={{ width: size }}
      role="img"
      aria-label={`Índice de preparación: ${clamped} de 100. ${info.label}`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-muted/40"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={info.ring}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 1.1s cubic-bezier(0.22,1,0.36,1)",
            filter: `drop-shadow(0 0 6px ${info.ring}66)`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-mono text-4xl font-bold tabular-nums"
          style={{ color: info.color }}
        >
          {clamped}
        </span>
        <span className="text-[0.65rem] font-medium uppercase tracking-wider text-muted-foreground">
          / 100
        </span>
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-center">
        <span aria-hidden>{info.glyph}</span>
        <span
          className="text-xs font-semibold"
          style={{ color: info.color }}
        >
          {info.label}
        </span>
      </div>
    </div>
  );
}
