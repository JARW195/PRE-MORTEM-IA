// Excel export for PRE-MORTEM reports (#7).
//
// Parses the markdown report to extract the TOP 5 risks + ISO conformity table
// and produces an .xlsx workbook with three sheets: Summary, Risks, ISO.

import * as XLSX from "xlsx";
import {
  parseTopRisks,
  parseIsoConformity,
  parsePreparationScore,
  parseVerdict,
} from "./risk-parser";
import type { PremortemResult } from "./types";

export interface ExportInput {
  title: string;
  projectType: string;
  horizon: string;
  depth: string;
  report: string;
  score: number | null;
  verdict: string | null;
  createdAt: string;
}

/** Build an xlsx workbook Buffer from a pre-mortem analysis. */
export function buildXlsx(input: ExportInput): Uint8Array {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Summary
  const summary: (string | number)[][] = [
    ["PRE-MORTEM IA — Resumen"],
    [],
    ["Título", input.title],
    ["Tipo de proyecto", input.projectType],
    ["Horizonte", input.horizon],
    ["Profundidad", input.depth],
    ["Índice de preparación", input.score ?? "—"],
    ["Veredicto", input.verdict ?? "—"],
    ["Generado", input.createdAt],
    [],
    ["Reporte completo"],
    [input.report],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summary);
  wsSummary["!cols"] = [{ wch: 24 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen");

  // Sheet 2: Risks
  const risks = parseTopRisks(input.report);
  const risksRows: (string | number)[][] = [
    [
      "#",
      "Riesgo",
      "Categoría",
      "Probabilidad",
      "Impacto",
      "Detectabilidad",
      "Score",
      "Nivel",
      "Causa",
      "Consecuencia",
      "Defensa",
    ],
  ];
  for (const r of risks) {
    risksRows.push([
      r.number,
      r.title,
      r.category,
      r.probability,
      r.impact,
      r.detectability,
      r.score,
      r.level,
      r.cause,
      r.consequence,
      r.defense,
    ]);
  }
  const wsRisks = XLSX.utils.aoa_to_sheet(risksRows);
  wsRisks["!cols"] = [
    { wch: 4 },
    { wch: 36 },
    { wch: 18 },
    { wch: 12 },
    { wch: 10 },
    { wch: 14 },
    { wch: 8 },
    { wch: 10 },
    { wch: 50 },
    { wch: 50 },
    { wch: 50 },
  ];
  XLSX.utils.book_append_sheet(wb, wsRisks, "Riesgos TOP 5");

  // Sheet 3: ISO conformity
  const iso = parseIsoConformity(input.report);
  const isoRows: (string | number)[][] = [
    ["Norma", "Título", "Estado", "Brecha / Riesgo de cumplimiento"],
  ];
  for (const row of iso) {
    isoRows.push([row.norma, row.titulo, row.estado, row.brecha]);
  }
  const wsIso = XLSX.utils.aoa_to_sheet(isoRows);
  wsIso["!cols"] = [{ wch: 22 }, { wch: 36 }, { wch: 16 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsIso, "Conformidad ISO");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Uint8Array;
  return buf;
}

/** Convenience: build xlsx from a PremortemResult. */
export function buildXlsxFromResult(r: PremortemResult): Uint8Array {
  return buildXlsx({
    title: r.title,
    projectType: r.projectType,
    horizon: r.horizon,
    depth: r.depth,
    report: r.report,
    score: r.score,
    verdict: r.verdict,
    createdAt: r.createdAt,
  });
}

/** Re-export parsers so callers can also get raw structured data. */
export {
  parseTopRisks,
  parseIsoConformity,
  parsePreparationScore,
  parseVerdict,
};
