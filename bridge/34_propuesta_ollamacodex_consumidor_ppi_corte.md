# OL-CODEX-04 · Propuesta consumo PPI congelado por corte

## Objetivo

Migrar `_query_ppi`, `ToolContext` y `ejecutar_consulta_pdd` a lectura del artefacto PPI congelado (`polis.ppi_planeacion.v2`), sin SQL activo en esa herramienta. Mantener el PPI como componente financiero no comparativo y no reemplazar el universo de metas del catálogo.

## Base actual

- `backend/app/modules/compromisos/agentes_inteligentes_pdd.py`
  - `ToolContext` en líneas 67-81.
  - `_query_nodos_corte` en líneas 446-483.
  - `_query_metas_corte` en líneas 484-506.
  - `_query_ppi` en líneas 608-716.
  - `tool_conciliar_ppi_plan` en líneas 987-1000.
  - `ejecutar_consulta_pdd` en líneas 1311-1345.
- `backend/app/modules/compromisos/router.py`
  - `consultar-agentes-pdd` en líneas 293-301.
- Lector PPI:
  - `backend/app/modules/compromisos/ppi_planeacion_corte_polis.py`
  - `ReferenciaPPIPlaneacion`, `CapturaPPIPlaneacion`, `PlanPPI`, `NodoFinanciero`, `decodificar_jsonb_exacto`.

## Cambio propuesto

1. Ampliar `ToolContext` con una campo opcional `ppi: CapturaPPIPlaneacion | None = None`.
   - Mantener compatibilidad con llamadas actuales.
   - La existencia de `ppi` debe requerir también `corte`.
2. En `ejecutar_consulta_pdd`:
   - Añadir parámetro opcional `ppi: ReferenciaPPIPlaneacion | None = None`.
   - Si se recibe `ppi`, leer con `ppi.leer(corte)` antes de construir agentes.
   - No permitir `ppi` sin `corte`.
   - Guardar la lectura verificada en `ctx.ppi`.
3. Reescribir `_query_ppi` como función offline:
   - Si `ctx.ppi is None`, mantener solo el error de modo vivo o no usar la ruta PPI (a definir según política coordinador).
   - Si `ctx.ppi` existe, no abrir SQL.
   - Filtrar planes por `ctx.consulta.codigo_plan == "TODOS"` o código exacto.
   - Devolver dict con `base_origen`, `run_id`, SHA y referencia al artefacto.
4. `tool_conciliar_ppi_plan` solo cambia el origen de datos, no la invocación.

## Contrato Decimal/JSONB

- `ppi_total_corriente_cop` y `ppi_total_constante_2025_cop` ya llegan como `Decimal | None`.
- No convertir `Decimal` a `float`.
- JSONB de PPI:
  - `ppi_anual_cop`, `fuentes`, `metadatos` en plan son texto crudo.
  - En nodos: `ppi_anual_cop`, `metadatos` texto crudo.
  - Usar `decodificar_jsonb_exacto` cuando se necesite valores.
  - Distinguir SQL `NULL` de JSON `null` y de objetos vacíos.
  - Si hay float heredado desde algún origen, marcar como `PRECISION_NO_VERIFICABLE`.

## Límites financieros

- Si `ppi_total_constante_2025_cop is None`, estado `SIN_TOTAL_COMPARABLE`.
- Los desgloses por ABCN y 7D solo se construyen cuando el total constante es exacto y existe IPC anual completo para el periodo del corte.
- Para `PDD_2020_2023`, no usar suma interna si hay conflicto narrativo; estado `CONFLICTO_TOTAL_NARRATIVA_TABLA_SUMATORIA` y desgloses `None`.
- Para `PDD_2024_2027` y `PDL_`, estado `SIN_IPC_ANUAL_COMPLETO_2026_2027`.
- Nunca declarar total comparable si falta centavo exacto o hay conflicto 2020.

## Ruta sin SQL

- Entrada única JSON: consulta, manifiesto, inventario, captura PPI, catálogo.
- Lectura única PPI verificada por SHA e inventario.
- Lectura catálogo ya existente.
- Herramienta PPI solo consume memoria del corte.
- Sin conexión SQL activa para la herramienta PPI.
- El PPI no reemplaza el catálogo ni metas.

## Regresiones sugeridas

- Captura PPI con:
  - importes grandes y centavos.
  - `Decimal`, entero, cadena, `None` y `0`.
  - JSONB grande, array, objeto, SQL NULL y JSON null.
