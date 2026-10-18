# ORDEN DE EJECUCIÓN: `[MOTOR-NEUROSIMBOLICO-AGENTES-IA-PDD-20A]`

**Agente Asignado:** `codex` (`=codex:0.0`)
**Rol:** Arquitecto Backend de Sistemas Multiagente Neurosimbólicos (`LangGraph` + `PydanticAI`)
**Coordinador y Auditor Forense EAF:** `agy` (`=agy:0.0`)
**Rama:** `main` (Única rama autorizada. Política **Zero-Push**: commit local únicamente).
**Ámbito Exclusivo:** `backend/app/modules/compromisos/**`, `backend/tests/**`, `docs/permisos-api.md` y `bridge/02_entrega_codex.md`.
**Aislamiento Estricto:** **PROHIBIDO tocar `src/**` o `bridge/01_tarea_activa.md` / `bridge/02_resultado_agy2.md`** (ámbito exclusivo de `agy2`).

---

## 1. Directriz del Usuario y Objetivo Arquitectónico

El usuario solicitó evolucionar el motor de lectura y diagnóstico de Planes de Desarrollo para que sea un **verdadero motor con agentes inteligentes**.
En `backend/pyproject.toml` ya están instalados **`langgraph>=1.2.12`** y **`pydantic-ai>=2.52.0`** (usados en `backend/app/modules/ia/`), pero `motor_multiagente_pdd.py` tenía únicamente trabajadores deterministas sin grafo `LangGraph`, sin agentes `PydanticAI` con `@agent.tool` y sin capacidad interactiva de lectura semántica o investigación con `Tool-Calling` sobre las **2.734 evidencias (`seguimiento.pdd_evidencia_paginas`)**.

Tu misión en `[MOTOR-NEUROSIMBOLICO-AGENTES-IA-PDD-20A]` es implementar la **Capa Cognitiva Multiagente Neurosimbólica (`LangGraph` + `PydanticAI` + `Tool-Calling` sobre PostgreSQL)** para los Planes de Desarrollo (`5 PDD 2012–2027` + `3 PDL 2024–2027`), combinando **razonamiento semántico real y extracción estructurada** con **invariantes simbólicos estrictos (cero alucinación financiera, citas SHA-256 reales de páginas PDF)**.

---

## 2. Entregables Técnicos Obligatorios

### Entregable 1 — Módulo `backend/app/modules/compromisos/agentes_inteligentes_pdd.py` (`LangGraph` `StateGraph` + `PydanticAI` `Agent` con `@agent.tool`)

1. Construir un sistema multiagente neurosimbólico real usando `langgraph.graph.StateGraph` y `pydantic_ai.Agent` (con `FunctionModel` cognitivo que invoca las tools registradas cuando `POLIS_IA_MODELO` no tiene API key externa, o con el modelo LLM configurado cuando `OPENAI_API_KEY` está presente).
2. Definir **5 herramientas (`@agent.tool`) conectadas a PostgreSQL (`bd_csh`)**:
   - `tool_buscar_evidencia_paginas_pdd`: busca por consulta semántica/palabras clave, `codigo_plan` y/o `archivo` dentro de las `2.734` filas de `seguimiento.pdd_evidencia_paginas`, devolviendo fragmentos reales con `codigo_plan`, `archivo`, `pagina`, `sha256_contenido`, `origen_texto`, `filas_tabla_detectadas` y `extracto_relevante`.
   - `tool_consultar_nodos_mga`: consulta `seguimiento.pdd_lineas_y_programas` filtrando por `codigo_plan`, `grado_frontalidad_sh`, `dimension_sh_primaria` o texto, devolviendo nodos jerárquicos con sus pesos 7D y montos PPI.
   - `tool_consultar_metas_oficiales`: consulta `seguimiento.pdd_metas_oficiales` filtrando por `codigo_plan`, texto o indicador, devolviendo metas de resultado/producto con línea base y meta cuatrienio.
   - `tool_conciliar_ppi_plan`: consulta `seguimiento.planes_desarrollo_distrital` y el desglose `A/B/C/N` + `7 Dimensiones` en pesos corrientes y constantes 2025 (garantizando 0% de invención numérica).
   - `tool_cruzar_actividades_pa_bpim`: cruza metas/nodos `A` y `B` con `seguimiento.actividades_plan_accion` y códigos BPIM / productos MGA-DNP.
