import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/metrics — aggregate usage stats (#15)
export async function GET() {
  try {
    const analyses = await db.analysis.findMany({
      select: {
        projectType: true,
        score: true,
        verdict: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    const total = analyses.length;
    const byType: Record<string, number> = {};
    const byVerdict: Record<string, number> = {};
    let scoreSum = 0;
    let scoreCount = 0;
    let last7 = 0;
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;

    for (const a of analyses) {
      byType[a.projectType] = (byType[a.projectType] ?? 0) + 1;
      if (a.verdict) byVerdict[a.verdict] = (byVerdict[a.verdict] ?? 0) + 1;
      if (a.score != null) {
        scoreSum += a.score;
        scoreCount++;
      }
      if (a.createdAt.getTime() > cutoff) last7++;
    }

    return NextResponse.json({
      total,
      last7Days: last7,
      avgScore: scoreCount > 0 ? Math.round(scoreSum / scoreCount) : null,
      byType,
      byVerdict,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error al obtener métricas.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
