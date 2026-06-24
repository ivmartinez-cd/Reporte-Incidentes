import "server-only";
import type { Empresa, Incident, IncidentJob } from "@/lib/types";
import { calcCheckDigit } from "@/lib/format";

/**
 * Datos simulados realistas para demos y desarrollo sin tocar el SOAP.
 * Se activan con USE_MOCK=true. Las descripciones estan redactadas para que la
 * tipificacion con IA produzca categorias variadas, y cada caso incluye la
 * causa y la SOLUCION/trabajos del tecnico para mostrarlas en el detalle.
 */

export const MOCK_EMPRESAS: Empresa[] = [
  { id: "1001", nombre: "Banco del Litoral S.A." },
  { id: "1002", nombre: "Farmacias Vida Plena" },
  { id: "1003", nombre: "Municipalidad de San Rafael" },
  { id: "1004", nombre: "Grupo Logistico Andes" },
];

/** Caso completo: lo que reporto el cliente + lo que hizo el tecnico. */
interface MockCase {
  /** Descripcion/Motivo cargado por el cliente. */
  descripcion: string;
  /** Causa raiz diagnosticada por el tecnico. */
  causa: string;
  /** Bitacora de trabajo del tecnico. */
  trabajos: IncidentJob[];
}

const CASOS: MockCase[] = [
  {
    descripcion:
      "La impresora muestra atasco de papel recurrente en la bandeja 2, el usuario retira hojas arrugadas varias veces al dia.",
    causa: "MEC - Rodillo de arrastre desgastado",
    trabajos: [
      { descripcion: "Se inspecciona bandeja 2 y trayecto de papel." },
      {
        descripcion:
          "Se reemplaza el rodillo de arrastre y se realiza limpieza del trayecto. Pruebas de impresion OK.",
        observ: "Repuesto despachado por CD.",
      },
    ],
  },
  {
    descripcion:
      "El equipo no responde a los trabajos de impresion enviados desde la red, error de servicio general en el area de caja.",
    causa: "RED - Configuracion de IP",
    trabajos: [
      {
        descripcion:
          "Se detecta cambio de subred. Se reconfigura IP fija y cola de impresion. Servicio restablecido.",
      },
    ],
  },
  {
    descripcion:
      "Caida total del servicio de impresion en toda la sucursal, operaciones detenidas, requiere atencion urgente.",
    causa: "HW - Fuente de poder",
    trabajos: [
      { descripcion: "Equipo no enciende.", observ: "Visita de urgencia." },
      {
        descripcion:
          "Se reemplaza fuente de poder del servidor de impresion. Servicio restablecido y validado con el cliente.",
      },
    ],
  },
  {
    descripcion:
      "Solicitan configurar la cola de impresion en tres puestos nuevos del sector administracion.",
    causa: "INST - Alta de puestos",
    trabajos: [
      {
        descripcion:
          "Se instala el driver y se configura la cola de impresion en los 3 puestos. Capacitacion breve al usuario.",
      },
    ],
  },
  {
    descripcion:
      "El driver del equipo arroja error al actualizar, falla de software tras la actualizacion de Windows.",
    causa: "SW - Driver incompatible",
    trabajos: [
      {
        descripcion:
          "Se desinstala el driver danado y se instala la version compatible con la actualizacion de Windows. Funciona OK.",
      },
    ],
  },
  {
    descripcion:
      "El usuario no encuentra la opcion de impresion doble faz, consulta de configuracion y uso.",
    causa: "USO - Consulta de configuracion",
    trabajos: [
      {
        descripcion:
          "Se configura doble faz por defecto y se explica al usuario como activarlo desde el driver.",
      },
    ],
  },
  {
    descripcion:
      "El toner se agota muy rapido y aparece aviso de insumo defectuoso, las copias salen con manchas.",
    causa: "TN - Toner defectuoso",
    trabajos: [
      {
        descripcion:
          "Se reemplaza el toner por uno nuevo y se realiza limpieza interna. Calidad de copia normalizada.",
        observ: "Insumo enviado por CD.",
      },
    ],
  },
  {
    descripcion:
      "Se requiere desinstalar el equipo antiguo e instalar la nueva multifuncion en recepcion.",
    causa: "INST - Recambio de equipo",
    trabajos: [
      {
        descripcion:
          "Se retira el equipo antiguo, se instala y configura la nueva multifuncion en red. Pruebas OK.",
      },
    ],
  },
  // ── DISCREPANCIA: cliente reporta atasco, la causa real es el insumo ──
  {
    descripcion:
      "Hojas arrugadas trabadas en el fusor, atasco constante que frena la facturacion.",
    causa: "TN - Toner",
    trabajos: [
      {
        descripcion:
          "Se solicita al usuario un video del comportamiento. Se realizan chequeos basicos por atasco (codigo 13.B2).",
      },
      {
        descripcion:
          "El atasco se produce por defecto en el cartucho. Se reemplaza el mismo, mantenimiento y limpieza. Equipo operativo.",
        observ: "Insumo enviado por CD.",
      },
    ],
  },
  {
    descripcion:
      "Error critico: el servidor de impresion dejo de responder y afecta a 40 usuarios simultaneamente.",
    causa: "SW - Servicio de cola detenido",
    trabajos: [
      {
        descripcion:
          "Se reinicia el spooler y se reestablece el servicio de cola. Se programa monitoreo. Servicio normalizado.",
      },
    ],
  },
  {
    descripcion:
      "Piden agregar la impresora de red al equipo del nuevo empleado de tesoreria.",
    causa: "INST - Alta de puesto",
    trabajos: [
      {
        descripcion:
          "Se agrega la impresora de red al equipo del nuevo usuario y se valida impresion.",
      },
    ],
  },
  // ── DISCREPANCIA: cliente cree firmware, era hardware ──
  {
    descripcion:
      "La pantalla del panel queda congelada, parece un problema de firmware/software del equipo.",
    causa: "HW - Panel tactil danado",
    trabajos: [
      { descripcion: "Se intenta actualizacion de firmware sin exito." },
      {
        descripcion:
          "Se diagnostica falla fisica del panel tactil. Se reemplaza el panel. Equipo operativo.",
      },
    ],
  },
  {
    descripcion:
      "Las impresiones salen muy claras pese a cambiar el cartucho, posible insumo de baja calidad.",
    causa: "TN - Cartucho",
    trabajos: [
      {
        descripcion:
          "Se reemplaza el cartucho por uno original y se calibra densidad de impresion. Calidad normalizada.",
      },
    ],
  },
  {
    descripcion:
      "Consulta sobre como escanear a correo electronico, el usuario no sabe usar la funcion.",
    causa: "USO - Capacitacion",
    trabajos: [
      {
        descripcion:
          "Se configura el escaneo a correo y se capacita al usuario en el procedimiento.",
      },
    ],
  },
  {
    descripcion:
      "Error de servicio intermitente: la impresora se desconecta de la red cada pocas horas.",
    causa: "RED - Cable de red",
    trabajos: [
      {
        descripcion:
          "Se detecta cable de red en mal estado. Se reemplaza el cable. Conexion estable tras 24 h de monitoreo.",
      },
    ],
  },
];

