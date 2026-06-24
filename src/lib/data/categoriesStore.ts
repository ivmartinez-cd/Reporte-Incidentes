import fs from "fs";
import path from "path";

export interface DynamicCategory {
  name: string;
  color: string;
  description: string;
  subcategories: string[];
}

const DEFAULT_CATEGORIES: DynamicCategory[] = [
  {
    name: "Hardware y Desgaste",
    color: "#0275d8",
    description: "Reparacion o sustitucion de componentes fisicos de la impresora (reemplazo de fusores, rodillos pickup/retard de bandeja gastados, sensores sucios, bandas de transferencia, ADF rayado, cables de corriente/power flojos).",
    subcategories: ["Fusor / Calor", "Rodillos y Gomas", "Modulo ADF / Escaner", "Conexion Electrica", "Panel / Botones"]
  },
  {
    name: "Medio de Impresion",
    color: "#f0a400",
    description: "Incidentes relacionados con el papel y bandejas fisicas. Ejemplos: guias de bandeja desalineadas, resmas de papel humedas, papel de precios troquelado que se traba.",
    subcategories: ["Ajuste de Guias / Bandejas", "Calidad / Humedad del Papel", "Papel Especial (Troquelado)", "Atasco de Papel"]
  },
  {
    name: "Conectividad y Red",
    color: "#2bb6c4",
    description: "Perdidas de IP de red del equipo, puertos de red, switches, falso contacto en cables de red, configuraciones de red interna de la empresa.",
    subcategories: ["Configuracion IP / Red", "Red Fisica / Cableado"]
  },
  {
    name: "Insumos y Toner",
    color: "#e8743b",
    description: "Toner agotado, engranajes/enlaces rotos en el cartucho de toner que impiden el giro (causando atascos falsos), o manchas/rayas debido al cilindro/toner.",
    subcategories: ["Toner Defectuoso"]
  },
  {
    name: "Gestion de Soporte",
    color: "#4dc247",
    description: "Tickets de soporte cerrados administrativamente por falta de datos, auto-resoluciones enviando videos/instructivos, o mal uso/negligencia del usuario (como carpetas u objetos apoyados sobre la salida del papel tapando la salida, o vandalismo fisico).",
    subcategories: ["Auto-resolucion Asistida", "Negligencia / Mal Uso"]
  },
  {
    name: "Software y Firmware",
    color: "#7b61ff",
    description: "Spooler de Windows colgado, drivers corruptos en la PC de facturacion del cliente, configuraciones de tamano de papel en Windows, o actualizaciones de firmware, reinstalacion de firmware (FW) o carga de firmware del equipo.",
    subcategories: ["Actualizacion de Firmware", "Soporte Tecnico PC"]
  }
];

const filePath = path.join(process.cwd(), "src/lib/data/categories.json");

export function getCategories(): DynamicCategory[] {
  try {
    if (!fs.existsSync(filePath)) {
      // Crear directorio padre si no existe
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, JSON.stringify(DEFAULT_CATEGORIES, null, 2), "utf-8");
      return DEFAULT_CATEGORIES;
    }
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as DynamicCategory[];
  } catch (err) {
    console.error("Error reading categories JSON store, returning defaults:", err);
    return DEFAULT_CATEGORIES;
  }
}

export function saveCategories(list: DynamicCategory[]): void {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(list, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving categories JSON store:", err);
    throw new Error("No se pudo guardar la taxonomia de categorias.");
  }
}
