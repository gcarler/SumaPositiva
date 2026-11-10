# Plan 310 — Cierre de pendientes del SM Core

**Origen:** revisión de calidad de [309](309_entrega_sm_core_100.md), sección 7.
**Regla de decisión:** ante una opción, la más completa, no la más fácil.
**Restricciones globales:** no migrar ni reiniciar producción sin coordinación; `bd_csh` permanece en `0096` hasta la P7; no usar APIs no oficiales; ningún contacto en claro en BD ni en logs; no tocar 307/308 ni `src/`; Herald no se elimina.

## Resumen y orden

| Id | Pendiente | Depende de | Agente sugerido | Estado |
| --- | --- | --- | --- | --- |
| P1 | Transportes reales por canal | P2 | `codex` | **COMPLETADO Y VERIFICADO** |
| P2 | Resolutor / bóveda de contactos | — | `codex` | **COMPLETADO Y VERIFICADO** |
| P3 | Programador del worker y backoff | P1, P2 | `codex` | **COMPLETADO Y VERIFICADO** |
| P4 | Puente con eventos POLIS reales | P1, P2 | `codex` + `agy2` | **COMPLETADO (hook sombra, apagado por defecto)** |
| P5 | Migración progresiva desde Herald | P4 | `codex` | **CORTE PROBADO: cobertura total 18/18 con reparto SM+Herald, 0 duplicados, 200/200 bajo carga y alerta de delegadas; pendiente cobertura solo-SM (cuentas, `wa:`, token) y staging real** |
| P6 | QA independiente (EAF) | P1–P5 | `coordinador` | **PENDIENTE: el dictamen del coordinador es verificación interna, no EAF independiente (falta `freebuff`/`opencode`)** |
| P7 | Runbook de despliegue y staging | P6 | `codex` + `coordinador` | **ENSAYO EJECUTADO sobre copia restaurada de bd_csh (0096→0100, readiness 200, reversa de migración probada); faltan commit, ventana y despliegue** |

Orden: **P2 → P1 → P3 → P4 → P5 → P6 → P7**.

---

## P2 — Resolutor / bóveda de contactos
**Problema:** SM guarda solo el hash; el worker no puede saber a quién enviar.
**Diseño:** tabla `sm_contactos_boveda` (migración `0098`), contacto cifrado en reposo (AEAD con clave de entorno, rotación por `key_id`), clave `(tenant, actor, canal, contacto_hash)`. Interfaz `SMResolutorContacto` con implementación en BD y otra en memoria para pruebas. Descifrado solo en el worker, nunca en API ni auditoría.
**Aceptación:**
- [x] Sin la clave no se puede descifrar; con clave rotada se re-cifra sin pérdida.
- [x] Revocar consentimiento borra o bloquea el contacto de la bóveda.
- [x] Prueba: volcado de BD y logs sin ningún contacto en claro.
- [x] `alembic check` sin drift; `upgrade`/`downgrade` en base aislada.

## P1 — Transportes reales
**Problema:** los adaptadores solo construyen el payload.
**Diseño:** separar `construir()` de `enviar()` con interfaz `SMTransporte`. Implementaciones: correo (reutilizar el SMTP/Postfix de Herald), WhatsApp Cloud API oficial, Telegram Bot API, SMS (proveedor a definir), webhook interno firmado con HMAC. Modo `simulado` explícito y visible (nunca marcar `enviado` si no hubo envío). Credenciales solo por entorno. Tiempos de espera y clasificación de errores en transitorio / permanente.
**Aceptación:**
- [x] Prueba de contrato por canal con servidor simulado local (sin red externa).
- [x] Error permanente → `fallido` sin reintento; transitorio → reintento.
- [x] Sin credenciales, el canal queda `degradado` en `/sm/health`, no `enviado`.
- [x] Respetar ventana de 24 h y plantillas aprobadas de WhatsApp.
- [ ] Decisión pendiente del usuario: proveedor de SMS y credenciales de WhatsApp/Telegram.

## P3 — Programador del worker y backoff
**Diseño:** ejecutor CLI (`sm_worker_cli.py`) como el de Herald, con unidad y temporizador systemd; backoff exponencial con jitter por mensaje (`proximo_intento_en`, migración `0099`); latido y alerta si el worker se detiene; concurrencia segura con `SKIP LOCKED`.
**Aceptación:**
- [x] Prueba de backoff con reloj controlado; agotamiento tras `max_reintentos`.
- [x] Dos workers simultáneos no duplican envíos.
- [x] `/sm/health` muestra latido, cola y antigüedad del mensaje más viejo.
- [x] Unidad systemd documentada; no se habilita sin autorización.

