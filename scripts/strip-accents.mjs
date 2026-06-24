import fs from "fs";
import path from "path";

// Quita SOLO letras acentuadas y ñ (diacríticos combinantes tras NFD).
// Preserva símbolos no-acento como ·, —, →, ✅.
const DIACRITICS = /[̀-ͯ]/g;
const strip = (s) => s.normalize("NFD").replace(DIACRITICS, "");

const exts = new Set([".ts", ".tsx", ".css", ".json"]);
const apply = process.argv.includes("--apply");

// classify.ts se excluye a propósito: sus regex de heurístico dependen de
// acentos para matchear texto del SOAP, su prompt/toAscii son internos, y su
// salida ya se normaliza contra la taxonomía (que sí se de-acentúa). Tocarlo
// rompería el regex de diacríticos de toAscii.
const SKIP = new Set(["src/lib/ai/classify.ts"]);

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (exts.has(path.extname(e.name))) out.push(p);
  }
}

const files = [];
walk("src", files);

let changed = 0;
for (const p of files) {
  if (SKIP.has(p.replace(/\\/g, "/"))) continue;
  const c = fs.readFileSync(p, "utf-8");
  const s = strip(c);
  if (s === c) continue;
  let n = 0;
  for (const ch of c) if (strip(ch) !== ch) n++;
  console.log(`${apply ? "fixed" : "would fix"} ${n}\t${p.replace(/\\/g, "/")}`);
  if (apply) fs.writeFileSync(p, s, "utf-8");
  changed++;
}
console.log(`\n${changed} archivo(s) ${apply ? "modificados" : "con acentos"}`);
