# Orden de Trabajo EAF (`=agy:0.0`) para `codex` (`=codex:0.0`) — Fase `[28A]` (100% BACKEND)

**Estado de `[26A]`:** **APROBADO** en `/root/polis/bridge/03_dictamen_codex.md`.

**RESTRICCIÓN ABSOLUTA DE ALCANCE:**
- **100% BACKEND (`backend/app/modules/compromisos/agentes_inteligentes_pdd.py`, `backend/app/modules/compromisos/pdd_dea_service.py`, `backend/tests/test_agentes_inteligentes_pdd.py`, `backend/tests/test_pdd_dea_triada.py`).**
- **PROHIBIDO TOCAR `src/**` (Frontend) bajo ninguna circunstancia.**
- **PROHIBIDO TOCAR `service.py`, `pdt_revision_por_meta.py`, `test_motor_plan_accion_dnp.py`, `test_pdt_revision_por_meta.py` o `revision_motores_18_10_2026.md`** (esos archivos están asignados en paralelo a `agy2` en la Fase `[28B]`).

---

## Objetivo de la Fase `[28A]` (`codex`)
Implementar las mejoras estructurales de las **Secciones 4.1 y 4.4** de `/root/polis/revision_motores_18_10_2026.md`:

### 1. Cobertura Universal SQL y Transparencia de Muestreo en `agentes_inteligentes_pdd.py` (Sección 4.1)
- En `tool_consultar_planes_desarrollo` y `tool_consultar_plan_accion_y_triada` (y en el dictamen de `consultar_agentes_inteligentes_pdd`):
  - Antes o además de aplicar los recortes muestrales (`[:20]`, `[:30]`, `[:80]`), calcula y expón en el payload un bloque estructurado `cobertura_universo_bd`:
    - `planes_evaluados_count`: conteo total de planes en `planes_desarrollo_distrital` (5 planes `2012–2027`).
    - `metas_por_plan_totales`: diccionario `{codigo_plan: total_metas}` sobre el 100% de `pdd_metas_oficiales` sin truncar (incluyendo las `1246` metas de `PDD_2024_2027`).
    - `total_metas_coincidentes_sin_truncar`: cuántas metas cumplían el filtro de la consulta antes del recorte de muestra.
    - `metas_incluidas_en_muestra`: cuántas metas se enviaron en la lista muestral.
    - `muestra_truncada`: booleano (`total_metas_coincidentes_sin_truncar > metas_incluidas_en_muestra`).
    - En `tool_consultar_plan_accion_y_triada`, expón igualmente `cobertura_universo_operativo` con `total_actividades_pa_coincidentes_sin_truncar`, `actividades_incluidas_en_muestra`, `total_registros_triada_coincidentes_sin_truncar`, `registros_incluidos_en_muestra`, `suma_apropiacion_universo_filtrado_cop`, `suma_compromisos_universo_filtrado_cop` y `promedio_avance_fisico_universo_filtrado_pct` calculados sobre **todas** las filas coincidentes (no solo las primeras 30).

### 2. Normalización en Pesos Constantes (Base 2024 = 100) y Auditoría de Huérfanos en `pdd_dea_service.py` (Sección 4.4)
- En `generar_cruce_pdd_dea_triada` (y funciones auxiliares de `backend/app/modules/compromisos/pdd_dea_service.py`):
  1. **`comparativa_pesos_constantes_base_2024`**:
     - Construye una serie comparativa de los 5 planes de desarrollo (`2012–2027`) con deflactor IPC histórico oficial de Colombia (base `2024 = 100.0`, p. ej. factores índice IPC medio del período del plan: `PDD_2012_2015: 53.4`, `PDD_2016_2019: 65.8`, `PDD_2020_2023: 81.2`, `PDD_2024_2027: 100.0`), calculando para cada plan:
       - `codigo_plan`, `periodo`, `indice_ipc_base_2024`, `ppi_corriente_cop`, `ppi_constante_base_2024_cop`, `variacion_real_vs_plan_anterior_pct` y `nota_metodologica`.
  2. **`auditoria_huerfanos_y_trazabilidad`**:
     - Cruza el universo de metas del PDD activo (`PDD_2024_2027`), las actividades del Plan de Acción (`actividades_plan_accion`) y los registros de la Tríada (`registros_triada_normalizados`) para cuantificar y exponer muestras auditables de las 3 brechas de trazabilidad:
       - `metas_pdd_sin_plan_accion_count` y `metas_pdd_sin_plan_accion_muestra` (metas oficiales del PDD sin actividad operativa vinculada por código de meta/compromiso o línea/dependencia acreditada),
       - `actividades_pa_sin_respaldo_triada_count` y `actividades_pa_sin_respaldo_triada_muestra` (actividades del Plan de Acción sin registro financiero o con apropiación/compromiso nulo/cero en la Tríada),
       - `registros_triada_sin_meta_pdd_count` y `registros_triada_sin_meta_pdd_muestra` (registros de ejecución presupuestal de la Tríada sin vínculo acreditado a meta del PDD).

### 3. Pruebas y Calidad (`ruff` + `pytest`)
- Añade pruebas unitarias en `backend/tests/test_agentes_inteligentes_pdd.py` validando `cobertura_universo_bd` y `cobertura_universo_operativo`.
- Añade pruebas unitarias en `backend/tests/test_pdd_dea_triada.py` validando `comparativa_pesos_constantes_base_2024` y `auditoria_huerfanos_y_trazabilidad`.
- Pasa `ruff check` y `pytest` sobre ambos archivos.
- Escribe el reporte en `/root/polis/bridge/02_resultado_codex.md` y notifica por tmux a `=agy:0.0`:
  `tmux send-keys -t =agy:0.0 "CODEX LISTO [28A]: Cobertura universal SQL en agentes_inteligentes_pdd.py + Pesos constantes Base 2024 y Auditoria de Huerfanos en pdd_dea_service.py completados y probados. Solicito auditoria EAF." Enter`
