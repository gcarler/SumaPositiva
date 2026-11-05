## 9. Verificación final independiente del 2026-11-03 — dictamen vigente

**Dictamen final del Encargo 275: APROBADO.** Se cierra **H275-01**, incluidos **R1.1, R1.2 y R1.3**, y se conservan los cierres comprobados de H275-02 a H275-05. No quedan abiertos los cinco hallazgos de esta evaluación. Este resultado corresponde al alcance y al código identificados abajo; no declara verde toda la plataforma ni constituye autorización de despliegue.

### 9.1. Independencia y versión evaluada

Codex no implementó las remediaciones. Se contrastó el script presentado por coordinación, se copió a un laboratorio de archivos y se ejecutó contra el **mismo arnés independiente de 12 casos**, sin modificar sus aserciones ni sus expectativas. Su SHA-256 sigue siendo **`998488a0f3567e7dec6db2586f2c769593f554ad42d5499adb28f6a4710151f6`**.

- HEAD observado: **`625007de093a3560033f1de3eddc0a7e5960302a`**, más la superposición local fijada en el manifiesto. Este commit añade documentación respecto del HEAD de la inspección anterior; no contiene por sí solo toda la implementación auditada.
- SHA-256 de `scripts/monitor_sistema_polis.sh` ejecutado: **`eee0888e5211075906d6896404de895f3b3f7edbb05a5eb2da00aa05572e01de`**.
- Contraste de **857 archivos** con la inspección anterior: **solo cambió el monitor**; los otros **856** mantienen su hash. Tampoco aparecieron archivos adicionales en los directorios de aplicación, pruebas, scripts backend, migraciones y unidades incluidos en el control.
- El snapshot y las diferencias están en [snapshot.json](275_cierre_eaf_codex_20261103/snapshot.json) y [remediacion_monitor.diff](275_cierre_eaf_codex_20261103/remediacion_monitor.diff). La copia pública del código auditado es [monitor_sistema_polis_auditado.sh](275_cierre_eaf_codex_20261103/monitor_sistema_polis_auditado.sh).

### 9.2. Cierre de los tres residuales

| Residual | Corrección y comprobación independiente | Resultado |
| --- | --- | --- |
| **R1.1** | `curl -f` en webhook, línea 81, y Telegram, línea 96. El arnés original reproduce HTTP 503→200 con el cliente real y ahora recibe los dos POST: el primero no sella y el segundo reintenta. Cuatro casos adicionales prueban **HTTP 400 y 503 en ambos canales**: `curl` retorna **22**, no hay sello; el HTTP 200 siguiente retorna 0 y sí sella. | **CERRADO** |
| **R1.2** | La función retorna 0 exclusivamente cuando `enviada=true`, líneas 111–114. Sin canales no hay despacho ni sello; configurar un canal un minuto después permite la primera alerta. El fallo de transporte tampoco sella, y el éxito de un canal con el otro fallido sí permite confirmar el despacho. | **CERRADO** |
| **R1.3** | La eliminación del sello exige `MODO == cron`, línea 209. Tanto `--check` como `--json` preservan el sello cuando Herald se recupera. La recuperación por cron sí lo elimina y permite alertar inmediatamente ante un incidente nuevo. | **CERRADO** |

Se preservaron también las correcciones anteriores: el estado global continúa degradado durante el cooldown; se respeta la frontera de 7.200 segundos; una incidencia de otro servicio sigue notificándose; los cuerpos de salud vacíos o malformados producen JSON válido sin escribir el sello. En estas pruebas, «despacho confirmado» significa éxito del canal HTTP conforme al contrato del monitor; no demuestra lectura humana ni recepción en un buzón final.

### 9.3. Pruebas ejecutadas en este cierre

| Verificación nueva | Resultado |
| --- | --- |
| `bash -n` sobre el script congelado | **Exit 0**. |
| Arnés independiente original, primera corrida | **12 aprobadas / 0 fallidas**, 16,27 s de pytest. |
| Mismo arnés, segunda corrida con directorio temporal nuevo | **12 aprobadas / 0 fallidas**, 17,12 s de pytest. |
| HTTP real 400/503 en webhook y Telegram, con reintento 200 | **4 aprobadas / 0 fallidas** en la corrida final; primera corrida también 4/4. |
| Ruff sobre los cuatro archivos Python del arnés y sus verificadores | **Check y formato exit 0**. No sustituye la suite global del backend. |
| Contraste final de código y custodia | Sin cambios durante la verificación; artefactos previos conservados y comprobados por hash. |

