# Dictamen EAF independiente — Encargo 275, POLIS Herald

**Estado: RECHAZADO.** Hay incumplimientos funcionales reproducidos en la observabilidad y en la cobertura temporal del resumen. El reintento auditado, sus permisos y su rollback sí quedan acreditados. El alcance no puede declararse cerrado por el resultado favorable de esas pruebas.

**Evaluador:** Codex (`codex:0.0`). **Implementador evaluado:** Freebuff (`freebuff:0.0`). **Fecha:** 2026-11-02, UTC.

## 1. Independencia, snapshot y alcance

Esta evaluación es independiente de la implementación del Encargo 275. Codex realizó anteriormente la medición 277 en un laboratorio separado, sin implementar los cambios de 275. La autoauditoría de Freebuff se utilizó como evidencia de entrada, sin adoptar su conclusión.

Se leyeron las tres instrucciones de la asignación: `275_tarea_codex_auditoria_eaf_independiente.md`, `01_tarea_activa.md` y `solicitud_eaf_independiente_275.md`; además, el encargo original, la entrega, la autoauditoría, `AGENTS.md`, el contrato transaccional, arquitectura, identidad, permisos y la guía `polis-eaf-transactions`.

### Identificación exacta

- Base solicitada: **`4b45b104acc9d2a16a51bc80bd1ab7d328c56d58`**.
- La asignación incluye expresamente el árbol local de Herald: la mayor parte de 275, incluida la migración 0094, **todavía no está en ese commit**. Este dictamen evalúa el commit más esa superposición, fijada por SHA-256; no acredita que un checkout limpio del commit contenga la entrega.
- Durante la lectura inicial apareció `64e818f8444083b1f7589e7edaae020765b96068`. Su única diferencia respecto de la base es añadir `bridge/solicitud_eaf_independiente_275.md`; no se incorporaron cambios de aplicación de ese commit.
- Se creó una copia privada del código para ejecutar las verificaciones, sin `.env` y sin compartir archivos editables con producción. La referencia efectiva es [snapshot_v2.json](275_evidencia_eaf_codex/snapshot_v2.json). La primera captura y los errores de preparación del laboratorio se conservan por transparencia, sin contabilizarlos como defectos del producto.
- El cierre registra los hashes del código y las diferencias finales en `275_evidencia_eaf_codex/cierre.json` y el manifiesto de evidencia.

**Perfiles aplicados:** backend, base de datos y CI/operación. Se siguieron las rutas hasta sus servicios y transacciones, así como el CLI, el ejecutor, la migración y el monitor.

**Exclusiones:** frontend 276 y demás cambios de interfaz; rediseño de plantillas 279/285 salvo las regresiones que afectan a la batería compartida; evaluación jurídica de las leyendas de los correos; capacidad de entrega real a Internet; activación de DNS y proveedores. No se accedió a `bd_csh`, ni siquiera para verificar credenciales. No se arrancaron ni reiniciaron servicios reales, ni se ejecutó el watchdog contra infraestructura productiva.

## 2. Entorno y aislamiento

- Python 3.12.14, SQLAlchemy 2.0.54, asyncpg 0.31.0, FastAPI 0.142.2, Pydantic 2.13.5 y pytest 9.1.1. Versiones completas en [versiones.txt](275_evidencia_eaf_codex/versiones.txt).
- PostgreSQL del contenedor de pruebas `polis-database-1`, puerto **5433**; nunca el servidor productivo del puerto 5432.
- Bases exclusivas: `polis_test_eaf_275_codex`, `polis_test_eaf_275_codex_mig` y `polis_test_eaf_275_codex_probes`. La tercera separa las sondas forenses de las suites y reconstrucciones.
- Rol temporal exclusivo del laboratorio, con privilegios para instalar extensiones y reconstruir esquemas; no representa el rol operativo recomendado para la aplicación. Su credencial se generó en memoria y se custodió en un archivo privado 0600, eliminado al finalizar.
- `POLIS_DATABASE_URL` y `POLIS_TEST_DATABASE_URL` explícitas; SMTP vacío y sin `.env` en la copia. Los transportes se simularon o sustituyeron; no se utilizó Postfix real.
- Se usó el entorno Python instalado, con `UV_NO_SYNC=1`: se registra su versión, sin afirmar que esta revisión haya comprobado una instalación nueva de todas las dependencias desde el lock.
- La instalación de las migraciones comenzó en bases vacías, sin copiar esquemas ni datos productivos. Para la suite espacial se provisionaron únicamente en el laboratorio PostGIS, pgRouting y address_standardizer.

