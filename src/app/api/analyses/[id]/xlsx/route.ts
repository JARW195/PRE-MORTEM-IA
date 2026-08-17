import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildXlsxFromResult } from "@/lib/premortem/xlsx-export";

export const runtime = "nodejs";
export const maxDuration = 30;

// GET /api/analyses/[id]/xlsx — download the analysis as an .xlsx workbook (#7)
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  try {
    const a = await db.analysis.findUnique({ where: { id } });
    if (!a) {
      return NextResponse.json(
        { error: "Análisis no encontrado." },
        { status: 404 }
      );
    }
    const buf = buildXlsxFromResult({
      id: a.id,
      title: a.title,
      projectType: a.projectType,
      horizon: a.horizon,
      depth: a.depth,
      projectDescription: a.projectDescription,
      report: a.report,
      score: a.score,
      verdict: a.verdict,
      createdAt: a.createdAt.toISOString(),
    });
    const safe = (a.title || "premortem")
      .replace(/[^\w\-]+/g, "_")
      .slice(0, 50) || "premortem";
    return new NextResponse(Buffer.from(buf), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="premortem_${safe}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error al generar el Excel.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
