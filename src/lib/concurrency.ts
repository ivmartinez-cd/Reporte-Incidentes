/**
 * Limitador de concurrencia minimo (semaforo), sin dependencias externas.
 * Evita disparar mas de `max` operaciones SOAP en paralelo.
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
 * Reintentos con backoff exponencial + jitter. Reintenta solo errores
 * transitorios (timeouts / 5xx / red), nunca errores de validacion.
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
      const reason = err instanceof Error ? err.message : String(err);
      console.warn(
        `[retry] ${label} intento ${attempt + 1}/${retries} fallo (${reason}); reintento en ${delay}ms`,
      );
      await sleep(delay);
    }
  }
  throw lastErr;
}

function isTransient(err: unknown): boolean {
  if (!err) return false;
  
  let msg = "";
  if (err instanceof Error) {
    msg = err.message;
  } else if (typeof err === "object") {
    try {
      msg = JSON.stringify(err);
    } catch {
      msg = String(err);
    }
  } else {
    msg = String(err);
  }
  msg = msg.toLowerCase();

  let code: number | undefined;
  if (typeof err === "object" && err !== null) {
    const e = err as any;
    code = e.status ?? e.statusCode ?? e.code ?? e.error?.code ?? e.error?.status;
  }

  const isTransientCode = code === 429 || code === 503 || code === 504 || code === 502 || code === 500;

  return (
    isTransientCode ||
    msg.includes("timeout") ||
    msg.includes("etimedout") ||
    msg.includes("econnreset") ||
    msg.includes("econnrefused") ||
    msg.includes("socket hang up") ||
    msg.includes("network") ||
    msg.includes("503") ||
    msg.includes("504") ||
    msg.includes("429") ||
    msg.includes("unavailable") ||
    msg.includes("high demand") ||
    msg.includes("temporary") ||
    msg.includes("quota") ||
    msg.includes("limit") ||
    /\b5\d\d\b/.test(msg)
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
