# Orden de Trabajo EAF — Fase [24A] (`codex`)

- **Agente Asignado:** `codex` (`=codex:0.0`)
- **Auditor EAF:** `agy` (`=agy:0.0`)
- **Trabajo en Paralelo con:** `agy2` (`[24B]`, propietario de `pdt_persistencia_pg.py`, `pdt_ai_evaluator_graph.py`, `router.py`, `schemas.py`, `test_pdt_persistencia_pg.py`).
- **RESTRICCIÓN ABSOLUTA DE ALCANCE:**
  - **100% BACKEND (`backend/app/modules/compromisos/agentes_inteligentes_pdd.py`, `backend/app/modules/compromisos/pdd_dea_service.py`, `backend/tests/test_agentes_inteligentes_pdd.py`, `backend/tests/test_pdd_dea_triada.py`, `bridge/`).**
  - **PROHIBIDO tocar cualquier archivo en `src/**` (Frontend) y PROHIBIDO tocar `pdt_ai_evaluator_graph.py`, `router.py` o `schemas.py` (asignados a `agy2`).**

---

## 1. Objetivo de la Fase [24A]: Integración Unificada de `PDT-AI-EVALUATOR` en `agentes_inteligentes_pdd.py` y `pdd_dea_service.py`

1. **Integración en `backend/app/modules/compromisos/agentes_inteligentes_pdd.py`:**
   - Añadir una herramienta analítica (`tool_consultar_evaluador_pdt_gbr`) registrada en `AGENT_SPECS` y ejecutada dentro del grafo `LangGraph` + `PydanticAI` que cargue sin bloqueo el diagnóstico de `PDT-AI-EVALUATOR` (leyendo `data/planes_desarrollo/cache_pdt_ai_evaluator.json` o invocando `obtener_diagnostico_pdt_ai_evaluator` + `generar_dictamen_ejecutivo_pdt`) y filtre por los términos de `consulta.pregunta` y `consulta.codigo_plan`.
   - En `obtener_arquitectura_agentes(session)`:
     - Mantener todas las llaves actuales del diccionario devuelto y agregar una clave aditiva `"integracion_pdt_ai_evaluator"` con el estado real del motor `PDT-AI-EVALUATOR` (`total_dmus`, `pares_malmquist`, `poligonos_postgis_lisa`, `trampas_territoriales`, `series_alto_riesgo_isri`, `dependencias_dictaminadas`, `sectores_gbr`).
   - En `ejecutar_consulta_pdd(session, consulta)`:
     - Enriquecer `dictamen_forense_detallado` y `evidencia_financiera_y_metas` con la llave `"evaluacion_pdt_gbr"` que incluya:
       - DMUs DEA (`CCR`, `BCC`, `SE_o`, `rendimientos_escala`) vinculadas a la consulta.
       - Alertas de *mission creep* (`similaridad_coseno < 0.45`) relevantes.
       - Coldspots y `"Trampas Territoriales de Gestión Pública"` LISA.
       - Indicadores en Alto Riesgo (`ISRI > 0.40`) y resultado de prueba de Chow (`2024`).
       - Síntesis del pliego pericial por dependencia (`generar_dictamen_ejecutivo_pdt`).

2. **Integración en `backend/app/modules/compromisos/pdd_dea_service.py`:**
   - En el payload del laboratorio prescriptivo (`obtener_laboratorio_prescriptivo_pdd_dea` / constructor del laboratorio) y del consolidado ejecutivo, añadir una clave aditiva `"evaluacion_multidimensional_pdt_ai"` que exponga el resumen estructurado de `PDT-AI-EVALUATOR` (`dea_resumen`, `nlp_coherencia_resumen`, `econometria_espacial_lisa`, `riesgo_isri_chow`, `sectores_gbr`, `top_dictamenes_dependencias`) leído desde `data/planes_desarrollo/cache_pdt_ai_evaluator.json` y `pdt_dictamen_ejecutivo.py`.
   - Nota: En `test_pdd_dea_triada.py`, actualiza el conteo de rutas `/compromisos/triada/pdd-dea/` para aceptar `>= 19` (`assert sum(path.startswith(prefix) for path in paths) >= 19`) de modo que sea compatible con la ruta `/historial-auditoria` que agrega `agy2`.

3. **Pruebas y Calidad:**
   - Ampliar `backend/tests/test_agentes_inteligentes_pdd.py` y `backend/tests/test_pdd_dea_triada.py` verificando la presencia y estructura de `"integracion_pdt_ai_evaluator"`, `"evaluacion_pdt_gbr"` y `"evaluacion_multidimensional_pdt_ai"`.
   - Ejecutar `/root/polis/backend/.venv/bin/ruff check backend/app/modules/compromisos/agentes_inteligentes_pdd.py backend/app/modules/compromisos/pdd_dea_service.py backend/tests/test_agentes_inteligentes_pdd.py backend/tests/test_pdd_dea_triada.py` y `/root/polis/backend/.venv/bin/pytest backend/tests/test_agentes_inteligentes_pdd.py backend/tests/test_pdd_dea_triada.py -q`.
   - Documentar el reporte en `bridge/02_resultado_codex.md` y notificar a `agy:0.0`:
     ```bash
     tmux send-keys -t =agy:0.0 "CODEX LISTO [24A]: Integracion unificada PDT-AI-EVALUATOR en agentes_inteligentes_pdd.py y pdd_dea_service.py completada y probada. Solicito auditoria EAF." Enter
     ```
