# Resultados de auditoría integral — Plataforma POLIS

**Folio:** AUD-POLIS-2026-10-21
**Fecha del snapshot:** 2026-10-21 · rama `main`
**Persona responsable:** implementador/auditor asistido (Buffy)
**Dictamen emitido por:** agente sobre demanda del usuario; no constituye firma de un
evaluador independiente humano conforme a `docs/equipo_auditores_forenses.md`.

---

## 1. Alcance y método

Auditoría del detalle sobre:

| Dimensión | Elementos | Método |
| --- | --- | --- |
| Backend (API) | 260 endpoints en 25 routers (`/api/v1`), 6 esquemas FastAPI, middleware, CORS, cabeceras de seguridad | Revisión estática de `router.py`, `main.py`, `config.py`, `core/*`, servicios y repositorios |
| Backend (persistencia) | 25 servicios, 22 ficheros `models.py` (≈50 modelos), contrato de transacciones (`core/transactions.py`) | Greps de `.commit()`/`.rollback()` fuera del contrato, lectura de casos de uso |
| Base de datos | 67 migraciones Alembic (`0001`→`0067`), esquemas `motor_politicas`, `geodatos`, `mesas_trabajo`, `seguimiento`, `identidad_*`, scripts SQL en `bd/scripts` | Contraste migraciones vs. DDL en runtime, search_path, RLS |
| Frontend | `src/app` (Next.js), `src/core`, `src/shared` (54+ controles UI), 21 dominios en `src/features` | Reglas del kit (`docs/kit-ui-rules.md`), dependencias de capas, historias |
| Checks | `bun run check` (ui:check + tsc + eslint) y `bun run backend:check` (ruff + format + pytest) | Ejecución real con captura de código de salida |

**Fuentes normativas contrastadas:** `AGENTS.md`, `docs/permisos-api.md`,
`docs/transacciones.md` (vía perfil EAF), `docs/kit-ui-rules.md` (vía perfil de
revisión UI).

---

## 2. Resumen ejecutivo

| Área | Veredicto |
| --- | --- |
| Frontend (tipos, lint, política UI) | **APROBADO** — `bun run check` OK (0 errores). Kit UI cumple inventario y tokens según `ui:check`. `bun run build` no ejecutado en este snapshot. |
| Backend — contrato transaccional | **OBSERVACIONES GRAVES** — 6 ficheros realizan `.commit()`/`.rollback()` fuera de `core/transactions.py`, incluido DDL en runtime. |
| Base de datos — migraciones | **OBSERVACIONES GRAVES** — 2 ficheros crean esquemas/tablas/índices fuera de Alembic (deriva de esquema). |
| Backend — calidad estática | **FALLA** — `backend:check` se detiene en ruff con **710 hallazgos** (250 con corrección segura, 5 con corrección insegura y 455 sin corrección automática); pytest no llegó a ejecutarse en esa cadena. |
| Autenticación / autorización | **APROBADO CON FALLAS** — matriz de permisos con 307 filas; se detectó un `NameError` latente (`Settings` no importado) y permisos anónimos fijados en código. |
| Seguridad HTTP (cabeceras, CORS, cookies) | **APROBADO** — HSTS, nosniff, CSP API, SameSite=Lax, `Secure` condicionado, CORS filtrado en producción. |

**Severidad global:** el bloqueo de CI por ruff (710 hallazgos) y la persistencia
fuera del contrato de transacciones son los dos defectos de mayor impacto operativo.

---

## 3. Hallazgos — Backend

### B-1 · [GRAVE] Commits fuera del límite transaccional del caso de uso

**Regla:** `docs/transacciones.md` — el servicio delimita el caso de uso con
`core/transactions.py`; los repositorios nunca confirman ni revierten.

**Evidencia (archivo:línea):**

