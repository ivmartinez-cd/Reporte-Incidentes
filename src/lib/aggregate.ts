import { UNCLASSIFIED } from "@/lib/ai/categories";
import { getCategories } from "@/lib/data/categoriesStore";
import type { IncidentCategory, ReportData } from "@/lib/types";

/**
 * Agregados derivados para los KPIs y graficos del dashboard.
 *
 * Funcion pura sobre el `ReportData` ya construido: separada de la orquestacion
 * con IO (`buildReport`) para poder testearla de forma aislada.
 */
export function summarize(report: ReportData) {
  const categoriesList = getCategories().map((c) => c.name);
  const byCategory = new Map<IncidentCategory, number>();
  for (const c of [...categoriesList, UNCLASSIFIED]) byCategory.set(c, 0);
  for (const inc of report.incidents) {
    const c = inc.categoria ?? UNCLASSIFIED;
    byCategory.set(c, (byCategory.get(c) ?? 0) + 1);
  }

  const categories = [...byCategory.entries()]
    .map(([name, value]) => ({ name, value }))
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value);

  const total = report.incidents.length;
  const topCategory = categories[0]?.name ?? "—";
  const topCategoryCount = categories[0]?.value ?? 0;
  const topCategoryPct = total > 0 ? Math.round((topCategoryCount / total) * 100) : 0;

  // Incidentes por dia del mes (para la serie temporal).
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

  const topSucursal = sucursales[0]?.name ?? "—";
  const topSucursalCount = sucursales[0]?.value ?? 0;

  // Subcategorias por cantidad de incidentes (y su categoria padre asociada).
  const bySubcategory = new Map<string, { count: number; category: string }>();
  for (const inc of report.incidents) {
    const sub = inc.subcategoria?.trim() || "Sin subcategorizar";
    const cat = inc.categoria ?? UNCLASSIFIED;
    const existing = bySubcategory.get(sub);
    if (existing) {
      existing.count++;
    } else {
      bySubcategory.set(sub, { count: 1, category: cat });
    }
  }
  const subcategories = [...bySubcategory.entries()]
    .map(([name, { count, category }]) => ({ name, value: count, category }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  return {
    total,
    topCategory,
    topCategoryCount,
    topCategoryPct,
    topSucursal,
    topSucursalCount,
    categories,
    subcategories,
    timeline,
    sucursales,
  };
}
