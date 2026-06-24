import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import { config } from "@/lib/config";
import { createLimiter } from "@/lib/concurrency";
import { TAXONOMY_V1, TAXONOMY_RULES_V1, TAXONOMY_VERSION } from "@/lib/ai/taxonomy.v1";

/**
 * Fase 4 - clasificador de EVALUACION. Corre la taxonomia v1.4 cerrada + reglas +
 * few-shot sobre el test set y escribe predicciones para medir precision (vs gold)
 * con scripts/score.mjs. Herramienta de desarrollo, NO parte del producto.
 *
 *   GET /api/classify-eval?model=gemini-2.5-pro&batch=20
 */

const DIR = path.join(process.cwd(), "data", "corpus");

const norm = (s: string) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

// Snap a la taxonomia cerrada: devuelve valores canonicos o PENDIENTE.
function snap(rawCat: string, rawSub: string): { categoria: string; subcategoria: string } {
  const cat = TAXONOMY_V1.find((c) => norm(c.name) === norm(rawCat));
  if (!cat) return { categoria: "PENDIENTE", subcategoria: "PENDIENTE" };
  const sub = cat.subcategories.find((s) => norm(s) === norm(rawSub));
  return { categoria: cat.name, subcategoria: sub ?? `Otros - ${cat.name}` };
}

function taxonomyText(): string {
  return TAXONOMY_V1.map(
    (c) => `- ${c.name}:\n    ` + c.subcategories.map((s) => `* ${s}`).join("\n    "),
  ).join("\n");
}

function renderCase(c: { fallas: string; observ: string; solucion: string }): string {
  const parts = [`Reporte del cliente: ${c.fallas || "(sin dato)"}`];
  if (c.observ) parts.push(`Observaciones: ${c.observ}`);
  parts.push(`Solucion/trabajo del tecnico: ${c.solucion || "(sin dato)"}`);
  return parts.join(" | ");
}

const RESPONSE_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      i: { type: Type.INTEGER },
      categoria: { type: Type.STRING },
      subcategoria: { type: Type.STRING },
      confianza: { type: Type.STRING }, // alta | media | baja
    },
    required: ["i", "categoria", "subcategoria", "confianza"],
  },
};

export async function GET(req: Request) {
  if (!config.ai.apiKey) return NextResponse.json({ error: "falta GEMINI_API_KEY" }, { status: 400 });

  const url = new URL(req.url);
  const model = url.searchParams.get("model") ?? "gemini-2.5-pro";
  const batchSize = Number(url.searchParams.get("batch") ?? "20") || 20;
  const conc = Number(url.searchParams.get("conc") ?? "1") || 1;
  // thinkingBudget: gemini-2.5-pro NO permite 0 (min 128, mas rapido). Omitir = default del modelo.
  const thinkParam = url.searchParams.get("think");
  const thinkingBudget = thinkParam === null ? undefined : Number(thinkParam);
  const fsMax = Number(url.searchParams.get("fs") ?? "0") || 0; // 0 = todos los few-shot

  const fewshotAll = JSON.parse(fs.readFileSync(path.join(DIR, "_fewshot.json"), "utf-8"));
  const fewshot = fsMax > 0 ? fewshotAll.slice(0, fsMax) : fewshotAll;
  const test = JSON.parse(fs.readFileSync(path.join(DIR, "_test.json"), "utf-8"));

  const intro =
    "Sos un experto en soporte tecnico de impresion. Clasifica cada incidente en UNA (categoria, subcategoria) EXACTA de esta taxonomia CERRADA (no inventes ninguna):\n\n" +
    taxonomyText() +
    "\n\nREGLAS:\n" + TAXONOMY_RULES_V1 +
    "\n\nCONFIANZA: en cada caso devolve 'confianza' = 'alta' si el caso es claro y " +
    "encaja sin ambiguedad en una sola (categoria, subcategoria); 'media' si es " +
    "razonable pero hay algo de duda; 'baja' si es genuinamente ambiguo (dos " +
    "categorias podrian aplicar, falta info, o el caso quedo sin resolver). Se " +
    "honesto: preferimos un 'baja' (ira a revision humana) antes que una etiqueta " +
    "dudosa puesta con falsa seguridad.\n\n" +
    "SIN ACENTOS: responde en ASCII puro, copiando los nombres EXACTOS de la lista.\n\n" +
    "EJEMPLOS REALES (formato: caso => categoria > subcategoria):\n" +
    fewshot.map((e: { fallas: string; observ: string; solucion: string; cat: string; sub: string }) =>
      `- ${renderCase(e)} => ${e.cat} > ${e.sub}`).join("\n");

  const ai = new GoogleGenAI({ apiKey: config.ai.apiKey });
  const pred: Record<string, { categoria: string; subcategoria: string; confianza: string; rawCat: string; rawSub: string }> = {};
  let calls = 0, errors = 0;

  const batches: Array<Array<{ id: string; fallas: string; observ: string; solucion: string }>> = [];
  for (let i = 0; i < test.length; i += batchSize) batches.push(test.slice(i, i + batchSize));

  const limit = createLimiter(conc);
  const t0 = Date.now();
  await Promise.all(
    batches.map((batch) =>
      limit(async () => {
        const list = batch.map((c, idx) => `${idx}. ${renderCase(c)}`).join("\n");
        const prompt = `${intro}\n\nCASOS A CLASIFICAR (responde SOLO un arreglo JSON [{i, categoria, subcategoria, confianza}] en el mismo orden):\n${list}`;
        try {
          const resp = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              temperature: 0,
              responseMimeType: "application/json",
              responseSchema: RESPONSE_SCHEMA,
              ...(thinkingBudget !== undefined ? { thinkingConfig: { thinkingBudget } } : {}),
            },
          });
          calls++;
          const arr = JSON.parse(resp.text ?? "[]") as Array<{ i: number; categoria: string; subcategoria: string; confianza?: string }>;
          for (const item of arr) {
            const c = batch[item.i];
            if (!c) continue;
            const s = snap(item.categoria, item.subcategoria);
            pred[c.id] = { ...s, confianza: (item.confianza ?? "media").toLowerCase(), rawCat: item.categoria, rawSub: item.subcategoria };
          }
        } catch (err) {
          errors++;
          console.error("[classify-eval] batch fallo:", err instanceof Error ? err.message : err);
        }
      }),
    ),
  );
  const elapsedSec = Number(((Date.now() - t0) / 1000).toFixed(1));

  fs.writeFileSync(path.join(DIR, "_pred.json"), JSON.stringify(pred, null, 2), "utf-8");
  return NextResponse.json({
    ok: true, model, taxonomy: TAXONOMY_VERSION,
    test: test.length, predichos: Object.keys(pred).length, calls, errors,
    elapsedSec, conc, thinkingBudget: thinkingBudget ?? "default", fewshot: fewshot.length, batchSize,
    archivo: "data/corpus/_pred.json",
  });
}
