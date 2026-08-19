import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    // 05·HISTÓRICO: por defecto la "mesa de trabajo" solo muestra análisis
    // activos. ?includeArchived=1 revela también los archivados.
    const includeArchived = url.searchParams.get("includeArchived") === "1";

    const analyses = await db.analysis.findMany({
      where: includeArchived ? {} : { archived: false },
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
        archived: true,
        actionPlan: true,
      },
    });
    // Don't ship the full action-plan text in the list payload — only
    // whether one exists, to visualize the ciclo Evaluar→Ajustar per item.
    const withFlags = analyses.map(({ actionPlan, ...rest }) => ({
      ...rest,
      hasActionPlan: Boolean(actionPlan),
    }));
    return NextResponse.json({ analyses: withFlags });
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
