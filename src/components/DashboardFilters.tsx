"use client";

import { useTransition, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import DashboardLoading from "@/app/dashboard/loading";
import { hasActiveFilters, type FilterKey, type IncidentFilters } from "@/lib/filters";
import { ReportNavContext, useReportNav, type ReportNav } from "./reportNav";
import styles from "./DashboardFilters.module.css";

/**
 * Provee la navegacion por filtros a todo el dashboard. La URL es la unica
 * fuente de verdad (reporte compartible); aqui se construye de forma canonica a
 * partir de los valores ya saneados en el server. Tambien centraliza el overlay
 * de carga para que toda interaccion (periodo, click en grafico o en la tabla)
 * de el mismo feedback.
 */
export function DashboardFilterProvider({
  empresaId,
  period,
  filters,
  children,
}: {
  empresaId: string;
  period: string;
  filters: IncidentFilters;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  // `heavy` distingue un cambio de contexto real (periodo/cliente) de un simple
  // toggle de filtro. Solo el primero justifica el overlay de pantalla completa;
  // el filtrado mantiene el contenido visible y se actualiza en el lugar.
  const [heavy, setHeavy] = useState(false);
  useEffect(() => setMounted(true), []);

  function navigate(
    patch: Partial<IncidentFilters & { period: string }>,
    isHeavy = false,
  ) {
    const next = { period, ...filters, ...patch };
    const params = new URLSearchParams({ empresa: empresaId, period: next.period });
    if (next.sucursal) params.set("sucursal", next.sucursal);
    if (next.categoria) params.set("categoria", next.categoria);
    if (next.subcategoria) params.set("subcategoria", next.subcategoria);
    setHeavy(isHeavy);
    // `scroll: false` en el filtrado: mantiene la posicion del usuario (tocar un
    // grafico no debe saltar al tope). El cambio de periodo si va al tope (de
    // todas formas lo tapa el overlay).
    startTransition(() =>
      router.push(`/dashboard?${params.toString()}`, { scroll: isHeavy }),
    );
  }

  const value: ReportNav = {
    filters,
    pending,
    setFilter: (key, val) => navigate({ [key]: val }),
    toggle: (key, val) => navigate({ [key]: filters[key] === val ? "" : val }),
    setPeriod: (p) => navigate({ period: p }, true),
    clearFilters: () =>
      navigate({ sucursal: "", categoria: "", subcategoria: "" }),
  };

  return (
    <ReportNavContext.Provider value={value}>
      {/* Barra de progreso sutil para el filtrado: feedback sin tapar la vista. */}
      {pending && !heavy && <div className={styles.progress} aria-hidden />}
      {children}
      {pending && heavy && mounted &&
        createPortal(
          <div className={styles.overlay}>
            <DashboardLoading />
          </div>,
          document.body,
        )}
    </ReportNavContext.Provider>
  );
}

const FILTER_LABELS: Record<FilterKey, string> = {
  sucursal: "Sucursal",
  categoria: "Categoria",
  subcategoria: "Subcategoria",
};

/** Barra de chips con los filtros activos; cada chip se quita con la ×. */
export function ActiveFilters() {
  const { filters, pending, setFilter, clearFilters } = useReportNav();
  if (!hasActiveFilters(filters)) return null;

  const active = (Object.keys(FILTER_LABELS) as FilterKey[]).filter(
    (k) => filters[k],
  );

  return (
    <div className={styles.chips} aria-label="Filtros activos">
      <span className={styles.chipsLabel}>Filtrado por</span>
      {active.map((key) => (
        <button
          key={key}
          type="button"
          className={styles.chip}
          disabled={pending}
          onClick={() => setFilter(key, "")}
          title={`Quitar filtro de ${FILTER_LABELS[key]}`}
        >
          <span className={styles.chipKey}>{FILTER_LABELS[key]}:</span>
          <span className={styles.chipVal}>{filters[key]}</span>
          <span className={styles.chipX} aria-hidden>
            ×
          </span>
        </button>
      ))}
      {active.length > 1 && (
        <button
          type="button"
          className={styles.clearAll}
          disabled={pending}
          onClick={clearFilters}
        >
          Limpiar todo
        </button>
      )}
    </div>
  );
}