3. Implementar **6 Nodos / Agentes Especializados en el `StateGraph` de `LangGraph`** con arista condicional de auto-corrección/verificación:
   - `lector_semantico_documental` (`AgenteLectorSemanticoDocumental` — `PydanticAI`): ejecuta `tool_buscar_evidencia_paginas_pdd` e interpreta las páginas relevantes de los PDFs/OCR.
   - `reconstructor_causal_mga` (`AgenteReconstructorCausalMGA` — `PydanticAI`): ejecuta `tool_consultar_nodos_mga` y `tool_consultar_metas_oficiales`, evaluando la cadena de valor DNP (`Problema -> Línea -> Programa -> Subprograma -> Indicador CREMA`).
   - `taxonomo_neurosimbolico_sh` (`AgenteTaxonomoNeurosimbolicoSH` — `PydanticAI`): razona la clasificación de frontalidad (`A_NUCLEO_FRONTAL`, `B_DETERMINANTE_DIRECTO`, `C_CONTEXTUAL_HABILITANTE`, `N_NO_ASOCIADO_FUNCIONAMIENTO`) y el vector `pesos_7d` en las 7 dimensiones PNUD, explicando la justificación causal.
   - `auditor_financiero_ppi` (`AgenteAuditorFinancieroPPI` — `PydanticAI`): ejecuta `tool_conciliar_ppi_plan` y certifica las cifras exactas corrientes y constantes 2025.
   - `articulador_operativo_bpim` (`AgenteArticuladorOperativoBPIM` — `PydanticAI`): ejecuta `tool_cruzar_actividades_pa_bpim` para vincular con las entidades distritales y códigos BPIM de 13 dígitos.
   - `critico_verificador_forense` (`AgenteCriticoVerificadorForense` — nodo de control condicional en `LangGraph`): verifica que existan citas documentales con `sha256_contenido` real de `pdd_evidencia_paginas` y que las cifras coincidan con `bd_csh`. Si en la primera pasada una consulta específica no trajo citas documentales suficientes, la transición condicional de `LangGraph` re-enruta una iteración adicional de ampliación documental (máximo 2 iteraciones, sin ciclos infinitos) antes de ir a `END`.

---

### Entregable 2 — Tres Nuevos Endpoints en `backend/app/modules/compromisos/router.py` y Registro en `docs/permisos-api.md`

1. **`GET /api/v1/compromisos/triada/pdd-dea/arquitectura-agentes-ia`** (Pública en `docs/permisos-api.md`):
   - Devuelve la especificación viva del motor neurosimbólico:
     - `motor`: `"POLIS_NEUROSIMBOLICO_LANGGRAPH_PYDANTIC_AI_V2"`
     - `orquestador`: `"LangGraph StateGraph"`
     - `framework_agentes`: `"PydanticAI"`
     - `nodos_langgraph`: lista de los 6 agentes con `id_nodo`, `nombre_agente`, `rol`, `herramientas_asignadas`, `esquema_salida`.
     - `aristas_grafo`: lista de transiciones directas y condicionales (`START -> lector_semantico_documental -> ... -> critico_verificador_forense -> END`).
     - `herramientas_registradas`: las 5 `@agent.tool` con su descripción y tabla PostgreSQL subyacente.
     - `corpus_conectado`: `{"evidencias_paginas": 2734, "nodos_mga": 1573, "metas_pdd": 4236, "metas_pdl": 401}`.

2. **`POST /api/v1/compromisos/triada/pdd-dea/consultar-agentes-pdd`** (Pública en `docs/permisos-api.md` para permitir consulta en el visor y tablero interactivo):
   - Request JSON:
     ```json
     {
       "pregunta": "¿Cómo evolucionó la inversión frontal (Grado A y B) en Seguridad Personal y Salud entre el PDD 2012-2015 y el PDD 2024-2027?",
       "codigo_plan": "TODOS",
       "dimension_sh": "TODAS",
       "grado_frontalidad": "TODOS",
       "profundidad": "forense"
     }
     ```
   - Ejecuta el `StateGraph` de `LangGraph` + `PydanticAI` contra la sesión `AsyncSession` y devuelve HTTP 200 con:
     - `run_id`: identificador único de la corrida.
     - `motor`: `"POLIS_NEUROSIMBOLICO_LANGGRAPH_PYDANTIC_AI_V2"`
     - `pregunta`: string consultado.
     - `sintesis_ejecutiva`: respuesta directa, clara y sustentada en datos reales de los planes consultados.
     - `dictamen_forense_detallado`: análisis estructurado comparando los planes relevantes, su evolución programática, financiera y sus metas.
     - `traza_langgraph`: arreglo de los pasos ejecutados por los 6 nodos del `StateGraph`, cada uno con:
       - `orden`: int
       - `nodo_langgraph`: str
       - `agente`: str
       - `razonamiento`: str
       - `herramientas_invocadas`: lista de `{ "herramienta": str, "parametros": dict, "registros_recuperados": int }`
       - `duracion_ms`: float
       - `estado`: `"COMPLETADO"`
     - `citas_evidencia_documental`: lista de evidencias reales recuperadas de `seguimiento.pdd_evidencia_paginas` (`codigo_plan`, `archivo`, `pagina`, `sha256_contenido`, `origen_texto`, `extracto_relevante`).
     - `evidencia_financiera_y_metas`: objeto con `planes_analizados` (montos corrientes, constantes 2025, desglose `A/B/C/N`), `nodos_destacados`, `metas_destacadas` y `articulacion_pa_bpim`.
     - `verificacion_critica`: `{ "aprobado": true, "iteraciones_langgraph": int, "cero_alucinacion_financiera": true, "citas_sha256_verificadas": int, "observacion_verificador": str }`.

