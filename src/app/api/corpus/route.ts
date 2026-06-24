import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { listEmpresas, listIncidents } from "@/lib/soap/incidents";
import { recentPeriods } from "@/lib/format";

/**
 * Herramienta de extracción del corpus (Fase 1 del clasificador propio). NO
 * forma parte del producto: es una utilidad de desarrollo para sacar SOAP "con
 * cuidado" UNA vez y guardar los datos a disco, y desde ahí trabajar offline.
 *
 *   GET /api/corpus?mode=resolve&q=santander,galeno,dia,nasa,san juan
 *     -> candidatos de empresa por cada término + períodos recientes.
 *        Sirve para confirmar los IDs ANTES de la descarga pesada.
 *
 *   GET /api/corpus?mode=extract&ids=ID1,ID2,...&periods=2026-05,2026-03
 *     -> trae listIncidents (ya enriquecido: descripcion+causa+solucion+trabajos)
 *        para cada id×período y lo guarda en data/corpus/<id>-<period>.json.
 *        Reusa la capa SOAP endurecida (concurrencia, caché, reintentos).
 */

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

const CORPUS_DIR = path.join(process.cwd(), "data", "corpus");

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") ?? "resolve";

  const empresas = await listEmpresas();

  if (mode === "resolve") {
    const q = (url.searchParams.get("q") ?? "")
      .split(",")
      .map((t) => norm(t))
      .filter(Boolean);
    const matches = q.map((term) => ({
      term,
      candidatos: empresas
        .filter((e) => norm(e.nombre).includes(term))
        .slice(0, 10),
    }));
    return NextResponse.json({
      totalEmpresas: empresas.length,
      periodosRecientes: recentPeriods(12),
      matches,
    });
  }

  if (mode === "extract") {
    const ids = (url.searchParams.get("ids") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const periods = (url.searchParams.get("periods") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    if (!ids.length || !periods.length) {
      return NextResponse.json({ error: "faltan ids o periods" }, { status: 400 });
    }

    fs.mkdirSync(CORPUS_DIR, { recursive: true });
    const resumen: Array<{ id: string; nombre: string; period: string; incidentes: number; archivo: string }> = [];

    for (const id of ids) {
      const nombre = empresas.find((e) => e.id === id)?.nombre ?? "(desconocido)";
      for (const period of periods) {
        const incidents = await listIncidents(id, period);
        const file = path.join(CORPUS_DIR, `${id}-${period}.json`);
        fs.writeFileSync(
          file,
          JSON.stringify({ id, nombre, period, extractedAt: new Date().toISOString(), incidents }, null, 2),
          "utf-8",
        );
        resumen.push({ id, nombre, period, incidentes: incidents.length, archivo: path.relative(process.cwd(), file) });
      }
    }

    return NextResponse.json({ ok: true, total: resumen.reduce((a, r) => a + r.incidentes, 0), resumen });
  }

  return NextResponse.json({ error: "mode inválido (resolve|extract)" }, { status: 400 });
}
