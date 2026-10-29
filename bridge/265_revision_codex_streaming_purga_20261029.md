# Integración 265: streaming y limpieza de anexos

Fecha: 2026-10-29. Origen: entrega de Freebuff en
`bridge/evidencia_arreglo_265_integracion_20261029/streaming_y_limpieza.json`.

## Cambios revisados e incorporados

- Subida mediante bloques de 1 MiB, máximo escrito de 25 MiB y SHA-256
  incremental, conservando el límite transaccional del servicio.
- Compensación de fragmentos ante fallo o cancelación de la transmisión.
  El servicio compensa el fichero terminado si falla después la transacción.
- Comando de limpieza de ficheros retirados, con manifiesto JSON, retención
  mínima de 30 días y previsualización predeterminada.
- Guía de operación en `docs/proyectos-anexos-operacion.md`.
- Directorio temporal explícito en la fixture del ciclo HTTP de anexos para
  que sus futuras ejecuciones con una base de pruebas también aíslen ficheros.

## Hallazgos corregidos durante la integración

| Hallazgo | Consecuencia de la versión recibida | Corrección |
| --- | --- | --- |
| Ensayo con directorio operativo predeterminado | Una base `polis_test*` podía consultar sus propias filas y eliminar ficheros del volumen real como huérfanos. | Directorio explícito obligatorio para ensayos; rechazo de cualquier solapamiento con el volumen operativo; destinos de pruebas y producción excluyentes. |
| Huérfanos sin antigüedad | Un fichero de una subida todavía sin commit podía considerarse huérfano y eliminarse. | Exigir también 30 días mínimos desde su modificación y un nombre UUID generado por el servicio. |
| Purga inmediata por defecto | La ejecución ordinaria eliminaba físicamente los candidatos. | Previsualización predeterminada; `--aplicar` explícito para borrar. |
| Compensación tras apertura exclusiva fallida | Si `open("xb")` encontraba un fichero existente, el manejador exterior podía eliminarlo. | La transmisión elimina únicamente el fichero que creó; el servicio registra su propiedad después de terminar la transmisión. |
| Ruta y referencia activa | Una ruta alterada dentro del volumen podía señalar un fichero distinto o todavía activo. | Coincidencia de ruta con nombre seguro, rechazo de enlaces simbólicos y protección de nombres con referencia activa. |

El manifiesto consulta PostgreSQL mediante `READ ONLY` y `REPEATABLE READ`.
La guarda de destino rechaza igualmente una base `polis_test*` pasada por la
variable operativa con `--produccion`.
La API y sus permisos permanecen sin cambios; la cabeza Alembic es
`0090_anexos_actividades`. La entrega no instala un cron ni ejecuta una purga
física sobre el volumen operativo.

## Comprobaciones realizadas por Codex

- `ruff check backend`: correcto.
- `ruff format --check backend`: 561 archivos conformes.
- `alembic heads`: cabeza única `0090_anexos_actividades`.
- Ayuda del CLI: correcta; presenta `--directorio`, `--produccion` y `--aplicar`.
- Previsualización operativa del CLI: código 0, cero candidatos, cero ficheros
  eliminados y cero errores. Manifiesto privado conservado en el directorio de
  operación de esta integración.
- Sin cambios de frontend; se conserva el artefacto Next desplegado.

## Evidencia de pruebas y límites

Freebuff reportó 1.153 pruebas aprobadas y 524 omitidas en su check general,
y 32 aprobadas en su corrida dirigida sobre `polis_test_txn_20261029`.
Los archivos originales de evidencia se conservan íntegros en el directorio
de entrega. El diff original se versiona como `cambios.patch.gz`, que conserva
exactamente los bytes de contexto del parche; su SHA-256 está en `revision_codex.json`. Son evidencia del implementador para su snapshot anterior a las
guardas añadidas durante esta integración.

Se adaptaron los ocho casos aportados al parámetro de aplicación explícita y
a la antigüedad del huérfano de su fixture. Codex no ejecutó nuevas suites de
pruebas en esta revisión. Las guardas nuevas no tienen una corrida funcional
independiente acreditada por este informe. La revisión y los cambios propios
son una entrega de EDD; este documento no es un dictamen EAF independiente.

La lectura por bloques comienza después del parser multipart de HTTP: no
acredita rechazo de una carga excesiva antes de recibir su cuerpo. La
compensación tampoco cubre una caída abrupta entre la escritura y el commit.
El comando permite identificar residuos antiguos de ese tipo.

Los respaldos de PostgreSQL no contienen el volumen de documentos. La
operación de purga física requiere conservar además ese volumen y revisar
la retención aplicable, como detalla la guía de operación.

## Actualización operativa posterior: OPS-PURGA-01

Después de la revisión inicial, Freebuff añadió un wrapper y programó una
corrida semanal en el crontab de operación (`30 3 * * 0`). Se observó esa
entrada mediante lectura del cron; Codex no creó ni modificó la programación.

Se integra `scripts/purga_programada_anexos.sh`, reforzado con respaldo del
volumen completo, SHA-256 y lectura del catálogo antes de `--aplicar`, cerrojo
de concurrencia, permisos privados y uso directo del intérprete instalado.
El wrapper recibido no contenía ese respaldo pese a describirlo en la guía.
Codex comprobó su sintaxis con `bash -n`; no ejecutó la purga física ni el
wrapper durante esta revisión. Las cifras de la primera corrida son las
reportadas por Freebuff en la guía de operación.
