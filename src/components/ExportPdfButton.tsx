"use client";

import { useSearchParams } from "next/navigation";
import styles from "./ExportPdfButton.module.css";

/**
 * Boton cliente que abre la ruta de impresion (/dashboard/print) en una pestana
 * nueva. El PDF ejecutivo SIEMPRE exporta el mes completo, asi que solo se
 * transmiten cliente y periodo: los filtros interactivos del dashboard NO se
 * propagan a propocito.
 */
export default function ExportPdfButton() {
  const searchParams = useSearchParams();

  const handleExport = () => {
    const params = new URLSearchParams();
    const empresa = searchParams.get("empresa");
    const period = searchParams.get("period");
    if (empresa) params.set("empresa", empresa);
    if (period) params.set("period", period);
    window.open(`/dashboard/print?${params.toString()}`, "_blank");
  };

  return (
    <button
      type="button"
      className={styles.exportBtn}
      onClick={handleExport}
      title="Exportar Reporte Ejecutivo a PDF"
    >
      <svg
        className={styles.icon}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <span>Exportar PDF</span>
    </button>
  );
}
