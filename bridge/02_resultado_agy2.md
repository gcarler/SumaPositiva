# INFORME DE ENTREGA: TAREA `[FRONTEND-CONSOLA-AGENTES-IA-PDD-20B]`
## CONSOLA INTERACTIVA DE AGENTES INTELIGENTES NEUROSIMBÓLICOS (`LANGGRAPH` + `PYDANTIC AI`) E INTÉRPRETE SEMÁNTICO PDD EN `/plataforma/seguimiento`

- **Para:** Coordinador General y Auditor Forense EAF (`agy` / `=agy:0.0`)
- **De:** Desarrollador Principal Frontend POLIS UI y Laboratorio Neurosimbólico de Inteligencia Territorial (`agy2` / `=agy2:0.0`)
- **Fecha:** 18 de octubre de 2026
- **Tarea Reportada:** `[FRONTEND-CONSOLA-AGENTES-IA-PDD-20B]`
- **Rama:** `main` (Política **Zero-Push**: commit local exclusivamente)
- **Aislamiento Estricto:** Se modificaron únicamente archivos dentro de `src/features/seguimiento/**`, `docs/banco-conocimiento-politica-publica.md` y `bridge/02_resultado_agy2.md`. **Cero cambios en `backend/**`, `docs/permisos-api.md` o `bridge/01_tarea_codex.md` / `bridge/02_entrega_codex.md`**.

---

## 🎯 1. Resumen Ejecutivo

Se diseñó, implementó, integró y verificó en `SistemaMultiagentePddPanel` (`src/features/seguimiento/components/sistema-multiagente-pdd-panel.tsx`) el **Bloque 4 (`data-testid="bloque-agentes-inteligentes-langgraph"`): "Motor Cognitivo Neurosimbólico: Agentes Inteligentes `LangGraph` + `PydanticAI` (`Tool-Calling` sobre `2.734` Páginas)"** y los clientes y normalizadores para los 3 nuevos endpoints neurosimbólicos en `src/features/seguimiento/services/plan-accion-dnp-api.ts`:
1. **`obtenerArquitecturaAgentesIaPdd()`** (`GET /api/v1/compromisos/triada/pdd-dea/arquitectura-agentes-ia`) con `normalizarArquitecturaAgentesIaPdd()`.
2. **`consultarAgentesInteligentesPdd(solicitud)`** (`POST /api/v1/compromisos/triada/pdd-dea/consultar-agentes-pdd`) con `normalizarConsultaAgentesPdd()`.
3. **`interpretarFragmentoSemanticoPdd(solicitud)`** (`POST /api/v1/compromisos/triada/pdd-dea/interpretar-fragmento-pdd`) con `normalizarInterpretacionFragmentoPdd()`.

---

## 💻 2. Entregables Técnicos Implementados

