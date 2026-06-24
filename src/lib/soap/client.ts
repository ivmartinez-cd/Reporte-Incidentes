import "server-only";
import * as soap from "soap";
import { config } from "@/lib/config";
import { cached } from "@/lib/cache";
import { createLimiter, withRetry } from "@/lib/concurrency";
import { unwrapSoapValue } from "./normalize";

/**
 * Cliente SOAP unico por proceso (Singleton real). El WSDL es pesado: hay que
 * descargarlo y parsear su XML. Eso debe ocurrir UNA sola vez por proceso y NO
 * expirar por TTL ni recrearse en cada request/recarga de pagina.
 *
 * Guardamos la PROMESA de creacion (no solo el cliente) para que multiples
 * requests concurrentes durante el arranque compartan la misma inicializacion
 * en vuelo. Si la creacion falla, descartamos la promesa para poder reintentar.
 *
 * Todas las llamadas pasan por un limitador de concurrencia para no saturar el
 * servicio (Sistemas monitorea el consumo).
 */

const limit = createLimiter(config.soap.maxConcurrency);

let clientPromise: Promise<soap.Client> | null = null;

function getClient(): Promise<soap.Client> {
  if (!clientPromise) {
    clientPromise = (async () => {
      const client = await soap.createClientAsync(config.soap.wsdlUrl, {
        wsdl_options: { timeout: config.soap.timeoutMs },
      });
      client.setEndpoint(config.soap.wsdlUrl.replace(/\?wsdl$/i, ""));
      return client;
    })().catch((err) => {
      clientPromise = null; // permitir recrear en el proximo intento
      throw err;
    });
  }
  return clientPromise;
}

/**
 * Invoca una operacion del WSDL con timeout estricto, reintentos con backoff
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
            throw new Error(`Operacion SOAP desconocida: ${operation}`);
          }
          const result = (await withTimeout(
            (method as (a: unknown) => Promise<unknown>).call(client, args),
            config.soap.timeoutMs,
            operation,
          )) as unknown[];

          // node-soap devuelve [result, rawResponse, soapHeader, rawRequest].
          // El servicio (RPC/encoded) envuelve el string de retorno en un objeto
          // `{ attributes, $value }` y, a veces, bajo un nombre de retorno. Por
          // eso desenvolvemos recursivamente hasta llegar al string JSON.
          return unwrapSoapValue(result?.[0]);
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
