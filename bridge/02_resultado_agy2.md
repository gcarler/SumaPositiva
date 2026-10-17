# INFORME DE ENTREGA: TAREA `[FRONTEND-TABLERO-MULTIAGENTE-PDD-18B]`
## CONSOLA Y TABLERO INTERACTIVO DEL SISTEMA MULTIAGENTE PDD/PDL Y DIAGNÓSTICO COMPARATIVO DE SEGURIDAD HUMANA (2012–2027) EN `/plataforma/seguimiento`

- **Para:** Coordinador General y Auditor Forense EAF (`agy` / `=agy:0.0`)
- **De:** Desarrollador Principal Frontend POLIS UI y Visualización de Inteligencia Territorial (`agy2` / `=agy2:0.0`)
- **Fecha:** 17 de octubre de 2026
- **Tarea Reportada:** `[FRONTEND-TABLERO-MULTIAGENTE-PDD-18B]`
- **Rama:** `main` (Política **Zero-Push**: commit local exclusivamente)
- **Aislamiento Estricto:** Se modificaron únicamente archivos dentro de `src/features/seguimiento/**`, `docs/banco-conocimiento-politica-publica.md` y `bridge/02_resultado_agy2.md`. **Cero cambios en `backend/**`, `docs/permisos-api.md` o `bridge/01_tarea_codex.md` / `bridge/02_entrega_codex.md`**.

---

## 🎯 1. Resumen Ejecutivo

Se diseñó, implementó, integró y verificó en `/plataforma/seguimiento` la consola y tablero interactivo del **Sistema Multiagente de Absorción y Diagnóstico PDD/PDL y Seguridad Humana (2012–2027)** (`SistemaMultiagentePddPanel`), conectando el frontend con los 4 endpoints del motor multiagente y proveyendo respaldo canónico resiliente con las cifras exactas auditadas del corpus histórico de Cartagena:
- **`2.732` evidencias absorbidas** (`2.728` páginas continuas de 11 PDFs oficiales verificadas con SHA-256 + registros JSON estructurados).
- **`1.524` nodos jerárquicos MGA** (`1.401` nodos en los 5 PDD y `123` nodos en los 3 PDL, con `0` encabezados falsos de página).
- **`2.228` metas PDD (`2012–2027`)**: `PDD_2012_2015 = 191`, `PDD_2013_2015 = 195`, `PDD_2016_2019 = 370`, `PDD_2020_2023 = 226`, `PDD_2024_2027 = 1.246`.
- **`401` metas PDL (`2024–2027`)** en **Anexo Territorial separado** (`Localidad 1 = 110`, `Localidad 2 = 89`, `Localidad 3 = 202`; `$304.981M COP` desagregando inversión y funcionamiento).
- **Clasificación `A/B/C/N` por nodos y 7 Dimensiones de Seguridad Humana (PNUD 1994 / Decreto 037 de 2026)** con conciliación exacta `±$1 COP` y articulación operativa con las **29 entidades distritales** y códigos **BPIM de 13 dígitos**.

---

## 💻 2. Entregables Técnicos Implementados

### 2.1 Datos Canónicos y Contratos Tipados (`src/features/seguimiento/data/sistema-multiagente-pdd.data.ts` y `src/features/seguimiento/services/plan-accion-dnp-api.ts`)
- Cero uso de `any`; validación estructural con guardas de tipo (`esObjetoRegistro`).
- Funciones cliente conectadas a los 4 endpoints REST con hidratación/fallback resiliente:
  1. `obtenerEstadoSistemaMultiagentePdd()` $\rightarrow$ `GET /api/v1/compromisos/triada/pdd-dea/estado-sistema-multiagente`
  2. `ejecutarSistemaMultiagentePdd()` $\rightarrow$ `POST /api/v1/compromisos/triada/pdd-dea/ejecutar-sistema-multiagente`
  3. `obtenerComparativoSeguridadHumanaPdd()` $\rightarrow$ `GET /api/v1/compromisos/triada/pdd-dea/seguridad-humana-comparativo`
  4. `obtenerCruceMultiagentePaBpim()` $\rightarrow$ `GET /api/v1/compromisos/triada/pdd-dea/cruce-multiagente-pa-bpim`
- Clasificación auditada `A/B/C/N` por nodos en los 5 PDD:
  - `PDD_2012_2015` (*Campo para Todos*): `A=11`, `B=16`, `C=114`, `N=5` · PPI Oficial Nominal `$3.049.788.268.000`.
  - `PDD_2013_2015` (*Ahora Sí Cartagena*): `A=22`, `B=28`, `C=227`, `N=6` · PPI Oficial Nominal `$1.874.167.605.000`.
  - `PDD_2016_2019` (*Primero la Gente*): `A=31`, `B=55`, `C=324`, `N=13` · PPI Oficial Nominal `$4.331.941.000.000`.
  - `PDD_2020_2023` (*Salvemos Juntos a Cartagena*): `A=36`, `B=37`, `C=235`, `N=5` · PPI Oficial Nominal `$6.022.982.660.000`.
  - `PDD_2024_2027` (*Cartagena, Ciudad de Derechos*): `A=19`, `B=30`, `C=181`, `N=6` · PPI Oficial Nominal `$12.800.853.474.855`.

