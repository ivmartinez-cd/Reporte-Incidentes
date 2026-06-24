/**
 * Taxonomia CERRADA v1 del clasificador de incidentes (congelada 2026-06-24,
 * derivada del analisis del corpus de 514 casos reales). El clasificador DEBE
 * elegir SIEMPRE una (categoria, subcategoria) de esta lista — nunca inventa.
 * Cada categoria tiene un "Otros - ..." como red de seguridad. Sin acentos
 * (convencion de la app).
 *
 * Eje: TRABAJO/CAUSA (lo que hizo el tecnico), no sintoma. Ver REGLAS abajo.
 */

export interface TaxonomyCategory {
  name: string;
  subcategories: string[];
}

export const TAXONOMY_V1: TaxonomyCategory[] = [
  {
    name: "Medio de Impresion",
    subcategories: [
      "Atasco de papel (comun)",
      "Papel especial / Troquelado",
      "Papel inadecuado / humedad / mala calidad",
      "Arruga / Toma varias hojas",
      "Ajuste de bandejas / guias",
      "Otros - Medio de Impresion",
    ],
  },
  {
    name: "Insumos y Toner",
    subcategories: [
      "Toner / Cartucho",
      "Drum / Unidad de imagen / Revelador",
      "Calidad por insumo (manchas / impresion clara)",
      "Otros - Insumos y Toner",
    ],
  },
  {
    name: "Hardware y Desgaste",
    subcategories: [
      "Rodillos / Pickup / Separacion",
      "Fusor / Kit de mantenimiento",
      "Escaner / ADF",
      "Parte / Panel / Botonera rota",
      "Otros - Hardware y Desgaste",
    ],
  },
  {
    name: "Software, Firmware y Red",
    subcategories: [
      "Configuracion de red / IP",
      "Driver / PC / Spooler",
      "Firmware",
      "Calibracion / Ajuste de imagen",
      "Otros - Software, Firmware y Red",
    ],
  },
  {
    name: "Gestion de Soporte",
    subcategories: [
      "Mesa de ayuda / Sin respuesta del cliente",
      "Instructivo / Autoresolucion",
      "Mal uso / Negligencia",
      "Diagnostico / Sin falla",
      "Mantenimiento / Limpieza general",
      "Problema externo / Red del cliente",
      "Otros - Gestion de Soporte",
    ],
  },
];

/**
 * Reglas de desempate (jerarquia de evaluacion). Se inyectan al prompt del
 * clasificador y son la referencia para etiquetar el gold set.
 */
export const TAXONOMY_RULES_V1 = `
JERARQUIA DE EVALUACION (en orden):
1. SENAL PRIMARIA = la SOLUCION (lo que el tecnico efectivamente hizo al cerrar).
2. DESEMPATE: si la solucion abarca dos categorias, gana la que RESUELVE la queja
   original del cliente (campos "Fallas:" y "Observaciones:" de la descripcion).
3. CAUSA = ignorar (es ruido: 78% es "EQ-Equipo"/"Indeterminado"). Usar SOLO como
   pista muy debil si la solucion esta vacia.
4. MESA DE AYUDA / SIN RESPUESTA => "Gestion de Soporte" > "Mesa de ayuda / Sin
   respuesta del cliente" cuando el caso lo toma la mesa de ayuda, se consulta al
   cliente (mail/bitacora/whatsapp/llamada) y NO hubo accion tecnica real ni
   respuesta del cliente (incluye troquelado SOLO sospechado, sin confirmar). OJO:
   si el tecnico HIZO algo (configuro, cambio, reparo) y ADEMAS cerro esperando
   confirmacion, vale el TRABAJO realizado, no la espera.
   - Si el cliente RESPONDE que lo resolvio solo => "Instructivo / Autoresolucion".

REGLAS ESPECIFICAS:
- LIMPIEZA / MANTENIMIENTO GENERAL SIN reemplazo de pieza => NO es Hardware. Va a
  "Medio de Impresion" si el sintoma fue atasco, o a la categoria del sintoma real.
  "Hardware y Desgaste" SOLO si hubo REEMPLAZO o REPARACION de pieza por desgaste/
  rotura (fusor, rodillos pickup/retard/separacion, kit mantenimiento, panel/botonera,
  cover, fuente).
- PAPEL ESPECIAL / TROQUELADO: si el contexto indica papel troquelado/especial =>
  "Papel especial / Troquelado", AUNQUE la solucion mencione limpieza o rodillos
  (el problema de fondo es el medio, no el equipo).
- PAPEL INADECUADO: si el problema es papel humedo, de mala calidad, resma
  inadecuada, gramaje equivocado => "Papel inadecuado / humedad / mala calidad"
  (distinto de troquelado y de atasco comun).
- CONFIGURACION/ASISTENCIA AL USUARIO con equipo OK (se explico como configurar,
  red, driver) => "Software, Firmware y Red" (o "Gestion de Soporte" si fue solo
  instructivo/autoresolucion sin tocar el equipo).
- ESCANER / ADF (vidrio/platina, alimentador ADF, rodillos de ADF, calibracion de
  escaneo) => SIEMPRE "Hardware y Desgaste" > "Escaner / ADF", sea limpieza,
  config o reemplazo de pieza. Es un dominio propio.
- DIAGNOSTICO SIN FALLA: si el tecnico reviso/testeo y el equipo quedo OK SIN
  reparar ni reemplazar nada (no se reprodujo/encontro la falla) => "Gestion de
  Soporte" > "Diagnostico / Sin falla".
- DRUM / UNIDAD DE IMAGEN / REVELADOR (developer): consumibles tecnicos =>
  "Insumos y Toner" > "Drum / Unidad de imagen / Revelador" (NO Hardware).
- MANTENIMIENTO PREVENTIVO: limpieza general / reset de contadores / "service" SIN
  falla puntual ni reemplazo de pieza => "Gestion de Soporte" > "Mantenimiento /
  Limpieza general". OJO: si la limpieza fue para RESOLVER un sintoma concreto
  (ej. limpiar para destrabar un atasco), va a la categoria del sintoma (Medio).
- CALIBRACION / AJUSTE DE IMAGEN (imagen corrida, registro, alineacion) =>
  "Software, Firmware y Red" > "Calibracion / Ajuste de imagen".

CONFIANZA:
- Si no hay match claro dentro de una categoria => "Otros - <categoria>".
- Si ni la categoria esta clara => marcar PENDIENTE (no inventar).
`.trim();

export const TAXONOMY_VERSION = "v1.3-2026-06-24";
