/** Tipos de dominio del dashboard (normalizados desde el SOAP). */

export interface Empresa {
  id: string;
  nombre: string;
}

export interface Incident {
  id: string;
  numero: string;
  fecha: string; // ISO date (apertura)
  empresaId: string;
  empresaNombre: string;
  sucursal?: string;
  maquina?: string;
  estado?: string;
  /** Texto libre que describe el incidente — entrada para la tipificacion IA. */
  descripcion: string;
  /** Costo asociado al incidente (ARS), si el SOAP lo expone. */
  costo?: number;

  // ── Contexto extra del incidente (disponible en el listado/detalle SOAP) ──
  /** Quien reporto el incidente. */
  solicitante?: string;
  /** Tecnico/prestador asignado. */
  tecnico?: string;
  /** Tipo de trabajo: Correctivo / Preventivo / etc. */
  tipoTrabajo?: string;
  /** Causa raiz diagnosticada por el tecnico (ej. "TN - Toner"). */
  causa?: string;
  /** Articulo/modelo del equipo. */
  articulo?: string;
  /** Fecha de cierre (ISO), si el incidente esta resuelto/cerrado. */
  fechaCierre?: string;

  // ── Trabajo realizado por el tecnico (getIncidentJobs) ──
  /** Resolucion derivada: lo que efectivamente hizo el tecnico. */
  solucion?: string;
  /** Bitacora completa de trabajos/observaciones del tecnico. */
  trabajos?: IncidentJob[];

  // ── Salidas de la IA ──
  /** Categoria asignada por la IA (se completa luego de clasificar). */
  categoria?: IncidentCategory;
  /** Subcategoria asignada por la IA. */
  subcategoria?: string;
}

/** Una entrada de la bitacora de trabajo del tecnico. */
export interface IncidentJob {
  descripcion: string;
  observ?: string;
  fecha?: string;
  estado?: string;
  tecnico?: string;
}

export type IncidentCategory = string;

export interface AiUsage {
  promptTokens: number;
  candidatesTokens: number;
  totalTokens: number;
  calls: number;
  costUsd: number;
}

export interface ReportData {
  empresa: Empresa;
  period: string; // "YYYY-MM"
  incidents: Incident[];
  generatedAt: string;
  /** true si los datos provienen del mock y no del SOAP real. */
  isMock: boolean;
  /**
   * Cantidad de casos unicos que todavia no fueron clasificados por IA y se
   * muestran con el heuristico provisional. >0 dispara el refinamiento en
   * segundo plano (ver ClassificationRefiner / refineClassificationAction).
   */
  pending: number;
}
