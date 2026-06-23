import "server-only";
import { config } from "@/lib/config";
import type { AiUsage } from "@/lib/types";

/**
 * Acumulador de uso/costo de IA en memoria (por proceso). Se reinicia al
 * reiniciar el servidor — suficiente para un panel interno. Para histórico
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

export function getTotals(): AiUsage {
  return { ...totals };
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
