import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

// PUT /api/analyses/[id]/edit — update title, tags, notes (#4), archived (05·HISTÓRICO)
export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  let body: { title?: string; tags?: string[]; notes?: string; archived?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const data: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body.title === "string" && body.title.trim()) {
    data.title = body.title.trim().slice(0, 120);
  }
  if (Array.isArray(body.tags)) {
    // SQLite can't store lists; serialize as JSON string.
    const clean = body.tags
      .filter((t) => typeof t === "string" && t.trim())
      .map((t) => t.trim().slice(0, 30))
      .slice(0, 10);
    data.tags = JSON.stringify(clean);
  }
  if (typeof body.notes === "string") {
    data.notes = body.notes.slice(0, 2000);
  }
  if (typeof body.archived === "boolean") {
    data.archived = body.archived;
  }
  // Reminder (#9) — accept an ISO date string.
  if (typeof (body as { reminderAt?: unknown }).reminderAt === "string") {
    const ra = (body as { reminderAt: string }).reminderAt;
    data.reminderAt = ra ? new Date(ra) : null;
    data.reminderSeen = false;
  }

  try {
    const updated = await db.analysis.update({
      where: { id },
      data,
      select: {
        id: true,
        title: true,
        tags: true,
        notes: true,
        archived: true,
        updatedAt: true,
      },
    });
    return NextResponse.json({
      ...updated,
      tags: updated.tags ? (JSON.parse(updated.tags) as string[]) : [],
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error al actualizar el análisis.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
