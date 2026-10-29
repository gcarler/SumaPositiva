# Plan de remediación — Hallazgos AUD-POLIS-2026-10-21

**Derivado de:** [resutados20102026.md](resutados20102026.md) (auditoría integral del 2026-10-21)
**Fecha:** 2026-10-21
**Referencia Git del diagnóstico:** commit `cc221308b31dcae9e130766cb4b787ea7e70340e`
de `main`. El diagnóstico se hizo sobre un árbol con cambios sin commit; ese hash
por sí solo no reproduce el código observado. La fase 0 fija una nueva línea base
reproducible antes de ejecutar las tareas.
**Estado:** plan propuesto, pendiente de aprobación del director del proyecto

Cada tarea indica el hallazgo que remedia, la corrección concreta, el criterio
de aceptación (CA) y la verificación a ejecutar. Las tareas se agrupan en
una fase de preparación y cuatro fases de ejecución (P0 → P3). Sus dependencias
se indican en cada tarea.

---

## Fase 0 · Preparación (medio día)

| # | Tarea | Hallazgo |
| --- | --- | --- |
| 0.0 | Fijar una línea base reproducible: crear un worktree limpio desde `main`, incorporar únicamente los cambios de código pertinentes al diagnóstico y guardar su diff o commit, los archivos nuevos y sus SHA-256; repetir allí los conteos y checks citados. Registrar hash, estado de Git y evidencia en el dictamen antes de ejecutar T1–T15. El árbol sucio original no queda identificado solo por el hash de `main`. | Precondición de trazabilidad EAF |
| 0.1 | Proveer o confirmar base de pruebas `polis_test*` y exportar `POLIS_TEST_DATABASE_URL` para que toda verificación de persistencia realice rollback real | Precondición EAF |
| 0.2 | Crear rama de trabajo `remediacion/aud-2026-10-21` desde la línea base fijada en 0.0; cambiar `line-length = 100` a `120` en la sección `[tool.ruff]` existente de `backend/pyproject.toml` (431 de los 710 hallazgos son E501 a 100) | B-3 |
| 0.3 | Decidir qué reglas ruff se mantienen obligatorias y documentar la decisión en el commit que toque `backend/pyproject.toml` | B-3 |

**CA-0:** la línea base tiene identificador reproducible y conteos comprobados;
`uv run --project backend ruff check backend --statistics` muestra el desglose
post-umbral-120. Ningún commit posterior se acepta en `backend/`
sin `uv run --project backend pytest backend/tests` en verde.

---

## Fase 1 · P0 — Bugs latentes y CI desbloqueada (1–2 días)

### T1. Importaciones faltantes (hallazgo B-4)

**Errores:** `F821 undefined-name` × 2.

1. `backend/app/modules/identidad/deps.py:57`: agregar
   `from app.core.config import Settings` en la cabecera, y **decidir** con el
   product owner si se conserva el fallback `getattr(...) or Settings()`. Se
   recomienda depender exclusivamente de `app.state.settings` (ver T8) para no
   enmascarar errores de configuración.
2. `backend/app/modules/alternativas/service.py:107`: agregar
   `from typing import Any` en la cabecera.
3. `backend/tests/test_transactions_integration.py:431`: partir el import
   compuesto de schemas en varias líneas (resuelve E501 e I001 del fichero).

**CA-1:** ruff reporta **0 hallazgos F821/E501/I001** en esos tres ficheros y
`pytest backend/tests -k "transacciones"` corre en verde.

### T2. Cierres de bucle defectuosos y variables muertas (hallazgo B-4)

1. `backend/scripts/ingestar_hurtos.py:320,327` (`B023`, cierre sobre `lote`):
   extraer la función que usa `lote` y pasarle el valor como parámetro (o
   capturarlo en una variable local antes de la lambda). Es un defecto real de
   ingesta masiva: puede expedir un lote distinto al planificado.
2. `backend/app/modules/canales/service.py:182` (`F841`, huella SHA descartada):
   decidir si se registra en los logs de radicación o se elimina de la lógica.
   La decisión debe quedar documentada en el commit; no borrar la línea a ciegas.
