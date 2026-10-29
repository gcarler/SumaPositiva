# EDD-AP-GOLIVE-01 · Entrega para reinspección

26-oct-2026. Implementador `/root/edd_aportes_go_live`, encargo182. Remediación de aplicación del snapshot171; esta entrega es evidencia EDD y no es un dictamen independiente ni autorización GO-LIVE. Se conserva rama y árbol sucio, sin commit, push o despliegue.

## Cambios y casos de uso

| Archivos | Resultado |
| --- | --- |
| `backend/app/modules/aportes/{models,schemas,repository,service}.py` | Contacto privado, alta ciudadana acotada, proyección pública cerrada de JSON, principal de cuenta comprobado en persistencia, bloqueos de propuesta y CHECK real en metadata. |
| `backend/app/modules/notificaciones/{models,service,correo,worker}.py` | La tabla existente es una outbox durable; el aporte y su intención se confirman juntos. Transporte posterior con lease, token, intentos, retry y Message-ID estable. |
| `backend/app/modules/canales/{models,repository,schemas,service,router}.py` | Inbox por cuenta receptora/ID externo, detección de colisiones, captura de lote atómica, resultado transaccional por mensaje y control HMAC/configuración. |
| `backend/alembic/versions/0084_aportes_colas_y_apoyos.py` | Única revisión nueva sobre0083; evolución de notificaciones, inbox, contacto privado, consolidación demostrada y journal de apoyos, downgrade condicionado. |
| `backend/scripts/procesar_colas_aportes.py` | Consumidores CLI finitos de inbox/outbox, resultados técnicos sin destinos ni payload. |
| `backend/tests/test_aportes_remediacion.py`, `test_whatsapp_remediacion.py` | 66 regresiones nuevas: SQL real, conexiones físicas distintas, rollback, privacidad, principal, concurrencia, recepción y recuperación. Los escenarios de atomicidad adaptan el código público del evaluador171 sin editar su evidencia. |
| `backend/tests/test_aportes.py`, `test_notificaciones_y_radicacion.py`, `test_canal_whatsapp.py` | Contratos actualizados: traza privada comprobada en SQL, intención pendiente y webhook que acusa recepción antes del procesamiento. No se retiran guardas ni aserciones de persistencia. |

Cambios compartidos integrados por coordinación: los tres campos de configuración WhatsApp en Settings y su ejemplo sin secretos, registro de modelos de canales en Alembic, aislamiento de ensayos destructivos y corrección de la prueba geodatos. Esos archivos no fueron editados por este implementador. Identidad conservó el UUID de sesión registrada igual al registro cívico; no se cambió su módulo ni SesionContexto.

## Antes y después por hallazgo

| Hallazgo171 | Resultado de la remediación |
| --- | --- |
| AP-01 SMTP antes del commit | Alta/edición solo insertan intención `pendiente`. Fallos posteriores a SQL de intención, DTO, cancelación y commit real dejan estado y notificación anteriores y **cero llamadas SMTP**. El worker reclama una intención confirmada y confirma el lease antes de transportar. |
| AP-02 estado inicial ciudadano | DTO y servicio admiten únicamente `borrador`/`publicado`. `en_revision`, `rechazado` e `incorporado` reciben422 sin escritura. Gestión autorizada y devolución motivada se conservan. WhatsApp construye alta publicada y simulación rechaza campos ajenos. |
| AP-03 contacto público | `correo_contacto` se persiste en columna privada. Metadatos históricos abiertos siguen en la base y no se publican. Creación/edición/lista/detalle/devolución usan proyección de JSON por campos permitidos; tampoco publican huella/UUID de sesión ni derivados de territorios tomados de JSON abierto. |
| AP-04 apoyo por login | El principal registrado se obtiene de SesionUsuario y Usuario activo, comprobando vigencia/revocación y correspondencia. Dos logins consultan/alternan/retiran el mismo apoyo; dos peticiones concurrentes se serializan. Anónimos conservan su UUID cívico, sin equivalencias inventadas. |
| AP-05 devolución simultánea | `SELECT FOR UPDATE` con refresco de identidad cubre condición, estado, auditoría y commit. Dos peticiones autorizadas desde conexiones distintas producen201/400 y una sola decisión. Rollback posterior a escritura revierte ambos efectos. |
| AP-06 lote WhatsApp | HTTP200 confirma todo el lote en inbox; no anuncia radicados. Worker por mensaje permite válido/corto/válido con resultados procesado/rechazado/procesado. Reentrega secuencial/concurrente reutiliza ID; una colisión de contenido409 no sobrescribe ni confirma prefijos. Fallos transitorios/commit/validación/cancelación se recuperan sin duplicar radicación. |
| AP-07 CHECK | `CheckConstraint` usa `conv('chk_tipo_sujeto')` para evitar que naming_convention cambie el nombre real. Prueba compara metadata/catálogo y fuerza una escritura inválida rechazada por ese CHECK, con rollback del contador. |

