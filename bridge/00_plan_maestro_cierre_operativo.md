# PLAN MAESTRO: CIERRE OPERATIVO DE POLIS (CIERRE-01 a CIERRE-04)

**Fecha:** Lunes, 12 de Octubre de 2026
**Ejecuta:** `agy2` (Desarrollador / EDD) — **Audita:** `agy` (Coordinador / EAF)
**Origen:** pendientes reales de `docs/plan-trabajo.md` y revisión de estado del 12-oct-2026.

## Reglas generales
- Zero-Push: commits locales en `main`. Un commit atómico por tarea.
- Quality Gates tras cada tarea: `bun run ui:check`, `bun run check`, `bun test`, `uv run --project backend pytest backend/tests`, `alembic check` (0 drift), `bd_csh` intacta (33 mesas, 36 agendas, 11 fichas, 17 actores).
- **PROHIBIDO modificar producción, `bd_csh`, SMTP real, credenciales o cuentas existentes sin autorización explícita del usuario.** Todo lo operativo se entrega como script/runbook + prueba en base aislada; la ejecución real la autoriza el usuario vía `agy`.
- Reporta cada tarea en `bridge/02_resultado_agy2.md` y avisa a `agy` por tmux. No pases a la siguiente sin dictamen de `agy` (`bridge/03_dictamen_revision.md`).

## CIERRE-01 — Integrar la migración `0023_asistencia_multicanal`
- Causa del bloqueo (docs/plan-trabajo.md): al validar el workspace completo modificaba permisos de auditoría y creaba una tabla sin modelo registrado.
- Entregable: modelo SQLAlchemy registrado para la tabla, migración 0023 encadenada correctamente tras 0022 (una sola cabeza Alembic), permisos de auditoría sin cambios no intencionados, pruebas backend nuevas, `alembic check` sin drift.
- Probar upgrade/downgrade en base aislada (nunca `bd_csh`).

## CIERRE-02 — Runbook y herramientas de puesta en operación de identidad
- Cubrir la casilla abierta "Operación": aplicar migración en entorno autorizado, SMTP/worker, bootstrap administrativo y revisión de procedencia de cuentas institucionales existentes.
- Entregable: `docs/despliegue-identidad.md` (pasos, verificaciones, rollback), script de bootstrap administrativo idempotente, script de solo lectura que liste cuentas institucionales existentes con su procedencia, y chequeo de variables SMTP/worker (sin enviar correos reales). Validado en base aislada.

## CIERRE-03 — Dictamen independiente (preparación)
- Preparar el expediente para EAF: snapshot de alcance, matriz de 91 operaciones, evidencias (`docs/evidencia-*.json`), resultados de gates. Entregable: `bridge/expediente_eaf_identidad.md`. `agy` emite el dictamen.

## CIERRE-04 — Pasada final: seguridad y móvil
- Seguridad: revisión de cabeceras, CORS, rate-limit/lockout, exposición de errores/secretos, dependencias vulnerables (`bun audit` / `uv` equivalente), permisos por rol en endpoints sensibles. Entregable: informe con hallazgos clasificados y correcciones de los de severidad alta/media.
- Móvil: Playwright a 320/375/414 px en rutas públicas clave (`/`, `/geovisor`, mesas, formularios) sin desbordes ni controles inaccesibles; corregir lo encontrado.
- Rendimiento: medir carga de `/geovisor` y rutas principales; reportar.