3. `backend/app/modules/politicas/router.py:115` (E741): renombrar `l` a
   `localidad` o equivalente.
4. Los 4 `F841` restantes: remover o usar la variable, **sin `# noqa`**.

**CA-2:** ruff = 0 para F841/B023/E741, y la ejecución de la ingesta de muestra
produce lotes correctos y completos en el log de prueba.

### T3. Saneo residual y cierre de Fase 1 (hallazgo B-3)

1. `uv run --project backend ruff check backend --fix` para los 250 hallazgos
   marcados `[*]` (I001, UP007, F401, UP035, UP017, B009, F811, UP012).
2. El bloque residual de **460 hallazgos** (710 − 250) comprende 5 F841 con
   corrección insegura y 455 sin corrección automática, incluidas E501, F821,
   E741, B023, B008 y E402. Corregir **fichero por fichero** revisando el diff;
   no aplicar `--unsafe-fixes` a ciegas sobre todo el árbol.
3. Revisar los 11 ficheros con `E402`: en `backend/app/main.py` los
   `include_router` a pie de `create_app` son intencionales; mover los imports
   a la cabecera es factible y resuelve el hallazgo sin cambiar la semántica.
   Si algún import debe permanecer dentro de la función, documentar por qué.
4. Los 8 `B008` (Depends como valor por defecto): envolver en
   `Annotated[...]`/`Use(...)` conforme FastAPI moderno o usar
   `style: no-annotation` en la configuración si la política lo prefiere.
5. Decidir el umbral E501 contra el desglose real: con `line-length = 120`
   quedan 112 líneas que aún exceden (verificado con
   `ruff check backend --line-length 120`); esas 112 requieren reescritura o
   un `per-file-ignores` documentado.
6. Resolver el formato de forma explícita: con la configuración actual,
   `ruff format --check backend` falla en **114 archivos** (280 ya formateados).
   Repetir el conteo tras cambiar `line-length`, aplicar `ruff format` por
   lotes y revisar cada diff antes del CA-3.

**CA-3 (cierre Fase 1):**

```bash
uv run --project backend ruff check backend && \
uv run --project backend ruff format --check backend && \
uv run --project backend pytest backend/tests
```
→ exit 0 (equivalente a `bun run backend:check` en verde).

---

## Fase 2 · P1 — Contrato transaccional y deriva de esquema (3–5 días)

> Aplica `.agents/skills/polis-edd-transactions/SKILL.md` y `docs/transacciones.md`.

### T4. Deriva de esquema: DDL runtime → Alembic (hallazgos BD-1 / B-2)

1. **Inventario completo de índices (corregido tras revisión externa): son 5,
   no 4.** Tres en `pdt_persistencia_pg.py` (`idx_pdt_ai_hallazgos_revision_plan_meta`,
   `idx_pdt_ai_checkpoints_hitl_thread`, `ux_pdt_ai_checkpoints_hitl_thread_sha`)
   y **dos** en `pdt_conciliador_vinculos_pa_triada.py`
   (`uq_pdd_vinculos_meta_pa_triada_meta_id`, `idx_pdd_vinculos_meta_pa_triada_plan_tipo`).
2. Crear revisión `backend/alembic/versions/0068_pdt_ai_evaluacion_tables.py`
   con: `CREATE SCHEMA IF NOT EXISTS seguimiento` (idempotente), las tablas
   `pdt_ai_evaluaciones`, `pdt_ai_checkpoints_hitl`, `pdt_ai_hallazgos_revision`
   y `pdd_vinculos_meta_pa_triada`, más los **5 índices** del inventario
   (copiar las definiciones de `pdt_persistencia_pg.py:282-364` y
   `pdt_conciliador_vinculos_pa_triada.py:71-105`).
3. **Metadata SQLAlchemy:** declarar las 4 tablas del DDL runtime en
   `compromisos/models.py` con `schema='seguimiento'`, incluyendo columnas,
   restricciones, defaults e índices de la entrega. `Base.metadata` debe
   reflejarlas; no excluirlas mediante `include_object` en `env.py`.
