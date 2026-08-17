import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, readFile, unlink, mkdir } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { db } from "@/lib/db";
import { reportToHtml } from "@/lib/premortem/report-html";

export const runtime = "nodejs";
export const maxDuration = 120;

const execFileAsync = promisify(execFile);

const PYTHON_BIN = "/home/z/.venv/bin/python3";
const RENDER_SCRIPT = join(process.cwd(), "scripts", "render-pdf.py");
const RENDER_TIMEOUT_MS = 90_000;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  let htmlPath: string | null = null;
  let pdfPath: string | null = null;

  try {
    const analysis = await db.analysis.findUnique({ where: { id } });
    if (!analysis) {
      return NextResponse.json(
        { error: "Análisis no encontrado." },
        { status: 404 }
      );
    }

    const html = reportToHtml({
      title: analysis.title,
      markdown: analysis.report,
      score: analysis.score,
      verdict: analysis.verdict,
      projectType: analysis.projectType,
      horizon: analysis.horizon,
      depth: analysis.depth,
      createdAt:
        analysis.createdAt instanceof Date
          ? analysis.createdAt.toISOString()
          : String(analysis.createdAt ?? new Date().toISOString()),
    });

    const stamp = `${Date.now()}-${process.pid}`;
    const tmpBase = tmpdir();
    // Ensure the dir exists (tmpdir always exists, but be defensive).
    await mkdir(tmpBase, { recursive: true });

    htmlPath = join(tmpBase, `premortem-${id}-${stamp}.html`);
    pdfPath = join(tmpBase, `premortem-${id}-${stamp}.pdf`);

    await writeFile(htmlPath, html, "utf8");

    try {
      await execFileAsync(
        PYTHON_BIN,
        [RENDER_SCRIPT, htmlPath, pdfPath],
        {
          timeout: RENDER_TIMEOUT_MS,
          maxBuffer: 5 * 1024 * 1024,
          cwd: process.cwd(),
        }
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al ejecutar el render.";
      return NextResponse.json(
        {
          error: "No se pudo generar el PDF.",
          detail: message,
        },
        { status: 500 }
      );
    }

    let buffer: Buffer;
    try {
      const file = await readFile(pdfPath);
      buffer = Buffer.from(file);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "PDF no encontrado en disco.";
      return NextResponse.json(
        { error: "El PDF no se escribió en disco.", detail: message },
        { status: 500 }
      );
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="premortem-${id}.pdf"`,
        "Cache-Control": "no-store",
        "Content-Length": String(buffer.byteLength),
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error al generar el PDF.";
    return NextResponse.json(
      { error: "Error al generar el PDF.", detail: message },
      { status: 500 }
    );
  } finally {
    // Best-effort cleanup of temp files.
    for (const p of [htmlPath, pdfPath]) {
      if (!p) continue;
      try {
        await unlink(p);
      } catch {
        /* ignore — file may not exist */
      }
    }
  }
}
