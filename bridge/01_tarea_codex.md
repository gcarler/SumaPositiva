# TAREA ACTIVA PARA CODEX (DESARROLLADOR PRINCIPAL BACKEND)

- **ID de Tarea**: `[PDT-AI-EVALUATOR-GRAFO-NODOS-21A]`
- **Fecha / Hora**: 2026-10-18
- **Asignado por**: `agy` (`=agy:0.0`)
- **Ejecutor**: `codex` (`=codex:0.0`)
- **Alcance Exclusivo (PROHIBIDO TOCAR FRONTEND `src/**` NI `router.py`)**:
  - `backend/app/modules/compromisos/pdt_ai_evaluator_graph.py` (CREAR)
  - `backend/tests/test_pdt_ai_evaluator.py` (CREAR)
  - `data/planes_desarrollo/cache_pdt_ai_evaluator.json` (Cache durable generado automáticamente)
  - `bridge/02_resultado_codex.md` (Reporte de entrega)

---

## 1. Contexto y Especificación Metodológica Obligatoria

El usuario ha entregado la **"Especificación Arquitectónica y Metodológica: Sistema Agéntico de Inteligencia Artificial para el Análisis y Evaluación Multidimensional de Planes de Desarrollo Territorial (PDT)"**, almacenada íntegramente en:
- `knowledge-base/13_SISTEMA_AGENTICO_PDT_GBR_DEA_NLP_LISA_ISRI.md`

Léela completa antes de escribir código. Debes implementar en `backend/app/modules/compromisos/pdt_ai_evaluator_graph.py` el grafo cíclico de estados en **LangGraph** (`StateGraph` + `MemorySaver` Checkpointer) que ejecuta los **5 pasos del protocolo `PDT-AI-EVALUATOR`** sobre los datos reales de PostgreSQL (`bd_csh`).

---

## 2. Requerimientos Técnicos Exactos de `pdt_ai_evaluator_graph.py`

1. **Definición Exacta de `AgentState(TypedDict)`**:
   Debe incluir todos los campos de la especificación:
   - Metadatos del Plan: `jurisdiction: str`, `time_horizon: str`, `total_budget: float`, `units_dmu: List[str]`
   - Corpus Documental y Matrices Numéricas:
     - `raw_corpus: Dict[str, str]` (Plan Indicativo PDD/PDL y Matrices de Plan de Acción extraídos de `seguimiento.pdd_evidencia_paginas`, `seguimiento.pdd_lineas_y_programas`, `seguimiento.pdd_metas_oficiales` y `seguimiento.actividades_plan_accion`)
     - `df_financial: Any` (Insumos Presupuestales `$X` por DMU/sector/dependencia)
     - `df_outputs: Any` (Metas de Producto `$Y_out`)
     - `df_outcomes: Any` (Indicadores de Resultado `$Y_outc`)
     - `gdf_spatial: Any` (Geometrías / centroides comunales, localidades 1-3, UCG 1-15 y corregimientos de Cartagena)
   - Resultados Intermedios de los Nodos:
     - `dea_scores: Dict[str, Any]` (Eficiencia CCR $\theta^{\text{CCR}}$, BCC $\theta^{\text{BCC}}$ con $\sum \lambda_j = 1$, Eficiencia de Escala $SE_o = \theta_o^{\text{CCR}} / \theta_o^{\text{BCC}}$, clasificación `IRS`/`CRS`/`DRS`, Índice de Productividad de Malmquist $\text{MPI} = \text{Techch} \times \text{Pech}$, y Bootstrap Suavizado $B=1000$ con intervalos de confianza al 95%)
     - `nlp_coherence: Dict[str, Any]` (Vectorización semántica, clustering topológico tipo BERTopic/UMAP/HDBSCAN, ponderación $c\text{-TF-IDF}$ $W_{x, c} = \text{tf}_{x, c} \times \log(1 + \frac{A}{f_x})$, y Matriz de Similaridad Coseno $\text{Similaridad Coseno}(O_k, A_m) = \frac{e(O_k) \cdot e(A_m)}{\|e(O_k)\| \|e(A_m)\|}$ entre metas estratégicas $O_k$ y proyectos/actividades $A_m$, disparando alerta `"Desalineación Estratégica / Mission Creep"` cuando `< 0.45`)
     - `spatial_lisa: Dict[str, Any]` (Matriz de pesos espaciales $W$ Queen / $k\text{-NN}$, Índice Global $I$ de Moran con $p$-valor por permutación, Indicadores Locales LISA $I_i$ clasificando `Alto-Alto (Hotspots)`, `Bajo-Bajo (Coldspots)`, `Alto-Bajo` y `Bajo-Alto (Outliers Espaciales)`, y cruce con unidades ineficientes del Nodo DEA para detectar `"Trampas Territoriales de Gestión Pública"`)
     - `time_series_forecast: Dict[str, Any]` (Proyecciones de series temporales tipo ARIMA/VAR sobre indicadores de resultado $Y_{outc}$, Prueba de Ruptura Estructural de **Chow** tras la aprobación del PDT con estadístico $F$ y $p$-valor, e Índice $\text{ISRI} = 1 - P(Y_{t=\text{final}} \ge \text{Meta}_{\text{cuatrienio}})$ disparando bandera `"Alto Riesgo de Incumplimiento"` cuando $\text{ISRI} > 0.40$)
   - Control del Grafo y Checkpointer Human-in-the-Loop:
     - `next_node: str`
     - `is_valid_human: bool`
     - `messages: List[str]`