4. Eliminar por completo los bloques `CREATE SCHEMA/TABLE/INDEX` de ambos
   ficheros, dejando solo consultas DML. Si algún `SELECT` llega antes de la
   migración, la ruta debe fallar (código 500) y **no** crear el artefacto en
   runtime.
5. En `upgrade()` conservar los valores por defecto de servidor de
   `creado_en`/`registrado_en` para que la tabla instalada desde cero se
   comporte igual que la existente. En `downgrade()` retirar solo los objetos
   introducidos por la revisión, en orden inverso, sobre una base de prueba.
6. Ejecutar `uv run --project backend alembic -c backend/alembic.ini check`
   tras instalar en base vacía. **Nota:** `alembic check` solo acredita que la
   metadata coincide con una base instalada desde cero; NO acredita por sí solo
   la equivalencia con la base caliente existente.
7. Validar el ciclo completo en bases `polis_test*`: instalación desde cero y
   actualización de una copia aislada de la base caliente; probar `upgrade head`,
   `downgrade -1` y re-`upgrade` en una copia desechable. Comparar definiciones
   de las 4 tablas y los 5 índices mediante dumps de esquema normalizados e
   inventario de catálogo, separando diferencias preexistentes. Comprobar que
   los datos anteriores sobreviven al *upgrade*; no atribuir conservación de
   filas de tablas nuevas a un *downgrade* que las elimina.

**CA-4:** (a) `grep -rn "CREATE SCHEMA\|CREATE TABLE\|CREATE INDEX" backend/app/modules`
→ 0 resultados; (b) `alembic check` OK con las 4 tablas y los 5 índices en
`Base.metadata`; los índices se crean en `upgrade()` y se retiran en
`downgrade()`; (c) las definiciones de esos 9 objetos coinciden entre la base
instalada desde cero y la copia caliente actualizada, y los datos anteriores
permanecen tras el *upgrade*.

### T5. Commits fuera del contrato (hallazgo B-1)

Orden de ejecución de menor a mayor riesgo:

| # | Fichero | Cambio |
| --- | --- | --- |
| 5.1 | `backend/app/modules/compromisos/pdt_hoshin_kanri.py:1530` | Encerrar el caso de uso en `async with transaction(session)` y eliminar el `rollback()` manual |
| 5.2 | `backend/app/modules/canales/service.py:241` | Envolver la radicación WhatsApp completa en `async with transaction(self.session)`; remover `commit()` y revisar si el `refresh()` posterior tiene sentido antes del commit (devolver los objetos que conforman la respuesta) |
| 5.3 | `backend/app/modules/compromisos/router.py:1157` | El router no debe gestionar sesión: crear un método de servicio que delimite el caso de uso con `transaction()` y remover `await db.commit()` del endpoint. Eliminar el concepto `owns_session` |
| 5.4 | `backend/app/modules/compromisos/pdt_persistencia_pg.py` (5 sites) y `pdt_ai_evaluator_graph.py` (4 sites) | Unificar con `core/transactions.py`, eliminando las ramas `owns_session=True/False` (un savepoint no acredita rollback del caso de uso completo) |
| 5.5 | `backend/app/modules/identidad/ambito_territorial.py:201-224` | **Rediseño (corregido tras revisión externa):** el diseño anterior era incorrecto — si el evento se registra en la sesión de la petición y después se lanza `HTTPException(403)`, el rollback del caso de uso revierte también el evento y se pierde la evidencia del acceso denegado. Diseño exigido: transacción explícita separada y acotada para el evento de denegación, confirmada antes del fallo, siguiendo el precedente del contador de intentos en `docs/transacciones.md` («El contador de intentos es un caso separado que se confirma antes de autenticar, para conservar intentos denegados»). La decisión de conservar el evento queda documentada en el commit; la prueba del evento se corre desde otra conexión (segunda sesión), no desde la misma |

