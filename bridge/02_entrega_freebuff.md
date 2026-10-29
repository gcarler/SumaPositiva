# Entrega Freebuff — Remediación POLIS (2026-10-21)

> ## Ciclo 3 — cierre T5/T6 y dependencias externas (2026-10-21, tarde)
>
> Encargo: `bridge/04_tarea_freebuff_ciclo3.md`. Rama: `remediacion/aud-2026-10-21`.
>
> ### Resultado verificado
>
> - `bun run backend:check` oficial (umbral 120): **exit 0** — ruff check ✓,
>   ruff format ✓ (396 archivos) y pytest **726 passed / 16 skipped / 0 failed**
>   con `POLIS_TEST_DATABASE_URL` → `polis_test` (nunca bd_csh).
> - CA-5.1: `grep -rn "\.commit()\|\.rollback()" backend/app` fuera de
>   `core/transactions.py` → **0 resultados**.
> - CA-5.2: `grep -rn "owns_session" backend/app` → **0 resultados**
>   (las ramas de sesión propia/inyectada se unificaron en `_run_with_session`
>   y el helper nuevo `persistir_evaluacion_y_checkpoint_pdt_pg`, que delimita
>   evaluación + checkpoint en un único `transaction()` — éxito integral o
>   rollback completo).
>
> ### Cambios por tarea
>
> - **T5.1 `pdt_hoshin_kanri.py`**: eliminado el `rollback()` manual; la consulta
>   de articulación PDL corre en sesión auxiliar del mismo engine (patrón
>   `ambito_territorial`) y convive con doubles de test sin `bind` (7/7).
> - **T5.2 `canales/service.py`**: radicación WhatsApp íntegra dentro de
>   `async with transaction(self.session);` respuesta construida antes del
>   confirmar; `commit()` y `refresh()` posteriores eliminados (5/5).
> - **T5.3 `compromisos/router.py`**: el endpoint ya no gestiona sesión; caso de
>   uso `dictaminar_hallazgo_pdt_pg` en el servicio con límite explícito;
>   `await db.commit()` retirado del endpoint.
> - **T5.4** `pdt_persistencia_pg.py` (5 sitios) y `pdt_ai_evaluator_graph.py`
>   (5 sitios) unificados con `core/transactions`; sin `owns_session`.
> - **T5.5 `identidad/ambito_territorial.py`**: el `EventoIdentidad` de
>   denegación territorial se confirma en transacción separada con el límite de
>   `core` sobre segunda conexión **antes del 403**; se eliminó el fallback que
>   reusaba la sesión de la petición (perdería la evidencia en el rollback, ya
>   documentado en el plan). Fallo de la segunda conexión → warning y 403 intacto.
> - **CA-5.3 (evidencia desde sesión nueva)**: 3 casos nuevos en
>   `tests/test_transactions_integration.py` — radicación WhatsApp (éxito
>   íntegro visibile desde otra conexión + fallo post-primer-flush sin restos),
>   dictamen de hallazgo (ídem) y denegación territorial (**el evento SÍ
>   persiste** pese al 403; verificado con rollback de la sesión de petición).
>   Paquete transaccional: 22/22.
> - **T6**: suite oficial completa en verde (arriba); el dictamen EAF anexo
>   queda pendiente del snapshot con hash una vez se autorice el commit.
>
> ### Google Workspace (punto 2 del encargo)
>
> - El guion del usuario (documento nativo) es dependencia legítima del caso de
>   uso, pero estaba acoplado a `/tmp/...` hardcodeado: `_report` ahora resuelve
>   texto inyectado → `POLIS_USER_OUTLINE_PATH` (reproducible en CI) → guion de
>   `/tmp`. Si no hay insumo, falla explícita; **no se fabrica contenido**.
> - `test_report_has_a_verifiable_sha256_seal`: skip con causa explícita cuando
>   el guion no está disponible (no declara verde lo que no se ejecutó).
> - Tests desfasados realineados al contrato actual del servicio: 7 hojas PDM y
>   7 hojas PA (con inclusiones clave), fake de `_pdm_values` completado con
>   `meta_count`/`unique_count`/`normalized_counts`/etiquetas de hojas; el
>   resultado del test: 3 passed + 1 skipped con causa.
>
> ### per-file-ignores de Ruff (punto 4 del encargo)
>
> - **10 entradas retiradas**: `auditoria/router.py`, `evidencia/models.py`,
>   `indicadores/service.py`, `test_fotos_mesas.py`, `test_integridad_mediciones.py`,
>   `test_fuentes_informacion.py`, `test_canal_whatsapp.py`,
>   `test_integridad_compromisos.py`, `test_cierre01_migracion_asistencia.py`,
>   `test_aud06_perfil_produccion.py` — sus 13 líneas >120 fueron envueltas sin
>   alterar contratos (mensajes centrados, SQL dividido en líneas legibles).
> - **10 excepciones restantes justificadas por fichero** en `pyproject.toml`
>   (plantillas HTML de correo, SQL formal multilínea, reglas del kit verbatim,
>   geometras PostGIS de análisis, runbook ETL, docstrings normativos de
>   CIERRE-07). Ratificación EAF pendiente.
>
> ### Repetibilidad de la suite (nuevo)
>
> - `test_presupuesto_e_indicadores.py` limpiaba en BD una medición con autor
>   ficticio (“Analista Juan/María”) y volvía frágil el orden frente a la
>   auditoría OBS-02: ahora hace teardown de sus dos mediciones por id; la suite
>   es repetible sobre la misma polis_test* en cualquier orden.
>
> ### Insumos reproducibles para los 16 skips (punto 3 del encargo)
>
> - **15 skips de corpus**: exigen el corpus PDD/PDL de los 8 planes (4.637 metas
>   brutas, vínculos meta-PA-tríada, triada por entidad y territorios de
>   análisis). Insumo reproducible en base de pruebas: correr en una
>   `polis_test*` limpia el pipeline de ingesta ya documentado —
>   `scripts/reconstruir_catalogo_pdd_seguridad_humana_16.py` + `scripts/
>   sincronizar_catalogo_pdd.py` + `scripts/poblar_vinculos_meta_pa_triada.py`
>   (y el sembrador geodatos `poblar_geodatos_territorios_pdt.py` para los de
>   nodos espaciales) apuntando a `POLIS_TEST_DATABASE_URL`. No es posible
>   reproducir aquí porque el corpus fuente completo de la base caliente
>   (documentos xlsx/OCR de los 8 planes) no está disponible en este entorno;
>   en producción la fuente es bd_csh caliente y el guard `corpus_analitica`
>   lo documenta con causa en cada corrida.
> - **1 skip de guion** (sello SHA-256): insumo reproducible = colocar el guion
>   nativo del usuario en `POLIS_USER_OUTLINE_PATH` (o el /tmp canónico).
>
> ### Pendientes reales
>
> - Commit del snapshot pendiente de autorización (se necesita hash para el
>   dictamen EAF anexo de CA-6).
> - Ratificación EAF de las 10 excepciones restantes y del rediseño T5.5.
> - Corpus y guion: dependencias externas documentadas arriba (no ocultas).

