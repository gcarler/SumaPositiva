# OL-CODEX-03-R1 · Comparación PPI v2 vs catálogo v1

## Estado

- Componente corregido y congelado.
- Pruebas dirigidas: `16 passed in 0.94s`.
- Ruff y formato exit 0.
- Suite integral no ejecutada.
- Archivos 29 y 34 conservados.

## Cambios principales

1. Rutas coherentes:
   - Se normalizan rutas relativas contra `RAIZ`.
   - `_sha_archivo` usa la misma resolución que los lectores.
2. Universos:
   - Faltantes y sobrantes calculados sobre todos los nodos, sin filtrar previamente por plans compartidos.
   - `nodos_compartidos` cuenta IDs compartidos.
   - `nodos_iguales_estructuralmente` cuenta solo nodos sin cambios.
3. JSONB:
   - Conteo por campo y por nodo claramente separado.
   - `campos_jsonb_iguales`, `campos_jsonb_cambio`, `campos_jsonb_precision_no_verificable`.
   - `nodos_jsonb_iguales_estructuralmente` y `nodos_jsonb_con_cambios`.
   - Comparador estricto con `Decimal`, int, string, booleano, lista, objeto y `NULL`.
4. Hallazgos tipados:
   - Sección estructurada `SeccionHallazgos`.
   - Conteo completo, muestra acotada y muestra_maxima.
   - `HallazgoComparacion` tipado para campos, estados y valores.
5. Cobertura:
   - Nodos y metas por plan.
   - Total de plan marcado como no comparable.
6. CLI:
   - Argumentos manifiesto, run_id, sha, inventario, captura, catálogo y salida.
   - No ejecuta SQL y no sobrescribe salidas.

## Casos cubiertos

- Mismo corte.
- Corte ajeno.
- Captura alterada.
- Catálogo alterado.
- Inventario ajeno.
- Base origen distinta.
- Nodo faltante y sobrante.
- Cambio nivel.
- Cobertura nodos/metas distinta.
- JSON null y SQL null.
- Tipos distintos.
- Decimal y float legacy.
- Más de 50 hallazgos.
- Orden estable.
- Rutas relativas con cwd distinto.
- CLI real.

## Validación ejecutada

| Comando | Resultado |
|---|---|
| Ruff check tres archivos | exit 0 |
| Ruff format --check tres archivos | exit 0 |
| `pytest -q backend/tests/test_comparacion_ppi_catalogo_polis.py` | `16 passed in 0.94s` |

## Archivos

- `backend/app/modules/compromisos/comparacion_ppi_catalogo_polis.py`
- `backend/scripts/comparar_ppi_catalogo_polis.py`
- `backend/tests/test_comparacion_ppi_catalogo_polis.py`
- `bridge/33_evidencia_ollamacodex_comparacion_ppi_r1.json`

## Restricciones

- Sin SQL productiva, sin `data/**`, sin frontend.
- Sin commit, push ni despliegue.
- Sin suite integral.
- Sin toques de consumidores.