**CA-5:**
1. `grep -rn "\.commit()\|\.rollback()" backend/app --include="*.py" | grep -v core/transactions.py` → 0 resultados.
2. `grep -rn "owns_session" backend/app` → 0 resultados.
3. Evidencia desde una **sesión nueva** (otra conexión) para 3 casos elegidos:
   radicación WhatsApp, dictamen de hallazgo, acceso territorial denegado.
   Para los dos primeros: éxito confirmado íntegramente, rollback completo ante
   fallo posterior al primer `flush`, y ausencia de restos tras el fallo. Para
   el caso de denegación territorial (T5.5): el `EventoIdentidad` **SÍ debe
   persistir** en la segunda conexión a pesar del 403 — es el objetivo del
   diseño de transacción separada.

### T6. Suite transaccional completa (perfiles EAF)

1. Ejecutar `bun run backend:check` completo con `POLIS_TEST_DATABASE_URL`
   apuntando a `polis_test*` (nunca contra `bd_csh`).
2. Extender `backend/tests/test_transactions_integration.py` con los 3 casos de
   T5 si aún no los cubre, incluidos los estados dependientes: conversión MGA,
   participantes, cierre de actas, devolución motivada y apoyos.

**CA-6 (cierre Fase 2):** suite transaccional + identidad en verde sobre
`polis_test*`, corroborado por un run en CI. Documentar un **dictamen EAF
anexo** con snapshot (commit hash), fecha, alcance y límites.

---

## Fase 3 · P2 — Autorización y acoplamientos (3–5 días)

### T7. Permisos anónimos fijados en código (hallazgo B-5)

**Cambio:** en `identidad/deps.py:60-66`, resolver los permisos del rol
`ciudadano_anonimo` desde PostgreSQL (catálogo de roles conforme a
`docs/permisos-api.md`) en lugar de la lista literal de tres permisos. Puede
usar cache a nivel app con invalidación por revocación.

**Verificación:**
1. Prueba 401 sin token, 403 con permiso insuficiente y 200 con permiso sobre
   `/api/v1/aportes` en `polis_test*`.
2. Cambiar un permiso en la base y comprobar que la siguiente petición lo
   refleja sin reinicio (comportamiento requerido por la matriz).

### T8. Dependencia explícita de `app.state.settings`

**Cambio:** remover el fallback `or Settings()` de `obtener_sujeto_autenticado`
y obligar `app.state.settings` (lo `main.py` fija hoy). Si alguna suite de
prueba crea un cliente sin `settings`, ajustarla para provisionar el estado y
no para silenciar la dependencia.

### T9. Acoplamiento entre features (hallazgo F-2)

**Cambio:** mover `useSesionStore` (desde
`src/features/sesion/state/session-store`) y `puedeEditar` (desde
`src/features/plataforma/models/acceso`) a `src/core`, y actualizar sus usos.
La flecha válida es features → core; features → features queda prohibida salvo
excepción documentada en `docs/kit-ui-rules.md`.

**Cobertura real (autoauditoría):** el análisis preciso encontró **137 imports
cruzados entre 16 dominios de features** (no «10+» como estimaba la primera
versión del plan). El desglose dominante:

| Dominio importado | Cruces aprox. |
| --- | --- |
| `sesion` (useSesionStore, identidadApi, tienePermiso) | 52 |
| `plataforma` (puedeEditar, puedeVer) | 21 |
| `politicas` (useFases, HeroPageBanner, datos) | 17 |
| `aportes`, `geovisor`, `mesas`, `evidencias`, `testimonios`, `noticias` | 47 restantes distribuidos |

Plan específico:
1. Oleada 1 (alta cobertura, bajo riesgo): mover useSesionStore/puedeEditar/
   tienePermiso/identidadApi/Sesion a `src/core` — resuelve ~73 de los 137.
2. Oleada 2: componentes compartidos (`HeroPageBanner`, stores de datos
   como useMesasStore, fixtures como BARRIOS_CARTAGENA y POLITICAS_MOCK) hacia
   `src/shared` o `src/geodatos-cartagena` según su naturaleza.
