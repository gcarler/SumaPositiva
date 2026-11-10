# Protocolo y Plan de Migración Progresiva: POLIS Herald → SM Core

**Versión:** 1.2.0
**Fecha:** 2026-11-08
**Estado:** Fase 1 (sombra) y Fase 2 (corte por tipo) implementadas y probadas en
`polis_test*`. **P5 sigue abierto operativamente:** la cobertura de cuentas es
13/18 y el corte real no se ha medido con carga de producción.
**Evidencia medida:** [`bridge/314_p5_paridad_reversa_herald_sm_20261108/`](../bridge/314_p5_paridad_reversa_herald_sm_20261108/informe.md).

---

## 1. Contexto y principio rector

Herald (`app.modules.notificaciones`) es el emisor histórico de correo
transaccional. SM Core (`app.modules.sm`) aporta outbox multicanal, bóveda
AES-256-GCM, hashes HMAC de contacto, worker con leases y observabilidad sin PII.

> **Principio:** ningún cambio de enrutamiento puede perder una notificación ni
> duplicarla. Herald solo deja de enviar un tipo cuando SM ya aceptó el mensaje
> en la misma transacción; si SM no puede aceptarlo, Herald lo envía.

---

## 2. Comportamiento real del puente

`NotificacionService._sincronizar_sm` invoca `SMBridge.sincronizar_notificacion`
dentro de la transacción del evento de dominio, solo si el tipo está en
`POLIS_SM_EVENTOS_DOMINIO` (vacío por defecto). El puente:

1. Busca un `Usuario` activo cuyo correo coincida con el destinatario de Herald.
   Si no existe, **omite** el evento.
2. Verifica consentimiento SM otorgado para ese actor y canal de correo. Si no
   existe, **omite** el evento.
3. Inserta evento y mensaje SM con `idempotencia = herald:<id>`, origen
   `polis.bridge`, **el asunto y el cuerpo HTML reales de Herald** (el asunto se
   recorta a 200 caracteres, límite del contrato SM) y un payload mínimo sin
   datos personales: solo `notificacion_id`.
4. Marca el mensaje como sombra (`sm_modo_sombra=1`) salvo que el tipo esté en
   `POLIS_SM_CORTE_TIPOS`. En corte no hay marca de sombra y el worker SM
   despacha de verdad, enviando el cuerpo copiado como parte `text/html`
   (multipart) para no mostrar las etiquetas al ciudadano.
5. No hereda consentimientos de Herald ni copia asunto/cuerpo a Herald: la
   dirección es Herald → SM.

El validador del núcleo rechaza cualquier asunto o cuerpo que contenga un correo
o un teléfono; si el contenido de Herald los incluyera, el evento se rechaza y
**toda** la transacción se revierte, incluida la fila de Herald.

### 2.1 Sombra y corte

| | `POLIS_SM_EVENTOS_DOMINIO` | `POLIS_SM_CORTE_TIPOS` | Quién envía |
| --- | --- | --- | --- |
| Apagado | — | — | Herald |
| Sombra | tipo | — | Herald (SM solo registra y simula) |
| Corte | tipo | tipo | SM (Herald marca `delegado`) |

El corte aplica a los flujos que pasan por `_sincronizar_sm`; `resumen_diario`
usa su propio `INSERT ... ON CONFLICT` y no se delega.

`POLIS_SM_CORTE_TIPOS` debe ser subconjunto de `POLIS_SM_EVENTOS_DOMINIO`; si no,
`Settings` falla al arrancar. Un tipo cortado sin sombra previa nunca pasaría por
el puente y Herald seguiría enviando en silencio.

### 2.2 Estado `delegado`

Cuando el puente devuelve un mensaje y el tipo está cortado, la fila de Herald
pasa de `pendiente` a `delegado` en la misma transacción. El worker de Herald
solo reclama `pendiente`, `procesando` y `fallido`: **no puede enviar una fila
delegada**. La salud de Herald informa `cola.delegados` y el visor la muestra
como «Envío delegado a SM». Mientras el tipo esté cortado, la autoridad sobre la
entrega es SM (`sm_entregas`); la fila de Herald conserva la intención, no un
acuse que no ocurrió.

