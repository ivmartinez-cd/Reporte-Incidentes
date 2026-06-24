import "server-only";
import { GoogleGenAI, Type } from "@google/genai";
import { config } from "@/lib/config";
import { withRetry, createLimiter } from "@/lib/concurrency";
import { UNCLASSIFIED } from "./categories";
import { getCategories, type DynamicCategory } from "@/lib/data/categoriesStore";
import { recordSuggestions } from "@/lib/data/suggestionsStore";
import { recordUsage, costOf, emptyUsage } from "./costStore";
import { getCachedClassification, saveCachedClassifications } from "@/lib/data/classificationCache";
import type { AiUsage, Incident, IncidentCategory } from "@/lib/types";

const BATCH_SIZE = 25;

interface CaseInput {
  descripcion: string;
  causa?: string;
  solucion?: string;
}

const RESPONSE_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      i: { type: Type.INTEGER },
      categoria: { type: Type.STRING },
      subcategoria: { type: Type.STRING },
    },
    required: ["i", "categoria", "subcategoria"],
  },
};

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI | null {
  if (!config.ai.apiKey) return null;
  client ??= new GoogleGenAI({ apiKey: config.ai.apiKey });
  return client;
}

// Concurrencia 1: batches secuenciales para no gatillar rate-limit (429) /
// sobrecarga (503) de Gemini, que disparaban reintentos. Con la caché en disco
// el costo es de una sola vez, así que la pérdida de velocidad es marginal.
const aiLimiter = createLimiter(1);

function caseKey(c: CaseInput): string {
  return `${c.descripcion}|${c.causa ?? ""}|${c.solucion ?? ""}`;
}

function inputOf(inc: Incident): CaseInput {
  return { descripcion: inc.descripcion, causa: inc.causa, solucion: inc.solucion };
}

