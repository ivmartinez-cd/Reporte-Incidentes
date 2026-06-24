# Exportar a PDF Ejecutivo — Análisis y Plan

> Documento de diseño para implementar un botón **"Exportar PDF ejecutivo"** en el
> Dashboard de Incidentes (Canal Directo). Reúne el análisis del estado actual,
> las opciones técnicas, la arquitectura recomendada y un plan de implementación
> paso a paso. Pensado para que el reporte mensual que ve el Directorio pueda
> descargarse/imprimirse como PDF con calidad de presentación.

---

## 1. Objetivo

Permitir que, desde el dashboard de un cliente/periodo, se genere un **PDF
ejecutivo** de una sola pieza con:

- Portada/encabezado con cliente, periodo, fecha de generación y sello de
  confidencialidad.
- KPIs principales.
- Gráficos (línea de tiempo, categorías, subcategorías, sucursales).
- Resumen tabular de incidentes (top o completo).
- Respeto del **filtro activo** (si el usuario filtró por sucursal/categoría, el
  PDF debe reflejarlo y dejarlo explícito).

El entregable es para el board: prioridad en **claridad y prolijidad**, no en
interactividad.

---

## 2. Análisis del dashboard actual

### 2.1 Stack y flujo de datos
- **Next.js 15 (App Router) + TypeScript + React 19.** Página server-rendered en
  `src/app/dashboard/page.tsx` (`export const dynamic = "force-dynamic"`).
- El reporte se arma en server con `buildReport(empresaId, period)`
  (`src/lib/report.ts`) → devuelve `ReportData` (ver `src/lib/types.ts`).
- Los agregados de KPIs/gráficos salen de `summarize(report)`
  (`src/lib/aggregate.ts`) — **función pura**, sin IO. Esto es clave: se puede
  reutilizar tal cual para alimentar cualquier salida (HTML de impresión, PDF,
  etc.) sin volver a tocar SOAP ni Gemini.
- Los filtros transversales (`sucursal`, `categoria`, `subcategoria`) viven en la
  URL y se aplican con `applyFilters` (`src/lib/filters.ts`). El reporte ya
  cacheado se reusa (cache en memoria por `empresa+periodo+versión de taxonomía`).

### 2.2 Componentes que entran al PDF
Definidos hoy en `page.tsx`:

| Sección | Componente | Datos |
|---|---|---|
| KPIs | `KpiCard` ×3 | Total incidentes, Categoría principal, Sucursal principal (`summarize`) |
| Línea de tiempo | `charts/Timeline` | incidentes por día (`s.timeline`) |
| Categorías | `charts/CategoryDonut` | `s.categories` |
| Subcategorías | `charts/SubcategoryBar` | `s.subcategories` |
| Sucursales | `charts/SucursalBar` | `s.sucursales` |
| Detalle | `IncidentsTable` | `filteredIncidents` |
| Cola de revisión | `RevisionPanel` | pendientes (NO debería ir al PDF ejecutivo) |

- Los gráficos usan **Recharts** (client components, render a **SVG**). El SVG
  imprime nítido (vectorial), lo cual favorece el enfoque de impresión nativa.
- Hay datos extra disponibles que hoy no se muestran como KPI pero podrían ir al
  PDF: costo de incidentes (`Incident.costo`) y costo de IA (`costStore`,
  "Inversión en IA").

### 2.3 Marca y tema
- Naranja `#f0a400`, azules `#0275d8` / `#014c8c`. Fuentes Roboto + Montserrat.
- UI actual: **glassmorphism oscuro** (fondos translúcidos, sombras, blur).
  ⚠️ Ese estilo NO traduce bien a PDF impreso: hay que definir un **tema claro
  "tinta sobre papel"** específico para impresión (fondo blanco, texto oscuro,
  acentos en naranja/azul, sin blur ni glass).

### 2.4 Convención del proyecto a respetar
- **Sin acentos en texto de la app** (ver memoria `no-accents-convention`). El PDF
  es salida visible de la app, así que mantener la misma convención por
  consistencia (aunque el PDF no pasa por Gemini, el resto de la UI ya está sin
  acentos).
- **Confidencialidad**: el footer actual dice "Confidencial — Uso exclusivo del
  Directorio". Replicar en el PDF (encabezado y/o pie de cada página).

---

## 3. Qué debe contener el PDF (contenido propuesto)

1. **Encabezado / portada**
   - Logo Canal Directo + título "Reporte de Incidentes".
   - Cliente (nombre), periodo (mes/año), fecha de generación.
   - Si hay filtro activo: leyenda "Filtrado por: Sucursal = X" etc.
   - Badge "DATOS DEMO" solo si `isMock` (no en producción real).
