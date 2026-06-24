import { redirect } from "next/navigation";
import { getEmpresas, buildReport } from "@/lib/report";
import { summarize } from "@/lib/aggregate";
import { recentPeriods, periodLabel, formatInt } from "@/lib/format";
import { getCategories } from "@/lib/data/categoriesStore";
import Toolbar from "@/components/Toolbar";
import KpiCard from "@/components/KpiCard";
import CategoryDonut from "@/components/charts/CategoryDonut";
import SubcategoryBar from "@/components/charts/SubcategoryBar";
import SucursalBar from "@/components/charts/SucursalBar";
import Timeline from "@/components/charts/Timeline";
import IncidentsTable from "@/components/IncidentsTable";
import ClassificationRefiner from "@/components/ClassificationRefiner";
import styles from "./dashboard.module.css";

// El reporte se construye en cada request (datos cacheados aguas abajo).
export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ empresa?: string; period?: string }>;
}) {
  const sp = await searchParams;
  const empresas = await getEmpresas();
  const periods = recentPeriods(12);

  // Seleccion explicita obligatoria: sin un cliente VALIDO en la URL, volvemos a
  // la pantalla de seleccion (no autoseleccionamos "el primero").
  const empresaId = sp.empresa ?? "";
  if (!empresaId || !empresas.some((e) => e.id === empresaId)) {
    redirect("/seleccion");
  }

  // El periodo si tiene un default natural (el mes mas reciente), no arbitrario.
  const period =
    sp.period && periods.includes(sp.period) ? sp.period : periods[0];

  const report = await buildReport(empresaId, period);
  const s = summarize(report);

  // Mapa de colores dinamicos derivado de la taxonomia configurable.
  const categoryColors = getCategories().reduce((acc, cat) => {
    acc[cat.name] = cat.color;
    return acc;
  }, {} as Record<string, string>);

  return (
    <div className={styles.page}>
      <section className={styles.intro}>
        <div>
          <h1 className={styles.h1}>{report.empresa.nombre}</h1>
          <p className={styles.sub}>
            Reporte de incidentes · {periodLabel(period)}
            {report.isMock && (
              <span className={`tag ${styles.mockTag}`}>DATOS DEMO</span>
            )}
          </p>
        </div>
        <Toolbar
          empresaId={empresaId}
          empresaNombre={report.empresa.nombre}
          periods={periods}
          selectedPeriod={period}
        />
      </section>

      <section className={styles.kpis}>
        <KpiCard
          label="Total Incidentes"
          value={formatInt(s.total)}
          hint={`en ${periodLabel(period)}`}
          accent="primary"
          delay={0}
        />
        <KpiCard
          label="Categoria Principal"
          value={s.topCategory}
          hint={s.total > 0 ? `${s.topCategoryCount} casos (${s.topCategoryPct}%)` : "Sin incidentes"}
          accent="accent"
          delay={60}
        />
        <KpiCard
          label="Sucursal Principal"
          value={s.topSucursal}
          hint={s.total > 0 ? `${s.topSucursalCount} incidentes` : "Sin incidentes"}
          accent="primary"
          delay={120}
        />
      </section>

      <section className={styles.mid}>
        <Timeline data={s.timeline} />
      </section>

      <section className={styles.charts}>
        <CategoryDonut data={s.categories} categoryColors={categoryColors} />
        <SubcategoryBar data={s.subcategories} categoryColors={categoryColors} />
      </section>

      <section className={styles.mid}>
        <SucursalBar data={s.sucursales} />
      </section>

      <section>
        <IncidentsTable incidents={report.incidents} categoryColors={categoryColors} />
      </section>

      <footer className={styles.footer}>
        Generado {new Date(report.generatedAt).toLocaleString("es-AR")} ·
        Canal Directo · Confidencial — Uso exclusivo del Directorio
      </footer>

      <ClassificationRefiner
        empresaId={empresaId}
        period={period}
        pending={report.pending}
      />
    </div>
  );
}
