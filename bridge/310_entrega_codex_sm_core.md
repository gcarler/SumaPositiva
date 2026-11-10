# Encargo 310-BK — Bóveda, transportes y worker SM

**Estado:** implementado, verificado y congelado para revisión EAF; no desplegado.
**Coordinación:** Antigravity. **Implementación:** Codex, perfil EDD transaccional.
**Fecha:** 2026-11-07 UTC. No constituye dictamen EAF ni autorización de despliegue.

## 1. Alcance y aislamiento

Implementados P2, P1 y P3 y el enlace transaccional de P4 solicitado en
`310_tarea_codex_boveda_transportes_worker.md`. La convivencia/corte definitivo
de Herald y el despliegue P5–P7 requieren su propio cierre; no se declaran ejecutados.

- Ningún commit, push, migración productiva, reinicio o activación systemd por Codex.
- `bd_csh` no se usó para pruebas. No se enviaron mensajes por su Postfix ni a
  destinatarios externos. Disponibilidad productiva comprobada por sonda de lectura: **200**.
- Laboratorio PostgreSQL 18 en `127.0.0.1:15433`: `polis_test_sm_core`,
  `polis_test_sm_core_310_migraciones` y `polis_test_sm_core_310_upgrade`.
- Regresión general desde `/tmp/polis310/work`, con código y datos copiados,
  sin `.env` productivo. No comparte archivos de caché con producción.
- No se editaron `src/**`, 307 ni 308. Las modificaciones concurrentes de otros
  encargos se conservan y no se incorporan a un commit de esta entrega.

La base Git al iniciar era `78cd08e8` (0097 versionada). La ampliación 309 de SM
estaba sin commit: `baseline_archivos.json` identifica sus hashes de entrada.
`snapshot_codigo.json` identifica los 27 archivos del candidato y su igualdad
con la copia probada; `snapshot_regresion_backend.json` fija 620 archivos Python.
El patch contra HEAD incluye la base 309 aún sin commit; **no** se presenta como
un diff exclusivo de 310 respecto a 309.

## 2. Implementación

### Bóveda y consentimiento

- Migración **0098_sm_contactos_boveda** y modelo `SMContactoBovedaRegistro`,
  esquema `participacion_ciudadana`, índice único tenant/actor/canal/hash.
- `SMBovedaContactoDB` y contrato `SMResolutorContacto`: AES-256-GCM, nonce
  aleatorio de 12 bytes y AAD que liga versión, tenant, actor, canal, hash y key_id.
- Clave independiente `POLIS_SM_BOVEDA_KEY`, identificador activo y anillo de
  claves anteriores como secretos de configuración. No se generó ni instaló
  una clave productiva. `cryptography` ya estaba instalada; queda declarada
  directamente en `pyproject.toml` y el lock conserva su versión.
- Alta/revocación, ciphertext y auditoría forman una transacción en
  `SMServicioDB`. Revocar purga la entrada de bóveda. Sin clave el alta falla
  y revierte. Rotación por lotes recifra sin publicar el texto.
- Descifrado de despacho solo en el worker; ninguna ruta de lectura lo hace.
  La operación administrativa de rotación también necesita descifrar en memoria.
- El destino desaparece de payloads persistidos y de errores; auditoría y
  entregas guardan códigos y huellas. Se rechazan correos/teléfonos/destino en
  campos libres; actores deben ser opacos. Ese filtro **no anonimiza nombres o
  expedientes arbitrarios**: el llamador debe proporcionar resúmenes sin PII.
  El modelo histórico de Herald no se cifra ni borra en este encargo.

### Transportes

`adaptador.construir()` produce `preparado`, sin acreditar envío.
`SMTransporte.enviar()` determina el resultado:

