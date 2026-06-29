import { redirect } from "next/navigation";
import { getEmpresas, buildRangeReport } from "@/lib/report";
import { summarize } from "@/lib/aggregate";
import { filterOptions, sanitizeFilters, applyFilters } from "@/lib/filters";
import { recentPeriods, periodLabel, periodRangeLabel, buildPeriodRange, formatInt } from "@/lib/format";
import { getCategories } from "@/lib/data/categoriesStore";
import {
  DashboardFilterProvider,
  ActiveFilters,
} from "@/components/DashboardFilters";
import Toolbar from "@/components/Toolbar";
import KpiCard from "@/components/KpiCard";
import CategoryDonut from "@/components/charts/CategoryDonut";
import SubcategoryBar from "@/components/charts/SubcategoryBar";
import SucursalBar from "@/components/charts/SucursalBar";
import Timeline from "@/components/charts/Timeline";
import IncidentsTable from "@/components/IncidentsTable";
import ClassificationRefiner from "@/components/ClassificationRefiner";
import RevisionPanel from "@/components/RevisionPanel";
import styles from "./dashboard.module.css";

// El reporte se construye en cada request (datos cacheados aguas abajo).
export const dynamic = "force-dynamic";

const VALID_MONTHS = [1, 3, 6, 12] as const;
type ValidMonths = (typeof VALID_MONTHS)[number];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    empresa?: string;
    period?: string;
    months?: string;
    sucursal?: string;
    categoria?: string;
    subcategoria?: string;
  }>;
}) {
  const sp = await searchParams;
  const empresas = await getEmpresas();
  const periods = recentPeriods(24);

  // Seleccion explicita obligatoria: sin un cliente VALIDO en la URL, volvemos a
  // la pantalla de seleccion (no autoseleccionamos "el primero").
  const empresaId = sp.empresa ?? "";
  if (!empresaId || !empresas.some((e) => e.id === empresaId)) {
    redirect("/seleccion");
  }

  // El periodo si tiene un default natural (el mes mas reciente), no arbitrario.
  const period =
    sp.period && periods.includes(sp.period) ? sp.period : periods[0];

  // Rango en meses: 1 (default), 3, 6 o 12.
  const rawMonths = parseInt(sp.months ?? "1", 10);
  const months: ValidMonths = (VALID_MONTHS as readonly number[]).includes(rawMonths)
    ? (rawMonths as ValidMonths)
    : 1;

  const report = await buildRangeReport(empresaId, period, months);
  const rangePeriods = buildPeriodRange(period, months);

  // Filtros interactivos (sucursal/categoria/subcategoria) que llegan por la URL:
  // se sanean contra las opciones reales del periodo para descartar valores que
  // ya no aplican (p. ej. al cambiar de mes o de cliente).
  const options = filterOptions(report.incidents);
  const filters = sanitizeFilters(
    {
      sucursal: sp.sucursal,
      categoria: sp.categoria,
      subcategoria: sp.subcategoria,
    },
    options,
  );
  const filteredIncidents = applyFilters(report.incidents, filters);

  // Dos vistas de los agregados:
  //  - `full`: el mes completo, para los graficos que actuan de NAVEGADOR
  //    (tocarlos aplica/quita filtros), por eso no deben colapsarse al filtrar.
  //  - `sel`: la SELECCION actual (filtrada), para KPIs, linea de tiempo y tabla.
  const full = summarize(report);
  const sel = summarize({ ...report, incidents: filteredIncidents });

  // Mapa de colores dinamicos derivado de la taxonomia configurable.
  const categoryColors = getCategories().reduce((acc, cat) => {
    acc[cat.name] = cat.color;
    return acc;
  }, {} as Record<string, string>);
  // Casos que el clasificador dejo para revision humana (confianza no alta).
  categoryColors["Pendiente de revision"] = "#9aa0a6";

  return (
    <DashboardFilterProvider
      empresaId={empresaId}
      period={period}
      months={months}
      filters={filters}
    >
      <div className={styles.page}>
        <section className={styles.intro}>
          <div>
            <h1 className={styles.h1}>{report.empresa.nombre}</h1>
            <p className={styles.sub}>
              Reporte de incidentes · {periodRangeLabel(period, months)}
              {report.isMock && (
                <span className={`tag ${styles.mockTag}`}>DATOS DEMO</span>
              )}
            </p>
          </div>
          <Toolbar
            empresaNombre={report.empresa.nombre}
            periods={periods}
            selectedPeriod={period}
            selectedMonths={months}
          />
        </section>

        <ActiveFilters />

        <section className={styles.kpis}>
          <KpiCard
            label="Total Incidentes"
            value={formatInt(sel.total)}
            hint={`en ${periodLabel(period)}`}
            accent="primary"
            delay={0}
          />
          <KpiCard
            label="Categoria Principal"
            value={sel.topCategory}
            hint={sel.total > 0 ? `${sel.topCategoryCount} casos (${sel.topCategoryPct}%)` : "Sin incidentes"}
            accent="accent"
            delay={60}
          />
          <KpiCard
            label="Sucursal Principal"
            value={sel.topSucursal}
            hint={sel.total > 0 ? `${sel.topSucursalCount} incidentes` : "Sin incidentes"}
            accent="primary"
            delay={120}
          />
        </section>

        <section className={styles.mid}>
          <Timeline data={sel.timeline} />
        </section>

        <section className={styles.charts}>
          <CategoryDonut data={full.categories} categoryColors={categoryColors} />
          <SubcategoryBar data={full.subcategories} categoryColors={categoryColors} />
        </section>

        <section className={styles.mid}>
          <SucursalBar data={full.sucursales} />
        </section>

        <section>
          <IncidentsTable 
            incidents={filteredIncidents} 
            categoryColors={categoryColors} 
            categories={getCategories().map((c) => ({ name: c.name, subcategories: c.subcategories }))}
            empresaId={empresaId}
            period={period}
          />
        </section>

        <RevisionPanel
          pendientes={report.incidents
            .filter((i) => i.categoria === "Pendiente de revision")}
          categories={getCategories().map((c) => ({ name: c.name, subcategories: c.subcategories }))}
          empresaId={empresaId}
          period={period}
        />

        <footer className={styles.footer}>
          Generado {new Date(report.generatedAt).toLocaleString("es-AR")} ·
          Canal Directo · Confidencial — Uso exclusivo del Directorio
        </footer>

        <ClassificationRefiner
          empresaId={empresaId}
          periods={rangePeriods}
          pending={report.pending}
        />
      </div>
    </DashboardFilterProvider>
  );
}
