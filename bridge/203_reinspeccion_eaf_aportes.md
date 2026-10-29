# EAF-AP-GOLIVE-02 · Reinspección de aportes y persistencia

**Estado: BLOQUEADO para cerrar el criterio de lectura de JSON legado irregular de AP-03.** Los demás criterios comprobados de esta reinspección son conformes dentro de los casos y límites descritos. El bloqueo se debe a un criterio obligatorio fallido, de severidad media; no se afirma una vulnerabilidad crítica ni una fuga reproducida.

26 de octubre de 2026. Evaluador independiente de la implementación182/183 y de la corrección de pruebas204/205. Encargo [202](202_encargo_eaf_reinspeccion_aportes.md), aplicación del skill `polis-eaf-transactions` y reglas de AGENTS, arquitectura, transacciones y equipo EAF. Se conservaron el dictamen171 y sus78 artefactos intactos. Este informe no aprueba GO-LIVE global, despliegue, proveedores, UI ni cumplimiento jurídico universal.

## 1. Objeto fijado e independencia

- Inicio funcional únicamente después de `INICIAR_REINSPECCION_APORTES` y cotejo del0084 final: `f00e45ef9641f0efbb2cfd906f3becacfa7e7211cd3da1d8f0f1aee684e20df5`.
- HEAD `07096bcd73531415d8b8329a8aba0ad64fa5d23c`, rama `remediacion/aud-2026-10-21`, árbol compartido sucio. El resultado corresponde a los bytes capturados, no solo al commit.
- Las20 fuentes propias de183 coinciden al inicio y cierre; sus68 artefactos también. SHA del manifiesto183: `661b24b11f9b27db5e0ee41a50874c81379fab44870aeac0593453afd739aa5a`; SHA de `fuentes_propias_finales.json`: `850adafcc8a7d065cd19ec5ef527b5b1a41d11c6585a529f6a5d9aeb65586cce`.
- Snapshot propio de508 archivos al inicio/final. Solo cambiaron seis tests externos autorizados por coordinación para rutas temporales; se registran sus hashes y los dos helpers nuevos. Ninguna fuente de producto del alcance cambió durante la evaluación. El snapshot final205 de548 archivos también se cotejó con los bytes presentes, sin divergencias.
- Únicas escrituras del evaluador en el repositorio: este informe y [evidencia203](203_evidencia_eaf_aportes/). No se corrigió aplicación, tests de producto, documentos, corpus ni evidencia ajena. Los seis fallos funcionales propios permanecen como fallos.

Trazas: [autorización](203_evidencia_eaf_aportes/autorizacion_inicio.json), [snapshot inicial](203_evidencia_eaf_aportes/snapshot_inicio.json), [snapshot final](203_evidencia_eaf_aportes/snapshot_final.json), [cotejo183/171](203_evidencia_eaf_aportes/cotejo_183_171_final.json). SHA171 conservado: `744dccf64f1fd3f698a36a80c7db7d08fb8a14e3f924e04343f0d56518f123e2`.

## 2. Entorno e integridad de la ejecución

Dos bases nuevas propias, desde `template0`, sin copiar datos de trabajo ni reutilizar bases de otros encargos:

| Uso | Base |
| --- | --- |
| Principal funcional | `polis_test_eaf_aportes_r2_20261026_cb6a2bfe` |
| Downgrade/reconstrucción | `polis_test_eaf_aportes_r2_mig_20261026_2f55a8e8` |

Se provisionaron en esos destinos las extensiones locales requeridas. Las credenciales se mantuvieron en memoria; los DSN explícitos se fijaron antes de cargar aplicación. No se consultó `bd_csh`, otros destinos de agentes ni una base productiva. No se alteraron roles ni servicios del clúster y no se borraron bases preexistentes.

Guarda adaptada de190, SHA `704053e21fe70c8de4aed238343082eca531311c51d59bcd69400821eb2012e8`: nombres exactos, host/puerto local y validación de asyncpg, psycopg y SQLAlchemy; SMTP y sockets/DNS externos bloqueados; escritura Python restringida a evidencia propia, con temporales y cachés redirigidos. Antes de funcionales pasaron16 rechazos anteriores a I/O, una consulta positiva por base y un temporal propio. **Es una guarda Python, no un sandbox universal de procesos nativos.** La provisión administrativa local se limitó a las bases nuevas autorizadas.

