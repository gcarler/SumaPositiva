# INFORME DE ENTREGA: TAREA [BANCO-CONOCIMIENTO-PROYECTOS-INVERSION-PUBLICA-MGA-15B]
## ALIMENTACIÓN DOCTRINAL Y PEDAGÓGICA DEL BANCO DE CONOCIMIENTO: ESTRUCTURACIÓN Y FORMULACIÓN DE PROYECTOS DE INVERSIÓN PÚBLICA (MGA-DNP, CADENA DE VALOR PÚBLICA, EVALUACIÓN EX-ANTE TSD 12% Y BPIM/BPIN)

- **Para:** Coordinador General y Auditor Forense EAF (`agy`)
- **De:** Desarrollador Principal Frontend y Curador del Banco de Conocimiento POLIS (`agy2`)
- **Fecha:** 16 de octubre de 2026
- **Tarea Reportada:** `[BANCO-CONOCIMIENTO-PROYECTOS-INVERSION-PUBLICA-MGA-15B]`
- **Referencias:** `bridge/01_tarea_activa.md`, `knowledge-base/12_ESTRUCTURACION_PROYECTOS_INVERSION_PUBLICA_MGA_DNP.md`, `docs/banco-conocimiento-politica-publica.md`
- **Política de Control de Versiones:** **Zero-Push Estricta** (Commit exclusivamente local en rama `main`, prohibido `git push`).
- **Aislamiento y Concurrencia:** Estricto respeto al ámbito de `codex`. Cero modificaciones en `backend/**`, `bridge/01_tarea_codex.md` o `bridge/02_entrega_codex.md`.

---

## 🎯 1. Resumen Ejecutivo de la Misión

En atención a la directriz prioritaria del usuario (*"alimentar el banco de conocimiento con información de cómo estructuran y formulan proyectos de inversión pública"*), se completó con rigor canónico y exhaustividad metodológica la alimentación tanto del **acervo documental / RAG del Banco de Conocimiento POLIS** como de la **interfaz interactiva del Banco de Conocimiento DNP** en `/plataforma/seguimiento`.

Se incorporó la doctrina completa de estructuración y formulación de Proyectos de Inversión Pública en Colombia conforme a los lineamientos del **Departamento Nacional de Planeación (DNP)**, la **Metodología General Ajustada (MGA Web)**, la **Cadena de Valor Pública**, el **Catálogo de Productos DNP**, los criterios de **Evaluación Ex-Ante (VNA/TIR/CAE con Tasa Social de Descuento TSD del 12% anual)** y el ciclo presupuestal **MGA $\rightarrow$ BPIM (código distrital de 13 dígitos) $\rightarrow$ Ficha EBI $\rightarrow$ POAI $\rightarrow$ Plan Indicativo $\rightarrow$ Plan de Acción**.

---

## 📚 2. Entregables Documentales y RAG (`knowledge-base/` y `docs/`)

### 2.1 Nuevo Módulo Canónico 12 (`knowledge-base/12_ESTRUCTURACION_PROYECTOS_INVERSION_PUBLICA_MGA_DNP.md`)
Se redactó un documento maestro de 360 líneas estructurado en 6 capítulos técnicos:
1. **Marco Normativo y Conceptual:**
   - Ley 152 de 1994 (Estatuto Orgánico de Planeación, Arts. 27 y 49 — Bancos de Programas y Proyectos).
   - Decreto 111 de 1996 (Estatuto Orgánico del Presupuesto).
   - Decreto 1082 de 2015 y Ley 2056 de 2020 (Sistema General de Regalías — SGR).
   - Definición canónica del DNP de Proyecto de Inversión Pública como unidad operacional de intervención limitada en tiempo, recursos y espacio para solucionar un problema central.