La conmutación es segura frente a los dos fallos que importan:

- **Sin cuenta o sin consentimiento SM:** el puente devuelve `None`, la fila
  sigue `pendiente` y Herald la envía. No se pierde el correo.
- **Doble envío:** Herald no reclama filas `delegado`; SM no envía un mensaje dos
  veces por la idempotencia `herald:<id>`.

---

## 3. Paridad medida (ensayo sobre copia de bd_csh)

Ensayo del 2026-11-08 sobre la copia del respaldo diario, periodo
2026-10-11 a 2026-11-07:

| Métrica | Valor |
| --- | --- |
| Notificaciones Herald | 18 |
| Destinatarios únicos / con usuario activo | 8 / 4 |
| Emitidas a SM | 13 |
| Omitidas por falta de usuario | 5 |
| Omitidas por falta de consentimiento | 0 |
| Duplicados en segunda pasada | 0 |
| Entregas SM | 0 (worker apagado) |
| Latencia hook p50 / p95 | 8,19 ms / 10,57 ms |

La brecha 13/18 es de **cobertura de cuentas**, no de errores del puente: esos 5
destinatarios no tienen cuenta activa y, con corte, Herald seguiría enviándoles.
El contenido ya es el real de Herald.

### 3.1 Ensayo con transporte real y carga (2026-11-08)

Copia del respaldo diario restaurada en `polis_test*`, migrada de `0096` a
`0101` en 2,83 s, con corte de `radicacion` y `alerta_pendientes` (se excluyen
`resumen_diario` y `registro_bienvenida`). El envío salió por SMTP real contra
un sumidero local, sin red externa.

| Métrica | Valor |
| --- | --- |
| Notificaciones de la copia | 18 |
| Delegadas y enviadas por SM | 5 (todas `enviado`) |
| Enviadas por Herald (remanente) | 13 |
| Correos capturados por el sumidero | 18 |
| Direcciones realmente enviables entregadas | 16 / 16 |
| Duplicados (mismo destinatario y asunto) | 0 |
| Cuerpo distinto entre Herald y SM | 0 |
| Latencia del hook p50 / p95 | 1,89 ms / 25,45 ms |

Carga de 200 notificaciones cortadas a una cuenta con consentimiento: 200/200
enviadas, 0 fallidas, 13,85 s de drenaje (~14,4 mensajes/s) y latencia de cola
p50 9,85 s / p95 13,75 s. El sumidero local no valida direcciones: en producción
un relé rechazaría las dos filas con identificador `wa:+57…`, que no son
correos.

### 3.2 Cobertura de los 5 destinatarios sin cuenta

| Grupo | Cantidad | Entrega |
| --- | --- | --- |
| Cuentas activas con consentimiento | 13 | SM o Herald según tipo |
| Correos reales sin cuenta | 3 | Herald (fallback) |
| Identificadores `wa:+57…` sin `@` | 2 | No enviables por correo |

Con el corte activo, la entrega total es **18/18** y **16/16 de los correos
reales**, sin duplicados: SM toma lo que puede y Herald cubre el resto. Elevar
la cobertura *solo por SM* exige acciones de producto que no se pueden inventar
en código: alta y consentimiento de los 3 ciudadanos con correo real, corrección
o baja de las 2 filas `wa:`, un hook para `resumen_diario` y una estrategia para
los enlaces de uso único de `registro_bienvenida`.

---

## 4. Procedimiento de corte real

### 4.1 Precondiciones

- [ ] Sombra estable del tipo durante al menos una semana, con 0 conflictos de
      idempotencia y latencia de hook dentro del presupuesto.
- [ ] Worker SM con transporte real configurado (canal de correo vivo) y
      monitoreo de `sm_entregas`.
- [ ] Contacto en la bóveda AES-256-GCM: el consentimiento otorgado guarda el
      ciphertext; sin él el worker no puede resolver el destino y el mensaje
      quedaría `fallido`.
- [ ] Cobertura de cuentas aceptada: los destinatarios sin cuenta activa o sin
      consentimiento SM seguirán recibiendo por Herald. El corte es por tipo,
      no por destinatario.
