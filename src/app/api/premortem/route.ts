import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import {
  deriveTitle,
  extractScore,
  extractVerdict,
  runPremortem,
} from "@/lib/premortem/llm";
import {
  extractProjectFiles,
  FILE_LIMITS,
} from "@/lib/premortem/file-extractor";
import { createJob, setJobPhase, updateJob } from "@/lib/premortem/job-store";
import type {
  Depth,
  Horizon,
  PremortemRequest,
  ProjectType,
} from "@/lib/premortem/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const VALID_TYPES: ProjectType[] = [
  "saas",
  "startup",
  "internal_process",
  "investment",
  "software",
  "strategy",
  "other",
];
const VALID_HORIZONS: Horizon[] = ["3m", "6m", "12m", "24m"];
const VALID_DEPTHS: Depth[] = ["rapido", "estandar", "profundo"];
const MAX_UPLOAD_FILES = 40;

interface ParsedInput {
  projectDescription: string;
  projectType: ProjectType;
  horizon: Horizon;
  depth: Depth;
  context: string;
  files?: { name: string; bytes: Uint8Array }[];
}

async function parseInput(req: Request): Promise<
  | { ok: true; input: ParsedInput }
  | { ok: false; status: number; error: string }
> {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return {
        ok: false,
        status: 400,
        error: "No se pudo leer el formulario multipart.",
      };
    }
    const field = (k: string) => (form.get(k) as string | null) ?? "";
    const projectDescription = field("projectDescription").trim();
    const projectType = field("projectType") as ProjectType;
    const horizon = field("horizon") as Horizon;
    const depth = field("depth") as Depth;
    const context = field("context").trim();

    const files: { name: string; bytes: Uint8Array }[] = [];
    const allEntries = form.getAll("files");
    if (allEntries.length > MAX_UPLOAD_FILES) {
      return {
        ok: false,
        status: 400,
        error: `Demasiados archivos (máximo ${MAX_UPLOAD_FILES}).`,
      };
    }
    for (const entry of allEntries) {
      if (!(entry instanceof File) && !(entry instanceof Blob)) continue;
      const file = entry as File;
      if (!file.name) continue;
      const arrayBuf = await file.arrayBuffer();
      files.push({ name: file.name, bytes: new Uint8Array(arrayBuf) });
    }

    return {
      ok: true,
      input: {
        projectDescription,
        projectType,
        horizon,
        depth,
        context,
        files: files.length > 0 ? files : undefined,
      },
    };
  }

  let body: Partial<PremortemRequest>;
  try {
    body = await req.json();
  } catch {
    return {
      ok: false,
      status: 400,
      error: "Cuerpo de la petición inválido (JSON o multipart esperado).",
    };
  }
  return {
    ok: true,
    input: {
      projectDescription: (body.projectDescription ?? "").trim(),
      projectType: body.projectType as ProjectType,
      horizon: body.horizon as Horizon,
      depth: body.depth as Depth,
      context: (body.context ?? "").trim(),
    },
  };
}

/**
 * Process the pre-mortem analysis in the background and store the result in
 * the in-memory job store. This runs detached from the HTTP request so the
 * gateway never times out (the POST returns immediately with a job id).
 */
