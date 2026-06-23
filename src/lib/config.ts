/**
 * Configuración central, leída exclusivamente en el servidor.
 * Ningún valor de este módulo debe importarse desde código `"use client"`.
 */

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value == null) return fallback;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function num(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export const config = {
  useMock: bool(process.env.USE_MOCK, true),

  soap: {
    wsdlUrl:
      process.env.SOAP_WSDL_URL ??
      "https://wsg.cdsisa.com.ar/wsAyC_server.php?wsdl",
    timeoutMs: num(process.env.SOAP_TIMEOUT_MS, 10_000),
    maxConcurrency: num(process.env.SOAP_MAX_CONCURRENCY, 4),
    cacheTtlSeconds: num(process.env.SOAP_CACHE_TTL_SECONDS, 900),
    user: process.env.SOAP_USER ?? "",
    password: process.env.SOAP_PASSWORD ?? "",
  },

  ai: {
    apiKey: process.env.GEMINI_API_KEY ?? "",
    model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
    // Precios en USD por 1.000.000 de tokens. VERIFICAR contra tarifario vigente.
    priceInputPerM: num(process.env.GEMINI_PRICE_INPUT_PER_M, 0.3),
    priceOutputPerM: num(process.env.GEMINI_PRICE_OUTPUT_PER_M, 2.5),
  },

  auth: {
    username: process.env.APP_USERNAME ?? "directorio",
    password: process.env.APP_PASSWORD ?? "",
    sessionSecret:
      process.env.SESSION_SECRET ?? "dev-insecure-secret-change-me",
  },
} as const;

export type AppConfig = typeof config;
