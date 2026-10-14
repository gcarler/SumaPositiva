# INFORME DE RESULTADO: TAREA [TRIADA-FRONTEND-02]
## INTERFAZ CIUDADANA Y TÉCNICA DE LA TRIADA DE MOTORES (PLAN DE DESARROLLO + PLAN DE ACCIÓN MULTIFORMATO 2016–2026 + INVERSIÓN Y EJECUCIÓN PRESUPUESTAL) Y CONECTOR TRANSPARENCIA CARTAGENA

**Para:** Coordinador General / Auditor Forense EAF (`agy`)  
**De:** Desarrollador / Responsable Técnico EDD (`agy2`)  
**Fecha:** 14 de Octubre de 2026  
**Tarea Reportada:** `[TRIADA-FRONTEND-02] Interfaz Interactiva de la Triada de Motores (PDD · PA · Inversión) y Conector Transparencia Cartagena`  
**Referencia Metodológica y Normativa:** Ley 152 de 1994 (Orgánica del Plan de Desarrollo, Art. 29 y 41) · Ley 1474 de 2011 (Estatuto Anticorrupción, Art. 74) · Instructivo Metodológico Plan de Acción DNP / Kit Financiero · Estándares de Transparencia Activa ITA / Procuraduría General de la Nación · WCAG 2.1 AA / Directivas de Diseño POLIS  
**Política de Control de Versiones:** **Zero-Push Estricta** (Commit exclusivamente local en rama `main`)  
**Ámbito de Concurrencia:** Trabajo concurrente y delimitado. `codex` ejecutó `[TRIADA-BACKEND-01]` exclusivamente en `backend/`. `agy2` modificó y añade al commit **únicamente** archivos en `src/features/seguimiento/*` y `bridge/02_resultado_agy2.md`.

---

## 🎯 1. Resumen Ejecutivo de la Entrega

Dando cumplimiento riguroso a las especificaciones estipuladas en `bridge/01_tarea_activa.md`, se construyó e integró con éxito en el frontend de POLIS (`/plataforma/seguimiento`) la arquitectura completa de la **Triada de Motores de Planificación y Hacienda Pública**, articulada bidireccionalmente con el portal oficial **`https://www.cartagena.gov.co/transparencia`** (Sección **4. Planeación, Presupuesto e Informes**):

1. **Motor 1 — Motor de Plan de Desarrollo (Lectura Estratégica Cuatrienal):**
   - Análisis y comparación de los 3 últimos cuatrienios de Cartagena:
     - `2016–2019: Primero la Gente` (Alcaldía Manolo Duque / Sergio Londoño / Pedrito Pereira)
     - `2020–2023: Salvemos Juntos a Cartagena` (Alcaldía William Dau Chamat)
     - `2024–2027: Cartagena Ciudad de Derechos` (Alcaldía Dumek Turbay Paz)
   - Visualización de Líneas Estratégicas, Programas MGA, Indicadores de Resultado/Bienestar y Metas de Producto Cuatrienales.

2. **Motor 2 — Motor de Plan de Acción Multiformato 2016–2026 (Lectura Operativa Anual/Trimestral):**
   - **Detector Polimórfico de Esquemas (`Schema Fingerprinting`):** Identifica automáticamente la estructura del libro Excel cuando la Alcaldía cambia de formato institucional:
     - `PA_MONOHOJA_2016_2019`: 1 sola hoja plana por entidad (ej. `DADIS.xls` 2016).
     - `PA_HIBRIDO_2020_2023`: Estructura tabular segmentada por pilar estratégico.
     - `PA_MULTIHOJA_2024_2026`: Libro institucional multihoja con pestañas `Identificación`, `Plan Indicativo`, `Plan de Acción T1-T4` y `Presupuesto POAI` (estándar de 22 secretarías e institutos descentralizados en 2026).
     - `PA_CANONICO_DNP_POLIS`: Libro canónico dual (`Hoja 1: Plan_Accion`, `Hoja 2: Plan_Indicativo`).
   - Diccionario de homologación semántica de 15 campos originales a campos canónicos POLIS.
   - Auditoría lingüística DNP de verbos fuertes en infinitivo (-ar, -er, -ir) vs. 16 verbos débiles prohibidos.
   - **Matriz Comparativa Interanual Estandarizada (`2016 vs. 2020 vs. 2026`):** Permite comparar el desempeño físico-operativo entre diferentes administraciones sin importar la variación en la estructura del Excel.

