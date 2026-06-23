import { getEmpresas, buildReport, summarize } from "@/lib/report";
import { recentPeriods, periodLabel, formatInt, formatArs } from "@/lib/format";
import Toolbar from "@/components/Toolbar";
import KpiCard from "@/components/KpiCard";
import AiCostWidget from "@/components/AiCostWidget";
import CategoryDonut from "@/components/charts/CategoryDonut";
import SucursalBar from "@/components/charts/SucursalBar";
import Timeline from "@/components/charts/Timeline";
import IncidentsTable from "@/components/IncidentsTable";
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

  const empresaId = sp.empresa ?? empresas[0]?.id ?? "";
  const period =
    sp.period && periods.includes(sp.period) ? sp.period : periods[0];

  const report = await buildReport(empresaId, period);
  const s = summarize(report);

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
          empresas={empresas}
          periods={periods}
          selectedEmpresa={empresaId}
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
          label="Tipo más Común"
          value={s.topCategory}
          hint="categoría líder (IA)"
          accent="accent"
          delay={60}
        />
        <KpiCard
          label="Incidentes Críticos"
          value={formatInt(s.criticos)}
          hint="Error de Servicio Crítico"
          accent="danger"
          delay={120}
        />
        <KpiCard
          label="Costo Operativo"
          value={formatArs(s.costoTotal)}
          hint="suma de costos del período"
          accent="success"
          delay={180}
        />
      </section>

      <section className={styles.mid}>
        <CategoryDonut data={s.categories} />
        <AiCostWidget usage={report.aiUsage} />
      </section>

      <section className={styles.charts}>
        <Timeline data={s.timeline} />
        <SucursalBar data={s.sucursales} />
      </section>

      <section>
        <IncidentsTable incidents={report.incidents} />
      </section>

      <footer className={styles.footer}>
        Generado {new Date(report.generatedAt).toLocaleString("es-AR")} ·
        Canal Directo · Confidencial — Uso exclusivo del Directorio
      </footer>
    </div>
  );
}