### 2.1 Contratos Tipados, Datos Semilla y Clientes con Normalizador en Vivo (`src/features/seguimiento/data/sistema-multiagente-pdd.data.ts` y `src/features/seguimiento/services/plan-accion-dnp-api.ts`)
- **Cero uso de `any`**: Interfaces estrictas para `ArquitecturaAgentesIaPddRespuesta`, `SolicitudConsultaAgentesPdd`, `RespuestaConsultaAgentesPdd`, `SolicitudInterpretarFragmentoPdd` y `RespuestaInterpretacionFragmentoPdd`.
- **Normalizadores resilientes ante el backend vivo y respaldos locales cognitivos**:
  - `normalizarArquitecturaAgentesIaPdd(raw)`: Normaliza los 6 agentes (`AgenteLectorSemanticoDocumental`, `AgenteReconstructorCausalMGA`, `AgenteTaxonomoNeurosimbolicoSH`, `AgenteAuditorFinancieroPPI`, `AgenteArticuladorOperativoBPIM`, `AgenteCriticoVerificadorForense`), las aristas del `StateGraph`, las 5 herramientas `@agent.tool` (`tool_buscar_evidencia_paginas_pdd`, `tool_consultar_nodos_mga`, `tool_consultar_metas_oficiales`, `tool_conciliar_ppi_plan`, `tool_cruzar_actividades_pa_bpim`) y `corpus_conectado`.
  - `normalizarConsultaAgentesPdd(raw, solicitud)`: Normaliza `run_id`, `sintesis_ejecutiva`, `dictamen_forense_detallado`, `traza_langgraph` (6 pasos con `orden`, `nodo_langgraph`, `agente`, `razonamiento`, `herramientas_invocadas`, `duracion_ms`, `estado`), `citas_evidencia_documental` (`codigo_plan`, `archivo`, `pagina`, `sha256_contenido`, `origen_texto`, `extracto_relevante`) y `verificacion_critica` (`aprobado`, `iteraciones_langgraph`, `cero_alucinacion_financiera`, `citas_sha256_verificadas`, `observacion_verificador`).
  - `normalizarInterpretacionFragmentoPdd(raw, solicitud)`: Normaliza `nodos_extraidos`, `metas_extraidas` (convirtiendo `linea_base` y `meta_cuatrienio` numéricos o textuales y validando `evaluacion_crema`), `clasificacion_neurosimbolica` (homologando nombres cortos o largos de dimensión PNUD en `dimension_sh_primaria` y `pesos_7d` a las 7 etiquetas canónicas que suman `1.0`) y `articulacion_bpim_sugerida`.

### 2.2 Bloque 4 en `SistemaMultiagentePddPanel` (`src/features/seguimiento/components/sistema-multiagente-pdd-panel.tsx`)
- **Cinta de Arquitectura Neurosimbólica (`data-testid="cinta-arquitectura-neurosimbolica"`):** Visualiza los 6 agentes cognitivos y simbólicos del `LangGraph StateGraph` y las 5 herramientas `@agent.tool` sobre PostgreSQL (`bd_csh`).
- **Sub-vista 1 — Investigador y Consultor Multiagente sobre los 8 Planes (`data-testid="consola-consulta-agentes-pdd"`):**
  - 4 botones de consultas rápidas preconfiguradas + filtro de Plan (`TODOS` o PDD específico) + `<Input>` de consulta abierta (`data-testid="input-pregunta-agentes-pdd"`) + botón **`Ejecutar Enjambre LangGraph`** (`data-testid="btn-ejecutar-consulta-agentes"`).
  - Muestra la Síntesis Ejecutiva, Dictamen Forense Detallado, Sello del `AgenteCriticoVerificadorForense` (`0% Alucinación Financiera`), línea de tiempo de los 6 pasos de `traza_langgraph` y tarjetas de `citas_evidencia_documental` con página y hash SHA-256.
- **Sub-vista 2 — Intérprete Semántico de Fragmentos PDD en Vivo (`data-testid="consola-interprete-semantico-pdd"`):**
  - Selector de 3 fragmentos reales de prueba (2012 *Campo para Todos*, 2016 *Primero la Gente*, 2024 *Cartagena Ciudad de Derechos*) + `<Textarea>` editable (`data-testid="textarea-fragmento-pdd"`) + botón **`Interpretar con Agentes PydanticAI`** (`data-testid="btn-interpretar-fragmento-pdd"`).
  - Muestra la clasificación `A/B/C/N`, barras de `pesos_7d` en las 7 dimensiones PNUD, justificación causal, nodos MGA extraídos (`Problema MGA` $\rightarrow$ `Objetivo MGA`), metas con evaluación `CREMA` y código BPIM (13 dígitos) / Producto MGA-DNP sugerido.

### 2.3 Pruebas Unitarias y Quality Gates
- **Ampliación de `src/features/seguimiento/__tests__/sistema-multiagente-pdd.test.tsx`**: 11 pruebas en total (añadidas pruebas 9, 10 y 11 para los 3 clientes/normalizadores neurosimbólicos y el renderizado del Bloque 4).
- `bun run ui:check`: **0 violaciones**.
- `bun run check`: **0 errores, 0 warnings** (`ui:check` + `tsc --noEmit` + `eslint .`).
- `bun test`: **742 pass / 0 fail** (76 archivos de prueba).
