import "server-only";
import { config } from "@/lib/config";
import { cacheGet, cacheSet, cacheDelete } from "@/lib/cache";
import { listEmpresas, listIncidents } from "@/lib/soap/incidents";
import { classifyIncidents } from "@/lib/ai/classify";
import { getCategories } from "@/lib/data/categoriesStore";
import type { ReportData } from "@/lib/types";

export async function getEmpresas() {
  return listEmpresas();
}

/**
 * Hash estable de la taxonomia. Cambia al editar categorias/subcategorias (o al
 * aceptar una sugerencia), lo que invalida el reporte cacheado y fuerza una
 * reclasificacion. Mientras la taxonomia no cambie, el reporte se reutiliza.
 */
function categoriesVersion(): string {
  const sig = JSON.stringify(getCategories().map((c) => [c.name, c.subcategories]));
  let h = 0;
  for (let i = 0; i < sig.length; i++) h = (sig.charCodeAt(i) + ((h << 5) - h)) | 0;
  return (h >>> 0).toString(36);
}

/** Invalida el reporte cacheado (en memoria) de una empresa/periodo. Se llama
 *  tras una correccion manual para que el proximo render lo reconstruya. */
export function invalidateReport(empresaId: string, period: string): void {
  cacheDelete(`report:${empresaId}:${period}:${categoriesVersion()}`);
}

/** Construye el reporte mensual completo de una empresa (datos + IA + costos). */
export async function buildReport(
  empresaId: string,
  period: string,
): Promise<ReportData> {
  const empresas = await listEmpresas();
  const empresa =
    empresas.find((e) => e.id === empresaId) ?? empresas[0] ?? {
      id: empresaId,
      nombre: "—",
    };

  // Render rapido: NO bloqueamos la pagina esperando a Gemini. Clasificamos solo
  // desde la cache de disco (useAi:false); lo no cacheado queda con el heuristico
  // provisional y se refina en segundo plano (ver refineClassificationAction).
  //
  // Cacheamos el reporte por empresa+periodo+version de taxonomia SOLO cuando ya
  // esta completamente clasificado por IA (`pending === 0`). Mientras haya
  // pendientes lo dejamos sin cachear: asi, tras el refinamiento, el proximo
  // render lee la cache de disco ya poblada y devuelve la clasificacion de IA.
  const key = `report:${empresa.id}:${period}:${categoriesVersion()}`;
  const hit = cacheGet<ReportData>(key);
  if (hit) return hit;

  const raw = await listIncidents(empresa.id, period);
  const { incidents, pending } = await classifyIncidents(raw, { useAi: false });
  const report: ReportData = {
    empresa,
    period,
    incidents,
    pending,
    generatedAt: new Date().toISOString(),
    isMock: config.useMock,
  };
  if (pending === 0) cacheSet(key, report, config.soap.cacheTtlSeconds);
  return report;
}
