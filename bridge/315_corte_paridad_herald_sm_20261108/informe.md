# 315 — Corte real Herald→SM, paridad de contenido y runbook de respaldos

**Fecha:** 2026-11-08 (reensayo contra el MTA propio: 2026-11-09)
**Alcance:** P5 de `bridge/310_plan_cierre_pendientes_sm_core.md` y corrección del
runbook de respaldos (`docs/despliegue-produccion.md` §3 y §5.2).
**Entorno:** base desechable `polis_test*` del contenedor PostgreSQL 16. No se
tocó `bd_csh` (host PostgreSQL 18, revisión `0096_riesgo_sin_evaluar`), no se
reinició ningún servicio ni hubo commit/push.

## 1. Corte real por tipo

Se añadió `POLIS_SM_CORTE_TIPOS` (vacío por defecto) y se validó al arrancar que
sea subconjunto de `POLIS_SM_EVENTOS_DOMINIO`. Con un tipo cortado:

- `SMBridge.sincronizar_notificacion` encola el mensaje **sin** la marca
  `sm_modo_sombra`, por lo que el worker SM lo despacha de verdad.
- Si SM no acepta el evento (sin cuenta activa o sin consentimiento), el puente
  devuelve `None`, la fila de Herald sigue `pendiente` y **Herald la envía**.
- Si SM acepta, la fila pasa a `delegado` en la misma transacción. El worker de
  Herald solo reclama `pendiente`/`procesando`/`fallido`: no puede duplicar.

La migración `0101_notif_delegado_sm` añade el estado al `CHECK`; el downgrade
devuelve las filas `delegado` a `pendiente` antes de reconstruir la restricción.

## 2. Reversa

`worker_cli --liberar-delegadas` devuelve a `pendiente` solo las filas cuyo tipo
ya salió del corte y cuya entrega SM no consta (`sm_mensajes.estado` distinto de
`enviado`/`entregado` y sin `sm_entregas.estado_entrega='enviado'`). Ensayo con
tres filas delegadas —una con mensaje SM `enviado`—:

```
{"estado": "delegadas_liberadas", "liberadas": 2, "conservadas_entregadas_por_sm": 1}
```

Resultado en base: dos `pendiente`, la ya entregada sigue `delegado`. Con el
tipo todavía en `POLIS_SM_CORTE_TIPOS`, el comando devuelve 0/0.

## 3. Paridad de contenido

El puente copia el asunto real (recortado a 200 caracteres, límite del contrato
SM) y el `cuerpo_html` de Herald, en lugar del texto genérico anterior. El
validador del núcleo sigue rechazando cuerpos con correo o teléfono. La prueba de
integración compara `sm_mensajes.asunto/cuerpo` contra la fila de Herald.

Limitación documentada: los flujos con enlace de uso único
(`registro_bienvenida`, `recuperacion_contrasena`) no deben cortarse hasta que SM
gestione el token; el cuerpo copiado incluiría el enlace de un solo uso.

## 4. Pruebas ejecutadas

| Comprobación | Resultado |
| --- | --- |
| `pytest tests/test_sm_310.py` | 29 passed |
| `test_herald_fase2`, `test_herald_salud_resumen`, `test_notificaciones_y_radicacion`, `test_servicio_correo_transaccional` | 60 passed, 1 skipped |
| `test_sm_310.py` + `test_sm_full.py` en base nueva | 60 passed |
| Suite completa en base nueva | 1993 passed, 27 skipped, 1 failed (`pgrouting` no instalado; el test pasa al instalar la extensión) |
| `ruff check` y `ruff format --check` | sin hallazgos (622 archivos) |
| `alembic check` | sin drift |
| `0101` downgrade → upgrade | OK; el `CHECK` vuelve a `delegado` |
| `bun run check` (ui:check, tsc, eslint) | OK |

En una primera corrida sobre una base reutilizada aparecieron fallos por estado
acumulado (`bootstrap` encontraba un admin previo) y por contaminación de cola:
los mensajes de corte de las pruebas nuevas no llevaban `proximo_intento_en`, y
`test_sm_full` los reclamaba para otro actor. Se corrigió aislando la cola en las
pruebas (`_postergar_mensajes`); ambas suites pasan juntas en base nueva.

