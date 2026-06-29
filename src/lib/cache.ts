import NodeCache from "node-cache";

/**
 * Cache en memoria, compartida por proceso. Protege al servicio SOAP de
 * llamadas repetidas dentro de la misma sesion / ventana de tiempo.
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

/** Lectura directa de la cache (sin producer). `undefined` si no hay valor. */
export function cacheGet<T>(key: string): T | undefined {
  return store.get<T>(key);
}

/** Escritura directa en la cache. Para cachear condicionalmente desde el caller. */
export function cacheSet<T>(key: string, value: T, ttlSeconds: number): void {
  store.set(key, value, ttlSeconds);
}

/** Borra una entrada de la cache (para invalidar tras una correccion manual). */
export function cacheDelete(key: string): void {
  store.del(key);
}

/** Borra todas las entradas cuya clave empieza con el prefijo dado. */
export function cacheDeletePrefix(prefix: string): void {
  const keys = store.keys().filter((k) => k.startsWith(prefix));
  if (keys.length) store.del(keys);
}
