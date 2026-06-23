import "server-only";
import { config } from "@/lib/config";
import { cached } from "@/lib/cache";
import { callSoap, parseSoapJson } from "./client";
import { MOCK_EMPRESAS, mockIncidents } from "@/lib/data/mock";
import type { Empresa, Incident } from "@/lib/types";

/**
 * Capa de dominio sobre el SOAP. Cada función intenta el servicio real y, si
 * USE_MOCK está activo (o el servicio falla en modo demo), devuelve mock.
 *
 * Las respuestas del WSDL son strings JSON; los nombres de campos del servicio
 * real pueden variar, por eso normalizamos con acceso defensivo (`pick`).
 */

function pick(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k] ?? obj[k.toLowerCase()] ?? obj[k.toUpperCase()];
    if (v != null && v !== "") return String(v);
  }
  return undefined;
}

export async function listEmpresas(): Promise<Empresa[]> {
  if (config.useMock) return MOCK_EMPRESAS;

  return cached("dom:empresas", config.soap.cacheTtlSeconds, async () => {
    const raw = await callSoap("getEmpresas", { usuario_id: config.soap.user });
    const rows = parseSoapJson<Record<string, unknown>[]>(raw, []);
    const mapped = rows.map((r) => ({
      id: pick(r, ["id", "IdEmpresa", "empresa_id"]) ?? "",
      nombre: pick(r, ["nombre", "razon_social", "Empresa", "name"]) ?? "—",
    }));
    return mapped.length ? mapped : MOCK_EMPRESAS;
  });
}

export async function listIncidents(
  empresaId: string,
  period: string,
): Promise<Incident[]> {
  if (config.useMock) return mockIncidents(empresaId, period);

  const key = `dom:incidents:${empresaId}:${period}`;
  return cached(key, config.soap.cacheTtlSeconds, async () => {
    // getTopIncidents(IdEmpresa, IdSucursal, IdSector, OrderBy, Top, IdEstado)
    const raw = await callSoap("getTopIncidents", {
      IdEmpresa: empresaId,
      IdSucursal: "",
      IdSector: "",
      OrderBy: "fecha",
      Top: "500",
      IdEstado: "",
    });
    const rows = parseSoapJson<Record<string, unknown>[]>(raw, []);
    const empresa = (await listEmpresas()).find((e) => e.id === empresaId);

    const incidents: Incident[] = rows.map((r) => ({
      id: pick(r, ["id", "IdIncidente", "incident_id"]) ?? "",
      numero: pick(r, ["numero", "Numero", "nro"]) ?? "",
      fecha: (pick(r, ["fecha", "Fecha", "fecha_alta"]) ?? "").slice(0, 10),
      empresaId,
      empresaNombre: empresa?.nombre ?? "",
      sucursal: pick(r, ["sucursal", "Sucursal"]),
      maquina: pick(r, ["maquina", "Maquina", "serie"]),
      estado: pick(r, ["estado", "Estado"]),
      descripcion:
        pick(r, ["descripcion", "Descripcion", "detalle", "motivo"]) ?? "",
      costo: Number(pick(r, ["costo", "Costo", "importe"]) ?? 0) || undefined,
    }));

    // Filtrado por período (YYYY-MM) del lado del dominio.
    return incidents.filter((i) => i.fecha.startsWith(period));
  });
}
