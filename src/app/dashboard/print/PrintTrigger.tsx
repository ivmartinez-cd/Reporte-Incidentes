"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Componente cliente que dispara automaticamente el cuadro de dialogo de impresion
 * una vez montado y transcurrido un breve delay para permitir el correcto renderizado
 * de los graficos vectoriales de Recharts.
 * 
 * Si se pasa ?auto=0 en la URL, no se dispara el cuadro de impresion (util para desarrollo).
 */
export default function PrintTrigger() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const auto = searchParams.get("auto") !== "0";
    if (auto) {
      const timer = setTimeout(() => {
        window.print();
      }, 1000); // 1 segundo de gracia para asegurar el pintado completo de SVG
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  return null;
}