## 3. Hallazgos del alcance

### H275-01 · Alta · El cooldown puede impedir la primera alerta y declarar salud global falsa

**Archivo:** `scripts/monitor_sistema_polis.sh:185`, especialmente 195–198; salida cron en 285–290.

**Reproducción:** copia del script con sustitución únicamente de rutas de archivos privados, y stubs para `curl`, `systemctl`, `psql`, `df` y reloj. Ninguna llamada de red, base o servicio real. Se ejecutaron once escenarios; se repitió el arnés conservando ambas evidencias.

**Esperado:** toda degradación sigue figurando como degradación; el cooldown limita el despacho de alertas ya entregadas. Una lectura diagnóstica no equivale a un despacho.

**Observado:**

1. `--check` con Herald degradado escribe el sello, aunque no envía alerta. El `--cron` siguiente, 60 segundos después, **no envía ninguna alerta**, devuelve **0** y registra «Todos los servicios saludables».
2. Tras una primera alerta correcta, la segunda ejecución también devuelve **0** y registra salud global mientras Herald continúa degradado.
3. Un webhook que falla deja igualmente el sello; el cron siguiente no reintenta el canal durante la ventana de 7.200 segundos.

El sello se escribe al detectar el problema, antes de conocer el resultado de un despacho. Además, `ESTADO_GLOBAL=1` y el detalle del fallo solo se asignan fuera del cooldown. Esta combinación puede ocultar una incidencia de entrega precisamente cuando se consulta su diagnóstico.

**Consecuencia:** supresión demostrada de avisos que nunca se despacharon y falso estado global exitoso. Es bloqueante para la observabilidad exigida por 275.

**Corrección propuesta:** mantener el estado y los detalles de degradación independientemente del cooldown; separar la decisión de notificar; evitar que `--check`/`--json` consuman el sello; persistir el sello tras un despacho confirmado, con tratamiento explícito de fallos del canal. Conservar los escenarios de vencimiento y recuperación, que sí funcionan.

**Evidencia:** [monitor_r1.json](275_evidencia_eaf_codex/monitor_r1.json), casos `lectura_check_consume_sello`, `cron_tras_check_no_envia`, `repeticion_dentro_cooldown` y `no_reintenta_webhook_fallido`; arnés [probar_monitor.py](275_evidencia_eaf_codex/probar_monitor.py).

### H275-02 · Media · La antigüedad publicada corresponde al pendiente más reciente

**Archivo:** `backend/app/modules/notificaciones/salud.py:204`.

**Escenario:** dos pendientes, uno con 31 minutos de antigüedad y otro con dos segundos; latido fresco y SMTP configurado en la fixture.

**Esperado:** antigüedad aproximada de 1.860 segundos y estado `degradado`, por superar diez minutos.

**Observado:** `mas_antiguo_segundos` aproximadamente **2,15**, `estado="saludable"` y ningún motivo. La consulta aplica `min` a las edades, en vez de seleccionar la mayor edad o la fecha mínima. Se reprodujo en dos corridas independientes del test.

**Consecuencia:** la llegada de mensajes nuevos oculta una cola envejecida y evita activar la regla de degradación.

**Corrección propuesta:** calcular `MAX(ahora - creado_en)` o la edad de `MIN(creado_en)`, con el filtro de pendientes. Añadir la regresión con edades mezcladas a la suite del módulo.

