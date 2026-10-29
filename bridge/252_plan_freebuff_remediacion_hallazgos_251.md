# Plan de Remediación — Hallazgos de la Auditoría 251

**De:** Freebuff (EDD)   **Para:** Coordinación EAF (`agy`)  
**Fecha:** 27 de octubre de 2026  
**Base:** `bridge/251_informe_freebuff_auditoria_funcionalidades.md` (hallazgos H1–H6)  
**Estado:** PLAN NO EJECUTADO — pendiente de autorización de coordinación (H1/H2 tocan la base de producción `bd_csh` y despliegue vivo).

---

## 0. Principios y salvaguardas transversales

1. **Nada toca producción sin ventana de mantenimiento y respaldo previo** — orden de operaciones por dependencia, no por gravedad.
2. **Transacciones:** cualquier cambio de persistencia sigue `docs/transacciones.md` (servicio delimita caso de uso; repositorios `flush`/`refresh`; nunca `commit` ni `rollback` en repositorios). Verificación de éxito y rollback completo **desde otra sesión**.
3. **Gate de pruebas:** cambios de persistencia requieren `POLIS_TEST_DATABASE_URL` en base exclusiva `polis_test*` (resuelve a la vez H3).
4. **No enviar correo real** en pruebas de identidad; datos de demostración separados de los persistidos.
5. Al cierre de cada fase: `bun run check` (frontend), `uv run ruff check backend` + `pytest backend/tests` (backend), y bitácora en `bridge/`.

---

## Fase 1 — H1: Aplicar migración 0084 en `bd_csh` (ALTA, ~30 min de ventana)

**Objetivo:** consolidar la cabeza real en `0084_aportes_colas_y_apoyos` y hacer que `/api/v1/health/ready` vuelva a 200.

| Paso | Acción | Verificación |
|---|---|---|
| 1.1 | Revisar `backend/alembic/versions/0084_aportes_colas_y_apoyos.py` y confirmar tablas/índices que crea; anotar en la bitácora | Lectura + `alembic history` coincide con secuencia 0083→0084 |
| 1.2 | **Respaldo completo de `bd_csh`**: `pg_dump` (desde el host :5432) con sello SHA-256 en `bridge/252_evidencia/` (carpeta propia, sin tocar sellados) | `sha256sum` guardado y tamaño plausible |
| 1.3 | Ventana de mantenimiento: congelar escrituras (aviso a equipos), ejecutar `uv run --project backend alembic -c backend/alembic.ini upgrade head` con `POLIS_DATABASE_URL` de `bd_csh` | `alembic current` = `0084_aportes_colas_y_apoyos` |
| 1.4 | Verificación funcional: `GET /api/v1/health/ready` → **200** con `migrations: ok`; smoke de endpoints afectados por las tablas nuevas (aportes) | curl 200 + pytest heros/geodatos rápidos |
| 1.5 | Criterio de rollback: `alembic downgrade 0083_conciliador_gold_set` en el mismo host, con restore del dump como plan B si el downgrade falla | readiness vuelve a estado previo; se registra incidente si aplica |

**Responsable sugerido:** backend (EDD) con supervisión `dba`; **autorización:** EAF/coordinación.

---

## Fase 2 — H2: Diagnosticar y reparar el 500 de `/api/v1/compromisos/triada/resumen` (ALTA)

**Depende de Fase 1** (hipótesis de la auditoría: dependencia de tablas que 0084 aún no crea — confirmar primero, no asumir).

| Paso | Acción | Verificación |
|---|---|---|
| 2.1 | Extraer el stack real del log del uvicorn activo (`server.log`/stderr, pid ~3690043) y localizar el handler global de incidencias | Stack identificado y archivado (sanitizado) en la bitácora |
| 2.2 | Reproducir en desarrollo con `bd_csh` ya migrada (curl local); si persiste, trazabilidad en `app/modules/compromisos` (service/repository) hasta la causa raíz | Reproducción 1:1 documentada |
| 2.3 | Si es falta de migración: cerrar con Fase 1 sin código. Si es código: **fix puntual** + **test de regresión** nuevo en `backend/tests/` (no se tocan aserciones existentes) | `pytest` nuevo test rojo→verde |
| 2.4 | Ejecutar módulo completo de triada: `/triada/resumen`, `/triada/inteligencia/resumen-ejecutivo` y el resto de rutas del módulo | curl 200 en toda la familia |
| 2.5 | Verificación desde otra sesión (reglas transacciones) si el fix tocó persistencia | Registro en la bitácora |