function buildPromptIntro(categories: DynamicCategory[]): string {
  const categoryNames = categories.map(c => c.name);

  const guidelines = categories
    .map(c => {
      const subs = c.subcategories.length
        ? c.subcategories.map(s => `"${s}"`).join(", ")
        : "(sin subcategorías definidas)";
      return `- **${c.name}**: ${c.description}\n  Subcategorías permitidas: ${subs}`;
    })
    .join("\n");

  return (
    "Eres un experto en soporte técnico de impresión y tu tarea es clasificar incidentes en una de estas categorías exactas:\n" +
    `[${categoryNames.join(", ")}].\n\n` +
    "Guía de categorización (cada categoría con sus subcategorías permitidas):\n" +
    guidelines + "\n\n" +
    "REGLA DE SUBCATEGORÍA (ESTRICTA): para 'subcategoria' elegí SIEMPRE una de las 'Subcategorías permitidas' de la categoría que asignes, copiándola EXACTAMENTE. NO inventes nombres fuera de esa lista. Si —y solo si— ninguna de la lista aplica de verdad, proponé una nueva usando EXACTAMENTE el formato 'NUEVA: <nombre corto>' (ej: 'NUEVA: Drum / Unidad de Imagen'). Nunca uses un nombre que no esté en la lista sin el prefijo 'NUEVA:'.\n\n" +
    "JERARQUÍA OPERATIVA DE EVALUACIÓN (CRÍTICO PARA TODOS LOS CLIENTES):\n" +
    "Para garantizar una tipificación uniforme y robusta sin importar el cliente o el tipo de reporte, debes aplicar estrictamente el siguiente orden de prioridad:\n\n" +
    "1. FUENTE DE VERDAD — CASI EXCLUYENTE: EL TRABAJO REALIZADO (campo 'Solución/Trabajo técnico').\n" +
    "   - Es lo que el técnico efectivamente hizo al cerrar el incidente; es la ÚNICA fuente confiable. Clasificá SIEMPRE según este texto.\n" +
    "   - Si la causa o el reporte del cliente contradicen el trabajo realizado, IGNORALOS y seguí la solución.\n" +
    "   - *Ejemplo*: Si el reporte dice 'Atasca papel' pero la solución es 'Se realiza actualización de Firmware', es 'Software y Firmware'.\n" +
    "   - *Ejemplo*: Si el reporte dice 'Atasca papel' pero la solución es 'Toner con enlace roto', es 'Insumos y Tóner'.\n" +
    "   - *Ejemplo*: Si la solución es 'entrega de insumo / se cambia tóner', es 'Insumos y Tóner', SIN IMPORTAR que la causa diga 'EQ - Equipo'.\n" +
    "   - **REGLA DE ACCIONES MÚLTIPLES (CRÍTICA)**: Si el trabajo realizado por el técnico menciona dos o más acciones que corresponden a categorías distintas (ej: 'se retiró papel atascado y se instaló driver'), cruza esta información con el 'Reporte del cliente'. Debes clasificar según la acción que resuelva de manera directa el síntoma o queja original del cliente (ej: si el cliente reportó 'Atasca Papel', priorizá 'se retiró atasco' y clasifica en 'Medio de Impresión' - 'Atasco de Papel', ya que la otra acción fue secundaria/preventiva).\n\n" +
    "2. APOYO DÉBIL — USAR CON DESCONFIANZA: LA CAUSA DIAGNOSTICADA (campo 'Causa raíz').\n" +
    "   - El técnico la elige de una lista en una app móvil y MUCHAS VECES está mal cargada (ej: aparece 'EQ - Equipo' aunque el trabajo real haya sido entregar un insumo). NUNCA dejes que la causa contradiga la solución.\n" +
    "   - Úsala SOLO como pista muy débil cuando la solución sea genérica o esté vacía.\n\n" +
    "3. RUIDO — ÚLTIMO RECURSO: EL REPORTE DEL CLIENTE.\n" +
    "   - El cliente suele elegir el motivo al azar y a menudo NO refleja el problema real. Úsalo solo para entender el síntoma cuando no haya solución técnica.\n" +
    "   - Si NO hay solución técnica descrita (incidente cerrado sin trabajo, 'se cierra por falta de respuesta', solo idas y vueltas administrativas), clasificá como 'Gestión de Soporte'.\n\n" +
    "REGLA DE HARDWARE (CRÍTICA): asigná 'Hardware y Desgaste' ÚNICAMENTE si el técnico REEMPLAZÓ o REPARÓ una pieza física por desgaste o rotura (fusor, rodillos pickup/retard, kit de mantenimiento, módulo ADF, display/panel, cable o fuente de poder). Si el técnico SOLO limpió, retiró papel atascado, hizo 'mantenimiento/limpieza' general, reconfiguró o ajustó bandejas/guías SIN cambiar ninguna pieza, NO uses 'Hardware y Desgaste': usá 'Medio de Impresión' (papel/bandeja/atasco), 'Conectividad y Red' (IP/red), 'Software y Firmware' (configuración/PC/driver) o 'Gestión de Soporte' (mal uso/negligencia/cierre administrativo) según el trabajo realizado.\n\n" +
    "SIN ACENTOS (OBLIGATORIO): escribí TODO el texto de salida (categoria y subcategoria) en ASCII puro, sin tildes, acentos ni 'ñ' (usá 'n'). Ej: 'Impresion' no 'Impresión', 'Tecnico' no 'Técnico', 'Configuracion' no 'Configuración'.\n\n" +
    "Responde SOLO con un arreglo JSON en el mismo orden, con la estructura:\n" +
    '[{"i": <indice>, "categoria": "<nombre exacto>", "subcategoria": "<subcategoria>"}]\n' +
    "No agregues texto fuera del JSON."
  );
}

/**
 * Normaliza a ASCII sin acentos: ó→o, é→e, ñ→n, y descarta cualquier carácter
 * no-ASCII o artefacto de codificación (p. ej. "\tilde{A}"). Todo el texto que
 * genera la IA se guarda sin acentos para evitar la corrupción de codificación
 * que sufren los caracteres acentuados en la respuesta de Gemini.
 */
