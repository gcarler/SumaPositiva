# Evidencia independiente EAF 275

Dictamen: `../275_dictamen_eaf_independiente_codex.md`. Base Git solicitada:
`4b45b104acc9d2a16a51bc80bd1ab7d328c56d58` más archivos locales fijados.

## Lectura rápida

- `snapshot_v2.json`: código efectivamente evaluado y hashes; `snapshot.json`
  es la captura inicial incompleta, conservada junto a las erratas del laboratorio.
- `cierre.json`: 857 archivos contrastados, sin cambios del original ni de la copia.
- `sondas_r1.xml` / `sondas_r2.xml`: dos corridas, cada una con nueve aprobaciones
  y tres fallos que reproducen los defectos de antigüedad y ventana del resumen.
- `remediaciones.xml`: tres pruebas adicionales aprobadas.
- `monitor_r1.json`: once escenarios de watchdog con recursos sustituidos.
  El exit 0 de su arnés significa que ejecutó los escenarios; no significa que
  el comportamiento del producto cumpla. `monitor.json` conserva la primera corrida.
- `ciclo_y_cli.json`: migraciones con datos conservados, cabeza única,
  idempotencia del CLI, simulación, entrega simulada y latido vacío.
- `bateria_dirigida.xml`: 273 aprobadas, cinco fallos de contenido paralelo;
  la migración se deseleccionó para no reconstruir la base usada por otra suite.
- `backend-check-r2.log`: comprobación oficial completa, con su resultado rojo
  conservado. Dos fallos de fixtures de inventario se resolvieron en una corrida
  posterior de su archivo: `inventario.xml`, 39 aprobadas. No hay total recompuesto.
- `secretos.json`: coincidencias por clase y ubicación; no incluye valores secretos.
- `infraestructura.json`: lecturas de systemd y journal clasificado sin destinatarios.
- `limpieza.json`: tres bases, rol y archivo privado de credencial eliminados.
- `codigo_auditado_275.tar.gz`: archivos del alcance y assets importados, sin `.env`.
- `manifest_sha256.json`: sello del informe y artefactos exportables.

## Reproducción

Los scripts se ejecutaron desde `/root/polis`. `fijar_snapshot.py` construye una
copia privada del commit más la superposición local; no sobrescribe una ya
existente. Para repetir el estado auditado tras una remediación, usar el archivo
de código y los hashes **en otra copia aislada**, sin restaurarlos sobre la app viva.

`laboratorio.py setup` provisiona bases exclusivas y un rol temporal; rechaza
colisiones. `setup-probes` añade la base separada de sondas. `run` y `run-probes`
establecen las variables del destino correspondiente, SMTP vacío y el
`PYTHONPATH` de la copia. Las invocaciones exactas están en los JSON de cada corrida.
La copia usa el entorno Python existente, sin sincronizar dependencias.

Los tests de la plataforma requieren las fixtures locales identificadas por los
manifiestos `fixtures_*.json` y `fixture_cartografia.json`; comprobar cada SHA antes
de copiarlas. La suite completa también necesitó el banco local y sus referencias
de inventario. Sus copias voluminosas se retiraron al cerrar, conservando hashes
y rutas originales. Los tests nuevos de sondas no necesitan ese corpus.

Secuencia del laboratorio: crear copia y bases, migrar a head, ejecutar sondas,
ciclo/CLI, batería y comprobación oficial, capturar hashes/higiene y ejecutar
`laboratorio.py cleanup`. El cierre comprueba la propiedad de las bases antes
de borrarlas. No hay fallback a producción.

El watchdog se ejecutó **solo** mediante `probar_monitor.py`: sustituye rutas
de estado/log y comandos de red, base, systemd y reloj. El estado 2033 de los
escenarios es un reloj sintético; las fechas UTC reales constan en los registros
de ejecución. `infraestructura.py` solo lee unidades y journal; no las dispara.

Los recursos privados bajo `.runtime/` y caches no forman parte del sello. La
credencial del laboratorio ya no existe. Los tokens sintéticos que pytest mostró
en dos logs se redactaron; `redaccion_tokens_fixture.json` identifica esos archivos.
No se hicieron commits, push ni cambios de aplicación o frontend.
