import { NextResponse } from "next/server";
import { listIncidents } from "@/lib/soap/incidents";
import { classifyIncidents } from "@/lib/ai/classify";
import { logUsage } from "@/lib/ai/costStore";

/**
 * Pre-carga del cache de clasificacion. Correr ANTES de una reunion para que el
 * dashboard cargue instantaneo en vivo (sin esperar el refinamiento por IA).
 *
 *   GET /api/prewarm?ids=452,471&periods=2026-06,2026-05
 *
 * Para cada empresa x periodo trae los incidentes y los clasifica con IA, dejando
 * todo en el cache de disco. Herramienta de desarrollo/operacion, no del producto.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const ids = (url.searchParams.get("ids") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const periods = (url.searchParams.get("periods") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!ids.length || !periods.length) {
    return NextResponse.json({ error: "faltan ids o periods" }, { status: 400 });
  }

  const t0 = Date.now();
  const resumen: Array<{ id: string; period: string; incidentes: number; llamadasIA: number }> = [];
  for (const id of ids) {
    for (const period of periods) {
      const raw = await listIncidents(id, period);
      const { usage } = await classifyIncidents(raw); // full: clasifica y cachea
      logUsage(usage);
      resumen.push({ id, period, incidentes: raw.length, llamadasIA: usage.calls });
    }
  }

  return NextResponse.json({
    ok: true,
    segundos: Number(((Date.now() - t0) / 1000).toFixed(1)),
    resumen,
  });
}
