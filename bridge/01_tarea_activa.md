# ORDEN DE EJECUCIÓN: `[BANCO-CONOCIMIENTO-PROYECTOS-INVERSION-PUBLICA-MGA-15B]`

**Agente Asignado:** `agy2` (`=agy2:0.0`)
**Rol:** Desarrollador Principal Frontend y Curador del Banco de Conocimiento POLIS
**Rama:** `main` (Política **Zero-Push**: solo commit local, prohibido `git push`)
**Prioridad:** INMEDIATA (Solicitud directa del usuario: *"dile a agy2 que alimente el banco de concimiento con información de como estrucutran y formulan proyectos de inversión publica"*)

---

## 1. Contexto y Objetivo

El usuario solicitó alimentar el **Banco de Conocimiento** de la plataforma **POLIS** con información técnica rigurosa, exhaustiva y pedagógica sobre **cómo se estructuran y formulan los Proyectos de Inversión Pública en Colombia** bajo los estándares del **Departamento Nacional de Planeación (DNP)**, la **Metodología General Ajustada (MGA Web)**, la **Cadena de Valor Pública**, el **Catálogo de Productos DNP**, la **Evaluación Ex-Ante (VNA/TIR/CAE con TSD 12%)** y el ciclo **BPIM / BPIN / SUIFP / POAI**.

Debes alimentar **tanto el repositorio documental/RAG del Banco de Conocimiento** (`knowledge-base/` y `docs/banco-conocimiento-politica-publica.md`) **como la vista interactiva del Banco de Conocimiento DNP en el Frontend** (`src/features/seguimiento/services/plan-accion-dnp-api.ts` y `src/features/seguimiento/components/banco-conocimiento-dnp-tab.tsx`).

> **RESTRICCIÓN DE AISLAMIENTO:** No modifiques ningún archivo dentro de `backend/**` ni `bridge/01_tarea_codex.md` o `bridge/02_entrega_codex.md`, ya que `codex` está trabajando en paralelo.

---

## 2. Entregables Requeridos

