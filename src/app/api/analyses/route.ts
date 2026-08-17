import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const analyses = await db.analysis.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        projectType: true,
        horizon: true,
        depth: true,
        score: true,
        verdict: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ analyses });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error al obtener el historial.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await db.analysis.deleteMany({});
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error al limpiar el historial.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
