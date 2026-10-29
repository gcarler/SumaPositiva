# OL-CODEX-03-R2 · Comparación PPI vs catálogo

**Estado:** entrega técnica presentada; NO se acredita cierre completo de 38.
Python comparador congelado. PPI-01 continúa pendiente de revisión funcional.

## Resultados ejecutados

- `21 passed in 0.97s` en `polis_test_orq_v5_20261022`.
- Ruff check y `ruff format --check` exit 0.
- Suite integral no ejecutada.

## Criterios 38

| Criterio | Estado real | Evidencia |
|---|---|---|
| 1. IDs faltantes/sobrantes | Cumplido parcialmente | `test_comparacion_nodos_faltantes_y_sobrantes_con_ids_distintos` |
| 2. Cambios plan/padre/nivel | Pendiente revisión por coordinación | `test_comparacion_cambio_padre_plan_y_nivel` |
| 3. Orden | No cumplido | `test_comparacion_orden_de_entrada_no_cambia_salida` reutiliza archivos y no compara bytes |
| 4. Centavos grandes | Cumplido parcialmente | `test_comparacion_jsonb_decimal_y_float_lago` |
| 5. Tipificación | No cumplido | Decimal anidado no conserva tipo en salida |
| 6. Conteo y muestra | Cumplido | `test_comparacion_mas_de_50_hallazgos_y_muestra_estable` |
| 7. Guardas | Cumplido parcialmente | `test_comparacion_salida_existente_alterada_no_sobrescribe`, `test_comparacion_salida_symlink_no_sobrescribe` |
| 8. CLI real | Cumplido parcialmente | `test_cli_comparacion_guarda_informe` |

## Faltantes reales

- Orden: el test no compara bytes/SHA.
- Decimal anidado: no conserva tipo en hallazgos.
- Rutas relativas: el test no llama al comparador.
- Plan/padre: pendiente de revisión por coordinación.

## No acreditado

- No existe aceptación funcional de PPI-01.
- No existe cierre de la suite integral mediante esta entrega.
- No se acredita validez de deflación ni comparabilidad financiera.