const ESTADOS = ["Abierto", "En curso", "Resuelto", "Cerrado"];
const TECNICOS = [
  "PST Centro - Soporte Tecnico S.A.",
  "PST Norte - Servicios Integrales",
  "Equipo Interno CD",
];
const SUCURSALES = ["Casa Central", "Sucursal Norte", "Sucursal Sur", "Deposito"];

/** Texto plano de la solucion a partir de la bitacora (ultima con contenido). */
function solucionDe(trabajos: IncidentJob[]): string {
  const desc = trabajos.map((t) => t.descripcion).filter(Boolean);
  return desc.join(" · ");
}

/** Genera incidentes deterministas para una empresa/periodo. */
export function mockIncidents(empresaId: string, period: string): Incident[] {
  const empresa = MOCK_EMPRESAS.find((e) => e.id === empresaId);
  if (!empresa) return [];
  const [year, month] = period.split("-").map(Number);
  const seed = Number(empresaId) + year + month;
  const count = 18 + (seed % 22); // 18–39 incidentes

  const out: Incident[] = [];
  for (let i = 0; i < count; i++) {
    const r = (seed * (i + 7)) % CASOS.length;
    const caso = CASOS[r];
    const day = 1 + ((seed * (i + 3)) % 27);
    const estado = ESTADOS[(seed + i) % ESTADOS.length];
    const resuelto = estado === "Resuelto" || estado === "Cerrado";
    if (!resuelto) continue; // Solo traer incidentes resueltos/cerrados
    const rawNum = `INC-${period.replace("-", "")}-${String(i + 1).padStart(4, "0")}`;
    const cd = calcCheckDigit(rawNum);
    out.push({
      id: `${empresaId}-${period}-${i + 1}`,
      numero: cd ? `${rawNum}-${cd}` : rawNum,
      fecha: `${period}-${String(day).padStart(2, "0")}`,
      empresaId,
      empresaNombre: empresa.nombre,
      sucursal: SUCURSALES[(seed + i) % SUCURSALES.length],
      maquina: `MFP-${1000 + ((seed + i) % 60)}`,
      estado,
      descripcion: caso.descripcion,
      costo: Math.round((4000 + ((seed * (i + 1)) % 60) * 850) / 100) * 100,
      solicitante: `Usuario ${1 + ((seed + i) % 40)}`,
      tecnico: TECNICOS[(seed + i) % TECNICOS.length],
      tipoTrabajo: "Correctivo",
      articulo: `MFP Mono HP E${42000 + ((seed + i) % 900)}`,
      causa: caso.causa,
      // Solo los incidentes resueltos/cerrados ya tienen trabajo del tecnico.
      ...(resuelto
        ? {
            trabajos: caso.trabajos,
            solucion: solucionDe(caso.trabajos),
            fechaCierre: `${period}-${String(Math.min(day + 2, 28)).padStart(2, "0")}`,
          }
        : { trabajos: [] }),
    });
  }
  return out;
}
