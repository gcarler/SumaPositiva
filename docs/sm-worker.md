# Operación SM Core — Encargo 310-BK

Estado: implementación preparada para revisión EAF. No habilita servicios ni
migra producción. Herald sigue siendo el emisor de los eventos del puente.

## Núcleo portable y ruta persistente

`SMCoreService` y `SMClient` son una librería en memoria para reutilización y
pruebas de contrato: no abren sesión de base ni delimitan una transacción, así
que su garantía de atomicidad es de proceso. La ruta persistente y transaccional
es `SMServicioDB` → `SMRepository` → `SMWorker`, y es la que usa la API. El núcleo
en memoria no debe usarse como fuente de verdad en producción.

## Configuración y bóveda

- `POLIS_SM_BOVEDA_KEY`: 32 bytes aleatorios codificados en base64 URL-safe,
  independiente de JWT y MFA; guardar en el gestor de secretos/archivo 0600.
- `POLIS_SM_BOVEDA_KEY_ID`: identificador de la clave activa, por defecto `v1`.
- `POLIS_SM_BOVEDA_CLAVES_ANTERIORES`: JSON secreto `{"id_anterior":"clave_base64"}`.
  No incluir en él el identificador activo. Conservar hasta recifrar **y** cerrar
  la política de retención/recuperación de respaldos históricos.
- `POLIS_SM_WORKER_HABILITADO=false`: apagado por defecto.
- `POLIS_SM_EVENTOS_DOMINIO=[]`: tipos de Herald que se copian al outbox, solo
  en sombra y con consentimiento SM explícito de la cuenta activa. No copia
  nombres, HTML, tokens de identidad ni contactos en columnas de SM.

Generar la clave fuera del código y no imprimirla en terminales compartidas.
Sin clave, otorgar consentimiento falla con HTTP 503 y se revierte junto a la
auditoría; revocar no requiere la bóveda.
Revocar purga el ciphertext en la misma transacción. El contacto no se recupera
desde un endpoint. Los IDs de actor deben ser opacos; texto libre debe contener
solo resúmenes sin datos personales. El filtro rechaza correos, teléfonos y el
destino en campos persistentes, pero no es un anonimizador de expedientes.
Herald histórico mantiene su modelo anterior: esta entrega no lo cifra ni borra.

## Seudonimización y rotación del hash de contacto

`contacto_hash` es un **HMAC-SHA256** con una subclave derivada por HKDF-SHA256 de
la clave de bóveda activa (`info="sm-contacto-hash-v1"`), no un SHA-256 desnudo.
Sin el secreto de servidor no se pueden probar correos o teléfonos por fuerza
bruta desde la base. La consulta y el worker prueban las huellas de la clave
activa y de las claves anteriores configuradas, de modo que una rotación no
rompe consentimientos ni mensajes en curso.

Rotación: añadir la clave nueva como activa y conservar la anterior en
`POLIS_SM_BOVEDA_CLAVES_ANTERIORES`; ejecutar `rotar_boveda` por lotes. Cada lote
recifra y **recalcula** el hash de la fila, y actualiza en la misma transacción
`sm_consentimientos`, `sm_mensajes` y `sm_eventos` que apuntaban a la huella
anterior. No retirar la clave anterior hasta que el recifrado llegue a cero y se
hayan revisado los respaldos. Un consentimiento revocado sin ciphertext conserva
su huella histórica: si se retira la clave anterior, se trata como un registro
nuevo al volver a otorgar, nunca como una autorización implícita.

La auditoría `sm_auditorias` guarda `operador` con el `sujeto_id` autenticado que
registró el consentimiento o el evento; ese valor entra en el hash de traza. Las
acciones del worker no tienen operador humano y quedan con `operador` nulo.

Rotación administrativa: construir `SMBovedaContactoDB.desde_settings()` con
claves activa/anterior y ejecutar `SMServicioDB(session).rotar_boveda(...)` por
lotes hasta cero. Pruebas verifican recuperación, AAD y rechazo de manipulación.
No retirar la clave anterior antes de verificar el recifrado y los respaldos.

### Pruebas y CI (310/HAL-01)