## 5. Runbook de respaldos

Hallazgo verificado: `bd_csh` vive en el PostgreSQL **18.6** del host; el
contenedor `polis-database-1` es PostgreSQL 16 y solo hospeda `polis`/`polis_test*`.
El volcado diario usa el cliente 18 (formato 1.16) y el `pg_restore` 16 del
contenedor no puede leerlo.

Cambios:

- `scripts/respaldo_programado_bd.sh` y `scripts/respaldo_bd.sh`: preflight de
  versión cliente/servidor, registro de ambas en el log y manifiesto
  `.dump.pgversion` (también en las copias semanal y mensual).
- `scripts/restaurar_bd.sh` y `scripts/verificar_restauracion_dump.sh`: usan el
  `pg_restore` más reciente del host (`/usr/lib/postgresql/18/bin/pg_restore`),
  validan el archivo con `-l` antes de crear la base y explican el error de
  versión; ya no se invoca el cliente 16 del contenedor.
- `docs/despliegue-produccion.md`: §3 registra el manifiesto; §5.2 exige el
  cliente 18 del host, muestra el preflight y documenta que la exclusión de
  `topology.*` solo aplica al destino 16 de laboratorio.

Ensayo (copia del script con directorio temporal, contra `polis` en el
contenedor 16): el log registra `Cliente pg_dump 18.6 contra servidor 16.9`, el
aviso de que se requiere `pg_restore >= 18`, y el manifiesto
`pg_dump=18.6 / servidor=16.9` para diario, semanal y mensual.

## 6. Alerta de delegadas sin entrega

La salud de Herald cuenta las filas `delegado` con más de 30 minutos cuya
entrega SM no consta (`sm_mensajes.estado` distinto de `enviado`/`entregado` y
sin `sm_entregas.estado_entrega = 'enviado'`). Esa cifra:

- degrada `/health/herald` con un motivo que, en la variante pública, no revela
  cifras;
- aparece en la salud autenticada como `cola.delegadas_sin_entrega`;
- al arrancar el backend deja un `WARNING` en el log. La comprobación corre en
  segundo plano: no retrasa el arranque ni lo tumba si la base no responde.

Verificado con un backend real contra la base de pruebas: el arranque registró
`Arranque con 1 notificaciones delegadas a SM sin entrega confirmada tras 30
minutos…` y `/health/herald` respondió `degradado` con el motivo sin cifras.

## 7. Ensayo con transporte real y carga

Copia del respaldo diario restaurada en `polis_test*`, migrada `0096 → 0101` en
2,83 s, con corte de `radicacion` y `alerta_pendientes` (se excluyen
`resumen_diario`, sin hook, y `registro_bienvenida`, con enlace de uso único).
El envío usó SMTP real contra un sumidero local; sin red externa.

Harness reproducible: [`ensayo_corte.py`](ensayo_corte.py) y
[`analisis_sumidero.py`](analisis_sumidero.py) (solo ensayo, no producción).

| Fase de 18 notificaciones | Valor |
| --- | --- |
| Delegadas y enviadas por SM | 5, todas `enviado` |
| Enviadas por Herald | 13 |
| Capturadas por el sumidero | 18 |
| Correos reales entregados | 16 / 16 |
| Duplicados | 0 |
| Cuerpo distinto Herald vs SM | 0 |
| Hook p50 / p95 | 1,89 ms / 25,45 ms |

Carga de 200 notificaciones cortadas a una cuenta con consentimiento: 200/200
enviadas, 0 fallidas, 13,85 s de drenaje (~14,4 mensajes/s), latencia de cola
p50 9,85 s / p95 13,75 s, 200 entregas únicas.

Hallazgo corregido: el transporte SMTP enviaba el cuerpo HTML de Herald como
texto plano, mostrando las etiquetas. Ahora detecta HTML y lo envía como parte
`text/html` en `multipart/alternative`, con prueba en
`tests/test_sm_transports_310.py`.

