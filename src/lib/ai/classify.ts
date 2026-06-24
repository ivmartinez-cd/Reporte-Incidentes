import "server-only";
import fs from "fs";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import { config } from "@/lib/config";
import { withRetry, createLimiter } from "@/lib/concurrency";
import { getCategories, type DynamicCategory } from "@/lib/data/categoriesStore";
import { TAXONOMY_RULES_V1 } from "./taxonomy.v1";
import { recordUsage, costOf, emptyUsage } from "./costStore";
import { getCachedClassification, saveCachedClassifications } from "@/lib/data/classificationCache";
import type { AiUsage, Incident, IncidentCategory } from "@/lib/types";

/**
 * Clasificador de incidentes (taxonomia CERRADA v1.x + reglas + few-shot + gating
 * por confianza). El modelo devuelve categoria, subcategoria y confianza; SOLO se
 * MUESTRA lo de confianza "alta". Lo "media"/"baja" (y los fallos de API) quedan
 * como "Pendiente de revision" — nunca una etiqueta inventada. Ver
 * [[taxonomy.v1]] para la taxonomia y reglas, y el harness scripts/score.mjs.
 */

const BATCH_SIZE = 25;
export const PENDIENTE = "Pendiente de revision";

interface CaseInput {
  descripcion: string;
  causa?: string;
  solucion?: string;
}

interface Classification {
  categoria: string;
  subcategoria: string;
  confianza: string; // alta | media | baja
}

const RESPONSE_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      i: { type: Type.INTEGER },
      categoria: { type: Type.STRING },
      subcategoria: { type: Type.STRING },
      confianza: { type: Type.STRING },
    },
    required: ["i", "categoria", "subcategoria", "confianza"],
  },
};

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI | null {
  if (!config.ai.apiKey) return null;
  client ??= new GoogleGenAI({ apiKey: config.ai.apiKey });
  return client;
}

// Batches en paralelo (configurable). Acorta el tiempo del refinamiento.
const aiLimiter = createLimiter(config.ai.concurrency);

/** Clave de cache por contenido del caso. Exportada para que la revision manual
 *  guarde el override en la misma clave que usa el clasificador. */
export function caseKeyForCache(c: { descripcion: string; causa?: string; solucion?: string }): string {
  return `${c.descripcion}|${c.causa ?? ""}|${c.solucion ?? ""}`;
}
const caseKey = (c: CaseInput) => caseKeyForCache(c);
const inputOf = (inc: Incident): CaseInput => ({
  descripcion: inc.descripcion,
  causa: inc.causa,
  solucion: inc.solucion,
});

/** Few-shot del gold (data/corpus/_fewshot.json). Cargado una vez por proceso;
 *  si falta (deploy sin corpus), el clasificador funciona igual con menos contexto. */
let fewshotCache: Array<{ fallas: string; observ: string; solucion: string; cat: string; sub: string }> | null = null;
function getFewshot(): NonNullable<typeof fewshotCache> {
  if (!fewshotCache) {
    try {
      const p = path.join(process.cwd(), "data", "corpus", "_fewshot.json");
      fewshotCache = JSON.parse(fs.readFileSync(p, "utf-8"));
    } catch {
      fewshotCache = [];
    }
  }
  return fewshotCache ?? [];
}

/** ASCII sin acentos ni artefactos de codificacion (convencion de la app). */
function toAscii(s: string): string {
  if (!s) return "";
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\\[a-zA-Z]+\{[^}]*\}/g, "")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
const norm = (s: string) => toAscii(s).toLowerCase();

function taxonomyText(categories: DynamicCategory[]): string {
  return categories
    .map((c) => `- ${c.name}:\n    ` + c.subcategories.map((s) => `* ${s}`).join("\n    "))
    .join("\n");
}

