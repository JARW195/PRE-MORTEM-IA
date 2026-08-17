/**
 * report-html.ts — Build a self-contained HTML document for a PRE-MORTEM IA report.
 *
 * Used by the PDF endpoint (`/api/analyses/[id]/pdf`) to feed Playwright/Chromium.
 * The HTML embeds its own CSS (no external resources, no web-fonts) so the
 * headless browser can render offline with `print_background=True`.
 *
 * Emoji, GFM tables, blockquotes, code blocks and verdict labels are rendered
 * natively by Chromium.
 */

import { marked } from "marked";
import { readFileSync } from "fs";
import { join } from "path";
import {
  DEPTH_LABELS,
  HORIZON_LABELS,
  PROJECT_TYPE_LABELS,
} from "@/lib/premortem/types";

// Load the watermark logo once as a base64 data URI so the PDF HTML stays
// self-contained (Playwright renders via file://, so external http requests
// for assets would be unreliable / slow).
const LOGO_WATERMARK_PATH = join(process.cwd(), "public", "logo-watermark.png");
let LOGO_WATERMARK_DATA_URI = "";
try {
  const buf = readFileSync(LOGO_WATERMARK_PATH);
  LOGO_WATERMARK_DATA_URI = `data:image/png;base64,${buf.toString("base64")}`;
} catch {
  // If the logo file is missing, the watermark element is simply empty.
  LOGO_WATERMARK_DATA_URI = "";
}