`backend/tests/conftest.py` establece con `setdefault` dos valores deterministas
de prueba: `POLIS_SM_BOVEDA_KEY` (32 bytes fijos, sin relación con secretos
reales) y `POLIS_SM_WORKER_HABILITADO=true`. Así `bun run backend:check`, el
workflow de CI y cualquier base `polis_test*` ejecutan las suites SM sin
exportar secretos a mano. Una prueba que necesite el worker apagado debe fijar
`sm_worker_habilitado=False` explícitamente en su `Settings`/app; no se cambia
el valor por omisión de producción, que sigue siendo `false`. Estos valores
solo aplican a pruebas y nunca deben copiarse a `.env`, al gestor de secretos
ni a la unidad systemd productiva.

## Canales y resultados

| Canal | Configuración | Evidencia de aceptación |
| --- | --- | --- |
| Correo | `POLIS_SMTP_*`; sin host usa Postfix `127.0.0.1:25` solo fuera de test | SMTP acepta destinatario/DATA |
| Webhook | `POLIS_SM_WEBHOOK_SECRET` ≥32 caracteres y `POLIS_SM_WEBHOOK_ORIGENES` (orígenes HTTPS exactos) | HTTP 2xx |
| Telegram | `POLIS_SM_TELEGRAM_TOKEN` oficial | `ok=true` y `message_id` |
| WhatsApp | `POLIS_SM_WHATSAPP_TOKEN`, `PHONE_ID`, `API_VERSION`, `PLANTILLA`, `PLANTILLA_APROBADA=true`, `IDIOMA` | respuesta con ID de mensaje |
| SMS | Cliente `SMSMSCliente` inyectado por un proveedor contratado | recibo no vacío |

No se elige un proveedor SMS ni se supone aprobada una plantilla WhatsApp.
WhatsApp usa únicamente plantilla aprobada con un parámetro de cuerpo; no asume
una ventana de conversación de 24 horas. La versión Graph es configuración
explícita del operador. En `environment=test` todos los transportes de fábrica
simulan, incluso si hay credenciales. Fuera de test, faltantes de configuración
dejan esos canales degradados y producen `simulado`, nunca `enviado`.

`preparado` solo significa payload construido en memoria. `enviado` acredita
aceptación del proveedor, no recepción/lectura del ciudadano. `simulado` es un
estado terminal distinto; no se reenvía automáticamente al configurar luego el
proveedor. La auditoría guarda código cerrado y huella del payload, nunca el
payload, la URL de destino ni respuestas/errores crudos del proveedor.

La reserva del intento usa `en_curso`. Si vence el lease sin resultado confirmado,
ese intento pasa a `incierto`: no se afirma que el proveedor rechazó el mensaje.
El siguiente intento tiene su propio número y el mismo ID lógico de mensaje.

Firma webhook: `X-SM-Signature: sha256=<HMAC_SHA256(secret, timestamp + '.' + body)>`.
Validar sobre bytes exactos, comparar en tiempo constante, exigir timestamp
reciente y deduplicar `X-SM-Message-ID`/`Idempotency-Key`. Sin redirecciones ni
proxies heredados del entorno. Solo orígenes explícitamente aprobados; su DNS y
segmentación de salida son responsabilidad del operador.

## Worker y transacciones

1. Reclamación `FOR UPDATE SKIP LOCKED`, intento reservado y latido; commit.
2. Consentimiento revalidado y descifrado solo en el worker; transacción corta.
3. Transporte fuera de transacción; límite de tiempo inferior al lease.
4. Resultado, auditoría y próximo intento en una transacción independiente.

El worker exige sesión exclusiva sin transacción activa. No confirma operaciones
de dominio ajenas. El puente compone repositorios dentro del límite del dominio;
un rollback revierte también su outbox. Un fallo posterior del transporte no
revierte ni bloquea el evento de dominio ya confirmado. Un error SQL al encolar
revierte el caso de uso completo: no se oculta ni confirma parcialmente.