---

# Entrega Freebuff — Remediación POLIS (2026-10-21, ciclo 2)

Rama de trabajo: `remediacion/aud-2026-10-21` (aislada; cambios ajenos preservados).
Base de pruebas: exclusivamente `polis_test` en el contenedor local (`127.0.0.1:5433`), con
`POLIS_TEST_DATABASE_URL` explícito. Nunca `bd_csh`, que no existe en este entorno.

## Resultado integral de la suite

| Momento | ruff check | ruff format | pytest |
|---|---|---|---|
| Línea base del plan (cc2213…) | 710 hallazgos | 114 archivos fallan | suite bloqueada |
| Inicio de este ciclo | verde (Fase 1 previa) | verde | 35 fallas + 2 errores |
| **Cierre de este ciclo** | **verde (0)** | **verde (395 archivos)** | **721 pasan / 15 skips con causa / 3 fallos externos** |

## Correcciones aplicadas (Fase 1–2)

### T1/T2 — Código
- `identidad/deps.py`: `NameError Any` resuelto.
- `alternativas/service.py`, `canales/service.py`: F841/B023 en ingesta y huella de canales.
- `politicas/router.py`, `scripts/ingestar_hurtos.py`: cierre de bucle sobre `lote` (B023).
- Tests con variables muertas corregidas.

### T4 — Deriva de esquema DDL runtime → Alembic (hallazgo BD-1)
- Nueva migración `0068_tablas_pdt_ai_evaluator`: 4 tablas (`pdt_ai_evaluaciones`,
  `pdt_ai_checkpoints_hitl`, `pdt_ai_hallazgos_revision`, `pdd_vinculos_meta_pa_triada`)
  y sus 5 índices (inventario corregido del plan).
- Modelos SQLAlchemy espejo declarados en `compromisos/models.py` (+ `UniqueConstraint`
  `uq_pdd_evidencia_archivo_pagina` que faltaba en `PddEvidenciaPagina`).
- Eliminados los bloques `CREATE SCHEMA/TABLE/INDEX` de runtime en
  `pdt_persistencia_pg.py` y `pdt_conciliador_vinculos_pa_triada.py`; el runtime ahora
  verifica catálogo y **falla rápido** si la migración no está aplicada.
  CA-4a verificado: `grep -rn "CREATE SCHEMA\|CREATE TABLE\|CREATE INDEX" backend/app/modules` → 0.
- `env.py`: tablas internas de `address_standardizer` (`us_lex`, `us_gaz`, `us_rules`)
  excluidas del autogenerate.
- Nueva migración `0069_idx_indicadores_terr_cod`: el índice único
  `ux_indicadores_territorio_terr_cod_anio` pasa del sembrador
  (`poblar_geodatos_territorios_pdt.py`) al lineage.
