import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";

export const runtime = "nodejs";

// POST /api/analyses/[id]/share — create or rotate a share token (#8)
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const token = randomUUID().replace(/-/g, "");
  try {
    const updated = await db.analysis.update({
      where: { id },
      data: { shareToken: token, isPublic: true },
      select: { id: true, shareToken: true },
    });
    return NextResponse.json({
      id: updated.id,
      shareToken: updated.shareToken,
      url: `/shared/${updated.shareToken}`,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error al generar el enlace.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/analyses/[id]/share — revoke sharing
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  try {
    await db.analysis.update({
      where: { id },
      data: { shareToken: null, isPublic: false },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error al revocar el enlace.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
