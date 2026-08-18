import { randomUUID } from "crypto";
import { NextResponse, after } from "next/server";
import { db } from "@/lib/db";
import { runActionPlan } from "@/lib/premortem/llm";

export const runtime = "nodejs";
export const maxDuration = 300;

// POST /api/analyses/[id]/action-plan — generate (or regenerate) the
// "Plan de Acción" follow-up (section 14) for an existing analysis, from its
// own stored report + project description.
//
// Async job pattern (same as /api/premortem): this returns a jobId
// immediately instead of blocking, because the LLM call can take 30-90s and
// a long-held POST request risks a 502 from Vercel's gateway. The client
// polls GET /api/analyses/[id]/action-plan/[jobId] for the result.
//
// Already-generated plans are cached on the Analysis row and returned
// instantly (status "done" with no jobId) unless ?force=1 is passed.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const analysis = await db.analysis.findUnique({
    where: { id },
    select: { id: true, report: true, projectDescription: true, actionPlan: true },
  });

  if (!analysis) {
    return NextResponse.json({ error: "Análisis no encontrado." }, { status: 404 });
  }

  const url = new URL(req.url);
  if (analysis.actionPlan && url.searchParams.get("force") !== "1") {
    return NextResponse.json({ status: "done", actionPlan: analysis.actionPlan, cached: true });
  }

  const jobId = randomUUID();
  await db.job.create({ data: { id: jobId, status: "pending", phase: "generating" } });

  after(async () => {
    try {
      await db.job.update({ where: { id: jobId }, data: { status: "running" } });
      const actionPlan = await runActionPlan({
        projectDescription: analysis.projectDescription,
        originalReport: analysis.report,
      });
      await db.analysis.update({
        where: { id },
        data: { actionPlan, updatedAt: new Date() },
      });
      await db.job.update({
        where: { id: jobId },
        data: { status: "done", phase: "finished", result: { actionPlan } },
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al generar el plan de acción.";
      await db.job.update({
        where: { id: jobId },
        data: { status: "error", error: message },
      }).catch(() => {});
    }
  });

  return NextResponse.json({ status: "pending", jobId });
}