**Evidencia:** [sondas.jsonl](275_evidencia_eaf_codex/sondas.jsonl), caso `antiguedad_cola`; fallo `test_antiguedad_usa_pendiente_mas_antiguo` en los XML [R1](275_evidencia_eaf_codex/sondas_r1.xml) y [R2](275_evidencia_eaf_codex/sondas_r2.xml).

### H275-03 · Media · El resumen de las 07:00 deja actividad fuera de todos los días

**Archivos:** `backend/app/modules/notificaciones/resumen_cli.py:45`, `:146` y `:175`; idempotencia en `service.py:518`; timer diario de las 07:00.

**Esperado:** cobertura de las acciones de las últimas 24 horas, sin huecos entre resúmenes, conservando un correo por destinatario y día de corte.

**Observado:** el CLI selecciona el día corriente **00:00–24:00 de Bogotá**, pero el timer lo ejecuta a las **07:00** y la primera fila impide actualizar el resumen del mismo día:

- Una acción de ayer a las 15:00, dentro de las últimas 24 horas del disparo, queda excluida; la de hoy a las 06:00 sí entra.
- Una acción de hoy a las 15:00 llega después del resumen de hoy; una nueva ejecución del mismo día conserva la primera fila, y el resumen de mañana consulta otra fecha. La acción **no aparece en ninguno de los dos resúmenes**.

Ambos escenarios se reprodujeron dos veces. El huso horario y la unicidad funcionan; el error está en articular corte, programación e idempotencia.

**Consecuencia:** el resumen presenta una bitácora incompleta aunque el ejecutor y el timer informen éxito. No se pierde el comprobante inmediato ni la fila original de actividad.

**Corrección propuesta:** definir un corte estable sin huecos, por ejemplo 07:00→07:00, o resumir el día anterior completo con fecha/radicado coherentes. Precisar la semántica de `--fecha`, recuperación de ejecuciones retrasadas y reejecución. Probar acciones antes y después del corte en días consecutivos.

**Evidencia:** casos `resumen_07h_ventana` y `resumen_post_07h` en [sondas.jsonl](275_evidencia_eaf_codex/sondas.jsonl); dos fallos correspondientes en cada XML independiente.

### H275-04 · Media · `--json` falla cuando el endpoint de Herald no responde

**Archivo:** `scripts/monitor_sistema_polis.sh:173`, `:182` y `:269`.

**Escenario:** `curl` no devuelve cuerpo, como en un timeout o rechazo de conexión; modo `--json`.

**Esperado:** JSON válido que informe `no disponible`, degradación global y salida de alerta.

**Observado:** stdout vacío y `HERALD_MOTIVOS_JSON: unbound variable`. Con `set -u`, la variable solo inicializada dentro de la rama de cuerpo no vacío aborta la construcción del reporte.

**Consecuencia:** se rompe la salida estructurada durante la indisponibilidad que debe describir. El escenario no implica que el modo cron también aborte por esa variable.

**Corrección propuesta:** inicializar las variables de salida antes de consultar el endpoint y construir un JSON válido también para errores HTTP, timeout y cuerpo malformado.

**Evidencia:** `json_endpoint_sin_respuesta` en [monitor_r1.json](275_evidencia_eaf_codex/monitor_r1.json).

### H275-05 · Baja · La credencial anterior sigue en documentación e historial

**Archivos:** `docs/rotacion-secretos.md:11`, `:151`; `docs/plan-consolidacion-git.md:21`, `:37`, `:39`, `:143`, `:180`; objetos históricos relacionados con scripts y documentos.

La búsqueda de coincidencias conocidas examinó **5.009 blobs Git alcanzables**. Encontró **131 blobs** con el valor anterior, declarado rotado, y dos documentos actuales del conjunto inspeccionado que todavía lo contienen. No se reproduce el valor en este dictamen ni en la evidencia exportada.

No se encontraron coincidencias de la contraseña de BD actual, la clave JWT ni el salt actuales en esos blobs ni en los archivos de aplicación del snapshot examinados. Los journals consultados tampoco dieron coincidencias ni DSNs con contraseña. `backend/.env` tiene permisos **0600**. Los dos scripts remediados leen la credencial del entorno/archivo en vez del literal anterior.