2. **Resumen ejecutivo (KPIs)**: Total, Categoría principal (con %), Sucursal
   principal. Opcional: variación vs. mes anterior (no existe hoy; ver §8).
3. **Gráficos**: Timeline, Categorías (dona + leyenda), Subcategorías, Sucursales.
4. **Tabla de incidentes**: número, fecha, sucursal, reporte (resumido), causa,
   tipificación. Definir si va completa o top-N (recomendado: top 50 con nota de
   "N de M").
5. **Pie de página**: "Canal Directo · Confidencial — Uso exclusivo del
   Directorio" + numeración de página.

Excluir del PDF: Toolbar, ClassificationRefiner, RevisionPanel, botones y
controles interactivos.

---

## 4. Opciones técnicas

| Enfoque | Cómo | Pros | Contras |
|---|---|---|---|
| **A. Impresión nativa** (`window.print()` + ruta/print CSS) | Vista dedicada con `@media print`; el usuario "imprime → Guardar como PDF" | Cero dependencias nuevas; reusa Recharts (SVG nítido) y `summarize`; rápido de implementar | Depende del diálogo del navegador; control de paginado vía CSS; no genera archivo en server |
| **B. Puppeteer / headless Chrome** | API route que abre la ruta de impresión y hace `page.pdf()` | Archivo PDF generado en server (descargable, emailable); alta fidelidad; control de `@page`/márgenes | Dependencia pesada; en serverless requiere `puppeteer-core` + `@sparticuz/chromium`; mayor tiempo/costo |
| **C. `@react-pdf/renderer`** | Componentes PDF (`<Document>/<Page>/<View>`) en server | PDF vectorial, control total de layout, sin navegador | Hay que **reconstruir los gráficos** (Recharts no sirve; usar `victory`/SVG manual o imágenes); más trabajo |
| **D. `html2canvas` + `jsPDF`** | Captura el DOM a imagen y la mete en PDF (client) | Simple, "lo que ves es lo que sale" | PDF **rasterizado** (texto borroso, pesado); mala calidad para algo "ejecutivo"; problemas con glass/sombras |

### Recomendación
- **MVP / primer entrega: Enfoque A (impresión nativa con ruta de print).**
  Es el mejor costo/beneficio: aprovecha que `summarize` es pura y que Recharts
  ya emite SVG. Resultado nítido, sin dependencias, y el botón "Exportar PDF" abre
  la vista de impresión y dispara `window.print()`.
- **Upgrade (si piden archivo generado en server, envío por mail o branding pixel-perfect): Enfoque B (Puppeteer)** reutilizando **la misma ruta de print** del enfoque A. Es decir: A deja todo listo para que B sea incremental.
- Descartar C/D salvo requerimiento específico (C si se necesita PDF 100% server sin Chrome; D no, por calidad).

---

## 5. Arquitectura propuesta (sobre el enfoque A, lista para escalar a B)

### 5.1 Archivos a crear/editar

```
src/app/dashboard/print/page.tsx        # NUEVA: vista de impresión (server component)
src/app/dashboard/print/print.module.css # NUEVA: tema claro + reglas @media print / @page
src/components/print/PrintReport.tsx      # NUEVA (opc.): layout del reporte imprimible
src/components/ExportPdfButton.tsx        # NUEVA: botón cliente que abre/print la vista
src/components/Toolbar.tsx                # EDITAR: montar el botón de exportar
src/lib/report.ts / aggregate.ts          # SIN CAMBIOS (se reutilizan tal cual)
```

### 5.2 Flujo
1. El usuario está en `/dashboard?empresa=949&period=2026-06&sucursal=Norte`.
2. Toca **"Exportar PDF"** (en `Toolbar`).
3. El botón abre `/dashboard/print?...` con **los mismos search params** (cliente,
   periodo y filtros activos) — o en una pestaña nueva, o en modo print directo.
4. `print/page.tsx` (server) reusa `buildReport` + `applyFilters` + `summarize`
   con esos params y renderiza el **layout de impresión** (tema claro, una
   columna, sin controles).
5. Al cargar, dispara `window.print()` (vía un pequeño efecto en un componente
   cliente). El usuario elige "Guardar como PDF".

> Para el enfoque B, esa misma ruta `/dashboard/print` se renderiza desde una API
> route con Puppeteer (`page.goto(url); await page.pdf({format:'A4', printBackground:true})`).
> El único agregado es proteger la ruta (token/sesión) y resolver Chromium en el
> entorno de deploy.

### 5.3 Reutilización de datos (clave)
`summarize` y `applyFilters` ya son puras: la vista de print llama exactamente lo
mismo que `dashboard/page.tsx`. No se duplica lógica de negocio, solo el **layout**.

---

## 6. Diseño del layout de impresión

