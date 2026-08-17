// In-memory job store for asynchronous pre-mortem analysis.
//
// Why this exists: the LLM analysis can take 30–90s. When proxied through the
// gateway (Caddy), long-lived synchronous requests get cut off with 502 Bad
// Gateway before the analysis completes. To avoid that, the POST endpoint
// starts the analysis in the background and returns a job id immediately;
// the client polls GET /api/premortem/[jobId] until the job is done.
//
// The store is a module-level Map that survives across requests within the
// same Node process (Next.js dev server). It is intentionally in-memory: jobs
// are ephemeral and not persisted. Completed/failed jobs expire after 30 min.

export type JobStatus = "pending" | "running" | "done" | "error";

// Granular phase for the real progress indicator (#5).
// ordered by execution: extracting → generating → saving
export type JobPhase =
  | "queued"
  | "extracting"
  | "generating"
  | "saving"
  | "finished";

export interface Job {
  id: string;
  status: JobStatus;
  phase: JobPhase;
  phaseMessage?: string;
  startedAt?: number;
  createdAt: number;
  updatedAt: number;
  // Result fields (populated when status === "done")
  result?: {
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
  };
  // Error message (populated when status === "error")
  error?: string;
}

const TTL_MS = 30 * 60 * 1000; // 30 minutes

declare global {
  var __premortemJobs: Map<string, Job> | undefined;
}

function store(): Map<string, Job> {
  if (!globalThis.__premortemJobs) {
    globalThis.__premortemJobs = new Map();
  }
  return globalThis.__premortemJobs;
}

export function createJob(id: string): Job {
  const now = Date.now();
  const job: Job = {
    id,
    status: "pending",
    phase: "queued",
    createdAt: now,
    updatedAt: now,
  };
  store().set(id, job);
  cleanup();
  return job;
}

/** Update the job's current phase (for the real progress indicator). */
export function setJobPhase(
  id: string,
  phase: JobPhase,
  message?: string
): Job | undefined {
  return updateJob(id, { phase, phaseMessage: message });
}

export function getJob(id: string): Job | undefined {
  return store().get(id);
}

export function updateJob(
  id: string,
  patch: Partial<Omit<Job, "id" | "createdAt">>
): Job | undefined {
  const s = store();
  const job = s.get(id);
  if (!job) return undefined;
  const updated: Job = { ...job, ...patch, updatedAt: Date.now() };
  s.set(id, updated);
  return updated;
}

/** Remove jobs older than the TTL. */
function cleanup() {
  const s = store();
  const cutoff = Date.now() - TTL_MS;
  for (const [id, job] of s) {
    if (job.updatedAt < cutoff) {
      s.delete(id);
    }
  }
}