function buildIntro(categories: DynamicCategory[]): string {
  const fewshot = getFewshot();
  const examples = fewshot.length
    ? "\n\nEJEMPLOS REALES (formato: caso => categoria > subcategoria):\n" +
      fewshot.map((e) => `- Reporte: ${e.fallas}. Obs: ${e.observ}. Solucion: ${e.solucion} => ${e.cat} > ${e.sub}`).join("\n")
    : "";
  return (
    "Sos un experto en soporte tecnico de impresion. Clasifica cada incidente en UNA (categoria, subcategoria) EXACTA de esta taxonomia CERRADA (no inventes ninguna):\n\n" +
    taxonomyText(categories) +
    "\n\nREGLAS:\n" + TAXONOMY_RULES_V1 +
    "\n\nCONFIANZA: devolve 'confianza'='alta' si el caso encaja sin ambiguedad en una sola (categoria, subcategoria); 'media' si es razonable pero hay duda; 'baja' si es genuinamente ambiguo o quedo sin resolver. Se honesto: preferimos 'baja' (va a revision humana) antes que una etiqueta dudosa con falsa seguridad.\n\n" +
    "SIN ACENTOS: responde en ASCII puro, copiando los nombres EXACTOS de la lista." +
    examples
  );
}

function renderCase(c: CaseInput, i: number): string {
  const parts = [`${i}. Reporte del cliente: ${c.descripcion}`];
  if (c.solucion?.trim()) parts.push(`Solucion/trabajo del tecnico: ${c.solucion.trim()}`);
  return parts.join(" | ");
}

/** Snap a la taxonomia cerrada: devuelve nombres canonicos o PENDIENTE si la
 *  categoria no existe. Subcategoria desconocida => "Otros - <categoria>". */
function snap(rawCat: string, rawSub: string, categories: DynamicCategory[]): { categoria: string; subcategoria: string } {
  const cat = categories.find((c) => norm(c.name) === norm(rawCat) || norm(rawCat).includes(norm(c.name)));
  if (!cat) return { categoria: PENDIENTE, subcategoria: "" };
  const sub = cat.subcategories.find((s) => norm(s) === norm(rawSub));
  return { categoria: cat.name, subcategoria: sub ?? `Otros - ${cat.name}` };
}

/** Aplica el gating de confianza: solo "alta" se muestra; el resto => Pendiente. */
function gated(c: Classification): { categoria: IncidentCategory; subcategoria: string } {
  if ((c.confianza || "").toLowerCase() === "alta") {
    return { categoria: c.categoria as IncidentCategory, subcategoria: c.subcategoria };
  }
  return { categoria: PENDIENTE as IncidentCategory, subcategoria: "" };
}

export async function classifyIncidents(
  incidents: Incident[],
  opts: { useAi?: boolean } = {},
): Promise<{ incidents: Incident[]; usage: AiUsage; pending: number }> {
  const { useAi = true } = opts;
  const seen = new Map<string, CaseInput>();
  for (const inc of incidents) {
    const c = inputOf(inc);
    if (!c.descripcion) continue;
    const k = caseKey(c);
    if (!seen.has(k)) seen.set(k, c);
  }
  const unique = [...seen.values()];
  if (unique.length === 0) return { incidents, usage: emptyUsage(), pending: 0 };

  const categories = getCategories();
  const ai = getClient();
  let usage = emptyUsage();

  // Clasificacion final (ya con gating) por caseKey.
  const result = new Map<string, { categoria: IncidentCategory; subcategoria: string }>();
  const toClassify: CaseInput[] = [];

  // 1. Cache en disco (guarda la clasificacion cruda + confianza). Aplicamos el
  //    gating al leer: lo no-"alta" se muestra como Pendiente.
  for (const c of unique) {
    const cached = getCachedClassification(caseKey(c));
    if (cached) {
      result.set(caseKey(c), gated({ categoria: cached.categoria, subcategoria: cached.subcategoria, confianza: cached.confianza ?? "alta" }));
    } else {
      toClassify.push(c);
    }
  }

  const pending = toClassify.length;

  // 2. Casos sin cachear.
  if (toClassify.length > 0) {
    if (!useAi || !ai) {
      // Modo rapido (render inmediato) o sin API: provisional "Pendiente", sin
      // cachear, para que el refinamiento en segundo plano clasifique con IA.
      for (const c of toClassify) result.set(caseKey(c), { categoria: PENDIENTE as IncidentCategory, subcategoria: "" });
    } else {
      const batches: CaseInput[][] = [];
      for (let i = 0; i < toClassify.length; i += BATCH_SIZE) batches.push(toClassify.slice(i, i + BATCH_SIZE));

      const runs = await Promise.all(
        batches.map((batch) => aiLimiter(() => classifyBatch(ai, batch, categories))),
      );

      const toCache: Record<string, { categoria: string; subcategoria: string; confianza: string }> = {};
      runs.forEach(({ result: preds, runUsage }, b) => {
        const batch = batches[b];
        preds.forEach((p, idx) => {
          const k = caseKey(batch[idx]);
          result.set(k, gated(p));
          // Cacheamos la clasificacion cruda (con confianza) solo si hubo IA real.
          if (runUsage.calls > 0 && p.categoria !== PENDIENTE) {
            toCache[k] = { categoria: p.categoria, subcategoria: p.subcategoria, confianza: p.confianza };
          }
        });
        usage = addUsage(usage, runUsage);
      });
      if (Object.keys(toCache).length > 0) saveCachedClassifications(toCache);
    }
  }

  const classified = incidents.map((inc) => {
    const r = result.get(caseKey(inputOf(inc)));
    return {
      ...inc,
      categoria: (r?.categoria ?? PENDIENTE) as IncidentCategory,
      subcategoria: r?.subcategoria ?? "",
    };
  });
  return { incidents: classified, usage, pending };
}

