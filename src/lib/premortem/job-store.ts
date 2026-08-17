// Persisted job store for asynchronous pre-mortem analysis.
//
// Why this exists: the LLM analysis can take 30-90s. The POST endpoint
// starts the analysis in the background and returns a job id immediately;
// the client polls GET /api/premortem/[jobId] until the job is done.
//
// This is backed by Postgres (not an in-memory Map) because on serverless
// platforms (Vercel) each request may be handled by a different, isolated
// function instance that does not share memory with the one that started
// the job. Persisting to the database is what makes polling work reliably
// across instances. Completed/failed jobs are cleaned up after 30 min.

import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export type JobStatus = "pending" | "running" | "done" | "error";

export type JobPhase =
  | "queued"
  | "extracting"
  | "generating"
  | "saving"
  | "finished";

export interface JobResult {
  id: string | null;
  title: string;
  report: string;
  score: number | null;
  verdict: string | null;
  projectType: string;
  horizon: string;
  depth: string;
  projectDescription: string;
  createdAt: string;
  files?: { total: number; ok: number; truncated: boolean; bytes: number } | null;
}

export interface Job {
  id: string;
  status: JobStatus;
  phase: JobPhase;
  phaseMessage?: string;
  startedAt?: number;
  createdAt: number;
  updatedAt: number;
  result?: JobResult;
  error?: string;
}

const TTL_MS = 30 * 60 * 1000; // 30 minutes

function fromRow(row: {
  id: string;
  status: string;
  phase: string;
  phaseMessage: string | null;
  startedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  result: Prisma.JsonValue | null;
  error: string | null;
}): Job {
  return {
    id: row.id,
    status: row.status as JobStatus,
    phase: row.phase as JobPhase,
    phaseMessage: row.phaseMessage ?? undefined,
    startedAt: row.startedAt ? row.startedAt.getTime() : undefined,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
    result: (row.result as unknown as JobResult) ?? undefined,
    error: row.error ?? undefined,
  };
}

export async function createJob(id: string): Promise<Job> {
  const row = await db.job.create({
    data: { id, status: "pending", phase: "queued" },
  });
  cleanup().catch(() => {});
  return fromRow(row);
}

export async function setJobPhase(
  id: string,
  phase: JobPhase,
  message?: string
): Promise<Job | undefined> {
  return updateJob(id, { phase, phaseMessage: message });
}

export async function getJob(id: string): Promise<Job | undefined> {
  const row = await db.job.findUnique({ where: { id } });
  return row ? fromRow(row) : undefined;
}

export async function updateJob(
  id: string,
  patch: Partial<Omit<Job, "id" | "createdAt">>
): Promise<Job | undefined> {
  try {
    const row = await db.job.update({
      where: { id },
      data: {
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.phase !== undefined ? { phase: patch.phase } : {}),
        ...(patch.phaseMessage !== undefined
          ? { phaseMessage: patch.phaseMessage }
          : {}),
        ...(patch.startedAt !== undefined
          ? { startedAt: new Date(patch.startedAt) }
          : {}),
        ...(patch.result !== undefined
          ? { result: patch.result as unknown as Prisma.InputJsonValue }
          : {}),
        ...(patch.error !== undefined ? { error: patch.error } : {}),
      },
    });
    return fromRow(row);
  } catch {
    return undefined;
  }
}

async function cleanup(): Promise<void> {
  const cutoff = new Date(Date.now() - TTL_MS);
  await db.job.deleteMany({ where: { updatedAt: { lt: cutoff } } });
}
