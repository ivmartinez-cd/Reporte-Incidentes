import "server-only";
import type { Empresa, Incident } from "@/lib/types";

/**
 * Datos simulados realistas para demos y desarrollo sin tocar el SOAP.
 * Se activan con USE_MOCK=true. Las descripciones están redactadas para que la
 * tipificación con IA produzca categorías variadas.
 */

export const MOCK_EMPRESAS: Empresa[] = [
  { id: "1001", nombre: "Banco del Litoral S.A." },
  { id: "1002", nombre: "Farmacias Vida Plena" },
  { id: "1003", nombre: "Municipalidad de San Rafael" },
  { id: "1004", nombre: "Grupo Logístico Andes" },
];

const DESCRIPCIONES: string[] = [
  "La impresora muestra atasco de papel recurrente en la bandeja 2, el usuario retira hojas arrugadas varias veces al día.",
  "El equipo no responde a los trabajos de impresión enviados desde la red, error de servicio general en el área de caja.",
  "Caída total del servicio de impresión en toda la sucursal, operaciones detenidas, requiere atención urgente.",
  "Solicitan configurar la cola de impresión en tres puestos nuevos del sector administración.",
  "El driver del equipo arroja error al actualizar, falla de software tras la actualización de Windows.",
  "El usuario no encuentra la opción de impresión doble faz, consulta de configuración y uso.",
  "El tóner se agota muy rápido y aparece aviso de insumo defectuoso, las copias salen con manchas.",
  "Se requiere desinstalar el equipo antiguo e instalar la nueva multifunción en recepción.",
  "Hojas arrugadas trabadas en el fusor, atasco constante que frena la facturación.",
  "Error crítico: el servidor de impresión dejó de responder y afecta a 40 usuarios simultáneamente.",
  "Piden agregar la impresora de red al equipo del nuevo empleado de tesorería.",
  "La pantalla del panel queda congelada, parece un problema de firmware/software del equipo.",
  "Las impresiones salen muy claras pese a cambiar el cartucho, posible insumo de baja calidad.",
  "Consulta sobre cómo escanear a correo electrónico, el usuario no sabe usar la función.",
  "Error de servicio intermitente: la impresora se desconecta de la red cada pocas horas.",
];

const ESTADOS = ["Abierto", "En curso", "Resuelto", "Cerrado"];
const SUCURSALES = ["Casa Central", "Sucursal Norte", "Sucursal Sur", "Depósito"];

/** Genera incidentes deterministas para una empresa/período. */
export function mockIncidents(empresaId: string, period: string): Incident[] {
  const empresa = MOCK_EMPRESAS.find((e) => e.id === empresaId);
  if (!empresa) return [];
  const [year, month] = period.split("-").map(Number);
  const seed = Number(empresaId) + year + month;
  const count = 18 + (seed % 22); // 18–39 incidentes

  const out: Incident[] = [];
  for (let i = 0; i < count; i++) {
    const r = (seed * (i + 7)) % DESCRIPCIONES.length;
    const day = 1 + ((seed * (i + 3)) % 27);
    out.push({
      id: `${empresaId}-${period}-${i + 1}`,
      numero: `INC-${period.replace("-", "")}-${String(i + 1).padStart(4, "0")}`,
      fecha: `${period}-${String(day).padStart(2, "0")}`,
      empresaId,
      empresaNombre: empresa.nombre,
      sucursal: SUCURSALES[(seed + i) % SUCURSALES.length],
      maquina: `MFP-${1000 + ((seed + i) % 60)}`,
      estado: ESTADOS[(seed + i) % ESTADOS.length],
      descripcion: DESCRIPCIONES[r],
      costo: Math.round((4000 + ((seed * (i + 1)) % 60) * 850) / 100) * 100,
    });
  }
  return out;
}