`proximo_intento_en = reloj_DB + min(base * 2^intento, POLIS_SM_WORKER_MAX_ESPERA_SEGUNDOS) + jitter[0,1]`.
El techo (`sm_worker_max_espera_segundos`, por omisión 3600) evita que el backoff
exponencial desplace indefinidamente un mensaje reintentable. Una reclamación
vencida o sustituida no aborta la ronda: ese mensaje se contabiliza como fallido
incierto y el worker continúa con el siguiente.
`intento` empieza en 1: con base 30 s, el primer fallo espera 60 s más jitter.
`POLIS_SM_WORKER_BASE_SEGUNDOS=30`, `MAX_REINTENTOS=5`,
`LEASE_SEGUNDOS=120`, `POLIS_SM_HTTP_TIMEOUT_SEGUNDOS=10`.
Permanentes: `fallido`, `reintentable=false`. Transitorios: `fallido` con fecha;
al llegar al máximo: `agotado`. Revocación: `cancelado`, sin despacho.
Las reclamaciones vencidas se recuperan sin exceder el máximo de intentos.

La garantía es **al menos una vez**, con IDs estables. Una caída después de SMTP
aceptar y antes del commit final puede repetir el mismo Message-ID. SMTP no
garantiza deduplicación. Una revocación después de autorizar un envío en vuelo
no puede deshacer un efecto externo. No se declara exactamente una entrega.

SIGTERM/SIGINT detienen nuevas reclamaciones y permiten finalizar el mensaje en
curso. El SMTP aplica un presupuesto total a la conversación, además del límite
del worker. Si el supervisor mata el proceso, el lease permite recuperación.
El downgrade 0099 conserva en metadatos el estado anterior de simulaciones o
intentos sin resultado, cancela mensajes reclamados y adapta sus estados al
contrato 0098. El downgrade 0098 elimina la bóveda: requiere respaldo/plan de
recuperación o registrar de nuevo consentimientos; no habilitar envíos sin ella.

`GET /api/v1/sm/health` exige permiso `auditoria:leer` y muestra agregados,
simulaciones, canales degradados, latido y edad de la cola; no revela contactos. Los canales vivos indican configuración disponible,
no una prueba externa de conectividad o validez de credenciales. Latido mayor de cinco minutos o ausente
con worker habilitado degrada salud. El monitor debe alertar sobre esa sonda
usando una cuenta con `auditoria:leer`; sin sesión la ruta responde 401/403.
La consulta de consentimiento usa `contacto_hash` en query; ya no acepta contacto
crudo en URL (los proxies registran query strings) y responde solo el booleano de
consentimiento, sin repetir la huella.

## Cobertura de destinatarios en el corte Herald→SM

El puente solo delega una notificación cuando existe una cuenta **activa** con
esa dirección (`autenticacion.usuarios.activo`) y un consentimiento SM
**otorgado** para el canal correo. Si falta cualquiera, el puente devuelve
`None`, la fila queda `pendiente` y Herald la entrega. La cobertura total es
SM + Herald; la cobertura *solo SM* crece destinatario por destinatario, no al
activar la bandera de corte.

En el corte del 2026-11-08 (18 notificaciones, sin PII en este documento) había
5 filas sin cuenta: 3 con correo real (2 direcciones, una repetida) y 2
identificadores `wa:+57…`. Con `radicacion` y `alerta_pendientes` cortados, SM
tomó 5 y Herald 13; se entregaron 16/16 correos reales y los 2 `wa:` no son
enrutables por correo. Elevar la cobertura solo-SM de esas 5 filas exige alta y consentimiento;
no se resuelve con código ni inventando cuentas.

### Procedimiento por destinatario

Lo ejecuta un operador autorizado; la evidencia se conserva en el registro
operativo, no en logs ni en documentos con datos personales.

1. **Inventario del faltante.** Clasificar las notificaciones del tipo cortado
   por cuenta activa y forma del identificador:

   ```sql
   SELECT n.tipo_evento,
          count(*) FILTER (WHERE u.id IS NULL AND n.destinatario_correo LIKE '%@%') AS correo_sin_cuenta,
          count(*) FILTER (WHERE u.id IS NULL AND n.destinatario_correo NOT LIKE '%@%') AS no_correo,
          count(*) FILTER (WHERE u.id IS NOT NULL) AS con_cuenta
   FROM participacion_ciudadana.notificaciones_transaccionales n
   LEFT JOIN autenticacion.usuarios u
     ON lower(u.correo) = lower(n.destinatario_correo) AND u.activo
   WHERE n.tipo_evento = ANY(:tipos_cortados) AND n.creado_en >= :desde
   GROUP BY n.tipo_evento;
   ```

