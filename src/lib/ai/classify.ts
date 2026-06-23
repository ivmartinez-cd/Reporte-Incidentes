import "server-only";
import { GoogleGenAI } from "@google/genai";
import { config } from "@/lib/config";
import { withRetry } from "@/lib/concurrency";
import { CATEGORIES, normalizeCategory, UNCLASSIFIED } from "./categories";
import { recordUsage, costOf, emptyUsage } from "./costStore";
import type { AiUsage, Incident, IncidentCategory } from "@/lib/types";

const PROMPT_INTRO =
  "Eres un agente clasificador de soporte técnico. Analiza cada descripción de " +
  "incidente y clasifícala estrictamente en UNA de estas categorías: " +
  `[${CATEGORIES.join(", ")}]. ` +
  "Responde SOLO con un arreglo JSON, un elemento por incidente en el mismo " +
  'orden, con la forma {"i": <indice>, "categoria": "<nombre exacto>"}. ' +
  "No agregues texto fuera del JSON.";

const BATCH_SIZE = 25;

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI | null {
  if (!config.ai.apiKey) return null;
  client ??= new GoogleGenAI({ apiKey: config.ai.apiKey });
  return client;
}

/**
 * Clasifica una lista de incidentes. Deduplica por descripción (el mismo texto
 * se clasifica una sola vez), batchea las llamadas y captura los tokens usados.
 * Devuelve los incidentes con `categoria` y el uso/costo de IA de esta corrida.
 */
export async function classifyIncidents(
  incidents: Incident[],
): Promise<{ incidents: Incident[]; usage: AiUsage }> {
  const unique = Array.from(new Set(incidents.map((i) => i.descripcion))).filter(
    Boolean,
  );
  if (unique.length === 0) {
    return { incidents, usage: emptyUsage() };
  }

  const map = new Map<string, IncidentCategory>();
  const ai = getClient();
  let usage = emptyUsage();

  if (!ai) {
    // Sin API key: fallback heurístico (costo cero), para que la demo funcione.
    for (const text of unique) map.set(text, heuristic(text));
  } else {
    for (let i = 0; i < unique.length; i += BATCH_SIZE) {
      const batch = unique.slice(i, i + BATCH_SIZE);
      const { result, runUsage } = await classifyBatch(ai, batch);
      result.forEach((cat, idx) => map.set(batch[idx], cat));
      usage = addUsage(usage, runUsage);
    }
  }

  const classified = incidents.map((inc) => ({
    ...inc,
    categoria: map.get(inc.descripcion) ?? UNCLASSIFIED,
  }));
  return { incidents: classified, usage };
}

async function classifyBatch(
  ai: GoogleGenAI,
  batch: string[],
): Promise<{ result: IncidentCategory[]; runUsage: AiUsage }> {
  const list = batch.map((d, i) => `${i}. ${d}`).join("\n");
  const prompt = `${PROMPT_INTRO}\n\nIncidentes:\n${list}`;

  try {
    const response = await withRetry(
      () =>
        ai.models.generateContent({
          model: config.ai.model,
          contents: prompt,
          config: { temperature: 0, responseMimeType: "application/json" },
        }),
      { label: "gemini.classify" },
    );

    const promptTokens = response.usageMetadata?.promptTokenCount ?? 0;
    const candidatesTokens = response.usageMetadata?.candidatesTokenCount ?? 0;
    recordUsage(promptTokens, candidatesTokens);

    const parsed = parseCategories(response.text ?? "", batch.length);
    return {
      result: parsed,
      runUsage: {
        promptTokens,
        candidatesTokens,
        totalTokens: promptTokens + candidatesTokens,
        calls: 1,
        costUsd: costOf(promptTokens, candidatesTokens),
      },
    };
  } catch (err) {
    console.error("[gemini] falló la clasificación, uso heurístico:", err);
    return {
      result: batch.map(heuristic),
      runUsage: emptyUsage(),
    };
  }
}

function parseCategories(text: string, expected: number): IncidentCategory[] {
  const out: IncidentCategory[] = Array(expected).fill(UNCLASSIFIED);
  try {
    const json = JSON.parse(text) as Array<{ i: number; categoria: string }>;
    for (const item of json) {
      if (item.i >= 0 && item.i < expected) {
        out[item.i] = normalizeCategory(item.categoria);
      }
    }
  } catch {
    console.warn("[gemini] respuesta no-JSON; categorías sin clasificar");
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

/** Clasificador por palabras clave (sin costo). Fallback de respaldo. */
function heuristic(text: string): IncidentCategory {
  const t = text.toLowerCase();
  if (/(atasc|trab|arrug|fusor|bandeja)/.test(t)) return "Atasco Papel";
  if (/(crític|caída total|urgente|40 usuarios|detenid|servidor.*respond)/.test(t))
    return "Error de Servicio Crítico";
  if (/(tóner|toner|cartucho|insumo|manch|copias.*clar)/.test(t))
    return "Error de Insumo";
  if (/(cola de impres|agregar la impresora|configurar la cola)/.test(t))
    return "Instalación de Cola de Impresión";
  if (/(desinstal|instalar la nueva|reemplaz.*equipo)/.test(t))
    return "Instalación / Desinstalación";
  if (/(driver|firmware|software|actualiz|congelad|windows)/.test(t))
    return "Software";
  if (/(no sabe|no encuentra|cómo|consulta.*uso|escanear a correo|doble faz)/.test(t))
    return "Usabilidad/Configuración";
  if (/(error de servicio|no responde|desconect|intermitente)/.test(t))
    return "Error de Servicio";
  return UNCLASSIFIED;
}