| Archivo | Línea | Defecto |
| --- | --- | --- |
| `backend/app/modules/canales/service.py` | 241 | `await self.session.commit()` dentro del caso de «radicación WhatsApp» tras insertar `NotificacionTransaccional`, sin `transaction()` |
| `backend/app/modules/compromisos/router.py` | 1157 | Endpoint `pdt_ai_evaluator_dictaminar_hallazgo` lleva `await db.commit()` en **capa de router**; el servicio llama `registrar_dictamen_hallazgo_pdt_pg(...)` que ya usa el patrón `owns_session` |
| `backend/app/modules/compromisos/pdt_persistencia_pg.py` | 366, 473, 589, 827, 970 | Commit manual alternado con el flag `owns_session` (límite transaccional ambiguo dependiendo del llamador) |
| `backend/app/modules/compromisos/pdt_ai_evaluator_graph.py` | 2534, 2542, 2651, 2657 | Commit y rollback manuales (`await db.rollback()` /`await db.commit()`) fuera de `transaction()` |
| `backend/app/modules/identidad/ambito_territorial.py` | 221 | Abre una **segunda** sesión (`AsyncSession(session.bind, ...)`) solo para registrar el evento de auditoría y llama `commit()` — salta el contrato y fragmenta el caso de uso en dos límites distintos |
| `backend/app/modules/compromisos/pdt_hoshin_kanri.py` | 1530 | `rollback()` manual |

**Consecuencia:** operaciones que pueden quedar parcialmente confirmadas al
fallar hacia el final (por ejemplo, la constancia de WhatsApp queda confirmada
pero la propuesta puede verse afectada en el `refresh` posterior); el caso de
auditoría de identidad crea eventos con un límite separado que puede
confirmarlos aunque el caso de uso anterior falle (trazabilidad falsa positiva:
evento `acceso_territorial_denegado` registrado para una operación que falló).

**Corrección propuesta:**
1. Mover el `commit` al servicio encuadrando en `async with transaction(session)`.
2. En `ambito_territorial.py`, registrar el evento dentro del límite de la
   petición actual, no en una segunda sesión.
3. Unificar `owns_session` en `pdt_persistencia_pg.py` con la política de
   `core/transactions.py`, eliminando commits dispersos en esos cinco puntos.

---

### B-2 · [GRAVE] DDL y CREATE SCHEMA en runtime, fuera de control del despliegue

**Regla (AGENTS.md / EAF):** los cambios de persistencia se registran en
migraciones Alembic; un filtro o `IF NOT EXISTS` en runtime no acredita
conformidad.

**Evidencia:**

- `backend/app/modules/compromisos/pdt_persistencia_pg.py:278-339` —
  `CREATE SCHEMA IF NOT EXISTS seguimiento`, `CREATE TABLE IF NOT EXISTS`
  `pdt_ai_evaluaciones`, `pdt_ai_checkpoints_hitl`, `pdt_ai_hallazgos_revision`
  y 3 índices (`ix_pdt_ai_hallazgos_revision_plan_meta`,
  `idx_pdt_ai_checkpoints_hitl_thread`, `ux_pdt_ai_checkpoints_hitl_thread_sha`)
  ejecutan **cada vez que se llama al endpoint** correspondiente.
- `backend/app/modules/compromisos/pdt_conciliador_vinculos_pa_triada.py:71-107`
  — `CREATE TABLE IF NOT EXISTS seguimiento.pdd_vinculos_meta_pa_triada` y
  `CREATE INDEX IF NOT EXISTS idx_pdd_vinculos_meta_pa_triada_plan_tipo`.

**Contraste con Alembic:** ninguna revisión `0001`–`0067` define esas 4 tablas
de esquema `seguimiento`. Las consultas a `pdt_ai_evaluaciones`
`pdd_vinculos_meta_pa_triada`, etc. no devolvieron coincidencias en
`backend/alembic/versions/*.py`. Es deriva de esquema: una instanciación limpia
(`alembic upgrade head` + arranque limpio) no incrementa el mismo estado de base
que un despliegue previo que ya montó algunos endpoints del módulo.

**Consecuencia:** `alembic check` no acredita estas tablas mientras falten en
`Base.metadata`; su resultado en una base caliente o vacía no puede anticiparse
sin ejecutarlo. No hay `downgrade` de esos artefactos y un error parcial deja
la creación de tablas fuera del historial de migraciones.

**Corrección propuesta:** extraer el DDL a una revisión Alembic nueva
(`0068_pdt_ai_evaluation_tables.py`), eliminar la creación en runtime y
conservar el bootstrap-idempotente solo para `ALTER` no destructivos si acaso.

---

### B-3 · [MODERADO] Ruff bloquea CI: 710 hallazgos y razón de prueba truncada

`bun run backend:check` **falló** con `exit code 1` en la primera tijera (ruff)
y por lo tanto `pytest backend/tests` no llegó a ejecutarse en esta cadena.

