import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API key for /api/v1/* integration endpoints (#18).
// Set PREMORTEM_API_KEY env var to require it. If unset, v1 is disabled (403).
const API_KEY = process.env.PREMORTEM_API_KEY;

function authorize(req: Request): boolean {
  if (!API_KEY) return false; // integration disabled unless a key is configured
  const auth = req.headers.get("authorization") ?? "";
  const xkey = req.headers.get("x-api-key") ?? "";
  if (xkey && xkey === API_KEY) return true;
  if (auth.startsWith("Bearer ") && auth.slice(7) === API_KEY) return true;
  return false;
}

// GET /api/v1/analyses — list analyses for external integration (#18)
export async function GET(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json(
      {
        error:
          "No autorizado. Proporciona un API key válido (header X-Api-Key o Authorization: Bearer).",
        hint: API_KEY
          ? "Configura la variable de entorno PREMORTEM_API_KEY para habilitar la integración."
          : "La integración v1 está deshabilitada (no hay API key configurado).",
      },
      { status: 403 }
    );
  }

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 200);

  try {
    const analyses = await db.analysis.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
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
    return NextResponse.json({ count: analyses.length, analyses });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error al listar análisis.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