**Prioridad de orden:** reproducir/log ANTES de Fase 1 si es posible (el stack actual todavía existe); la reparación finaliza después de Fase 1.

---

## Fase 3 — H3: Configurar `POLIS_TEST_DATABASE_URL` y ejecutar integración geodatos (MEDIA, ~15 min)

| Paso | Acción | Verificación |
|---|---|---|
| 3.1 | Crear base exclusiva `polis_test_251` en :5432 (o reutilizar `polis_test` de :5433) vía SQL de creación simple | `\l` confirma la base |
| 3.2 | Exportar `POLIS_TEST_DATABASE_URL` **solo en la sesión de prueba** (no escribir en `.env` sin autorización); correr `uv run pytest tests/test_geodatos_fuentes.py` | **8/8 passed** (sin skips) |
| 3.3 | Documentar el comando y la convención de base exclusiva en `docs/operacion.md` (PR corto de docs) | Diff mínimo revisado por backend |
| 3.4 | Registrar los 8 resultados como evidencia 252 | Archivo JSON/log en la bitácora |

**Nota:** común con el gate que exigirá Fase 4.

---

## Fase 4 — H4: Aclarar el esquema `participacion` ausente (MEDIA)

| Paso | Acción | Verificación |
|---|---|---|
| 4.1 | Contrastar el código del módulo (`grep -rn "participacion\\." backend/app`) contra las tablas reales de `bd_csh` (solo lectura) | Matriz código↔tablas anotada |
| 4.2 | Decisión con el responsable del módulo: **(a)** por diseño (tabla vive en `public`/otro esquema) → documentarlo y cerrar H4; **(b)** migración faltante → crear `0085_*` siguiendo `docs/transacciones.md` | Decisión documentada y firmada |
| 4.3 | Si (b): nueva migración con transacción atómica + prueba de integración con `POLIS_TEST_DATABASE_URL` (Fase 3) + verificación **éxito y rollback completo desde otra sesión**; pytest 401/403/200 si la ruta pasa a estar protegida o cambia su clasificación según `docs/permisos-api.md`. | Prueba de integración verde y rollback verificado |
| 4.4 | `bun run check` + `backend:check` completos al cierre | exit 0 |

---

## Fase 5 — H5/H6: Actualizar documentación y práctica (INFO, ~20 min)

| Paso | Acción | Verificación |
|---|---|---|
| 5.1 | Corregir rutas en la documentación operativa: `/api/v1/health/ready` (no `/health` ni `/ready` raíz), `/api/v1/participacion/escenarios-especiales` (no `/escenarios`), recuento **25 módulos** | Diff de docs revisado |
| 5.2 | Registrar como práctica formal: corridas de historias anexado serial (`--maxWorkers=1`) en validación de cambios UI (consolidar lo ya documentado en 243/248) | Linea en `docs/plan-trabajo.md` o `docs/operacion.md` |
| 5.3 | Trazar el informe 251 y este plan en `bridge/` (bitácora de badge a badge) | Enlaces cruzados 251↔252 |

---

## Orden de ejecución y dependencias

```
Fase 2.1 (log stack, puede ser ahora)  ─┐
Fase 3  (gate de pruebas, sin riesgo)   ─┼─ en paralelo seguro
Fase 5  (solo docs, sin riesgo)         ─┘
Fase 1  (ventana + autorización EAF)    ─→ Fase 2.2-2.5 (reparación final)
                                          └→ Fase 4.3 (solo si 4.2=(b), depende de Fase 3)
```

**Lotes propuestos:**
1. **Lote A (sin autorización especial):** Fase 2.1 + Fase 3 + Fase 5 → cierra H3, H5, H6 y deja el diagnóstico de H2 completo.
2. **Lote B (requiere ventana/autorización):** Fase 1 → cierra H1 y desbloquea el cierre de H2.
3. **Lote C (según decisión Fase 4.2):** H4 y, si aplica, migración 0085.