El sumidero local acepta cualquier destinatario: en producción un relé
rechazaría las dos filas `wa:+57…`, que no son correos.

## 8. Cobertura 18/18

Los 5 destinatarios sin cuenta se descomponen en 3 correos reales
(`cgomez@veranof.org` ×2, `veeduria.getsemani@cartagena.gov.co`) y 2
identificadores `wa:+57…` sin `@`. Con el corte activo la entrega total es
**18/18** y **16/16 de los correos reales**, sin duplicados: SM toma lo que
puede y Herald cubre el resto. Esa cifra 18/18 corresponde al sumidero local,
que acepta cualquier destinatario; con un relay real el total es 16/16 correos y
las 2 filas `wa:` no son entregables por correo (ver §9).

Elevar la cobertura *solo por SM* no se resuelve con código: requiere alta y
consentimiento de los ciudadanos con correo real (no se pueden inventar
cuentas), corrección o baja de las 2 filas `wa:`, un hook para `resumen_diario`
y una estrategia para los enlaces de uso único. Las cifras y el desglose están
en [`analisis_final.json`](analisis_final.json).

Resolución operativa: el procedimiento por destinatario (inventario, alta o
reactivación, consentimiento previo, verificación y tratamiento de `wa:`) quedó
en [`docs/sm-worker.md`](../../docs/sm-worker.md) § «Cobertura de destinatarios
en el corte Herald→SM». Se validó en staging: sin alta, SM tomó 5 y Herald 13;
tras alta y consentimiento de las 3 filas con correo, SM tomó 8 y Herald 10.
Las 2 filas `wa:` siguen siendo rechazadas por el relay: dependen de corregir el
identificador en el origen o de habilitar WhatsApp con consentimiento y
plantilla aprobada, decisión de producto.

## 9. Ensayo en staging con relay externo (2026-11-09)

Base desechable `polis_staging_315_20261109` en el PostgreSQL 16 del contenedor,
restaurada del respaldo diario `20261108_020002` y migrada `0096 → 0101`.
`POLIS_ENVIRONMENT` solo admite `development`, `test` o `production`: el perfil
`staging` es rechazado por validación. El aislamiento lo dio la base desechable,
no una configuración de entorno distinta.

Relay: Postfix del host en `127.0.0.1:25` con `relayhost` vacío, es decir
entrega directa a los MX públicos; no es un relay corporativo autenticado. La
ruta se comprobó primero con un mensaje sintético: aceptado por el relay y
recuperado en un buzón externo efímero, con remitente institucional, HTML y
`Auto-Submitted`.

Datos: 18 notificaciones sintéticas con la misma distribución que la copia real
(9 `radicacion`, 1 `registro_bienvenida`, 7 `resumen_diario`, 1
`alerta_pendientes`; 4 cuentas con consentimiento) porque la copia restaurada
contiene datos de ciudadanos y ningún correo real podía salir del servidor.

Harness: [`ensayo_corte_staging.py`](ensayo_corte_staging.py); verificación:
[`verificar_buzon_staging.py`](verificar_buzon_staging.py) y
[`verificacion_staging.json`](verificacion_staging.json).

| Fase de 18 notificaciones | Delegadas | Herald | Rechazadas por relay | Correos entregables |
| --- | --- | --- | --- | --- |
| A — sin cuenta | 5 | 11 | 2 (`wa:`) | 16 |
| B — alta y consentimiento de las 3 filas con correo | 8 | 8 | 2 (`wa:`) | 16 |

- Las 2 filas `wa:+57…` de cada fase fueron rechazadas con `550`; Herald las
deja en `fallido` con `SMTPRecipientsRefused`. Un relay real no las enruta.
- 62/62 mensajes del ensayo fueron aceptados por el relay y entregados al MTA
externo según el log de Postfix. El buzón efímero conserva solo los más
recientes: al verificar quedaban los 30 de carga, con 3/3 muestras HTML
idénticas a `cuerpo_html`.
- Carga de 30: 30/30 enviadas por SM, 0 fallidas, encolado 1,14 s, drenaje
  7,15 s (~4,2 mensajes/s), latencia p50 3,01 s / p95 5,70 s.