Las verificaciones observadoras usan `NullPool` y otra conexión física; las pruebas transaccionales registran PID de escritor/lector. Los fallos de commit se provocaron mediante una restricción PostgreSQL `UNIQUE DEFERRABLE INITIALLY DEFERRED`, con duplicados después de SQL efectivo. La compensación de archivos se examinó con contenido sintético y directorios propios.

Evidencia: [guardas verificadas](203_evidencia_eaf_aportes/guardas_verificadas_v2.json), [runner y comandos](203_evidencia_eaf_aportes/ejecutar_aislado.py), [inventario efectivo](203_evidencia_eaf_aportes/inventario_bd.json).

## 3. Resultados propios

**Corrida consolidada:94 casos propios,88 aprobados y seis fallidos, sin omisiones.** Los seis fallos reproducen R01. Por separado:123 pruebas dirigidas de producto aprobadas;18 escenarios en el script propio de migraciones; un escenario adicional de terminación real del consumidor. No se suman repeticiones de una misma prueba como casos nuevos.

| Comprobación | Resultado y evidencia |
| --- | --- |
| AP-01 · intención y aporte | Éxito de alta/edición y rollback posterior al flush real de la intención, validación, cancelación y commit. Otra conexión no ve la escritura pendiente. Propuesta e intención se confirman juntas; cero transporte antes del worker. |
| AP-01 · consumidor outbox | Claim durable antes del transporte capturado, exclusión concurrente, backoff y reintento, Message-ID estable, fencing de token vencido, fallo real del commit de claim y de resultado. El resultado viejo no sobrescribe el reclamo nuevo. |
| AP-02 · estado inicial y gestión | HTTP y servicio rechazan `en_revision`, `incorporado`, `rechazado` al crear. Gestión real autorizada funciona; anónimo/no autenticado no actualiza, elimina ni emite devolución. Rechazo silencioso422; devolución motivada201 y repetición400. |
| AP-03 · proyección privada/pública | Creación, edición, detalle, lista y devolución no exponen contacto, huella, sesión ni JSON abierto de captura en los casos válidos. Columna privada y originales JSON preservados. Seis variantes de raíces JSON heterogéneas se leen con salida cerrada. **Lectura con tipos internos irregulares e historial con raíz no objeto fallan: R01.** |
| AP-04 · principal estable | Dos logins reales de una cuenta comparten apoyo y `mis-apoyos`; alternancia y retiro secuenciales/concurrentes mantienen contador y unicidad. Sesiones revocadas, vencidas, cuenta inactiva y correspondencia inválida rechazan401 y no escriben. Dos anónimos conservan sus UUID distintos; no se infiere identidad de persona. |
| AP-05 · decisión concurrente | Dos conexiones distintas, con una sesión previamente cargada, revalidan bajo lock: una decisión durable y una auditoría. HTTP concurrente201/400. Rollback de estado y auditoría también cubierto en las variantes transaccionales. |
| AP-06 · inbox | Acuse durable atómico de válido/corto/válido; después ambos válidos se radican y el corto queda rechazado individualmente. Reentrega secuencial/concurrente, cuenta receptora distinta, colisión de contenido con rollback de todo el lote, cancelación/fallo/commit y recuperación sin radicado parcial, exclusión y fencing de consumidores. |
| AP-06 · HTTP/configuración | Configuración deshabilitada503; token incorrecto403; firma ausente o cuerpo crudo modificado401; firma válida200 con fila visible desde otra conexión. Commit PostgreSQL fallido409 deja cero recepciones y el siguiente intento200 confirma el lote. Simulación en producción403 y extras422. |
| AP-07 · modelo/catálogo | `chk_tipo_sujeto` presente en ORM y PostgreSQL; SQL inválido rechazado y transacción íntegra. Ocho tablas inventariadas sin índices ORM faltantes. `alembic check` principal y secundario sin operaciones nuevas. |
| AP-08 · aislamiento | DSN explícitos, fixture común y validación de segunda base examinados;123 dirigidas pasan con `-m 'not migration'`. No contienen llamadas destructivas de downgrade. Todo ensayo propio destructivo se ejecutó únicamente en la secundaria. |
| Evidencias/atomicidad común | Siete éxitos y27 variantes de rollback de aportes, repositorio sin commit invisible y cinco casos de archivo/SQL, incluidos FK, commit, cancelación y validación. No se acredita reconciliación ante caída del proceso entre archivo y SQL. |