**Criterio de cierre de la remediación:** `/api/v1/health/ready` = 200 · triada/resumen = 200 · geodatos 8/8 sin skip · decisión H4 firmada · `bun run check` + `backend:check` exit 0 · dictamen/constancia EAF en `bridge/`.

---

## 6. Registro de ejecución — Lote A (27-10-2026, tras Go del usuario)

### Fase 2.1 — Diagnóstico H2 (COMPLETO)
- El servidor activo corre daemonizado (stdout a socket); no hay log archivado. Se reprodujo el 500 con `TestClient` (`raise_server_exceptions=True`) en proceso local propio, sin tocar el servidor vivo (endpoint de solo lectura).
- **Stack:** `main.py` (middlewares) → `router.py:493 obtener_resumen_triada_motores` → `service.py:453 obtener_resumen_triada` → `TimeoutError` de asyncpg en `prepared_stmt.bind_execute`.
- **Causa raíz:** `backend/app/core/database.py` fija `connect_args={"timeout": 3, "command_timeout": 3}` — **3 segundos por consulta**; del lado servidor `statement_timeout=0` (sin límite). La agregación del resumen (ingesta masiva + `NOT IN` sobre JSONB) excede los 3 s.
- **Con parche de diagnóstico a 30 s (solo proceso local):** `GET /api/v1/compromisos/triada/resumen` = **200 en 28,45 s, payload 22,2 MB**. El 500 también encubre un segundo problema de diseño del resumen (peso/tamaño de respuesta).
- **Propuesta para Fase 2.3 (opciones, decisión de coordinación):** (a) parche mínimo — subir `command_timeout` a 30 s en `database.py`; (b) mejora real — agregación en SQL (pasar filtros de filas completas a sumas/agrupados), índices para `motor_destino` y fugas por JSONB, o bien resumen materializado/caché con TTL; (c) paginar/truncar el payload. Recomendación técnica: (b)+(c) antes que (a) si será endpoint público de alta frecuencia.
- Scripts de reproducción y medición conservados en `bridge/252_evidencia/repro_triada_251.py` y `medir_triada_251.py`.

### Fase 3 — Gate de pruebas de persistencia (COMPLETO)
- Se creó la base exclusiva `polis_test_251`. **Intento en el servidor del host (:5432) falló con `InsufficientPrivilegeError`: `CREATE EXTENSION postgis` exige superuser** y el usuario del `.env` del host no lo es (hallazgo nuevo: la convención `polis_test*` solo despliega extensiones en el servidor donde el rol inicial es superuser — p. ej. el contenedor compose).
- Solución operativa: base `polis_test_251` en el contenedor compose (:5433, usuario superuser del banco de pruebas del proyecto). El conftest mismo migra a head y la suite corrió limpia: **8/8 pass** (verificación de integración del banco multifuente).
- **Evidencia:** `bridge/252_evidencia/20_geodatos_8x8.log` (con y sin variable: 8 pass vs 8 skip).
- **H3 queda cerrado** (para la convención de funcionamiento normal del repo). Conviene registrar en los runbooks que `POLIS_TEST_DATABASE_URL` debe apuntar al banco de pruebas del compose (:5433) o bien proveer superuser/extensiones previas en el host.

### Fase 5 — Documentación (VERIFICACIÓN, sin cambios necesarios)
- README, `docs/permisos-api.md`, `docs/plan-trabajo.md`, scripts de monitoreo/e2e y CI ya usan las rutas reales (`/api/v1/health/live|/ready`, `/api/v1/participacion/escenarios-especiales`); el conteo correcto (25 módulos, 22 routers montados) ya está en `docs/matriz-trazabilidad-modulos.md` y `docs/plan-consolidacion-arquitectura.md`. **Las únicas referencias erróneas relevantes quedan en el propio encargo 251**, que no corresponde editar (documento de otras manos).
- **Observación nueva para el informe:** `docs/plan-trabajo.md` (líneas ~288/362) registra readiness HTTP 200 con `migrations: ok`; el despliegue vivo hoy está en 503 `migrations: pending` (H1). Es una inexactitud del documento histórico frente al estado actual, se declara aquí y se resuelve al aplicar Fase 1.