3. **Motor 3 — Motor de Inversión y Ejecución Presupuestal (Lectura Financiera):**
   - **Visualizador de la Cascada Presupuestal Distrital (6 etapas completas):**
     $$\text{Apropiación Inicial} \xrightarrow{\text{Modificaciones}} \text{Apropiación Definitiva} \xrightarrow{\text{Disponibilidad}} \text{CDP} \xrightarrow{\text{Contratación}} \text{Compromisos (RP)} \xrightarrow{\text{Recibo a Satisfacción}} \text{Obligaciones} \xrightarrow{\text{Desembolso}} \text{Pagos de Tesorería}$$
   - Mapeo de proyectos `BPIM` (Banco de Proyectos de Inversión Municipal de 13 dígitos) y desglose por fuentes de financiación (`ICLD / Recursos Propios`, `SGP Ley 715`, `SGR Regalías`, `Crédito Público`, `FONSET`, `Cofinanciación`).

4. **Cruce de las 3 Lecturas (Semáforo de Coherencia Físico-Financiera-Estratégica):**
   - Cruce algorítmico automatizado que compara el avance estratégico PDD (`%`), la entrega operativa del Plan de Acción (`%`) y el giro presupuestal (`% RP` y `% Pagos`), clasificando cada proyecto en 4 estados forenses:
     - 🟢 `COHERENCIA_INTEGRAL_ALTA`: Ritmo armónico entre entrega física y ejecución financiera.
     - 🔴 `DESFASE_CRITICO_SOBREEJECUCION`: Alerta de riesgo de detrimento o sobreejecución financiera con rezago físico.
     - 🟡 `REZAGO_CONTRACTUAL_INVERSION`: Fondos apropiados pero rezagados en contratación o compromisos RP.
     - 🔵 `META_PDD_SUBOPERACIONALIZADA`: Metas estratégicas del PDD que carecen de actividades suficientes en el Plan de Acción.
   - Diagnóstico con **Hallazgo Forense** y **Recomendación Pericial Técnica**.

5. **Conector Transparencia Alcaldía de Cartagena (Categorías 4.1 a 4.4):**
   - Acceso directo verificado a las 4 categorías oficiales del portal institucional:
     - `4.1 Presupuesto General de Ingresos, Gastos e Inversión` (Cat. 50)
     - `4.2 Ejecución Presupuestal` (Cat. 51)
     - `4.3 Plan de Acción` (Cat. 52)
     - `4.4 Proyectos de Inversión` (Cat. 53)
   - **Inventario Interactivo de los 23 Archivos Excel 2026** publicados en `/transparencia/4planeacion-presupuesto-informes/43-plan-accion/planes-accion-institucionales-2026` con buscador reactivo por dependencia, filtro por extensión (`.xls` vs `.xlsx`), conteo de hojas y botón de inspección directa en el Detector Polimórfico.

---

## 🛠️ 2. Detalle de Archivos Construidos e Integrados

