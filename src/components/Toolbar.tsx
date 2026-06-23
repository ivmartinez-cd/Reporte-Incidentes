"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { Empresa } from "@/lib/types";
import { periodLabel } from "@/lib/format";
import styles from "./Toolbar.module.css";

export default function Toolbar({
  empresas,
  periods,
  selectedEmpresa,
  selectedPeriod,
}: {
  empresas: Empresa[];
  periods: string[];
  selectedEmpresa: string;
  selectedPeriod: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function update(next: { empresa?: string; period?: string }) {
    const params = new URLSearchParams({
      empresa: next.empresa ?? selectedEmpresa,
      period: next.period ?? selectedPeriod,
    });
    startTransition(() => router.push(`/dashboard?${params.toString()}`));
  }

  return (
    <div className={`${styles.bar} glass`}>
      <div className={styles.field}>
        <label className={styles.label}>Cliente</label>
        <select
          className="select"
          value={selectedEmpresa}
          onChange={(e) => update({ empresa: e.target.value })}
        >
          {empresas.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Período</label>
        <select
          className="select"
          value={selectedPeriod}
          onChange={(e) => update({ period: e.target.value })}
        >
          {periods.map((p) => (
            <option key={p} value={p}>
              {periodLabel(p)}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.status}>
        {pending && <span className={styles.spinner} aria-hidden />}
        <span className={styles.statusText}>
          {pending ? "Generando reporte…" : "Listo"}
        </span>
      </div>
    </div>
  );
}