3. **`POST /api/v1/compromisos/triada/pdd-dea/interpretar-fragmento-pdd`** (Pública en `docs/permisos-api.md`):
   - Request JSON:
     ```json
     {
       "texto_fragmento": "Programa: Cartagena Sin Hambre y Soberanía Alimentaria. Subprograma: Comedores comunitarios y huertas urbanas. Meta: Reducir del 18,4% al 10,0% la prevalencia de inseguridad alimentaria severa en hogares vulnerables durante el cuatrienio 2024-2027.",
       "codigo_plan_referencia": "PDD_2024_2027",
       "archivo_origen": "pdd_2024_2027_acuerdo_139_oficial.pdf",
       "pagina": 84
     }
     ```
   - Ejecuta los agentes `PydanticAI` de lectura semántica, reconstrucción MGA y taxonomía neurosimbólica para extraer e interpretar en vivo el texto libre/tabla y devuelve HTTP 200 con:
     - `nodos_extraidos`: lista de `{ "nivel": "LINEA" | "PROGRAMA" | "SUBPROGRAMA", "codigo_detectado": str, "nombre": str, "problema_central_inferido": str, "objetivo_mga_inferido": str }`
     - `metas_extraidas`: lista de `{ "tipo_meta": "RESULTADO" | "PRODUCTO", "descripcion_meta": str, "indicador_sugerido": str, "linea_base": str | float | null, "meta_cuatrienio": str | float | null, "evaluacion_crema": { "claro": bool, "relevante": bool, "economico": bool, "medible": bool, "adecuado": bool, "puntaje_crema_pct": float, "observacion_dnp": str } }`
     - `clasificacion_neurosimbolica`: `{ "grado_frontalidad": "A" | "B" | "C" | "N", "etiqueta_frontalidad": str, "dimension_sh_primaria": str, "pesos_7d": dict[str, float], "justificacion_causal_ia": str, "evidencias_homologas_bd": list[dict] }`
     - `articulacion_bpim_sugerida`: `{ "codigo_bpim_sugerido": str, "producto_catalogo_mga_dnp": str, "entidad_responsable_sugerida": str }`
     - `traza_agentes`: pasos ejecutados por `PydanticAI` / `LangGraph`.

4. Además, en `GET /api/v1/compromisos/triada/pdd-dea/estado-sistema-multiagente`, incluir el bloque `"motor_cognitivo_ia": { "activo": true, "orquestador": "LangGraph StateGraph", "framework_agentes": "PydanticAI", "agentes_cognitivos": 6, "herramientas_bd": 5 }` para que el estado general refleje que el motor ya cuenta con la capa de agentes inteligentes.

---

### Entregable 3 — Pruebas Automatizadas, Reinicio y Notificación
1. Crear `backend/tests/test_agentes_inteligentes_pdd.py` probando:
   - `GET /api/v1/compromisos/triada/pdd-dea/arquitectura-agentes-ia` (verifica los 6 nodos `LangGraph` y las 5 tools `@agent.tool`).
   - `POST /api/v1/compromisos/triada/pdd-dea/consultar-agentes-pdd` (verifica que el `StateGraph` se ejecuta, invoca las herramientas contra PostgreSQL, devuelve `traza_langgraph` con los 6 agentes, `citas_evidencia_documental` con `sha256_contenido` real de `pdd_evidencia_paginas`, `evidencia_financiera_y_metas` y `verificacion_critica.aprobado == True`).
   - `POST /api/v1/compromisos/triada/pdd-dea/interpretar-fragmento-pdd` (verifica que extrae nodos MGA, evalúa CREMA, asigna `grado_frontalidad`, `pesos_7d` que suman `1.0` y sugiere BPIM/Producto MGA).
2. Ejecutar y aprobar:
   - `/root/polis/backend/.venv/bin/ruff check` sobre los archivos tocados.
   - `/root/polis/backend/.venv/bin/pytest backend/tests/test_agentes_inteligentes_pdd.py backend/tests/test_motor_multiagente_pdd.py backend/tests/test_pdd_dea_triada.py backend/tests/test_access_policy.py`
3. Reiniciar `polis-backend.service` y comprobar en vivo los 3 nuevos endpoints en `http://127.0.0.1:8000`.
4. Documentar en `bridge/02_entrega_codex.md`, hacer commit local en `main` (sin `git push`) y notificar por `tmux` a `=agy:0.0`:
   ```bash
   tmux send-keys -t =agy:0.0 "CODEX LISTO [20A]: Motor Neurosimbolico LangGraph + PydanticAI para lectura y diagnostico PDD completado y verificado. Solicito auditoria EAF." Enter
   ```