3. Oleada 3: dependencias de dominio plataforma→actores/mesas/fuentes
   (vistas de composición) — evaluar si esas vistas pertenecen a `plataforma`
   o deben residir en el dominio dueño.
4. Cada oleada cierra con `bun run check` en verde.

**Verificación (cierre por oleada, corregido tras revisión externa):**
1. `grep -rEn "from \"@/features/[a-z]+/" src/features` procesado por dominio
   → 0 cruces (o los restantes con excepción documentada).
2. `bun run check` (incluye el chequeo de capas de `ui:check`) en verde.
3. `bun run ui:test` en verde.
4. `bun run build` exit 0 — obligatorio en el CA de esta tarea, no como nota
   para el auditor externo: mover estado a `src/core` puede romper boundaries
   de SSR/client que `tsc --noEmit` no exhibe.

### T10. Kit: historias de los 54 controles restantes (hallazgo F-3)

Ronda única de generación de `.stories.tsx` para los 54 controles listados en
`resutados20102026.md` §F-3, priorizando los interactivos críticos de a11y:
`dialog`, `drawer`, `sheet`, `dropdown-menu`, `select`, `table`, `tabs`,
`accordion`, `alert-dialog`, `command`, `search-field`.

**Verificación:** `bun run ui:test` (vitest de Storybook) y `bun run check`
en verde; revisión axe en los 11 prioritarios. No desactivar axe para
resolver un hallazgo.

---

## Fase 4 · P3 — Higiene y deuda (1–2 días)

| # | Tarea | Hallazgo |
| --- | --- | --- |
| 11 | Triaje de los 109 `TODO/FIXME`: clasificar [bloqueante / deuda / info] y mover la deuda real al backlog (`worklog.md`) | F-4 |
| 12 | Centralizar `fetch` en `core/http` para los 17 ficheros identificados, priorizando los dominios con más llamadas | F-4 |
| 13 | Añadir `SET search_path = pg_catalog, pg_temp` a las funciones de `bd/scripts/01_fundaciones_y_extensiones.sql` y verificar la instalación en base vacía | BD-3 |
| 14 | Documentar la decisión de no-RLS (BD-3) en `docs/arquitectura.md` y `docs/operacion.md`: qué rol(es) tienen SELECT en producción y la política de backups/purga de `seguimiento.pdt_ai_evaluaciones` | BD-3 |
| 15 | Definir y documentar la política de retención y purga del módulo WhatsApp (teléfonos en `NotificacionTransaccional`): requerido para cumplimiento de Habeas Data | B-1/5.2 |

---

## Cronograma propuesto

| Semana | Fase | Efecto |
| --- | --- | --- |
| S1 (1–2 días) | Fase 0 + Fase 1 (P0) | CI backend desbloqueada; bugs de ingesta y `NameError` eliminados |
| S1–S2 (3–5 días) | Fase 2 (P1) | Contrato de transacciones al 100 %; base reconstruible íntegramente desde Alembic |
| S2–S3 (3–5 días) | Fase 3 (P2) | Permisos anónimos desde la base; oleada 1 de desacoplamiento (~73 cruces resueltos); 54 historias del kit |
| S3–S4 (1–2 días) | Fase 4 (P3) | Higiene, documentos operativos y retención |

**Estimación preliminar: 10–14 días-hombre**, sujeta a recalcularse en Fase 0
con la línea base reproducible, los 114 archivos inicialmente pendientes de
formato y la disponibilidad de `polis_test*`.

---

## Reglas de gobierno aplicables

1. **Transacciones:** aplicar
   `.agents/skills/polis-edd-transactions/SKILL.md` en toda escritura; los
   repositorios usan `flush`/`refresh`, nunca `commit`/`rollback`; el servicio
   delimita el caso de uso (Fase 2).
2. **Evaluación independiente:** cada fase cierra con evidencia técnica y un
   dictamen EAF con snapshot y límites; el implementador no firma como
   evaluador de su propio cambio.
3. **Migraciones:** instalación desde base vacía, `alembic check`,
   downgrade/upgrade con datos anteriores conservados, metadata completa de
   modelos, esquemas e índices entregados (T4).
