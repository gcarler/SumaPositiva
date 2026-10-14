# ASIGNACIÓN TÉCNICA EDD: `[TRIADA-FRONTEND-02]`
## INTERFAZ CIUDADANA Y TÉCNICA DE LA TRIADA DE MOTORES (PLAN DE DESARROLLO + PLAN DE ACCIÓN MULTIFORMATO 2016–2026 + INVERSIÓN Y EJECUCIÓN PRESUPUESTAL) Y CONECTOR TRANSPARENCIA CARTAGENA

- **Para:** Desarrollador Principal EDD (`agy2`)
- **De:** Coordinador General / Auditor Forense EAF (`agy`)
- **Fecha:** 2026-10-14
- **Rama de trabajo:** `main` (Política **Zero-Push**: solo commit local)
- **Trabajo concurrente en curso:** `codex` está ejecutando `[TRIADA-BACKEND-01]` exclusivamente sobre `backend/app/modules/compromisos/*`, `backend/tests/test_triada_motores.py` y `bridge/02_entrega_codex.md`. **NO modifiques ni agregues a tu commit ningún archivo de `backend/` ni `bridge/01_tarea_codex.md` o `bridge/02_entrega_codex.md`.**

---

## 1. Contexto y Objetivo de la Tarea

El usuario solicitó construir una arquitectura de **Tres Motores Articulados** conectada con el portal **`https://www.cartagena.gov.co/transparencia`** (Sección **4. Planeación, Presupuesto e Informes**):
1. **Motor 1 — Motor de Plan de Desarrollo (Lectura Estratégica Cuatrienal):**
   - Permite leer y comparar los Planes de Desarrollo de Cartagena (`2016–2019 Primero la Gente`, `2020–2023 Salvemos Juntos a Cartagena`, `2024–2027 Cartagena Ciudad de Derechos`), sus Líneas Estratégicas, Programas MGA, Indicadores de Resultado/Bienestar y Metas de Producto Cuatrienales.
2. **Motor 2 — Motor de Plan de Acción Multiformato 2016–2026 (Lectura Operativa Anual/Trimestral — Cat. `4.3`):**
   - Cada vez que la Alcaldía cambia el formato del Excel (en **2016** era **1 sola hoja plana por entidad**; en **2020–2023** era una matriz híbrida por línea estratégica; en **2024–2026** es un libro **multihoja** con pestañas de `Identificación`, `Plan Indicativo`, `Plan de Acción T1–T4` y `Presupuesto`), el motor identifica automáticamente el tipo de formato (`Schema Fingerprinting`), mapea las columnas a un estándar canónico único, audita los verbos fuertes DNP y permite hacer **lectura comparativa interanual (2016 vs. 2020 vs. 2026)**.
3. **Motor 3 — Motor de Inversión y Ejecución Presupuestal (Lectura Financiera — Cat. `4.1`, `4.2`, `4.4`):**
   - Permite leer la cascada presupuestal completa (`Apropiación Inicial`, `Apropiación Definitiva`, `CDP`, `Compromisos/RP`, `Obligaciones`, `Pagos de Tesorería`), proyectos de inversión `BPIM`/`BPIN` y fuentes de financiación (`ICLD`, `SGP`, `FONSET`, `Regalías SGR`, `Crédito`, `Recursos Propios`).
4. **Cruce de las 3 Lecturas (Semáforo de Coherencia Físico-Financiera-Estratégica):**
   - Cruza automáticamente la ejecución presupuestal (Motor 3) con la entrega operativa en los Planes de Acción (Motor 2) y el avance estratégico del Plan de Desarrollo (Motor 1), detectando alertas forenses (`Sobreejecución financiera sin entrega física`, `Rezago contractual en inversión`, `Meta estratégica PDD suboperacionalizada`, `Coherencia integral alta`).

---

## 2. Alcance Exacto de Archivos Bajo Responsabilidad de `agy2`

