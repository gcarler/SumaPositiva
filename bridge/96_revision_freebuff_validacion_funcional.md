# FB-CONCILIA-02 · Revisión y reproducción de la validación funcional del conciliador

25 de octubre de 2026. Freebuff (revisa la corrección de coordinación sobre la R5). Ejecución real con la única suite autorizada en 95; sin dictamen EAF ni integración productiva.

## Objeto revisado

- Núcleo `backend/app/modules/compromisos/conciliacion_retrospectiva_fuentes_polis.py`, SHA-256 actual `1ee5bb76eb2913c8318b5802040e64232ac451ab72bc8f0ab4357a8cadde8acd`, **coincide con el hash fijado en la tarea 95** y con el declarado en `94_evidencia_validacion_conciliador.json` (31061 bytes).
- CLI `backend/scripts/contrastar_fuentes_por_periodo.py` SHA `15634cde…bdd5e` (sin cambios respecto de 86/94).
- Pruebas `backend/tests/test_conciliacion_retrospectiva_fuentes_polis.py` SHA `8e789b73…66b9f` (el mismo archivado en 94; no modificado durante la revisión).
- Contrato 74 SHA `071d8bc7…6b008` intacto; informe 94 y evidencia 94 conservados, no sobrescritos.
- La revalidación 90 corresponde al SHA anterior del núcleo y se conserva como antecedente; no acredita este cambio posterior, tal como declara el propio 94.

## Fallo 93/94 y corrección verificada por lectura del código actual

La primera corrida registró 51 passed / 6 failed por metadatos esenciales ausentes clasificados como `pendiente` sin bloquear comparabilidad. En el objeto actual confirmo:

1. `_estado_por_diferencias` ahora devuelve `pendiente` cuando existe una diferencia con `bloquea_comparabilidad=True` y estado `pendiente`.
2. En `_diferencias_metodicas`, los campos de criterio esenciales (`definicion_metodologica`, `unidad_observacion`, `unidad_medida`, `universo`, `poblacion`, `territorio`, `criterio_localizacion`, `periodo_fenomeno`) se construyen siempre con `bloquea_comparabilidad=True`, tanto si el estado es `distinto` como si es `pendiente`.
3. En `_diferencias_fecha_referencia`, `tipo` conserva `bloquea_comparabilidad=True` como obligatorio, mientras `fecha` y `precision` mantienen su regla opcional (`bloquea_comparabilidad=estado=="distinto"`; ausente en uno/ambos lados es `informativo` y no bloquea). La ruta de opcionales de FechaReferencia no cambió respecto de lo dictaminado en 90.
4. El algoritmo Decimal exacto y el CLI no presentan diferencias funcionales respecto de lo ya dictaminado; sin cambios detectados en esa zona.

## Suite dirigida ejecutada (comando autorizado por 95)

Desde `backend/`:

```bash
.venv/bin/python -m pytest --noconftest tests/test_conciliacion_retrospectiva_fuentes_polis.py -q --junitxml=/root/polis/bridge/96_pytest_freebuff_conciliador.xml
```

Resultado: **72 passed, 0 failed, 0 error, 0 skipped, en 1.25 s**, exit 0. Corrida intermedia previa de la misma revisión: 66 passed exit 0. No se cargó `conftest.py` (evita migraciones de la fixture autouse); sin SQL, sin migraciones, sin suite general, sin red. JUnitXML en `bridge/96_pytest_freebuff_conciliador.xml`, SHA `8c64e5fa…b41fa`.

## Cotejo D1 (archivo 94, evidencia 94, artefactos 93)

D1 «serializar Decimal como texto en núcleo, CLI y JSON» queda **comprobado por ejecución en esta revisión**, separando dominios:

- Cálculo/contrato: `test_d1_decimal_json_and_distinct_products` valida las tres salidas serializadas (`model_dump(mode="json")`, `model_dump_json()`, texto CLI) con `valor_original_texto` preservando la representación original `"10.50"`, y la resta Decimal exacta `7.25` frente a `10.50 − 3.25` con `localcontext(prec=2)` no alterado; casos de escalas/exponentes extremos (1E±100) y de rechazo de bool/float/NaN/Infinity/sobrelímites.
- CLI: `test_cli_real_subprocess_and_hashes` ejecuta el CLI real dos veces con UUID distinto, verifica los hashes de entrada y salida en `manifiesto.json`, y comprueba la ausencia de restos temporales tras éxito. `test_cli_uses_single_read_hash_even_if_input_changes` bloquea la mutación posterior del archivo leído, y la salida residente queda restringida bajo bridge/tmp según 95.
- Alcance de D1: serialización de valores declarados y de la diferencia Decimal; **no** es validación semántica de fuentes oficiales, semántica de unidades ni trazabilidad; esa parte sigue en 94 como pendiente separado.

Artefactos sintéticos de 93 (`93_piloto_sintetico_conciliacion/`) intactos y coherentes con los hashes registrados en la evidencia 94 para archivos de datos de prueba.

## Cobertura declarada de la suite ampliada

Casos dirigidos leídos y cotejados: contraste entre productos distintos y bloqueo por cada uno de los 8 metadatos esenciales (distinto y pendiente); periodos parciales idénticos en `pendiente`; indice FechaReferencia con tipo obligatorio y opcionales (ausentes, iguales, incompatibles) en contraste inter-fuentes y revisión interna; versiones desconocidas/en conflicto sin cálculo; revisión interna con cambio metodológico; nulo distinto de cero; resta exacta con contexto Decimal exterior reducido; rechazo de bool/float/no finitos/sobrelímites, fechas inválidas, periodos invertidos; límites de observaciones y pares; modos de pareo; explicaciones locales con origen; lectura estricta del CLI, límite de tamaño, hash con archivo cambiado, fallo al escribir manifiesto sin publicación final, rutas externas y symlink rechazados.

La cobertura es la de los 72 casos del archivo; no se declara exhaustiva. Nota declarada por 94 y consistente con la lectura: una parametrización duplicada fue eliminada al ampliar la suite (los 72 están bien contados en el XML: 72 `<testcase>`, 0 fallos).

## Ruff y hashes finales

- `ruff check` núcleo+CLI+pruebas: **exit 0** («All checks passed!»).
- `ruff format --check` mismo trío: **exit 0** («3 files already formatted»).
- Versión de ruff: la del proyecto, ejecutada desde `backend/.venv/bin/ruff`.

## Límites de aislamiento cumplidos

Escrituras únicamente `bridge/96_revision_freebuff_validacion_funcional.md`, `bridge/96_evidencia_freebuff_validacion_funcional.json` y `bridge/96_pytest_freebuff_conciliador.xml`; la propia suite crea/elimina solo su carpeta temporal sintética bajo bridge. Sin cambios de aplicación, pruebas, 74/84/86/90/94, parser, fuentes, datos oficiales, dependencias ni configuración. Sin SQL, red, instalaciones, commit/push, reinicios ni despliegue.

Estado final: **aceptación dirigida constatada**; núcleo corregido cumple lo declarado en 94; D1 comprobado por ejecución; sin dictamen EAF ni integración productiva.