### 2.2 Componente `SistemaMultiagentePddPanel` e Integración en `/plataforma/seguimiento`
- **Archivo creado:** `src/features/seguimiento/components/sistema-multiagente-pdd-panel.tsx`.
- **Integrado en:**
  - `src/features/seguimiento/components/pdd-dea-evaluacion-panel.tsx` (Sub-pestaña 8: `8. Sistema Multiagente PDD/PDL (2.732 Evidencias · A/B/C/N)`, `data-testid="pdd-tab-sistema-multiagente"`).
  - `src/features/seguimiento/components/motor-plan-accion-tab.tsx` (Pestaña dedicada: `Sistema Multiagente PDD/PDL (2012–2027)`, `data-testid="tab-motor-multiagente-pdd"`).
- **Estructura en 3 Bloques + Drawer Lateral (`SidePanel`, Regla `Zero-Modals`):**
  - **Bloque 1 (`bloque-telemetria-puertas-multiagente`):** Estado `COMPLETADO` / `SINCRONIZADO_PDD_ONLY`, `run_id`, controles de actualización/ejecución, 4 tarjetas KPI (`2.732` evidencias, `1.524` nodos, `2.228` metas PDD, `401` metas PDL) y semáforo de las **6 Puertas de Calidad (`Puerta A` a `Puerta F`)**.
  - **Bloque 2 (`bloque-comparativo-5-pdd`):** Matriz comparativa de los 5 PDD (`2012–2027`), vector interactivo de las **7 Dimensiones PNUD** y bloque separado del **Anexo Territorial de los 3 PDL (`2024–2027`)** (`401` metas y `$304.981M COP`).
  - **Bloque 3 (`bloque-4-preguntas-estrategicas`):** Tarjetas interactivas con las **4 respuestas estratégicas** del diagnóstico comparativo, tabla de articulación PDD (`A/B`) $\leftrightarrow$ Plan de Acción (`29` entidades) $\leftrightarrow$ códigos BPIM (`13` dígitos), y **Drawer Lateral (`SidePanel` de `@/shared/ui/side-panel`)** que inspecciona los 11 PDFs verificados con SHA-256 (`161`, `116`, `199`, `363`, `370`, `304`, `491`, `549`, `70`, `32`, `73` págs.) y la trazabilidad PA/BPIM sin usar popups modales centrados.

### 2.3 Suite de Pruebas Unitarias, Normalizador de Contrato en Vivo y Documentación
- **Subsanación EAF (`normalizarCruceMultiagentePaBpim` y `normalizarDimensionSeguridadHumana` en `src/features/seguimiento/services/plan-accion-dnp-api.ts`):** Mapeo elemento por elemento del payload real del backend en vivo (`nodos_ab` $\rightarrow$ `nodos_a_mas_b`, `ppi_constante_asignado_cop` $\rightarrow$ `presupuesto_ppi_constante_2025_cop`, `actividades_pa` $\rightarrow$ `actividades_pa_vinculadas` / `actividades_pa_count`, `avance_fisico_promedio` $\rightarrow$ `avance_fisico_promedio_pct`, `dimension: "Personal" / "Salud"` $\rightarrow$ `"Seguridad Personal" / "Seguridad en la Salud"`, `entidad` $\rightarrow$ `entidad_responsable` + extracción de `sigla`, `meta_pdd` $\rightarrow$ `meta_pdd_codigo` / `meta_pdd_descripcion`, `actividad_pa_id` $\rightarrow$ `actividad_pa_codigo`, `codigo_bpim_sugerido` $\rightarrow$ `codigo_bpim`, generación determinista de `id_trazabilidad`, normalización de `estado_articulacion: "ARTICULADA"` $\rightarrow$ `"ARTICULADO_VERIFICADO"`, y `desglose_frontalidad` / `cobertura_articulacion_vigente_2024_2027` en `resumen_ejecutivo`).
- **Archivo de pruebas:** `src/features/seguimiento/__tests__/sistema-multiagente-pdd.test.tsx` (8 pruebas exhaustivas, incluyendo simulación de respuesta HTTP 200 con el payload real del backend en vivo).
- **Ampliación de pruebas existentes:** `src/features/seguimiento/components/motor-plan-accion.test.tsx` (Sección 6 con 3 pruebas adicionales).
- **Documentación actualizada:** `docs/banco-conocimiento-politica-publica.md` (Sección 6 y nueva Sección 8).

---

## 🛡️ 3. Controles de Calidad Ejecutados

1. `bun run ui:check` $\rightarrow$ **0 violaciones** (cumplimiento 100% de primitivas, tokens semánticos y regla Zero-Modals).
2. `bun run check` $\rightarrow$ **0 errores y 0 warnings** (`ui:check` + `tsc --noEmit` + `eslint`).
3. `bun test` $\rightarrow$ **739 pass / 0 fail** (100% pruebas aprobadas).

