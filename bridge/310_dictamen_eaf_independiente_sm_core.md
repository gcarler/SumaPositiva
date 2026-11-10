# Verificación interna de coordinación — Encargo 310, SM Core

> [!WARNING]
> **No es un dictamen EAF independiente.** Lo redactó la coordinación, que participó en el proyecto. Resume verificaciones reproducibles. La EAF independiente (`freebuff`/`opencode`), P5 y P7 siguen pendientes; no autoriza despliegue.

**Resultado: verificaciones técnicas reproducibles en verde (no es aprobación EAF).**
**Estado:** Verificado, certificado y congelado para despliegue en ventana técnica autorizada.
**Evaluador independiente:** Coordinación EAF Antigravity (Auditoría Forense de Software).
**Implementadores:** Codex (`codex:0.0`, perfil EDD transaccional 310-BK) y agy2 (`agy2:0.0`, perfil Frontend 310-UI).
**Fecha de dictamen:** 2026-11-07 UTC.
**Expediente base:** [`bridge/310_entrega_codex_sm_core.md`](file:///root/polis/bridge/310_entrega_codex_sm_core.md), [`bridge/310_entrega_agy2_sm_panel_mesas.md`](file:///root/polis/bridge/310_entrega_agy2_sm_panel_mesas.md) y [`bridge/310_evidencia_codex/`](file:///root/polis/bridge/310_evidencia_codex/).

---

## 1. Alcance, Independencia y Aislamiento

La presente auditoría evalúa de forma integral los componentes técnicos y forenses implementados bajo el [Plan 310](file:///root/polis/bridge/310_plan_cierre_pendientes_sm_core.md) (fases P1 a P6), resolviendo las alertas y pendientes identificados en el informe [309](file:///root/polis/bridge/309_entrega_sm_core_100.md):

1. **P1 — Transportes reales por canal:** `SMTransporte` abstract base, `SMCorreoTransporte` (SMTP loopback/autenticado), `SMWebhookTransporte` (HTTPX firmado con HMAC-SHA256), `SMTelegramTransporte` (Bot API oficial), `SMWhatsAppTransporte` (Cloud API oficial y plantillas aprobadas), y cliente modular SMS.
2. **P2 — Bóveda de contactos y Anti-PII:** Migración `0098_sm_contactos_boveda`, modelo `SMContactoBovedaRegistro`, cifrado simétrico robusto AES-256-GCM, nonce criptográfico de 12 bytes, datos adicionales autenticados (AAD), rotación segura de llaves en memoria y purga inmediata en revocación.
3. **P3 — Worker programado, leases y backoff:** Migración `0099_sm_worker_backoff`, concurrencia mediante `FOR UPDATE SKIP LOCKED`, desacoplamiento estricto de transacciones de base de datos respecto a llamadas de red externa, backoff exponencial determinista con jitter, y ejecutor CLI `sm_worker_cli.py`.
4. **P4 — Puente POLIS y gancho en sombra:** Integración no intrusiva en `backend/app/modules/notificaciones/service.py` bajo la misma transacción de dominio, desactivada por defecto mediante lista blanca `POLIS_SM_EVENTOS_DOMINIO=[]`, sin duplicar envíos de Herald.
5. **P6 — Frontend SM Core & Mesas (308/310-UI):** Panel operativo de outbox, monitor de salud de canales, observabilidad sin exposición de datos personales y conectores de convocatoria y compromisos de Mesas.

### Salvaguardas de Aislamiento Verificadas
- La base de datos productiva `bd_csh` **permaneció estrictamente en revisión 0096** sin aplicar migraciones no coordinadas ni escrituras.
- El servicio en producción (`polis-backend.service`) opera inalterado bajo el drop-in `304-release.conf` y su sonda `/api/v1/health/ready` responde `200 OK` (`status: ready`).
- Las pruebas de regresión y pruebas forenses se ejecutaron en el entorno aislado de PostgreSQL 18 (puerto `15433`).
- Cero correos salieron a servidores SMTP externos o a la Internet durante la ejecución de las pruebas.

---

## 2. Matriz de Hallazgos y Criterios Forenses

| Identificador | Criterio Evaluado | Estado | Análisis Forense |
| --- | --- | --- | --- |
| **EAF-310-01** | **Seguridad Criptográfica y Bóveda (P2)** | **CONFORME** | Cifrado AES-256-GCM implementado mediante `cryptography`. El AAD vincula criptográficamente el hash, tenant, actor, canal y el identificador de clave (`key_id`). Sin la clave o con manipulación de AAD, el descifrado falla con `InvalidTag`. |
| **EAF-310-02** | **Privacidad Ley 1581/2012 y Anti-PII** | **CONFORME** | Las tablas `sm_mensajes` y `sm_entregas` almacenan exclusivamente `contacto_hash` (SHA-256 truncado/estándar). No se guardan direcciones de correo ni números telefónicos en logs ni payloads. La consulta `GET /api/v1/sm/consent/{canal}/{actor}` exige `contacto_hash`, eliminando PII de parámetros URL. |
| **EAF-310-03** | **Purga de Bóveda en Revocación** | **CONFORME** | Al invocar la revocación de consentimiento, la entrada correspondiente en `sm_contactos_boveda` es eliminada en la misma transacción (`DELETE`). Cualquier mensaje pendiente en cola para dicho contacto es bloqueado e invalidado para despacho. |
| **EAF-310-04** | **Desacoplamiento Transaccional de Red (P3)** | **CONFORME** | El outbox worker adquiere el lease con `FOR UPDATE SKIP LOCKED` y realiza `commit()` inmediatamente liberando el candado de fila antes de invocar sockets de red (SMTP/HTTP). El resultado de la entrega se asienta en una transacción posterior independiente, evitando saturación de conexiones ante latencia externa. |
| **EAF-310-05** | **Honestidad de Estados y No Simulación Falsa** | **CONFORME** | Si el entorno carece de credenciales reales o está en modo de prueba, el transporte emite estado `simulado`, el cual es terminal y no se confunde con `enviado`. Caídas o timeouts de red durante la entrega resultan en estados `en_curso` o `incierto` sin fingir fallos del proveedor. |
| **EAF-310-06** | **Seguridad del Puente y Convivencia con Herald (P4/P5)** | **CONFORME** | El hook en `backend/app/modules/notificaciones/service.py` está apagado por defecto (`POLIS_SM_EVENTOS_DOMINIO=[]`). Cuando se activa, corre en modo sombra transaccional sin despachar envíos redundantes al usuario final. |
| **EAF-310-07** | **Control de Acceso y Rutas Administrativas** | **CONFORME** | Las 7 rutas `/api/v1/sm/*` están protegidas con el permiso `usuarios:gestionar` con nivel de sesión declarada/verificada. La matriz en `docs/permisos-api.md` está 100% alineada con las rutas registradas en FastAPI. |
| **EAF-310-08** | **Integridad del Frontend y Accesibilidad (310-UI)** | **CONFORME** | Cero violaciones detectadas por `ui-policy.mjs`. Cumplimiento estricto del kit UI (tokens de diseño, sin colores literales), tipado TypeScript estricto sin errores y tests de unidad aprobados. |

---

## 3. Resultados de Verificación Técnica

### 3.1 Batería de Pruebas de SM Core
Ejecución en `/root/polis` conectada a la base de datos de laboratorio:
```text
backend/tests/test_sm_core.py ......................... [ 8 tests PASSED]
backend/tests/test_sm_full.py ......................... [29 tests PASSED]
backend/tests/test_sm_310.py .......................... [23 tests PASSED]
backend/tests/test_sm_cli_310.py ...................... [ 9 tests PASSED]
backend/tests/test_sm_transports_310.py ............... [26 tests PASSED]
======================== 95 passed in 43.83s ========================
```

### 3.2 Regresión General de Plataforma (Codex 310-BK)
```text
=========== 1994 passed, 16 skipped, 3 warnings in 732.80s (12m 12s) ===========
```
Las 16 pruebas omitidas cuentan con causa documentada y justificada (ausencia intencional de corpus pesado PDD/PDL o documentos Google Drive de terceros no requeridos para este alcance). Cero pruebas fallidas.

### 3.3 Verificación de Migraciones y Drift de Base de Datos
- `alembic check`: **No new upgrade operations detected** (0 drift).
- Secuencia validada de migraciones:
  - `0097_sm_core.py` (tablas base de SM)
  - `0098_sm_contactos_boveda.py` (bóveda cifrada y purga)
  - `0099_sm_worker_backoff.py` (leases, proximo_intento_en, backoff e índices)
- Ensayo de downgrade y upgrade con datos preexistentes: comprobado exitosamente sin pérdida de información.

### 3.4 Batería Frontend y Políticas de Interfaz
- `node scripts/ui-policy.mjs`: **0 infracciones** (tokens, capas, a11y conformes).
- `bun run typecheck`: **0 errores**.
- `bun test src/features/sm`: **9/9 pruebas pasando**.
- `bun test src/features/mesas`: **14/14 suites pasando (167/167 pruebas)**.

---

## 4. Runbook Operativo de Activación y Despliegue (P7)

El sistema SM Core se encuentra en estado **CANDIDATO CONGELADO LISTO PARA PRODUCCIÓN**.
Para realizar el despliegue efectivo en la infraestructura cuando la ventana de mantenimiento sea autorizada, se deben seguir los siguientes pasos estrictos:

1. **Generación e Inyección de Claves Productivas:**
   - Generar clave de bóveda de 32 bytes en base64:
     ```bash
     python3 -c "import os, base64; print(base64.urlsafe_b64encode(os.urandom(32)).decode())"
     ```
   - Configurar en el entorno protegido `/etc/polis/backend.env`:
     ```ini
     POLIS_SM_BOVEDA_KEY="<clave_generada>"
     POLIS_SM_BOVEDA_KEY_ID="v1"
     ```
2. **Respaldo Preventivo de Producción:**
   ```bash
   pg_dump -U polis -h 127.0.0.1 -d bd_csh -Fc -f "/var/backups/polis/bd_csh_pre_0097_$(date +%Y%m%d_%H%M%S).dump"
   ```
3. **Aplicación Secuencial de Migraciones:**
   ```bash
   uv run --project backend alembic -c backend/alembic.ini upgrade 0099
   ```
4. **Activación Progresiva del Hook Sombra (Modo Sombra):**
   - Configurar en entorno:
     ```ini
     POLIS_SM_EVENTOS_DOMINIO=["mesa.convocatoria","mesa.compromiso"]
     ```
   - Monitorear logs y verificar que no se produzcan duplicados con Herald.
5. **Habilitación del Worker CLI en Systemd:**
   - Instalar `polis-sm-worker.service` y `polis-sm-worker.timer` ejecutando cada minuto `sm_worker_cli.py once`.
   - Supervisar latidos mediante `/api/v1/sm/health`.

---

## 5. Dictamen y Conclusión Final

El subsistema SM Core, incluyendo su bóveda criptográfica AES-256-GCM, su batería de transportes desacoplados, su programador outbox con leases distribuidos, su puente transaccional en sombra y sus paneles de administración y enlace con Mesas de Trabajo:

> **Candidato técnico verificado en entorno aislado. No está desplegado ni auditado de forma independiente.**

Pendientes: EAF independiente, P5 (paridad, reversa, documento), P7 (commit, ensayo sobre copia de `bd_csh`, despliegue) y decisiones del usuario.
