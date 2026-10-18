# ORDEN DE EJECUCIÓN: `[FRONTEND-CONSOLA-AGENTES-IA-PDD-20B]`

**Agente Asignado:** `agy2` (`=agy2:0.0`)
**Rol:** Desarrollador Principal Frontend POLIS UI y Laboratorio Neurosimbólico de Inteligencia Territorial
**Coordinador y Auditor Forense EAF:** `agy` (`=agy:0.0`)
**Rama:** `main` (Única rama autorizada. Política **Zero-Push**: commit local únicamente).
**Ámbito Exclusivo:** `src/features/seguimiento/**`, `docs/banco-conocimiento-politica-publica.md` y `bridge/02_resultado_agy2.md`.
**Aislamiento Estricto:** **PROHIBIDO tocar `backend/**`, `docs/permisos-api.md` o `bridge/01_tarea_codex.md` / `bridge/02_entrega_codex.md`** (ámbito exclusivo de `codex`).

---

## 1. Contexto y Objetivo de la Misión

El motor de lectura y diagnóstico de Planes de Desarrollo está evolucionando en la Fase 20 a un **Motor Multiagente Neurosimbólico Inteligente (`LangGraph StateGraph` + `PydanticAI` + `Tool-Calling` sobre las `2.734` evidencias documentales en PostgreSQL)**.

Mientras `codex` expone los 3 nuevos endpoints en el backend (`arquitectura-agentes-ia`, `consultar-agentes-pdd` e `interpretar-fragmento-pdd`), tu misión en `[FRONTEND-CONSOLA-AGENTES-IA-PDD-20B]` es **incorporar en `/plataforma/seguimiento` (dentro de `SistemaMultiagentePddPanel`) la Consola Interactiva de Agentes Inteligentes Neurosimbólicos PDD/PDL (`LangGraph` + `PydanticAI`)**, permitiendo al usuario:
1. **Visualizar el Grafo Multiagente `LangGraph` + `PydanticAI`** (los 6 nodos cognitivos y las 5 herramientas `@agent.tool` conectadas a `bd_csh`).
2. **Consultar e Investigar en Vivo los 8 Planes (`POST /consultar-agentes-pdd`):** Hacer preguntas abiertas o seleccionar consultas estratégicas sobre los 5 PDD (`2012–2027`) y 3 PDL (`2024–2027`), observando paso a paso la **Traza de Razonamiento `LangGraph`**, las **Herramientas `@agent.tool` invocadas**, las **Citas Documentales Verificadas con página y SHA-256** y el **Dictamen del Crítico Verificador Forense (`0% alucinación financiera`)**.
3. **Probar el Intérprete Semántico de Fragmentos PDD en Vivo (`POST /interpretar-fragmento-pdd`):** Pegar o cargar cualquier párrafo/tabla de un Plan de Desarrollo y ver cómo los agentes `PydanticAI` extraen automáticamente la jerarquía MGA (`Programa/Subprograma`), evalúan el filtro `CREMA` del indicador, razonan el Grado de Frontalidad (`A/B/C/N`), calculan el vector `pesos_7d` (7 Dimensiones PNUD) y sugieren el código BPIM y Producto MGA-DNP.

---

## 2. Entregables Técnicos Obligatorios

### Entregable 1 — Contratos Tipados, Datos Semilla y Clientes con Normalizador En Vivo (`src/features/seguimiento/data/sistema-multiagente-pdd.data.ts` y `src/features/seguimiento/services/plan-accion-dnp-api.ts`)

1. Definir las interfaces TypeScript estrictas (cero `any`) y funciones normalizadoras para los 3 nuevos endpoints del motor neurosimbólico:
   - **`obtenerArquitecturaAgentesIaPdd()`** $\rightarrow$ `GET /api/v1/compromisos/triada/pdd-dea/arquitectura-agentes-ia`:
     - Normaliza `motor`, `orquestador` (`"LangGraph StateGraph"`), `framework_agentes` (`"PydanticAI"`), `nodos_langgraph` (los 6 agentes: `AgenteLectorSemanticoDocumental`, `AgenteReconstructorCausalMGA`, `AgenteTaxonomoNeurosimbolicoSH`, `AgenteAuditorFinancieroPPI`, `AgenteArticuladorOperativoBPIM`, `AgenteCriticoVerificadorForense`), `herramientas_registradas` (las 5 `@agent.tool`: `tool_buscar_evidencia_paginas_pdd`, `tool_consultar_nodos_mga`, `tool_consultar_metas_oficiales`, `tool_conciliar_ppi_plan`, `tool_cruzar_actividades_pa_bpim`) y `corpus_conectado`.
   - **`consultarAgentesInteligentesPdd(solicitud)`** $\rightarrow$ `POST /api/v1/compromisos/triada/pdd-dea/consultar-agentes-pdd`:
     - Envía `{ pregunta, codigo_plan, dimension_sh, grado_frontalidad, profundidad }` y normaliza el resultado (`normalizarConsultaAgentesPdd(raw, solicitud)`), mapeando tanto la respuesta real del backend como el motor cognitivo local de respaldo si el backend está reiniciando:
       - `run_id`, `motor`, `pregunta`, `sintesis_ejecutiva`, `dictamen_forense_detallado`
       - `traza_langgraph`: arreglo de los 6 pasos con `orden`, `nodo_langgraph`, `agente`, `razonamiento`, `herramientas_invocadas` (`herramienta`, `registros_recuperados`), `duracion_ms`, `estado`.
       - `citas_evidencia_documental`: arreglo con `codigo_plan`, `archivo`, `pagina`, `sha256_contenido`, `origen_texto`, `extracto_relevante`.
       - `verificacion_critica`: `{ aprobado, iteraciones_langgraph, cero_alucinacion_financiera, citas_sha256_verificadas, observacion_verificador }`.
   - **`interpretarFragmentoSemanticoPdd(solicitud)`** $\rightarrow$ `POST /api/v1/compromisos/triada/pdd-dea/interpretar-fragmento-pdd`:
     - Envía `{ texto_fragmento, codigo_plan_referencia, archivo_origen, pagina }` y normaliza el resultado (`normalizarInterpretacionFragmentoPdd(raw, solicitud)`):
       - `nodos_extraidos` (`nivel`, `codigo_detectado`, `nombre`, `problema_central_inferido`, `objetivo_mga_inferido`)
       - `metas_extraidas` (`tipo_meta`, `descripcion_meta`, `indicador_sugerido`, `linea_base`, `meta_cuatrienio`, `evaluacion_crema` con `claro`, `relevante`, `economico`, `medible`, `adecuado`, `puntaje_crema_pct`, `observacion_dnp`)
       - `clasificacion_neurosimbolica` (`grado_frontalidad`, `etiqueta_frontalidad`, `dimension_sh_primaria`, `pesos_7d`, `justificacion_causal_ia`)
       - `articulacion_bpim_sugerida` (`codigo_bpim_sugerido`, `producto_catalogo_mga_dnp`, `entidad_responsable_sugerida`).