Debes crear/modificar **únicamente** los siguientes archivos en `src/features/seguimiento/` y `bridge/`:
1. `src/features/seguimiento/data/triada-motores-cartagena.data.ts` *(nuevo — dataset canónico completo de los 3 Motores, los 4 perfiles de formato Excel 2016–2026, la comparativa interanual y el catálogo oficial de `cartagena.gov.co/transparencia` secciones `4.1` a `4.4` con los 23 archivos `.xlsx`/`.xls` de 2026)*
2. `src/features/seguimiento/services/plan-accion-dnp-api.ts` *(ampliar con clientes tipados para `/compromisos/triada/resumen`, `/compromisos/triada/detectar-formato` y `/compromisos/triada/cruzar-lecturas`, con fallback resiliente al dataset canónico)*
3. `src/features/seguimiento/components/triada-motores-tab.tsx` *(nuevo — componente interactivo completo de la Triada de Motores con sus 3 sub-vistas)*
4. `src/features/seguimiento/components/triada-motores-tab.test.tsx` *(nuevo — suite de pruebas unitarias del componente y sus 3 sub-vistas)*
5. `src/features/seguimiento/views/seguimiento-view.tsx` *(integrar la nueva pestaña `triada_motores` — `Triada de Motores (PDD · PA · Inversión)` — como pestaña destacada en `SeguimientoView`)*
6. `bridge/02_resultado_agy2.md` *(reporte de entrega EDD)*

---

## 3. Especificación Técnica Detallada

### 3.1. `src/features/seguimiento/data/triada-motores-cartagena.data.ts`
Construir el catálogo canónico tipado con datos reales de Cartagena de Indias:
1. **Catálogo Oficial del Portal `https://www.cartagena.gov.co/transparencia` (Sección 4 — Planeación, Presupuesto e Informes):**
   - `4.1 Presupuesto general de ingresos, gastos e inversión` (`https://www.cartagena.gov.co/Transparencia/Planeación?categoria=50`)
   - `4.2 Ejecución presupuestal` (`https://www.cartagena.gov.co/Transparencia/Planeación?categoria=51`)
   - `4.3 Plan de Acción` (`https://www.cartagena.gov.co/Transparencia/Planeación?categoria=52`), incluyendo la ruta `/transparencia/4planeacion-presupuesto-informes/43-plan-accion/planes-accion-institucionales-2026` con los **23 archivos Excel individuales de 2026** detectados en el portal (`DADIS.xls`, `SECRETARIA DE HACIENDA.xlsx`, `SECRETARÍA DE PLANEACION.xlsx`, `SEC_EDUCACION.xlsx`, `DATT.xlsx`, `INFRAESTRUCTURA.xlsx`, `IDER.xlsx`, `IPCC.xlsx`, `CORVIVIENDA.xlsx`, `TRANSCARIBE.xlsx`, `EPA.xlsx`, `DISTRISEGURIDAD.xlsx`, `ESCUELA DE GOBERNO.xlsx`, `GERENCIA DE ESPACIO PUBLICO.xlsx`, `IDACCC.xlsx`, `OAGR.xlsx`, `PES-PR.xlsx`, `SECRETARIA GENERAL.xlsx`, `SICC.xlsx`, `SPDS - UMATA.xlsx`, `TURISMO.xlsx`, `UMAYOR.xlsx`, `VALORIZACION.xlsx`) y los cortes trimestrales (`31-marzo-2026`, `30-junio-2026`), indicando para cada archivo su dependencia, extensión (`.xls` vs `.xlsx`), perfil de formato detectado (`PA_MONOHOJA_2016_2019` vs `PA_MULTIHOJA_2024_2026`), número de hojas y estado de normalización.
   - `4.4 Proyectos de Inversión` (`https://www.cartagena.gov.co/Transparencia/Planeación?categoria=53`).