### 6.1 Tema claro para PDF (no glass)
- Fondo blanco `#ffffff`, texto `#1a1f29`, secundario `#5b6472`.
- Acentos: naranja `#f0a400` (títulos/realces), azul `#0275d8` (datos).
- Bordes finos `#e3e7ee`. Sin `backdrop-filter`, sin sombras fuertes.
- Tipografías: Montserrat para títulos, Roboto para cuerpo (ya cargadas).

### 6.2 Reglas de impresión imprescindibles (`@media print` / `@page`)
```css
@page { size: A4; margin: 16mm 14mm; }

@media print {
  /* forzar que se impriman fondos y colores de acento */
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

  /* ocultar todo lo interactivo */
  .no-print, nav, header button, .toolbar { display: none !important; }

  /* evitar cortar tarjetas/gráficos a la mitad */
  .kpi, .chartCard, .tableRow { break-inside: avoid; page-break-inside: avoid; }

  /* saltos de página entre secciones grandes si hace falta */
  .pageBreak { break-before: page; }
}
```
- **Recharts**: usar `isAnimationActive={false}` (ya está en los charts editados)
  y dar **ancho/alto fijos** (no `ResponsiveContainer` dependiente de viewport) en
  la vista de print, para que el SVG mida bien al imprimir.
- Encabezado/pie repetidos por página: se logra con `position: fixed` + `@page`
  (o tablas con `thead`/`tfoot` para repetición automática).

### 6.3 Estructura de una página
```
┌───────────────────────────────────────────────┐
│ [logo]  Reporte de Incidentes — <Cliente>       │  encabezado
│ Periodo: Junio 2026 · Generado 24/06/2026       │
│ Filtrado por: Sucursal = Norte                  │
├───────────────────────────────────────────────┤
│ [KPI Total] [KPI Categoria] [KPI Sucursal]      │  resumen
├───────────────────────────────────────────────┤
│ Linea de tiempo (ancho completo)                │
│ [Dona Categorias]      [Barras Subcategorias]   │
│ Barras Sucursales                               │
├───────────────────────────────────────────────┤
│ Tabla de incidentes (top N)                     │
├───────────────────────────────────────────────┤
│ Canal Directo · Confidencial — Directorio  · p.1│  pie
└───────────────────────────────────────────────┘
```

---

## 7. Plan de implementación (pasos)

1. **Tema de impresión**: crear `print.module.css` con el tema claro + bloque
   `@media print`/`@page` de §6.2.
2. **Ruta de print** `src/app/dashboard/print/page.tsx`:
   - Copiar la resolución de params/datos de `dashboard/page.tsx`
     (validar empresa, periodo, `buildReport`, `sanitizeFilters`, `applyFilters`,
     `summarize`).
   - Renderizar el layout de §6.3 (sin Toolbar/Refiner/RevisionPanel).
   - Reusar `Timeline/CategoryDonut/SubcategoryBar/SucursalBar` con tamaños fijos
     o variantes "print" (ver nota Recharts).
3. **Disparo de impresión**: componente cliente mínimo en la ruta print que en
   `useEffect` llame `window.print()` (con opción de no auto-disparar si llega
   `?auto=0`, útil para depurar).
4. **Botón** `ExportPdfButton.tsx` (client): arma la URL con `empresa`, `period` y
   filtros vigentes (puede leerlos de `useReportNav`) y abre `/dashboard/print?...`
   (en pestaña nueva o navegación). Estilo acorde a la Toolbar.
5. **Montaje**: agregar el botón en `Toolbar.tsx`.
6. **Ajuste fino de paginado**: probar con datos reales (muchos incidentes),
   ajustar `break-inside`, top-N de la tabla y altura de gráficos.
7. **(Opcional) Enfoque B**: API route `src/app/api/export-pdf/route.ts` con
   `puppeteer-core` + `@sparticuz/chromium`, que navega a `/dashboard/print` y
   devuelve el PDF como descarga. Proteger con la sesión existente.

---

## 8. Consideraciones y decisiones abiertas

- **Filtro activo en el export**: decidir si el PDF refleja el filtro vigente
  (recomendado, y dejarlo escrito en el encabezado) o siempre el mes completo.
- **Alcance de la tabla**: completa vs top-N. Para "ejecutivo" suele bastar un
  resumen; el detalle completo puede inflar mucho el PDF.
- **Comparativa mes anterior / tendencias**: hoy `summarize` es de un solo
  periodo. Si el board quiere variaciones MoM, hay que agregarlo (otra iteración).
- **Costo de IA / costo de incidentes**: existen los datos (`costStore`,
  `Incident.costo`); definir si entran como KPI del PDF.
- **Acentos**: mantener la convención sin acentos del resto de la app.
- **Performance (enfoque B)**: Puppeteer agrega peso y tiempo; en serverless
  (Vercel) requiere `@sparticuz/chromium`. Evaluar contra el simple
  `window.print()`.
