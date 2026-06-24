// Fase 4 - paso 1: parte el gold en few-shot (ejemplos para el prompt) y test
// (medicion). Estratificado por subcategoria, determinista. NO usa API.
//   node scripts/split-gold.mjs
import fs from "fs";
import path from "path";

const DIR = "data/corpus";
const input = JSON.parse(fs.readFileSync(path.join(DIR, "_label-input.json"), "utf-8"));
const labels = JSON.parse(fs.readFileSync(path.join(DIR, "_labels.json"), "utf-8"));
const byId = Object.fromEntries(input.map((c) => [c.id, c]));

// Orden determinista por id para reproducibilidad.
const ids = Object.keys(labels).sort();
const confRank = { alta: 0, media: 1, baja: 2 };

// Agrupar por subcategoria
const bySub = {};
for (const id of ids) {
  const l = labels[id];
  (bySub[`${l.cat} > ${l.sub}`] ??= []).push(id);
}

const MAX_PER_SUB = 2; // ejemplos few-shot por subcategoria
const fewshotIds = new Set();
for (const [, list] of Object.entries(bySub)) {
  // priorizar alta confianza como ejemplos
  const sorted = [...list].sort((a, b) => confRank[labels[a].conf] - confRank[labels[b].conf]);
  for (const id of sorted.slice(0, MAX_PER_SUB)) fewshotIds.add(id);
}

const mk = (id) => ({
  id,
  cliente: byId[id].cliente,
  fallas: byId[id].fallas,
  observ: byId[id].observ,
  causa: byId[id].causa,
  solucion: byId[id].solucion,
  cat: labels[id].cat,
  sub: labels[id].sub,
});

const fewshot = [...fewshotIds].map(mk);
const test = ids.filter((id) => !fewshotIds.has(id)).map(mk);

fs.writeFileSync(path.join(DIR, "_fewshot.json"), JSON.stringify(fewshot, null, 1), "utf-8");
fs.writeFileSync(path.join(DIR, "_test.json"), JSON.stringify(test, null, 1), "utf-8");

console.log(`Subcategorias cubiertas en few-shot: ${Object.keys(bySub).length}`);
console.log(`few-shot: ${fewshot.length}  |  test: ${test.length}`);
const dist = {};
for (const t of test) dist[t.cat] = (dist[t.cat] || 0) + 1;
console.log("Distribucion del test:");
Object.entries(dist).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log("  " + String(v).padStart(3) + "  " + k));