- [ ] Tipos con enlace de uso único (`registro_bienvenida`,
      `recuperacion_contrasena`) **no se cortan** hasta que SM gestione el ciclo
      de vida del token: el cuerpo copiado incluiría el mismo enlace de un solo
      uso en un segundo outbox.
- [ ] Respaldo verificado de `bd_csh` y ventana de observación acordada.

### 4.2 Activación

```ini
# El tipo debe estar en sombra y en corte; el arranque valida el subconjunto.
POLIS_SM_EVENTOS_DOMINIO=["gestion_institucional"]
POLIS_SM_CORTE_TIPOS=["gestion_institucional"]
POLIS_SM_WORKER_HABILITADO=true
# POLIS_SM_BOVEDA_KEY=<clave AES de 32 bytes; independiente de JWT y MFA>
```

```bash
sudo systemctl reload polis-backend      # recarga la configuración
sudo systemctl start polis-sm-worker.service   # solo si existe y fue habilitado
```

Verificación tras la primera notificación del tipo:

```sql
-- Herald: la fila quedó delegada, no enviada.
SELECT estado_envio, count(*) FROM participacion_ciudadana.notificaciones_transaccionales
WHERE tipo_evento = 'gestion_institucional' AND creado_en > now() - interval '1 hour'
GROUP BY 1;

-- SM: mensaje pendiente o entregado, con la misma idempotencia.
SELECT estado, asunto FROM participacion_ciudadana.sm_mensajes
WHERE idempotencia LIKE 'herald:%' AND creado_en > now() - interval '1 hour';
```

Si aparecen filas `pendiente` del tipo cortado, SM no pudo aceptarlas (cuenta o
consentimiento): Herald las enviará. No es un fallo del corte.

### 4.3 Degradación

Ante entrega SM fallida de forma sostenida, ejecutar la reversa (§5) en lugar de
reactivar Herald en paralelo: dos emisores activos para el mismo tipo duplican
correos.

---

## 5. Reversa del corte

1. Quitar el tipo del corte y recargar el backend:
   ```ini
   POLIS_SM_CORTE_TIPOS=[]
   ```
   ```bash
   sudo systemctl reload polis-backend
   ```
2. Devolver a la cola de Herald lo que SM no llegó a entregar:
   ```bash
   cd /root/polis/backend
   PYTHONPATH=. .venv/bin/python -m app.modules.notificaciones.worker_cli --liberar-delegadas
   # {"estado": "delegadas_liberadas", "liberadas": N, "conservadas_entregadas_por_sm": M}
   ```
   Solo libera tipos que ya salieron de `POLIS_SM_CORTE_TIPOS`. Las filas cuyo
   mensaje SM consta `enviado`/`entregado` (o con entrega `enviado`) se conservan
   en `delegado`: reenviarlas duplicaría el correo. Si el tipo sigue cortado, el
   comando no libera nada.
3. El ciclo normal de Herald envía las filas devueltas a `pendiente`. Si además se
   quiere detener SM, vaciar `POLIS_SM_EVENTOS_DOMINIO` y detener el worker SM:
   ```bash
   sudo systemctl stop polis-sm-worker.service   # solo si existe y fue habilitado
   ```
4. Verificar: `notificaciones_transaccionales` no cambió de conteo salvo las
   filas liberadas, las conservadas siguen `delegado` y no hay mensajes SM nuevos.

---

## 6. Observación

`GET /api/v1/sm/health` exige `auditoria:leer`; no es una sonda pública. La salud
de Herald (`/health/herald`) incluye `cola.delegados` y
`cola.delegadas_sin_entrega`: esta última cuenta las filas `delegado` con más de
30 minutos y sin entrega SM confirmada, y degrada la salud. Al arrancar, el
backend registra un `WARNING` con esa cifra; es la señal de que el worker SM no
está drenando o de que una reversa quedó a medias. Ambas salidas muestran
agregados, nunca contactos.

---

## 7. Criterios para retirar Herald

Herald solo se archiva cuando: el 100% de los tipos de evento estén migrados con
paridad de contenido y cobertura, la entrega SM sea ≥ 99,8% durante 30 días, la
reversa de la conmutación esté probada en el entorno real y exista retención
formal de `notificaciones_transaccionales`. Hoy no se cumple ninguno de esos
criterios.
