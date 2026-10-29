# OL-FUENTES-04-R1 · Corrección dirigida del adaptador catalogo↔planificador

Estado: `correccion_dirigida_pendiente_revision`.
No dictamen EAF. Sin SQL, red, descarga, promoción al banco ni ingestión.

## Archivos

- `backend/app/modules/compromisos/adaptador_catalogo_fuentes_polis.py`
- `backend/scripts/planificar_fuentes_politica.py`
- `backend/tests/test_adaptador_catalogo_fuentes_polis.py`

110 se conserva como historial.

## Correcciones

1. Registro cerrado real: el subcomando nuevo siempre valida contra `registro_descargas()`; el archivo opcional solo selecciona/restringe, no aumenta ni contradice el registro. Candidatos no registrados y discrepancia de adaptador fallan antes de publicar.
2. Candidatura preservada y tipada en contexto, con evidencia y procedencia explícitas.
3. Lectura acotada real para catálogo/candidatos/registro, JSON estricto con claves únicas y sin `NaN/Infinity`/float binario.
4. Validación textual de id/nombre/clase y listas exactas de textos/años; contexto conserva el documento 63 completo y los números JSON como `Decimal`.
5. Restricción a `bridge/` aplicada solo al subcomando nuevo; `catalogar`/`planificar` mantienen escritura exclusiva sin sobrescritura y sin limitación nueva a `bridge/`.
6. Test CLI con carpeta única bajo `bridge/116_validacion_adaptador_r1/`, flujo real `catalogar-clasificado` + `planificar`, candidato explícito registrado, resultado `programar_adquisicion_y_validacion` sin ejecutar adquisición.

## Validaciones registradas

- Ruff check: passed
- Ruff format --check: passed
- `pytest --noconftest -q backend/tests/test_adaptador_catalogo_fuentes_polis.py -q`
  - 1a corrida: 15 passed / 0 failed
  - 2a corrida: 15 passed / 0 failed

## Hashes

- `adaptador_catalogo_fuentes_polis.py`: `a5e5f69200874c0e1abe11808f869d7f7fb32a727482ea5b2fe3775369fbab1e`
- `planificar_fuentes_politica.py`: `c26e9db460fa1c4386c89f24564fe7feb6bfa8419b1500891906b4344903f3c0`
- `test_adaptador_catalogo_fuentes_polis.py`: `e3720d59f26970fb4029b187d933c6b76cefb1341bfe58bcf1b5e8a280570000`

## Limites

- Sin dictamen EAF, sin implementación definitiva en producción.
- Sin cambios en parser, conciliador, catálogo 65/70, registro, planificador base, adquisición, datos, dependencias ni configuración.
- Sin SQL, red, descarga, ingestión, commit, push ni despliegue.
