import { redirect } from "next/navigation";
import { getEmpresas, buildReport } from "@/lib/report";
import { summarize } from "@/lib/aggregate";
import { EMPTY_FILTERS } from "@/lib/filters";
import { recentPeriods, periodLabel, formatInt } from "@/lib/format";
import { getCategories } from "@/lib/data/categoriesStore";
import { categoryColor, UNCLASSIFIED } from "@/lib/ai/categories";
import { DashboardFilterProvider } from "@/components/DashboardFilters";
import CategoryDonut from "@/components/charts/CategoryDonut";
import SubcategoryBar from "@/components/charts/SubcategoryBar";
import SucursalBar from "@/components/charts/SucursalBar";
import Timeline from "@/components/charts/Timeline";
import PrintTrigger from "./PrintTrigger";
import styles from "./print.module.css";

export const dynamic = "force-dynamic";

/**
 * Vista de impresion del reporte ejecutivo. Por decision de producto SIEMPRE
 * exporta el MES COMPLETO del cliente: ignora los filtros interactivos del
 * dashboard (sucursal/categoria/subcategoria). El boton de exportar solo
 * transmite cliente y periodo.
 */
export default async function PrintPage({
  searchParams,
}: {
  searchParams: Promise<{ empresa?: string; period?: string }>;
}) {
  const sp = await searchParams;
  const empresas = await getEmpresas();
  const periods = recentPeriods(12);

  const empresaId = sp.empresa ?? "";
  if (!empresaId || !empresas.some((e) => e.id === empresaId)) {
    redirect("/seleccion");
  }

  const period =
    sp.period && periods.includes(sp.period) ? sp.period : periods[0];

  const report = await buildReport(empresaId, period);

  // Mes completo, sin filtrar: los agregados salen del reporte tal cual.
  const s = summarize(report);

  const categoryColors = getCategories().reduce((acc, cat) => {
    acc[cat.name] = cat.color;
    return acc;
  }, {} as Record<string, string>);
  categoryColors["Pendiente de revision"] = "#9aa0a6";

  const topIncidents = report.incidents.slice(0, 50);

  return (
    <DashboardFilterProvider
      empresaId={empresaId}
      period={period}
      filters={EMPTY_FILTERS}
    >
      <div className={`printView ${styles.printPage}`}>
        {/* Encabezado Principal */}
        <header className={styles.header}>
          <div className={styles.titleGroup}>
            <h1 className={styles.title}>Reporte de Incidentes</h1>
            <h2 className={styles.subtitle}>{report.empresa.nombre}</h2>
            <div className={styles.metaRow}>
              <span>Periodo: <strong>{periodLabel(period)}</strong></span>
              <span className={styles.dotDivider}>·</span>
              <span>Generado {new Date(report.generatedAt).toLocaleDateString("es-AR")}</span>
              {report.isMock && (
                <>
                  <span className={styles.dotDivider}>·</span>
                  <span className={styles.demoBadge}>DATOS DEMO</span>
                </>
              )}
            </div>
          </div>
          <div className={styles.logoContainer}>
            {/* Logo naranja de marca: se ve bien sobre el blanco del PDF, sin
                fondo. <img> plano (no next/image) para que pinte de inmediato. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={styles.logo}
              src="/logo_login.png"
              alt="Canal Directo"
              width={160}
              height={36}
            />
          </div>
        </header>

        {/* Seccion KPIs */}
        <section className={styles.kpis}>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Total Incidentes</span>
            <span className={styles.kpiValue}>{formatInt(s.total)}</span>
            <span className={styles.kpiHint}>en {periodLabel(period)}</span>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Categoria Principal</span>
            <span className={styles.kpiValue}>{s.topCategory}</span>
            <span className={styles.kpiHint}>
              {s.total > 0 ? `${s.topCategoryCount} casos (${s.topCategoryPct}%)` : "Sin incidentes"}
            </span>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Sucursal Principal</span>
            <span className={styles.kpiValue}>{s.topSucursal}</span>
            <span className={styles.kpiHint}>
              {s.total > 0 ? `${s.topSucursalCount} incidentes` : "Sin incidentes"}
            </span>
          </div>
        </section>

        {/* Evolucion diaria del mes. Altura FIJA: en impresion el
            ResponsiveContainer de Recharts colapsa si la altura no es
            determinista, por eso se la pasamos explicita. */}
        <section className={styles.timelineSection}>
          <Timeline data={s.timeline} height={200} />
        </section>

        {/* Distribucion por categoria */}
        <section className={styles.timelineSection}>
          <CategoryDonut data={s.categories} categoryColors={categoryColors} height={240} />
        </section>

        {/* Distribucion por subcategoria */}
        <section className={styles.timelineSection}>
          <SubcategoryBar data={s.subcategories} categoryColors={categoryColors} height={280} yAxisWidth={240} isPrint={true} />
        </section>

        {/* Sucursales */}
        <section className={styles.lastChartSection}>
          <SucursalBar data={s.sucursales} height={240} />
        </section>

        {/* Tabla de Detalle de Incidentes (Top 50) */}
        <section className={`${styles.tableSection} ${styles.pageBreakBefore}`}>
          <h2 className={styles.tableSectionTitle}>Detalle de Incidentes (Top 50)</h2>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Numero</th>
                  <th>Fecha</th>
                  <th>Sucursal</th>
                  <th>Tarea Realizada</th>
                  <th>Tipificacion</th>
                </tr>
              </thead>
              <tbody>
                {topIncidents.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "1rem" }}>
                      Sin incidentes en el periodo
                    </td>
                  </tr>
                ) : (
                  topIncidents.map((inc) => {
                    const categoria = inc.categoria ?? UNCLASSIFIED;
                    return (
                      <tr key={inc.id}>
                        <td className={styles.tableNumber}>{inc.numero}</td>
                        <td className={styles.tableDate}>{inc.fecha}</td>
                        <td>{inc.sucursal || "—"}</td>
                        <td className={styles.tableDesc}>
                          {inc.solucion || "—"}
                        </td>
                        <td>
                          <span
                            className={styles.tableBadge}
                            style={{ color: categoryColor(categoria, categoryColors) }}
                          >
                            {categoria}
                          </span>
                          {inc.subcategoria && (
                            <span className={styles.tableSubcat}>
                              {inc.subcategoria.trim()}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {report.incidents.length > 50 && (
            <p className={styles.tableFooterNote}>
              * Mostrando los primeros 50 incidentes de un total de {report.incidents.length} para el periodo.
            </p>
          )}
        </section>

        {/* Pie de Pagina de Impresion */}
        <footer className={styles.footer}>
          <span>Canal Directo · Confidencial — Uso exclusivo del Directorio</span>
          <span className={styles.pageNumber}></span>
        </footer>

        {/* Disparador de Impresion */}
        <PrintTrigger />
      </div>
    </DashboardFilterProvider>
  );
}
