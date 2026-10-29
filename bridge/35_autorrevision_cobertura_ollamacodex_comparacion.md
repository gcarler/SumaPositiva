# Autorrevisión honesta de cobertura · OL-CODEX-03-R1

**Comparación contra:** `bridge/32_revision_ollamacodex_comparacion_ppi_r1.md`  
**Arlboat:** `backend/tests/test_comparacion_ppi_catalogo_polis.py` (16 tests)  
**Estado:** No se acredita todavía la cobertura completa del encargo 28/32.

## Registro real

| Punto 32 | Prueba actual | Aserciones reales | Brecha honesta |
|---|---|---|---|
| Mismo corte | `test_comparacion_igual_y_salida_estable` | `nodos_compartidos == 1`, `nodos_iguales_estructuralmente == 1` | No cubre el caso de corte correcto con artefactos distintos. |
| corte ajeno | `test_comparacion_rechaza_corte_ajeno | raise ValueError("run_id") | Cumple parcialmente. |
| captura alterada | `test_comparacion_rechaza_captura_alterada | raise ValueError("Nombre o contenido alterado") | Cumple parcialmente. |
| catálogo alterado | `test_comparacion_rechaza_catalogo_alterado | raise ValueError | Cumple parcialmente. |
| inventario ajeno | `test_comparacion_rechaza_inventario_ajeno | raise ValueError | Cumple parcialmente. |
| base distinta | `test_comparacion_base_distinta_reporta_hallazgo | `base_origen_distinta is True` | Cumple parcialmente. |
| nodos faltantes/sobrantes | `test_comparacion_contea_nodos_faltantes_y_sobrantes | `nodos_compartidos == 1` | No prueba faltante/sobrante; usa el mismo `id` y catálogo no vacío. |
| cobertura nodos/metas | `test_comparacion_cobertura_nodos_y_metas_distinta | `cobertura_planes_* == 1` | Cumple parcialmente. |
| JSONB y float | `test_comparacion_nodos_jsonb_cambio_y_precision_float | `estado == "jsonb_precision_no_verificable"` | Cumple parcialmente. |
| JSON null / SQL NULL | `test_comparacion_json_null_y_sql_null`, `test_comparacion_sql_null_y_json_null | `origen_jsonb_ppi == ...` | Cumple parcialmente. |
| tipos y Decimal | `test_comparacion_tipos_distintos_y_decimal_exacto | `campos_jsonb_cambio == 1` | No prueba importe grande/centavos. |
| >50 hallazgos | `test_comparacion_mas_de_50_hallazgos_y_muestra_estable | `nodos_faltantes_en_ppi == 51`, `muestreado == 50` | Cumple parcialmente. |
| orden de entrada | `test_comparacion_orden_de_entrada_no_cambia_salida | comparo salida sin referencias | No prueba orden; solo un nodo. |
| rutas relativas | `test_comparacion_rutas_relativas_con_cwd_distinto | `ruta.startswith(str(RAIZ))` | Cumple parcialmente. |
| CLI real | `test_cli_comparacion_guarda_informe | `main() == 0` | Cumple parcialmente. |
| guardas sobreescritura | — | — | No hay prueba. |
| etiqueta Decimal | — | — | No hay prueba. |
| cambio plan/padre/nivel | — | — | No hay prueba. |

## Diferencias graves detectadas

- `test_comparacion_contea_nodos_faltantes_y_sobrantes` no prueba faltante/sobrante. Usa mismo `id` en PPI y catálogo, y catálogo no vacío; solo confirma igualdad.
- `test_comparacion_orden_de_entrada_no_cambia_salida` invierte una lista de un único nodo; no demuestra orden.
- `test_comparacion_tipos_distintos_y_decimal_exacto` no maneja importe grande con centavos.
- No hay prueba de cambio simultaneo/individual de `parent_id`, `codigo_plan` o `nivel`.
- No hay prueba que verifique etiquetas Decimal serializadas como tipo original.
- No hay prueba de guardas sobreescritura para `escribir_informe_comparacion`.
- No hay prueba de `nodos_jsonb_*` por campo y por nodo en casos con varios campos/categorías.

## Deuda real por 32

- 1 faltante/sobrante claramente no probado.
- 1 orden de entrada no probado.
- Cambios de plan/padre/nivel no probados.
- Decimal grande con centavos no probado.
- Decimal serializado como tipo original no probado.
- Guardas de sobreescritura no probadas.
- Más de 50 hallazgos no con un caso de 51+ en ambas direcciones.
- No hay prueba de catálogo y captura con arrays/JSON anidados complejos.
- No hay prueba de "nodo faltante" y "nodo sobrante" con IDs distintitos.

## Conclusión

No se acredita la cobertura completa del encargo 28/32.
Las pruebas son insuficientes en los campos señalados.
Se debe ampliar con nuevos test que afirmen explícitamente los hallazgos, no solo el conteo global.

*Este documento no acredita pruebas inexistentes.*
