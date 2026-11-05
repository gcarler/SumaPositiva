# ENCARGO 275-EAF: Auditoría Forense Independiente (EAF) — POLIS Herald: Salud y Resumen Diario

- **Destinatario:** `opencode` (`=opencode:0.0`)
- **Emisor:** Coordinación General Antigravity (`agy:0.0`)
- **Fecha:** 2026-11-02
- **Estado:** ASIGNADO EN EJECUCIÓN
- **Implementador evaluado:** `freebuff:0.0` (Encargo 275)
- **Snapshot Git fijado:** `4b45b10` (árbol de trabajo local con cambios no confirmados asociados a Herald)
- **Solicitud de origen:** [`bridge/solicitud_eaf_independiente_275.md`](file:///root/polis/bridge/solicitud_eaf_independiente_275.md)

---

## 1. Declaración de Independencia y Objeto

Conforme a `docs/equipo_auditores_forenses.md` y las directrices de gobernanza de POLIS, la auditoría del Encargo 275 requiere independencia estricta respecto del implementador (`freebuff:0.0`). Se asigna a **`opencode`** como evaluador forense independiente para emitir dictamen técnico sobre la entrega y remediaciones de:

1. **Latido del ejecutor y telemetría de salud:** `/health/herald` (público cualitativo, sin cifras ni PII) y `/notificaciones/salud` (autenticado con rol `auditoria:leer`).
2. **Reintento manual auditado:** `POST /api/v1/notificaciones/{id}/reintentar` con registro en tabla de auditoría.
3. **Resumen diario institucional:** Generador CLI (`resumen_cli.py`), migración `0094_herald_salud_resumen.py` (idempotencia en BD) y unidades systemd (`polis-herald-resumen.{service,timer}`).
4. **Monitor de infraestructura:** Deduplicación temporal de alertas (`HERALD_ALERT_COOLDOWN_SEGUNDOS=7200`) e higiene de credenciales de base de datos (AUD-11/OBS-13).

---

## 2. Alcance Específico de Evaluación (Perfiles EAF)

### A. Perfil `forense-backend`:
- Validar contratos de API de `/api/v1/health/herald` (público sin autenticación, cualitativo, sin filtrar cifras cuantitativas internas según D-1 remediado).
- Validar contratos de `/api/v1/notificaciones/salud` (requiere `permiso:auditoria:leer@declarada`).
- Validar `POST /api/v1/notificaciones/{id}/reintentar` (requiere `permiso:usuarios:gestionar@declarada`), validando que solo admita filas `fallido` con reintentos agotados (`>= MAX_INTENTOS`), y que la transacción sea atómica (rollback verificado si falla la auditoría).
- Matriz de permisos: verificar `test_access_policy.py` en verde completo.

### B. Perfil `forense-bd`:
- Migración `alembic/versions/0094_herald_salud_resumen.py`:
  - Ciclo de reversibilidad: `0093 -> 0094 -> 0093 -> 0094` en base de prueba temporal (`POLIS_TEST_DATABASE_URL`).
  - Cabeza única (`alembic heads`).
  - Idempotencia: índice único parcial `(destinatario_correo, codigo_radicado)` sobre `resumen_diario`.
  - Aislar pruebas: **NO usar ni alterar `bd_csh` (producción)**; toda prueba de BD debe usar base temporal `polis_test_*` y eliminarla al concluir.

### C. Perfil `forense-cicd` e Infraestructura:
- Unidades `deploy/systemd/polis-herald-resumen.{service,timer}` instaladas y habilitadas en `/etc/systemd/system`.
- Deduplicación temporal de alertas en `scripts/monitor_sistema_polis.sh` (cooldown de 7200 s).
- Higiene de secretos: certificar que ninguna credencial DSN, contraseña SMTP o clave secreta quede expuesta en logs, git o scripts versionados.

---

## 3. Criterios de Aceptación y Entregable

1. **Dictamen formal:** Registrar informe completo en [`bridge/275_dictamen_eaf_independiente_opencode.md`](file:///root/polis/bridge/275_dictamen_eaf_independiente_opencode.md).
2. **Estado del dictamen:** `APROBADO`, `APROBADO CON OBSERVACIONES` o `RECHAZADO`.
3. **Reglas de Entrega:**
   - **NO hacer git commit ni git push.**
   - Destruir cualquier base de datos temporal creada al finalizar (`DROP DATABASE ...`).
   - Notificar a `agy:0.0` vía tmux con el resultado del dictamen.