2. **Los 4 Módulos Oficiales de la MGA Web del DNP:**
   - **Módulo 1 — Identificación:** Articulación con PND/PDD/Políticas Públicas; Árbol de Problemas (regla de oro: formular el problema como situación negativa verificable y nunca como ausencia de solución preconcebida); Análisis de Involucrados; Población Afectada vs. Objetivo (cuantificación DANE/Sisbén IV); Árbol de Objetivos y preselección de alternativas.
   - **Módulo 2 — Preparación:** Estudio de necesidades y balance Oferta vs. Demanda (déficit de atención); Estudio técnico, microlocalización territorial y ambiental; Análisis de riesgos (Probabilidad $\times$ Impacto); **Estructuración de la Cadena de Valor** y regla taxativa del Catálogo Único de Productos DNP; costeo a precios de mercado y conversión a precios sombra / razones precio-cuenta (RPC).
   - **Módulo 3 — Evaluación Ex-Ante:** Flujo de caja neto social a precios constantes; **Tasa Social de Descuento (TSD = 12% anual)**; Criterios de decisión: Valor Presente Neto Económico/Social ($\text{VPNE} \ge 0$), Tasa Interna de Retorno Social ($\text{TIRS} \ge 12\%$), Relación Beneficio-Costo ($\text{RBC} \ge 1$), Costo Anual Equivalente ($\text{CAE}$) y Análisis Costo-Efectividad ($\text{ACE}$) para intervenciones no monetizables en Seguridad Humana.
   - **Módulo 4 — Programación y Matriz de Marco Lógico:** Indicadores de Producto y Gestión bajo filtro **CREMA**; Clasificador Presupuestal (CCP); Fuentes de financiación por vigencia (ICLD, SGP, SGR, Crédito, Cofinanciación); Matriz de Marco Lógico (4 niveles $\times$ 4 columnas).
3. **La Cadena de Valor Pública del DNP:**
   $$\text{Insumos (Inputs)} \longrightarrow \text{Actividades} \longrightarrow \text{Productos (Catálogo DNP)} \longrightarrow \text{Resultados (Outcomes)} \longrightarrow \text{Impactos}$$
4. **Ciclo Institucional:** MGA Web $\rightarrow$ Banco Distrital de Programas y Proyectos de Inversión (BPIM de Cartagena, estructura canónica de 13 dígitos) $\rightarrow$ Viabilidad y Registro en Ficha EBI $\rightarrow$ POAI $\rightarrow$ Plan Indicativo $\rightarrow$ Plan de Acción (Hoja 1 Matriz DNP).
5. **Tres Plantillas Modelo MGA/BPIM para Seguridad Humana en Cartagena:**
   - **BPIM `2026130010021`:** Fortalecimiento de la red de videovigilancia con analítica LPR y centros de monitoreo local ($4.850M COP).
   - **BPIM `2026130010042`:** Prevención integral de violencias y proyectos de vida para jóvenes en riesgo de pandillismo ($2.600M COP).
   - **BPIM `2026130010058`:** Justicia cercana y mecanismos comunitarios de conciliación en corregimientos e islas ($1.750M COP).
6. **Errores Críticos a Evitar:** Catálogo de causales frecuentes de devolución por parte de Secretarías de Planeación y Bancos de Proyectos.

### 2.2 Actualización de `knowledge-base/00_INDICE_MAESTRO.md`
- Se incorporaron formalmente en la tabla maestra los módulos 11 (Cierre Documental y Sincronización Google Workspace) y 12 (Estructuración y Formulación MGA DNP).
- Se reforzaron los Principios Rectores 2 (*Rigor del Marco Lógico y Cadena de Valor MGA DNP*) y 4 (*Evaluación Ex-Ante Multidimensional con TSD 12%*).

### 2.3 Actualización de `knowledge-base/03_METODOLOGIA_DNP_CONPES_MGA.md`
- Se agregó la Sección 6 completa: *"De la Política Pública al Proyecto de Inversión Pública MGA Web del DNP"*, conectando las guías CONPES con la formulación en MGA Web y la matriz del Plan de Acción.

### 2.4 Actualización de `docs/banco-conocimiento-politica-publica.md`
- Se integró la Sección 7: *"Estructuración y Formulación de Proyectos de Inversión Pública MGA-DNP"* y se actualizó la matriz de correspondencia técnica de la Sección 6 con el nuevo módulo 12.

---

## 💻 3. Entregables Frontend y Capa Interactiva (`src/**`)

### 3.1 Servicios y Tipado Canónico (`src/features/seguimiento/services/plan-accion-dnp-api.ts`)
- Se crearon las interfaces de TypeScript:
  - `SubetapaMGA`
  - `ModuloMGAEstructuracion`
  - `EslabonCadenaValorMGA`
  - `CriterioEvaluacionExAnteMGA`
  - `PlantillaProyectoMGA`
- Se amplió la interfaz `BancoConocimientoDNP` con las 4 propiedades especializadas:
  - `modulos_mga_estructuracion`
  - `cadena_valor_proyecto_mga`
  - `criterios_evaluacion_ex_ante`
  - `plantillas_proyectos_seguridad_humana`
- Se nutrió `BANCO_CONOCIMIENTO_CANONICO` con los 4 módulos MGA, los 5 eslabones de la cadena de valor, los 4 criterios de evaluación económica y social con TSD 12% y las 3 plantillas BPIM de Cartagena.
- En `obtenerBancoConocimientoApi()`, se implementó fallback y merge transparente para garantizar retrocompatibilidad ante respuestas de backend que no incluyan aún estos campos.

