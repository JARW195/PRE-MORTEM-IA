import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/analyses/[id]/action-plan/[jobId] — poll the status of an
// asynchronous "Plan de Acción" generation job started by the POST endpoint
// in the parent route.
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string; jobId: string }> }
) {
  const { jobId } = await ctx.params;
  const job = await db.job.findUnique({ where: { id: jobId } });

  if (!job) {
    return NextResponse.json(
      { error: "Trabajo no encontrado o expirado." },
      { status: 404 }
    );
  }

  const result = job.result as { actionPlan?: string } | null;

  return NextResponse.json(
    {
      status: job.status,
      actionPlan: result?.actionPlan ?? null,
      error: job.error ?? null,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
