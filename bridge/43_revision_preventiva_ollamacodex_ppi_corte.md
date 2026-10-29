# Cierre revisión preventiva PPI por corte

Fecha: 2026-10-23. Estado: documento final; Python congelados hasta gate integral.

## Resultado de auditoría

No encontré defecto reproducible en la ruta nueva `_query_ppi_corte` ni en la
integración actual PPI por corte.

`agentes_inteligentes_pdd.py:1611-1624` ya contiene la condición completa y
aplicada:

```python
if ppi is not None:
    ...
    "Nodos, metas y PPI provienen del mismo corte; evidencia y PDT pueden consultar SQL vivo."
    ...
    "PPI crudo sin comparabilidad acreditada."
else:
    "Nodos y metas provienen del catálogo congelado; PPI, evidencia y PDT siguen en SQL vivo."
```

Por tanto, el texto del hallazgo anterior sobre “PPI en SQL vivo” ya está
resuelto en la versión actual. El `else` corresponde a la ruta sin PPI y no se
confunde con la tool congelada. La falta de catálogo con PPI sigue el contrato
y `test_falta_referencia_falla_antes_de_sql`
(`backend/tests/test_ppi_agentes_corte_polis.py:191`) la verifica antes de SQL.

## Cotejo 42_evidencia_integracion_ppi_corte.json

El informe 42 y la evidencia JSON son coherentes en los conteos clave:

- 8 planes compartidos.
- 1.573 nodos compartidos.
- 1.573 nodos estructuralmente iguales.
- 0 nodos faltantes/sobrantes/cambios estructurales.
- 1.595 campos JSONB iguales.
- 1.551 campos JSONB con precisión no verificable.
- 0 campos JSONB con diferencia comprobada.
- 999 nodos con precisión no verificable.
- 0 nodos JSONB con cambio.
- 574 nodos con ambos campos JSONB comparados iguales.

El 1.551 no se interpreta como 1.551 diferencias comprobadas ni como 1.551
nodos: son campos afectados por floats legados del catálogo. El conteo por nodo
es 999. El informe 42 ya declara esta separación y la evidencia JSON coincide.

## Criterios 38 con tests reales

| Nº | Criterio | Test real | Aserción efectiva |
|---|---|---|---|
| 1 | ID solo en PPI / solo en catálogo | `test_comparacion_nodos_faltantes_y_sobrantes_con_ids_distintos` | `nodos_sobrantes_en_ppi == 1`, `nodos_faltantes_en_ppi == 1` y ambos IDs en hallazgos |
| 2 | Cambio de plan/padre/nivel | `test_cambios_independientes_con_ambos_valores` | Parametriza `parent_id`, `codigo_plan` y `nivel`; afirma `*_ppi != *_catalogo` |
| 3 | Orden | `test_reorden_real_tres_planes_mismos_archivos_verificados` | Reordena lectores y compara bytes/SHA |
| 4 | Centavos grandes | `test_tipos_anidados_y_centavos_sobreviven_json` | `9007199254740993.01`, `0.00000001`, texto y bool sobreviven JSON |
| 5 | Tipificación | `test_tipos_anidados_y_centavos_sobreviven_json`, `test_cero_nulo_faltante_texto_y_booleano_son_distintos` | Decimal anidado conserva representación exacta; tipos distintos no colapsan |
| 6 | >50 hallazgos | `test_comparacion_mas_de_50_hallazgos_y_muestra_estable` | 51 faltantes, 50 en muestra, conteo completo no negativo |
| 7 | Sobreescritura/symlink | `test_comparacion_salida_existente_alterada_no_sobrescribe`, `test_comparacion_salida_symlink_no_sobrescribe`, `test_salida_symlink_hacia_entrada_no_la_modifica` | Archivo alterado o symlink no modifica salida/entradas |
| 8 | CLI real | `test_cli_comparacion_guarda_informe`, `test_cli_salida_sha_y_referencias` | `main()` real, SHA del informe y referencias de captura/catálogo |

## Integración PPI congelada

- `_query_ppi_corte` compara base, cobertura e identidad/estructura contra el
  catálogo antes de devolver cifras.
- La ruta exacta usa `model_dump(mode="json")`; no pasa por `_plain`.
- El test exacto verifica importes como texto exacto sin conversión a float.
- El grafo puede seguir usando SQL vivo en otras tools, y así lo declara.

## Límites reales

- No acredita ejecución, presupuesto comparable, vínculos PA, indicador,
  causalidad ni clasificación 7D.
- No concilia los tres totales del PDD 2020–2023 ni IPC anual completo/versionado.
- No cierra la suite integral ni valida el gate.
- No es EAF ni dictamen de aceptación.
