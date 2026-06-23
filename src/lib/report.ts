import "server-only";
import { config } from "@/lib/config";
import { listEmpresas, listIncidents } from "@/lib/soap/incidents";
import { classifyIncidents } from "@/lib/ai/classify";
import { CATEGORIES, UNCLASSIFIED } from "@/lib/ai/categories";
import type { IncidentCategory, ReportData } from "@/lib/types";

export async function getEmpresas() {
  return listEmpresas();
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

  const raw = await listIncidents(empresa.id, period);
  const { incidents, usage } = await classifyIncidents(raw);

  return {
    empresa,
    period,
    incidents,
    generatedAt: new Date().toISOString(),
    aiUsage: usage,
    isMock: config.useMock,
  };
}

/** Agregados derivados para los KPIs y gráficos del dashboard. */
export function summarize(report: ReportData) {
  const byCategory = new Map<IncidentCategory, number>();
  for (const c of [...CATEGORIES, UNCLASSIFIED]) byCategory.set(c, 0);
  for (const inc of report.incidents) {
    const c = inc.categoria ?? UNCLASSIFIED;
    byCategory.set(c, (byCategory.get(c) ?? 0) + 1);
  }

  const categories = [...byCategory.entries()]
    .map(([name, value]) => ({ name, value }))
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value);

  const total = report.incidents.length;
  const costoTotal = report.incidents.reduce((s, i) => s + (i.costo ?? 0), 0);
  const criticos = byCategory.get("Error de Servicio Crítico") ?? 0;
  const topCategory = categories[0]?.name ?? "—";

  // Incidentes por día del mes (para la serie temporal).
  const byDay = new Map<string, number>();
  for (const inc of report.incidents) {
    byDay.set(inc.fecha, (byDay.get(inc.fecha) ?? 0) + 1);
  }
  const timeline = [...byDay.entries()]
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Top sucursales por cantidad de incidentes.
  const bySucursal = new Map<string, number>();
  for (const inc of report.incidents) {
    const s = inc.sucursal ?? "—";
    bySucursal.set(s, (bySucursal.get(s) ?? 0) + 1);
  }
  const sucursales = [...bySucursal.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  return {
    total,
    costoTotal,
    criticos,
    topCategory,
    categories,
    timeline,
    sucursales,
  };
}
