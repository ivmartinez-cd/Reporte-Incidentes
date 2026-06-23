import NodeCache from "node-cache";

/**
 * Caché en memoria, compartida por proceso. Protege al servicio SOAP de
 * llamadas repetidas dentro de la misma sesión / ventana de tiempo.
 *
 * `checkperiod` corre el barrido de expirados cada 2 min. `useClones: false`
 * evita copiar estructuras grandes (devolvemos la misma referencia cacheada).
 */
const store = new NodeCache({ checkperiod: 120, useClones: false });

/**
 * Devuelve el valor cacheado bajo `key`, o ejecuta `producer`, cachea su
 * resultado por `ttlSeconds` y lo devuelve. Las llamadas concurrentes a la
 * misma key comparten la misma promesa en vuelo (evita "stampede" sobre SOAP).
 */
const inflight = new Map<string, Promise<unknown>>();

export async function cached<T>(
  key: string,
  ttlSeconds: number,
  producer: () => Promise<T>,
): Promise<T> {
  const hit = store.get<T>(key);
  if (hit !== undefined) return hit;

  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const promise = (async () => {
    try {
      const value = await producer();
      store.set(key, value, ttlSeconds);
      return value;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}

export function invalidate(prefix?: string): void {
  if (!prefix) {
    store.flushAll();
    return;
  }
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.del(key);
  }
}

export function cacheStats() {
  return { keyCount: store.keys().length, ...store.getStats() };
}
