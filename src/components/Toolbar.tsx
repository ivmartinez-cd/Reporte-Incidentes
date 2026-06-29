"use client";

import Link from "next/link";
import { periodLabel } from "@/lib/format";
import { useReportNav } from "./reportNav";
import ExportPdfButton from "./ExportPdfButton";
import styles from "./Toolbar.module.css";

const RANGE_PRESETS = [
  { value: 1, label: "1 mes" },
  { value: 3, label: "3 meses" },
  { value: 6, label: "6 meses" },
  { value: 12, label: "1 año" },
] as const;

export default function Toolbar({
  empresaNombre,
  periods,
  selectedPeriod,
  selectedMonths,
}: {
  empresaNombre: string;
  periods: string[];
  selectedPeriod: string;
  selectedMonths: number;
}) {
  const { setPeriod, setMonths, pending } = useReportNav();

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
          Mes de referencia
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
        <span className={styles.label}>Rango</span>
        <div className={styles.presets}>
          {RANGE_PRESETS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className={`${styles.preset} ${selectedMonths === value ? styles.presetActive : ""}`}
              disabled={pending}
              onClick={() => setMonths(value)}
            >
              {label}
            </button>
          ))}
        </div>
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
