import type { IncidentCategory } from "@/lib/types";

/**
 * Catálogo de categorías de tipificación. Pensado para ser editable a futuro
 * desde un panel de administración (de ahí que esté centralizado acá).
 */
export const CATEGORIES: IncidentCategory[] = [
  "Atasco Papel",
  "Error de Servicio",
  "Error de Servicio Crítico",
  "Instalación de Cola de Impresión",
  "Software",
  "Usabilidad/Configuración",
  "Error de Insumo",
  "Instalación / Desinstalación",
];

export const UNCLASSIFIED: IncidentCategory = "Sin Clasificar";

/** Color semántico por categoría, alineado a la paleta de marca. */
export const CATEGORY_COLORS: Record<IncidentCategory, string> = {
  "Atasco Papel": "#f0a400",
  "Error de Servicio": "#0275d8",
  "Error de Servicio Crítico": "hsl(348, 83%, 47%)",
  "Instalación de Cola de Impresión": "#014c8c",
  Software: "#7b61ff",
  "Usabilidad/Configuración": "#4dc247",
  "Error de Insumo": "#e8743b",
  "Instalación / Desinstalación": "#2bb6c4",
  "Sin Clasificar": "#6b7689",
};

/** Normaliza la respuesta del modelo a una categoría válida del catálogo. */
export function normalizeCategory(raw: string): IncidentCategory {
  const cleaned = raw.trim().toLowerCase().replace(/[."'`]/g, "");
  const match = CATEGORIES.find(
    (c) => c.toLowerCase() === cleaned || cleaned.includes(c.toLowerCase()),
  );
  return match ?? UNCLASSIFIED;
}
