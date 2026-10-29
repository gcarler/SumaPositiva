# OL-CODEX-03 · Comparación PPI v2 frente a catálogo v1

## Estado

- Componente implementado y congelado para revisión funcional.
- Validación dirigida ejecutada: `8 passed in 0.90s`.
- Ruff y `ruff format --check` exit 0.
- Suite integral no ejecutada; pendiente a la coordinación.

## Cambios principales

1. Componente:
   - Entrada verificada con `ContextoCorte` y lectores existentes de captura y catálogo.
   - Valida mismo corte, inventario, SHA, esquema `ppi_planeacion.v2` y `catalogo_planeacion.v1`.
   - Exige misma `base_origen`.
2. Universos:
   - Compara planes por faltantes/sobrantes.
   - Compara nodos por faltantes/sobrantes sin filtrar planes compartidos antes del conteo.
   - Cobertura nodos/metas por plan.
   - Total plan marcado como `COMPARACION_NO_DISPONIBLE` por ausencia de equivalencia en catálogo v1.
3. Estructura:
   - Cambios de identidad, `codigo_plan`, `parent_id` y `nivel` por nodo compartido.
4. JSONB y fuente:
   - Comparación separada por `ppi_anual_cop` y `metadatos`.
   - Comparador estricto que distingue `Decimal`, `int`, string, booleano, objeto y lista.
   - Float heredado del catálogo se marca `precision_no_verificable` con ruta exacta.
   - SQL `NULL` y JSON `null` se separan de objetos vacíos y no generan contadores negativos.
   - Cambios de `fuente` se reportan aparte.
5. Salida:
   - JSON con referencias, resumen, hallazgos, límites y `no_publicable`.
   - Salida inmutable por SHA y bytes idempotentes.

## Corrección preventiva aplicada

- `hallazgos` conservado como mapa por grupo con conteo completo y muestra acotada.
- Contadores de JSONB calculados por resultado, sin resta que pueda producir negativo para SQL `NULL`.
- Universos de nodos no se filtran por planes compartidos antes de faltantes/sobrantes.

## Pruebas

| Comando | Resultado |
|---|---|
| Ruff check tres archivos | exit 0 |
| Ruff format --check tres archivos | exit 0 |
| `pytest -q backend/tests/test_comparacion_ppi_catalogo_polis.py` | `8 passed in 0.90s` |

## SHA256

- `backend/app/modules/compromisos/comparacion_ppi_catalogo_polis.py`: `53ae3f0d22fe8642b1f23f4dcc030979089c58b30d96ce837694ef39ff8a489e`
- `backend/scripts/comparar_ppi_catalogo_polis.py`: `3c763df7c0666cb9250a9130e2708e2bda5ca261a10bd0f1a184b42db5ff237b`
- `backend/tests/test_comparacion_ppi_catalogo_polis.py`: `6589775674ddab52d6b2c1760c57406e5685be73b9a8547ef7bf4bb112984ee5`

## Restricciones

- Sin SQL productiva, sin `data/**`, sin frontend, sin commit, push ni despliegue.
- Sin suite integral.
