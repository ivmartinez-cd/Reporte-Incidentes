"use client";

import { createContext, useContext } from "react";
import type { FilterKey, IncidentFilters } from "@/lib/filters";

/**
 * Contexto de navegacion por filtros del dashboard. Vive en su propio modulo
 * (separado de los componentes que lo proveen/consumen) para que Fast Refresh
 * pueda preservar estado: un archivo que exporta componentes NO debe exportar
 * tambien hooks/constantes, o React fuerza un full reload en cada edicion.
 */
export interface ReportNav {
  filters: IncidentFilters;
  pending: boolean;
  /** Aplica/quita un filtro (toggle): si ya esta ese valor, lo limpia. */
  toggle: (key: FilterKey, value: string) => void;
  /** Fija un filtro a un valor exacto ("" lo limpia). */
  setFilter: (key: FilterKey, value: string) => void;
  /** Cambia el periodo conservando los filtros vigentes. */
  setPeriod: (period: string) => void;
  /** Limpia todos los filtros (mantiene cliente y periodo). */
  clearFilters: () => void;
}

export const ReportNavContext = createContext<ReportNav | null>(null);

/** Hook para que graficos/tabla/toolbar lean y modifiquen los filtros. */
export function useReportNav(): ReportNav {
  const ctx = useContext(ReportNavContext);
  if (!ctx) throw new Error("useReportNav fuera de <DashboardFilterProvider>");
  return ctx;
}
