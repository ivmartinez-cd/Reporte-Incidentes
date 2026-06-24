// Fase 4/5 - medicion con confidence-gating. Compara predicciones vs gold
// (_test.json) y reporta precision CRUDA y precision@cobertura (mandando los
// 'baja' a Pendiente de revision).
//   node scripts/score.mjs [archivo_predicciones]   (default: data/corpus/_pred.json)
import fs from "fs";
import path from "path";

const DIR = "data/corpus";
const predFile = process.argv[2] || path.join(DIR, "_pred.json");
const test = JSON.parse(fs.readFileSync(path.join(DIR, "_test.json"), "utf-8"));
const pred = JSON.parse(fs.readFileSync(predFile, "utf-8"));

const n = test.length;
let rawCat = 0, rawSub = 0;
// gating: tratamos 'baja' (o PENDIENTE) como abstencion
let covered = 0, covCat = 0, covSub = 0, abst = 0;
const confDist = {};
const mismatches = [];

for (const t of test) {
  const p = pred[t.id];
  const conf = (p?.confianza || "media").toLowerCase();
  confDist[conf] = (confDist[conf] || 0) + 1;
  const pc = p?.categoria || "(vacio)";
  const ps = p?.subcategoria || "(vacio)";
  const catOk = pc === t.cat;
  const subOk = catOk && ps === t.sub;
  if (catOk) rawCat++;
  if (subOk) rawSub++;

  const abstain = !p || conf === "baja" || pc === "PENDIENTE";
  if (abstain) { abst++; continue; }
  covered++;
  if (catOk) covCat++;
  if (subOk) covSub++;
  if (!subOk) mismatches.push({ id: t.id, cli: t.cliente, conf, gold: `${t.cat} > ${t.sub}`, pred: `${pc} > ${ps}` });
}

const p1 = (x, d) => d ? ((100 * x) / d).toFixed(1) + "%" : "-";
console.log(`Casos test: ${n}`);
console.log(`Confianza del modelo: ${Object.entries(confDist).map(([k,v])=>`${k}:${v}`).join("  ")}`);
console.log(`\n== SIN gating (todo) ==`);
console.log(`  CATEGORIA:    ${rawCat}/${n}  ${p1(rawCat,n)}`);
console.log(`  SUBCATEGORIA: ${rawSub}/${n}  ${p1(rawSub,n)}`);
console.log(`\n== CON gating (baja -> Pendiente de revision) ==`);
console.log(`  Cobertura (auto-clasificado): ${covered}/${n}  ${p1(covered,n)}   | Pendiente: ${abst}  ${p1(abst,n)}`);
console.log(`  PRECISION CATEGORIA  (sobre lo cubierto): ${covCat}/${covered}  ${p1(covCat,covered)}`);
console.log(`  PRECISION SUBCATEGORIA (sobre lo cubierto): ${covSub}/${covered}  ${p1(covSub,covered)}`);

console.log(`\nErrores que ZAFARON el gating (clasificados con confianza pero mal) — ${mismatches.length}:`);
for (const m of mismatches) console.log(`  ${m.id} ${m.cli} [${m.conf}]\n     gold: ${m.gold}\n     pred: ${m.pred}`);
