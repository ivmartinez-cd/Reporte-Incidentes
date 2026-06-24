export const UNCLASSIFIED = "Sin Clasificar";

const UNCLASSIFIED_COLOR = "#6b7689";

/** Hash estable nombre→HSL para categorias sin color configurado en la taxonomia. */
function hashColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${Math.abs(hash % 360)}, 60%, 50%)`;
}

/**
 * Color de una categoria. Prioriza el color definido en la taxonomia dinamica
 * (`overrides`, proveniente de `categoriesStore`); si falta, usa gris para
 * "Sin Clasificar" y un HSL estable derivado del nombre para el resto.
 */
export function categoryColor(
  name: string,
  overrides?: Record<string, string>,
): string {
  if (overrides?.[name]) return overrides[name];
  if (!name || name === UNCLASSIFIED) return UNCLASSIFIED_COLOR;
  return hashColor(name);
}
