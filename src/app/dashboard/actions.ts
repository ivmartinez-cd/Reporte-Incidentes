"use server";

import { redirect } from "next/navigation";
import { clearSessionCookie } from "@/lib/auth/session";
import { listIncidents } from "@/lib/soap/incidents";
import { classifyIncidents } from "@/lib/ai/classify";
import { logUsage } from "@/lib/ai/costStore";

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}

/**
 * Refinamiento en segundo plano de la clasificacion. La pagina ya se renderizo
 * con el heuristico provisional; esta accion —disparada desde el cliente— si
 * llama a Gemini para los casos no cacheados, persiste el resultado en disco y
 * lo deja listo para el proximo render.
 *
 * `progressed` indica si se clasifico algo nuevo con IA. Si es false (p. ej.
 * Gemini saturado / 503 en todos los modelos), el cliente NO refresca y evita
 * un bucle: se queda con el heuristico y ofrece reintentar.
 */
export async function refineClassificationAction(
  empresaId: string,
  period: string,
): Promise<{ progressed: boolean }> {
  const raw = await listIncidents(empresaId, period);
  const { usage } = await classifyIncidents(raw); // useAi por defecto: llama a Gemini
  logUsage(usage);
  return { progressed: usage.calls > 0 };
}
