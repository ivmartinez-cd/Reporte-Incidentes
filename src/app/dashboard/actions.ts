"use server";

import { redirect } from "next/navigation";
import { clearSessionCookie } from "@/lib/auth/session";
import { config } from "@/lib/config";
import { listIncidents } from "@/lib/soap/incidents";
import { classifyIncidents, caseKeyForCache } from "@/lib/ai/classify";
import { logUsage } from "@/lib/ai/costStore";
import { saveCachedClassifications } from "@/lib/data/classificationCache";
import { getCategories } from "@/lib/data/categoriesStore";
import { invalidateReport } from "@/lib/report";

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}

/**
 * Refinamiento en segundo plano de la clasificacion. La pagina ya se renderizo
 * con el heuristico provisional; esta accion —disparada desde el cliente— si
 * llama a Gemini para los casos no cacheados, persiste el resultado en disco y
 * lo deja listo para el proximo render.
 *
 * `progressed` indica si se clasifico algo nuevo con IA. Si es false (p. ej.
 * Gemini saturado / 503 en todos los modelos), el cliente NO refresca y evita
 * un bucle: se queda con el heuristico y ofrece reintentar.
 */
export async function refineClassificationAction(
  empresaId: string,
  periods: string[],
): Promise<{ progressed: boolean }> {
  // Usa el mismo escalado de limite que buildRangeReport: el mes mas antiguo
  // (periods[0]) recibe el mayor Top para que la ventana del SOAP lo alcance.
  const base = config.soap.testIncidentLimit;
  const total = periods.length;
  let totalCalls = 0;
  for (let i = 0; i < total; i++) {
    const limit = (total - i) * base;
    const raw = await listIncidents(empresaId, periods[i], limit);
    const { usage } = await classifyIncidents(raw);
    logUsage(usage);
    totalCalls += usage.calls;
  }
  return { progressed: totalCalls > 0 };
}

/**
 * Revision manual: el gerente/usuario corrige la tipificacion de un caso (tipico:
 * uno que quedo "Pendiente de revision"). Se valida contra la taxonomia cerrada y
 * se guarda como override en el cache (confianza "alta" => se muestra). El caso
 * queda fijado: futuras cargas usan esta clasificacion.
 */
export async function resolveClassificationAction(
  inc: { descripcion: string; causa?: string; solucion?: string },
  categoria: string,
  subcategoria: string,
  empresaId: string,
  period: string,
): Promise<{ ok: boolean; error?: string }> {
  const cat = getCategories().find((c) => c.name === categoria);
  if (!cat) return { ok: false, error: "categoria invalida" };
  if (!cat.subcategories.includes(subcategoria)) return { ok: false, error: "subcategoria invalida" };
  const key = caseKeyForCache(inc);
  saveCachedClassifications({ [key]: { categoria, subcategoria, confianza: "alta" } });
  // Invalida el reporte cacheado de todos los periodos para esta empresa.
  invalidateReport(empresaId);
  return { ok: true };
}
