# Encargo 310 — Subtarea Codex: Bóveda de Contactos, Transportes Reales y Worker Programado

**Asignado a:** `codex` (`codex:0`)  
**Fecha:** 2026-11-07  
**Rama/Base:** `main` (aislado en base de pruebas `polis_test_sm_core` o `POLIS_TEST_DATABASE_URL`)  
**Coordinación:** Antigravity  

---

## 1. Contexto y Objetivos

En el Encargo 309 se implementó el núcleo y la persistencia de SM Core con 35/35 pruebas en verde. La revisión de calidad identificó los siguientes pendientes técnicos que debes implementar en el backend de forma robusta y profesional:

1. **P2 — Bóveda de contactos cifrada (`sm_contactos_boveda`)**:
   - Crear migración Alembic `0098_sm_contactos_boveda.py` en esquema `participacion_ciudadana`.
   - Cifrado en reposo con AEAD (usando `cryptography.fernet.Fernet` o AES-256-GCM con clave `POLIS_SM_BOVEDA_KEY` proveniente de configuración).
   - Tabla: `(id, tenant, actor, canal, contacto_hash, contacto_cifrado, key_id, creado_en, actualizado_en)` con índice único en `(tenant, actor, canal, contacto_hash)`.
   - Interfaz `SMResolutorContacto` y servicio `SMBovedaContactoDB`: almacena el contacto cifrado al registrar consentimiento; al revocar, purga o bloquea el registro.
   - El descifrado se realiza **únicamente** en el worker al despachar; jamás en endpoints de lectura pública ni en tablas de auditoría.

2. **P1 — Transportes reales por canal (`SMTransporte`)**:
   - Separar la construcción de payload (`adaptador.construir()`) del envío real (`transporte.enviar()`).
   - Implementar `SMCorreoTransporte`: conexión SMTP/Postfix local (`127.0.0.1:25` o `Settings.smtp_*`) con fallback a modo `simulado` explícito si `environment == "test"`.
   - Implementar `SMWebhookTransporte`: envío HTTP real (usando `httpx`) firmado con HMAC-SHA256 en header `X-SM-Signature`.
   - Implementar transportes para WhatsApp, Telegram y SMS con cliente modular: si faltan credenciales o estamos en test, marcar explícitamente `estado_entrega="simulado"` (nunca engañar marcando `"enviado"` sin despacho real).

3. **P3 — Worker programado con backoff exponencial**:
   - Crear migración `0099_sm_worker_backoff.py` agregando `proximo_intento_en` (timestamp) a `sm_mensajes`.
   - Modificar `SMWorker`: sólo procesa mensajes donde `proximo_intento_en IS NULL OR proximo_intento_en <= clock_timestamp()`.
   - En caso de fallo transitorio, calcular `proximo_intento_en = now() + (base_segundos * (2 ** intento)) + jitter`.
   - Crear script CLI ejecutor: `backend/scripts/sm_worker_cli.py` con opciones `--once` y `--daemon`.
   - Documentar la unidad systemd `polis-sm-worker.service` en `docs/servicios.md` o runbook.

4. **P4 — Integración con eventos de dominio POLIS**:
   - Completar `backend/app/modules/sm/bridge.py` para sincronizar eventos en la misma transacción o mediante outbox.

---

## 2. Reglas Estrictas

1. **NO migrar ni reiniciar la base de producción (`bd_csh`)**: Todo desarrollo y prueba de migraciones debe ejecutarse en `polis_test_sm_core` o mediante `POLIS_TEST_DATABASE_URL`.
2. **Cero PII en claro**: Ningún correo, teléfono o identificador debe guardarse en texto plano en la BD ni emitirse en logs de nivel INFO/DEBUG.
3. **Quality Gates**:
   - `uv run --project backend ruff check backend/app/modules/sm backend/tests/`
   - `uv run --project backend ruff format --check backend/app/modules/sm backend/tests/`
   - `uv run --project backend alembic -c backend/alembic.ini check` (0 drift)
   - Pytest en verde para suite SM y regresión básica.
4. **Cero commits directos sin aviso**: Congelar cambios e informar en `bridge/310_entrega_codex_sm_core.md`.
