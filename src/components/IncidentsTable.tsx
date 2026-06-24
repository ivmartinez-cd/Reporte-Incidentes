"use client";

import { useState, useMemo, Fragment } from "react";
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

function UserIcon() {
  return (
    <svg className={styles.metaIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function TechIcon() {
  return (
    <svg className={styles.metaIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function DeviceIcon() {
  return (
    <svg className={styles.metaIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0a2 2 0 10-4 0 2 2 0 004 0zm-8-8a2 2 0 11-4 0 2 2 0 014 0zM4 6h16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className={styles.metaIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function WorkTypeIcon() {
  return (
    <svg className={styles.metaIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  );
}

// Truncamiento simple de texto sin desalinear columnas
function truncateText(text?: string, limit = 75): string {
  if (!text || text === "—") return "—";
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}...`;
}

// Determina los colores de los badges de estado
function getEstadoStyle(estado?: string) {
  const e = (estado ?? "").toLowerCase();
  if (e === "resuelto" || e === "cerrado") {
    return { color: "var(--success)", borderColor: "var(--success)" };
  }
  if (e === "abierto") {
    return { color: "var(--primary)", borderColor: "var(--primary)" };
  }
  return { color: "var(--warning)", borderColor: "var(--warning)" };
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
}: {
  incidents: Incident[];
  limit?: number;
  categoryColors?: Record<string, string>;
}) {
  const { filters, toggle, pending } = useReportNav();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir } | null>(null);

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

  const rows = processed.slice(0, limit);

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
            Mostrando {rows.length} de {incidents.length}
            {query && " (busqueda)"}
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
                        <div className={styles.detailContent}>
                          <div className={styles.detailGrid}>

                            {/* Columna Izquierda: Informacion de Gestion */}
                            <div className={styles.detailMeta}>
                              <h4 className={styles.detailSectionTitle}>Detalles de Gestion</h4>

                              <div className={styles.metaItem}>
                                <span className={styles.metaLabel}>Estado</span>
                                <span
                                  className={styles.estadoBadge}
                                  style={{
                                    color: estadoEstilo.color,
                                    borderColor: estadoEstilo.borderColor,
                                  }}
                                >
                                  {inc.estado ?? "—"}
                                </span>
                              </div>

                              <div className={styles.metaItem}>
                                <div>
                                  <span className={styles.metaLabel}>Categoria / Subcategoria</span>
                                  <span className={styles.metaValue}>
                                    {categoria} {inc.subcategoria ? `· ${inc.subcategoria}` : ""}
                                  </span>
                                </div>
                              </div>

                              <div className={styles.metaItem}>
                                <UserIcon />
                                <div>
                                  <span className={styles.metaLabel}>Solicitante</span>
                                  <span className={styles.metaValue}>{inc.solicitante ?? "No especificado"}</span>
                                </div>
                              </div>

                              <div className={styles.metaItem}>
                                <TechIcon />
                                <div>
                                  <span className={styles.metaLabel}>Tecnico Asignado</span>
                                  <span className={styles.metaValue}>{inc.tecnico ?? "No asignado"}</span>
                                </div>
                              </div>

                              <div className={styles.metaItem}>
                                <WorkTypeIcon />
                                <div>
                                  <span className={styles.metaLabel}>Tipo de Trabajo</span>
                                  <span className={styles.metaValue}>{inc.tipoTrabajo ?? "Correctivo"}</span>
                                </div>
                              </div>

                              <div className={styles.metaItem}>
                                <DeviceIcon />
                                <div>
                                  <span className={styles.metaLabel}>Dispositivo</span>
                                  <span className={styles.metaValue}>
                                    {inc.articulo ?? "Impresora"}
                                    {inc.maquina && <span className={styles.serial}> (S/N: {inc.maquina})</span>}
                                  </span>
                                </div>
                              </div>

                              <div className={styles.metaItem}>
                                <CalendarIcon />
                                <div>
                                  <span className={styles.metaLabel}>Fechas del Caso</span>
                                  <span className={styles.metaValue}>
                                    Apertura: {inc.fecha}
                                    {inc.fechaCierre && <span><br />Resolucion: {inc.fechaCierre}</span>}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Columna Derecha: Trabajos Realizados y Reporte */}
                            <div className={styles.detailSection}>
                              <div className={styles.textBlock}>
                                <h4 className={styles.detailSectionTitle}>Reporte del Cliente</h4>
                                <p className={styles.fullText}>{inc.descripcion}</p>
                              </div>

                              {inc.causa && (
                                <div className={styles.textBlock}>
                                  <h4 className={styles.detailSectionTitle}>Causa Diagnosticada</h4>
                                  <p className={styles.causaText}>{inc.causa}</p>
                                </div>
                              )}

                              <div className={styles.textBlock}>
                                <h4 className={styles.detailSectionTitle}>Historial de Trabajos (Bitacora)</h4>
                                {inc.trabajos && inc.trabajos.length > 0 ? (
                                  <div className={styles.timeline}>
                                    {inc.trabajos.map((trabajo, idx) => (
                                      <div key={idx} className={styles.timelineItem}>
                                        <div className={styles.timelineLine}></div>
                                        <div className={styles.timelineBadge}></div>
                                        <div className={styles.timelineContent}>
                                          <p className={styles.timelineDesc}>{trabajo.descripcion}</p>
                                          {trabajo.observ && (
                                            <span className={styles.timelineObserv}>
                                              <strong>Obs:</strong> {trabajo.observ}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className={styles.fallbackSolucion}>
                                    <p className={styles.fullText}>{solucion}</p>
                                  </div>
                                )}
                              </div>
                            </div>

                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
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