- `alembic check` limpio; ciclo downgrade/upgrade validado en base limpia.

### Downgrade roto de 0066 (error de FK en fixtures)
- El `downgrade()` hardcodeaba `mesa_id='01a0f5fe-86e2-…'`, UUID que ninguna
  migración inserta. Ahora resuelve dinámicamente la mesa `MR-ISL-07` (estado
  pre-0066 de la 0045). Los 3 tests de `test_formularios_admin` (downgrade a 0026
  + re-upgrade) quedaron verdes.

### Infraestructura de pruebas
- Extensiones en la base de pruebas: `pgrouting` actualizado de 3.8.0 a **4.0.2**
  (compilado en el contenedor; el repo pgdg bullseye ya no ofrece 4.x) y
  `address_standardizer(+data)` creado — su ausencia abortaba la transacción y
  provocaba los 5 fallos de `geodatos_estandarizacion`.
- `geodatos/repository.py`: `parse_with_address_standardizer` ahora usa una
  **sesión auxiliar** sobre el mismo engine (precedente de `ambito_territorial`),
  con registro en log; probado que `transaction_policy` (que prohíbe
  `begin_nested` en repos) queda verde sin debilitar la política.

### Tests alineados al encargo (nunca bd_csh en pruebas)
- `test_pdt_persistencia_pg.py`, `test_pdt_nodos_espacial_predictivo.py`: la URL de
  análisis ahora es `POLIS_TEST_DATABASE_URL` cuando existe, con validación
  `polis_test*` (el fallback a `bd_csh` queda solo para ejecución sin base de pruebas).
- `test_cierre01`: `alembic.ini` resuelto por ruta del fichero (no cwd).
- `test_cierre02`: runbook resuelto por ruta del repo (`parents[2]/docs/...`).

### Guard de corpus de análisis (15 skips con causa)
15 tests de integración PDT exigen el corpus vivo de los 8 planes (4,637 metas):
`bd_csh` caliente en producción o `polis_test*` provisionado con los scripts de
ingesta. No es pipeline de datos reproducible desde el repo en este entorno, así que
queda guardado con fixture `corpus_analitica` (skip explícito con causa; **no cuentan
como falla de código**). Con corpus cargado, se ejecutan sin cambios adicionales.

## Fallos restantes (3, dependencia externa)
Los 3 de `test_google_workspace_sync` dependen del documento nativo del usuario
(`/tmp/user_google_doc_content.txt` y targets de Google Workspace), que no puede
crear este entorno. Error: `FileNotFoundError: Falta el guion oficial del usuario`.
No es defecto de código; requieren el guion en el entorno de ejecución.

## Pendiente / limitaciones declaradas
- Laruns 15 skips de corpus y 3 fallos de guion externo, arriba descritos.
- Los cambios siguen sin commit (el snapshot requiere autorización).
- Los 2 hooks de ruff documentados en `per-file-ignores` (87 líneas E501 en
  plantillas/scripts ETL) siguen a la espera de ratificación del auditor EAF.
- El workflow T5 (transacciones separadas para el evento de denegación) está
  rediseñado en el plan y pendiente de su CA-5.3 con prueba dedicada.
- No se hizo push ni despliegue (sin autorización).

## Cambios de este ciclo (resumen de ficheros)
- `backend/pyproject.toml` (line-length 120 y per-file-ignores documentados)
- `backend/alembic/versions/0066_quince_mesas_corregimientos.py` (downgrade FK)
- `backend/alembic/versions/0068_tablas_pdt_ai_evaluator.py` (nueva)
- `backend/alembic/versions/0069_idx_indicadores_terr_cod.py` (nueva)
- `backend/alembic/env.py` (excl. internas de address_standardizer)
- `backend/app/modules/compromisos/models.py` (4 modelos espejo + UC)
- `backend/app/modules/compromisos/pdt_persistencia_pg.py` (fábrica DDL → verificación)
- `backend/app/modules/compromisos/pdt_conciliador_vinculos_pa_triada.py` (ídem)
- `backend/app/modules/geodatos/repository.py` (sesión auxiliar + log)
- `backend/app/modules/geodatos/models.py` (índice único en metadata)
- `backend/scripts/poblar_geodatos_territorios_pdt.py` (DDL fuera)
- `backend/tests/conftest.py` (fixture `corpus_analitica`)
- `backend/tests/test_pdt_*.py` (redirect polis_test + guard)
- `backend/tests/test_cierre01...` / `test_cierre02...` (rutas robustas)
- `backend/tests/test_formularios_admin.py` (verde tras fix de 0066)
- Correcciones T1/T2: `identidad/deps.py`, `alternativas/*`, `canales/service.py`,
  `politicas/router.py`, `scripts/ingestar_hurtos.py`, tests de identidad/MFA.

Informe previo de Fase 0/1-line-length: ver historial de `bridge/01_tarea_activa.md`
y la conversación de bridge de este ciclo.
