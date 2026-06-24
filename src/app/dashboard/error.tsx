"use client";

import Link from "next/link";
import { useEffect } from "react";
import styles from "./error.module.css";

/**
 * Estado de error del reporte. Si falla la carga (SOAP/IA), mostramos una
 * salida clara con recuperacion (reintentar) en vez de una pantalla rota.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard] error al generar el reporte:", error);
  }, [error]);

  return (
    <div className={styles.wrap} role="alert">
      <div className={`card ${styles.card} rise`}>
        <span className={styles.icon} aria-hidden>
          ⚠️
        </span>
        <h1 className={styles.title}>No pudimos generar el reporte</h1>
        <p className={styles.lead}>
          Hubo un problema al traer o procesar los incidentes. Puede ser una
          demora del servicio. Proba de nuevo en unos segundos.
        </p>
        <div className={styles.actions}>
          <button type="button" className="btn btn-primary" onClick={reset}>
            Reintentar
          </button>
          <Link href="/seleccion" className="btn btn-ghost">
            Elegir otro cliente
          </Link>
        </div>
      </div>
    </div>
  );
}