2. **Matriz Evaluativa Multi-Sectorial Integrada (Sección 4 de la Especificación)**:
   Evalúa explícitamente los **5 sectores prioritarios** de la tabla metodológica más las 7 dimensiones de Seguridad Humana:
   - `Educación Pública` (Indicadores MIR: Tasa de cobertura neta, Tasa de deserción intra-anual, Puntaje promedio en pruebas de logro; Técnica principal: DEA CCR/BCC y Malmquist).
   - `Salud Pública` (Indicadores MIR: Tasa de mortalidad infantil/materna, Cobertura de inmunización, Tiempos de atención; Técnica principal: LISA / Moran Local).
   - `Infraestructura Vial` (Indicadores MIR: Km de vías secundarias/terciarias intervenidas, Coeficiente de accesibilidad rural; Técnica principal: NLP / BERTopic y Similaridad Coseno).
   - `Desarrollo Agrícola` (Indicadores MIR: Rendimiento físico por hectárea, % de productores con asistencia técnica integral; Técnica principal: Índice de Malmquist Techch/Pech).
   - `Medio Ambiente` (Indicadores MIR: Tasa de deforestación anual, Toneladas de $\text{CO}_2$ mitigadas, Cobertura de saneamiento; Técnica principal: Series Temporales ARIMA/VAR, Chow Test e ISRI).

3. **Grafo Dirigido y Cíclico en LangGraph (`StateGraph(AgentState)` + `MemorySaver`)**:
   - Nodos del grafo:
     - `nodo_supervisor`
     - `nodo_nlp`
     - `nodo_dea`
     - `nodo_espacial`
     - `nodo_predictivo`
     - `nodo_human_in_loop`
   - El `nodo_supervisor` coordina el flujo cíclico entre los nodos analíticos (`nodo_nlp` $\rightarrow$ `nodo_dea` $\rightarrow$ `nodo_espacial` $\rightarrow$ `nodo_predictivo` $\rightarrow$ `nodo_supervisor` $\rightarrow$ `nodo_human_in_loop`).
   - Cuando se detecta un área/DMU que reporta alta ejecución financiera pero es un **Coldspot persistente (`Bajo-Bajo`)** con **desalineación estratégica ($\text{Similaridad Coseno} < 0.45$)** e **$\text{ISRI} > 0.40$**, el grafo activa el Checkpointer congelando el estado (`is_valid_human = False`, `estado_checkpointer = "CONGELADO_PARA_AUDITORIA_HUMANA"`) y solicita la validación técnica de un auditor experto en planeación antes de emitir la síntesis final vinculante.
   - Guarda el estado del checkpointer y el resultado en disco durable (`data/planes_desarrollo/cache_pdt_ai_evaluator.json` y `data/planes_desarrollo/checkpoints_pdt_ai_evaluator.json`) para respuestas `<50ms` y persistencia entre workers.