Desglose (`ruff check --statistics`, se preservan cifras exactas):

| Regla | Cantidad |
| --- | --- |
| E501 line-too-long | 431 |
| I001 unsorted-imports | 84 |
| UP007 non-pep604-annotation-union | 66 |
| F401 unused-import | 56 |
| UP035 deprecated-import | 27 |
| E402 module-import-not-at-top-of-file | 11 |
| UP017 datetime-timezone-utc | 8 |
| B008 function-call-in-default-argument | 8 |
| F811 redefined-while-unused | 6 |
| F841 unused-variable | 5 |
| B023 function-uses-loop-variable | 2 |
| B009 get-attr-with-constant | 2 |
| F821 undefined-name | 2 |
| E741 ambiguous-variable-name | 1 |
| UP012 unnecessary-encode-utf8 | 1 |

Según la salida JSON del Ruff instalado, 250 de los 710 hallazgos admiten
`--fix` **seguro**, incluidos los 6 F811. Los 5 F841 solo admiten
`--unsafe-fixes`; 455 hallazgos carecen de corrección automática, entre ellos
los 2 F821, 2 B023 y 1 E741 detallados en B-4. La clasificación indica
disponibilidad de corrección, no que sea adecuado aplicarla sin revisar el diff.

**Consecuencia:** no hay evidencia de suite transaccional aprobada en el último
estado del árbol; el contrato EAF exige ejecutar `bun run backend:check`+
suites en base `polis_test*` y no se ha completado.

---

### B-4 · [MODERADO] Latentes de código en ficheros sin auto-corrección ruff

| Hallazgo | Archivo:línea | Impacto |
| --- | --- | --- |
| `F821 undefined-name 'Settings'` | `backend/app/modules/identidad/deps.py:57` | Si `app.state.settings` no está fijado (p.ej. tests de dependencia aislados o ASGI alternativo), `getattr(...) or Settings()` dispara `NameError` al vuelo. Funciona hoy porque `main.py` fija `application.state.settings`, pero es frágil. |
| `F821 undefined-name 'Any'` | `backend/app/modules/alternativas/service.py:107` | Mismo patrón: anotación ejecutada sin import nada en la rama activa. |
| `B023 loop variable 'lote'` | `backend/scripts/ingestar_hurtos.py:320,327` | Cierre tardío sobre variable de bucle; riesgo de ingesta duplicada/expedida en lotes incorrectos. |
| `E741 'l'`, `F841` | `politicas/router.py:115`, `canales/service.py:182`, etc. | Menor: legibilidad/variables muertas, incluida una huella SHA descartada. |

**Corrección propuesta:** añadir `from app.core.config import Settings` en
`deps.py` y `from typing import Any` en `alternativas/service.py`; arreglar los
cierres de `ingestar_hurtos.py` con `functools.partial` o parámetro con valor por
defecto en la lambda.

---

### B-5 · [MODERADO] Api de anónimos con permisos fijados en código

**Evidencia:** `backend/app/modules/identidad/deps.py:60-66`.
`SujetoAutenticadoContexto` devuelto para tokens de sesión anónima incluye
`permisos=["aportes:crear", "aportes:leer", "aportes:apoyar"]` fijado en código,
en paralelo al catálogo de `PostgreSQL` que la matriz `permisos-api` requiere
consultar para usuarios registrados.

**Consecuencia:** una modificación de permisos anónimos en la matriz implicará
doble fuente de verdad (DB vs. hardcoded), en contra de la regla «en cada
petición se comprueban vigencia, rol y permisos actuales en PostgreSQL».

---

### B-6 · [INFO] Monitoreo HTTP correcto

`log_request` registra plantillas de rutas sin cadenas de consulta ni contenido
de usuario; `global_telemetry` y Sentry con inicialización condicionada según
`settings.sentry_dsn`. Sin defectos observados.

---

## 4. Hallazgos — Administración de datos (Base de datos)

### BD-1 · [GRAVE] Deriva de esquema por runtime-DDL
Detalle completo en B-2. Hallazgo transversal backend ↔ base de datos.

### BD-2 · [INFO] Contrato transaccional bien implementado en el núcleo

-`core/transactions.py`: guard de anidación (`RuntimeError` si ya hay owner), límite de caso de uso único, `commit` al final, `rollback` en excepción,
  limpieza en `finally`. Correcto y conservador.
