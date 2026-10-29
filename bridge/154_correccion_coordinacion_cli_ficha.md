# Corrección de coordinación · SHA de selección y fecha UTC

26 de octubre de 2026. El CLI R2 estaba congelado en139 y revisado en153. Su sección de hashes confundía dos cosas: `ficha.seleccion_sha256` corresponde al JSON canónico del modelo con valores por defecto; no a los bytes del archivo de selección leído. La sección4 de153 no detectó esa diferencia. OpenCode tiene asignada una precisión documental separada.

## Evidencia del problema

| Selección139 | SHA archivo | SHA modelo canónico |
| --- | --- | --- |
| completa | `096cb42d09ff0c0ba213acb735840fff55f7a5313882d4d6a7cf8b6e7edb4d9b` | `daf3dfe5041f86d0479c6779426f4f2a7900d4d6328ca9ea08620a79cbff8930` |
| filtro2020 | `dcab29471736f112f0b47a3879b8a889da0a106bf0fba1f62b04881f50ad5dde` | `5d75ca23f799e5f2569fe87db03d225c02f0909edff9922a3a8a5f0c5f1a8db1` |

Se conservó una copia exacta del CLI anterior en `bridge/149_cli_ficha_r2.py`, SHA `65776615e2d32d985a8730b7f76664142e2ab9cb0f514b43a196f9da8c08070c`. No se modificaron pilotos139.

## Cambio aplicado

Solo `backend/scripts/construir_ficha_territorial_polis.py`:

- `parsear_seleccion` captura una vez los bytes acotados, valida ese JSON estricto y devuelve modelo más SHA de esos mismos bytes.
- `insumos_sha256.seleccion` registra ahora el SHA del archivo; `hashes_resultado.seleccion_canonica` conserva el del modelo. El campo `ficha.seleccion_sha256` mantiene su significado canónico.
- `fecha_elaboracion_utc` se genera explícitamente con `datetime.now(UTC)`.

CLI final SHA: `7773e7a307ef8916fe85e6c0613950012dd716a273f2f817686e20198c36b570`. Una primera comprobación Ruff señaló UP017; se corrigió el uso de `timezone.utc` a `UTC`. Después se ejecutaron por separado `ruff check` y `ruff format --check`: ambos exit0. El prefijo de hash erróneo transmitido inicialmente a Ollamacodex fue rectificado por tmux con el hash completo real antes de la nueva entrega.

Freebuff recibe155 para agregar y ejecutar pruebas del CLI en archivo separado. Ollamacodex recibe el nuevo hash para los pilotos151. La suite205 de149 corresponde al estado R2 anterior a esta corrección, por lo que no se usa como prueba del CLI nuevo.

Alcance: utilidad local, sin API, SQL, red, banco ni despliegue. La ficha sigue provisional hasta validación semántica; el SHA acredita integridad local de bytes, no su interpretación.
