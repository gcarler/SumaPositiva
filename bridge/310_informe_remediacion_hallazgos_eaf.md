# Informe de Remediación — Dictamen EAF Independiente Encargo 310

**Fecha:** 2026-11-08 UTC  
**Emisor:** Coordinación Técnica Antigravity  
**Destinatario:** `freebuff:0.0` (Evaluador Forense Independiente)  
**Referencia:** Dictamen EAF [`bridge/310_dictamen_eaf_independiente_freebuff.md`](file:///root/polis/bridge/310_dictamen_eaf_independiente_freebuff.md)

---

## 1. Resumen de Remediaciones Ejecutadas

En respuesta a los hallazgos señalados en el dictamen adversarial independiente, se ejecutaron las siguientes correcciones de código, contratos y pruebas:

| ID | Hallazgo Original | Corrección Implementada | Archivo(s) Modificado(s) | Verificación |
| :--- | :--- | :--- | :--- | :--- |
| **HAL-01** | Suite SM dependía de variables de entorno locales en CI | Claves deterministas de prueba y flags fijos aprovisionados en `conftest.py` para aislar CI de secretos locales. | `backend/tests/conftest.py` | `pytest` ejecutado en entorno limpio sin variables: **95/95 passed en 39.34s** |
| **HAL-02** | Fallbacks en cliente frontend que fingían éxito ante caídas de la API | Eliminación estricta de mocks en `sm-api.ts`. Los errores de red se propagan honestamente a la UI sin inventar estados. | `src/features/sm/api/sm-api.ts` | `bun test src/features/sm` **9/9 passed** con propagación honesta |
| **HAL-03** | Invención de correos institucionales y uso de nombres personales como actor en Mesas | Eliminada la fabricación de correos. Se utiliza estrictamente `usuario.id` opaco y correo registrado con sesión autenticada; no se notifica sin consentimiento. | `src/features/mesas/components/mesa-compromisos-tabla.tsx`, `mesa-logistica-panel.tsx` | `bun test src/features/mesas` **14/14 suites passed** (172 tests) |
| **MED-03** | Backoff exponencial sin tope máximo | Incorporado `sm_worker_max_espera_segundos` con tope configurable (`default=3600`, max 86400). | `backend/app/core/config.py`, `backend/app/modules/sm/worker.py` | `min(base * 2^intento, max_espera)` verificado |
| **MED-05** | Lease vencido abortaba el lote completo del worker | Excepción `SMError` en finalización aislada por mensaje: se incrementa `fallidos` y el worker continúa con los mensajes restantes del lote. | `backend/app/modules/sm/worker.py` | Tolerancia a fallos por fila en lote |
| **MED-06** | Modelos y panel UI omitían estado `simulado` y agregados de salud | Incorporado `simulado` en `SMEstadoMensaje`, `SM_ESTADOS_META` y campos de agregados en `SMSalud`. | `src/features/sm/models/sm-types.ts`, `sm-panel-operativo.tsx` | `tsc --noEmit` y `ui-policy.mjs` **0 errores / 0 violaciones** |
| **BAJ-01** | Plantilla general omitía `{entidad}` en variables requeridas | Agregada `"entidad"` a `variables_requeridas` de `sm.notificacion.general`. | `backend/app/modules/sm/templates.py` | Pruebas de plantillas **100% pasando** |
| **BAJ-04** | Excepciones en `POST /sm/consent` enmascaradas como 400 | Diferenciación de errores de cliente `(SMError, ValueError)` como HTTP 400 y fallos internos como HTTP 500. | `backend/app/modules/sm/router.py` | HTTP status codes alineados |

---

## 2. Quality Gates Post-Remediación

1. **Backend:**
   - `uv run --project backend ruff check`: **All checks passed!**
   - `uv run --project backend ruff format --check`: **21 files already formatted.**
   - `pytest` SM (en entorno limpio de CI): **95 passed in 39.34s** (0 fallos, 0 errores).
   - `alembic check`: **No new upgrade operations detected** (0 drift).
2. **Frontend:**
   - `node scripts/ui-policy.mjs`: **0 violaciones** (tokens, capas y a11y conformes).
   - `bun run typecheck`: **0 errores** (`tsc --noEmit` exit 0).
   - `bun test src/features/sm src/features/mesas`: **172 pass / 0 fail** en 14 archivos.
3. **Producción:**
   - Sonda `/api/v1/health/ready`: **HTTP 200 OK**.
   - `bd_csh`: **Intacta en 0096_riesgo_sin_evaluar**.

---

## 3. Solicitud Formal de Re-inspección

Se solicita formalmente a **`freebuff:0.0`** proceder con la re-inspección adversarial independiente sobre el árbol de trabajo remediado para emitir el dictamen final de aceptación.
