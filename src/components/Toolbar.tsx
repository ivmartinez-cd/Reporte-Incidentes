"use client";

import Link from "next/link";
import { periodLabel } from "@/lib/format";
import { useReportNav } from "./reportNav";
import ExportPdfButton from "./ExportPdfButton";
import styles from "./Toolbar.module.css";

/**
 * Controles base del reporte. El CLIENTE viene elegido desde la pantalla de
 * seleccion (aqui solo se muestra, con acceso para cambiarlo) y se ofrece el
 * cambio de periodo. Los filtros transversales NO viven aqui: se aplican de
 * forma interactiva tocando los graficos o la tabla (ver useReportNav) y se
 * muestran como chips (ver ActiveFilters).
 */
export default function Toolbar({
  empresaNombre,
  periods,
  selectedPeriod,
}: {
  empresaNombre: string;
  periods: string[];
  selectedPeriod: string;
}) {
  const { setPeriod, pending } = useReportNav();

  return (
    <div className={`${styles.bar} glass`}>
      <div className={styles.field}>
        <span className={styles.label}>Cliente</span>
        <div className={styles.client}>
          <strong className={styles.clientName} title={empresaNombre}>
            {empresaNombre}
          </strong>
          <Link href="/seleccion" className={styles.change}>
            Cambiar
          </Link>
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="period-select">
          Periodo
        </label>
        <select
          id="period-select"
          className="select"
          value={selectedPeriod}
          disabled={pending}
          onChange={(e) => setPeriod(e.target.value)}
        >
          {periods.map((p) => (
            <option key={p} value={p}>
              {periodLabel(p)}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Reporte</span>
        <ExportPdfButton />
      </div>

      <div className={styles.status} aria-live="polite">
        {pending && <span className={styles.spinner} aria-hidden />}
        <span className={styles.statusText}>
          {pending ? "Generando reporte…" : "Listo"}
        </span>
      </div>
    </div>
  );
}