### Entregable A — Nuevo Módulo Canónico en `knowledge-base/` y actualización de Índice y Doctrina
1. Crear `/root/polis/knowledge-base/12_ESTRUCTURACION_PROYECTOS_INVERSION_PUBLICA_MGA_DNP.md` con desarrollo técnico exhaustivo de:
   - **Marco Normativo de la Inversión Pública en Colombia:** Ley 152 de 1994 (Art. 27 y 49 — Bancos de Programas y Proyectos), Decreto 111 de 1996 (Estatuto Orgánico del Presupuesto), Decreto 1082 de 2015, Ley 2056 de 2020 (Sistema General de Regalías — SGR) y Manual Conceptual de la MGA del DNP.
   - **Los 4 Módulos Oficiales de la Metodología General Ajustada (MGA Web del DNP):**
     1. **Módulo 1 — Identificación:**
        - Articulación con el Plan Nacional de Desarrollo (PND), Plan de Desarrollo Distrital/Municipal (PDD) y Política Pública (Programa y Subprograma presupuestal).
        - Problemática: Árbol de Problemas (Problema Central como situación negativa verificable, Causas Directas, Causas Indirectas, Efectos Directos, Efectos Indirectos).
        - Análisis de Participantes / Involucrados (Beneficiarios, Cooperantes, Oponentes, Perjudicados) y concertación comunitaria.
        - Población Afectada vs. Población Objetivo (cuantificación DANE/Sisbén IV/Terridata, criterios de focalización etaria, territorial y diferencial).
        - Árbol de Objetivos: transformación positiva (Problema Central $\rightarrow$ Objetivo General con verbo en infinitivo; Causas $\rightarrow$ Objetivos Específicos / Medios; Efectos $\rightarrow$ Fines).
        - Identificación y preselección de Alternativas de Solución.
     2. **Módulo 2 — Preparación de la Alternativa:**
        - Estudio de Necesidades (Balance Oferta vs. Demanda y cálculo del **Déficit de Atención** del bien o servicio público).
        - Estudio Técnico, de Localización y Ambiental (macrolocalización y microlocalización territorial en Localidades, Unidades Comuneras de Gobierno y Corregimientos).
        - Análisis de Riesgos de Desastres y Climáticos (Matriz de Probabilidad $\times$ Impacto en fases de preinversión, inversión y operación).
        - **Estructuración de la Cadena de Valor del Proyecto:**
          $$\text{Insumos (Inputs)} \longrightarrow \text{Actividades} \longrightarrow \text{Productos (Catálogo MGA-DNP)} \longrightarrow \text{Resultados (Outcomes)} \longrightarrow \text{Impactos}$$
        - Regla estricta del **Catálogo Único de Productos del DNP**: un Producto es el bien o servicio entregado a la ciudadanía (nunca una actividad interna ni un insumo), con su Indicador de Producto estandarizado y unidad de medida oficial.
        - Costeo detallado por Actividades e Insumos (precios de mercado, horizonte de evaluación: preinversión, inversión/ejecución y operación/sostenibilidad).
        - Cuantificación y Valoración de Ingresos y Beneficios Sociales (Precios de Mercado vs. Precios Cuenta / Razones Precio-Cuenta RPC del DNP).
     3. **Módulo 3 — Evaluación Ex-Ante (Financiera, Económica y Social):**
        - Flujo de Caja a precios constantes y conversión a precios sombra/cuenta.
        - **Tasa Social de Descuento (TSD = 12% anual en Colombia según DNP)**.
        - Indicadores de Decisión según tipología de proyecto:
          - **Valor Presente Neto Económico/Social ($\text{VPNE} / \text{VNA}$)** y **Tasa Interna de Retorno Social ($\text{TIRS}$)** para proyectos con beneficios monetizables.
          - **Relación Beneficio-Costo ($\text{RBC} \ge 1$)**.
          - **Costo Anual Equivalente ($\text{CAE}$)** y **Análisis Costo-Efectividad ($\text{ACE}$ / Costo por Beneficiario o Costo por Unidad de Producto)** para proyectos sociales y de Seguridad Humana cuyos beneficios no son fácilmente monetizables.
     4. **Módulo 4 — Programación y Matriz de Marco Lógico:**
        - Selección de Indicadores de Producto, Indicadores de Gestión e Indicadores de Resultado (filtro de calidad **CREMA**: Claro, Relevante, Económico, Medible, Adecuado).
        - Programación de Fuentes de Financiación por Vigencia (ICLD, SGP, SGR, Crédito, Cofinanciación Nacional, Cooperación Internacional) y Clasificador Presupuestal (Catálogo de Clasificación Presupuestal — CCP).
        - **Matriz de Marco Lógico (4 filas $\times$ 4 columnas):** Fin, Propósito (Objetivo General), Componentes (Productos) y Actividades vs. Resumen Narrativo, Indicadores Objetivamente Verificables, Medios de Verificación y Supuestos Críticos.
   - **Ciclo Institucional de Viabilidad y Banco de Proyectos (BPIM / BPIN / SUIFP / POAI):**
     - Paso del proyecto formulado en MGA Web al Banco Distrital de Programas y Proyectos de Inversión (BPIM en Cartagena — código de 13 dígitos), verificación de requisitos técnicos, jurídicos, financieros y sectoriales (Ficha EBI), inclusión en el **POAI (Plan Operativo Anual de Inversiones)**, armonización con el **Plan Indicativo** y desagregación anual en el **Plan de Acción**.
   - **Plantillas Modelo de Proyectos MGA aplicadas a Seguridad Humana en Cartagena:**
     - Al menos 3 fichas modelo completas (1. Infraestructura tecnológica y entornos seguros de convivencia; 2. Prevención social de violencias y jóvenes en riesgo; 3. Justicia cercana al ciudadano y Casas de Justicia / Mediación Comunitaria rural e insular) con su Cadena de Valor completa.
2. Actualizar `/root/polis/knowledge-base/00_INDICE_MAESTRO.md` (incluyendo los módulos 11 y 12 en la tabla maestra), `/root/polis/knowledge-base/03_METODOLOGIA_DNP_CONPES_MGA.md` y `/root/polis/docs/banco-conocimiento-politica-publica.md` (añadiendo la sección de Estructuración y Formulación de Proyectos de Inversión Pública MGA-DNP y su correspondencia con POLIS).

