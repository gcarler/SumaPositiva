# SOLICITUD: asignación de evaluador EAF independiente — Encargo 275

**Para:** Coordinación General Antigravity (`agy:0.0`)
**De:** `freebuff` (`=freebuff:0.0`), implementador del Encargo 275
**Fecha:** 2026-11-01
**Tipo:** Solicitud de asignación de auditoría independiente (EAF)

---

## 1. Objeto

Solicito formalmente la asignación de un **evaluador del Equipo de Auditoría
Forense (EAF)** independiente para emitir dictamen sobre la entrega
**Encargo 275 — POLIS Herald: salud de entregas y resumen diario de
pendientes**.

**Motivo de independencia:** la implementación y la revisión preventiva interna
del encargo fueron realizadas por el mismo agente (`freebuff:0.0`). Conforme a
`docs/equipo_auditores_forenses.md` y a AGENTS.md, el implementador no firma
como evaluador independiente de su propio cambio: los checks aprobados son
evidencia técnica, no un dictamen EAF ni autorización de despliegue.

## 2. Identificación de la entrega

| Campo | Valor |
| --- | --- |
| Encargo | `bridge/275_tarea_freebuff_herald_salud_resumen.md` (emisor `agy:0.0`, 2026-10-31) |
| Entrega | `bridge/275_entrega_freebuff_herald_salud_resumen.md` (2026-10-31, sin commit/push al entregar) |
| Revisión preventiva interna | `bridge/275_auditoria_eaf_herald_salud_resumen.md` (misma agencia que el implementador — declarada sin independencia) |
| Implementador | `freebuff:0.0` |
| Evaluador solicitado | EAF, cualquier perfil **distinto** de `freebuff` |

## 3. Alcance sugerido para el evaluador

**Módulos y archivos:**
- Backend: `backend/app/modules/notificaciones/` (salud.py, worker_cli.py, resumen_cli.py, router.py, service.py, schemas.py, models.py, plantillas_eventos.py), `backend/app/modules/health/router.py` + `schemas.py`, `backend/app/core/config.py`.
- Migración: `backend/alembic/versions/0094_herald_salud_resumen.py` (tabla `herald_latido`, ampliación de `chk_notificaciones_tipo_evento` con `resumen_diario`, índice único parcial de idempotencia).
- Infraestructura: `deploy/systemd/polis-herald-resumen.{service,timer}` (contenido; la instalación en `/etc/systemd/system` fue operación de `agy:0.0` del 2026-11-01) y sección 2.5 de `scripts/monitor_sistema_polis.sh` (chequeo de Herald + deduplicación temporal con ventana `HERALD_ALERT_COOLDOWN_SEGUNDOS=7200`).
- Documentación: `docs/permisos-api.md` (4 rutas nuevas).

**Criterios principales (mapeados a los perfiles EAF):**
- `forense-backend`: contratos exactos de la sección 3 de la tarea; matriz de permisos (401/403/200 en `/notificaciones/salud`, permiso de administración en `/reintentar`, `/health/herald` público sin cifras ni PII); auditoría del reintento con actor; XSS escapado en plantilla del resumen.
- `forense-bd`: migración 0094 con ciclo de reconstrucción `0093→0094→0093→0094` sobre base `polis_test*`; índice único parcial y idempotencia (dos corridas = una fila); el latido jamás interrumpe la entrega; `alembic check` (único drift preexistente `actividades_anexos`, ajeno).
- `forense-cicd`: unidades systemd (verificación del disparo real del timer si el alcance lo incluye), reglas de comandos ejecutados, secretos (ningún valor SMTP ni credencial de BD en logs ni versionados), reproducibilidad.

**Exclusiones sugeridas:** módulos de `agy2` (Encargo 276: `src/features/notificaciones/*`, `plantillas_stack.py`, assets) — trabajo paralelo en el árbol, no validado por el implementador; hallazgos ajenos A-2/A-3/A-4 del dictamen interno (propietarios paralelos); el fallo preexistente de agendas (`test_vinculacion_agendas_con_mesas_canonicas_h05`); `docs/rotacion-secretos.md` como documento de referencia (solo se cita).

## 4. Evidencia disponible como entrada

1. Entrega y dictamen interno citados en §2, con resultados reales de pytest (126/126 en la batería exigida; suite nueva 30/30 cubriendo los 8 grupos de la sección 5 de la tarea), `ruff` limpio y corridas reales del ejecutor y del CLI en `--simular`.
2. Reproducibilidad sugerida: crear base exclusiva `polis_test*` con `POLIS_TEST_DATABASE_URL` y destruirla al terminar (regla §6 de la tarea). `bd_csh` (producción) **solo lectura, si aplica**.
3. Operaciones de producción ya ejecutadas por `agy:0.0` (2026-11-01), verificables en journald: instalación/habilitación del timer, `polis-herald.service` activo, y **rotación de la credencial de BD** con verificación doble (nueva OK / vieja rechazada) documentada en el cierre del dictamen interno. La credencial de BD vive en `backend/.env` (0600); los scripts versionados la leen del `.env` (sin literales).

## 5. Condiciones del estado actual (para calificar el cierre)

- HEAD de la sesión evaluada: `2aad798` al entregar; la confirmación de despliegue de 2026-11-01 avanzó la instalación operativa sin commit previo de los archivos del repo (cero push). El commit de esta sesión queda pendiente y se notificará; si el evaluador necesita anclar revisión Git, coordinación puede fijar el snapshot en el momento de la asignación.
- Verificación operativa programada pero **no ejecutada**: primer disparo real del timer del resumen diario (2026-11-02 12:00 UTC / 07:00 Bogotá). El guion de verificación está en el dictamen interno (§ cierre del 2026-11-01); sus resultados deberán agregarse como evidencia del dictamen.
- Riesgo abierto registrado en la entrega (§5.5): el reintento manual no revalida el destinatario; comportamiento esperado, pendiente de decisión de frontend (`agy2`).

## 6. Petición concreta a coordinación

1. Asignar evaluador EAF con independencia de `freebuff:0.0` (perfiles sugeridos: `forense-backend` + `forense-bd`, con `forense-cicd` opcional según alcance).
2. Confirmar el snapshot/revisión Git contra la que se emitirá el dictamen.
3. Confirmar si la crítica del dictamen incluye o no la observación del primer disparo real del timer del 2026-11-02.
4. El dictamen no autoriza merge, despliegue ni comunicaciones externas: la decisión de publicación sigue siendo del director con la evidencia y las reglas de autorización vigentes.

---

*Sin commit ni push en el momento de esta solicitud. Evaluación jurídica y autorización de despliegue quedan fuera del resultado de agentes IA, conforme a `docs/equipo_auditores_forenses.md`.*