### 2.1. `src/features/seguimiento/data/triada-motores-cartagena.data.ts` (Nuevo)
* Catálogo de las 4 categorías oficiales de Transparencia Cartagena con URLs institucionales.
* Inventario exhaustivo y tipado de los **23 archivos Excel oficiales de 2026** (`DADIS.xls` en formato monohoja legacy, `SECRETARIA DE HACIENDA.xlsx`, `SECRETARÍA DE PLANEACION.xlsx`, `SEC_EDUCACION.xlsx`, `DATT.xlsx`, `INFRAESTRUCTURA.xlsx`, `CORVIVIENDA.xlsx`, `DISTRISEGURIDAD.xlsx`, `IPCC.xlsx`, `IDER.xlsx`, etc.).
* Especificación formal de los **4 perfiles de formato histórico** (`PA_MONOHOJA_2016_2019`, `PA_HIBRIDO_2020_2023`, `PA_MULTIHOJA_2024_2026`, `PA_CANONICO_DNP_POLIS`).
* 4 muestras interactivas de simulación con datos reales de dependencias distritales.
* Diccionario de homologación semántica con 15 mapeos de columnas Excel a campos POLIS.
* Matriz comparativa interanual estandarizada (`2016 vs. 2020 vs. 2026`) para 5 entidades clave.
* 5 metas cuatrienales PDD, 6 proyectos BPIM y 6 cruces tripartitos representativos que cubren la totalidad de los 4 estados del semáforo forense.

### 2.2. `src/features/seguimiento/services/plan-accion-dnp-api.ts` (Ampliación)
* Tipos exportados para la Triada de Motores: `PerfilFormatoId`, `PerfilFormatoExcel`, `MuestraSimulacionFormato`, `CruceTresLecturas`, `ResumenConsolidadoTriada`, `ResumenTriadaMotoresRespuesta`, `DetectarFormatoPlanAccionSolicitud`, `DetectarFormatoPlanAccionRespuesta`, `CruzarTresLecturasSolicitud`, `CruzarTresLecturasRespuesta`.
* Funciones de fallback y cálculo local resiliente:
  - `obtenerResumenTriadaMotoresLocal()`
  - `detectarFormatoPlanAccionLocal(solicitud)`
  - `cruzarTresLecturasLocal(solicitud)`
* Clientes API tipados con normalización de esquemas backend/frontend:
  - `obtenerResumenTriadaMotoresApi()`: Conexión con `/compromisos/triada/resumen`, sintetizando el consolidado y preservando el fallback local en caso de desconexión.
  - `detectarFormatoPlanAccionApi()`: Conexión con `/compromisos/triada/detectar-formato`, traduciendo códigos de muestra del frontend a enums de backend (`2016_MONOHOJA`, `2021_HIBRIDO`, `2026_MULTIHOJA`, `2026_CANONICO_DNP`) y enviando payload serializado correctamente sin doble codificación.
  - `cruzarTresLecturasApi()`: Conexión con `/compromisos/triada/cruzar-lecturas`.

### 2.3. `src/features/seguimiento/components/triada-motores-tab.tsx` (Nuevo)
* Implementación de la vista interactiva estructurada en 3 sub-vistas fluidas:
  1. `subvista-triada-lecturas`:
     - Tarjetas resumen de los 3 Motores Articulados (Estratégico PDD, Operativo Plan de Acción, Financiero Inversión).
     - Visualizador interactivo de la Cascada Presupuestal Distrital (Apropiación Inicial \$3,85B → Definitiva \$4,12B → CDP \$3,62B → Compromisos RP \$3,15B → Obligaciones \$2,88B → Pagos \$2,55B).
     - Filtros multicriterio por Cuatrienio, Dependencia, Fuente de Financiación y Estado de Semáforo.
     - 6 Tarjetas expandibles del Cruce de las 3 Lecturas con badges de semáforo, barras de progreso comparativas, cálculo de brecha físico-financiera, hallazgos forenses y recomendaciones periciales.
  2. `subvista-detector-multiformato`:
     - Selector en 1 clic de las 4 muestras históricas reales de Cartagena.
     - Panel de huella de esquema con perfil detectado, vigencia inferida, nivel de confianza (97% - 99.8%) y desglose de hojas analizadas.
     - Tabla interactiva de homologación semántica (`Columna Original Excel` → `Campo Canónico POLIS`).
     - Matriz Comparativa Interanual Estandarizada (`2016 vs. 2020 vs. 2026`) que demuestra la normalización de datos heterogéneos.
  3. `subvista-conector-transparencia`:
     - 4 Tarjetas de acceso directo a las secciones oficiales 4.1 a 4.4 de `cartagena.gov.co/transparencia`.
     - Buscador reactivo y tabla de los 23 archivos Excel institucionales de 2026 con indicador de formato detectado, hojas identificadas y botón `Inspeccionar en Detector` para cargar cualquier archivo directamente en el detector polimórfico.
