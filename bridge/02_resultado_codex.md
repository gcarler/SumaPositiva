# Entrega Codex — PDT-AI-EVALUATOR-GRAFO-NODOS-21A

## Implementación

- Añadido `backend/app/modules/compromisos/pdt_ai_evaluator_graph.py` con el `AgentState`, topología cíclica `StateGraph` y `MemorySaver`, ingesta de fuentes PostgreSQL PDT, y nodos NLP, DEA, espacial, predictivo, supervisor y Human-in-the-Loop.
- Incluye la especificación GBR, cinco sectores, ecuaciones, umbrales de alerta, recomendaciones de revisión y persistencia atómica de caché/checkpoints. La extracción geográfica usa centroides PostGIS existentes; no inventa observaciones faltantes.
- Añadido `backend/tests/test_pdt_ai_evaluator.py` con cobertura de especificación, igualdad literal del prompt con la sección 5, recorrido de nodos, DEA/Chow, c-TF-IDF/coseno, Moran/LISA, ISRI y validación durable del auditor.

## Verificación

- `uv run --project backend ruff check backend/app/modules/compromisos/pdt_ai_evaluator_graph.py backend/tests/test_pdt_ai_evaluator.py` — correcto.
- `uv run --project backend pytest backend/tests/test_pdt_ai_evaluator.py -q` — 6 passed.

## Límites declarados

En este entorno no están instalados BERTopic/UMAP/HDBSCAN, SentenceTransformers, PySAL ni los paquetes ARIMA/VAR. El evaluador etiqueta los cálculos de respaldo léxico, espacial exploratorio u OLS, y deja las métricas pendientes cuando los datos o geometrías no permiten una estimación. El bootstrap DEA está identificado como aproximación suavizada y no como corrección Simar-Wilson. El análisis con PostgreSQL/PostGIS real no se ejecutó en estas pruebas unitarias.