| Canal | Implementación | Alcance comprobado |
| --- | --- | --- |
| Correo | SMTP/Postfix loopback o `Settings.smtp_*`, TLS/login cuando corresponde, Message-ID estable y timeout total | Servidor SMTP efímero de laboratorio, nunca puerto 25 real |
| Webhook | HTTPX, HMAC-SHA256 timestamp+cuerpo, ID estable, orígenes HTTPS explícitos, sin redirects/proxy de entorno | Contrato HTTP simulado en proceso; firma y errores verificados |
| Telegram | Bot API oficial, exige `ok=true` e ID de mensaje | Cliente HTTP simulado, sin credenciales reales |
| WhatsApp | Cloud API oficial, versión configurada y plantilla aprobada con parámetro de cuerpo | Cliente HTTP simulado; no presupone ventana de 24 h |
| SMS | Interfaz de cliente de proveedor inyectable | Contrato modular probado; proveedor productivo no seleccionado |

En test los transportes de fábrica producen **simulado** incluso con credenciales.
Sin configuración de proveedor los canales afectados aparecen degradados y nunca
se inventa un `enviado`. El resultado simulado es terminal y no se reenvía al
añadir credenciales posteriormente. El núcleo en memoria tampoco presenta una
adaptación como transmisión real. `enviado` acredita aceptación del proveedor,
no recepción final o lectura por el ciudadano.

### Worker y CLI

- Migración **0099_sm_worker_backoff**: fecha de próximo intento, lease/token,
  `reintentable`, índice de cola y latidos; estados explícitos de simulación.
- Una transacción reclama con `FOR UPDATE SKIP LOCKED` y reserva el intento;
  otra autoriza/resuelve el contacto; el envío ocurre **fuera** de transacción;
  una tercera confirma resultado, auditoría y programación.
- Backoff: `base * 2^intento + jitter[0,1]`. La base temporal normal es el
  reloj PostgreSQL. Pruebas inyectan reloj/jitter para cotejar fechas exactas.
- Permanentes quedan `fallido` sin reintento; transitorios programan fecha;
  máximo de intentos produce `agotado`. Revocación cancela sin despacho.
- Una caída deja `en_curso`; al recuperar lease se registra `incierto`, sin
  atribuir al proveedor un rechazo que no conocemos. Token evita confirmar
  resultados de una reclamación sustituida. Dos workers no despachan el mismo
  mensaje simultáneamente dentro del lease comprobado.
- Sesión exclusiva, sin transacción ajena. SQL/commit de finalización no se
  convierte en fallo del proveedor. SIGTERM/SIGINT paran nuevas reclamaciones.
- `backend/scripts/sm_worker_cli.py --once|--daemon`; interruptor apagado por
  defecto. El [runbook](../docs/sm-worker.md) incluye unidad systemd propuesta,
  configuración, recuperación y precauciones de downgrade. No se instaló.
- Salud expone agregados, simulaciones, latido, edad de cola y canales
  degradados; disponibilidad de configuración no es un sondeo del proveedor.

**Límite externo:** garantía al menos una vez. Caída tras aceptación SMTP y antes
del commit puede repetir el mismo Message-ID; SMTP no garantiza deduplicación.
Una revocación posterior a autorizar un envío en vuelo no lo deshace.

### Puente y API

- `SMBridge` compone el repositorio dentro de la transacción de dominio; no
  confirma por separado ni anida casos de uso.
- Hook real en `NotificacionService` para radicación, cambio de estado y el
  encolado común (incluye comprobantes de mesas/gestión y avisos de seguridad).
  `POLIS_SM_EVENTOS_DOMINIO=[]`, selección por tipo, apagada por defecto.
- El hook solo considera usuario activo con consentimiento **SM** expreso;
  no hereda consentimiento del subsistema antiguo. Copia IDs y resumen genérico,
  no nombres, HTML, correos ni tokens. Idempotencia por ID durable de notificación.
- El hook opera **siempre en sombra**: aunque existan transportes reales no
  duplica a Herald. El corte de canal y su paridad productiva no están activados.
- Un fallo externo posterior no afecta el evento confirmado. Un fallo SQL al
  encolar revierte el caso completo; no se oculta ni confirma parcialmente.