2. **Los 4 Perfiles Polimórficos de Formato Excel (`2016–2026`) y Muestras Interactivas:**
   - `PA_MONOHOJA_2016_2019`: 1 sola hoja plana por entidad (ej. `DADIS 2016`), columnas `Objetivo | Meta 2016 | Indicador | Programado | Ejecutado | Presupuesto`.
   - `PA_HIBRIDO_2020_2023`: Hojas por Pilar (`Salvemos Juntos a Cartagena 2020-2023`), seguimiento semestral/trimestral.
   - `PA_MULTIHOJA_2024_2026`: Libro institucional multihoja (`Identificación`, `Plan Indicativo`, `Plan de Acción T1-T4`, `Presupuesto POAI`).
   - `PA_CANONICO_DNP_POLIS`: Doble hoja (`Hoja 1: Plan_Accion`, `Hoja 2: Plan_Indicativo`).
   - Incluir el diccionario de mapeo semántico (`Columna Original → Campo Canónico POLIS`) y la **Matriz Comparativa Interanual Estandarizada (`2016` vs. `2020` vs. `2026`)** por dependencia (`Secretaría del Interior`, `Distriseguridad`, `DADIS`, `Secretaría de Planeación`, `Secretaría de Hacienda`, `Secretaría de Educación`, `Secretaría de Infraestructura`, `DATT`, `EPA`, `Corvivienda`, `IPCC`, `IDER`, `PES-PR`).
3. **Datos Articulados de los 3 Motores y el Cruce de las 3 Lecturas:**
   - **Motor 1 (Plan de Desarrollo — Estratégico):** Cuatrienios `2016–2019 Primero la Gente`, `2020–2023 Salvemos Juntos a Cartagena` y `2024–2027 Cartagena Ciudad de Derechos`, Líneas Estratégicas, Programas MGA, Indicadores de Resultado y Metas de Producto Cuatrienales.
   - **Motor 2 (Plan de Acción — Operativo):** Avance físico trimestral (`T1–T4`), total de actividades, porcentaje de verbos fuertes en infinitivo DNP y formato de origen.
   - **Motor 3 (Inversión y Ejecución Presupuestal — Financiero):** Cascada presupuestal (`Apropiación Inicial`, `Apropiación Definitiva`, `CDP`, `Compromisos/RP`, `Obligaciones`, `Pagos`), proyectos `BPIM` y desglose por fuente (`ICLD`, `SGP`, `FONSET`, `Regalías SGR`, `Crédito`).
   - **Cruce de las 3 Lecturas:** Matriz cruzada con `avance_estrategico_pdd_pct`, `avance_operativo_pa_pct`, `ejecucion_financiera_rp_pct`, `giro_pagos_pct`, `brecha_fisico_financiera_pts`, `estado_semaforo` (`COHERENCIA_INTEGRAL_ALTA`, `DESFASE_CRITICO_SOBREEJECUCION`, `REZAGO_CONTRACTUAL_INVERSION`, `META_PDD_SUBOPERACIONALIZADA`), `hallazgo_forense` y `recomendacion_tecnica`.

### 3.2. `src/features/seguimiento/components/triada-motores-tab.tsx`
Diseñar e implementar un componente de nivel ejecutivo y ciudadano (usando exclusivamente primitivas de `@/shared/ui/*` y tokens semánticos CSS para cumplir `UI001`–`UI009`) organizado en **3 Sub-vistas interactivas**:

1. **Sub-vista 1 — «Triada de Lecturas: Plan de Desarrollo · Plan de Acción · Inversión» (`data-testid="subvista-triada-lecturas"`):**
   - Tarjetas resumen de los **3 Motores Articulados** (Estratégico PDD + Operativo Plan de Acción + Financiero POAI/BPIM/RP/Pagos).
   - Filtros interactivos por **Cuatrienio / Plan de Desarrollo** (`2024–2027 Cartagena Ciudad de Derechos`, `2020–2023 Salvemos Juntos a Cartagena`, `2016–2019 Primero la Gente`), **Dependencia Distrital**, **Fuente de Financiación** (`ICLD`, `SGP`, `FONSET`, `SGR`, `Crédito`) y **Estado del Semáforo Tripartito**.
   - **Visualizador de la Cascada Presupuestal (Motor 3):** Barra comparativa `Apropiación Inicial → Apropiación Definitiva → CDP → Compromisos (RP) → Obligaciones → Pagos`.
   - **Matriz Cruzada de las 3 Lecturas:** Muestra por cada dependencia y proyecto `BPIM` la lectura estratégica (Meta PDD), la lectura operativa (Plan de Acción `T1–T4` + calidad verbal DNP), la lectura financiera (`% RP` y `% Pagos`), la brecha físico-financiera y el dictamen del semáforo con su hallazgo forense.