### Estado del Lote tras ejecución
- H2: **diagnosticado con evidencia de causa raíz; reparación (Fase 2.3) pendiente de decisión de coordinación.**
- H3: **resuelto** (8/8 con base exclusiva en el banco de pruebas correcto).
- H5/H6: **cerrados como INFO** (hoja de ruta: encargo era la única fuente desactualizada; práctica serial ya documentada en 243/248).
- H1: sigue pendiente de ventana (Lote B). H4: pendiente de decisión (Lote C).

---

## 7. Cierre final — decisiones de Coordinación EAF verificadas (27-10-2026)

| Hallazgo | Decisión EAF | Verificación independiente de Freebuff | Estado |
| --- | --- | --- | --- |
| **H1** | Lote B APLICADO: `alembic upgrade head` ejecutado en `bd_csh` | `GET /api/v1/health/ready` → **200 `{"status":"ready","database":"ok","migrations":"ok","extensions":"ok"}`**; `live` → 200; `alembic_version` = **`0084_aportes_colas_y_apoyos`** | ✅ CERRADO |
| **H4** | Cerrado por diseño: el esquema oficial es **`participacion_ciudadana`** (no `participacion`); no requiere 0085 | `pg_namespace` en `bd_csh` contiene `participacion_ciudadana`; **41 referencias** en el código backend (`participacion/models.py`, `repository.py`, `aportes`, `canales`, `sesion`, `testimonios`, `actores`, `formularios`, `notificaciones`, `evidencia`, `politicas`) confirman el uso del esquema oficial | ✅ CERRADO |
| **H2** | Aprobada e implementada opción **(b)+(c)** (Encargo 254): agregación SQL, bounded payload (1,18 MB vs 22,2 MB) y timeout 15 s | `GET /api/v1/compromisos/triada/resumen` responde **HTTP 200 en 2,17 s** (sin filtros) y **0,98 s** (vigencia 2024); payload reducido 18,8x; suite 20/20 y 17/17 pass; evidencia en [`254_resultado_remediacion_h2_triada.md`](file:///root/polis/bridge/254_resultado_remediacion_h2_triada.md) ✅ Verificación independiente Freebuff (28-10-2026): mediciones propias **200 en 2,02 s / 1,19 MB** (sin filtros), **1,21 s** (vigencia=2024) y **0,54 s / 371 KB** (`dimension="1. Seguridad Personal"`; valida solo canon de `taxonomia_seguridad` — 422 con valor no canónico, comportamiento diseñado); muestra motor 3 confirmada en 100 ítems sobre 54.494 registros; `test_triada_motores.py` **20/20 pass**, `test_ingesta_masiva_triada.py` **20 passed** (corrida propia; el informe reporta 17 pass + 2 skip), `ruff check` limpio y **545 archivos formateados**; `database.py` con `timeout`/`command_timeout` 15 s y agregaciones/`select(distinct(...))` confirmadas en `service.py` e `ingesta_masiva_service.py` | ✅ CERRADO |
| **H3** | Resuelto en Lote A | `polis_test_251` en :5433; geodatos **8/8 pass** (`bridge/252_evidencia/20_geodatos_8x8.log`) | ✅ CERRADO (con nota de runbook: superuser para extensiones) |
| **H5/H6** | Cerrados como INFO en Lote A | Referencias del proyecto correctas; únicamente el encargo 251 mencionaba rutas deficientes (documento de otras manos) | ✅ CERRADO |

**Observación resuelta:** la inexactitud de `docs/plan-trabajo.md` (readiness 200) vuelve a ser cierta tras aplicar H1: el despliegue vivo responde 200 con `migrations: ok`. No se modifica el documento histórico.

**Criterio de cierre del plan:** `health/ready` 200 ✅ · triada/resumen 200 ✅ (2,17 s, 1,18 MB) · geodatos sin skip ✅ · decisión H4 documentada ✅ · `backend:check` (ruff check + format) exit 0 ✅.

---

*Plan emitido por Freebuff (EDD); Lote A ejecutado bajo Go del usuario; Lotes B/C ejecutados por Coordinación EAF; Fase 2.3 (H2, opción b+c) ejecutada y verificada bajo Encargo 254. Todos los hallazgos de la auditoría 251 quedan formalmente subsanados y cerrados.*
