import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/shared/[token] — public read of a shared analysis (#8)
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> }
) {
  const { token } = await ctx.params;
  try {
    const analysis = await db.analysis.findFirst({
      where: { shareToken: token, isPublic: true },
      select: {
        id: true,
        title: true,
        projectType: true,
        horizon: true,
        depth: true,
        report: true,
        score: true,
        verdict: true,
        createdAt: true,
      },
    });
    if (!analysis) {
      return NextResponse.json(
        { error: "Análisis no encontrado o no compartido." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { analysis },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error al obtener el análisis.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
