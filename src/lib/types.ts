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
  /** Texto libre que describe el incidente — entrada para la tipificación IA. */
  descripcion: string;
  /** Costo asociado al incidente (ARS), si el SOAP lo expone. */
  costo?: number;
  /** Categoría asignada por la IA (se completa luego de clasificar). */
  categoria?: IncidentCategory;
}

export type IncidentCategory =
  | "Atasco Papel"
  | "Error de Servicio"
  | "Error de Servicio Crítico"
  | "Instalación de Cola de Impresión"
  | "Software"
  | "Usabilidad/Configuración"
  | "Error de Insumo"
  | "Instalación / Desinstalación"
  | "Sin Clasificar";

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
  aiUsage: AiUsage;
  /** true si los datos provienen del mock y no del SOAP real. */
  isMock: boolean;
}
