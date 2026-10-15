import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import {
  CATALOGO_PLANES_DESARROLLO,
  TABLA_OFICIAL_PPI_ANUAL,
  PPI_POR_LINEA_PDD_2024_2027,
  CONCILIACION_PPI_BD_CSH,
  SERIE_IPC_DANE_HISTORICA,
  RESUMEN_CUMPLIMIENTO_PLANES,
  COMPONENTES_SEGURIDAD_HUMANA_2024_2027,
  MACROPROYECTOS_ESTRATEGICOS_2024_2027,
  PLANES_DESARROLLO_LOCAL_AVANCE,
  DMUS_DEA_PDD_ENTIDADES,
  DMUS_DEA_PDD_LINEAS_ESTRATEGICAS,
  MALMQUIST_INTER_PLANES_DATA,
  CORRELACIONES_PDD_FDR_DATA,
  DESIGUALDAD_PPI_GINI_HHI,
  PRUEBAS_WILCOXON_INTER_PLANES,
  obtenerCatalogoYConciliacionPpiLocal,
  obtenerCumplimientoMetasPddLocal,
  obtenerFronteraDeaPddLocal,
  obtenerEconometriaComparadaPddLocal,
  obtenerResumenEjecutivoPddDeaLocal,
} from "../data/pdd-dea-cartagena.data";
import {
  obtenerCatalogoYConciliacionPpiApi,
  obtenerCumplimientoMetasPddApi,
  obtenerFronteraDeaPddApi,
  obtenerEconometriaComparadaPddApi,
  obtenerResumenEjecutivoPddDeaApi,
} from "../services/plan-accion-dnp-api";
import { PddDeaEvaluacionPanel } from "../components/pdd-dea-evaluacion-panel";
import { TriadaMotoresTab } from "../components/triada-motores-tab";