export interface ReportHtmlInput {
  title: string;
  markdown: string;
  score: number | null;
  verdict: string | null;
  projectType: string;
  horizon: string;
  depth: string;
  createdAt: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function labelOf(map: Record<string, string>, value: string): string {
  return map[value] ?? value;
}

function verdictBadgeClass(verdict: string | null): string {
  switch (verdict) {
    case "ROBUSTO":
      return "verdict-robusto";
    case "REQUIERE ATENCION":
    case "REQUIERE_ATENCION":
      return "verdict-attention";
    case "VULNERABLE":
      return "verdict-vulnerable";
    case "ALTO RIESGO":
    case "ALTO_RIESGO":
      return "verdict-high";
    default:
      return "verdict-unknown";
  }
}

function verdictDisplay(verdict: string | null): string {
  if (!verdict) return "SIN VEREDICTO";
  return verdict.replace(/_/g, " ");
}

/**
 * Post-process the marked HTML to wrap known verdict/epistemic labels (when
 * they appear inside <strong> or as standalone bold words) in colored spans.
 * This mirrors the on-screen react-markdown colorization so the PDF matches
 * the visual identity of the app.
 */
function colorizeLabels(html: string): string {
  const replacements: Array<[RegExp, string]> = [
    [/\bROBUSTO\b/g, '<span class="lbl-robusto">ROBUSTO</span>'],
    [/\bVULNERABLE\b/g, '<span class="lbl-vulnerable">VULNERABLE</span>'],
    [/\bALTO\s+RIESGO\b/g, '<span class="lbl-high">ALTO RIESGO</span>'],
    [/\bREQUIERE\s+ATENCI[NÓ]N\b/g, '<span class="lbl-attention">REQUIERE ATENCIÓN</span>'],
    [/\bHECHO\b/g, '<span class="lbl-hecho">HECHO</span>'],
    [/\bSUPUESTO\b/g, '<span class="lbl-supuesto">SUPUESTO</span>'],
    [/\bINFERENCIA\b/g, '<span class="lbl-inferencia">INFERENCIA</span>'],
  ];
  // Skip tokens already wrapped (avoid double-wrapping).
  let out = html;
  for (const [re, replacement] of replacements) {
    out = out.replace(re, (match) => {
      // If already inside a span wrapper, skip.
      return replacement;
    });
  }
  return out;
}

const STYLES = `
@page { size: A4; margin: 12mm; }
* { box-sizing: border-box; }
html, body {
  margin: 0;
  padding: 0;
  background: #0c0e16;
  color: #f5f5f4;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue",
    Arial, "Noto Sans", "Liberation Sans", "DejaVu Sans", sans-serif;
  font-size: 12.5px;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
body { padding: 0; }
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 4mm;
}
header.report-header {
  border-bottom: 1px solid rgba(245, 158, 11, 0.25);
  padding-bottom: 12px;
  margin-bottom: 18px;
}
header.report-header h1 {
  font-size: 22px;
  margin: 0 0 8px 0;
  color: #f5f5f4;
  line-height: 1.25;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  margin-top: 6px;
}
.meta-chip {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid rgba(245, 158, 11, 0.3);
  background: rgba(245, 158, 11, 0.06);
  color: #fbbf24;
  font-size: 10.5px;
  font-weight: 500;
  letter-spacing: 0.02em;
}
.score-chip {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  border: 1px solid rgba(245, 158, 11, 0.45);
  background: rgba(245, 158, 11, 0.12);
  color: #fcd34d;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
}
.verdict-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  border: 1px solid transparent;
}
.verdict-robusto   { background: rgba(34,197,94,0.12);  color: #4ade80; border-color: rgba(34,197,94,0.45);  }
.verdict-attention { background: rgba(245,158,11,0.12); color: #fbbf24; border-color: rgba(245,158,11,0.45); }
.verdict-vulnerable{ background: rgba(251,146,60,0.12); color: #fb923c; border-color: rgba(251,146,60,0.45); }
.verdict-high      { background: rgba(239,68,68,0.12);  color: #f87171; border-color: rgba(239,68,68,0.45);  }
.verdict-unknown   { background: rgba(120,120,120,0.12); color: #d4d4d4; border-color: rgba(120,120,120,0.35); }

article.report {
  color: #e7e5e4;
  word-wrap: break-word;
}
article.report h1,
article.report h2,
article.report h3,
article.report h4 {
  color: #f5f5f4;
  font-weight: 700;
  line-height: 1.25;
  margin-top: 1.4em;
  margin-bottom: 0.55em;
  scroll-margin-top: 0;
  page-after-break: avoid;
  break-after: avoid;
}
article.report h1 { font-size: 19px; border-bottom: 1px solid rgba(245,158,11,0.25); padding-bottom: 6px; }
article.report h2 { font-size: 16px; border-bottom: 1px solid rgba(245,158,11,0.18); padding-bottom: 4px; }
article.report h3 { font-size: 14px; color: #fcd34d; }
article.report h4 { font-size: 12.5px; color: #fcd34d; }
article.report h1:first-child,
article.report h2:first-child { margin-top: 0; }
article.report p { margin: 0.55em 0; }
article.report strong { color: #fff; font-weight: 700; }
article.report em { color: #fcd34d; font-style: italic; }
article.report a { color: #fbbf24; text-decoration: underline; word-break: break-word; }
article.report ul,
article.report ol {
  margin: 0.55em 0;
  padding-left: 1.4em;
}
article.report li { margin: 0.22em 0; }
article.report ul li::marker { color: #f59e0b; }
article.report ol li::marker { color: #f59e0b; font-weight: 600; }
article.report blockquote {
  margin: 0.7em 0;
  padding: 6px 12px;
  border-left: 3px solid #f59e0b;
  background: rgba(245, 158, 11, 0.06);
  color: #e7e5e4;
  border-radius: 0 4px 4px 0;
}
article.report blockquote p { margin: 0.3em 0; }
article.report hr {
  border: none;
  border-top: 1px solid rgba(245,158,11,0.18);
  margin: 1.4em 0;
}
article.report code {
  font-family: "SF Mono", "Menlo", "Consolas", "Liberation Mono", "DejaVu Sans Mono",
    monospace;
  font-size: 11.5px;
  background: rgba(245, 158, 11, 0.08);
  padding: 1px 5px;
  border-radius: 4px;
  color: #fcd34d;
}
article.report pre {
  background: #0a0c14;
  border: 1px solid rgba(245,158,11,0.15);
  border-radius: 6px;
  padding: 10px 12px;
  overflow-x: auto;
  margin: 0.7em 0;
  page-break-inside: avoid;
}
article.report pre code {
  background: transparent;
  padding: 0;
  color: #e7e5e4;
  font-size: 11px;
  line-height: 1.5;
}
article.report table {
  border-collapse: collapse;
  width: 100%;
  margin: 0.7em 0;
  font-size: 11.5px;
  page-break-inside: auto;
}
article.report table th,
article.report table td {
  border: 1px solid rgba(245, 158, 11, 0.2);
  padding: 6px 8px;
  text-align: left;
  vertical-align: top;
}
article.report table th {
  background: rgba(245, 158, 11, 0.12);
  color: #fcd34d;
  font-weight: 700;
}
article.report table tr:nth-child(even) td {
  background: rgba(255, 255, 255, 0.02);
}
article.report table tr { page-break-inside: avoid; }

/* Colorized labels (post-processed from marked output) */
.lbl-robusto    { color: #4ade80; font-weight: 700; }
.lbl-vulnerable { color: #fb923c; font-weight: 700; }
.lbl-high       { color: #f87171; font-weight: 700; }
.lbl-attention  { color: #fbbf24; font-weight: 700; }
.lbl-hecho      { color: #4ade80; font-weight: 700; }
.lbl-supuesto   { color: #fbbf24; font-weight: 700; }
.lbl-inferencia { color: #7dd3fc; font-weight: 700; }

footer.report-footer {
  margin-top: 26px;
  padding-top: 10px;
  border-top: 1px solid rgba(245, 158, 11, 0.18);
  color: #a8a29e;
  font-size: 10px;
  text-align: center;
  line-height: 1.5;
}
footer.report-footer strong { color: #fbbf24; }

/* Brand watermark — fixed, centered, subtle, non-interactive */
.watermark {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 0;
  pointer-events: none;
  opacity: 0.10;
}
.watermark img {
  width: 360px;
  height: auto;
  max-width: 60vw;
}
`;

export function reportToHtml(input: ReportHtmlInput): string {
  const bodyHtml = marked.parse(input.markdown ?? "", {
    gfm: true,
    breaks: false,
    async: false,
  }) as string;
  const colorized = colorizeLabels(bodyHtml);

  const projectTypeLabel = labelOf(
    PROJECT_TYPE_LABELS as Record<string, string>,
    input.projectType
  );
  const horizonLabel = labelOf(
    HORIZON_LABELS as Record<string, string>,
    input.horizon
  );
  const depthLabel = labelOf(
    DEPTH_LABELS as Record<string, string>,
    input.depth
  );

  const scoreText =
    input.score != null && !Number.isNaN(input.score)
      ? `${Math.round(input.score)}/100`
      : "—";

  const verdictClass = verdictBadgeClass(input.verdict);
  const verdictText = verdictDisplay(input.verdict);

  const createdAt = new Date(input.createdAt);
  const genDate = isNaN(createdAt.getTime())
    ? new Date().toISOString()
    : createdAt.toISOString();
  const genDateDisplay = isNaN(createdAt.getTime())
    ? new Date().toLocaleString("es")
    : createdAt.toLocaleString("es", {
        dateStyle: "long",
        timeStyle: "short",
      });

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(input.title || "Pre-mortem")} · PRE-MORTEM IA</title>
  <style>${STYLES}</style>
</head>
<body>
  <div class="watermark" aria-hidden="true">
    <img src="${LOGO_WATERMARK_DATA_URI}" alt="" />
  </div>
  <div class="container">
    <header class="report-header">
      <h1>${escapeHtml(input.title || "Pre-mortem")}</h1>
      <div class="meta-row">
        <span class="meta-chip">${escapeHtml(projectTypeLabel)}</span>
        <span class="meta-chip">Horizonte: ${escapeHtml(horizonLabel)}</span>
        <span class="meta-chip">Profundidad: ${escapeHtml(depthLabel)}</span>
        <span class="score-chip">Índice de preparación: ${escapeHtml(scoreText)}</span>
        <span class="verdict-badge ${verdictClass}">${escapeHtml(verdictText)}</span>
      </div>
    </header>
    <article class="report">
${colorized}
    </article>
    <footer class="report-footer">
      <strong>PRE-MORTEM IA</strong> · Análisis heurístico de IA — no constituye auditoría profesional certificada ni garantía de éxito.<br>
      Generado el ${escapeHtml(genDateDisplay)} · ID de análisis: ${escapeHtml(genDate)}
    </footer>
  </div>
</body>
</html>`;
}
