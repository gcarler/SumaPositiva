# Dictamen EAF independiente — Encargo 275, POLIS Herald

**Dictamen vigente — cierre independiente del 2026-11-03: APROBADO.** Se cierran H275-01 a H275-05 en el alcance declarado, incluidos R1.1, R1.2 y R1.3. Verificación nueva: 12/12 pruebas dos veces y 4/4 comprobaciones HTTP adicionales. [Detalle vigente en la sección 9](#9-verificación-final-independiente-del-2026-11-03--dictamen-vigente).

**Evaluador independiente:** Codex (`codex:0.0`). **Entrega inicial:** Freebuff; **remediación presentada por:** Coordinación Antigravity. **Evaluación inicial:** 2026-11-02. **Re-inspección:** 2026-11-03, UTC.

> **Antecedentes históricos:** las secciones 1–7 conservan la evaluación del 2 de noviembre y la sección 8 documenta la primera re-inspección, todavía rechazada. **La sección 9 contiene el cierre vigente APROBADO.** Ambos dictámenes anteriores se custodian íntegros con sus hashes originales.

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

---

## 8. Primera re-inspección independiente del 2026-11-03 — evaluación histórica

**Estado de esta re-inspección histórica: RECHAZADO.** Se cierran H275-02, H275-03, H275-04 y la redacción documental de H275-05. **H275-01 queda parcialmente remediado y abierto**: persiste el registro de despachos no confirmados y hay efectos de escritura en modos declarados de lectura. La corrección del falso estado saludable reduce el riesgo original; los defectos residuales del despacho se califican **Media**, y siguen incumpliendo un criterio obligatorio del encargo.

### 8.1. Identificación, independencia y aislamiento

La remediación fue presentada por coordinación en `bridge/275_remediacion_codex_eaf_herald.md`. Codex reevalúa sin haber implementado esas correcciones. Se leyó también el apéndice actualizado de `275_auditoria_eaf_herald_salud_resumen.md` y se aplicó de nuevo `polis-eaf-transactions`. Las reglas de transacciones, arquitectura, identidad y permisos mantienen los mismos hashes de la primera evaluación.

Se evaluó **HEAD `64e818f8444083b1f7589e7edaae020765b96068` más la superposición local fijada el 2026-11-03**. La referencia Git anterior `4b45b10` se conserva como base de comparación, no como si incluyera por sí sola estos cambios. [snapshot.json](275_reinspeccion_eaf_codex_20261103/snapshot.json) identifica 857 archivos; [cambios_entrega.json](275_reinspeccion_eaf_codex_20261103/cambios_entrega.json) registra los **seis archivos diferentes** respecto de la entrega inicialmente auditada: `salud.py`, `resumen_cli.py`, su archivo de pruebas, el monitor y los dos documentos de higiene.

Nueva copia privada sin `.env`, SMTP vacío y destinos explícitos del puerto **5433**:

- `polis_test_eaf_275_r2_20261103` para la suite.
- `polis_test_eaf_275_r2_20261103_mig` para reconstrucciones de esa suite.
- `polis_test_eaf_275_r2_20261103_probes` para las sondas independientes.

Las bases se crearon vacías, con rol y credencial temporales. No se consultó ni modificó `bd_csh`; no se usó Postfix real ni se reiniciaron servicios. Los stubs del watchdog sustituyen psql, systemd y las consultas de salud. Las dos pruebas HTTP usan únicamente un servidor efímero ligado a **127.0.0.1**, con `curl` real para comprobar su interpretación del estado HTTP; no contactan proveedores externos.

### 8.2. Resultado de los cinco hallazgos

| Hallazgo | Estado actual | Evidencia independiente |
| --- | --- | --- |
| **H275-01** | **PARCIAL / ABIERTO** | El estado global sigue degradado durante el cooldown; el fallo de transporte no sella; la ventana de 7.200 s, la recuperación por cron y las alertas de otros servicios funcionan. Pero siguen fallando cuatro pruebas en tres situaciones, detalladas abajo. |
| **H275-02** | **CERRADO** | Dos pendientes de 31 minutos y dos segundos: antigüedad **1.860,16 s**, estado `degradado` y motivo correspondiente. Ahora usa `MAX` de las edades. |
| **H275-03** | **CERRADO** | Las dos regresiones iniciales pasan: incluye ayer a las 15:00 y hoy a las 06:00; la acción posterior a las 07:00 aparece en el resumen siguiente. Cinco pruebas adicionales verifican continuidad de 24 h, cambio de año/mes y año bisiesto, y asignación única de eventos en las fronteras. |
| **H275-04** | **CERRADO** | Cuerpo vacío y cuerpo malformado producen JSON válido, `estado=ALERT`, Herald `no disponible`, exit 1 y ningún sello. No reaparece la variable sin inicializar. |
| **H275-05** | **CERRADO en los documentos corrientes** | Ninguna coincidencia de la credencial anterior en los dos documentos saneados ni en el conjunto actual de 857 archivos inspeccionados. El historial conserva 131 blobs con el valor anterior, declarado rotado; esta auditoría no lo reescribe ni certifica ausencia absoluta de credenciales en toda la historia. |

Las **15 sondas anteriores pasan**, incluidas las tres que fallaron en la primera evaluación. También pasan las **cinco pruebas nuevas de corte**. En el contraste SQL de fronteras, cinco acciones distribuidas entre tres días aparecen cada una exactamente una vez, incluso las ocurridas justo a las 07:00 y un microsegundo antes/después. Se conservan la unicidad del resumen y el comprobante inmediato.

Evidencia: [sondas.xml](275_reinspeccion_eaf_codex_20261103/sondas.xml), [corte.xml](275_reinspeccion_eaf_codex_20261103/corte.xml) y [sondas.jsonl](275_reinspeccion_eaf_codex_20261103/sondas.jsonl).

### 8.3. H275-01: defectos residuales reproducidos

#### R1.1 · Media · HTTP 503 se registra como despacho exitoso

**Ubicación:** `scripts/monitor_sistema_polis.sh:81` y `:96`, resultado de la función en `:114`, sello en `:306`–`:309`.

**Escenario:** servidor HTTP local real que responde **503** al primer POST y está preparado para responder 200 al siguiente. El watchdog mantiene sus argumentos reales de `curl`, sustituyendo solo rutas y dependencias de infraestructura.

**Esperado:** el primer fallo HTTP no confirma despacho ni escribe el sello; el cron siguiente vuelve a intentar el canal.

**Observado:** `curl` termina con 0 pese al HTTP 503; la función marca `enviada=true`, registra éxito y escribe el sello. Sesenta segundos después, el cron no vuelve a intentar: **un solo POST recibido en total**. No llega a ejecutarse la segunda respuesta prevista. El estado global sí permanece degradado, corrección que se reconoce.

**Consecuencia:** un rechazo real del servidor de alertas suprime el reintento hasta vencer el cooldown. Sigue sin cumplirse la persistencia condicionada a un despacho exitoso.

**Prueba:** `test_http_503_real_no_es_despacho_exitoso`; su control `test_http_200_real_se_sella_una_vez` pasa. La comparación usa el cliente HTTP real, no un stub que confunda por construcción éxito de transporte con éxito HTTP.

#### R1.2 · Media · Sin ningún canal, también se escribe un sello de éxito

**Ubicación:** `scripts/monitor_sistema_polis.sh:75`–`:114` y `:306`–`:309`.

Sin webhook ni Telegram, `enviada=false` e `intento_fallido=false`: la función retorna **0**, aunque no hubo ningún despacho. El cron escribe el sello. En la segunda ejecución se configura un canal y transcurren 60 segundos; **sigue sin despachar**, porque la ventana ya fue consumida.

**Esperado:** la ausencia de canal no se equipara a entrega; ningún sello hasta que algún canal confirme el despacho.

**Consecuencia:** la primera alerta efectiva queda suprimida aun después de configurar el canal.

**Prueba:** `test_sin_canales_no_hay_despacho_confirmado_ni_sello`.

#### R1.3 · Baja · Los diagnósticos de recuperación borran estado

**Ubicación:** `scripts/monitor_sistema_polis.sh:206`–`:209`.

Con sello existente y Herald saludable, tanto `--check` como `--json` lo eliminan. La rama de recuperación no distingue el modo. Esto contradice la declaración de diagnósticos estrictamente de lectura de la remediación. La limpieza hecha por **cron** sí pasa y debe conservarse.

**Pruebas:** las dos variantes de `test_diagnostico_de_recuperacion_sigue_siendo_solo_lectura`.

**Cierre requerido de H275-01:** verificar el éxito HTTP del canal; retornar éxito únicamente si alguno confirmó despacho; limitar toda creación, modificación y eliminación del sello al modo que gestiona notificaciones. Conservar el estado global degradado y la independencia de las otras alertas, que ya funcionan. Repetir el arnés de 12 casos sin rebajar sus expectativas ni ocultar los cuatro fallos.

**Evidencia:** [monitor_r2.xml](275_reinspeccion_eaf_codex_20261103/monitor_r2.xml), [monitor_casos.jsonl](275_reinspeccion_eaf_codex_20261103/monitor_casos.jsonl), [test_monitor_reinspeccion.py](275_reinspeccion_eaf_codex_20261103/test_monitor_reinspeccion.py). Dos corridas: **8 aprobadas / 4 fallidas** en cada una. La segunda amplía las secuencias de configuración y recuperación HTTP; no modifica el código del producto.

### 8.4. Regresión, transacciones y migraciones

| Verificación ejecutada en esta re-inspección | Resultado |
| --- | --- |
| Sondas independientes anteriores | **15 aprobadas / 0 fallidas**. Revalidadas las sesiones reales, la revocación, el actor, la carrera de reintento, rollback desde otra conexión por fallo de auditoría, commit, cancelación y excepción tras flush; idempotencia de diez sesiones y fallo real del latido. |
| Fronteras y continuidad del corte | **5 aprobadas / 0 fallidas**. |
| Watchdog, dos corridas | **8 aprobadas / 4 fallidas** por corrida, todas las fallidas dentro de H275-01. |
| Batería dirigida de diez archivos | **273 aprobadas / 5 fallidas / 1 deseleccionada**. La reconstrucción se separó para no interferir con la suite global. |
| Matriz de acceso completa | **123 aprobadas**, incluidas todas sus variantes; no se confirma como suficiente la corrida previa sin BD con una omisión. |
| Suite de salud/resumen dirigida | **32 aprobadas**; su reconstrucción se verifica por separado y en la suite global. |
| Política y suites transaccionales dirigidas | **27 aprobadas**. |
| Migración/CLI/worker reales | Cabeza única; dos ciclos 0094→0093→0094 con conservación de la fila anterior; simulación sin encolar; dos invocaciones reales sobre corte histórico terminado producen una sola fila; entrega simulada y latido con cola vacía. |
| `alembic check` en un proceso CLI nuevo | **255**, mismo drift anterior de `actividades_anexos` y sus dos índices; sin diferencias nuevas del alcance. No se cambió el filtro ni se ocultó. |
| `bun run backend:check` completo | **Exit 1**. Ruff limpio y formato conforme en **576 archivos**; pytest **1.737 aprobadas / 6 fallidas / 16 omitidas**, 817,94 s; la suite específica de Herald pasa **33/33**, incluida su reconstrucción |

Los cinco fallos dirigidos son los mismos de contenido/enlace de plantillas 279/285 ya documentados; no se cambiaron aserciones ni plantillas para sanear la auditoría. La suite global reproduce esos cinco fallos y la agenda preexistente `test_vinculacion_agendas_con_mesas_canonicas_h05`; el archivo completo de inventario pasa en esta ejecución, sin los problemas de copia del laboratorio anterior. Las omisiones de corpus y del guion externo no se convierten en acreditación de ese contenido. El dictamen sobre H275-01 se sustenta en sus reproducciones independientes, sin atribuirle defectos ajenos.

Las invocaciones exactas, tiempos y códigos de salida constan en los JSON de cada corrida; los XML dan el detalle por caso. Se utilizó el entorno Python existente, sin sincronizar dependencias, con las mismas versiones de la primera evaluación y variables de laboratorio explícitas.

### 8.5. Primer disparo automático: pendiente operacional actualizado

**Confirmado independientemente por lectura de systemd y journald:** timer habilitado y activo; `LastTriggerUSec=2026-11-02 12:00:01 UTC`; oneshot iniciado a esa hora, concluido a las 12:00:11 UTC con `Result=success` y `ExecMainStatus=0`; journal del 2 de noviembre informa **un destinatario encolado**. Los archivos instalados mantienen los mismos hashes que la entrega. Evidencia: [infraestructura.json](275_reinspeccion_eaf_codex_20261103/infraestructura.json).

El apéndice del implementador, completado el 2026-11-03, aporta adicionalmente una fila `enviado`, cero duplicados y **8,6 s** de latencia. Esos datos se identifican como evidencia del operador: **no se repitió su consulta a `bd_csh`**, ni se presenta recepción del buzón final como comprobación independiente de Codex.

Queda atendido el pendiente de acreditar que el timer realmente disparó. La ejecución fue anterior a las correcciones de esta re-inspección y acredita la operación de las unidades, sin sustituir las pruebas del nuevo corte. La siguiente ejecución ordinaria no se adelantó ni se exigió para cerrar esta evaluación.

### 8.6. Higiene, custodia y conclusión

El barrido de secretos conocidos examina 857 archivos actuales y 5.009 blobs Git alcanzables. **Cero coincidencias en el conjunto actual** de código/documentación; en Git permanecen 131 blobs con la credencial anterior declarada rotada. Sin coincidencias de secretos actuales ni DSNs con contraseña en los journals examinados. `.env` mantiene 0600. El valor anterior no se reproduce en esta evidencia nueva. La revocación productiva no se vuelve a ensayar, por el aislamiento exigido.

La versión original del dictamen, SHA-256 **`f12facbcdde8e2c989cc581aaa337096a7da16354439a95f7f3aa80b9658bcd4`**, se conserva sin cambios en [dictamen_20261102_original.md](275_reinspeccion_eaf_codex_20261103/dictamen_20261102_original.md). La evidencia y el sello iniciales permanecen intactos; ese hash histórico se verifica con la copia custodiada, puesto que el documento principal ahora incorpora la re-inspección. La nueva evidencia se sella separadamente.

**Cierre verificado:** a las **2026-11-03T10:31:56.051044+00:00** se eliminaron las tres bases temporales, el rol `polis_eaf275_r2_20261103` y el archivo privado de credencial. La consulta final no encontró residuos. [limpieza.json](275_reinspeccion_eaf_codex_20261103/limpieza.json) lo acredita. El contraste final de los 857 archivos fijados no encontró cambios ni en el código original ni en la copia ejecutada; [cierre.json](275_reinspeccion_eaf_codex_20261103/cierre.json). Hashes del informe, del código auditado y de los artefactos en [manifest_sha256.json](275_reinspeccion_eaf_codex_20261103/manifest_sha256.json).

**Conclusión histórica de la primera re-inspección:** hay progreso comprobado y cuatro cierres; no se acredita remediación completa de los cinco puntos ni procede emitir `APROBADO`. Se requiere una nueva corrección concreta de **H275-01**, su evidencia y re-inspección. Esta evaluación no autoriza despliegue, commit, push ni reescritura del historial. Codex no modificó aplicación, frontend, configuración productiva ni servicios.

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
