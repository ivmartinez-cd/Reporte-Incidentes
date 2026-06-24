/**
 * Configuracion central, leida exclusivamente en el servidor.
 * Ningun valor de este modulo debe importarse desde codigo `"use client"`.
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
    // La lista de clientes (464 empresas) practicamente no cambia: cache propia
    // y mas larga (1h, muy por encima del minimo de 15 min) para no re-llamar al
    // WSLA en cada navegacion entre clientes/periodos.
    empresasCacheTtlSeconds: num(
      process.env.SOAP_EMPRESAS_CACHE_TTL_SECONDS,
      3600,
    ),
    user: process.env.SOAP_USER ?? "",
    password: process.env.SOAP_PASSWORD ?? "",
    // Limite de prueba: maximo de incidentes a traer por cliente/mes para no
    // agotar recursos del WSDL durante las pruebas. Subir/quitar en produccion.
    testIncidentLimit: num(process.env.SOAP_TEST_INCIDENT_LIMIT, 500),
  },

  ai: {
    apiKey: process.env.GEMINI_API_KEY ?? "",
    model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
    // Modelo de respaldo para cuando el principal devuelve 503 (sobrecarga de
    // Google). El lite esta en infraestructura menos congestionada y es mas
    // barato; preferimos clasificar con el antes que caer al heuristico.
    fallbackModel: process.env.GEMINI_FALLBACK_MODEL ?? "gemini-2.5-flash-lite",
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
