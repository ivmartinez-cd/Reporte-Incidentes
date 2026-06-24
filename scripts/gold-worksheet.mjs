// Fase 2 (cobertura) + Fase 3 (planilla de etiquetado del gold set).
// Lee el corpus offline (data/corpus/*.json), NO toca SOAP ni API.
//   node scripts/gold-worksheet.mjs
import fs from "fs";
import path from "path";

const DIR = "data/corpus";
let all = [];
for (const f of fs.readdirSync(DIR).filter((f) => f.endsWith(".json"))) {
  const j = JSON.parse(fs.readFileSync(path.join(DIR, f), "utf-8"));
  all = all.concat(j.incidents.map((i) => ({ ...i, _cliente: j.nombre, _period: j.period })));
}

const field = (desc, label) => {
  const m = (desc || "").match(new RegExp(label + ":\\s*([^]*?)(?:\\.\\s*[A-Z][a-z]+:|$)", "i"));
  return m ? m[1].replace(/\s+/g, " ").trim() : "";
};
const fallas = (i) => field(i.descripcion, "Fallas") || (i.descripcion || "").split("—")[0].trim();
const observ = (i) => field(i.descripcion, "Observaciones");

// ---------- (1) COBERTURA: mapeo rustico para detectar huecos ----------
const t = (i) => `${i.descripcion} ${i.causa} ${i.solucion}`.toLowerCase();
function roughCat(i) {
  const s = (i.solucion || "").toLowerCase();
  const x = t(i);
  if (/troquel|resma|papel especial/.test(x)) return "Medio (Papel especial)";
  if (/sin respuesta|no responde|se cierra por|reiterad|no contesta/.test(s)) return "Gestion";
  if (/toner|tóner|cartucho|insumo|manch|clara|clar[oa]s/.test(s)) return "Insumos";
  if (/rodillo|pickup|fusor|separaci|kit|cover|panel|boton|botón|reemplaz|se cambia .*pieza|repar/.test(s)) return "Hardware";
  if (/red|ip|driver|spooler|firmware|scanner|escan|configur|instal|cola de impre/.test(s)) return "Software/Red";
  if (/atasc|papel|bandeja|guia|guía|arruga|hojas|limpie|mantenim/.test(s)) return "Medio";
  if (/instructiv|se explica|se indica|usuario/.test(s)) return "Gestion/Soporte";
  return "(SIN MATCH)";
}
const cov = {};
for (const i of all) { const c = roughCat(i); cov[c] = (cov[c] || 0) + 1; }
console.log("=== COBERTURA RUSTICA (solo para detectar huecos) ===");
Object.entries(cov).sort((a, b) => b[1] - a[1]).forEach(([k, v]) =>
  console.log("  " + String(v).padStart(4) + "  " + k));
const sinMatch = cov["(SIN MATCH)"] || 0;
console.log(`  -> sin match: ${sinMatch} (${(100 * sinMatch / all.length).toFixed(1)}%)\n`);

// ---------- (2) PLANILLA GOLD: muestreo estratificado por cliente ----------
const byClient = {};
for (const i of all) (byClient[i._cliente] ??= []).push(i);
const rng = (() => { let s = 42; return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff; })();
const shuffle = (arr) => arr.map((v) => [rng(), v]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);

const CAP = 30; // por cliente grande
let gold = [];
for (const [cli, items] of Object.entries(byClient)) {
  if (items.length <= 50) { gold = gold.concat(items); continue; }
  const troq = items.filter((i) => /troquel/.test(t(i)));
  const rest = shuffle(items.filter((i) => !/troquel/.test(t(i)))).slice(0, CAP);
  gold = gold.concat(troq, rest);
}
// asegurar TODOS los troquelados del corpus
const troqAll = all.filter((i) => /troquel/.test(t(i)));
const ids = new Set(gold.map((i) => i.id));
for (const i of troqAll) if (!ids.has(i.id)) { gold.push(i); ids.add(i.id); }

const q = (v) => `"${String(v ?? "").replace(/"/g, '""').replace(/\s+/g, " ").trim()}"`;
const cols = ["id", "cliente", "periodo", "fallas_cliente", "observaciones", "causa_tecnico", "solucion_tecnico", "sugerencia_rustica", "CATEGORIA_FINAL", "SUBCATEGORIA_FINAL", "notas"];
const rows = [cols.join(";")];
for (const i of gold) {
  rows.push([
    q(i.id), q(i._cliente), q(i._period), q(fallas(i)), q(observ(i)),
    q(i.causa), q(i.solucion), q(roughCat(i)), "", "", "",
  ].join(";"));
}
const outFile = path.join(DIR, "gold-worksheet.csv");
fs.writeFileSync(outFile, "﻿" + rows.join("\r\n"), "utf-8"); // BOM para Excel

// Entrada de etiquetado para el primer pase (orden identico al CSV).
const labelInput = gold.map((i) => ({
  id: i.id, cliente: i._cliente, periodo: i._period,
  fallas: fallas(i), observ: observ(i), causa: i.causa, solucion: i.solucion,
}));
fs.writeFileSync(path.join(DIR, "_label-input.json"), JSON.stringify(labelInput, null, 1), "utf-8");
console.log("=== PLANILLA GOLD ===");
console.log(`  casos en la planilla: ${gold.length} (de ${all.length})`);
for (const [cli, items] of Object.entries(byClient)) {
  const n = gold.filter((g) => g._cliente === cli).length;
  console.log(`    ${cli}: ${n}/${items.length}`);
}
console.log(`  troquelados incluidos: ${gold.filter((i) => /troquel/.test(t(i))).length}/${troqAll.length}`);
console.log(`  archivo: ${path.relative(process.cwd(), outFile)}`);
