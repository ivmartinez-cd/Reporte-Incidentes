import "server-only";
import { config } from "@/lib/config";
import { cached } from "@/lib/cache";
import { callSoap } from "./client";
import { pick, unwrapRow, toIsoDate, isBlank, parseSoapJson } from "./normalize";
import { MOCK_EMPRESAS, mockIncidents } from "@/lib/data/mock";
import type { Empresa, Incident, IncidentJob } from "@/lib/types";
import { calcCheckDigit } from "@/lib/format";

/**
 * Capa de dominio sobre el SOAP. Cada funcion intenta el servicio real y, si
 * USE_MOCK esta activo (o el servicio falla en modo demo), devuelve mock.
 *
 * Las respuestas del WSDL son strings JSON; los nombres de campos del servicio
 * real pueden variar, por eso normalizamos con acceso defensivo (`pick`). Los
 * helpers de parseo viven en `./normalize` (puros y testeados aparte).
 */

/**
 * Trae la bitacora de trabajo del tecnico (`getIncidentJobs`). Cada fila viene
 * como `{Job:{Descripcion, Observ}}` y muchas estan en blanco. Devolvemos las
 * entradas con contenido y una `solucion` derivada (texto plano), donde la
 * ultima descripcion con contenido suele ser la resolucion final.
 */
async function fetchIncidentJobs(
  id: string,
): Promise<{ trabajos: IncidentJob[]; solucion?: string; observaciones?: string }> {
  if (!id) return { trabajos: [] };
  const raw = await callSoap("getIncidentJobs", { id });
  const rows = parseSoapJson<Record<string, unknown>[]>(raw, []);

  const trabajos: IncidentJob[] = rows
    .map((row) => {
      const r = unwrapRow(row, "Job");
      const descripcion = pick(r, ["Descripcion", "descripcion"]);
      const observ = pick(r, ["Observ", "observ", "Observacion"]);
      return {
        descripcion: isBlank(descripcion) ? "" : descripcion!.trim(),
        observ: isBlank(observ) ? undefined : observ!.trim(),
      };
    })
    .filter((j) => j.descripcion || j.observ);

  // La solucion de soporte tecnico debe ser estrictamente lo que describio el tecnico
  const descripciones = trabajos.map((j) => j.descripcion).filter(Boolean);
  const solucion = descripciones.length ? descripciones.join(" · ") : undefined;

  // Las observaciones reportadas (frecuentemente del cliente) se acumulan por separado
  const obsList = trabajos.map((j) => j.observ).filter(Boolean);
  const observaciones = obsList.length ? obsList.join(" · ") : undefined;

  return { trabajos, solucion, observaciones };
}

/**
 * Trae datos extra del incidente via `getIncidentById` que NO vienen en el
 * listado: principalmente la `Causa` diagnosticada, el `Tecnico` y el cierre.
 */
async function fetchIncidentExtra(
  id: string,
): Promise<Pick<Incident, "causa" | "tecnico" | "fechaCierre" | "tipoTrabajo">> {
  if (!id) return {};
  const raw = await callSoap("getIncidentById", { id });
  const parsed = parseSoapJson<Record<string, unknown>>(raw, {});
  // getIncidentById devuelve un objeto unico (no arreglo) anidado bajo `Incident`.
  const node = Array.isArray(parsed) ? parsed[0] : parsed;
  const r = unwrapRow(node as Record<string, unknown>, "Incident");
  return {
    causa: pick(r, ["Causa", "causa"]),
    tecnico: pick(r, ["Tecnico", "tecnico", "Prestador"]),
    fechaCierre: toIsoDate(pick(r, ["FechaCierre", "fecha_cierre"])) || undefined,
    tipoTrabajo: pick(r, ["Tipo", "tipo"]),
  };
}

export async function listEmpresas(): Promise<Empresa[]> {
  if (config.useMock) return MOCK_EMPRESAS;

  return cached("dom:empresas", config.soap.empresasCacheTtlSeconds, async () => {
    // usuario_id vacio => el servicio devuelve TODOS los clientes.
    const raw = await callSoap("getEmpresas", { usuario_id: config.soap.user });
    const rows = parseSoapJson<Record<string, unknown>[]>(raw, []);
    
    // Obtenemos la fecha de hoy en formato YYYYMMDD para comparar con las fechas de restricción
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");

    const mapped = rows
      .map((row) => {
        const r = unwrapRow(row, "Empresa");
        const restrictionDate = pick(r, ["FechaRestriccionServicio"]) ?? "19990101";
        // Es activo si la restricción es el placeholder "19990101" o es una fecha futura
        const isActive = restrictionDate === "19990101" || restrictionDate >= todayStr;
        
        return {
          id: pick(r, ["id", "IdEmpresa", "empresa_id"]) ?? "",
          nombre:
            pick(r, ["Nombre", "nombre", "RazonSocial", "razon_social", "name"]) ??
            "—",
          activa: isActive,
        };
      })
      .filter((e) => e.id && e.activa) // Filtrar solo clientes activos
      .map(({ id, nombre }) => ({ id, nombre })); // Retornar tipo Empresa limpio
      
    return mapped.length ? mapped : MOCK_EMPRESAS;
  });
}

