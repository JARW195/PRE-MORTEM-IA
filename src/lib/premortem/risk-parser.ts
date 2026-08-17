/**
 * PRE-MORTEM IA — Risk report parser.
 *
 * Pure functions that take the full markdown report string produced by the
 * LLM and extract structured data for the visual dashboard:
 *   - parseTopRisks(report)            → up to 5 ParsedRisk[]
 *   - parsePreparationScore(report)    → number | null  (0-100)
 *   - parsePreparationClassification(report) → string | null
 *   - parseVerdict(report)            → string | null
 *   - parseIsoConformity(report)       → IsoConformityRow[]
 *
 * No React. All regex-based, defensive against missing/variant fields.
 *
 * The report uses Spanish headers with emoji prefixes. The TOP 5 section
 * number is NOT hardcoded — the parser looks for any "## … TOP 5 RIESGOS"
 * header so it survives future renumbering.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RiskLevel = "CRITICO" | "ALTO" | "MODERADO" | "BAJO";

export interface ParsedRisk {
  number: number;
  title: string;
  category: string | null;
  /** 1-5, or 0 if missing */
  probability: number;
  /** 1-5, or 0 if missing */
  impact: number;
  /** 1-5, or 0 if missing */
  detectability: number;
  /** 0-125, or 0 if missing */
  score: number;
  /** Risk level (accent-normalized). null if it cannot be parsed. */
  level: RiskLevel | null;
  cause: string | null;
  consequence: string | null;
  /** The descriptive "Impacto:" text near the bottom of the risk block. */
  impact_text: string | null;
  defense: string | null;
}

export type IsoEstado =
  | "CONFORME"
  | "PARCIAL"
  | "NO CONFORME"
  | "NO APLICA"
  | "INCIERTO";

export interface IsoConformityRow {
  norma: string;
  titulo: string;
  estado: IsoEstado | null;
  brecha: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strip combining diacritics (accents) so CRÍTICO matches CRITICO, etc. */
function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Normalize a free-form level string to a RiskLevel union member. */
function normalizeLevel(s: string | null | undefined): RiskLevel | null {
  if (!s) return null;
  const norm = stripAccents(s.toUpperCase().trim());
  if (norm.includes("CRITICO")) return "CRITICO";
  if (norm.includes("ALTO")) return "ALTO";
  if (norm.includes("MODERADO")) return "MODERADO";
  if (norm.includes("BAJO")) return "BAJO";
  return null;
}

/** Normalize a free-form estado string to an IsoEstado union member. */
function normalizeEstado(s: string | null | undefined): IsoEstado | null {
  if (!s) return null;
  const norm = stripAccents(s.toUpperCase().trim());
  // Order matters: NO CONFORME before CONFORME because CONFORME is a substring.
  if (norm.includes("NO CONFORME")) return "NO CONFORME";
  if (norm.includes("CONFORME")) return "CONFORME";
  if (norm.includes("PARCIAL")) return "PARCIAL";
  if (norm.includes("INCIERTO")) return "INCIERTO";
  if (norm.includes("NO APLICA")) return "NO APLICA";
  return null;
}

/** Parse a "X/5" rating string into an integer 1-5, or 0 on failure. */
function parseRating(s: string | null): number {
  if (!s) return 0;
  const m = s.match(/(\d+)\s*\/\s*5/);
  if (!m) return 0;
  const n = parseInt(m[1], 10);
  if (Number.isNaN(n) || n < 1 || n > 5) return 0;
  return n;
}

/** Parse a "XX/125" score string into an integer 0-125, or 0 on failure. */
function parseScore(s: string | null): number {
  if (!s) return 0;
  const m = s.match(/(\d{1,3})\s*\/\s*125/);
  if (!m) return 0;
  const n = parseInt(m[1], 10);
  if (Number.isNaN(n) || n < 0 || n > 125) return 0;
  return n;
}

/**
 * Get the value of a "**Label:** value" field from a block of text.
 * Matches the FIRST occurrence (case-insensitive on the label).
 * Returns the trimmed value, or null if not found.
 *
 * Note: the value is captured up to end-of-line. Multi-line values are not
 * supported — but the report format puts each field on a single line.
 */
function getField(block: string, label: string): string | null {
  // Escape regex metachars in the label (paranoid — labels here are clean).
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\*\\*${escaped}:\\*\\*\\s*([^\\n]*)`, "i");
  const m = block.match(re);
  if (!m) return null;
  return m[1].trim() || null;
}

/**
 * Get the value of the Nth (0-indexed) occurrence of a "**Label:** value"
 * field from a block of text. Used to disambiguate fields that appear more
 * than once per risk block (the "Impacto:" metric line vs. the "Impacto:"
 * description line).
 */
function getFieldOccurrence(
  block: string,
  label: string,
  occurrence: number
): string | null {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\*\\*${escaped}:\\*\\*\\s*([^\\n]*)`, "gi");
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(block)) !== null) {
    if (i === occurrence) return m[1].trim() || null;
    i++;
  }
  return null;
}