async function classifyBatch(
  ai: GoogleGenAI,
  batch: CaseInput[],
  categories: DynamicCategory[],
): Promise<{ result: Classification[]; runUsage: AiUsage }> {
  const list = batch.map((c, i) => renderCase(c, i)).join("\n");
  const prompt = `${buildIntro(categories)}\n\nCASOS A CLASIFICAR (responde SOLO un arreglo JSON [{i, categoria, subcategoria, confianza}] en el mismo orden):\n${list}`;

  const models = [config.ai.model, config.ai.fallbackModel].filter((m, i, arr) => m && arr.indexOf(m) === i);

  let lastErr: unknown;
  for (const model of models) {
    try {
      const response = await withRetry(
        () =>
          ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              temperature: 0,
              responseMimeType: "application/json",
              responseSchema: RESPONSE_SCHEMA,
              thinkingConfig: { thinkingBudget: config.ai.thinkingBudget },
            },
          }),
        { label: `gemini.classify(${model})`, retries: 1 },
      );
      const promptTokens = response.usageMetadata?.promptTokenCount ?? 0;
      const candidatesTokens = response.usageMetadata?.candidatesTokenCount ?? 0;
      recordUsage(promptTokens, candidatesTokens);
      return {
        result: parsePredictions(response.text ?? "", batch.length, categories),
        runUsage: {
          promptTokens,
          candidatesTokens,
          totalTokens: promptTokens + candidatesTokens,
          calls: 1,
          costUsd: costOf(promptTokens, candidatesTokens),
        },
      };
    } catch (err) {
      lastErr = err;
      console.warn(`[gemini] modelo ${model} no disponible; probando siguiente…`);
    }
  }

  // Todos los modelos cayeron (503/etc): no inventamos => todo Pendiente.
  console.error("[gemini] fallo la clasificacion en todos los modelos; quedan Pendiente:", lastErr);
  return {
    result: batch.map(() => ({ categoria: PENDIENTE, subcategoria: "", confianza: "baja" })),
    runUsage: emptyUsage(),
  };
}

function parsePredictions(text: string, expected: number, categories: DynamicCategory[]): Classification[] {
  const out: Classification[] = Array(expected)
    .fill(null)
    .map(() => ({ categoria: PENDIENTE, subcategoria: "", confianza: "baja" }));
  try {
    const json = JSON.parse(text) as Array<{ i: number; categoria: string; subcategoria: string; confianza?: string }>;
    for (const item of json) {
      if (item.i >= 0 && item.i < expected) {
        const s = snap(item.categoria, toAscii(item.subcategoria ?? ""), categories);
        out[item.i] = { ...s, confianza: (item.confianza ?? "media").toLowerCase() };
      }
    }
  } catch {
    console.warn("[gemini] respuesta no-JSON; casos quedan Pendiente");
  }
  return out;
}

function addUsage(a: AiUsage, b: AiUsage): AiUsage {
  return {
    promptTokens: a.promptTokens + b.promptTokens,
    candidatesTokens: a.candidatesTokens + b.candidatesTokens,
    totalTokens: a.totalTokens + b.totalTokens,
    calls: a.calls + b.calls,
    costUsd: a.costUsd + b.costUsd,
  };
}