Fuentes de prueba: [atomicidad](203_evidencia_eaf_aportes/test_atomicidad.py), [colas](203_evidencia_eaf_aportes/test_colas.py), [principales](203_evidencia_eaf_aportes/test_principales.py), [adicionales](203_evidencia_eaf_aportes/test_adicionales.py). Comandos completos, tiempos y códigos están en cada `.json/.log`; resumen sin duplicar iteraciones en [resultados](203_evidencia_eaf_aportes/resultados_resumidos.json). La corrida final es [15_propias_consolidadas.log](203_evidencia_eaf_aportes/15_propias_consolidadas.log) y su JUnit; las dirigidas, [11_dirigidas_producto.log](203_evidencia_eaf_aportes/11_dirigidas_producto.log).

### R01 · MEDIA · Lectura pública falla ante JSON legado irregular

**Reproducido dos veces, seis casos por corrida; criterio AP-03 pendiente.**

| Datos sintéticos persistidos como JSONB | Ruta/resultado observado |
| --- | --- |
| `metadata_enfoque={"etnia":true}` | Detalle y listado filtrado500. |
| `metadata_enfoque={"es_victima_conflicto":"texto_heredado"}` | Detalle y listado filtrado500. |
| `metadata_enfoque={"es_victima_conflicto":null}` | Detalle y listado filtrado500. |
| Auditoría `DEVOLUCION_MOTIVADA.metadatos` con JSON `null`, `false` o lista | Historial público de devolución500 en cada caso. |

