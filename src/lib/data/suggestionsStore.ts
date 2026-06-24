import fs from "fs";
import path from "path";

/**
 * Bandeja de sugerencias de subcategorias propuestas por la IA cuando ningun
 * elemento de la taxonomia configurada encaja. NUNCA entran a los datos/graficos
 * por su cuenta: quedan aca hasta que un humano las aprueba (las agrega a la
 * categoria) o las descarta desde el modal de Configuracion.
 */
export interface SubcategorySuggestion {
  categoria: string;
  name: string;
  count: number;
  updatedAt: number;
}

const filePath = path.join(process.cwd(), "src/lib/data/subcategory-suggestions.json");

function read(): SubcategorySuggestion[] {
  try {
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as SubcategorySuggestion[];
  } catch (err) {
    console.error("Error leyendo sugerencias de subcategorias:", err);
    return [];
  }
}

function write(list: SubcategorySuggestion[]): void {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(list, null, 2), "utf-8");
  } catch (err) {
    console.error("Error guardando sugerencias de subcategorias:", err);
  }
}

export function getSuggestions(): SubcategorySuggestion[] {
  return read().sort((a, b) => b.count - a.count);
}

/**
 * Inserta/actualiza las sugerencias detectadas en una corrida de clasificacion.
 * Sobrescribe el contador (no acumula entre corridas) para evitar inflarlo al
 * regenerar el mismo reporte.
 */
export function recordSuggestions(
  items: { categoria: string; name: string; count: number }[],
): void {
  if (!items.length) return;
  const list = read();
  for (const it of items) {
    const name = it.name.trim();
    if (!name) continue;
    const idx = list.findIndex(
      (s) => s.categoria === it.categoria && s.name.toLowerCase() === name.toLowerCase(),
    );
    if (idx >= 0) {
      list[idx].count = it.count;
      list[idx].updatedAt = Date.now();
    } else {
      list.push({ categoria: it.categoria, name, count: it.count, updatedAt: Date.now() });
    }
  }
  write(list);
}

export function removeSuggestion(categoria: string, name: string): void {
  write(
    read().filter(
      (s) => !(s.categoria === categoria && s.name.toLowerCase() === name.toLowerCase()),
    ),
  );
}