- **Seguridad**: `/dashboard/print` debe quedar detrás del mismo middleware de
  sesión que `/dashboard` (no exponer datos sin login).

---

## 9. Checklist de arranque

- [ ] `print.module.css` (tema claro + `@media print`/`@page`).
- [ ] `src/app/dashboard/print/page.tsx` (datos reutilizados + layout limpio).
- [ ] Auto-`window.print()` en cliente.
- [ ] `ExportPdfButton.tsx` con URL de params + filtros.
- [ ] Botón montado en `Toolbar`.
- [ ] Variante "print" de los gráficos (tamaño fijo, sin animación).
- [ ] Prueba con cliente/periodo real y muchos incidentes (paginado).
- [ ] (Opc.) API route Puppeteer para PDF descargable + protección de sesión.

---

---

## 10. Estado de implementación y correcciones aplicadas

Implementado con el **enfoque A** (ruta de print + `window.print()`). Archivos
reales: `src/app/dashboard/print/page.tsx`, `print.module.css`, `PrintTrigger.tsx`,
`src/components/ExportPdfButton.tsx` (+ botón montado en `Toolbar`).

**Decisión de producto:** el PDF **siempre exporta el MES COMPLETO**. Se ignoran
los filtros interactivos; el botón solo transmite `empresa` y `period`.

**Fallas detectadas en la primera implementación y cómo se corrigieron:**

1. **Gráficos vacíos** (Evolución diaria, Sucursales, etc.): se reusaron los
   componentes con `ResponsiveContainer height="100%"`, que **colapsa a 0** cuando
   la altura del contenedor no es determinista (caso típico en impresión).
   → Se agregó un prop opcional `height` a `Timeline/CategoryDonut/SubcategoryBar/
   SucursalBar` y la ruta de print pasa **alturas fijas** (200/230/260/240). El
   dashboard no cambia (sin `height` mantiene el `min-height` por CSS).
   ⚠️ **Sutileza crítica:** el `.body`/`.centerWrap` de los charts usa `flex: 1`
   (→ `flex-basis: 0`), por lo que un `height` inline **se ignora** salvo que la
   tarjeta tenga altura definida. En la grilla (`.chartsGrid`) la tarjeta SÍ tiene
   altura (los charts ahí renderizaban); en las `<section>` de bloque (Timeline,
   Sucursales) colapsaba a 0 → gráfico vacío. La solución fue agregar
   `flex: "none"` al estilo inline junto con el `height`, así la altura fija manda
   sin depender del contenedor. Verificado con render headless (Chrome+CDP):
   `surfaces:4`, alturas `[200,230,260,240]`.
   ⚠️ **Regla:** en impresión, NUNCA depender de `ResponsiveContainer height=100%`;
   pasar altura fija + `flex:none`.
2. **Tarjetas/títulos duplicados**: cada gráfico ya trae su propia `card` + título;
   el wrapper `.chartCard`+`.chartCardTitle` los duplicaba. → Se quitaron los
   wrappers; los gráficos se renderizan directos en su grilla/secciones.
3. **Header del layout en el PDF**: `dashboard/layout.tsx` inyecta `<Header>`.
   → Utilidad `.no-print` en `globals.css` aplicada al `Header` (oculto solo en
   impresión; la auth del layout se mantiene).
4. **Logo no confiable**: `next/image` puede llegar tarde al diálogo de print.
   → Reemplazado por `<img>` plano en la ruta de print.
5. **Colores/fondos no se imprimían**: faltaba `print-color-adjust: exact`.
   → Agregado en el bloque `@media print` (`.printPage, .printPage *`).
6. **Badge de tipificación**: usaba `categoryColors[...]` directo (gris para
   categorías con color por hash) → ahora usa el helper `categoryColor()`.
7. **Sin clasificar**: fallback `"Pendiente de revision"` → alineado a
   `"Sin Clasificar"` (`UNCLASSIFIED`), consistente con el resto de la app.

**Caveat pendiente:** la numeración de página (`counter(page)` en el footer
`position: fixed`) puede no resolverse en Chrome fuera de los *margin boxes* de
`@page`. No bloqueante.

---

### Referencias del código (para no perderse)
- Datos: `src/lib/report.ts` (`buildReport`), `src/lib/aggregate.ts` (`summarize`).
- Filtros: `src/lib/filters.ts`, contexto cliente `src/components/reportNav.ts`.
- Página base a espejar: `src/app/dashboard/page.tsx`.
- Gráficos: `src/components/charts/*`.
- Tabla: `src/components/IncidentsTable.tsx`.
- Marca/tokens: `src/app/globals.css`.