Limitaciones (resueltas en §10 para el transporte):

- No había host de staging separado ni relay corporativo con credenciales: la
  entrega externa usó el Postfix del host y un buzón efímero.
- El proveedor efímero aplica `450` y conserva solo los mensajes más recientes,
  así que la verificación externa de las 62 no era estable.
- `resumen_diario` no se cortó (sin hook) y `registro_bienvenida` se excluye por
  el enlace de uso único.

## 10. Reensayo contra el MTA propio (2026-11-09)

El servidor ya opera correo propio (Postfix, OpenDKIM y Dovecot; ver
[`docs/correo-propio.md`](../../docs/correo-propio.md)), así que el ensayo se
repitió **sin proveedor externo ni buzón efímero**: el relay es el submission
autenticado de este host y la verificación se hace sobre un buzón local.

- Base: respaldo diario `20261109_020001` restaurado con `pg_restore` 18 del
  host en `polis_staging_315_mta_20261109` (PostgreSQL 16 del contenedor) y
  migrado `0096 → 0101`. Se repiten los dos avisos conocidos de la restauración
  (`transaction_timeout` de PG18 y `topology.useslargeids`); no tocan las tablas
  del ensayo.
- Relay: `mail.seguridadhumanaintegral.org:587` con STARTTLS verificado y AUTH
  del buzón institucional. El proxy local 2528 rechaza con `550` los
  identificadores `wa:+57…` (como un relay real) y sustituye el destinatario por
  `ensayo315@seguridadhumanaintegral.org`, un buzón de Dovecot creado solo para
  el ensayo.
- Verificación: IMAP 993 con TLS y login del buzón; asuntos y cuerpos se leen del
  Maildir, no de una API externa.
- Datos: los mismos 18 registros sintéticos por fase que §9 y carga de 30. Ningún
  correo de ciudadano salió del servidor.

Harness: [`ensayo_corte_mta_propio.py`](ensayo_corte_mta_propio.py). Evidencia:
[`resultados_mta_propio_20261109.json`](resultados_mta_propio_20261109.json)
y [`registro_ensayo_mta_propio_20261109.log`](registro_ensayo_mta_propio_20261109.log).

| Fase de 18 notificaciones | Delegadas | Herald | Rechazadas `wa:` | Correos entregables |
| --- | --- | --- | --- | --- |
| A — sin cuenta | 5 | 11 | 2 | 16 |
| B — alta y consentimiento de las 3 filas con correo | 8 | 8 | 2 | 16 |

| Comprobación | Resultado |
| --- | --- |
| Aceptados por el submission autenticado | 62 / 62 |
| Recibidos en el buzón local | 62 / 62 (esperados 62) |
| Duplicados por asunto / `Message-ID` repetidos | 0 / 0 |
| Faltantes con correo real / cuerpo divergente | 0 / 0 en 32 esperados |
| Muestra de paridad comparada contra `cuerpo_html` | 6, todas idénticas |
| Firmas DKIM presentes / válidas (dkimpy, DNS real) | 62 / 62 y 6 / 6 en la muestra |
| Cabeceras `ESMTPSA` (submission autenticado) + `LMTP` | 62 / 62 |
| Carga de 30 | 30 / 30 enviadas, 0 fallidas, 5,4 s de drenaje |

Nota de método: `dkimpy` no forma parte del venv del backend; el harness verifica
las firmas con el intérprete indicado en `ENSAYO_DKIM_PYTHON`. Sin él la métrica
DKIM queda en «no verificada», no en cero.

Con esto queda cerrada la limitación de §9: el corte se repitió de punta a punta
contra el MTA institucional, con entrega verificable y sin depender de un
proveedor efímero. El buzón de ensayo y la base desechable se retiraron al
cerrar la evidencia.

## 11. Pendiente

- Decisión de producto sobre el alta/consentimiento de los 3 destinatarios con
  correo (procedimiento listo) y sobre las 2 filas `wa:`.
- Hook de `resumen_diario` si se quiere cortar también ese tipo.
- P6/P7: EAF independiente, commit y ventana de despliegue.