- Las escrituras de API pasan por `SMServicioDB`; se conservan permisos de
  comunicaciones/auditoría. La sonda agregada es pública según su clasificación.
- `GET /sm/consent/{canal}/{actor}` requiere ahora **contacto_hash**, nunca el
  correo/teléfono en query string. Coordinación fue notificada del cambio.
  Cambios de contrato y condiciones están en `docs/permisos-api.md`.

## 3. Verificación

Resultado final sobre el código fijado:

| Verificación | Resultado |
| --- | --- |
| `bun run backend:check` (Ruff + formato + pytest completos) | **exit 0; 1.994 passed / 16 skipped / 0 failed**, 2.010 casos |
| Suite SM final en base separada (XML R1) | **95 passed / 0 skipped / 0 failed** |
| Ruff solicitado: módulo SM y todos los tests | **exit 0** |
| Formato solicitado: módulo SM y todos los tests | **195 archivos limpios**; 620 en el check backend |
| `alembic check` | **exit 0; No new upgrade operations detected** |
| Bootstrap, downgrade a base y reconstrucción | **Aprobado**, también dentro de la suite final |
| Upgrade/downgrade con registros 0097 existentes | **4 cotejos aprobados**, outbox/ciphertext/procedencia preservados según etapa |
| Disponibilidad productiva, sonda de lectura | **HTTP 200**, sin desplegar SM |

Las **16 omisiones** están identificadas en `resultados_verificacion.json` y el
XML completo: 15 necesitan el corpus analítico PDD/PDL, ausente en esta base
vacía de laboratorio; 1 necesita el guion oficial de Workspace. No se usó
`bd_csh` ni se inventaron esos insumos para convertirlas en aprobaciones.
Tres warnings existentes: extensión de validación openpyxl, alias HTTP 422 de
Starlette y uso de fork en una prueba de timeout; no son fallos del check.

Comandos de aceptación (con entorno privado de prueba explícito):

```bash
uv run --project backend ruff check backend/app/modules/sm backend/tests/
uv run --project backend ruff format --check backend/app/modules/sm backend/tests/
uv run --project backend alembic -c backend/alembic.ini check
bun run backend:check
```

La corrida general añadió únicamente `-rs` y salida JUnit mediante
`PYTEST_ADDOPTS`, sin filtros ni exclusiones. Evidencia: `backend_check_entrega.*`,
`backend_check_completo.xml`, `sm_congelado_r1.*`, `upgrade_con_datos.json` y
`snapshot_codigo.json`. El contrato de las siete rutas y catorce schemas está en
`contrato_api_sm.json`.

**Histórico conservado:** rondas iniciales con defectos corregidos; ejecuciones
interrumpidas para secuenciar suites/ajustar guardas y fórmula literal de backoff;
una corrida completa con 9 fallos por copia incompleta de insumos. Se repusieron
cartografía, conocimiento y cinco capas públicas, cotejando **1.928 artefactos**
contra sus originales (cero discordancias). No se cambiaron código ni criterios
para saltar esas verificaciones. La última corrida completa, con la copia ya
completa y el backoff final, es la que acredita el resultado de esta entrega.

## 4. Archivos de entrega y operación pendiente

Evidencia en [310_evidencia_codex](310_evidencia_codex/): snapshots, baseline,
patch de código (incluye base 309), patch documental, registros de comandos, XML de pruebas dirigidas, ensayo de
migración con datos y sonda productiva de solo lectura. Secretos solo en el
directorio privado 0700 de laboratorio, no en esta entrega.

Antes de producción: revisión EAF por otro evaluador, gestión/rotación de clave,
credenciales oficiales y proveedor SMS, coordinación de migraciones 0097–0099,
respaldo/ensayo y actualización del snapshot backend 304. No basta reiniciar el
servicio del checkout: producción sigue usando su release aislada 0096.
El corte de Herald y la activación gradual requieren aceptación específica.