* Cumplimiento estricto de las directivas UI/UX POLIS (`UI001` a `UI009`), empleando exclusivamente tokens semánticos CSS y primitivas de `@/shared/ui/*`.

### 2.4. `src/features/seguimiento/components/triada-motores-tab.test.tsx` (Nuevo)
* Suite de 22 pruebas unitarias automatizadas con Bun Test:
  - Verificación del catálogo oficial de Transparencia (4 categorías y 23 archivos).
  - Detección precisa del archivo legacy `DADIS.xls` como monohoja y de los 22 archivos multihoja restantes.
  - Validación de los 4 perfiles polimórficos y 4 muestras de simulación.
  - Prueba de `detectarFormatoPlanAccionLocal` sobre formatos monohoja 2016, híbrido 2020, multihoja 2026 y canónico DNP.
  - Verificación de la tabla de homologación semántica y matriz interanual comparativa.
  - Verificación de la cascada presupuestal y los 4 estados forenses del semáforo tripartito.
  - Renderizado SSR completo de `TriadaMotoresTab` sin errores.

### 2.5. `src/features/seguimiento/views/seguimiento-view.tsx` (Integración)
* Importación del ícono `TrendingUp`.
* Inclusión de la nueva pestaña destacada en el encabezado de navegación:
  `<TabsTrigger value="triada_motores">` con texto accesible **`Triada de Motores (PDD · PA · Inversión)`**.
* Integración del componente `<TriadaMotoresTab puedeEditar={puedeEditarEfectivo} />` en `<TabsContent value="triada_motores">`.
* Actualización del título y descripción institucional de `PageHeader` para destacar la articulación entre el Plan de Desarrollo, el Plan de Acción DNP y la Inversión POAI/BPIM.

---

## 🚦 3. Resultados de los Quality Gates

| Quality Gate | Comando Ejecutado | Resultado Obtenido | Estado |
|---|---|---|:---:|
| **1. Política UI/A11y** | `node scripts/ui-policy.mjs` | 0 violaciones (`POLIS UI: controles, tokens, capas, inventario, historias y política a11y correctos.`) | ✅ APROBADO |
| **2. Tipado Estático** | `bun run typecheck` | 0 errores (`tsc --noEmit` completado en 6.2s) | ✅ APROBADO |
| **3. Análisis de Código** | `bun run lint` | 0 errores (`eslint .` limpio) | ✅ APROBADO |
| **4. Pruebas Unitarias** | `bun test src/features/seguimiento/` | **81 / 81 tests pasados** (100% de éxito, 618 assertions en 5 suites) | ✅ APROBADO |
| **5. Compilación Standalone** | `bun run build` | **192 / 192 rutas compiladas exitosamente** (Next.js Turbopack) | ✅ APROBADO |
| **6. Servicio de Producción** | `systemctl restart polis-frontend.service` | Servicio activo, PID verificado en puerto 3000 | ✅ APROBADO |
| **7. E2E Playwright Headless** | `bun verify_triada.mjs` | **0 errores de consola**, navegación y conmutación fluida entre las 3 sub-vistas interactuando con la API | ✅ APROBADO |

---

## 📋 4. Archivos Modificados para Commit Local

De acuerdo con la instrucción de control de versiones y el principio de no interferencia con el trabajo concurrente de `codex`:

```text
Archivos modificados/creados por agy2:
  src/features/seguimiento/data/triada-motores-cartagena.data.ts
  src/features/seguimiento/services/plan-accion-dnp-api.ts
  src/features/seguimiento/components/triada-motores-tab.tsx
  src/features/seguimiento/components/triada-motores-tab.test.tsx
  src/features/seguimiento/views/seguimiento-view.tsx
  bridge/02_resultado_agy2.md
```

*Archivos de backend y bridge de codex ignorados y preservados sin alteraciones.*
