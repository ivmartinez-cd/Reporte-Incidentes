# Dashboard Ejecutivo de Reportes de Incidentes — Canal Directo

Panel mensual, nivel C-Level, de incidentes por cliente con **tipificación
automática por IA** (Gemini) y **auditoría de costos de IA** en tiempo real.

Construido con **Next.js 15 (App Router) + TypeScript**, sistema de diseño
propio en CSS (glassmorphism / dark mode) y **Recharts**.

---

## 1. Puesta en marcha

```bash
npm install
cp .env.local.example .env.local   # completá los valores
npm run dev                        # http://localhost:3000
```

Build de producción:

```bash
npm run build && npm start
```

Login por defecto (configurable en `.env.local`): usuario `directorio`,
contraseña `canaldirecto2026`.

## 2. Variables de entorno (`.env.local`)

| Variable | Descripción |
|---|---|
| `GEMINI_API_KEY` | API key de Gemini. **Vacío = modo heurístico sin costo.** |
| `GEMINI_MODEL` | Modelo (default `gemini-2.5-flash`). |
| `GEMINI_PRICE_INPUT_PER_M` / `_OUTPUT_PER_M` | Precio USD por 1M tokens (verificar tarifario). |
| `SOAP_WSDL_URL` | Endpoint WSDL de Canal Directo. |
| `SOAP_TIMEOUT_MS` | Timeout estricto del cliente SOAP (default 10000). |
| `SOAP_MAX_CONCURRENCY` | Máximo de llamadas SOAP en paralelo (default 4). |
| `SOAP_CACHE_TTL_SECONDS` | TTL de caché en memoria (default 900). |
| `USE_MOCK` | `true` = datos demo; `false` = SOAP real. |
| `APP_USERNAME` / `APP_PASSWORD` | Credenciales del login simple. |
| `SESSION_SECRET` | Secreto para firmar la cookie de sesión. |

> ⚠️ **Seguridad:** la API key de Gemini compartida durante el desarrollo quedó
> expuesta en texto plano y **debe rotarse/revocarse**. Usá una key nueva en
> `.env.local` (nunca se commitea: está en `.gitignore`).

## 3. Arquitectura

```
src/
  app/
    login/            Login (Server Action + cookie firmada)
    dashboard/        Panel protegido (Server Components)
    middleware.ts     Redirección por sesión (Edge, sin crypto)
  components/         Header, Toolbar, KPIs, AiCostWidget, charts/, tabla
  lib/
    config.ts         Configuración server-only desde env
    cache.ts          Caché en memoria (node-cache) anti-stampede
    concurrency.ts    Semáforo + retry con backoff exponencial
    soap/             Cliente SOAP (timeout/retry/concurrencia) + dominio
    ai/               Categorías, clasificador Gemini, tracking de costos
    auth/             Sesión HMAC (login simple)
    data/mock.ts      Datos demo realistas
    report.ts         Orquestación: datos + IA + agregados
```

### Protección del servicio SOAP (crítico)
- **Caché agresiva** en memoria con TTL configurable y deduplicación de
  llamadas concurrentes (evita "stampede").
- **Concurrencia limitada** por semáforo (`SOAP_MAX_CONCURRENCY`).
- **Reintentos con backoff exponencial + jitter** sólo para errores transitorios.
- **Timeout estricto** por llamada para no colgar el server de Next.

El WSDL es RPC/encoded y devuelve cada respuesta como un `xsd:string` con JSON
embebido; la capa de dominio lo parsea de forma defensiva.

### Tipificación con IA
- Clasificación en una de las categorías de negocio (editables en
  `src/lib/ai/categories.ts`).
- **Deduplicación** por descripción + **batching** para minimizar tokens.
- Captura `usageMetadata` (prompt/candidates) por llamada → costo USD.
- **Fallback heurístico** sin costo si la IA falla o no hay API key.

### Auditoría de costos
El widget "Inversión en Análisis de IA" muestra costo USD, tokens totales,
llamadas y desglose prompt/respuesta. El acumulador es en memoria (por proceso);
para histórico persistente, reemplazar `src/lib/ai/costStore.ts` por una DB.

## 4. Datos reales (SOAP)
Poné `USE_MOCK=false`. El flujo usa `getEmpresas` → `getTopIncidents` por
empresa y filtra por período. Si el servicio expone `usuario_id` vía
`getUser(Usuario,Password)`, completá `SOAP_USER`/`SOAP_PASSWORD`. Los nombres
de campos del servicio real se normalizan en `src/lib/soap/incidents.ts`
(ajustar `pick(...)` cuando se confirme el esquema exacto de respuesta).

## 5. Próximos pasos sugeridos
- Panel de administración para editar categorías de tipificación.
- Persistencia del costo de IA y del histórico de reportes.
- Exportación a PDF del reporte mensual para el Directorio.
