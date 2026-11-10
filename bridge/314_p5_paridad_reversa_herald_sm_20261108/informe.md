# P5 — Informe de paridad y reversa Herald → SM (ensayo controlado)

**Fecha:** 2026-11-08
**Carácter:** evidencia de ensayo sobre una copia restaurada de `bd_csh`; **no**
es un corte de producción ni un dictamen EAF.
**Base:** `polis_test_p5_paridad_20261108`, restaurada desde
`backups/diarios/bd_csh_diario_20261108_020002.dump`
(SHA-256 `99b31be1…18fa`, verificado) y migrada a `0100_sm_auditoria_operador`.
**Worker SM:** apagado (`POLIS_SM_WORKER_HABILITADO=false`); no hubo envío externo.

## 1. Periodo y universo

| Dato | Valor |
| --- | --- |
| Periodo de Herald | 2026-10-11 14:43 UTC a 2026-11-07 12:00 UTC (27 días) |
| Notificaciones Herald | 18 |
| Destinatarios únicos | 8 |
| Destinatarios con usuario activo | 4 |
| Tipos de evento | `alerta_pendientes`, `resumen_diario`, `registro_bienvenida`, `radicacion` |

Como SM nunca se desplegó, la copia no tenía consentimientos SM. Para poder
ejercitar el puente se sembraron **4 consentimientos sintéticos** (uno por
destinatario con usuario activo) en la copia desechable. Esto es datos de
ensayo, no consentimientos productivos.

## 2. Paridad de volumen y estados

Se reprodujeron las 18 notificaciones por `SMBridge.sincronizar_notificacion`
dentro de su transacción, con la lista de eventos activa.

| Resultado | Primera pasada | Segunda pasada |
| --- | --- | --- |
| Emitidos a SM | 13 | 13 (idempotentes, sin filas nuevas) |
| Omitidos sin usuario activo | 5 | 5 |
| Omitidos sin consentimiento | 0 | 0 |
| Errores | 0 | 0 |
| Eventos SM totales | 13 | 13 |
| Mensajes SM totales | 13 | 13 |
| Duplicados de idempotencia | 0 | 0 |

Los 13 eventos usan `idempotencia = herald:<id>` y `origen = polis.bridge`.
Todos los mensajes quedaron en estado `pendiente`; **`sm_entregas = 0`**.

### Brecha de paridad

`18 − 13 = 5` notificaciones no tienen un usuario activo cuyo correo permita
resolver contacto y consentimiento. Si se hiciera un corte real, esos 5 envíos
se perderían. El puente actual tampoco copia el asunto/cuerpo HTML de Herald:
genera un cuerpo genérico. **La paridad de contenido no está implementada.**

## 3. Latencia del hook

Medición en la base local restaurada, 18 transacciones, sin red externa:

| Métrica | Hook SM | Transacción con hook |
| --- | --- | --- |
| p50 | 8,19 ms | 8,76 ms |
| p95 | 10,57 ms | 11,72 ms |
| Máximo | 21,85 ms | 22,62 ms |

El objetivo de “menos de 3 ms” del documento anterior **no se cumple** en este
entorno. La cifra no es una medición de producción, pero tampoco permite afirmar
que el hook sea despreciable: debe medirse en staging antes de un corte.

## 4. Reversa

Con `POLIS_SM_EVENTOS_DOMINIO=[]` y una notificación elegible:

| Comprobación | Resultado |
| --- | --- |
| Retorno del puente | `null` (no crea evento) |
| Notificaciones Herald antes/después | 18 / 18 |
| Eventos SM antes/después | 13 / 13 |
| Envío externo | ninguno; worker apagado |

La reversa del modo sombra es inmediata y no pierde registros de Herald. No
existe todavía un modo de corte que haga que Herald omita su envío, por lo que
la reversa de una conmutación real **no puede probarse** con el código actual.

## 5. Conclusión

- El modo sombra es seguro con el worker apagado: no duplica correos porque SM no
  despacha y Herald conserva el 100% de sus registros.
- La paridad medida es **13/18** por falta de cuentas activas, no por fallo del
  puente; el puente omitió exactamente las 5 no resolubles.
- La idempotencia resiste una segunda pasada sin duplicar filas.
- El corte real (Herald deja de enviar y SM asume) **no está implementado**. P5
  queda preparado como evidencia de sombra, no como migración cerrada.
- Antes de un corte se requiere: resolver los 5 destinatarios sin cuenta o
  aceptar su baja, portar el contenido real de Herald, medir latencia en staging
  y construir la bandera de omisión de Herald con prueba de no duplicación.

## 6. Limpieza

Base de ensayo eliminada; no se tocó `bd_csh`, no se reinició el backend, no se
envió correo y no hubo commit ni despliegue.