- Captura y catálogo:
  - mismo run_id.
  - run_id diferente.
  - SHA alterado.
  - planes y nodos faltantes/sobrantes.
  - cobertura discrepante.
  - total plan no comparable.
  - float legacy.
  - salida estable.
- Respuesta:
  - no_publicable.
  - límites visibles.
  - sin desglose si no hay IPC.

## Resultado esperado

- Respuesta determinista con trazabilidad completa del corte.
- Sin inferencias financieras no documentadas.
- Sin pérdida de precisión monetaria.
- Sin SQL en `_query_ppi`.

# Plan de casos para OL-CODEX-03-R1

## Correcciones obligatorias previas

- Resolver rutas relativas del componente contra `RAIZ`, no contra el directorio actual.
- Normalizar rutas usadas por `_sha_archivo` con la misma regla que los lectores.
- `nodos_iguales` debe contar solo nodos estructuralmente idénticos.
- `nodos_compartidos` sigue contando ids compartidos, aun con cambio estructural.
- Separar conteos por campo y por nodo:
  - `campos_jsonb_iguales`.
  - `campos_jsonb_cambio`.
  - `campos_jsonb_precision_no_verificable`.
  - `nodos_jsonb_iguales_estructuralmente`.
- En cambio de `codigo_plan`, reportar ambos valores:
  - `codigo_plan_ppi`.
  - `codigo_plan_catalogo`.
- Tipar hallazgos como estructura `conteo_completo`, `muestreado`, `muestra_maxima`, `muestra`.
- Retirar modelos declarados y sin uso.

## Casos mínimos y afirmaciones exactas

1. Nodo faltante:
   - Un nodo en catología y otro en PPI.
   - Esperar `faltante_en_ppi` y `sobrante_en_ppi` con conteos exactos.
2. Cambio de plan/padre/nivel:
   - Cambiar `codigo_plan`, `parent_id` y `nivel` en nodos compartidos.
   - Verificar que cada hallazgo contenga ambos valores.
3. Cambio de cobertura:
   - Cobertura de nodos distinta.
   - Cobertura de metas distinta.
   - Verificar hallazgo específico y conteos.
4. Base distinta:
   - `base_origen` distinta entre PPI y catálogo.
   - Verificar `base_origen_distinta`.
5. Inventario ajeno:
   - Manifiesto/inventario con `run_id` distinto.
   - Verificar rechazo.
6. Catálogo alterado:
   - Cambiar bytes del catálogo.
   - Verificar rechazo por SHA.
7. Captura alterada:
   - Cambiar bytes de captura.
   - Verificar rechazo por SHA.
8. JSON null frente SQL NULL:
   - En PPI `"null"` y en catálogo `None`.
   - Verificar cambio y que no se confunda con objeto vacío.
9. SQL NULL frente JSON null:
   - En PPI `None` y en catálogo `"null"`.
   - Verificar cambio.
10. Cero frente faltante:
   - Cobertura cero frente a cobertura faltante.
   - Verificar `cambio` y no pérdida de cero.
11. Booleano frente entero:
   - PPI booleano y catálogo entero.
   - Verificar cambio `tipo_distinto`.
12. Cadena numérica frente número:
   - PPI `"1"` y catálogo `1`.
   - Verificar cambio de tipo.
13. Decimal grande con centavos:
   - Usar texto exacto y sin float.
   - Verificar igualdad y tipo `Decimal`.
14. Arrays y JSON anidado:
   - Arrays, objetos anidados, `None` y strings.
   - Verificar ruta exacta y tipos.
15. Más de 50 hallazgos:
   - Generar 51+ hallazgos.
   - Verificar `conteo_completo > 50`, `muestreado` con 51, `muestra_maxima = 50` y muestra estable.
16. Inversión de orden:
   - Entradas en orden distinto.
   - Verificar misma salida JSON.
17. Rutas relativas con cwd distinto:
   - Ejecutar desde directorio temporal nested con rutas relativas a `RAIZ`.
   - Verificar que lectores y `_sha_archivo` no fallen.
18. CLI con argumentos reales:
   - Ejecutar `comparar_ppi_catalogo_polis.py` con manifiesto, invventario, captura, catálogo y salida.
   - Verificar que no se sobreescriben entradas y no se genera SQL.

## Notas sobre pruebas actuales

- Las pruebas actuales no cubren aún varios casos del encargo 28.
- Se conservarán los archivos 29 como historial.
- Los archivos Python no se tocarán hasta que la suite integral termine.
- Las pruebas se ejecutarán solo sobre `backend/tests/test_comparacion_ppi_catalogo_polis.py` y según coordinación.