4. **Permisos:** toda modificación de permisos (T7) requiere pruebas de éxito,
   401/403, condiciones del recurso y actualización de `docs/permisos-api.md`;
   las excepciones públicas exigen motivo y decisión de producto documentada.
5. **UI:** aplicar `.agents/skills/polis-ui-build/SKILL.md` y
   `.agents/skills/polis-ui-review/SKILL.md`; correr `bun run ui:test` y
   `ui:policy:test` cuando se evolucionen guardas (T10).
6. **Identidad:** aplicar `docs/identidad.md` si T7/T8 tocan usuarios, roles,
   login o correo: probar revocación, propiedad, delegación, uso único y
   rollback sin enviar correo real.
7. **Alcance:** no modificar `.env`, documentos de referencia, ni cambios
   ajenos a este plan; los datos de demostración permanecen separados de los
   datos persistidos.

---

## Anexo A · Auto-revisión técnica del plan (2026-10-21)

Revisión de control de calidad sobre este mismo documento en el mismo snapshot,
contrastando cada cifra y ruta citada contra el repositorio real.

**Advertencia de independencia (docs/equipo_auditores_forenses.md):** esta
auto-revisión es el propio implementador verificando su trabajo; es evidencia
técnica, **no** un dictamen de un evaluador independiente ni sustituye la
revisión EAF externa. Se entrega como insumo para esa revisión.

### A.1 Afirmaciones verificadas contra el repositorio

| Afirmación del plan | Verificación | Resultado |
| --- | --- | --- |
| `deps.py:57` usa `Settings` sin importar | `sed -n '57p'` | Confirmado, línea exacta |
| `alternativas/service.py:107` usa `Any` sin importar | `sed -n '107p'` | Confirmado |
| `canales/service.py:241` hace `await self.session.commit()` | `sed -n '241p'` | Confirmado |
| `politicas/router.py:115` tiene variable `l` | `sed -n '115p'` | Confirmado |
| `compromisos/router.py:1157` hace `await db.commit()` | `sed -n '1157p'` | Confirmado |
| `pdt_persistencia_pg.py:278` ejecuta `CREATE SCHEMA` | `sed -n '278p'` | Confirmado |
| `pdt_conciliador_...py:71` ejecuta `CREATE TABLE` | `sed -n '71p'` | Confirmado |
| Última revisión Alembic = 0067 → la nueva es 0068 | `ls versions` | Confirmado |
| `test_transactions_integration.py` existe | `ls` | Confirmado |
| 710 hallazgos ruff; 250 con corrección segura | Salida JSON de Ruff | Confirmado: 250 seguros = 84 I001 + 66 UP007 + 56 F401 + 27 UP035 + 8 UP017 + 2 B009 + 6 F811 + 1 UP012; 5 F841 con corrección insegura y 455 sin corrección automática |
| `ruff format --check backend` | Ejecución de solo lectura | Falla: 114 archivos por formatear, 280 ya formateados; repetir tras cambiar `line-length` |
| 54 controles de `shared/ui` sin historia | bucle `.stories.tsx` | Confirmado (54) |
| 109 `TODO/FIXME`; 17 ficheros con `fetch(` | grep | Confirmado |

### A.2 Erratas detectadas y corregidas en esta re-edición

| Antes | Detección | Corrección aplicada |
| --- | --- | --- |
| «~460 del bloque residual se resuelven… 123» en T3 | 710 − 250 = 460 | T3 paso 2 corregido a ~460 con desglose por regla |
| «umbral 120 elimina los E501» | `ruff --line-length 120` deja 112 E501 | Añadido T3 paso 5 con ese dato y opciones de remedio |
| «10+ imports cruzados» en T9 | conteo preciso por dominio: **137 cruces en 16 dominios** | T9 rehecho en 3 oleadas con desglose (oleada 1 resuelve ~73) |

### A.3 Lo que la auto-revisión no puede acreditar

1. Que las cifras de esfuerzo (10–14 días-hombre) sean ajustadas: implican
   juicio de productividad no verificable estáticamente.