### 3.2 Componente Interactivo (`src/features/seguimiento/components/banco-conocimiento-dnp-tab.tsx`)
Se diseñó e implementó la **Sección 5: "5. Estructuración y Formulación de Proyectos de Inversión Pública (Metodología MGA-DNP y Cadena de Valor BPIM/BPIN)"** (`data-testid="seccion-mga-proyectos-inversion"`):
1. **5.1 Selector Interactivo de los 4 Módulos Oficiales de la MGA Web:**
   - Botones semánticos (`@/shared/ui/button`) accesibles con badges de estado.
   - Panel dinámico con Subetapas numeradas, Entregables Obligatorios para viabilidad, Regla de Oro del DNP y Errores Comunes de formulación que causan rechazo.
2. **5.2 Visualizador Horizontal de la Cadena de Valor Pública:**
   - Representación en 5 pasos secuenciales (`Insumos` $\rightarrow$ `Actividades` $\rightarrow$ `Productos` $\rightarrow$ `Resultados` $\rightarrow$ `Impactos`).
   - Detalle de la regla de formulación DNP, unidad de medida oficial y ejemplo contextualizado en Seguridad Humana de Cartagena para cada eslabón.
3. **5.3 Criterios de Evaluación Ex-Ante:**
   - Tarjetas técnicas para Tasa Social de Descuento (TSD = 12% anual), Valor Presente Neto Económico/Social (VPNE), Tasa Interna de Retorno Social (TIRS), Costo Anual Equivalente y Análisis Costo-Efectividad (CAE/ACE) y Relación Beneficio-Costo (RBC).
   - Fórmulas matemáticas, umbrales de aprobación y ámbito de aplicación técnica.
4. **5.4 Selector y Visor de Plantillas de Proyectos BPIM Modelo:**
   - Conmutador interactivo entre los proyectos modelo `2026130010021`, `2026130010042` y `2026130010058`.
   - Ficha técnica completa con problema central, objetivo general, producto MGA codificado, indicador DNP, costo en millones COP, entidad responsable y actividades clave de ejecución.

### 3.3 Suite de Pruebas Unitarias (`src/features/seguimiento/components/motor-plan-accion.test.tsx`)
Se agregaron 4 pruebas unitarias específicas al bloque de `BancoConocimientoDNPTab`:
- Renderizado de la Sección 5 MGA-DNP y su encabezado formal.
- Renderizado interactivo de los 4 módulos MGA con subetapas, entregables y reglas de oro.
- Renderizado de los 5 eslabones de la Cadena de Valor con ejemplos de Cartagena.
- Renderizado de los criterios de evaluación ex-ante (TSD 12%, VPNE, CAE/ACE, RBC) y el visor de plantillas BPIM.

---

## 🛡️ 4. Resultados de Controles de Calidad Obligatorios

| Puerta de Calidad | Comando Ejecutado | Resultado | Estado |
|---|---|---|:---:|
| **Kit UI Rules & a11y** | `node scripts/ui-policy.mjs` | 0 violaciones | ✅ APROBADO |
| **TypeScript Typecheck** | `./node_modules/.bin/tsc --noEmit` | 0 errores | ✅ APROBADO |
| **ESLint** | `./node_modules/.bin/eslint src/features/seguimiento/components/banco-conocimiento-dnp-tab.tsx src/features/seguimiento/services/plan-accion-dnp-api.ts src/features/seguimiento/components/motor-plan-accion.test.tsx` | 0 errores, 0 warnings | ✅ APROBADO |
| **Pruebas Motor y Banco** | `bun test src/features/seguimiento/components/motor-plan-accion.test.tsx` | 19 tests pasados, 275 aserciones, 0 fallos | ✅ APROBADO |
| **Pruebas Módulo Seguimiento** | `bun test src/features/seguimiento/` | 181 tests pasados en 8 archivos, 0 fallos | ✅ APROBADO |
| **Compilación de Producción** | `./node_modules/.bin/next build` | Compilado exitoso en 7.3s, 210/210 rutas estáticas | ✅ APROBADO |
| **Servicio del Frontend** | `systemctl restart polis-frontend.service` | `active` (running) | ✅ APROBADO |

---

## 🔒 5. Estado de Control de Versiones (Zero-Push)

- Todos los archivos correspondientes a la tarea fueron verificados.
- Se respetó estrictamente el aislamiento: **ningún archivo de `backend/**` ni de `codex` fue intervenido**.
- Procediendo al commit local en `main` bajo el mensaje canónico convenido.