4. **Funciones Públicas de Alto Nivel a Exportar en `pdt_ai_evaluator_graph.py`**:
   - `SYSTEM_INSTRUCTIONS_PDT_AI_EVALUATOR: str` (el bloque exacto de la Sección 5 de la especificación).
   - `obtener_especificacion_pdt_ai_evaluator() -> dict`: Devuelve toda la arquitectura metodológica GBR (Cadena de Valor Pública: Insumos $\rightarrow$ Procesos $\rightarrow$ Productos $\rightarrow$ Resultados $\rightarrow$ Impactos), los 3 instrumentos (Plan Indicativo, Matrices de Plan de Acción, MIR/MGA/SisPT), la topología del grafo LangGraph, las ecuaciones en notación LaTeX estricta, la Matriz Multi-Sectorial de 5 sectores, el `SYSTEM_INSTRUCTIONS_PDT_AI_EVALUATOR` y el protocolo de gobernanza institucional de 4 fases.
   - `async def ejecutar_pdt_ai_evaluator(db: AsyncSession | None = None, *, jurisdiction: str = "Distrito Turístico y Cultural de Cartagena de Indias", time_horizon: str = "2024-2027 (Serie Multianual 2012-2027)", thread_id: str = "pdt-cartagena-2024-2027", force_refresh: bool = False) -> dict`: Ejecuta el grafo completo sobre `bd_csh` (o sirve desde caché durable si `force_refresh=False`) y devuelve el diagnóstico multidimensional completo con trazabilidad a las tablas reales (`seguimiento.pdd_evidencia_paginas`, `seguimiento.pdd_lineas_y_programas`, `seguimiento.pdd_metas_oficiales`, `seguimiento.actividades_plan_accion`, `seguimiento.registros_triada_normalizados`).
   - `async def validar_checkpoint_pdt_ai_evaluator(thread_id: str, *, aprobado: bool, auditor: str, observaciones: str = "") -> dict`: Permite al auditor experto descongelar/aprobar o rechazar el estado en el Checkpointer (`is_valid_human = aprobado`) y emite las recomendaciones operativas vinculantes de reasignación presupuestal en las Matrices de Plan de Acción.

5. **Pruebas Unitarias e Integración (`backend/tests/test_pdt_ai_evaluator.py`)**:
   - Verifica `obtener_especificacion_pdt_ai_evaluator()`, la ejecución de los 5 nodos del grafo LangGraph, las ecuaciones y métricas (`CCR`, `BCC`, `SE_o`, `IRS/DRS`, `Malmquist`, `Bootstrap B=1000`, `c-TF-IDF`, `Similaridad Coseno < 0.45`, `Moran Global I`, `LISA Hotspots/Coldspots`, `Trampas Territoriales`, `Chow Test`, `ISRI > 0.40`), la Matriz Multi-Sectorial de los 5 sectores y el flujo Human-in-the-Loop del Checkpointer (`validar_checkpoint_pdt_ai_evaluator`).

---

## 3. Protocolo de Entrega

1. Ejecuta `ruff check` y `pytest backend/tests/test_pdt_ai_evaluator.py`.
2. Escribe tu reporte en `bridge/02_resultado_codex.md`.
3. Notifica a `agy` por `tmux`:
   ```bash
   tmux send-keys -t =agy:0.0 "CODEX LISTO [21A]: Grafo LangGraph PDT-AI-EVALUATOR (GBR + DEA CCR/BCC/Malmquist/Bootstrap + NLP c-TF-IDF/Coseno + LISA/Moran + ARIMA/Chow/ISRI + Checkpointer Human-in-the-Loop) completado y verificado. Solicito auditoria EAF." Enter
   ```