## Contratos de privacidad y recepción

`PropuestaCiudadanaRead` es una salida pública, también para creación y gestión. Texto declarado de título, descripción, autor y justificación sigue siendo contenido público. En JSON:

- `metadatos`: solo `canal` de la enumeración web/whatsapp/mesa/taller/presencial y `tipo_mensaje` de text/audio/image/document.
- `metadata_enfoque`: solo campos declarados; sin extras ni `datos_adicionales`; no devuelve cadenas con direcciones de correo o teléfonos. Se conservan los originales privados.
- `archivos_adjuntos`: solo referencias `evidencia_id` que sean UUID válidos. Nombres, destinos, URLs o diccionarios abiertos heredados no forman parte del contrato público.
- Historial público de devolución: igual proyección cerrada de sus metadatos. El historial institucional de notificaciones sigue protegido por `auditoria:leer` y permite inspección privada.

El destino para correo nuevo no se copia a metadatos públicos. La migración extrae el destino heredado conocido sin borrar ese JSON. La proyección se aplica en todas las salidas del alcance y no altera los registros para ocultarlos.

Webhook Meta requiere `whatsapp_habilitado=true`, `whatsapp_app_secret` y `whatsapp_verify_token` configurados en Settings; en ausencia devuelve503, sin token de fallback. GET compara el token sin registrarlo. POST valida HMAC SHA256 del cuerpo original con `X-Hub-Signature-256` y devuelve401 ante firma ausente/falsa. Contrato contrastado con [documentación oficial del SDK Meta](https://whatsapp.github.io/WhatsApp-Nodejs-SDK/api-reference/webhooks/start/); la página Graph API devolvió429 al consultarla. No se usaron SDK ni red Meta reales.

El índice único usa `(cuenta_proveedor, mensaje_externo_id)`; cuenta combina entrada del proveedor y número receptor técnico. El hash canónico del mensaje/nombre capturado **solo compara contenido**, no amplía la clave para admitir duplicados. El acuse devuelve `mensajes_recibidos`, `mensajes_nuevos`, `mensajes_repetidos` y descripción de recepción. El worker guarda resultado/error por UUID técnico; el payload permanece privado. Un ID con contenido diferente devuelve409 y revierte íntegramente esa recepción. La ruta de simulación devuelve403 en producción.

## Consumidores y límite de entrega

Ejecutar con DSN/configuración explícitos del entorno autorizado:

```bash
PYTHONPATH=backend uv run --project backend python -m scripts.procesar_colas_aportes inbox --limite 50
PYTHONPATH=backend uv run --project backend python -m scripts.procesar_colas_aportes outbox --limite 50
```

La CLI consume una tanda y termina; cron/servicio de operación y activación de proveedores están pendientes y no se instalaron. Inbox confirma recepción del lote; cada intento reclama con `SKIP LOCKED`, token y lease de cinco minutos. La radicación, constancia simulada y resultado se confirman juntos; el fallo revierte esas escrituras y queda error recuperable, o rechazo para contenido no admisible. Cancelación conserva el lease confirmado para recuperar al vencer. Error transitorio reintenta a partir de un minuto; rechazo permanente no se reintenta automáticamente.

Outbox reclama con `FOR UPDATE SKIP LOCKED`, token y lease predeterminado de60s; confirma antes de SMTP. Guarda intento, error sin payload/destino y retry exponencial acotado a una hora. Solo el propietario del token finaliza el intento; otro worker no sobrescribe el resultado de una reclamación posterior. Mensaje `<polis-notificacion-UUID@polis.invalid>` permanece estable entre intentos. La garantía es **al menos una vez con posible reenvío**: si SMTP acepta y el proceso cae antes de registrar resultado, la recuperación puede entregar de nuevo. Message-ID sirve para correlacionar y no obliga a un proveedor a deduplicar. No se promete entrega exactamente una vez.

Sin SMTP configurado el resultado es `simulado`, con `enviado_en=NULL` y fecha separada `simulado_en`; WhatsApp tampoco representa una confirmación real de Meta. Ninguna simulación se presenta como fecha real de envío.

## Migración y compatibilidad

0084 no altera migraciones anteriores. Antes de DDL, contacto legado no nulo debe ser string de máximo255 caracteres; objeto, número, booleano, lista o string mayor bloquean el upgrade con snapshot idéntico. Un destino válido se copia exactamente, sin normalizar ni truncar, y JSON null/clave ausente se conservan sin destino. Registro `usuario` se consolida solo por una equivalencia única demostrable a Usuario directamente o mediante SesionUsuario existente. Si falta o es ambigua, upgrade falla y PostgreSQL conserva0083 y sus datos. Nunca fusiona anónimos ni convierte a una persona por coincidencia supuesta. Grupos de sesiones de una cuenta conservan UUID, sujeto, tipo y fecha originales en trazabilidad del superviviente. `migracion_apoyos_0084` guarda filas/contadores antes y después de **todas** las propuestas; se reconstruye el contador desde filas resultantes, conservando la diferencia anterior como evidencia.

El downgrade obtiene locks exclusivos antes de comprobar compatibilidad. Solo reexpande votos consolidados que todavía existen; no resucita votos retirados. El journal se conserva en `auditoria.registros_auditoria`, acción `MIGRACION_APOYOS_0084`, fuera del filtro público de devolución usado también por el cliente anterior. No se vuelca trazabilidad privada en Propuesta.metadatos. Pendientes de correo pasan a `fallido` con marcador de downgrade; fechas de simulación se conservan como marcador interno sin crear fecha real de entrega.

**Downgrade condicionado, no universal.** Contacto que solo existe en columna privada, apoyo nuevo de cuenta sin origen de sesión demostrable e inbox durable bloquean el downgrade antes de mutar datos/esquema. Los ensayos comparan snapshots completos y confirman0084 conservada. No se elimina información para volver verde. La prueba global destructiva requiere una segunda base vacía explícita, distinta de la base de regresiones. Un rollback de despliegue a binario anterior no está aprobado por estas pruebas.

## Evidencia y resultados

Directorio de evidencia: `bridge/183_evidencia_edd_aportes/`. El lanzador valida DSN locales y nombres exactos antes de importar configuración. Base final creada desde template0: `polis_test_edd_aportes_20261026_166c0437`; prueba destructiva global en `polis_test_edd_aportes_20261026_migraciones_4371ebf4`. La preliminar `polis_test_edd_aportes_20261026_50bf1715` se conserva, sin reutilizarla para el global. Extensiones se provisionaron solo en las bases nuevas mediante acceso administrativo local; no se modificaron roles ni servicios de producción.

Guardas finales183 derivadas de190v2 y ampliadas para permitir escrituras solo en evidencia183, temporales propios y `/dev/null`: **16 negativas anteriores a I/O**, consulta positiva de las dos bases y temporal positivo aislado. Drivers restringidos a esos dos nombres exactos y loopback:5432; SMTP real y sockets/DNS externos rechazados. TMPDIR/TMP/TEMP, medios de pruebas y caches de herramientas se dirigen a evidencia propia. La guarda Python no constituye aislamiento de todos los posibles subprocesos nativos y no se atribuye esa propiedad.

| Comando/evidencia | Resultado |
| --- | --- |
| `01_upgrade_vacio.log`, `03_alembic_check.log` | Upgrade inicial y check pasan. |
| `02_atomicidad.log` |35/35 éxito/rollback reales. |
| `20_dirigidas_snapshot_final.log/xml` |**222 passed**, sin omisiones,79,59s;66 regresiones nuevas en backend, dos escenarios adicionales HTTP/visibilidad en evidencia y suites existentes de aportes/apoyos/devolución/enfoque/notificaciones/canal/transacciones/permisos. |
| `21_migraciones_snapshot_final.log`, `migraciones_finales_resultado.json` | Snapshot final: instalación vacía, downgrade base con cero tablas de aplicación, reconstrucción/repetición/check, legado conservado y rechazos íntegros de incompatibles pasan. El resultado09 se conserva como fase anterior. |
| `19_contacto_legado_final.log`, `contacto_legado_resultado.json` |Cinco destinos inadmisibles bloquean upgrade con snapshot idéntico y0083 conservada; copia exacta válida, null y clave ausente pasan. |
| `22_ruff_snapshot_final.log`, `23_formato_snapshot_final.log` |Ruff y formato539 archivos pasan en el snapshot final. |
| `12_guardas_finales.log`, `guardas_verificadas_v2.json` |16 negativas y2 conexiones positivas, temporal aislado positivo. |
| `13_backend_check_global.log` |Interrumpido por coordinación, exit143; Ruff y formato538 archivos pasan, pytest1444 recogidos pero incompleto. Se detectaron más fixtures destructivas compartidas que coordinación separa. No es suite aprobada. |
| `14_control_posterior13.log/json` |Tras interrupción:0084 permanece,111propuestas,79contactos privados,14inbox y2journal. |
| `15_cli_inbox.log`, `16_cli_outbox.log` |CLI ejecutadas solo en base propia con transportes deshabilitados. Inbox registra error de fixture SQL malformado de migración y procesa dos mensajes válidos posteriores. Outbox registra simulación, sin SMTP real. |

`18_backend_check_global_aislado.log/xml` completó Ruff/formato539 archivos y pytest: **1419 passed,11 failed,16 skipped**,538,91s, exit1. Los548 hashes de fuentes seleccionadas inicial/final quedaron idénticos. No es una suite aprobada.

Los11 fallos se clasifican en `backend_check_fallos_clasificados.json`: **ocho restricciones de filesystem** (tres CLI en bridge116, bridge93, bridge139, ingesta en data/planes_accion, materialización IPC en data/capas_analiticas y ruta absoluta /tmp/articulo_gold_set_test.json fuera del temporal aislado) y **tres discrepancias de corpus/SHA** del resumen_sincronizacion.json ya observadas en171. No se alteraron fuentes, corpus, fixtures ni guardas para ocultarlos. Las16 omisiones, con causa en `backend_check_omisiones.json`, son15 por corpus analítico no instalado en las bases aisladas y una por guion oficial externo ausente. No se usó la base activa para suplirlos. Aportes, identidad, transacciones y los ensayos de migración separados no registran fallos en esa corrida.

**Diferencia de snapshot declarada:** después de18 se endureció exclusivamente0084 para no convertir ni truncar contactos legados inadmisibles. La corrida global corresponde al hash anterior de ese archivo. El snapshot final se verificó con Ruff/formato,222 pruebas dirigidas, los nuevos casos de contacto legado y el roundtrip completo de migraciones en la base secundaria; no se presenta como un segundo global limpio. `comparacion_global18_snapshot_final.json` identifica el único archivo/cambio y sus dos SHA.

Las bases se conservan con datos de ensayo. La secundaria final contiene deliberadamente el inbox que prueba el bloqueo de downgrade; repetir ensayos destructivos requiere otra base vacía nueva, explícita y exclusiva. No borrar esa recepción ni contactos para forzar un downgrade.

Se conservan corridas propias fallidas:04 esperaba204 en logout, cuyo contrato real es200;05 mutaba settings antes del lifespan y éste reponía el entorno test;06 detectó naming_convention del CHECK y expectativa anterior de traza pública;08 encontró bind de fecha ISO no convertido a datetime en downgrade. Se corrigieron test/implementación correspondientes sin rebajar condiciones, y las suites posteriores y roundtrip pasan. La interrupción13 fue una decisión de coordinación, no una aprobación. La arista de truncación detectada después de18 quedó corregida y ejercitada en19/20/21, sin redefinir retrospectivamente el snapshot de18.

## Propuesta de integración documental

Para `docs/permisos-api.md`: POST/GET webhook públicos con validación de firma/configuración; HTTP200 acredita recepción durable del inbox. Simulación pública solo fuera de producción. `mis-apoyos` identifica cuenta estable o sesión anónima, no un login como persona. Crear aporta estado inicial `borrador`/`publicado`; PATCH/devolución mantienen permisos institucionales actuales. Las respuestas públicas no incluyen contacto, huella, sesión ni JSON de captura abierto. Mantener `auditoria:leer` para historial institucional privado.

Para operación/transacciones: programar consumidores únicamente después de revisión de despliegue, con DSN/permisos propios, métricas de pendientes/error/reclamaciones vencidas y política de reintento. Provisionar extensiones antes del upgrade. Revisar apoyos huérfanos/ambiguos antes de0084; no resolverlos automáticamente. Conservar journal y política de downgrade condicionado. Configurar secretos Meta explícitos y mantener proveedor deshabilitado hasta validación operativa independiente.

## Límites y congelación

Las pruebas usan PostgreSQL local y transporte capturado/simulado; no acreditan entrega SMTP/Meta, disponibilidad operativa, publicación frontend ni configuración productiva. Los estados de datos/corpus externos de la suite global se clasifican aparte cuando finalice. Ningún cambio de fuentes/banco/caches activos ni evidencia171 se autoriza en esta entrega. Los hashes y comandos están en `fuentes_propias_finales.json`, `comandos.json`, `resultados_junit.json` y `manifest_evidencia.json`. La comparación inicial/final de18 no muestra cambios; el endurecimiento posterior0084 queda aislado por SHA y pruebas. `control_inmutabilidad171.json` confirma el dictamen y78 artefactos171 sin diferencias. El snapshot EDD final queda congelado para reinspección del evaluador171. La migración obtiene locks y recorre filas; no se midió rendimiento con volúmenes productivos y requiere planificación operativa antes de aplicarla.
