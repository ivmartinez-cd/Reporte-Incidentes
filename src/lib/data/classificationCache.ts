import fs from "fs";
import path from "path";

export interface CachedClassification {
  categoria: string;
  subcategoria: string;
}

const filePath = path.join(process.cwd(), "src/lib/data/classification-cache.json");

function readCache(): Record<string, CachedClassification> {
  try {
    if (!fs.existsSync(filePath)) return {};
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as Record<string, CachedClassification>;
  } catch (err) {
    console.error("Error leyendo cache de clasificaciones:", err);
    return {};
  }
}

function writeCache(cache: Record<string, CachedClassification>): void {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(cache, null, 2), "utf-8");
  } catch (err) {
    console.error("Error guardando cache de clasificaciones:", err);
  }
}

export function getCachedClassification(key: string): CachedClassification | null {
  const cache = readCache();
  return cache[key] ?? null;
}

export function saveCachedClassifications(items: Record<string, CachedClassification>): void {
  const cache = readCache();
  let changed = false;
  for (const [key, val] of Object.entries(items)) {
    // Evitamos escribir si ya tiene exactamente la misma clasificacion
    const existing = cache[key];
    if (!existing || existing.categoria !== val.categoria || existing.subcategoria !== val.subcategoria) {
      cache[key] = val;
      changed = true;
    }
  }
  if (changed) {
    writeCache(cache);
  }
}
