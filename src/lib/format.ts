/** Helpers de formato (seguros para cliente y servidor). */

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function periodLabel(period: string): string {
  const [y, m] = period.split("-").map(Number);
  return `${MESES[(m ?? 1) - 1] ?? ""} ${y ?? ""}`;
}

export function formatInt(value: number): string {
  return new Intl.NumberFormat("es-AR").format(value);
}

/** Calcula el digito verificador usando ponderacion EAN/UPC (pesos alternados 3 y 1, mod 10). */
export function calcCheckDigit(numStr: string): string {
  const clean = numStr.replace(/\D/g, "");
  if (!clean) return "";
  let sum = 0;
  for (let i = 0; i < clean.length; i++) {
    const weight = i % 2 === 0 ? 3 : 1;
    sum += Number(clean[i]) * weight;
  }
  return String((10 - (sum % 10)) % 10);
}

/** Lista de los ultimos N periodos "YYYY-MM" hasta el mes indicado (o actual). */
export function recentPeriods(count = 12, from?: Date): string[] {
  const base = from ?? new Date();
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}