- `core/database.py`: `pool_pre_ping`, `command_timeout` 3 s,
  `hide_parameters=True`, `expire_on_commit=False`, naming convention explícita
  con `ck_/fk_/pk_/ix_/uq_`. Buena práctica.
- `Base.metadata` en `env.py` como `target_metadata`, sin ocultamiento de
  diferencias visto en la lectura estática (no se detectó `include_object`
  filtrado).

### BD-3 · [INFO] Scripts SQL y procedimientos

- `bd/scripts/01_fundaciones_y_extensiones.sql` crea 2 funciones
  (`postgis`/`ltree` fundacionales) — sin `search_path = pg_catalog, pg_temp`
  explícito en el propio cuerpo; el contrato de seguridad SQL
  (`docs/arquitectura.md`) exige funciones privilegiadas con `SET search_path =
  pg_catalog, pg_temp`. La única función plpgsql de Alembic
  (`0021_identidad_completa.py:97`) **sí** cumple el patrón.
- No hay políticas RLS (`CREATE POLICY`) en ningún punto de Alembic ni de
  `bd/scripts`; el modelo de autorización recae íntegramente en la capa API.
  Aceptable por diseño (DB de confianza de la app sin usuarios externos), pero
  documentar explícitamente la decisión, pues la auditoría ha de tener en cuenta
  el aislamiento del rol de CI y el de producción.

### BD-4 · [INFO] Recompute de índices y extracto de consultas

Ningún endpoint registrado usa `.where(text(...))` dinámico con contenido
controlado por usuario en las lecturas analizadas; los `text()` recurrentes
suelen ser fragmentos de DDL o lo envuelven con parámetros (`:param`) reales —
no se detectó inyección SQL en la muestra revisada (25 routers), con límites de
la muestra reales: los ficheros de más de 1500 líneas del módulo `compromisos`
se revisaron por muestreo dirigido, no línea a línea completa.

---

## 5. Hallazgos — Frontend

### F-1 · [INFO] Checks en verde

-`bun run ui:check` → **OK** («controles, tokens, capas, inventario, historias y política a11y correctos»).
- `tsc --noEmit` → **OK** (0 errores TS).
- `eslint .` → **OK** (0 errores).

### F-2 · [MODERADO] Acoplamiento entre features (`sesion`, `plataforma` y otros 14 dominios)

**Evidencia (10+ referencias):** los dominios `actores`, `seguimiento` importan
directamente el estado global de sesión y modelos de otra feature:

- `src/features/actores/panels/actor-editor-panel.tsx:28-29`
- `src/features/actores/services/actores-api.ts:2`
- `src/features/seguimiento/panels/{devolucion-detalle-panel,indicador-detalle-panel,compromiso-editor-panel}.tsx`
- `src/features/seguimiento/views/seguimiento-view.tsx:38-40` (incluye `use-politicas-queries` de otra feature)

**Consecuencia:** dependencia cruzada no dirigida (sesión/plataforma actúan como
cascada de factibilidad). Se recomienda movilizar `useSesionStore` y
`puedeEditar` a `src/core` o un `shared/auth` para volver a dirigir las flechas
arriba.

### F-3 · [MODERADO] Cobertura de historias incompleta en el kit

54 controles en `src/shared/ui` carecen de archivo `.stories.tsx`
(`accordion`, `alert`, `badge`, `card`, `dialog`, `input`, `select`, `table`,
`tabs`, etc.). La política `ui:check` no los bloquea (usa el inventario de
`catalog.stories`/`patterns.stories`), pero `docs/kit-ui-rules.md` exige
historias por componente: se recomienda una ola de completado de `.stories`
para los 54.

### F-4 · [INFO] Higiene

- `console.log` en `src`: 1 coincidencia.
- `TODO/FIXME`: 109 anotaciones repartidas. Deuda técnica sin clasificar por
  severidad, se recomienda un triaje.
- `fetch(` directo en 17 ficheros de features/app: aceptable, pero
  se recomienda centralizar en `core/http` cuando el dominio crezca (solo
  `src/app/api/formularios/revalidar/route.ts` usa fetch en las rutas serverless).

---

## 6. Cobertura y límites de la auditoría

