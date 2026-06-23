/**
 * Limitador de concurrencia mínimo (semáforo), sin dependencias externas.
 * Evita disparar más de `max` operaciones SOAP en paralelo.
 */
export function createLimiter(max: number) {
  let active = 0;
  const queue: Array<() => void> = [];

  const next = () => {
    if (active >= max) return;
    const run = queue.shift();
    if (run) {
      active++;
      run();
    }
  };

  return function limit<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const run = () => {
        fn()
          .then(resolve, reject)
          .finally(() => {
            active--;
            next();
          });
      };
      queue.push(run);
      next();
    });
  };
}

/**
 * Reintentos con backoff exponencial + jitter. Reintenta sólo errores
 * transitorios (timeouts / 5xx / red), nunca errores de validación.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { retries?: number; baseDelayMs?: number; label?: string } = {},
): Promise<T> {
  const { retries = 3, baseDelayMs = 400, label = "op" } = opts;
  let lastErr: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === retries || !isTransient(err)) break;
      const delay =
        baseDelayMs * 2 ** attempt + Math.floor(Math.random() * 200);
      console.warn(
        `[retry] ${label} intento ${attempt + 1}/${retries} falló; reintento en ${delay}ms`,
      );
      await sleep(delay);
    }
  }
  throw lastErr;
}

function isTransient(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes("timeout") ||
    msg.includes("etimedout") ||
    msg.includes("econnreset") ||
    msg.includes("econnrefused") ||
    msg.includes("socket hang up") ||
    msg.includes("network") ||
    /\b5\d\d\b/.test(msg)
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
