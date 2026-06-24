/**
 * Helpers puros de normalizacion de las respuestas del WSDL wsAyC.
 *
 * Se mantienen separados del cliente SOAP (que es `server-only` y depende de
 * Node) para que la logica de parseo —la parte mas fragil, donde el servicio
 * mas sorprende— sea testeable de forma aislada y sin efectos secundarios.
 */

/**
 * Desenvuelve el valor de retorno de node-soap hasta el string JSON real.
 * Maneja: string directo, wrapper `{ $value }` (xsd:string RPC/encoded),
 * claves de retorno conocidas (Respuesta/Result/return) y wrappers de un
 * unico nombre de retorno.
 */
export function unwrapSoapValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value !== "object") return String(value);

  const obj = value as Record<string, unknown>;
  if ("$value" in obj) return unwrapSoapValue(obj.$value);

  const named = obj.Respuesta ?? obj.Result ?? obj.return;
  if (named !== undefined) return unwrapSoapValue(named);

  // RPC/encoded suele anidar el payload bajo un unico nombre de retorno.
  const keys = Object.keys(obj).filter((k) => k !== "attributes");
  if (keys.length === 1) return unwrapSoapValue(obj[keys[0]]);

  return JSON.stringify(obj);
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

/**
 * Lee el primer valor no vacio entre varias claves candidatas (tolerante a
 * mayusculas/minusculas). El WSDL no es consistente con los nombres de campo.
 */
export function pick(
  obj: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const k of keys) {
    const v = obj[k] ?? obj[k.toLowerCase()] ?? obj[k.toUpperCase()];
    if (v != null && v !== "" && String(v).trim() !== "") return String(v).trim();
  }
  return undefined;
}

/** El servicio anida cada fila bajo una clave unica (`Empresa`, `Incident`…). */
export function unwrapRow(
  row: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  const inner = row[key];
  return inner && typeof inner === "object"
    ? (inner as Record<string, unknown>)
    : row;
}

/** Convierte fechas `DD/MM/YYYY[ HH:MM:SS]` del servicio a ISO `YYYY-MM-DD`. */
export function toIsoDate(raw?: string): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (trimmed.startsWith("01/01/1900") || trimmed.startsWith("1900-01-01")) return "";
  const m = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const iso = trimmed.slice(0, 10);
  if (iso === "1900-01-01") return "";
  return iso;
}

/**
 * El WSDL suele rellenar campos vacios con `" "`, `"-"` o cadenas en blanco en
 * lugar de omitirlos. Esto detecta esos "vacios del servicio".
 */
export function isBlank(s?: string): boolean {
  if (s == null) return true;
  const t = s.replace(/[\s,.\-]/g, "");
  return t === "";
}