2. Que la suite pytest completa pase tras la Fase 1: exige ejecutarla en la
   base `polis_test*`, no disponible desde este agente sin
   `POLIS_TEST_DATABASE_URL`.
3. Que la extracción T4 (Alembic 0068) capture el 100 % de los artefactos de
   runtime: el módulo `compromisos` se revisó por muestreo; podría haber DDL
   embebido no indexado por los grep de `CREATE TABLE` (p. e., f-strings
   compuestos). El auditor externo debe contrastar con
   `alembic check` + instalación en base vacía.
4. Cobertura funcional de los casos de prueba sugeridos: los CA describen qué
   debe pasar, no garantizan que existan fixtures para todos los estados
   dependientes (MGA, actas, apoyos).

### A.4 Puntos de especial atención para el auditor externo

- Validar la decisión de `line-length` y si acepta `per-file-ignores` (política
  que EAF ha de ratificar, no el implementador).
- Revisar la oleada 1 de T9: mover sesión a `src/core` cambia consumidores en
  12 dominios; pedir un run completo de `ui:test` + build de producción antes
  de aceptar la oleada como cerrada.
- Confirmar que `ambito_territorial.py` no pierde el registro del evento si la
  petición aborta tras el `flush` (comportamiento alternativo: usar un límite
  transaccional propio documentado).

---

## Anexo B · Incorporación de la revisión externa (2026-10-21)

Un revisor externo contrastó los dos documentos contra el mismo árbol de trabajo
sin modificar archivos ni ejecutar pruebas sobre la base
(persistiendo el límite de `POLIS_TEST_DATABASE_URL`). Sus 5 puntos
prioritarios, verificados por el implementador y resultantes:

| # | Punto del auditor | Verificación | Acción aplicada |
| --- | --- | --- | --- |
| 1 | T4 enumera 4 índices, el código crea 5; falta metadata SQL y comparación de esquema | `grep CREATE.*INDEX`: 3 en `pdt_persistencia_pg.py` (344, 352, 360) + 2 en `pdt_conciliador` (99, 103) | T4 exige 5 índices y 4 modelos declarativos; la comparación se limita a esos objetos en bases de prueba. Se eliminó la opción contradictoria de ocultar tablas en `env.py`. |
| 2 | T5.5 perdería el evento de acceso denegado por rollback del 403 | lectura de `docs/transacciones.md` y `ambito_territorial.py:209` | T5.5 rediseñado: transacción separada explícita para el evento, precedente del contador de intentos; CA-5.3 exige persistencia del evento en segunda conexión |
| 3 | Diagnóstico con «6 no auto-corregibles», marca de build no ejecutado y fragmentos corruptos (sección 4, `@$%features`) | Ruff JSON confirmó 250 correcciones seguras, 5 inseguras y 455 sin corrección; grep confirmó los fragmentos | `resutados20102026.md` corregido: clasificación exacta, veredicto frontend sin build y fragmentos reparados |
| 4 | Snapshot sin hash; documentos sin seguimiento en Git; árbol sucio | `git rev-parse HEAD`, `git status --porcelain` | El hash `cc2213…7e70340e` identifica solo el commit base; T0 exige fijar y verificar una nueva línea base del código observado antes de ejecutar el plan. |
| 5 | Cierre de T9 incompleto (sin `ui:test` ni build en CA) | lectura del CA de T9 vs Anexo A.4 | CA de T9 ampliado a 4 verificaciones, build de producción incluido como obligatorio de la tarea |

**Referencia histórica de la primera revisión externa:** entonces el plan
tenía 339 líneas y el Anexo A comenzaba en la 279. Esas posiciones cambiaron
con las correcciones; el desglose Ruff 710/250 corresponde a la línea base
anterior y se volverá a medir en la Fase 0.

**Pendiente de decisión del auditor externo:** aceptar el rediseño de T4/T5.5
y ajustar el alcance de las oleadas de T9; ninguna de las correcciones ha sido
contra-revisada por el propio auditor de esta entrega.
