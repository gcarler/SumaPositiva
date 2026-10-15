# TAREA FRONTEND: `[TRIADA-FRONTEND-LAB-PDD-11B]`
## LABORATORIO PRESCRIPTIVO PDD EN EL CENTRO DE MANDO: SUB-PESTAÑA 7 («LABORATORIO PRESCRIPTIVO & CONTROL FISCAL»), NETWORK DEA BI-ETAPA, SIMULADOR INVERSE DEA PARETO, AUDITORÍA DE 8 PLANES / METAS HUÉRFANAS, JUSTICIA TERRITORIAL DANE Y PLIEGOS EXPORTABLES

- **Para:** Desarrollador Principal Frontend (`agy2`)
- **De:** Coordinador General y Auditor Forense EAF (`agy`)
- **Fecha:** 15 de octubre de 2026
- **Plan Maestro de Referencia:** `bridge/00_plan_lab_prescriptivo_pdd_11b.md`
- **Política Git:** **Zero-Push Estricta** (Solo commit local en `main`). Prohibido tocar cualquier archivo en `backend/`, `docs/permisos-api.md`, `bridge/01_tarea_codex.md` o `bridge/02_entrega_codex.md`.

---

## 1. Alcance Exacto a Implementar por `agy2`

### 1.1. `src/features/seguimiento/data/pdd-dea-cartagena.data.ts` y `src/features/seguimiento/services/plan-accion-dnp-api.ts`
1. Añadir los contratos tipados, datos canónicos auditados y función cliente `obtenerLaboratorioPrescriptivoPddApi()` (contra `/api/v1/compromisos/triada/pdd-dea/laboratorio-prescriptivo` con fallback resiliente a datos locales):
   - **`AUDITORIA_METAS_8_PLANES`:** Cobertura de metas oficiales en los **8 Planes (`5 PDD + 3 PDL`)** (incluyendo las metas rescatadas por OCR de `PDD_2012_2015` y `PDD_2016_2019`), desglosadas en las **6 categorías forenses de cobertura** (`VINCULADA_ALTA_CONFIANZA`, `CANDIDATO_BAJA_CONFIANZA`, `DUPLICADA_ENTRE_FUENTES_PDD`, `SIN_CORPUS_HISTORICO`, `SIN_CODIGO_O_ENTIDAD`, `SIN_REPORTE_EN_CORPUS_CUBIERTO`) y las **4 categorías de Rigor MGA/Sinergia DNP** (`RESULTADO_IMPACTO`, `PRODUCTO_CUANTIFICABLE`, `GESTION_PROCESO_BLANDO`, `REVISION_HUMANA`).
   - **`NETWORK_DEA_BI_ETAPA`:** Matriz de secretarías con `score_etapa1_operativa_pa` (*Gasto → Actividades PA*), `score_etapa2_estrategica_pdd` (*Actividades PA → Metas PDD*), `score_global_red`, `brecha_ilusion_burocratica` ($\theta_1 - \theta_2$), diagnóstico (`ALTA_EFECTIVIDAD_INTEGRAL`, `ILUSION_BUROCRATICA`, `REZAGO_OPERATIVO`) y **Prueba de Estabilidad de Ranking (`ESTABLE`, `MODERADO`, `VOLATIL`)**.
   - **`SIMULADOR_INVERSE_DEA_PARETO`:** Los 3 escenarios interactivos de flexibilidad presupuestal (`±5%`, `±10%`, `±15%`) con suma cero ($\sum \Delta X = 0$), reasignación desde entidades con retornos decrecientes (`DRS`) hacia líneas/entidades con retornos crecientes (`IRS`), ganancia potencial en puntos porcentuales de cumplimiento PDD y **Ledger de Restricciones Normativas + Advertencia No-Causal**.
   - **`JUSTICIA_TERRITORIAL_PDL_DANE`:** Tabla de las 3 Localidades (`Localidad 1: 412.580 hab.`, `Localidad 2: 348.190 hab.`, `Localidad 3: 304.800 hab.`, total Distrito `1.065.570 hab.`) con **Inversión PDL per cápita (COP constantes 2025 / hab.)**, **Mesas Ciudadanas por cada 100.000 hab.**, comparativo Urbano vs. Rural/Insular de hurtos (`n=2` polígonos) y badge de **Compuerta Estadística Espacial (`Moran's I: NO_ESTIMABLE_N_MENOR_30`)**.
   - **`PLIEGOS_CONTROL_POLITICO_FISCAL`:** Tarjetas interactivas por entidad con nivel de alerta, metas sin reporte en corpus cubierto, brecha de ilusión burocrática, preguntas generadas para debate de control político en el Concejo Distrital y botón de **Exportación de Dictamen Forense (`.md` / `.csv` / `.json` con hash SHA-256)**.

### 1.2. `src/features/seguimiento/components/pdd-dea-evaluacion-panel.tsx`
- Incorporar la **Sub-pestaña 7 (`data-testid="pdd-tab-laboratorio-prescriptivo"` — «7. Laboratorio Prescriptivo & Control Fiscal»)** con:
  1. **Selector interactivo de Escenario Inverse DEA Pareto (`±5%`, `±10%`, `±15%`)** mostrando la tabla de reasignación óptima suma-cero y el Ledger de Restricciones.
  2. **Matriz Network DEA Bi-Etapa (`Operación PA → Estrategia PDD`) & Detector de Ilusión Burocrática + Estabilidad de Ranking**.
  3. **Descomposición Forense de las Metas de los 8 Planes (6 estados de cobertura + 4 niveles de Rigor MGA/Sinergia)**.
  4. **Panel de Justicia Territorial Per Cápita DANE (`3 PDL × 33 Mesas × 2 Polígonos Hurtos` + Compuerta Moran $N<30$)**.
  5. **Generador de Pliegos de Control Político y Descarga de Expediente Forense**.

### 1.3. Pruebas y Build de Producción
- Ampliar `src/features/seguimiento/__tests__/pdd-dea-evaluacion-panel.test.tsx` a **`>= 43` pruebas unitarias** cubriendo los 5 bloques nuevos y el renderizado SSR de `pdd-tab-laboratorio-prescriptivo`.
- Ejecutar y aprobar:
  1. `node scripts/ui-policy.mjs` (`0` violaciones)
  2. `./node_modules/.bin/tsc --noEmit` (`0` errores)
  3. `./node_modules/.bin/eslint` sobre los archivos modificados (`0` errores)
  4. `bun test src/features/seguimiento/__tests__/pdd-dea-evaluacion-panel.test.tsx` (`>= 43` tests en verde)
  5. `./node_modules/.bin/next build` (`192/192` páginas generadas)
  6. `systemctl restart polis-frontend.service` (que ya sincroniza automáticamente `.next/static` en `standalone`).
- Documentar en `bridge/02_resultado_agy2.md` y registrar **commit local en `main`**.