// ---------------------------------------------------------------------------
// parseTopRisks
// ---------------------------------------------------------------------------

/**
 * Extract up to 5 risks from the "TOP 5 RIESGOS" section of the report.
 *
 * The section header may be `## 🔴 7. TOP 5 RIESGOS` or any similar variant;
 * we don't hardcode the section number — we look for any line starting with
 * `## ` containing "TOP 5 RIESGOS" (case-insensitive, accent-insensitive).
 */
export function parseTopRisks(report: string): ParsedRisk[] {
  if (!report) return [];

  // Locate the section header. Match `## ... TOP 5 RIESGOS ...` on its own
  // line. Accent-insensitive on "RIESGOS" (won't usually have accents, but
  // be defensive).
  const sectionRegex = /^##\s+[^\n]*TOP\s*5\s*RIESGOS[^\n]*$/im;
  const sectionMatch = report.match(sectionRegex);
  if (!sectionMatch || sectionMatch.index === undefined) return [];

  const sectionStart = sectionMatch.index + sectionMatch[0].length;

  // The section ends at the next top-level `## ` header (a level-2 markdown
  // header). Subsections inside the risk section use `### ` (level-3), so
  // they don't terminate the section.
  const restAfter = report.slice(sectionStart);
  const nextHeaderMatch = restAfter.match(/\n##\s+/);
  const sectionEnd = nextHeaderMatch
    ? sectionStart + nextHeaderMatch.index!
    : report.length;
  const section = report.slice(sectionStart, sectionEnd);

  // Split into risks: each risk begins with "### N. <title>".
  const riskSplitRegex = /\n###\s+(\d+)\.\s+([^\n]*)/g;
  const matches: { idx: number; number: number; title: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = riskSplitRegex.exec(section)) !== null) {
    if (m.index === undefined) continue;
    matches.push({
      idx: m.index,
      number: parseInt(m[1], 10),
      title: m[2].trim(),
    });
  }

  const risks: ParsedRisk[] = [];
  for (let i = 0; i < matches.length && risks.length < 5; i++) {
    const start = matches[i].idx;
    const end = i + 1 < matches.length ? matches[i + 1].idx : section.length;
    const block = section.slice(start, end);
    risks.push(parseRiskBlock(block, matches[i].number, matches[i].title));
  }

  return risks;
}

function parseRiskBlock(
  block: string,
  number: number,
  title: string
): ParsedRisk {
  // The "Impacto:" field appears twice per risk block:
  //   1) the metric line "**Impacto:** X/5" (immediately after Probabilidad)
  //   2) the description line "**Impacto:** <text>" (after Consecuencia)
  // We grab the FIRST occurrence for the numeric rating, and the SECOND
  // occurrence for the descriptive text (impact_text).
  const impactMetricStr = getFieldOccurrence(block, "Impacto", 0);
  const impactTextStr = getFieldOccurrence(block, "Impacto", 1);

  const category = getField(block, "Categoría") ?? getField(block, "Categoria");
  const probStr = getField(block, "Probabilidad");
  const detectStr = getField(block, "Detectabilidad");
  const scoreStr = getField(block, "Score");
  const nivelStr = getField(block, "Nivel");

  const cause = getField(block, "Causa");
  const consequence = getField(block, "Consecuencia");
  const defense = getField(block, "Defensa");

  return {
    number,
    title,
    category,
    probability: parseRating(probStr),
    impact: parseRating(impactMetricStr),
    detectability: parseRating(detectStr),
    score: parseScore(scoreStr),
    level: normalizeLevel(nivelStr),
    cause,
    consequence,
    impact_text: impactTextStr,
    defense,
  };
}

// ---------------------------------------------------------------------------
// parsePreparationScore
// ---------------------------------------------------------------------------

/**
 * Extract the preparation score (0-100) from the report.
 * Looks for the "# XX/100" marker (with the literal `#` markdown header).
 * Reuses the same logic as llm.ts extractScore but standalone.
 */