Evidencia por caso: [monitor_r1.xml](275_cierre_eaf_codex_20261103/monitor_r1.xml), [monitor_r2.xml](275_cierre_eaf_codex_20261103/monitor_r2.xml), [monitor_casos.jsonl](275_cierre_eaf_codex_20261103/monitor_casos.jsonl), [http_canales_r2.xml](275_cierre_eaf_codex_20261103/http_canales_r2.xml) y [http_canales_casos.jsonl](275_cierre_eaf_codex_20261103/http_canales_casos.jsonl). Los JSON de ejecución registran comandos exactos, tiempos y códigos de salida. Los cuatro fallos anteriores pasan ahora sin rebajar las expectativas del arnés. Tras ajustar únicamente el orden de importaciones del arnés suplementario para Ruff, se repitieron sus cuatro casos y se conservó también la primera corrida. El arnés original de 12 casos permanece byte a byte idéntico.

Los tests se ejecutaron sin cargar el `conftest` de la aplicación ni sus plugins automáticos. `psql`, consultas de salud y systemd fueron sustituidos por stubs. El `curl` real solo contactó un servidor efímero ligado a **127.0.0.1**; para Telegram se sustituyó exclusivamente la URL de destino dentro del arnés, conservando las opciones reales del cliente. Se usaron identidades ficticias y ningún proveedor externo. La copia ejecutada no contiene `.env`.

### 9.4. Evidencia conservada y límites

**H275-02, H275-03 y H275-05 mantienen los cierres de la sección 8**: sus archivos y dependencias comparados no cambiaron. **H275-04** conserva su cierre y, además, vuelve a pasar sus dos casos de cuerpo vacío/malformado en ambas corridas del monitor. La antigüedad de la cola, el corte continuo de las 07:00 COT, el reintento auditado, permisos, idempotencia y migración conservan la evidencia SQL real de la inspección anterior.

**Transacciones, persistencia y migraciones: no aplica una nueva ejecución para este delta**, limitado al monitor Bash. No cambian ORM, consultas, servicios, permisos, esquemas ni migraciones. Se conserva la comprobación anterior en las bases temporales del puerto 5433: 15 sondas, 5 pruebas de corte, 123 verificaciones de acceso, suites transaccionales, reconstrucciones y CLI/worker. Las tres bases y su rol ya fueron eliminados, según [limpieza.json](275_reinspeccion_eaf_codex_20261103/limpieza.json). Este cierre no crea bases ni requiere conexiones SQL.

**La suite global sigue sin acreditarse como verde:** la última ejecución real de `bun run backend:check`, recogida en la sección 8.4, terminó con **1.737 aprobadas / 6 fallidas / 16 omitidas** y exit 1. Son cinco fallos de plantillas 279/285 y uno de agenda, fuera del alcance de 275. También persiste el drift preexistente de `actividades_anexos` y dos índices en `alembic check` CLI. No se repitieron esos checks en este cierre del monitor, no se modificaron sus pruebas y sus límites permanecen declarados.

**H275-05 no certifica ausencia absoluta de secretos en Git:** se conserva la redacción comprobada de los documentos corrientes y la observación de 131 blobs históricos con la credencial anterior declarada rotada. No se reescribe el historial ni se vuelve a probar la autenticación productiva. El disparo automático del 2 de noviembre mantiene la comprobación de systemd/journald de la sección 8.5; los detalles SQL aportados por el operador siguen identificados como tales.

### 9.5. Custodia y conclusión

El dictamen rechazado de la primera re-inspección, SHA-256 **`dd08d8318afe4eae69c7329064cf5f5d99b7501bb4e3716694fd8670a24c7750`**, se conserva íntegro en [dictamen_rechazado_20261103_preservado.md](275_cierre_eaf_codex_20261103/dictamen_rechazado_20261103_preservado.md). La evaluación inicial del 2 de noviembre mantiene su copia íntegra de hash `f12facbcd…` en la evidencia anterior. Los manifiestos históricos conservan sus hashes originales; sus referencias al documento mutable se resuelven mediante estas copias preservadas.

[cierre.json](275_cierre_eaf_codex_20261103/cierre.json) registra el contraste final de código, la custodia histórica y el control de secretos conocidos en la evidencia nueva. [manifest_sha256.json](275_cierre_eaf_codex_20261103/manifest_sha256.json) sella este dictamen y los artefactos nuevos. El acuse posterior [notificacion_tmux.json](275_cierre_eaf_codex_20261103/notificacion_tmux.json) registra el envío a `agy:0`, sin equipararlo a lectura del destinatario.

**Conclusión vigente: APROBADO para el Encargo 275 sobre el snapshot identificado.** Los cinco hallazgos quedan cerrados en su alcance declarado, con las limitaciones ajenas y de historial descritas arriba. Codex solo añadió evidencia y actualizó este dictamen: sin cambios de aplicación, frontend o configuración productiva, sin uso de `bd_csh` o Postfix real, sin reinicios, commit ni push.
