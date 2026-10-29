# Matriz de aceptación OL-CODEX-03-R2

Contraste 38 contra aserciones reales. PPI-01 NO está cerrado.

| Criterio 38 | Aserciones reales | Test actual | Estado honesto |
|---|---|---|---|
| IDs faltantes/sobrantes | `nodos_faltantes_en_ppi == 1`, `nodos_sobrantes_en_ppi == 1` | `test_comparacion_nodos_faltantes_y_sobrantes_con_ids_distintos` | Cumplido parcialmente |
| Plan/padre/nivel | `codigo_plan_ppi/catalogo`, `parent_id_ppi/catalogo`, `nivel_ppi/catalogo` | `test_comparacion_cambio_padre_plan_y_nivel` | Pendiente revisión |
| Orden | No compara bytes ni SHA | `test_comparacion_orden_de_entrada_no_cambia_salida` | NO cumplido |
| Centavos grandes | `campos_jsonb_precision_no_verificable == 1` | `test_comparacion_jsonb_decimal_y_float_lago` | Cumplido parcialmente |
| Tipificación | No conserva Decimal anidado | `test_comparacion_jsonb_tipos_y_tipos_valor` | NO cumplido |
| Conteo y muestra | `conteo_completo == 51`, `muestreado == 50` | `test_comparacion_mas_de_50_hallazgos_y_muestra_estable` | Cumplido |
| Guardas de sobreescritura | Archivo alterado y symlink | `test_comparacion_salida_existente_alterada_no_sobrescribe`, `test_comparacion_salida_symlink_no_sobrescribe` | Cumplido parcialmente |
| CLI real | `main() == 0` y salida verificada | `test_cli_comparacion_guarda_informe` | Cumplido parcialmente |

## Rutas relativas

El test actual no llama al comparador. Queda pendiente caso real.

## Definición de cierre

No se acredita PPI-01 hasta que los criterios marcados `NO cumplido` o
`pendiente` tengan aserciones reales y revisión de coordinación.