| Verificado | No verificado |
| --- | --- |
| 260 endpoints enumerados y clasificación por dependencias | Todos los routers línea a línea (muestreo dirigido en `compromisos`, el más grande) |
| ◦ `bun run check` ejecutado con éxito | Suite `pytest backend/tests` no ejecutada en esta pasada (ruff abortó la cadena primero; EAF exigiría correrla en `polis_test*`) |
| ◦ `bun run backend:check` ejecutado y fallando (se conserva el código de salida en el informe) | `storybook:build`, `ui:test`, `ui:policy:test` no ejecutados en esta pasada |
| Estados dependientes de los casos B-1/B-2 mediante lectura de código | Criterios de disponibilidad, cobertura jurídica universal y vivienda o condiciones `docs/identidad.md` (no se tocaron caminos de correo/MFA en este snapshot) |
| DDL vs Alembic de las 4 tablas `pdt_ai_*` + 1 tabla `pdd_vinculos` | Resto de esquemas comparados fila por fila contra migraciones (se realizó verificación selectiva) |

**Declaraciones conforme el perfil EAF:**

- Esta auditoría no acredita ninguna reparación hecha de un único commit en los
  casos en que persistiendo código fuera del límite: los casos B-1/B-2 se
  declaran como hallazgos, no como conformidad.
- Los checks verdes no demuestran disponibilidad, ausencia total de defectos ni
  conformidad con la captura de desplegar: son evidencia técnica, no dictamen
  EAF de despliegue.
- Queda expresamente fuera del alcance: aprobación de publicación, cambios en
  servicios externos, y modificaciones al árbol: este documento es solo
  diagnóstico; ninguna reparación se ha aplicado automáticamente.

---

## 7. Plan de acción prioritario (propuesto)

1. **[P0]** Sanear ruff (ejecutar `ruff check backend --fix` + revisión de los
   5 F841 con corrección insegura y corrección manual de los 455 restantes;
   decidir `line-length` en
   `pyproject.toml`, se recomienda 120 — quedan 112 E501 >120 a reescribir).
2. **[P0]** Extraer la persistencia de `pdt_persistencia_pg.py` y
   `pdt_conciliador_vinculos_pa_triada.py` a una revisión Alembic y eliminar el
   DDL runtime (B-2/BD-1).
3. **[P1]** Refactorizar los 6 ficheros de commits fuera del contrato hacia
   `core/transactions.py` (B-1) y correr la suite de transacciones en base
   `polis_test*` con datos provistos por `test_transactions_integration.py`
   (existe prueba para `formulas`/`mesas`/`aportes` allí).
4. **[P1]** Arreglar `Settings` y `Any` no importados (B-4).
5. **[P2]** Sincronizar los permisos de anónimos con la `PostgreSQL` mediante el
   rol del catálogo de identidad (B-5).
6. **[P2]** Desacoplar sesiones de features hacia `core` (F-2) y añadir
   historias Storybook para los 54 controles restantes (F-3).

---

## 8. Firma y condiciones

- **Referencia Git:** commit `cc221308b31dcae9e130766cb4b787ea7e70340e`
  de `main`, 2026-10-21. El árbol de trabajo estaba **sucio** durante la auditoría,
  incluidos ficheros de `backend/app/modules/compromisos`. El hash identifica
  únicamente el commit base y **no reproduce** el working tree observado: no se
  conservó un diff íntegro con los archivos sin seguimiento de aquel instante.
  Por ello las cifras y hallazgos son evidencia del diagnóstico original, no una
  línea base reproducible. La fase 0 del plan exige fijar una línea base nueva,
  repetir los conteos y registrar su evidencia antes de ejecutar remediaciones.
- **Cobertura de checks:** `bun run check` (ui:check + typecheck + eslint) y
  `bun run backend:check` (ruff + format, abortado antes de pytest). **No se
  ejecutó** `bun run build` ni `storybook:build`; el veredicto de frontend cubre
  tipos/lint/política UI, no compilación de producción.
- **Dictamen:** los checks pasados son evidencia técnica; este documento
  **no autoriza** despliegue, publicación ni modificación de servicios externos.
- **Independencia:** auditoría producida por el mismo agente que, en sesiones
  previas de mantenimiento del repositorio, pudo haber cooperado con cambios
  afines; conforme a `docs/equipo_auditores_forenses.md`, se requiere lectura
  independiente por parte del equipo EAF para cerrar el paso.