async function runJobInBackground(
  jobId: string,
  input: ParsedInput
): Promise<void> {
  updateJob(jobId, { status: "running", startedAt: Date.now() });
  try {
    const {
      projectDescription,
      projectType,
      horizon,
      depth,
      context,
      files,
    } = input;

    // Phase 1: extract files (if any)
    setJobPhase(
      jobId,
      "extracting",
      files && files.length > 0
        ? `Extrayendo contenido de ${files.length} archivo(s)…`
        : "Preparando el análisis…"
    );

    // Extract file content (if any) and merge into the analysis context.
    let filesContext = "";
    let filesSummary: {
      total: number;
      ok: number;
      truncated: boolean;
      bytes: number;
    } | null = null;
    if (files && files.length > 0) {
      const totalBytes = files.reduce((a, f) => a + f.bytes.byteLength, 0);
      if (totalBytes > FILE_LIMITS.maxTotalBytes) {
        throw new Error(
          `El tamaño total de los archivos (${(totalBytes / 1024 / 1024).toFixed(1)} MB) excede el máximo permitido (${(FILE_LIMITS.maxTotalBytes / 1024 / 1024).toFixed(0)} MB).`
        );
      }
      try {
        const extraction = await extractProjectFiles(files);
        filesContext = extraction.contextBlock;
        filesSummary = {
          total: extraction.totalFiles,
          ok: extraction.okFiles,
          truncated: extraction.truncated,
          bytes: totalBytes,
        };
      } catch (err) {
        throw new Error(
          err instanceof Error
            ? `No se pudo procesar los archivos subidos: ${err.message}`
            : "No se pudo procesar los archivos subidos."
        );
      }
    }

    const mergedContext = [context, filesContext]
      .filter((x) => x && x.trim())
      .join("\n\n");

    const request: PremortemRequest = {
      projectDescription,
      projectType,
      horizon,
      depth,
      context: mergedContext || undefined,
    };

    // Phase 2: LLM generation (the long part)
    setJobPhase(jobId, "generating", "El equipo virtual está atacando el proyecto…");
    const report = await runPremortem(request);
    const score = extractScore(report);
    const verdict = extractVerdict(report);
    const title = deriveTitle(projectDescription);

    // Phase 3: persisting
    setJobPhase(jobId, "saving", "Guardando el análisis…");
    let savedId: string | null = null;
    try {
      const created = await db.analysis.create({
        data: {
          title,
          projectType,
          horizon,
          depth,
          projectDescription,
          report,
          score,
          verdict,
        },
        select: { id: true },
      });
      savedId = created.id;
    } catch {
      // best-effort persistence
    }

    setJobPhase(jobId, "finished");
    updateJob(jobId, {
      status: "done",
      result: {
        id: savedId,
        title,
        report,
        score,
        verdict,
        projectType,
        horizon,
        depth,
        projectDescription,
        createdAt: new Date().toISOString(),
        files: filesSummary,
      },
    });
  } catch (err) {
    updateJob(jobId, {
      status: "error",
      error:
        err instanceof Error ? err.message : "Error desconocido al generar el análisis.",
    });
  }
}

export async function POST(req: Request) {
  const parsed = await parseInput(req);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }
  const { projectDescription, projectType, horizon, depth, files } = parsed.input;

  const hasFiles = files && files.length > 0;
  const minDesc = hasFiles ? 10 : 20;
  if (!projectDescription) {
    return NextResponse.json(
      {
        error: hasFiles
          ? "Añade una breve descripción del proyecto aunque subas archivos."
          : "La descripción del proyecto es obligatoria.",
      },
      { status: 400 }
    );
  }
  if (projectDescription.length < minDesc) {
    return NextResponse.json(
      {
        error:
          minDesc === 10
            ? "Añade una descripción un poco más detallada del proyecto (mínimo 10 caracteres)."
            : "La descripción es demasiado breve para un análisis útil. Describe al menos el problema, la solución propuesta y los recursos disponibles.",
      },
      { status: 400 }
    );
  }
  if (!projectType || !VALID_TYPES.includes(projectType)) {
    return NextResponse.json({ error: "Tipo de proyecto inválido." }, { status: 400 });
  }
  if (!horizon || !VALID_HORIZONS.includes(horizon)) {
    return NextResponse.json({ error: "Horizonte temporal inválido." }, { status: 400 });
  }
  if (!depth || !VALID_DEPTHS.includes(depth)) {
    return NextResponse.json({ error: "Profundidad inválida." }, { status: 400 });
  }

  // Pre-check total upload size before starting the job.
  if (files && files.length > 0) {
    const totalBytes = files.reduce((a, f) => a + f.bytes.byteLength, 0);
    if (totalBytes > FILE_LIMITS.maxTotalBytes) {
      return NextResponse.json(
        {
          error: `El tamaño total de los archivos (${(totalBytes / 1024 / 1024).toFixed(1)} MB) excede el máximo permitido (${(FILE_LIMITS.maxTotalBytes / 1024 / 1024).toFixed(0)} MB).`,
        },
        { status: 413 }
      );
    }
  }

  // Start the analysis in the background and return a job id immediately.
  // This prevents the gateway from cutting off long-lived requests with 502.
  const jobId = randomUUID();
  createJob(jobId);

  // Fire-and-forget: the promise runs detached from this request.
  void runJobInBackground(jobId, parsed.input).catch(() => {
    updateJob(jobId, {
      status: "error",
      error: "Error inesperado al iniciar el análisis.",
    });
  });

  return NextResponse.json({ jobId, status: "pending" });
}