### Entregable 2 — Bloque 4 en `SistemaMultiagentePddPanel` (`src/features/seguimiento/components/sistema-multiagente-pdd-panel.tsx`)

1. Añadir en `SistemaMultiagentePddPanel` el **Bloque 4 (`data-testid="bloque-agentes-inteligentes-langgraph"`): "Motor Cognitivo Neurosimbólico: Agentes Inteligentes `LangGraph` + `PydanticAI` (`Tool-Calling` sobre `2.734` Páginas)"** con:
   - ** Cinta de Arquitectura Neurosimbólica:** Muestra los **6 Agentes Cognitivos (`PydanticAI`)** encadenados en el **`StateGraph` de `LangGraph`** y sus **5 herramientas `@agent.tool`** conectadas a PostgreSQL (`bd_csh`), destacando la separación entre la **Capa Cognitiva (Lectura Semántica, Inferencia Causal MGA y Razonamiento de Seguridad Humana)** y la **Capa Simbólica (Cero Alucinación Financiera ±$1 COP y Verificación Criptográfica SHA-256)**.
   - **Sub-vista 1 — Investigador y Consultor Multiagente sobre los 8 Planes (`data-testid="consola-consulta-agentes-pdd"`):**
     - Botones de consultas rápidas preconfiguradas (ej. *"Evolución de inversión frontal A+B 2012–2027"*, *"Comparativo de Seguridad Personal y Convivencia en los 5 PDD"*, *"Brechas de Seguridad Alimentaria y Salud Pública"*, *"Articulación de los 3 PDL con el PDD 2024–2027"*) + input de consulta abierta, selector de Plan (`TODOS` o un PDD/PDL específico) y botón **`Ejecutar Enjambre LangGraph`** (`data-testid="btn-ejecutar-consulta-agentes"`).
     - Panel de resultados mostrando:
       - **Síntesis Ejecutiva y Dictamen Forense Detallado**.
       - **Traza de Razonamiento `LangGraph` (6 Nodos):** línea de tiempo de los 6 agentes mostrando su razonamiento, las tools `@agent.tool` invocadas y el sello del `AgenteCriticoVerificadorForense` (`Cero Alucinación Financiera · Citas SHA-256 Verificadas`).
       - **Citas Documentales Extraídas (`seguimiento.pdd_evidencia_paginas`):** tarjetas con `archivo`, `página`, `hash SHA-256` y el extracto textual de la fuente.
   - **Sub-vista 2 — Intérprete Semántico de Fragmentos PDD en Vivo (`data-testid="consola-interprete-semantico-pdd"`):**
     - Selector de 3 fragmentos reales de prueba (2012 *Campo para Todos*, 2016 *Primero la Gente*, 2024 *Cartagena Ciudad de Derechos*) + `textarea` editable y botón **`Interpretar con Agentes PydanticAI`** (`data-testid="btn-interpretar-fragmento-pdd"`).
     - Muestra los **Nodos MGA Extraídos** (`Problema Central Inferido` $\rightarrow$ `Objetivo MGA`), las **Metas e Indicadores con Evaluación `CREMA`**, la **Clasificación Neurosimbólica `A/B/C/N` + barras de `pesos_7d` + Justificación Causal de la IA** y el **Código BPIM (13 dígitos) / Producto MGA-DNP sugerido**.

### Entregable 3 — Pruebas Unitarias y Quality Gates
1. Ampliar `src/features/seguimiento/__tests__/sistema-multiagente-pdd.test.tsx` con pruebas para:
   - Normalizadores en vivo de `consultarAgentesInteligentesPdd` e `interpretarFragmentoSemanticoPdd`.
   - Renderizado e interacción con el nuevo **Bloque 4 (`bloque-agentes-inteligentes-langgraph`)**, ejecución de una consulta a los agentes `LangGraph` y uso del intérprete semántico de fragmentos PDD.
2. Ejecutar y pasar al 100%:
   - `bun run ui:check` (0 violaciones)
   - `bun run check` (TypeScript + ESLint 0 errores)
   - `bun test` (100% en verde)
3. Documentar en `bridge/02_resultado_agy2.md`, hacer commit local en `main` (sin `git push`) y notificar de inmediato por `tmux` a `=agy:0.0`:
   ```bash
   tmux send-keys -t =agy:0.0 "AGY2 LISTO [20B]: Consola Frontend de Agentes Inteligentes Neurosimbolicos (LangGraph + PydanticAI) completada y verificada. Solicito auditoria EAF." Enter
   ```
