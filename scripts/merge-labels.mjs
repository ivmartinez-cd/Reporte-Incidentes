// Vuelca mis etiquetas (data/corpus/_labels.json) a la planilla gold, validando
// contra la taxonomia v1 (no permite categoria/subcategoria inexistente).
//   node scripts/merge-labels.mjs
import fs from "fs";
import path from "path";

const DIR = "data/corpus";

// Espejo de TAXONOMY_V1 (src/lib/ai/taxonomy.v1.ts) para validar offline.
const TAX = {
  "Medio de Impresion": ["Atasco de papel (comun)", "Papel especial / Troquelado", "Papel inadecuado / humedad / mala calidad", "Arruga / Toma varias hojas", "Ajuste de bandejas / guias", "Otros - Medio de Impresion"],
  "Insumos y Toner": ["Toner / Cartucho", "Tolva / Contenedor residual", "Drum / Unidad de imagen / Revelador", "Calidad por insumo (manchas / impresion clara)", "Otros - Insumos y Toner"],
  "Hardware y Desgaste": ["Rodillos / Pickup / Separacion", "Fusor / Kit de mantenimiento", "Escaner / ADF", "Parte / Panel / Botonera rota", "Otros - Hardware y Desgaste"],
  "Software, Firmware y Red": ["Configuracion de red / IP", "Driver / PC / Spooler", "Firmware", "Calibracion / Ajuste de imagen", "Otros - Software, Firmware y Red"],
  "Gestion de Soporte": ["Mesa de ayuda / Sin respuesta del cliente", "Instructivo / Autoresolucion", "Mal uso / Negligencia", "Diagnostico / Sin falla", "Mantenimiento / Limpieza general", "Problema externo / Red del cliente", "Otros - Gestion de Soporte"],
  "PENDIENTE": ["PENDIENTE"], // confianza baja: a revisar
};

const input = JSON.parse(fs.readFileSync(path.join(DIR, "_label-input.json"), "utf-8"));
const labels = JSON.parse(fs.readFileSync(path.join(DIR, "_labels.json"), "utf-8"));

const invalid = [];
for (const [id, l] of Object.entries(labels)) {
  if (!TAX[l.cat] || !TAX[l.cat].includes(l.sub)) invalid.push(`${id}: ${l.cat} > ${l.sub}`);
}
if (invalid.length) {
  console.log("ETIQUETAS INVALIDAS (no estan en la taxonomia v1):");
  invalid.forEach((x) => console.log("  " + x));
  process.exit(1);
}

const q = (v) => `"${String(v ?? "").replace(/"/g, '""').replace(/\s+/g, " ").trim()}"`;
const cols = ["id", "cliente", "periodo", "fallas_cliente", "observaciones", "causa_tecnico", "solucion_tecnico", "CATEGORIA_FINAL", "SUBCATEGORIA_FINAL", "confianza", "notas"];
const rows = [cols.join(";")];
let labeled = 0, dudoso = 0;
const dist = {};
for (const c of input) {
  const l = labels[c.id];
  if (l) { labeled++; dist[l.cat] = (dist[l.cat] || 0) + 1; if (l.conf === "baja" || l.cat === "PENDIENTE") dudoso++; }
  rows.push([
    q(c.id), q(c.cliente), q(c.periodo), q(c.fallas), q(c.observ), q(c.causa), q(c.solucion),
    q(l?.cat || ""), q(l?.sub || ""), q(l?.conf || ""), q(l?.nota || ""),
  ].join(";"));
}
fs.writeFileSync(path.join(DIR, "gold-worksheet.csv"), "﻿" + rows.join("\r\n"), "utf-8");

console.log(`Etiquetados: ${labeled}/${input.length}  | dudosos/pendientes: ${dudoso}`);
console.log("Distribucion:");
Object.entries(dist).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log("  " + String(v).padStart(3) + "  " + k));
