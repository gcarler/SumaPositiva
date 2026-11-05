## 8. Re-inspección independiente del 2026-11-03 — dictamen vigente

**Estado final: RECHAZADO.** Se cierran H275-02, H275-03, H275-04 y la redacción documental de H275-05. **H275-01 queda parcialmente remediado y abierto**: persiste el registro de despachos no confirmados y hay efectos de escritura en modos declarados de lectura. La corrección del falso estado saludable reduce el riesgo original; los defectos residuales del despacho se califican **Media**, y siguen incumpliendo un criterio obligatorio del encargo.

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

**Conclusión vigente:** hay progreso comprobado y cuatro cierres; no se acredita remediación completa de los cinco puntos ni procede emitir `APROBADO`. Se requiere una nueva corrección concreta de **H275-01**, su evidencia y re-inspección. Esta evaluación no autoriza despliegue, commit, push ni reescritura del historial. Codex no modificó aplicación, frontend, configuración productiva ni servicios.