function toAscii(s: string): string {
  if (!s) return "";
  let res = s;
  // Reemplazar LaTeX \tilde{A} y variantes unicode de codificación corrupta
  res = res.replace(/\\tilde\{A\}©/gi, "e");
  res = res.replace(/\\tilde\{A\}³/gi, "o");
  res = res.replace(/\\tilde\{A\}¡/gi, "a");
  res = res.replace(/\\tilde\{A\}º/gi, "u");
  res = res.replace(/\\tilde\{A\}±/gi, "n");
  res = res.replace(/\\tilde\{A\}/gi, "e"); // fallback genérico a 'e' para T\tilde{A}cnico
  
  // Reemplazar Ã© y similares directamente si vienen como caracteres corruptos unicode
  res = res.replace(/Ã©/g, "e");
  res = res.replace(/Ã³/g, "o");
  res = res.replace(/Ã¡/g, "a");
  res = res.replace(/Ãº/g, "u");
  res = res.replace(/Ã±/g, "n");
  res = res.replace(/Ã/g, "i"); // fallback genérico a 'i'

  return res
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // diacríticos (tildes/acentos)
    .replace(/\\[a-zA-Z]+\{[^}]*\}/g, "") // cualquier otro artefacto tipo LaTeX
    .replace(/[^\x00-\x7F]/g, "") // cualquier no-ASCII restante
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCategoryDynamic(raw: string, categories: DynamicCategory[]): string {
  // Comparación insensible a acentos: la IA responde en ASCII pero la taxonomía
  // puede tener acentos, así que normalizamos ambos lados.
  const cleaned = toAscii(raw).toLowerCase().replace(/[."'`]/g, "");
  const match = categories.find((c) => {
    const n = toAscii(c.name).toLowerCase();
    return n === cleaned || cleaned.includes(n);
  });
  return match?.name ?? UNCLASSIFIED;
}

const NEW_PREFIX = /^nueva\s*:\s*/i;

function normSub(x: string): string {
  return x.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Valida la subcategoría devuelta contra la lista permitida de su categoría
 * (tolerante a mayúsculas/acentos/espacios). Modo ESTRICTO: si no está en la
 * lista, NO entra a los datos (queda vacía) y el nombre propuesto se devuelve
 * como `suggestion` para ofrecerlo en la bandeja de sugerencias. El prefijo
 * 'NUEVA:' que pueda agregar el modelo se descarta para el match y el registro.
 */
function snapSubcategory(
  raw: string,
  categoria: string,
  categories: DynamicCategory[],
): { sub: string; suggestion?: string } {
  const cleaned = (raw ?? "").replace(NEW_PREFIX, "").trim();
  if (!cleaned) return { sub: "" };
  const cat = categories.find((c) => c.name === categoria);
  const hit = cat?.subcategories.find((sub) => normSub(sub) === normSub(cleaned));
  if (hit) return { sub: hit };
  return { sub: "", suggestion: cleaned };
}

/**
 * Clasifica incidentes. Por defecto consulta a la IA para los casos no cacheados.
 * Con `useAi: false` corre en "modo rápido": resuelve desde la caché de disco y
 * deja los faltantes con el heurístico provisional SIN llamar a Gemini ni escribir
 * caché — pensado para no bloquear el render del dashboard. `pending` informa
 * cuántos casos únicos quedaron sin clasificar por IA (para refinarlos aparte).
 */
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
  if (unique.length === 0) {
    return { incidents, usage: emptyUsage(), pending: 0 };
  }

  const map = new Map<string, { categoria: IncidentCategory; subcategoria: string }>();
  const ai = getClient();
  let usage = emptyUsage();

  const categories = getCategories();

  const toClassify: CaseInput[] = [];

  // 1. Intentamos leer de la caché persistente en disco
  for (const c of unique) {
    const k = caseKey(c);
    const cached = getCachedClassification(k);
    if (cached) {
      map.set(k, { categoria: cached.categoria as IncidentCategory, subcategoria: cached.subcategoria });
    } else {
      toClassify.push(c);
    }
  }

  const pending = toClassify.length;
  let calledAi = false;

  // 2. Si hay elementos sin clasificar, los procesamos
  if (toClassify.length > 0) {
    if (!useAi || !ai) {
      // Modo rápido (sin IA) o sin API key: heurístico provisional. En modo
      // rápido NO persistimos en disco, para que el refinamiento en segundo
      // plano sí consulte a Gemini y guarde la clasificación real.
      for (const c of toClassify) {
        map.set(caseKey(c), heuristic(c, categories));
      }
    } else {
      calledAi = true;
      const batches: CaseInput[][] = [];
      for (let i = 0; i < toClassify.length; i += BATCH_SIZE) {
        batches.push(toClassify.slice(i, i + BATCH_SIZE));
      }
      
      const results = await Promise.all(
        batches.map((batch) => aiLimiter(() => classifyBatch(ai, batch, categories))),
      );

      const successfulClassifications: Record<string, { categoria: string; subcategoria: string }> = {};

      results.forEach(({ result, runUsage }, b) => {
        const batch = batches[b];
        result.forEach((resObj, idx) => {
          const k = caseKey(batch[idx]);
          map.set(k, resObj);
          
          // Solo guardamos en la caché de disco si el lote se resolvió exitosamente con la IA
          // (si falló y usó heurístico, runUsage es emptyUsage, por lo que no lo guardamos en caché
          // para volver a intentar con IA en futuras cargas).
          if (runUsage.calls > 0) {
            successfulClassifications[k] = {
              categoria: resObj.categoria,
              subcategoria: resObj.subcategoria,
            };
          }
        });
        usage = addUsage(usage, runUsage);
      });

      // Guardamos de forma persistente las clasificaciones exitosas de la IA
      if (Object.keys(successfulClassifications).length > 0) {
        saveCachedClassifications(successfulClassifications);
      }
    }
  }

  // Snap centralizado: validamos cada subcategoría contra la taxonomía y, si el
  // modelo propuso una nueva (no está en la lista), NO la metemos en los datos
  // —queda "Sin subcategorizar"— y la registramos como sugerencia para aprobar.
  const suggestions = new Map<string, { categoria: string; name: string; count: number }>();
  const snapped = new Map<string, { categoria: IncidentCategory; subcategoria: string }>();
  for (const [k, res] of map) {
    const { sub, suggestion } = snapSubcategory(res.subcategoria, res.categoria, categories);
    snapped.set(k, { categoria: res.categoria, subcategoria: sub });
    if (suggestion) {
      const sk = `${res.categoria}|${suggestion.toLowerCase()}`;
      const e = suggestions.get(sk);
      if (e) e.count++;
      else suggestions.set(sk, { categoria: res.categoria, name: suggestion, count: 1 });
    }
  }
  // Solo registramos sugerencias cuando clasificó la IA (no el heurístico de
  // fallback ni el modo rápido sin IA).
  if (calledAi && suggestions.size) recordSuggestions([...suggestions.values()]);

  const classified = incidents.map((inc) => {
    const res = snapped.get(caseKey(inputOf(inc)));
    return {
      ...inc,
      categoria: (res?.categoria ?? UNCLASSIFIED) as IncidentCategory,
      subcategoria: res?.subcategoria ?? "",
    };
  });
  return { incidents: classified, usage, pending };
}

function renderCase(c: CaseInput, i: number): string {
  const parts = [`${i}. Reporte del cliente: ${c.descripcion}`];
  if (c.causa?.trim()) parts.push(`[Causa raíz: ${c.causa.trim()}]`);
  if (c.solucion?.trim()) parts.push(`[Solución/Trabajo técnico: ${c.solucion.trim()}]`);
  return parts.join(" ");
}

async function classifyBatch(
  ai: GoogleGenAI,
  batch: CaseInput[],
  categories: DynamicCategory[],
): Promise<{ result: Array<{ categoria: IncidentCategory; subcategoria: string }>; runUsage: AiUsage }> {
  const list = batch.map((c, i) => renderCase(c, i)).join("\n");
  const prompt = `${buildPromptIntro(categories)}\n\nIncidentes:\n${list}`;

  // Probamos el modelo principal y, si está caído (503 por sobrecarga de Google),
  // el de respaldo. Pocos reintentos por modelo: ante un 503 conviene saltar al
  // siguiente modelo antes que machacar el caído (eso era lo que inflaba la página).
  const models = [config.ai.model, config.ai.fallbackModel].filter(
    (m, i, arr) => m && arr.indexOf(m) === i,
  );

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
            },
          }),
        { label: `gemini.classify(${model})`, retries: 1 },
      );

      const promptTokens = response.usageMetadata?.promptTokenCount ?? 0;
      const candidatesTokens = response.usageMetadata?.candidatesTokenCount ?? 0;
      recordUsage(promptTokens, candidatesTokens);

      const parsed = parseCategories(response.text ?? "", batch.length, categories);
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
      lastErr = err;
      console.warn(`[gemini] modelo ${model} no disponible; probando siguiente…`);
    }
  }

  console.error("[gemini] falló la clasificación en todos los modelos, uso heurístico:", lastErr);
  return { result: batch.map((c) => heuristic(c, categories)), runUsage: emptyUsage() };
}