export function parsePreparationScore(report: string): number | null {
  if (!report) return null;
  const m = report.match(/#\s*(\d{1,3})\s*\/\s*100/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (Number.isNaN(n) || n < 0 || n > 100) return null;
  return n;
}

// ---------------------------------------------------------------------------
// parsePreparationClassification
// ---------------------------------------------------------------------------

/**
 * Extract the classification label that appears next to the score, e.g.
 *   **Clasificación:** 🔴 ALTAMENTE VULNERABLE
 */
export function parsePreparationClassification(
  report: string
): string | null {
  if (!report) return null;
  const m = report.match(/\*\*Clasificaci[óo]n:\*\*\s*([^\n]+)/i);
  if (!m) return null;
  return m[1].trim() || null;
}

// ---------------------------------------------------------------------------
// parseVerdict
// ---------------------------------------------------------------------------

/**
 * Extract the verdict label from the report.
 * Returns one of "ROBUSTO" | "REQUIERE ATENCION" | "VULNERABLE" | "ALTO RIESGO",
 * or null if no verdict is found.
 */
export function parseVerdict(report: string): string | null {
  if (!report) return null;

  const patterns: { re: RegExp; label: string }[] = [
    { re: /🟢\s*\*\*ROBUSTO\*\*/i, label: "ROBUSTO" },
    { re: /🟡\s*\*\*REQUIERE ATENCI[ÓO]N\*\*/i, label: "REQUIERE ATENCION" },
    { re: /🟠\s*\*\*VULNERABLE\*\*/i, label: "VULNERABLE" },
    { re: /🔴\s*\*\*ALTO RIESGO\*\*/i, label: "ALTO RIESGO" },
  ];
  for (const p of patterns) {
    if (p.re.test(report)) return p.label;
  }

  // Fallback: look for the label without emoji/formatting.
  const fb = report.match(
    /\*\*(ROBUSTO|REQUIERE\s+ATENCI[ÓO]N|VULNERABLE|ALTO\s+RIESGO)\*\*/i
  );
  if (fb) {
    const norm = stripAccents(fb[1].toUpperCase().replace(/\s+/g, " "));
    if (norm === "REQUIERE ATENCION") return "REQUIERE ATENCION";
    return norm;
  }
  return null;
}

// ---------------------------------------------------------------------------
// parseIsoConformity
// ---------------------------------------------------------------------------

/**
 * Parse the ISO conformity table from section "## 📋 4. ESTÁNDARES ISO Y
 * MARCO APLICABLE". Returns one row per data row in the table.
 *
 * Table format:
 *   | Norma | Título (corto) | Estado | Brecha / Riesgo de cumplimiento |
 *   | ----- | -------------- | ------ | ------------------------------ |
 *   | ISO/IEC 27001:2022 | SGSI | 🔴 NO CONFORME | ... |
 *
 * Estado is parsed from the 3rd column, ignoring the leading emoji.
 */
export function parseIsoConformity(report: string): IsoConformityRow[] {
  if (!report) return [];

  // Section header: "## ... ESTÁNDARES ISO ..." (accent-insensitive).
  const sectionRegex = /^##\s+[^\n]*EST[ÁA]NDARES\s*ISO[^\n]*$/im;
  const sectionMatch = report.match(sectionRegex);
  if (!sectionMatch || sectionMatch.index === undefined) return [];

  const sectionStart = sectionMatch.index + sectionMatch[0].length;

  // Section ends at the next `## ` top-level header.
  const restAfter = report.slice(sectionStart);
  const nextHeaderMatch = restAfter.match(/\n##\s+/);
  const sectionEnd = nextHeaderMatch
    ? sectionStart + nextHeaderMatch.index!
    : report.length;
  const section = report.slice(sectionStart, sectionEnd);

  const rows: IsoConformityRow[] = [];
  const lines = section.split("\n");

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line.startsWith("|")) continue;

    // Skip the markdown table separator row (e.g. "| ----- | ----- |").
    if (/^\|\s*[-:\s|]+\|\s*$/.test(line)) continue;
    // Skip the header row ("| Norma | Título ... |").
    if (/^\|\s*Norma\s*\|/i.test(line)) continue;

    // Split on `|`. Drop the leading and trailing empty cells produced by
    // the leading/trailing `|`.
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.length < 3) continue;

    const norma = cells[0] || "";
    const titulo = cells[1] || "";
    const estadoRaw = cells[2] || "";
    const brecha = cells.slice(3).join(" ").trim() || "";

    // The estado cell may contain a leading emoji + label, e.g.
    // "🔴 NO CONFORME". normalizeEstado handles the emoji noise.
    const estado = normalizeEstado(estadoRaw);

    rows.push({ norma, titulo, estado, brecha });
  }

  return rows;
}