## P4 — Puente con eventos POLIS reales
**Diseño:** conectar radicación de aportes, cambio de estado, convocatoria de mesas (308), asignación de compromisos y alertas de seguridad a `SMBridge`, vía outbox en la misma transacción del evento de dominio. Flag `SM_ENABLED` por tipo de evento, apagado por defecto.
**Aceptación:**
- [x] Prueba de extremo a extremo: evento POLIS → mensaje SM → entrega (transporte simulado).
- [x] Si SM falla, el evento de dominio no se pierde ni se bloquea.
- [x] Idempotencia ante reintentos del evento de dominio.

## P5 — Migración progresiva desde Herald
**Diseño:** modo sombra (Herald y SM reciben el mismo evento; SM no envía) → comparación de resultados → corte por tipo de evento, empezando por el de menor riesgo. Mantener Herald como respaldo hasta cerrar el plan. Documento `docs/migracion_herald_sm.md` con plan de reversa.
**Aceptación:**
- [x] Informe de paridad (volumen, estados, latencia) sobre un periodo definido, limitado a ensayo sobre copia: ver `bridge/314_p5_paridad_reversa_herald_sm_20261108/`.
- [x] Reversa del modo sombra probada: con el flag vacío no se crean eventos SM y Herald conserva sus filas.
- [x] Conmutación real por tipo: `POLIS_SM_CORTE_TIPOS` (subconjunto validado de `POLIS_SM_EVENTOS_DOMINIO`); si SM no acepta la fila, Herald sigue enviando.
- [x] Reversa de la conmutación: vaciar el corte y `worker_cli --liberar-delegadas` devuelve a `pendiente` solo lo que SM no entregó.
- [x] Paridad de contenido: el puente copia asunto y cuerpo HTML reales de Herald (asunto recortado a 200).
- [x] Ningún correo duplicado con transporte real local: 18 notificaciones, 5 por SM y 13 por Herald, 0 duplicados y 0 divergencias de cuerpo.
- [x] Cobertura total 18/18 (16/16 correos reales) con el fallback; las 2 filas `wa:` no son enviables.
- [x] Alerta de delegadas sin entrega: motivo en salud, contador y `WARNING` al arrancar.
- [ ] Cobertura *solo por SM*: exige alta y consentimiento de 3 ciudadanos, corregir 2 filas `wa:`, hook de `resumen_diario` y estrategia de tokens.

## P6 — QA independiente (EAF)
**Alcance:** auditor distinto de quien implementó (`freebuff` / `opencode`); seguridad (autenticación, cifrado, PII en logs/BD), concurrencia, idempotencia, pruebas de contrato, drift de migraciones y coherencia con `docs/permisos-api.md`.
**Aceptación:**
- [ ] Dictamen EAF de un auditor distinto de quien implementó (el actual es interno).
- [x] Pruebas de SM y suite de regresión en verde en base aislada `polis_test*`.

## P7 — Commit, migración 0097 y despliegue
**Pasos:** ordenar y revisar migraciones `0097`–`0099`; commit por fase; ensayo de `upgrade` sobre copia restaurada de `bd_csh`; ventana coordinada con `codex`; actualizar el snapshot de `/etc/systemd/system/polis-backend.service.d/304-release.conf` y `docs/despliegue-produccion.md`; verificar `readiness` 200; respaldo previo.
**Aceptación:**
- [x] Respaldo restaurado y `upgrade` probado en copia antes de producción: ver `bridge/313_ensayo_p7_copia_bd_csh_20261108/`.
- [x] Readiness 200 y rutas públicas existentes sin cambios en la copia.
- [ ] SM desplegado con todos los flags apagados; encendido gradual aparte (requiere commit y ventana).

---

## Decisiones que requieren al usuario
1. Proveedor de SMS y credenciales de WhatsApp Business y Telegram.
2. Gestión de la clave de cifrado de la bóveda (ubicación y rotación).
3. Ventana de despliegue y autorización para habilitar systemd/timer.
4. Periodo de modo sombra antes de cortar Herald.

## Criterio de cierre global
**Estado real:** backend, bóveda, transportes, worker, hook sombra, corte por tipo con reversa y panel UI **implementados y probados en entorno aislado**. **No** se declara cierre total: faltan P5 (cobertura 18/18 y ensayo con transporte real), P6 independiente, P7 (commit, despliegue) y las decisiones del usuario (SMS, credenciales, clave de bóveda, ventana).
