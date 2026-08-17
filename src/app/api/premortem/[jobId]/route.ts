import { NextResponse } from "next/server";
import { getJob } from "@/lib/premortem/job-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/premortem/[jobId] — poll the status of an asynchronous pre-mortem
 * analysis job. Returns { status, result?, error? }.
 *
 * status: "pending" | "running" | "done" | "error"
 * When "done", `result` contains the full analysis (id, report, score, verdict).
 * When "error", `error` contains a human-readable message.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await ctx.params;
  const job = await getJob(jobId);
  if (!job) {
    return NextResponse.json(
      { error: "Trabajo no encontrado o expirado." },
      { status: 404 }
    );
  }
  return NextResponse.json(
    {
      status: job.status,
      phase: job.phase,
      phaseMessage: job.phaseMessage ?? null,
      result: job.result ?? null,
      error: job.error ?? null,
      createdAt: job.createdAt,
      startedAt: job.startedAt ?? null,
      updatedAt: job.updatedAt,
    },
    {
      headers: { "Cache-Control": "no-store" },
    }
  );
}
