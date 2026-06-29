"use client";

import { useState, useMemo, useEffect, Fragment } from "react";
import { categoryColor } from "@/lib/ai/categories";
import { dimensionValue, type FilterKey } from "@/lib/filters";
import { useReportNav } from "./reportNav";
import type { Incident } from "@/lib/types";
import styles from "./IncidentsTable.module.css";

// --- Iconos SVG vectoriales e inlined para detalles premium ---

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`${styles.chevronIcon} ${expanded ? styles.chevronIconExpanded : ""}`}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

import { IncidentDetails, getEstadoStyle } from "./IncidentDetails";

// Truncamiento simple de texto sin desalinear columnas
function truncateText(text?: string, limit = 75): string {
  if (!text || text === "—") return "—";
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}...`;
}


// --- Orden por columna (estado local de la tabla) ---
type SortKey = "numero" | "fecha" | "sucursal" | "causa" | "categoria";
type SortDir = "asc" | "desc";

function sortValue(inc: Incident, key: SortKey): string {
  switch (key) {
    case "numero":
      return inc.numero;
    case "fecha":
      return inc.fecha;
    case "sucursal":
      return dimensionValue(inc, "sucursal");
    case "causa":
      return inc.causa ?? "";
    case "categoria":
      return dimensionValue(inc, "categoria");
  }
}

export default function IncidentsTable({
  incidents,
  limit = 50,
  categoryColors,
  categories,
  empresaId,
  period,
}: {
  incidents: Incident[];
  limit?: number;
  categoryColors?: Record<string, string>;
  categories: { name: string; subcategories: string[] }[];
  empresaId: string;
  period: string;
}) {
  const { filters, toggle, pending } = useReportNav();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir } | null>(null);
  const [page, setPage] = useState(1);

  // Volver a la página 1 cuando cambia la búsqueda, el orden o los incidentes
  useEffect(() => {
    setPage(1);
  }, [query, sort, incidents]);

  // Busqueda + orden son client-side, sobre los incidentes ya filtrados (server)
  // por los filtros transversales. La busqueda no toca la URL (es de la vista).
  const processed = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = incidents;
    if (q) {
      out = out.filter((inc) =>
        [
          inc.numero,
          inc.descripcion,
          inc.causa,
          inc.solucion,
          inc.sucursal,
          inc.tecnico,
          inc.categoria,
          inc.subcategoria,
        ]
          .filter(Boolean)
          .some((f) => (f as string).toLowerCase().includes(q)),
      );
    }
    if (sort) {
      const mult = sort.dir === "asc" ? 1 : -1;
      out = [...out].sort((a, b) => {
        const av = sortValue(a, sort.key);
        const bv = sortValue(b, sort.key);
        if (sort.key === "numero") {
          const an = Number(av);
          const bn = Number(bv);
          if (!Number.isNaN(an) && !Number.isNaN(bn)) return (an - bn) * mult;
        }
        return av.localeCompare(bv, "es", { numeric: true }) * mult;
      });
    }
    return out;
  }, [incidents, query, sort]);

  const totalPages = Math.ceil(processed.length / limit);
  const startIndex = (page - 1) * limit;
  const rows = processed.slice(startIndex, startIndex + limit);

  const toggleRow = (id: string) => {
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedIds(next);
  };

  const expandAll = () => setExpandedIds(new Set(rows.map((r) => r.id)));
  const collapseAll = () => setExpandedIds(new Set());
  const allExpanded = rows.length > 0 && expandedIds.size === rows.length;

  // Cicla el orden de una columna: asc -> desc -> sin orden.
  function cycleSort(key: SortKey) {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  }

  return (
    <div className={`card ${styles.card}`}>
      <div className={styles.head}>
        <div>
          <h3 className={styles.title}>Detalle de Incidentes</h3>
          <span className={styles.meta}>
            Mostrando {rows.length > 0 ? startIndex + 1 : 0} a {Math.min(startIndex + limit, processed.length)} de {processed.length}
            {query && " (búsqueda)"}
          </span>
        </div>
        <div className={styles.actions}>
          <input
            type="search"
            className={styles.search}
            placeholder="Buscar en la tabla…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {allExpanded ? (
            <button onClick={collapseAll} className={styles.globalBtn}>
              Colapsar Todos
            </button>
          ) : (
            <button onClick={expandAll} className={styles.globalBtn}>
              Expandir Todos
            </button>
          )}
        </div>
      </div>

      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.chevronHeader}></th>
              <SortHeader label="Numero" col="numero" sort={sort} onSort={cycleSort} />
              <SortHeader label="Fecha" col="fecha" sort={sort} onSort={cycleSort} />
              <SortHeader label="Sucursal" col="sucursal" sort={sort} onSort={cycleSort} />
              <th>Reporte del cliente</th>
              <SortHeader label="Causa" col="causa" sort={sort} onSort={cycleSort} />
              <th>Solucion (tecnico)</th>
              <SortHeader label="Tipificacion" col="categoria" sort={sort} onSort={cycleSort} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className={styles.emptyRow}>
                  Sin incidentes para los filtros actuales
                </td>
              </tr>
            )}
            {rows.map((inc) => {
              const isExpanded = expandedIds.has(inc.id);
              const categoria = dimensionValue(inc, "categoria");
              const sucursal = dimensionValue(inc, "sucursal");
              const solucion = inc.solucion || "—";
              const estadoEstilo = getEstadoStyle(inc.estado);

              return (
                <Fragment key={inc.id}>
                  <tr className={styles.clickableRow} onClick={() => toggleRow(inc.id)}>
                    <td className={styles.chevronCell}>
                      <button
                        type="button"
                        className={styles.chevronBtn}
                        aria-label={isExpanded ? "Contraer fila" : "Expandir fila"}
                      >
                        <ChevronIcon expanded={isExpanded} />
                      </button>
                    </td>
                    <td className={styles.mono} onClick={(e) => e.stopPropagation()}>
                      <a
                        href={`https://webagentes.canaldirecto.com.ar/incidents/view/${inc.numero}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.link}
                      >
                        {inc.numero}
                      </a>
                    </td>
                    <td className={styles.nowrap}>{inc.fecha}</td>
                    <td>
                      <FilterCell
                        dim="sucursal"
                        value={inc.sucursal ? sucursal : ""}
                        active={filters.sucursal === sucursal}
                        pending={pending}
                        onToggle={toggle}
                      />
                    </td>
                    <td className={styles.desc}>
                      {truncateText(inc.descripcion, 75)}
                    </td>
                    <td className={styles.causa}>{inc.causa ?? "—"}</td>
                    <td className={styles.solucion}>
                      {truncateText(solucion, 75)}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => toggle("categoria", categoria)}
                        className={`${styles.badge} ${styles.badgeBtn} ${filters.categoria === categoria ? styles.badgeActive : ""}`}
                        style={{
                          color: categoryColor(categoria, categoryColors),
                          borderColor: categoryColor(categoria, categoryColors),
                        }}
                        title={filters.categoria === categoria ? "Quitar filtro" : `Filtrar por ${categoria}`}
                      >
                        {categoria}
                      </button>
                      {inc.subcategoria && (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => toggle("subcategoria", inc.subcategoria!.trim())}
                          className={`${styles.subCategoryText} ${styles.subCatBtn} ${filters.subcategoria === inc.subcategoria.trim() ? styles.subCatActive : ""}`}
                          title={`Filtrar por ${inc.subcategoria}`}
                        >
                          {inc.subcategoria}
                        </button>
                      )}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className={styles.expandedRow} onClick={(e) => e.stopPropagation()}>
                      <td colSpan={8} className={styles.detailCellContent}>
                        <IncidentDetails 
                          inc={inc} 
                          categories={categories}
                          empresaId={empresaId}
                          period={period}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            type="button"
            className={styles.pageBtn}
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            Anterior
          </button>
          <span className={styles.pageInfo}>
            Página {page} de {totalPages}
          </span>
          <button
            type="button"
            className={styles.pageBtn}
            disabled={page === totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}