export async function listIncidents(
  empresaId: string,
  period: string,
  limit: number = config.soap.testIncidentLimit,
): Promise<Incident[]> {
  if (config.useMock) return mockIncidents(empresaId, period);

  // `getTopIncidents` ordena por mas reciente y recien despues filtramos por
  // periodo del lado del dominio. Para periodos viejos hay que pedir un `Top`
  // mas grande (via `limit`) para que la ventana alcance ese mes; el costo de
  // enriquecimiento NO sube (solo enriquecemos los incidentes del periodo).
  const key = `dom:incidents:${empresaId}:${period}:${limit}`;
  return cached(key, config.soap.cacheTtlSeconds, async () => {
    // getTopIncidents(IdEmpresa, IdSucursal, IdSector, OrderBy, Top, IdEstado)
    // Limite de prueba: pedimos solo `Top` filas al WSDL para no agotar recursos.
    // (La operacion no acepta filtro por fecha; ordenamos por fecha desc y
    //  filtramos el periodo del lado del dominio.)
    // OrderBy vacio => el servicio ordena por mas reciente primero (los valores
    // tipo "fecha" no ordenan correctamente en este WSDL).
    const raw = await callSoap("getTopIncidents", {
      IdEmpresa: empresaId,
      IdSucursal: "",
      IdSector: "",
      OrderBy: "",
      Top: String(limit),
      IdEstado: "",
    });
    const rows = parseSoapJson<Record<string, unknown>[]>(raw, []);
    const empresa = (await listEmpresas()).find((e) => e.id === empresaId);

    const incidents: Incident[] = rows.map((row) => {
      const r = unwrapRow(row, "Incident");
      return {
        id: pick(r, ["id", "IdIncidente", "incident_id"]) ?? "",
        numero: (() => {
          const rawNum = pick(r, ["NroIncidente", "numero", "Numero", "nro"]) ?? "";
          const cd = calcCheckDigit(rawNum);
          return cd ? `${rawNum}-${cd}` : rawNum;
        })(),
        fecha: toIsoDate(pick(r, ["Fecha", "fecha", "fecha_alta"])),
        empresaId,
        empresaNombre: empresa?.nombre ?? pick(r, ["Empresa", "RazonSocial"]) ?? "",
        sucursal: pick(r, ["Sucursal", "sucursal"]),
        maquina: pick(r, ["NroSerie", "maquina", "Maquina", "serie"]),
        // Preferimos el estado "web" (Resuelto/...) que es el orientado a cliente.
        estado: pick(r, ["EstadoWeb", "Estado", "estado"]),
        // El listado no trae descripcion larga; usamos el Motivo y, si falta,
        // el articulo/tipo como contexto para la tipificacion por IA.
        descripcion:
          pick(r, ["Motivo", "descripcion", "Descripcion", "detalle"]) ??
          pick(r, ["Articulo", "ArtGen", "Tipo"]) ??
          "",
        costo: Number(pick(r, ["Costo", "costo", "importe"]) ?? 0) || undefined,
        // Campos extra que YA vienen en el listado (sin llamada adicional):
        solicitante: pick(r, ["Solicitante", "solicitante"]),
        tipoTrabajo: pick(r, ["Tipo", "tipo"]),
        articulo: pick(r, ["Articulo", "ArtGen", "articulo"]),
        fechaCierre: toIsoDate(pick(r, ["FechaCierre", "fecha_cierre", "FechaResolucion", "fecha_resolucion", "fecha_fin", "FechaFin"])) || undefined,
      };
    });

    // Filtrado por periodo (YYYY-MM) del lado del dominio y por estado cerrado/resuelto.
    const pageItems = incidents.filter((i) => {
      const isClosed = i.estado === "Resuelto" || i.estado === "Cerrado";
      return i.fecha.startsWith(period) && isClosed;
    });

    // Enriquecimiento por incidente (solucion del tecnico + causa raiz). Se hace
    // DESPUES del slice para no disparar 2×N llamadas sobre todo el listado.
    // Cada callSoap ya pasa por el limitador de concurrencia y la cache.
    return Promise.all(
      pageItems.map(async (inc) => {
        const [jobs, extra] = await Promise.all([
          fetchIncidentJobs(inc.id),
          fetchIncidentExtra(inc.id),
        ]);

        // Combinamos el Motivo del listado con el detalle del cliente si existe en las observaciones
        let descripcionCompleta = inc.descripcion;
        if (jobs.observaciones && !inc.descripcion.includes(jobs.observaciones)) {
          descripcionCompleta = inc.descripcion
            ? `${inc.descripcion} — ${jobs.observaciones}`
            : jobs.observaciones;
        }

        return {
          ...inc,
          trabajos: jobs.trabajos,
          solucion: jobs.solucion,
          descripcion: descripcionCompleta,
          causa: extra.causa,
          tecnico: extra.tecnico,
          tipoTrabajo: inc.tipoTrabajo ?? extra.tipoTrabajo,
          fechaCierre: inc.fechaCierre ?? extra.fechaCierre,
        };
      }),
    );
  });
}
