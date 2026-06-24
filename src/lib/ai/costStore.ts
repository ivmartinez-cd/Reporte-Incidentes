import "server-only";
import { config } from "@/lib/config";
import type { AiUsage } from "@/lib/types";

/**
 * Acumulador de uso/costo de IA en memoria (por proceso). Se reinicia al
 * reiniciar el servidor — suficiente para un panel interno. Para historico
 * persistente, reemplazar por una tabla/DB.
 */
let totals: AiUsage = {
  promptTokens: 0,
  candidatesTokens: 0,
  totalTokens: 0,
  calls: 0,
  costUsd: 0,
};

export function costOf(promptTokens: number, candidatesTokens: number): number {
  const input = (promptTokens / 1_000_000) * config.ai.priceInputPerM;
  const output = (candidatesTokens / 1_000_000) * config.ai.priceOutputPerM;
  return input + output;
}

export function recordUsage(promptTokens: number, candidatesTokens: number) {
  totals = {
    promptTokens: totals.promptTokens + promptTokens,
    candidatesTokens: totals.candidatesTokens + candidatesTokens,
    totalTokens: totals.totalTokens + promptTokens + candidatesTokens,
    calls: totals.calls + 1,
    costUsd: totals.costUsd + costOf(promptTokens, candidatesTokens),
  };
}

/**
 * Imprime el costo de IA SOLO en los logs del servidor. Esta informacion
 * financiera nunca debe exponerse en el frontend (Junta / Presidente): se
 * acumula en el backend y se reporta unicamente por consola.
 */
export function logUsage(runUsage: AiUsage) {
  if (runUsage.calls === 0) return;
  console.info(
    `[ia-costo] corrida: ${runUsage.totalTokens} tokens / ` +
      `${runUsage.calls} llamada(s) / $${runUsage.costUsd.toFixed(6)} USD · ` +
      `acumulado: ${totals.totalTokens} tokens / ${totals.calls} llamada(s) / ` +
      `$${totals.costUsd.toFixed(6)} USD`,
  );
}

export function emptyUsage(): AiUsage {
  return {
    promptTokens: 0,
    candidatesTokens: 0,
    totalTokens: 0,
    calls: 0,
    costUsd: 0,
  };
}