/** Encabezado de columna ordenable: cicla asc/desc/sin orden al tocarlo. */
function SortHeader({
  label,
  col,
  sort,
  onSort,
}: {
  label: string;
  col: SortKey;
  sort: { key: SortKey; dir: SortDir } | null;
  onSort: (key: SortKey) => void;
}) {
  const isActive = sort?.key === col;
  const arrow = !isActive ? "↕" : sort!.dir === "asc" ? "↑" : "↓";
  return (
    <th>
      <button
        type="button"
        className={`${styles.sortBtn} ${isActive ? styles.sortActive : ""}`}
        onClick={() => onSort(col)}
      >
        {label}
        <span className={styles.sortArrow} aria-hidden>
          {arrow}
        </span>
      </button>
    </th>
  );
}

/** Celda que aplica un filtro al tocarla (toggle). Vacia = sin valor. */
function FilterCell({
  dim,
  value,
  active,
  pending,
  onToggle,
}: {
  dim: FilterKey;
  value: string;
  active: boolean;
  pending: boolean;
  onToggle: (key: FilterKey, value: string) => void;
}) {
  if (!value) return <>—</>;
  return (
    <button
      type="button"
      disabled={pending}
      onClick={(e) => {
        e.stopPropagation();
        onToggle(dim, value);
      }}
      className={`${styles.filterCell} ${active ? styles.filterActive : ""}`}
      title={active ? "Quitar filtro" : `Filtrar por ${value}`}
    >
      {value}
    </button>
  );
}
