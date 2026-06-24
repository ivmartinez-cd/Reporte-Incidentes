import { UNCLASSIFIED } from "@/lib/ai/categories";
import type { Incident } from "@/lib/types";

/** Etiqueta para incidentes sin subcategoria (mirror de aggregate.ts). */
export const SIN_SUBCATEGORIA = "Sin subcategorizar";

/**
 * Filtros transversales del reporte. Se aplican sobre el set de incidentes ya
 * construido (post-IA) para re-escopar KPIs y tabla sin volver a pegarle al SOAP
 * ni a Gemini. Los graficos siguen mostrando el mes completo (son el navegador).
 * Valores vacios = "sin filtro".
 */
export interface IncidentFilters {
  sucursal: string;
  categoria: string;
  subcategoria: string;
}

export const EMPTY_FILTERS: IncidentFilters = {
  sucursal: "",
  categoria: "",
  subcategoria: "",
};

/** Dimension de un incidente sobre la que se puede filtrar. */
export type FilterKey = keyof IncidentFilters;

export interface FilterOption {
  value: string;
  count: number;
}

export interface FilterOptions {
  sucursales: FilterOption[];
  categorias: FilterOption[];
  subcategorias: FilterOption[];
}

/** Valor normalizado de cada dimension para un incidente. */
export function dimensionValue(inc: Incident, key: FilterKey): string {
  switch (key) {
    case "sucursal":
      return (inc.sucursal ?? "").trim();
    case "categoria":
      return (inc.categoria ?? UNCLASSIFIED).trim();
    case "subcategoria":
      return inc.subcategoria?.trim() || SIN_SUBCATEGORIA;
  }
}

/** Cuenta valores distintos de una dimension, descartando vacios. */
function tally(incidents: Incident[], key: FilterKey): FilterOption[] {
  const counts = new Map<string, number>();
  for (const inc of incidents) {
    const value = dimensionValue(inc, key);
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, "es"));
}

/**
 * Opciones disponibles para cada filtro, derivadas SIEMPRE del set completo de
 * incidentes del periodo. Se usan para sanear los filtros de la URL y para
 * mostrar conteos.
 */
export function filterOptions(incidents: Incident[]): FilterOptions {
  return {
    sucursales: tally(incidents, "sucursal"),
    categorias: tally(incidents, "categoria"),
    subcategorias: tally(incidents, "subcategoria"),
  };
}

/**
 * Normaliza los filtros crudos de la URL: solo conserva un valor si existe entre
 * las opciones reales del periodo. Asi un filtro que dejo de aplicar (p. ej. al
 * cambiar de mes o de cliente) se descarta solo en vez de mostrar un set vacio.
 */
export function sanitizeFilters(
  raw: Partial<IncidentFilters>,
  options: FilterOptions,
): IncidentFilters {
  const keep = (value: string | undefined, opts: FilterOption[]) =>
    value && opts.some((o) => o.value === value) ? value : "";
  return {
    sucursal: keep(raw.sucursal, options.sucursales),
    categoria: keep(raw.categoria, options.categorias),
    subcategoria: keep(raw.subcategoria, options.subcategorias),
  };
}

/** Aplica los filtros activos. Un filtro vacio no restringe. */
export function applyFilters(
  incidents: Incident[],
  filters: IncidentFilters,
): Incident[] {
  return incidents.filter((inc) => {
    if (filters.sucursal && dimensionValue(inc, "sucursal") !== filters.sucursal)
      return false;
    if (
      filters.categoria &&
      dimensionValue(inc, "categoria") !== filters.categoria
    )
      return false;
    if (
      filters.subcategoria &&
      dimensionValue(inc, "subcategoria") !== filters.subcategoria
    )
      return false;
    return true;
  });
}

/** true si hay al menos un filtro activo. */
export function hasActiveFilters(filters: IncidentFilters): boolean {
  return Boolean(filters.sucursal || filters.categoria || filters.subcategoria);
}