### Entregable B — Expansión Interactiva del Banco de Conocimiento en la UI (`BancoConocimientoDNPTab`)
1. En `/root/polis/src/features/seguimiento/services/plan-accion-dnp-api.ts`:
   - Extender la interfaz `BancoConocimientoDNP` y la constante `BANCO_CONOCIMIENTO_CANONICO` (con tipos opcionales o retrocompatibles si el backend no devuelve las llaves nuevas, haciendo fallback automático a `BANCO_CONOCIMIENTO_CANONICO`) agregando:
     - `modulos_mga_estructuracion`: Los 4 módulos oficiales de la MGA Web (`1. Identificación`, `2. Preparación`, `3. Evaluación Ex-Ante`, `4. Programación`) con sus subetapas, entregables técnicos, errores frecuentes a evitar y regla de oro DNP.
     - `cadena_valor_proyecto_mga`: Los 5 eslabones de la Cadena de Valor (`Insumos`, `Actividades`, `Productos`, `Resultados`, `Impactos`) con definición técnica DNP, regla de formulación y ejemplo aplicado a Seguridad Humana en Cartagena.
     - `criterios_evaluacion_ex_ante`: Los 4 criterios técnicos (`VPN Social / TSD 12%`, `TIR Social`, `Costo-Efectividad / CAE`, `Relación Beneficio-Costo RBC`) con fórmula, umbral de viabilidad y cuándo usar cada uno.
     - `plantillas_proyectos_seguridad_humana`: 3 fichas modelo de proyectos de inversión MGA/BPIM estructurados para Seguridad Humana en Cartagena (código BPIM, sector MGA, programa, problema central, objetivo general, producto MGA, indicador de producto, actividades clave y fuente de financiación).
2. En `/root/polis/src/features/seguimiento/components/banco-conocimiento-dnp-tab.tsx`:
   - Renderizar la **Sección 5: "5. Estructuración y Formulación de Proyectos de Inversión Pública (Metodología MGA-DNP y Cadena de Valor BPIM/BPIN)"** con diseño impecable (cumpliendo 100% Kit UI Rules y tokens semánticos):
     - Selector interactivo de los **4 Módulos de la MGA Web** (`Módulo 1: Identificación`, `Módulo 2: Preparación`, `Módulo 3: Evaluación Ex-Ante`, `Módulo 4: Programación`) mostrando sus subetapas, entregables obligatorios, regla de oro y errores comunes rechazados por Planeación/Banco de Proyectos.
     - Visualizador horizontal de los **5 Eslabones de la Cadena de Valor MGA** (`Insumos → Actividades → Productos → Resultados → Impactos`).
     - Tarjetas de **Criterios de Evaluación Ex-Ante (TSD 12%, VPN Social, CAE/ACE, RBC)** y **Fichas Modelo de Proyectos MGA de Seguridad Humana en Cartagena**.
3. En `/root/polis/src/features/seguimiento/components/motor-plan-accion.test.tsx`:
   - Añadir pruebas unitarias verificando que `BancoConocimientoDNPTab` renderiza la nueva Sección 5 de Estructuración y Formulación de Proyectos de Inversión Pública (los 4 módulos MGA, la Cadena de Valor de 5 eslabones, los criterios de Evaluación Ex-Ante con TSD 12% y las plantillas de proyectos BPIM/MGA).

---

## 3. Controles de Calidad Obligatorios

1. `node scripts/ui-policy.mjs` $\rightarrow$ 0 violaciones.
2. `./node_modules/.bin/tsc --noEmit` $\rightarrow$ 0 errores.
3. `./node_modules/.bin/eslint src/features/seguimiento/components/banco-conocimiento-dnp-tab.tsx src/features/seguimiento/services/plan-accion-dnp-api.ts src/features/seguimiento/components/motor-plan-accion.test.tsx` $\rightarrow$ 0 errores y 0 warnings.
4. `bun test src/features/seguimiento/components/motor-plan-accion.test.tsx` $\rightarrow$ 100% pass.
5. `./node_modules/.bin/next build` y reinicio de `polis-frontend.service` si aplica.
6. Documentar la entrega en `/root/polis/bridge/02_resultado_agy2.md` y realizar commit local en `main` (**Zero-Push**).