2. **Alta o reactivación.** Si la cuenta no existe, invitar al registro público
   (que crea ciudadano) o seguir el alta institucional de `docs/identidad.md`;
   nunca crear una cuenta con contraseña ajena ni con datos inventados. Si
   existe inactiva, reactivarla desde administración con motivo y permiso
   `usuarios:gestionar`; no reactivar por SQL improvisado.

3. **Consentimiento previo.** Registrarlo con
   `POST /api/v1/sm/consent` (permiso `comunicaciones:gestionar`) usando el UUID
   del actor, `canal=correo`, el contacto y `origen` trazable (por ejemplo
   `ventanilla:<radicado>`). El operador autenticado queda en `sm_auditorias`.
   Un consentimiento no se infiere de tener cuenta ni de un correo anterior.

4. **Verificación.** El consentimiento queda `otorgado` en
   `participacion_ciudadana.sm_consentimientos`; la siguiente notificación del
   tipo cortado debe quedar `delegado` y su `sm_mensajes.estado` en
   `enviado`/`entregado`. Las filas históricas no se re-delegan: siguen su curso
   por Herald.

5. **Identificadores que no son correo.** Un relay real rechaza `wa:+57…`
   (verificado: `550 5.1.3`). Opciones, en orden de preferencia: corregir el
   identificador en el origen al correo del ciudadano; registrar el teléfono
   como contacto WhatsApp con consentimiento, transporte WhatsApp habilitado y
   plantilla aprobada; o mantenerlo visible como no entregable por correo, sin
   fabricar una entrega. El puente Herald→SM solo emite canal correo: enrutar
   `wa:` a WhatsApp es una decisión de producto y un cambio de código aparte.

El ensayo 315 en staging lo verificó sobre un dataset sintético equivalente:
con 5 filas sin cuenta, SM tomó 5 y Herald 13; tras alta y consentimiento de las
3 filas con correo, SM tomó 8 y Herald 10. Los 2 identificadores `wa:` siguieron
rechazados por el relay (`550`), no por falta de cuenta.

**Criterio de aceptación:** 18/18 entregadas (SM + Herald), 0 duplicados,
`cola.delegadas_sin_entrega = 0` y ninguna fila con correo real pendiente sin
causa. La cobertura solo-SM se reporta por tipo; no se declara completa si un
correo real depende únicamente de Herald.

**Reversa:** vaciar `POLIS_SM_CORTE_TIPOS` y ejecutar
`worker_cli --liberar-delegadas`; conserva las filas que SM ya entregó. El
arranque del backend advierte si hay delegadas antiguas sin entrega confirmada.

## Ejecutor y unidad (solo documentación; no instalada)

```bash
backend/.venv/bin/python backend/scripts/sm_worker_cli.py --once
backend/.venv/bin/python backend/scripts/sm_worker_cli.py --daemon --intervalo 5
```

```ini
[Unit]
Description=POLIS SM outbox worker
After=network-online.target postgresql.service
Wants=network-online.target

[Service]
Type=simple
User=polis
WorkingDirectory=/opt/polis/backend
EnvironmentFile=/etc/polis/sm-worker.env
ExecStart=/opt/polis/backend/.venv/bin/python scripts/sm_worker_cli.py --daemon
Restart=on-failure
RestartSec=5
TimeoutStopSec=60
UMask=0077
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true

[Install]
WantedBy=multi-user.target
```

Adaptar usuario/rutas a la release inmutable aprobada, con acceso al entorno y
sin privilegio de migración. No apuntar al checkout compartido ni habilitar esta
unidad hasta EAF, ensayo 0097→0099, respaldo y coordinación de despliegue. En el
servidor actual sigue vigente el snapshot backend 304 y `bd_csh` permanece 0096.
No configurar simultáneamente daemon y timer. Alternativa: unidad oneshot con
`--once` y un timer `OnUnitActiveSec=30s`, nunca ambos modos a la vez.

Referencias de los contratos de cliente: [AESGCM](https://cryptography.io/en/latest/hazmat/primitives/aead/#cryptography.hazmat.primitives.ciphers.aead.AESGCM),
[HTTPX](https://www.python-httpx.org/advanced/transports/),
[Telegram Bot API](https://core.telegram.org/bots/api#sendmessage),
[WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages).
