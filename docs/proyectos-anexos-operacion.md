# Operación de anexos de actividades

## Subida

El servicio lee `UploadFile` en bloques de 1 MiB, escribe como máximo 25 MiB y
calcula SHA-256 incrementalmente. El archivo multipart ya fue recibido por el
parser HTTP: este límite acota la lectura del servicio y no sustituye los
límites de cuerpo del proxy ni del parser.

Cada fichero se crea de forma exclusiva. La transmisión elimina su propio
fragmento ante error o cancelación; el servicio compensa el fichero terminado
si falla la validación, persistencia o confirmación de la transacción. Un fallo
de apertura por nombre existente conserva el fichero anterior.

La base confirma el caso de uso mediante `app.core.transactions.transaction`.
La compensación no cubre una caída abrupta del proceso; los residuos antiguos
se pueden identificar con el comando siguiente.

## Previsualización de limpieza

Desde la raíz, con `POLIS_DATABASE_URL` del entorno operativo configurada de
forma segura y `POLIS_TEST_DATABASE_URL` ausente:

```bash
PYTHONPATH=backend backend/.venv/bin/python -m scripts.limpiar_anexos_eliminados --produccion
```

El resultado JSON distingue candidatos, ficheros eliminados y errores. El modo
predeterminado es `previsualizacion`: solo consulta la base y el directorio.

La retención mínima es de 30 días desde `eliminado_en`. La opción
`--incluidos-huerfanos` incluye ficheros sin referencia cuyo tiempo de última
modificación también supera esa retención y cuyo nombre sigue el formato UUID
generado por la subida. Los ficheros recientes, enlaces
simbólicos y nombres con referencia activa se conservan. Las rutas de filas
deben coincidir con el nombre seguro dentro del volumen de anexos.

## Eliminación bajo demanda

Tras revisar el manifiesto y la retención aplicable, la opción `--aplicar`
ejecuta la eliminación física. El respaldo de PostgreSQL conserva las filas,
pero no contiene los documentos: conservar además un respaldo del volumen de
anexos antes de ejecutar una purga. Los registros del borrado lógico permanecen
en la base.

```bash
PYTHONPATH=backend backend/.venv/bin/python -m scripts.limpiar_anexos_eliminados --produccion --aplicar
```

El comando devuelve 1 si el manifiesto contiene errores. Conservar sus
manifiestos en un directorio privado y permisos 0600. La entrega proporciona el
comando para uso bajo demanda; la programación periódica requiere configurar
su entorno y retención en la operación del servicio.

## Aislamiento de ensayos

Con `POLIS_TEST_DATABASE_URL` explícita sobre una base `polis_test*`, es
obligatorio indicar `--directorio` con una carpeta aislada existente. Se rechaza
un directorio que contenga el volumen operativo o esté dentro de él. Los modos
de pruebas y `--produccion` son excluyentes.

La consulta del manifiesto usa una transacción `READ ONLY` y
`REPEATABLE READ`. El comando no modifica tablas ni instala migraciones.
