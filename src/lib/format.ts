/** Helpers de formato (seguros para cliente y servidor). */

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function periodLabel(period: string): string {
  const [y, m] = period.split("-").map(Number);
  return `${MESES[(m ?? 1) - 1] ?? ""} ${y ?? ""}`;
}

export function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: value < 1 ? 4 : 2,
  }).format(value);
}

export function formatArs(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatInt(value: number): string {
  return new Intl.NumberFormat("es-AR").format(value);
}

/** Lista de los últimos N períodos "YYYY-MM" hasta el mes indicado (o actual). */
export function recentPeriods(count = 12, from?: Date): string[] {
  const base = from ?? new Date();
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}