function parseCategories(
  text: string,
  expected: number,
  categories: DynamicCategory[],
): Array<{ categoria: IncidentCategory; subcategoria: string }> {
  const out: Array<{ categoria: IncidentCategory; subcategoria: string }> = Array(expected)
    .fill(null)
    .map(() => ({ categoria: UNCLASSIFIED, subcategoria: "" }));

  try {
    const json = JSON.parse(text) as Array<{ i: number; categoria: string; subcategoria: string }>;
    for (const item of json) {
      if (item.i >= 0 && item.i < expected) {
        // Guardamos la subcategoría CRUDA del modelo; la validación contra la
        // lista permitida y la recolección de sugerencias se hace centralizado
        // en classifyIncidents (un único punto de "snap").
        out[item.i] = {
          categoria: normalizeCategoryDynamic(item.categoria, categories) as IncidentCategory,
          subcategoria: toAscii(item.subcategoria ?? ""),
        };
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

function heuristic(c: CaseInput, categories: DynamicCategory[]): { categoria: IncidentCategory; subcategoria: string } {
  const t = `${c.causa ?? ""} ${c.descripcion} ${c.solucion ?? ""}`.toLowerCase();
  
  if (/(guia|bandeja)/.test((c.solucion ?? "").toLowerCase())) {
    const catMedio = categories.find(cat => cat.name === "Medio de Impresion");
    const subValida = catMedio?.subcategories?.find(s => s.toLowerCase().includes("guia")) ?? "Ajuste de Guias / Bandejas";
    return { categoria: (catMedio?.name ?? "Medio de Impresion") as IncidentCategory, subcategoria: subValida };
  }
  if (/(firmware|\bfw\b|actualizacion.*firmware|actualizar.*firmware)/.test(t)) {
    const catSoft = categories.find(cat => cat.name.toLowerCase().includes("firmware"));
    const subValida = catSoft?.subcategories?.find(s => s.toLowerCase().includes("firmware")) ?? "Actualizacion de Firmware";
    return { categoria: (catSoft?.name ?? "Software y Firmware") as IncidentCategory, subcategoria: subValida };
  }
  if (/(toner|tóner|cartucho|insumo|manch|copias.*clar)/.test(t)) {
    const catInsumo = categories.find(cat => cat.name.toLowerCase().includes("insumo") || cat.name.toLowerCase().includes("toner"));
    return { categoria: (catInsumo?.name ?? "Insumos y Toner") as IncidentCategory, subcategoria: "Toner / Insumos" };
  }
  if (/(\bip\b|\bred\b|\bping\b|conexion|\bswitch\b|cable.*?\bred\b|\bvpn\b|corte.*luz|energia)/.test(t)) {
    const catRed = categories.find(cat => cat.name.toLowerCase().includes("red") || cat.name.toLowerCase().includes("conect"));
    return { categoria: (catRed?.name ?? "Conectividad y Red") as IncidentCategory, subcategoria: "Configuracion IP / Red" };
  }
  if (/(guia|bandeja|troquelado|humed|precios|hojas.*finas|resma)/.test(t)) {
    const catMedio = categories.find(cat => cat.name === "Medio de Impresion");
    return { categoria: (catMedio?.name ?? "Medio de Impresion") as IncidentCategory, subcategoria: "Papel y Bandejas" };
  }
  if (/(driver|\bpc\b|reinicio.*\bpc\b|sistema|spooler|windows)/.test(t)) {
    const catSoft = categories.find(cat => cat.name.toLowerCase().includes("firmware") || cat.name.toLowerCase().includes("software"));
    return { categoria: (catSoft?.name ?? "Software y Firmware") as IncidentCategory, subcategoria: "Soporte Tecnico PC" };
  }
  if (/(negligencia|mal uso|vandalismo|objeto.*apoyado|cerrado.*falta.*respuesta|instructivo|auto-resolucion|video)/.test(t)) {
    const catGest = categories.find(cat => cat.name.toLowerCase().includes("gest"));
    return { categoria: (catGest?.name ?? "Gestion de Soporte") as IncidentCategory, subcategoria: "Revision General" };
  }
  if (/(fusor|rodillo|goma|\badf\b|retard|arrastre|mantenimiento|pickup|bujes|modulo)/.test(t) || t.includes("mantenimiento")) {
    const catHard = categories.find(cat => cat.name.toLowerCase().includes("hard") || cat.name.toLowerCase().includes("desgaste"));
    return { categoria: (catHard?.name ?? "Hardware y Desgaste") as IncidentCategory, subcategoria: "Desgaste / Reparacion" };
  }
  return { categoria: UNCLASSIFIED, subcategoria: "" };
}