2. **Sub-vista 2 — «Detector Polimórfico de Formatos Excel (2016 Monohoja ↔ 2026 Multihoja)» (`data-testid="subvista-detector-multiformato"`):**
   - Permite seleccionar y simular en 1 clic cualquiera de los **4 formatos históricos reales** (`2016 Monohoja (1 hoja por entidad)`, `2020–2023 Híbrido por Pilar`, `2024–2026 Multihoja Institucional`, `2026 Canónico DNP Dual`) o pegar/cargar encabezados de un libro Excel para ejecutar la **Detección de Huella de Esquema (`Schema Fingerprinting`)**.
   - Muestra visualmente:
     - El **Perfil de Formato Detectado** y el **Nivel de Confianza (%)**.
     - Las **Hojas Detectadas** en el libro (`1 hoja plana` en 2016 vs. `4+ hojas` en 2026).
     - La **Tabla de Homologación Semántica de Columnas** (`Encabezado Original del Excel → Campo Canónico Estandarizado`).
     - La **Lectura Comparativa Interanual Estandarizada (`2016 vs. 2020 vs. 2026`)**, demostrando cómo formatos distintos quedan normalizados bajo una misma métrica comparativa.

3. **Sub-vista 3 — «Conector Transparencia Alcaldía de Cartagena (Categorías 4.1 a 4.4)» (`data-testid="subvista-conector-transparencia"`):**
   - Panel de las 4 subcategorías oficiales de `https://www.cartagena.gov.co/transparencia` (`4.1 Presupuesto`, `4.2 Ejecución Presupuestal`, `4.3 Plan de Acción`, `4.4 Proyectos de Inversión`) con sus enlaces directos verificados.
   - **Inventario Interactivo de los 23 Archivos Excel 2026 (`planes-accion-institucionales-2026`)** con buscador por dependencia, filtro por tipo de archivo (`.xls` vs `.xlsx`), formato detectado, hojas identificadas y botón para inspeccionar su normalización en el Detector Polimórfico.

### 3.3. Integración en `src/features/seguimiento/views/seguimiento-view.tsx`
- Agregar el `TabsTrigger` con `value="triada_motores"` y etiqueta **`Triada de Motores (PDD · PA · Inversión)`** junto a `motor_plan_accion` y `banco_conocimiento_dnp`.
- Renderizar `<TriadaMotoresTab />` dentro de su `<TabsContent value="triada_motores">`.

---

## 4. Criterios de Aceptación y Quality Gates

1. `node scripts/ui-policy.mjs` → **0 violaciones** (usar exclusivamente componentes de `@/shared/ui/*` y tokens semánticos CSS; cero colores literales hex/Tailwind arbitrarios).
2. `bun run typecheck` y `bun run lint` → **0 errores**.
3. `bun test src/features/seguimiento/` → **100% PASS** (incluyendo el nuevo `src/features/seguimiento/components/triada-motores-tab.test.tsx` probando las 3 sub-vistas, el detector polimórfico 2016 vs 2026, el cruce de las 3 lecturas y el catálogo de los 23 archivos de Transparencia).
4. `bun run build` → **192 rutas compiladas sin errores**.
5. Reiniciar `polis-frontend.service` (`systemctl restart polis-frontend.service`) y verificar con Playwright Headless en `http://127.0.0.1:3000/plataforma/seguimiento` que la pestaña `Triada de Motores (PDD · PA · Inversión)` y sus 3 sub-vistas renderizan con **0 errores de consola**.
6. Hacer commit local en `main` **únicamente** de los archivos bajo `src/features/seguimiento/*` y `bridge/02_resultado_agy2.md`.
