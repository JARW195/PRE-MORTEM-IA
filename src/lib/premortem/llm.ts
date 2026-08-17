import OpenAI from "openai";
import { buildSystemPrompt } from "./system-prompt";
import type { PremortemRequest } from "./types";

/**
 * AI client. Points to Z.AI's OpenAI-compatible endpoint by default
 * (https://api.z.ai/api/paas/v4), which serves the GLM models this prompt
 * was tuned against. To use OpenAI or another OpenAI-compatible provider
 * instead, just change AI_BASE_URL / AI_API_KEY / AI_MODEL in your env vars.
 */
function getClient(): OpenAI {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Falta la variable de entorno AI_API_KEY. Configúrala en tu proyecto de Vercel (Settings → Environment Variables)."
    );
  }
  return new OpenAI({
    apiKey,
    baseURL: process.env.AI_BASE_URL || "https://api.z.ai/api/paas/v4",
  });
}

const AI_MODEL = process.env.AI_MODEL || "glm-4.6";

/**
 * Build the user message that wraps the operator's project description
 * with the selected context. When file evidence was extracted, instructs the
 * AI to ground its analysis in the uploaded material.
 */
function buildUserMessage(req: PremortemRequest): string {
  const hasFiles = req.context?.includes("## ARCHIVOS DEL PROYECTO SUBIDO");
  const ctx = req.context?.trim()
    ? `\n\n## CONTEXTO ADICIONAL PROPORCIONADO\n${req.context.trim()}`
    : "";
  const filesInstruction = hasFiles
    ? `\n\n## INSTRUCCIÓN SOBRE ARCHIVOS SUBIDOS\nEl usuario subió archivos del proyecto. Trata su contenido extraído como HECHOS (evidencia verificable) cuando corresponda, no como supuestos. Cita archivos concretos por nombre cuando un riesgo o brecha se base en ellos. Si un archivo no pudo procesarse, declara esa incertidumbre en la sección de información faltante. No inventes contenido que no esté en los archivos ni en la descripción del proyecto.`
    : "";
  return `Ejecuta el PRE-MORTEM completo sobre el siguiente proyecto/decisión. Aplica el ciclo completo y entrega el informe en el FORMATO OBLIGATORIO definido en las instrucciones.${filesInstruction}

## PROYECTO A ANALIZAR

${req.projectDescription.trim()}${ctx}

Recuerda: asume que el proyecto ya fracasó y descubre exactamente por qué. Sé crítico, específico y concreto con ESTE proyecto.`;
}

/**
 * Extracts the preparation score (0–100) from the report.
 * Looks for the "# XX/100" marker in the índice de preparación section.
 */
export function extractScore(report: string): number | null {
  // Match "# XX/100" where XX is 0-100
  const m = report.match(/#\s*(\d{1,3})\s*\/\s*100/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (Number.isNaN(n) || n < 0 || n > 100) return null;
  return n;
}

/**
 * Extracts the verdict label from the report.
 */
export function extractVerdict(report: string): string | null {
  const patterns = [
    /🟢\s*\*\*ROBUSTO\*\*/,
    /🟡\s*\*\*REQUIERE ATENCIÓN\*\*/,
    /🟠\s*\*\*VULNERABLE\*\*/,
    /🔴\s*\*\*ALTO RIESGO\*\*/,
  ];
  const labels = [
    "ROBUSTO",
    "REQUIERE ATENCION",
    "VULNERABLE",
    "ALTO RIESGO",
  ];
  for (let i = 0; i < patterns.length; i++) {
    if (patterns[i].test(report)) return labels[i];
  }
  // Fallback: look for the label without emoji/formatting
  const fb = report.match(
    /\*\*(ROBUSTO|REQUIERE ATENCIÓN|VULNERABLE|ALTO RIESGO)\*\*/i
  );
  if (fb) {
    return fb[1].toUpperCase().replace("Ó", "O").replace("Í", "I");
  }
  return null;
}

/**
 * Derive a short title from the project description.
 */
export function deriveTitle(projectDescription: string): string {
  const text = projectDescription.trim().replace(/\s+/g, " ");
  if (text.length <= 60) return text;
  return text.slice(0, 57).trimEnd() + "…";
}

/**
 * Run the PRE-MORTEM analysis via the LLM.
 * Returns the full markdown report.
 *
 * Retries up to 2 times on transient failures (network, timeout, rate limit,
 * 5xx) with exponential backoff. This handles intermittent SDK errors that
 * would otherwise surface as a user-facing error.
 */
export async function runPremortem(
  req: PremortemRequest
): Promise<string> {
  const systemPrompt = buildSystemPrompt({
    projectType: req.projectType,
    horizon: req.horizon,
    depth: req.depth,
  });
  const userMessage = buildUserMessage(req);

  const MAX_ATTEMPTS = 3;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const client = getClient();

      const completion = await client.chat.completions.create({
        model: AI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      });

      const content: string | undefined = completion?.choices?.[0]?.message?.content ?? undefined;
      if (!content || !content.trim()) {
        throw new Error("El modelo no devolvió contenido.");
      }

      return content.trim();
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      const isTransient = isTransientError(msg);

      if (attempt < MAX_ATTEMPTS && isTransient) {
        // Exponential backoff: 3s, 6s
        const delayMs = 3000 * Math.pow(2, attempt - 1);
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
      // Non-transient error or out of retries — break and throw.
      break;
    }
  }

  const msg =
    lastError instanceof Error ? lastError.message : "Error desconocido del modelo.";
  throw new Error(msg);
}

/**
 * Heuristic: decide whether an SDK error is worth retrying.
 */
function isTransientError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("timeout") ||
    m.includes("timed out") ||
    m.includes("deadline") ||
    m.includes("econnreset") ||
    m.includes("econnrefused") ||
    m.includes("socket hang up") ||
    m.includes("fetch failed") ||
    m.includes("network") ||
    m.includes("rate limit") ||
    m.includes("429") ||
    m.includes("500") ||
    m.includes("502") ||
    m.includes("503") ||
    m.includes("504") ||
    m.includes("service unavailable") ||
    m.includes("bad gateway") ||
    m.includes("gateway") ||
    m.includes("context deadline") ||
    m.includes("aborted") ||
    m.includes("connect etimedout")
  );
}
