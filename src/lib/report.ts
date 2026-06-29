import "server-only";
import { config } from "@/lib/config";
import { cacheGet, cacheSet, cacheDeletePrefix } from "@/lib/cache";
import { listEmpresas, listIncidents } from "@/lib/soap/incidents";
import { classifyIncidents } from "@/lib/ai/classify";
import { getCategories } from "@/lib/data/categoriesStore";
import { buildPeriodRange } from "@/lib/format";
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

/** Invalida todos los reportes cacheados de una empresa/periodo (cualquier limit).
 *  Se llama tras una correccion manual para que el proximo render los reconstruya. */
export function invalidateReport(empresaId: string, period?: string): void {
  const prefix = period ? `report:${empresaId}:${period}:` : `report:${empresaId}:`;
  cacheDeletePrefix(prefix);
}

/** Construye un reporte para un rango de N meses terminando en `period`.
 *
 *  El SOAP devuelve los incidentes mas recientes primero y NO filtra por fecha,
 *  por eso el mes mas antiguo del rango necesita un `Top` mayor para que la
 *  ventana lo alcance. Usamos un multiplicador proporcional a la distancia:
 *  el mes mas nuevo usa el limite base, el mas viejo usa base * N.
 */
export async function buildRangeReport(
  empresaId: string,
  period: string,
  months: number,
): Promise<ReportData> {
  if (months <= 1) return buildReport(empresaId, period);

  const periods = buildPeriodRange(period, months);
  // periods[0] = mas antiguo, periods[months-1] = mas nuevo (period de referencia).
  // Para el mes mas antiguo (posicion 0) pedimos months veces el limite base;
  // para el mas nuevo pedimos el limite base sin multiplicar.
  const reports = await Promise.all(
    periods.map((p, i) => buildReport(empresaId, p, (months - i) * config.soap.testIncidentLimit)),
  );
  return {
    empresa: reports[0]!.empresa,
    period,
    incidents: reports.flatMap((r) => r.incidents),
    pending: reports.reduce((s, r) => s + r.pending, 0),
    generatedAt: new Date().toISOString(),
    isMock: reports.some((r) => r.isMock),
  };
}

/** Construye el reporte mensual completo de una empresa (datos + IA + costos).
 *
 *  `limit` controla cuantos incidentes recientes pide al SOAP antes de filtrar
 *  por periodo. Para meses viejos hay que subir el limite porque el SOAP ordena
 *  por fecha descendente y los registros del mes pueden quedar fuera de la ventana.
 */
export async function buildReport(
  empresaId: string,
  period: string,
  limit: number = config.soap.testIncidentLimit,
): Promise<ReportData> {
  const empresas = await listEmpresas();
  const empresa =
    empresas.find((e) => e.id === empresaId) ?? empresas[0] ?? {
      id: empresaId,
      nombre: "—",
    };

  // Incluimos el limit en la clave de cache para que limits distintos (rango vs
  // mes unico) no compartan la misma entrada y devuelvan datos incompletos.
  const key = `report:${empresa.id}:${period}:${limit}:${categoriesVersion()}`;
  const hit = cacheGet<ReportData>(key);
  if (hit) return hit;

  const raw = await listIncidents(empresa.id, period, limit);
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
