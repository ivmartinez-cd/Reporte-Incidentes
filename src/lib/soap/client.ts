import "server-only";
import * as soap from "soap";
import { config } from "@/lib/config";
import { cached } from "@/lib/cache";
import { createLimiter, withRetry } from "@/lib/concurrency";

/**
 * Cliente SOAP único y cacheado. El WSDL se descarga una sola vez por proceso
 * (cacheado vía `cached`), y todas las llamadas pasan por un limitador de
 * concurrencia para no saturar el servicio (Sistemas monitorea el consumo).
 */

const limit = createLimiter(config.soap.maxConcurrency);

async function getClient(): Promise<soap.Client> {
  return cached("soap:client", config.soap.cacheTtlSeconds, async () => {
    const client = await soap.createClientAsync(config.soap.wsdlUrl, {
      wsdl_options: { timeout: config.soap.timeoutMs },
    });
    client.setEndpoint(config.soap.wsdlUrl.replace(/\?wsdl$/i, ""));
    return client;
  });
}

/**
 * Invoca una operación del WSDL con timeout estricto, reintentos con backoff
 * y concurrencia limitada. El resultado SOAP crudo se cachea por `cacheTtl`.
 *
 * El servicio devuelve cada respuesta como un `xsd:string` que envuelve JSON;
 * por eso devolvemos el string crudo y lo parseamos en la capa de dominio.
 */
export async function callSoap(
  operation: string,
  args: Record<string, string>,
  opts: { cacheTtlSeconds?: number } = {},
): Promise<string> {
  const ttl = opts.cacheTtlSeconds ?? config.soap.cacheTtlSeconds;
  const cacheKey = `soap:${operation}:${JSON.stringify(args)}`;

  return cached(cacheKey, ttl, () =>
    limit(() =>
      withRetry(
        async () => {
          const client = await getClient();
          const method = (client as unknown as Record<string, unknown>)[
            `${operation}Async`
          ];
          if (typeof method !== "function") {
            throw new Error(`Operación SOAP desconocida: ${operation}`);
          }
          const result = (await withTimeout(
            (method as (a: unknown) => Promise<unknown>).call(client, args),
            config.soap.timeoutMs,
            operation,
          )) as unknown[];

          // node-soap devuelve [result, rawResponse, soapHeader, rawRequest].
          const payload = (result?.[0] ?? {}) as Record<string, unknown>;
          const value = payload.Respuesta ?? payload.Result ?? payload.return;
          return typeof value === "string" ? value : JSON.stringify(value ?? "");
        },
        { label: operation },
      ),
    ),
  );
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error(`Timeout SOAP (${ms}ms) en ${label}`)),
      ms,
    );
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

/** Parsea el JSON embebido en la respuesta string del SOAP, tolerante a fallos. */
export function parseSoapJson<T>(raw: string, fallback: T): T {
  try {
    const trimmed = raw.trim();
    if (!trimmed) return fallback;
    return JSON.parse(trimmed) as T;
  } catch {
    console.warn("[soap] no se pudo parsear JSON de la respuesta");
    return fallback;
  }
}
