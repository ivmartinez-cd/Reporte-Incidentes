// Mide un clasificador OFFLINE (TF-IDF + kNN coseno) sobre el gold, con
// leave-one-out. Sirve de fallback cuando Gemini esta caido (sin API).
//   node scripts/knn-eval.mjs
import fs from "fs";
import path from "path";

const DIR = "data/corpus";
const input = JSON.parse(fs.readFileSync(path.join(DIR, "_label-input.json"), "utf-8"));
const labels = JSON.parse(fs.readFileSync(path.join(DIR, "_labels.json"), "utf-8"));

const STOP = new Set("de la el en y a los las un una que se con por para del al su lo le es no ok si se al un una este esta para mas que como cuando esta esta sin ya".split(" "));
const ascii = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const tokenize = (s) => ascii(s).split(/[^a-z0-9]+/).filter((t) => t.length >= 3 && !STOP.has(t));

// Texto de cada caso = señal del cliente + del tecnico.
const docs = input
  .filter((c) => labels[c.id])
  .map((c) => ({
    id: c.id,
    toks: tokenize(`${c.fallas} ${c.observ} ${c.solucion}`),
    cat: labels[c.id].cat,
    sub: labels[c.id].sub,
  }));

const N = docs.length;
const df = new Map();
for (const d of docs) for (const t of new Set(d.toks)) df.set(t, (df.get(t) || 0) + 1);
const idf = (t) => Math.log(N / (df.get(t) || N));

function vec(toks) {
  const tf = new Map();
  for (const t of toks) tf.set(t, (tf.get(t) || 0) + 1);
  const v = new Map();
  let norm = 0;
  for (const [t, c] of tf) { const w = c * idf(t); v.set(t, w); norm += w * w; }
  norm = Math.sqrt(norm) || 1;
  for (const [t, w] of v) v.set(t, w / norm);
  return v;
}
docs.forEach((d) => (d.v = vec(d.toks)));

function cos(a, b) {
  let s = 0;
  const [small, big] = a.size < b.size ? [a, b] : [b, a];
  for (const [t, w] of small) { const w2 = big.get(t); if (w2) s += w * w2; }
  return s;
}

function evalK(k) {
  let cat = 0, sub = 0;
  for (let i = 0; i < N; i++) {
    const sims = [];
    for (let j = 0; j < N; j++) if (j !== i) sims.push([cos(docs[i].v, docs[j].v), j]);
    sims.sort((a, b) => b[0] - a[0]);
    const top = sims.slice(0, k).map(([, j]) => docs[j]);
    // voto por categoria (y subcategoria) ponderado por similitud
    const voteCat = {}, voteSub = {};
    sims.slice(0, k).forEach(([sim, j]) => {
      voteCat[docs[j].cat] = (voteCat[docs[j].cat] || 0) + sim;
      const key = `${docs[j].cat}||${docs[j].sub}`;
      voteSub[key] = (voteSub[key] || 0) + sim;
    });
    const bestCat = Object.entries(voteCat).sort((a, b) => b[1] - a[1])[0][0];
    const bestSub = Object.entries(voteSub).sort((a, b) => b[1] - a[1])[0][0];
    if (bestCat === docs[i].cat) cat++;
    if (bestSub === `${docs[i].cat}||${docs[i].sub}`) sub++;
  }
  const p = (x) => ((100 * x) / N).toFixed(1) + "%";
  console.log(`k=${k}:  categoria ${cat}/${N} ${p(cat)}   subcategoria ${sub}/${N} ${p(sub)}`);
}

console.log(`Gold: ${N} casos | vocabulario: ${df.size} terminos\n`);
for (const k of [1, 3, 5]) evalK(k);
