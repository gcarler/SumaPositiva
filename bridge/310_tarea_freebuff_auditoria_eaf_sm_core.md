# ENCARGO 310-EAF: Auditoría Forense Independiente (EAF) — POLIS SM Core (Bóveda, Transportes, Worker, Puente y Panel)

- **Destinatario:** `freebuff` (`=freebuff:0.0`)
- **Emisor:** Coordinación General Antigravity (`agy:0.0`)
- **Fecha:** 2026-11-07 UTC
- **Estado:** ASIGNADO EN COLA / ACTIVO
- **Implementadores evaluados:** `codex:0.0` (Backend 310-BK) y `agy2:0.0` (Frontend 310-UI)
- **Evaluador independiente designado:** `freebuff:0.0` (estricta independencia respecto de los implementadores)
- **Entregas de referencia:**
  - Backend: [`bridge/310_entrega_codex_sm_core.md`](file:///root/polis/bridge/310_entrega_codex_sm_core.md) y [`bridge/310_evidencia_codex/`](file:///root/polis/bridge/310_evidencia_codex/)
  - Frontend: [`bridge/310_entrega_agy2_sm_panel_mesas.md`](file:///root/polis/bridge/310_entrega_agy2_sm_panel_mesas.md)
  - Plan y Migración: [`bridge/310_plan_cierre_pendientes_sm_core.md`](file:///root/polis/bridge/310_plan_cierre_pendientes_sm_core.md) y [`docs/migracion_herald_sm.md`](file:///root/polis/docs/migracion_herald_sm.md)
  - Tablero: [`bridge/01_tarea_activa.md`](file:///root/polis/bridge/01_tarea_activa.md)

---

## 1. Declaración de Independencia y Objeto Forense

Conforme a `docs/equipo_auditores_forenses.md` y las directrices de integridad de POLIS, la certificación formal del Encargo 310 (SM Core) exige auditoría forense emitida por un evaluador distinto del implementador (`codex` / `agy2`) y de la coordinación. Se designa a **`freebuff:0.0`** para inspeccionar con criterio adversarial e independiente:

1. **Bóveda Criptográfica y Anti-PII (Migración 0098):**
   - Cifrado AES-256-GCM con nonce de 12 bytes y AAD vinculante (`tenant`, `actor`, `canal`, `hash`, `key_id`).
   - Destrucción física en revocación de consentimiento (`DELETE FROM sm_contactos_boveda`).
   - Cero PII en logs, payloads persistidos y URLs (`GET /api/v1/sm/consent/{canal}/{actor}` debe exigir `contacto_hash`).
2. **Transportes Reales y Honestidad de Estados:**
   - Implementaciones desacopladas: SMTP loopback autenticado, Webhook con HMAC-SHA256 y timestamp, Telegram Bot API oficial, WhatsApp Cloud API oficial (con validación de plantilla) y cliente modular SMS.
   - Prohibición estricta de simulación engañosa: bajo ninguna circunstancia un mensaje simulado o sin credenciales puede marcarse como `enviado`.
   - Estados transaccionales de caída: `en_curso` e `incierto` ante timeouts de red sin fingir rechazo del proveedor.
3. **Programador Outbox, Leases y Concurrencia (Migración 0099):**
   - Reclamo distribuido con `FOR UPDATE SKIP LOCKED`.
   - Desacoplamiento transaccional: confirmación de base de datos antes de abrir socket de red; registro de entrega en transacción posterior independiente.
   - Backoff exponencial determinista con jitter (`base * 2^intento`).
4. **Puente POLIS y Modo Sombra:**
   - Hook en `backend/app/modules/notificaciones/service.py` bajo la misma transacción de dominio.
   - Apagado por defecto (`POLIS_SM_EVENTOS_DOMINIO=[]`), sin interferir con Herald ni generar duplicados al ciudadano.
5. **Frontend SM Core y Mesas (310-UI / 308):**
   - Validación del panel operativo `sm-panel-operativo.tsx`, componentes de Mesas y observabilidad anonimizada.
   - Cumplimiento de `node scripts/ui-policy.mjs`, `bun run typecheck` y `bun test`.
6. **Migraciones e Integridad de Base de Datos:**
   - `alembic check` sin drift.
   - Validación del ensayo sobre copia aislada de datos (`bd_csh_ensayo_sm_310` o laboratorio 15433).

---

## 2. Salvaguardas Críticas Obligatorias

> [!CAUTION]
> 1. **PRODUCCIÓN INTOCABLE:** Jamás ejecutar migraciones, escrituras ni reinicios sobre `bd_csh` (puerto 5432) ni sobre `polis-backend.service`.
> 2. **NO MODIFICAR CÓDIGO PRODUCTIVO:** Esta auditoría es de revisión forense y pruebas en solo lectura sobre los artefactos candidatos.
> 3. **CERO COMMIT / CERO PUSH:** El árbol de trabajo permanece en estado candidato congelado hasta la ventana técnica de despliegue.

---

## 3. Entregable Requerido

Emitir el dictamen formal en:
[`bridge/310_dictamen_eaf_independiente_freebuff.md`](file:///root/polis/bridge/310_dictamen_eaf_independiente_freebuff.md)

Estructura requerida del dictamen:
1. Declaración de independencia y métodos de inspección.
2. Matriz de hallazgos (clasificados por severidad: Crítica, Alta, Media, Baja, Conforme).
3. Verificación de seguridad y criptografía (análisis de claves y fugas de PII).
4. Pruebas de concurrencia y reversibilidad de migraciones ejecutadas en entorno aislado.
5. Veredicto final: `APROBADO`, `APROBADO CON OBSERVACIONES` o `RECHAZADO`.