El proyector de [schemas.py:207](../backend/app/modules/aportes/schemas.py#L207) conserva bool/null para campos cuyo tipo de salida no los admite, o strings no válidos para booleanos. La validación posterior lanza `ValidationError`. En [service.py:330](../backend/app/modules/aportes/service.py#L330), el historial valida primero un `dict` y aplica la proyección después: las raíces JSON no objeto no llegan al proyector.

Impacto: indisponibilidad de la consulta que contiene el registro irregular, sin divulgación observada. Los datos son fixtures legadas admitidas por la columna JSONB; no se afirma que existan en producción ni que los esquemas actuales de alta admitan esos valores. Los originales privados se preservaron. Tras observar cada caso de enfoque se desactivó únicamente su fixture sintética para aislar las demás pruebas, conservando su JSON; no se saneó el producto ni se alteró la auditoría inmutable.

Cierre requerido: EDD debe construir una proyección de lectura compatible con los tipos declarados antes de validar, conservar originales privados y mantener no divulgación. EAF deberá repetir los seis casos y las regresiones pertinentes sobre un nuevo snapshot. No se convierte el fallo en una restricción del harness ni se reemplaza por una omisión.

Evidencia compacta con UUID, estado, fuentes y hashes: [R01](203_evidencia_eaf_aportes/hallazgo_R01_legado_irregular.json); trazas [10_adicionales.log](203_evidencia_eaf_aportes/10_adicionales.log) y [15](203_evidencia_eaf_aportes/15_propias_consolidadas.log). Las dos primeras iteraciones de preparación tenían errores propios del harness —uso de generador async en `all`, Content-Type y dominio reservado en EmailStr—, corregidos y conservados en [ajustes_harness](203_evidencia_eaf_aportes/ajustes_harness.jsonl). **R01 es funcional y permanece fallido después de esas correcciones.**

## 4. Migración0084 y consumidores

El [script independiente](203_evidencia_eaf_aportes/migraciones_propias.py) pasó sus18 escenarios, con [trazas](203_evidencia_eaf_aportes/08_migraciones.log) y [snapshots por escenario](203_evidencia_eaf_aportes/migraciones_escenarios.jsonl):

- Instalación vacía, repetición, check, downgrade vacío a base y reconstrucción.
- Rechazo íntegro de contacto legado número, bool, objeto, lista o string256; catálogo, datos y versión0083 idénticos antes/después. Nulo, ausencia, string válido, límite255, vacío y espacios se conservan sin convertir ni truncar.
- Tres apoyos registrados demostrablemente de una cuenta se consolidan en uno, preservando IDs/fechas en trazabilidad. Anónimo se conserva; journal antes/después y contador derivado, incluida deriva previa9→0, verificados. Fecha histórica simulada se separa de `enviado_en`.
- Downgrade compatible reexpande solo supervivientes, conserva el journal en auditoría privada y no resucita apoyos retirados; reupgrade mantiene el retiro.
- Huérfano, equivalencia ambigua y colisión cuenta/anónimo abortan íntegramente. Downgrade con contacto solo privado, apoyo nuevo de cuenta o inbox durable aborta con versión y snapshot idénticos. No se declara downgrade universal ni se eliminan datos para acreditar compatibilidad.
- Durante todos estos ensayos el snapshot de datos y catálogo principal permaneció idéntico: [antes](203_evidencia_eaf_aportes/principal_antes_migraciones.json) y [después](203_evidencia_eaf_aportes/principal_despues_migraciones.json). La principal nunca se bajó/reconstruyó.

CLI real `python -m scripts.procesar_colas_aportes inbox|outbox --limite 1000`:17 resultados inbox y57 outbox confirmados por SQL posterior; salida técnica cerrada, sin payload/destinatarios. Outbox sin SMTP produjo `simulado`, `enviado_en=NULL` y fecha propia. [Verificación final](203_evidencia_eaf_aportes/verificacion_final.json).

Además, un consumidor hijo terminó realmente con `os._exit(73)` después de registrar aceptación **local simulada**. El claim siguió durable; al vencer, otro consumidor completó el intento2 con el mismo Message-ID. [Resultado](203_evidencia_eaf_aportes/caida_worker_resultado.json). Junto con el fallo real de commit posterior a aceptación capturada, acredita la ventana de posible duplicado. No hubo SMTP/Meta reales y no se promete exactamente una vez.

Inventario local: funciones pertinentes `SECURITY INVOKER`, ninguna `SECURITY DEFINER`; `PUBLIC` sin CREATE en los esquemas examinados, con EXECUTE por defecto en las funciones listadas. Es un rol propietario de base aislada: no acredita permisos ni configuración de producción.

## 5. Global compartida y documentos

La global18 de183 era anterior al último cambio0084 y no acredita ese archivo final. Sus ocho fallos de rutas temporales se clasificaron como restricciones de escritura de los tests; coordinación los corrigió después en204.

La **global final205**, ejecutada por coordinación con sus propias dos bases, tiene1431 aprobadas, tres fallidas y16 omitidas; Ruff/formato conformes, retorno1. Este evaluador leyó log/JUnit, clasificación y cotejó sus548 fuentes iniciales/finales y presentes: [cotejo propio](203_evidencia_eaf_aportes/global205_leido.json). **Es evidencia compartida examinada, no una ejecución global propia ni una global aprobada.**

Persisten tres fallos de integridad inventario/corpus por `data/planes_accion/drive_sector_seguridad/resumen_sincronizacion.json`. El ensayo de fallo tardío de catálogo no alcanza su inyección SQL por esa validación previa; no se lo declara probado. Las16 omisiones son15 dependientes del corpus analítico ausente y una del guion oficial no disponible. No se recurrió a la base de trabajo para suplirlos. Estos límites se separan de R01 y no revierten los resultados transaccionales dirigidos.

Documentos finales revisados: permisos API `8782c05d8f692d87e67091f9ef4d62a4f8c6d4821d2151d37e84dc110d698f2a`; operación `c0e6feddb7339b3980dd82c5a728ab8764e3a1cd0fd6622daca70bee58b2582f`; transacciones `09eee0b157c39b57b8c729a9c8cc7da545c73b4ccc27f58a55ee2ecf4ed5f834`. Contratos principales coherentes con intención atómica, recepción distinta de radicación, simulación, al menos una vez, downgrade condicionado y dos bases. No resuelven R01. [Revisión documental](203_evidencia_eaf_aportes/revision_documental.json).

## 6. Alcance de la conclusión

Los defectos171 de SMTP previo al commit, estado institucional en alta, fuga de contacto, principal por login, doble devolución, lote WhatsApp parcial, CHECK ausente y fallback de tests cuentan con evidencia de remediación en los escenarios descritos. La robustez completa de lectura legada AP-03 sigue **BLOQUEADA por R01**. El resto de controles comprobados se conserva como evidencia favorable para la reinspección acotada posterior.

No se evaluaron datos reales ni equivalencias universales de personas, entrega de proveedores, scheduler desplegado, restauración productiva, UI/frontend, corpus ausente o garantía frente a toda caída de archivo/proceso. Sin commit, push, deploy o comunicaciones externas. El cierre del criterio pendiente requiere corrección EDD y nueva evaluación; la decisión global de publicación corresponde a coordinación con los otros dictámenes.

Hashes de los artefactos propios en [manifest_evidencia.json](203_evidencia_eaf_aportes/manifest_evidencia.json); snapshot final, tests originales con sus seis fallos y evidencia se congelan al emitir este dictamen.