**Consecuencia:** no procede certificar literalmente «ninguna credencial en Git». Esto no demuestra vigencia de la contraseña anterior: su revocación fue declarada por el implementador y no se volvió a autenticar contra producción, por la prohibición expresa de la asignación.

**Corrección propuesta:** retirar valores históricos de la documentación operativa vigente mediante referencias redactadas y conservar la evidencia original bajo custodia. Decidir el tratamiento del historial con coordinación; esta auditoría no modifica ni reescribe Git. Registrar la rotación comprobada por el operador competente. No se pide una nueva rotación de secretos sin evidencia de exposición actual.

**Evidencia:** [secretos.json](275_evidencia_eaf_codex/secretos.json). Límite: búsqueda por secretos conocidos y journals definidos, no prueba universal de ausencia de otros secretos ni de terminales/copias no inspeccionadas.

## 4. Criterios acreditados y remediaciones anteriores

| Criterio | Resultado y evidencia |
| --- | --- |
| Permisos y matriz de rutas | **123/123** pruebas de `test_access_policy.py`; rutas y clasificación coherentes. |
| Salud y reintento con sesiones persistidas reales | Sin token 401; ciudadano 403; auditor salud 200 y reintento 403; autoridad salud 200 y reintento 403; administrador salud/reintento 200. Desactivar al auditor invalida su acceso: 401. Sin sustituir `cargar_sujeto_vigente` en estas sondas. |
| Endpoint público mínimo, D-1 | Solo `estado` y `motivos`; sin agregados operativos, correos ni credenciales SMTP. Los números de umbrales fijos describen reglas, no conteos reales. Pruebas existentes y contraste independiente con sesión real. |
| Reintento correcto | Solo `fallido` agotado; limpia intentos, error y próximo intento. Actor y metadatos de auditoría persistidos; lectura desde conexión nueva. 404/409 cubiertos por la suite del implementador. |
| Atomicidad del reintento | Rollback real tras UPDATE/flush y fallo SQL del INSERT de auditoría; también fallo de commit, cancelación y `ValueError` inyectado después del flush. Estado original y cero auditorías desde otra conexión; sesión reutilizable. La sonda de validación es una excepción inyectada, no una afirmación de que se haya forzado un dato inválido por HTTP. |
| Reintento concurrente | Dos solicitudes: una confirma, otra obtiene 409; una sola auditoría. |
| Latido | CLI real con cola y con cola vacía; segunda transacción independiente. Ausencia real de la tabla durante la sonda no propaga el fallo; una entrega posterior continúa en modo simulado. |
| Idempotencia, D-2 | Diez sesiones concurrentes: un ganador y una fila. Dos ejecuciones reales del CLI: una fila; `--simular`: cero escrituras de resumen. |
| Migración 0094 | Cabeza única; dos ciclos 0094→0093→0094. Se conservó una fila anterior; se eliminaron resúmenes al bajar; tabla, CHECK e índice aparecen/desaparecen correctamente. El índice sigue siendo parcial y único por correo/radicado para `resumen_diario`. |
| XSS, correo vacío y huso | Suite del módulo aprobada en esos escenarios. El uso correcto de Bogotá no resuelve H275-03. |
| Métricas | Percentiles reales de filas enviadas: p50=20 s y p95=92 s para latencias 10/20/100; simulados excluidos y tasa 3/(3+1)=0,75. |
| Usuario inactivo, D-5 | Usuario con actividad, posteriormente dado de baja: no destinatario y cero filas de resumen para él. |
| Error SMTP | Una excepción con canario en su mensaje persiste únicamente `RuntimeError`; no el mensaje completo. |
| Unidades instaladas | Archivos de `/etc/systemd/system` byte a byte iguales a la entrega; timer `enabled/active/waiting`, calendario Bogotá; servicio oneshot `static`, último resultado 0; ejecutor continuo activo. `systemd-analyze verify` y `bash -n` terminan en 0. |

