// Shared types for the PRE-MORTEM IA system

export type ProjectType =
  | "saas"
  | "startup"
  | "internal_process"
  | "investment"
  | "software"
  | "strategy"
  | "other";

export type Horizon = "3m" | "6m" | "12m" | "24m";
export type Depth = "rapido" | "estandar" | "profundo";

export interface PremortemRequest {
  projectDescription: string;
  projectType: ProjectType;
  horizon: Horizon;
  depth: Depth;
  context?: string;
}

export interface PremortemResult {
  id: string;
  title: string;
  report: string;
  score: number | null;
  verdict: string | null;
  projectType: string;
  horizon: string;
  depth: string;
  projectDescription: string;
  createdAt: string;
}

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  saas: "Producto SaaS",
  startup: "Startup / Emprendimiento",
  internal_process: "Proceso interno",
  investment: "Inversión",
  software: "Proyecto de software",
  strategy: "Estrategia / Decisión",
  other: "Otro",
};

export const HORIZON_LABELS: Record<Horizon, string> = {
  "3m": "3 meses",
  "6m": "6 meses",
  "12m": "12 meses",
  "24m": "24 meses",
};

export const DEPTH_LABELS: Record<Depth, string> = {
  rapido: "Rápido",
  estandar: "Estándar",
  profundo: "Profundo",
};

export const VERDICT_OPTIONS = [
  "ROBUSTO",
  "REQUIERE ATENCION",
  "VULNERABLE",
  "ALTO RIESGO",
] as const;
export type Verdict = (typeof VERDICT_OPTIONS)[number];
