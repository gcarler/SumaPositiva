# Re-inspección EAF 275 — 2026-11-03

Dictamen vigente: `../275_dictamen_eaf_independiente_codex.md`, sección 8.
Resultado: **RECHAZADO**; H275-02 a H275-05 cerrados en su alcance documentado;
H275-01 parcialmente corregido, con defectos residuales de despacho y lectura.

## Evidencia principal

- `snapshot.json` y `cambios_entrega.json`: revisión efectiva y seis archivos
  diferentes respecto de la primera auditoría; se fijaron 857 hashes.
- `sondas.xml`: las 15 pruebas independientes anteriores ahora pasan.
- `corte.xml`: cinco pruebas nuevas de continuidad y asignación única de eventos.
- `monitor.xml` / `monitor_r2.xml`: dos corridas del watchdog, cada una con
  ocho aprobaciones y cuatro fallos. `monitor_casos.jsonl` conserva las llamadas.
  El HTTP 503 se sirve realmente en loopback; no es un código simulado de curl.
  La segunda corrida prueba además el canal configurado tras una primera ejecución
  sin canal y el servidor preparado para recuperarse después del HTTP 503.
- `ciclo_y_cli.json`: conservación de datos, ciclos de migración, CLI real
  idempotente, simulación sin encolar y latido con cola vacía.
- `bateria.xml`: 273 aprobadas y cinco fallos compartidos de contenido de plantillas.
- `backend-check.log`: comprobación oficial completa; 1.737 aprobadas,
  seis fallidas, 16 omitidas; Ruff y formato pasan en 576 archivos. No está verde.
- `secretos.json`: cero coincidencias conocidas en los archivos actuales; se
  distingue explícitamente la presencia de la credencial anterior en Git histórico.
- `infraestructura.json`: systemd/journal acreditan el primer disparo automático;
  la consulta de entrega en producción procede del apéndice del operador.
- `limpieza.json`: tres bases y rol temporales eliminados, sin residuos.
- `cierre.json`: verificación de hashes y de higiene antes de cerrar el laboratorio.
- `codigo_auditado_reinspeccion.tar.gz`: código del alcance y documentos saneados.
- `manifest_sha256.json`: sello de los artefactos exportables y del dictamen actualizado.

## Custodia y reproducción

Los scripts del laboratorio son copias identificables de los usados en la primera
auditoría, adaptadas a nombres temporales nuevos y al corte histórico ya concluido.
`fijar_snapshot.py` copia el commit base más la superposición de trabajo sin `.env`.
`laboratorio.py` rechaza colisiones y fija destinos en 5433, SMTP vacío y variables
de prueba explícitas; `cleanup` comprueba la marca de propiedad antes de eliminar.

Las invocaciones exactas están en los JSON de ejecución. La reconstrucción de
la suite usa una base distinta; las sondas tienen otra. El watchdog se ensaya
únicamente mediante `test_monitor_reinspeccion.py`, con archivos de estado privados
y sustitutos de systemd, psql, consultas de salud y reloj. La red real se limita
al receptor HTTP efímero 127.0.0.1 de las dos pruebas que lo requieren.

Para repetir el estado auditado tras nuevas correcciones, usar los bytes fijados
en otra copia aislada. No restaurarlos sobre la aplicación activa. `fixtures.json`
identifica los datos locales; las copias voluminosas se retiraron al cerrar,
manteniendo sus originales intactos. Los recursos privados y caches se excluyen
del sello. La credencial temporal se eliminó.

`dictamen_20261102_original.md` conserva exactamente el SHA inicial. El sello
anterior permanece intacto; su entrada del informe se resuelve con esa copia
histórica, pues la ruta principal ahora contiene la re-inspección. `reinspeccion.md`
es el fragmento incorporado como sección 8 y sus enlaces se interpretan desde el
documento principal. No se modificaron código de aplicación, frontend ni servicios;
sin commit ni push.