El permiso efectivo se comprueba en los routers. El reintento mantiene el lock hasta concluir su única transacción. El servicio de resumen compone el INSERT dentro de la transacción del CLI; el latido usa una sesión dedicada. No se añadieron funciones SQL privilegiadas en 0094. Archivos/compensaciones y motores IA: no aplica a las escrituras nuevas de este encargo.

## 5. Comandos, resultados y atribución

Las invocaciones completas, duración, variables de aislamiento no secretas, códigos de salida y logs están en `275_evidencia_eaf_codex/*.json` y `*.log`. El controlador [laboratorio.py](275_evidencia_eaf_codex/laboratorio.py) prepara el destino explícito y redacta credenciales de la salida.

| Verificación | Resultado |
| --- | --- |
| `bun run backend:check`, copia R2 | **Exit 1**. Ruff limpio; **576 archivos** con formato correcto; pytest **1.735 aprobadas / 8 fallidas / 16 omitidas**, en 666,46 s. Dos fallos son de preparación de fixtures del auditor, aclarados abajo. |
| Batería dirigida de diez archivos, sin reconstrucción concurrente | **273 aprobadas / 5 fallidas / 1 deseleccionada**; XML y log conservados. |
| `test_herald_salud_resumen.py` | Dirigido: **32 aprobadas**, una migración deseleccionada; global: **33/33**, incluida la migración. La reversibilidad y conservación se verificaron además por sondas independientes. |
| `test_access_policy.py` completo | **123 aprobadas**. |
| Guardas y suites de transacciones dirigidas | **27 aprobadas**: 1 política + 5 helper + 21 integración. |
| Sondas independientes nuevas, dos corridas | En cada corrida: **9 aprobadas / 3 fallidas**, estas últimas correspondientes a H275-02 y H275-03. No son pruebas silenciadas ni marcadas xfail. |
| Sondas adicionales | **3 aprobadas**: baja de cuenta, percentiles/tasa y error SMTP sin mensaje sensible. |
| Migraciones/CLI/worker reales del laboratorio | Comandos de upgrade/downgrade, dos resúmenes, simulación y dos ciclos del worker: salida 0; artefacto `ciclo_y_cli.json`. |
| `alembic check` en proceso CLI nuevo | **255**: drift preexistente de `actividades_anexos`, sus dos índices y metadata no cargada; no aparecen diferencias de los objetos nuevos de 275. No se ocultó el drift ni se cambió el filtro. |

### Fallos compartidos ajenos a 275

La batería dirigida reproduce cinco diferencias de contenido del trabajo paralelo 279/285: botón de verificación, cita de C-150, enlace anterior `/seguimiento?radicado=`, lema anterior y etiqueta del estado en mayúsculas. Las llamadas actuales a `plantillas_stack` y los cambios de enlace permiten atribuirlos al rediseño de plantillas, no al nuevo resumen o su transacción. **La batería compartida no está verde**, aunque la suite específica de 275 sí lo esté. Coordinación debe conciliar contenido, contrato y pruebas; no se modificaron para conseguir un resultado favorable.

`alembic check` independiente detecta la omisión del modelo de anexos en la metadata del proceso CLI. Una prueba que ya importó `app.main` puede tener el modelo cargado y pasar; ese resultado no sustituye la comprobación en un proceso nuevo. Es una deuda previa de Proyectos, ajena a 0094, que se registra sin normalizarla como éxito.

La suite global registra los mismos cinco fallos de plantillas y el fallo de agendas `test_vinculacion_agendas_con_mesas_canonicas_h05`, ya excluido como preexistente por la asignación: agendas concretas conservan `mesa_id=None`. Los otros dos fallos globales fueron del laboratorio: faltaba la captura de control referenciada en `bridge/213_candidato_ollamacodex_inventario/`. Se copió el original sin editar, con SHA `7dfb91e3942e4c52b05f5c04811ad338943efb5d20f6d8d3a66a771be8c02f38`, y se repitió el archivo de inventario completo: **39/39 aprobadas**. Esos dos fallos **no se imputan al producto**. No se volvió a ejecutar toda la suite después de esa copia y no se presenta un total global recompuesto como si fuera otra corrida.