describe("Laboratorio de Evaluación, Conciliación PPI y DEA Planes de Desarrollo ([TRIADA-FRONTEND-DEA-PDD-08])", () => {
  // ---------------------------------------------------------------------------
  // 1. CATÁLOGO HISTÓRICO Y CONCILIACIÓN OFICIAL DEL PPI (2012–2027)
  // ---------------------------------------------------------------------------
  describe("1. Catálogo Histórico y Conciliación Oficial del Plan Plurianual de Inversiones (PPI)", () => {
    it("el catálogo contiene los 5 Planes de Desarrollo Distritales y los 3 Planes Locales (2012–2027)", () => {
      expect(CATALOGO_PLANES_DESARROLLO).toHaveLength(6);
      const codigos = CATALOGO_PLANES_DESARROLLO.map((p) => p.codigo);
      expect(codigos).toContain("PDD_2024_2027");
      expect(codigos).toContain("PDD_2020_2023");
      expect(codigos).toContain("PDD_2016_2019");
      expect(codigos).toContain("PDD_2013_2015");
      expect(codigos).toContain("PDD_2012_2015");
      expect(codigos).toContain("PDL_2024_2027");

      expect(TABLA_OFICIAL_PPI_ANUAL.length).toBeGreaterThanOrEqual(8);
      expect(PPI_POR_LINEA_PDD_2024_2027).toHaveLength(6);
    });

    it("el PDD 2024–2027 «Cartagena, Ciudad de Derechos» (Acuerdo 139) tiene PPI oficial de $12,801B COP", () => {
      const pdd2024 = CATALOGO_PLANES_DESARROLLO.find((p) => p.codigo === "PDD_2024_2027");
      expect(pdd2024).toBeDefined();
      expect(pdd2024?.norma_adopcion).toBe("Acuerdo Distrital 139 del 29 de mayo de 2024");
      expect(pdd2024?.alcalde).toBe("Dumek Turbay Paz");
      expect(pdd2024?.ppi_total_cuatrienio_mcop).toBeGreaterThan(12_800_000);
      expect(pdd2024?.ppi_total_cuatrienio_mcop).toBeLessThan(12_801_000);
      expect(pdd2024?.metas_pdd_unicas).toBe(3170);
      expect(pdd2024?.indicadores_unicos).toBe(1753);
      expect(pdd2024?.entidades_participantes).toBe(29);
      expect(pdd2024?.filas_bd_csh).toBe(71990);
    });

    it("el PDD 2020–2023 «Salvemos Juntos a Cartagena» (P.A. 016/2020) tiene PPI de $6,023B COP", () => {
      const pdd2020 = CATALOGO_PLANES_DESARROLLO.find((p) => p.codigo === "PDD_2020_2023");
      expect(pdd2020).toBeDefined();
      expect(pdd2020?.alcalde).toBe("William Dau Chamat");
      expect(pdd2020?.ppi_total_cuatrienio_mcop).toBeGreaterThan(6_022_000);
      expect(pdd2020?.ppi_total_cuatrienio_mcop).toBeLessThan(6_024_000);
      expect(pdd2020?.metas_pdd_unicas).toBe(1832);
      expect(pdd2020?.filas_bd_csh).toBe(24421);
    });

    it("la conciliación PPI vs bd_csh evidencia factor de calibración 0.82x (2024–2027) y 0.80x (2020–2023)", () => {
      expect(CONCILIACION_PPI_BD_CSH.length).toBeGreaterThanOrEqual(6);

      const item2024 = CONCILIACION_PPI_BD_CSH.find((c) => c.vigencia === 2024);
      expect(item2024).toBeDefined();
      expect(item2024?.factor_calibracion).toBe(0.82);
      expect(item2024?.brecha_sobrerreporte_mcop).toBeGreaterThan(0);
      expect(item2024?.diagnostico_calibracion).toContain("calibración 0.82x");

      const item2020 = CONCILIACION_PPI_BD_CSH.find((c) => c.vigencia === 2020);
      expect(item2020).toBeDefined();
      expect(item2020?.factor_calibracion).toBe(0.80);
    });

    it("la serie histórica IPC DANE Base Cerrada 2025 = 100 cubre de 2012 a 2025 con inflación 2025 = 5.10%", () => {
      expect(SERIE_IPC_DANE_HISTORICA).toHaveLength(14);
      const d2025 = SERIE_IPC_DANE_HISTORICA.find((d) => d.anio === 2025);
      expect(d2025).toBeDefined();
      expect(d2025?.inflacion_pct).toBe(5.10);
      expect(d2025?.indice_base_2025).toBe(100.00);
      expect(d2025?.factor_deflactor_hacia_2025).toBe(1.000);

      const d2012 = SERIE_IPC_DANE_HISTORICA.find((d) => d.anio === 2012);
      expect(d2012).toBeDefined();
      expect(d2012?.factor_deflactor_hacia_2025).toBeGreaterThan(1.80);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. SEMÁFORO DE METAS, LÍNEA 1 SEGURIDAD HUMANA Y MACROPROYECTOS
  // ---------------------------------------------------------------------------
  describe("2. Semáforo de Cumplimiento de Metas PDD y Foco en Línea 1 «Seguridad Humana»", () => {
    it("el semáforo de metas del PDD 2024–2027 clasifica 3.170 metas únicas con 68% en ruta y 10.3% huérfanas", () => {
      const res2024 = RESUMEN_CUMPLIMIENTO_PLANES.find((r) => r.plan_codigo === "PDD_2024_2027");
      expect(res2024).toBeDefined();
      expect(res2024?.metas_totales_unicas).toBe(3170);
      expect(res2024?.metas_en_ruta_ge75).toBe(1932);
      expect(res2024?.porcentaje_en_ruta).toBeCloseTo(67.98, 1);
      expect(res2024?.metas_alerta_media_40_75).toBe(682);
      expect(res2024?.metas_rezago_critico_lt40).toBe(228);
      expect(res2024?.metas_huerfanas_sin_avance).toBe(328);
      expect(res2024?.porcentaje_huerfanas).toBeCloseTo(10.35, 1);
      expect(res2024?.avance_fisico_promedio_pct).toBe(72.4);
    });

    it("la Línea Estratégica 1 «Seguridad Humana» contiene 892 metas y sus 5 Componentes Impulsores (4.1 a 4.5)", () => {
      expect(COMPONENTES_SEGURIDAD_HUMANA_2024_2027).toHaveLength(5);
      const codigos = COMPONENTES_SEGURIDAD_HUMANA_2024_2027.map((c) => c.codigo);
      expect(codigos).toContain("4.1");
      expect(codigos).toContain("4.2");
      expect(codigos).toContain("4.3");
      expect(codigos).toContain("4.4");
      expect(codigos).toContain("4.5");

      const totalMetas = COMPONENTES_SEGURIDAD_HUMANA_2024_2027.reduce((acc, c) => acc + c.metas_cantidad, 0);
      expect(totalMetas).toBe(892);

      const c41 = COMPONENTES_SEGURIDAD_HUMANA_2024_2027.find((c) => c.codigo === "4.1");
      expect(c41?.nombre).toContain("Seguridad Ciudadana");
      expect(c41?.entidad_lider).toContain("Interior");
      expect(c41?.avance_promedio_pct).toBeGreaterThan(70);
    });

    it("el seguimiento a 19 Macroproyectos incluye Malecón del Mar, Drenajes Pluviales y Ciénaga de la Virgen", () => {
      expect(MACROPROYECTOS_ESTRATEGICOS_2024_2027).toHaveLength(19);
      const nombres = MACROPROYECTOS_ESTRATEGICOS_2024_2027.map((m) => m.nombre);
      expect(nombres.some((n) => n.includes("Malecón del Mar"))).toBe(true);
      expect(nombres.some((n) => n.includes("Drenajes Pluviales"))).toBe(true);
      expect(nombres.some((n) => n.includes("Ciénaga de la Virgen"))).toBe(true);
      expect(nombres.some((n) => n.includes("Vía Perimetral"))).toBe(true);
      expect(nombres.some((n) => n.includes("Nueva Cárcel Distrital"))).toBe(true);

      MACROPROYECTOS_ESTRATEGICOS_2024_2027.forEach((m) => {
        expect(m.inversion_ppi_mcop).toBeGreaterThan(0);
        expect(m.avance_fisico_pct).toBeGreaterThanOrEqual(0);
        expect(m.avance_fisico_pct).toBeLessThanOrEqual(100);
      });
    });

    it("los 3 Planes de Desarrollo Local (Localidades 1, 2 y 3) reportan fondos FDL y avance promedio", () => {
      expect(PLANES_DESARROLLO_LOCAL_AVANCE).toHaveLength(3);
      const locIds = PLANES_DESARROLLO_LOCAL_AVANCE.map((p) => p.localidad_id);
      expect(locIds).toEqual([1, 2, 3]);

      PLANES_DESARROLLO_LOCAL_AVANCE.forEach((p) => {
        expect(p.presupuesto_fdl_mcop).toBeGreaterThan(40_000);
        expect(p.avance_promedio_pct).toBeGreaterThan(60);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 3. FRONTERA EFICIENTE DEA DE PLANES DE DESARROLLO (HIGHS SOLVER)
  // ---------------------------------------------------------------------------
  describe("3. Frontera Eficiente DEA de Planes de Desarrollo (CCR · BCC · SBM · Slacks & Targets)", () => {
    it("cumple la Regla de Cooper para DMUs de entidades responsables del PDD (n=15 >= 9)", () => {
      const entidades2024 = DMUS_DEA_PDD_ENTIDADES.filter((d) => d.plan_codigo === "PDD_2024_2027");
      expect(entidades2024.length).toBeGreaterThanOrEqual(15);
      // Cooper: n >= max(m * s, 3 * (m + s)) = max(1*2, 3*3) = 9
      expect(entidades2024.length).toBeGreaterThanOrEqual(9);
    });

    it("todos los puntajes de eficiencia satisfacen cotas matemáticas 0 < theta <= 1 y theta_CCR <= theta_BCC", () => {
      DMUS_DEA_PDD_ENTIDADES.forEach((dmu) => {
        expect(dmu.theta_ccr).toBeGreaterThan(0);
        expect(dmu.theta_ccr).toBeLessThanOrEqual(1.0);
        expect(dmu.theta_bcc).toBeGreaterThan(0);
        expect(dmu.theta_bcc).toBeLessThanOrEqual(1.0);
        // Teorema DEA: theta_CCR <= theta_BCC
        expect(dmu.theta_ccr).toBeLessThanOrEqual(dmu.theta_bcc + 0.001);
      });
    });

    it("la eficiencia de escala SE = theta_CCR / theta_BCC está acotada en (0, 1] y clasifica retornos CRS, IRS y DRS", () => {
      DMUS_DEA_PDD_ENTIDADES.forEach((dmu) => {
        expect(dmu.escala_eficiencia_se).toBeGreaterThan(0);
        expect(dmu.escala_eficiencia_se).toBeLessThanOrEqual(1.001);
        expect(["CRS", "IRS", "DRS"]).toContain(dmu.retornos_escala);
      });

      const retornos = DMUS_DEA_PDD_ENTIDADES.map((d) => d.retornos_escala);
      expect(retornos).toContain("CRS");
      expect(retornos).toContain("IRS");
      expect(retornos).toContain("DRS");
    });

    it("las holguras (slacks) y metas objetivo (targets) prescriben incrementos no negativos en metas cumplidas", () => {
      DMUS_DEA_PDD_ENTIDADES.forEach((dmu) => {
        const { slacks, targets } = dmu;
        expect(slacks.slack_x1_mcop).toBeGreaterThanOrEqual(0);
        expect(slacks.slack_y1_metas).toBeGreaterThanOrEqual(0);
        expect(slacks.slack_y2_indicadores).toBeGreaterThanOrEqual(0);

        expect(targets.target_x1_mcop).toBeLessThanOrEqual(dmu.x1_ppi_conciliado_constante_2025_mcop);
        expect(targets.target_y1_metas).toBeGreaterThanOrEqual(dmu.y1_metas_pdd_cumplidas_equivalentes - 0.001);
        expect(targets.target_y2_indicadores).toBeGreaterThanOrEqual(dmu.y2_indicadores_eficaces_ge75);

        // Si no es frontera, tiene peers de referencia
        if (!dmu.es_frontera) {
          expect(dmu.peers.length).toBeGreaterThan(0);
        }
      });
    });

    it("la frontera DEA programática por Línea Estratégica evalúa las 6 líneas y sus retornos de escala", () => {
      expect(DMUS_DEA_PDD_LINEAS_ESTRATEGICAS).toHaveLength(6);
      const nombresLineas = DMUS_DEA_PDD_LINEAS_ESTRATEGICAS.map((l) => l.linea_nombre);
      expect(nombresLineas).toContain("Seguridad Humana");
      expect(nombresLineas).toContain("Vida Digna");
      expect(nombresLineas).toContain("Desarrollo Económico Equitativo");

      DMUS_DEA_PDD_LINEAS_ESTRATEGICAS.forEach((linea) => {
        expect(linea.theta_ccr).toBeGreaterThan(0);
        expect(linea.theta_ccr).toBeLessThanOrEqual(1.0);
        expect(linea.theta_bcc).toBeGreaterThan(0);
        expect(linea.theta_bcc).toBeLessThanOrEqual(1.0);
        expect(linea.theta_ccr).toBeLessThanOrEqual(linea.theta_bcc + 0.001);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 4. ECONOMETRÍA COMPARADA, MALMQUIST, FDR, GINI Y WILCOXON
  // ---------------------------------------------------------------------------
  describe("4. Econometría Comparada, Malmquist Inter-Planes, FDR y Contraste de Wilcoxon", () => {
    it("el índice dinámico de Malmquist inter-planes muestra crecimiento acumulado (MPI = 1.050 sexenio)", () => {
      expect(MALMQUIST_INTER_PLANES_DATA).toHaveLength(3);

      const sexenio = MALMQUIST_INTER_PLANES_DATA.find((m) => m.periodo_transicion.includes("2016–2027"));
      expect(sexenio).toBeDefined();
      expect(sexenio?.mpi_medio_geometrico).toBe(1.050);
      expect(sexenio?.effch_catch_up_medio).toBe(1.028);
      expect(sexenio?.techch_desplazamiento_medio).toBe(1.021);
      expect(sexenio?.entidades_con_avance_mpi).toBe(23);

      // Verificación de descomposición geométrica aproximada MPI = EFFCH * TECHCH
      const mpiCalc = sexenio!.effch_catch_up_medio * sexenio!.techch_desplazamiento_medio;
      expect(Math.abs(mpiCalc - sexenio!.mpi_medio_geometrico)).toBeLessThan(0.005);
    });

    it("la matriz de correlaciones con control FDR Benjamini-Hochberg garantiza q-value >= p-value", () => {
      expect(CORRELACIONES_PDD_FDR_DATA.length).toBeGreaterThanOrEqual(4);

      CORRELACIONES_PDD_FDR_DATA.forEach((cor) => {
        expect(cor.q_value_fdr).toBeGreaterThanOrEqual(cor.p_value);
        expect(cor.n_observaciones).toBe(28);
        expect(cor.coeficiente_spearman).toBeGreaterThan(-1.0);
        expect(cor.coeficiente_spearman).toBeLessThan(1.0);
      });

      const ppiVsMetas = CORRELACIONES_PDD_FDR_DATA.find((c) => c.par_variables.includes("PPI") && c.par_variables.includes("Metas"));
      expect(ppiVsMetas).toBeDefined();
      expect(ppiVsMetas?.coeficiente_spearman).toBeGreaterThan(0.65);
      expect(ppiVsMetas?.significativo_al_5pct).toBe(true);
    });

    it("la desigualdad presupuestal del PPI mide concentración con coeficientes Gini y HHI", () => {
      expect(DESIGUALDAD_PPI_GINI_HHI).toHaveLength(3);
      const d2024 = DESIGUALDAD_PPI_GINI_HHI.find((d) => d.plan_codigo === "PDD_2024_2027");
      expect(d2024).toBeDefined();
      expect(d2024?.gini_ppi_lineas).toBe(0.512);
      expect(d2024?.hhi_ppi_lineas).toBe(1810);
      expect(d2024?.linea_mayor_participacion).toContain("Vida Digna");
      expect(d2024?.pct_linea_mayor).toBeCloseTo(37.69, 1);
    });

    it("la prueba pareada de Wilcoxon rechaza la hipótesis nula de igualdad entre 2020-2023 y 2024-2027 (p < 0.01)", () => {
      expect(PRUEBAS_WILCOXON_INTER_PLANES).toHaveLength(2);
      const testDauVsDumek = PRUEBAS_WILCOXON_INTER_PLANES.find((w) => w.comparacion.includes("2020–2023 vs. PDD 2024–2027"));
      expect(testDauVsDumek).toBeDefined();
      expect(testDauVsDumek?.p_value).toBeLessThan(0.01);
      expect(testDauVsDumek?.diferencia_mediana_pct).toBe(7.4);
      expect(testDauVsDumek?.n_entidades_comunes).toBe(26);
      expect(testDauVsDumek?.conclusion_estadistica).toContain("Rechaza H0");
    });
  });

  // ---------------------------------------------------------------------------
  // 5. CLIENTES API Y FALLBACKS LOCALES
  // ---------------------------------------------------------------------------
  describe("5. Clientes API Tipados y Fallbacks Locales Resilientes", () => {
    it("los 5 getters locales retornan estructuras íntegras sin depender de la red", () => {
      const cat = obtenerCatalogoYConciliacionPpiLocal();
      expect(cat.catalogo_planes.length).toBeGreaterThan(0);
      expect(cat.tabla_ppi_anual.length).toBeGreaterThan(0);

      const cum = obtenerCumplimientoMetasPddLocal({ plan: "PDD_2024_2027" });
      expect(cum.resumen_planes.length).toBeGreaterThan(0);
      expect(cum.componentes_seguridad_humana).toHaveLength(5);
      expect(cum.macroproyectos).toHaveLength(19);

      const fro = obtenerFronteraDeaPddLocal({ plan: "PDD_2024_2027", insumo: "conciliado_ppi" });
      expect(fro.ranking_entidades.length).toBeGreaterThanOrEqual(15);
      expect(fro.eficiencia_media_bcc_entidades).toBeGreaterThan(0.80);

      const eco = obtenerEconometriaComparadaPddLocal();
      expect(eco.malmquist_inter_planes).toHaveLength(3);
      expect(eco.correlaciones_fdr.length).toBeGreaterThan(0);

      const res = obtenerResumenEjecutivoPddDeaLocal();
      expect(res.version_motor).toBe("POLIS-PDD-DEA-HiGHS-v1.0");
      expect(res.catalogo).toBeDefined();
      expect(res.cumplimiento).toBeDefined();
      expect(res.frontera).toBeDefined();
      expect(res.econometria).toBeDefined();
    });

    it("los 5 clientes API devuelven fallback seguro en ausencia de backend en tests", async () => {
      const catApi = await obtenerCatalogoYConciliacionPpiApi();
      expect(catApi.catalogo_planes.length).toBeGreaterThan(0);

      const cumApi = await obtenerCumplimientoMetasPddApi({ plan: "PDD_2024_2027" });
      expect(cumApi.resumen_planes.length).toBeGreaterThan(0);

      const froApi = await obtenerFronteraDeaPddApi({ plan: "PDD_2024_2027" });
      expect(froApi.ranking_entidades.length).toBeGreaterThan(0);

      const ecoApi = await obtenerEconometriaComparadaPddApi();
      expect(ecoApi.malmquist_inter_planes.length).toBeGreaterThan(0);

      const resApi = await obtenerResumenEjecutivoPddDeaApi();
      expect(resApi.version_motor).toContain("POLIS-PDD-DEA");
    });
  });

  // ---------------------------------------------------------------------------
  // 6. RENDERIZADO SSR Y COMPONENTES
  // ---------------------------------------------------------------------------
  describe("6. Integración y Renderizado SSR de PddDeaEvaluacionPanel y TriadaMotoresTab", () => {
    it("PddDeaEvaluacionPanel se renderiza correctamente en SSR con las 4 pestañas y data-testid", () => {
      const html = renderToString(<PddDeaEvaluacionPanel puedeEditar={false} />);
      expect(html).toContain('data-testid="panel-pdd-dea"');
      expect(html).toContain('data-testid="tab-pdd-catalogo-ppi"');
      expect(html).toContain('data-testid="tab-pdd-cumplimiento"');
      expect(html).toContain('data-testid="tab-pdd-frontera-dea"');
      expect(html).toContain('data-testid="tab-pdd-econometria"');
      expect(html).toContain("Evaluación &amp; DEA de Planes de Desarrollo");
      expect(html).toContain("12,801 Billones");
    });

    it("TriadaMotoresTab incluye el botón tab-nav-pdd-dea para la Sub-vista 6", () => {
      const html = renderToString(<TriadaMotoresTab puedeEditar={false} />);
      expect(html).toContain('data-testid="tab-nav-pdd-dea"');
      expect(html).toContain("6. Evaluación &amp; DEA Planes de Desarrollo (2012–2027 · Acuerdo 139)");
    });
  });
});
