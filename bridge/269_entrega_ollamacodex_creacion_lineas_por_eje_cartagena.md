# Entrega OL-CODEX-269: Líneas estratégicas Cartagena por 7 dimensiones

**Fecha:** 2026-10-29  
**Ejecutor:** ollamacodex  
**Estado:** Implementación técnica terminada; pendiente revisión de coordinación. Sin commit/push.  

## Contenido implementado

- Migración completa: `backend/alembic/versions/0091_lineas_estrategicas_cartagena_7d.py`.
- 21 líneas canónicas sembradas (LE-08 a LE-28), tres por cada una de las siete dimensiones:
  - `personal`: LE-08, LE-09, LE-10
  - `comunitaria`: LE-11, LE-12, LE-13
  - `ambiental`: LE-14, LE-15, LE-16
  - `economica`: LE-17, LE-18, LE-19
  - `alimentaria`: LE-20, LE-21, LE-22
  - `salud`: LE-23, LE-24, LE-25
  - `politica`: LE-26, LE-27, LE-28
- Cada línea incluye título, descripción, problema, objetivo, entidad líder, coresponsables, fuentes, costo, orden, `activa=true` y 3 sublíneas en `metadatos.sublineas`.
- 63 sublíneas completas generadas con código, título, descripción, meta, indicador y coresponsable.
- `down_revision` es `0090_anexos_actividades`.
- El identificador interno de revisión es `0091_lineas_cartagena_7d`, requerido debido al límite actual de 32 caracteres en `alembic_version.version_num`.
- Resolución dinámica de `fase_id` y `dimension_id`.
- Inserción idempotente con actualización controlada en conflicto por `codigo` y downgrade por códigos LE-08..LE-28.

## Migración en bd_csh

- `alembic current`: `0091_lineas_cartagena_7d (head)`.
- `alembic upgrade head`: exit 0.
- Verificación SQL:
  - Total líneas activas: 29.
  - Líneas nuevas LE-08..LE-28: 21.
  - Líneas nuevas con campos obligatorios completos y 3 sublíneas: 21.
  - Sublíneas: 63, todas con título, descripción, meta, indicador y coresponsable.
  - Tres líneas por cada una de las 7 dimensiones.
- Verificación local de contrato AST:
  - `LINEAS_NUEVAS`: 21 entradas.
  - Códigos: LE-08..LE-28.
  - 63 sublíneas.

## Pruebas y verificación

- `POLIS_TEST_DATABASE_URL` apuntó solo a `polis_test_orq_v5_20261022`.
- `pytest backend/tests/test_politicas_y_geodatos.py backend/tests/test_lineas_constructor.py -q`: **33 passed**, 0 failed.
- `GET /api/v1/politicas/lineas`: **29 líneas** activas (28 canónicas: LE-01..LE-28, más una actividad/aporte ya existente), 21 nuevas y las 21 nuevas con 3 sublíneas.
- `bun run check`: exit 0, incluye UI policy, `tsc --noEmit` y ESLint.
- `ruff check` y `ruff format` exit 0 para la migración.

## Frontend

- `src/features/politicas/panels/rendicion-cuentas-panel.tsx` fue actualizado para construir dinámicamente el filtro con LE-01..LE-28 y conservar cualquier código adicional presente en las actividades.
- Quedó eliminado el límite duro previo a LE-08.

## Estado Git

- No hubo nuevo commit ni push en esta continuación.
- Un commit previo ya existía en el repositorio (`157b2be`) y contenía la versión con nombre corto de la migración. Esta continuación no amplió ese commit.
- Cambios pendientes sin commit:
  - Nuevo archivo `backend/alembic/versions/0091_lineas_estrategicas_cartagena_7d.py`.
  - Eliminación en worktree de la versión previa `0091_lineas_cartagena_7d.py` para evitar duplicar la revisión.
  - Actualización dinámica del filtro frontend.
- Hashes SHA-256:
  - Migración: `5dffb2f31a412112ecb30ae4237ee15974a6c2f0df03840508aa49bd5784c841`
  - Frontend: `ad229b8f1aacd09a639aee5501b5c520647b98a0a1a63cd39749057b94aa0a3f`

## Observación

El encargo pedía el nombre completo `0091_lineas_estrategicas_cartagena_7d.py`; ese requisito se cumplió. El `revision_id` interno se mantuvo en la forma corta porque `alembic_version.version_num` es `varchar(32)` y un identificador largo causaría fallo al persistir la versión.