Las 16 omisiones corresponden a la falta del insumo externo de Google Workspace y del corpus analítico PDD/PDL en la base vacía. No se cargó el corpus productivo para eliminarlas artificialmente; las pruebas del alcance Herald y de permisos sí se ejecutaron. El log global y las fixtures documentan los límites.

### Errores del laboratorio conservados

La primera colección omitió dos fixtures locales; una primera copia también omitió la migración 0094 no versionada. Se interrumpió la corrida incompleta, se corrigió exclusivamente la copia privada y se reconstruyeron las bases de la suite. La referencia de inventario omitida en R2 también quedó identificada y revalidada como se explica arriba. Los logs iniciales y [ajustes_laboratorio.json](275_evidencia_eaf_codex/ajustes_laboratorio.json) se conservan. Sus errores no se atribuyen a POLIS ni cuentan como evidencias de incumplimiento funcional. Los tokens sintéticos de las fixtures que pytest mostró en los tracebacks se redactaron en los logs preservados; no se trataba de tokens productivos.

## 6. Operación observada y límites

La lectura de systemd/journald acredita una ejecución **manual** del resumen el 2026-11-01 a las 20:39 UTC, con resultado 0 y un destinatario. El primer disparo automático está programado para **2026-11-02 12:00 UTC, 07:00 Colombia**, posterior a esta evaluación. No se lo declara ejecutado ni se adelanta el timer para obtener evidencia.

Esta auditoría no verifica entrega SMTP real ni consulta resultados productivos. La instalación/habilitación sí queda comprobada. El primer disparo automático y la entrega final deben adjuntarse por operación después de su hora; el rechazo actual se sustenta en defectos ya reproducidos, sin depender de ese evento futuro.

Los controles examinados no acreditan toda la plataforma, ausencia universal de defectos ni cumplimiento jurídico. No se evaluaron navegador ni frontend. Las pruebas de transporte y la medición anterior 277 no certifican recepción por el buzón final.

## 7. Condiciones de cierre y custodia

1. Freebuff/operación deben remediar **H275-01 a H275-04** y devolver una nueva revisión identificada por hashes, con las regresiones reproducidas aquí.
2. Coordinación debe cerrar o aceptar expresamente las diferencias compartidas de plantillas y el drift ajeno; este informe no los marca como corregidos.
3. Custodiar la evidencia y documentar el tratamiento de **H275-05**, sin volver a publicar valores secretos.
4. Operación adjuntará el primer disparo automático cuando ocurra. No se requiere ejecutar tareas productivas para reproducir las correcciones funcionales en el laboratorio.
5. EAF deberá reinspeccionar la nueva entrega. **RECHAZADO** corresponde a un alcance bloqueado según la tabla general EAF; no autoriza merge, despliegue, reescritura del historial ni comunicación por correo.

**Limpieza verificada:** a las **04:01:36 UTC del 2026-11-02** se eliminaron las tres bases y el rol temporal. La consulta de comprobación no encontró ninguno; se eliminó también el archivo privado de credencial. Evidencia: [limpieza.json](275_evidencia_eaf_codex/limpieza.json).

**Integridad:** se contrastaron **857 archivos** de código/configuración/documentación con la copia fijada y con el árbol original: **cero diferencias** durante la auditoría. El control final de la evidencia exportable no encontró secretos actuales ni la credencial del laboratorio. Se conserva una copia de los archivos del alcance en `codigo_auditado_275.tar.gz`; hashes del informe y de los artefactos en [manifest_sha256.json](275_evidencia_eaf_codex/manifest_sha256.json). Los recursos auxiliares privados no se incluyen en ese manifiesto.

No se realizaron cambios de aplicación ni de frontend. No se hizo commit ni push.
