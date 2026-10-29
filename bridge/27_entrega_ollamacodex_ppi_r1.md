# OL-CODEX-02-R1 · Entrega corregida PPI por corte

## Estado

- Entrega R1 lista para revisión de integración.
- Esquema vigente: `polis.ppi_planeacion.v2`.
- Alcance sigue siendo captura cruda, no publicable y sin comparabilidad.

## Correcciones aplicadas

1. Importes monetarios:
   - Se aceptan `Decimal`, entero, cadena decimal válida y `None`.
   - Se rechazan `float`, `bool`, no finitos y cadenas inválidas antes de cualquier conversión.
   - No hay redondeo ni inferencia; `None` y `0` permanecen diferenciados.
2. JSONB financiero:
   - Campos JSONB de planes: `ppi_anual_cop`, `fuentes` y `metadatos` como texto crudo `str | None`.
   - Campos JSONB de nodos: `ppi_anual_cop` y `metadatos` como texto crudo `str | None`.
   - SQL exporta con `::text`; la captura declara `TEXTO_JSONB_SIN_CONVERSION_A_FLOAT`.
   - El validador acepta SQL `NULL` o texto JSON válido y rechaza dict/list/float ya decodificados.
   - `decodificar_jsonb_exacto` usa `Decimal` para floats e `int` exactos; rechaza `NaN`/`Infinity`.
3. Captura vacía:
   - Se rechaza captura sin al menos un plan y su conteo SQL asociado.
   - No se impone un número mínimo de nodos por plan: cero nodos puede ser cobertura real.
4. Exportador real:
   - `congelar_ppi` consulta en la misma transacción `REPEATABLE READ READ ONLY`.
   - Fixture poblada sobre `polis_test_orq_v5_20261022` con planes, nodos y metas sintéticos.
   - Limpieza con IDs/códigos propios, incluso ante fallo.
   - Se verificaron importes numéricos exactos, texto JSONB exacto, conteos, SHA y bytes idempotentes.
   - En la misma conexión del exportador se observó `transaction_read_only=on` y `transaction_isolation=repeatable read`; el `DELETE ... WHERE FALSE` falló con `DBAPIError` y no se produjo archivo.
5. Correcciones de pruebas:
   - SHA verificada por igualdad con los bytes reales.
   - Rutas relativas controladas con cambio de directorio actual.
   - Prueba renombrada a `test_conteo_metas_solo_registra_informe_sql`; los conteos de metas son informe SQL, no validación corpus.
   - Se agregaron regresiones de captura vacía, float, booleano, JSONB exacto y archivo existente sin modificación.
   - No se importa ni usa `asyncpg.exceptions`; se usa `sqlalchemy.exc.DBAPIError`.

## Validación ejecutada

| Comando | Resultado |
|---|---|
| `ruff check backend/app/modules/compromisos/ppi_planeacion_corte_polis.py backend/scripts/congelar_ppi_planeacion_polis.py backend/tests/test_ppi_planeacion_corte_polis.py` | exit 0 |
| `ruff format --check backend/app/modules/compromisos/ppi_planeacion_corte_polis.py backend/scripts/congelar_ppi_planeacion_polis.py backend/tests/test_ppi_planeacion_corte_polis.py` | exit 0 |
| `pytest -q backend/tests/test_ppi_planeacion_corte_polis.py` | `48 passed in 1.72s` |

Base usada por la fixture: `polis_test_orq_v5_20261022`.
Suite integral no ejecutada; `bd_csh`, `--produccion`, captura productiva, commit y push no ejecutados.

## SHA256 de archivos entregados

- `backend/app/modules/compromisos/ppi_planeacion_corte_polis.py`
  `f7b0d90316f69a3dd1af83c5480a9909e0afe9f13cd7137b1413326b9f75fac7`
- `backend/scripts/congelar_ppi_planeacion_polis.py`
  `f8327da54782970c97b98515aed617830cf75123921463a7920889aa84e53ce3`
- `backend/tests/test_ppi_planeacion_corte_polis.py`
  `b2d7a71bda1021cc893ac6720a54ad488a6e79a7b2db6f6a6cfd1480480cb088`

## Archivos

- Modificados solo los tres Python del componente.
- Informe 25 y evidencia 25 conservados sin cambios.
- Este informe y su JSON de evidencia 27 son nuevas salidas.

## Propuesta siguiente

Ejecutar una revisión técnica del diff R1 y, si queda aceptado, integrar `congelar_ppi` como paso de captura PPI en el corte de planeación manteniendo solo lectura, texto JSONB crudo y la misma validez de corte. Si deseas evidencia productiva, definir previamente destino autorizado y verificación de corte por separado.
