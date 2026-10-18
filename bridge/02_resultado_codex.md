# Entrega Codex — Fase [24A] Integración PDT-AI-EVALUATOR

## Cambios

- `backend/app/modules/compromisos/agentes_inteligentes_pdd.py`
  - Registrada la herramienta PydanticAI `tool_consultar_evaluador_pdt_gbr` dentro de `AGENT_SPECS` y `TOOL_SPECS`, ejecutada en el nodo financiero del StateGraph.
  - Carga el cache durable de PDT-AI-EVALUATOR fuera del event loop; si no existe, invoca el evaluador de forma asíncrona con la sesión actual.
  - Filtra DMUs DEA, alertas mission creep, coldspots, trampas territoriales, series ISRI > 0.40, Chow 2024 y dictámenes usando consulta y código de plan. El bloque `evaluacion_pdt_gbr` aparece en el dictamen forense y en la evidencia financiera.
  - Añadida la clave aditiva `integracion_pdt_ai_evaluator` en `obtener_arquitectura_agentes`; `arquitectura_agentes_ia` conserva compatibilidad con la ruta existente. Incluye estado y conteos del motor, incluyendo DMUs, Malmquist, polígonos PostGIS, trampas, riesgo ISRI, dependencias y sectores.
- `backend/app/modules/compromisos/pdd_dea_service.py`
  - El laboratorio prescriptivo y el consolidado ejecutivo incluyen `evaluacion_multidimensional_pdt_ai`, con resúmenes DEA/NLP/LISA, riesgos ISRI y Chow 2024, sectores GBR y dictámenes prioritarios.
  - Lee el cache durable sin bloquear el event loop y enriquece también payloads previamente cacheados.
- Ampliadas `backend/tests/test_agentes_inteligentes_pdd.py` y `backend/tests/test_pdd_dea_triada.py` para verificar estructura, filtros, herramienta y ambos payloads. El conteo de rutas acepta `>= 19`.

## Verificación

- Ruff solicitado sobre los cuatro archivos de la fase: correcto (`All checks passed`).
- Pytest solicitado: `29 passed` (`test_agentes_inteligentes_pdd.py` y `test_pdd_dea_triada.py`).
- `git diff --check` sobre los cuatro archivos: correcto.

## Alcance

No se modificaron `src/**`, `pdt_ai_evaluator_graph.py`, `router.py` ni `schemas.py`. No se hizo commit ni push.
