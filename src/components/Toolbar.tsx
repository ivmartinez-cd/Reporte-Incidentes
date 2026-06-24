"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { periodLabel } from "@/lib/format";
import DashboardLoading from "@/app/dashboard/loading";
import styles from "./Toolbar.module.css";

/**
 * Controles del reporte. El CLIENTE ya viene elegido a proposito desde la
 * pantalla de seleccion, por eso aqui solo se muestra (con un acceso para
 * cambiarlo) y se ofrece el cambio de periodo (12 opciones, dropdown valido).
 */
export default function Toolbar({
  empresaId,
  empresaNombre,
  periods,
  selectedPeriod,
}: {
  empresaId: string;
  empresaNombre: string;
  periods: string[];
  selectedPeriod: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  function changePeriod(period: string) {
    const params = new URLSearchParams({ empresa: empresaId, period });
    startTransition(() => router.push(`/dashboard?${params.toString()}`));
  }

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
          onChange={(e) => changePeriod(e.target.value)}
        >
          {periods.map((p) => (
            <option key={p} value={p}>
              {periodLabel(p)}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.status} aria-live="polite">
        {pending && <span className={styles.spinner} aria-hidden />}
        <span className={styles.statusText}>
          {pending ? "Generando reporte…" : "Listo"}
        </span>
      </div>

      {pending && mounted && createPortal(
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          background: "var(--bg-base)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <DashboardLoading />
        </div>,
        document.body
      )}
    </div>
  );
}
