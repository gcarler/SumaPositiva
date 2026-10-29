import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import {
  CATALOGO_PLANES_DESARROLLO,
  TABLA_OFICIAL_PPI_ANUAL,
  PPI_POR_LINEA_PDD_2024_2027,
  CONCILIACION_PPI_BD_CSH,
  SERIE_IPC_DANE_HISTORICA,
  FONDOS_DESARROLLO_LOCAL_DETALLE,
  ARBOL_PROGRAMATICO_PDD_2024_2027,
  ESTADISTICAS_CRUCE_TRIPARTITO_PDD,
  MONITOR_SEGURIDAD_HUMANA_DATA,
  RESUMEN_CUMPLIMIENTO_PLANES,
  COMPONENTES_SEGURIDAD_HUMANA_2024_2027,
  MACROPROYECTOS_ESTRATEGICOS_2024_2027,
  PLANES_DESARROLLO_LOCAL_AVANCE,
  DMUS_DEA_PDD_ENTIDADES,
  DMUS_DEA_PDD_LINEAS_ESTRATEGICAS,
  FRONTERA_DEA_PDL_LOCALIDADES,
  MALMQUIST_INTER_PLANES_DATA,
  CORRELACIONES_PDD_FDR_DATA,
  DESIGUALDAD_PPI_GINI_HHI,
  PRUEBAS_WILCOXON_INTER_PLANES,
  PLANES_OCTETO_CANONICO,
  EJES_OFICIALES_PDD_2012_2015,
  OBJETIVOS_OFICIALES_PDD_2016_2019,
  RESUMEN_EMPAREJAMIENTO_METAS_OFICIALES,
  obtenerCatalogoYConciliacionPpiLocal,
  obtenerCumplimientoMetasPddLocal,
  obtenerFronteraDeaPddLocal,
  obtenerEconometriaComparadaPddLocal,
  obtenerExploradorProgramasYSeguridadHumanaLocal,
  obtenerResumenEjecutivoPddDeaLocal,
  AUDITORIA_METAS_8_PLANES,
  NETWORK_DEA_BI_ETAPA,
  SIMULADOR_INVERSE_DEA_PARETO,
  JUSTICIA_TERRITORIAL_PDL_DANE,
  PLIEGOS_CONTROL_POLITICO_FISCAL,
  obtenerLaboratorioPrescriptivoPddLocal,
  METRICAS_CIERRE_DOCUMENTAL_WORKSPACE,
} from "../data/pdd-dea-cartagena.data";
import {
  obtenerCatalogoYConciliacionPpiApi,
  obtenerCumplimientoMetasPddApi,
  obtenerFronteraDeaPddApi,
  obtenerEconometriaComparadaPddApi,
  obtenerExploradorProgramasYSeguridadHumanaApi,
  obtenerResumenEjecutivoPddDeaApi,
  obtenerLaboratorioPrescriptivoPddApi,
} from "../services/plan-accion-dnp-api";
import {
  obtenerEstadoGoogleWorkspace,
  sincronizarGoogleWorkspace,
  ESTADO_WORKSPACE_INICIAL,
} from "../services/google-workspace-api";
import { GoogleWorkspaceSyncCard } from "../components/google-workspace-sync-card";
import { PddDeaEvaluacionPanel } from "../components/pdd-dea-evaluacion-panel";
import { TriadaMotoresTab } from "../components/triada-motores-tab";

describe("Centro de Mando de Planes de Desarrollo, Conciliación PPI y DEA ([TRIADA-FRONTEND-DATA-PDD-09])", () => {
  // ---------------------------------------------------------------------------
  // 1. CATÁLOGO HISTÓRICO Y CONCILIACIÓN OFICIAL DEL PPI (2012–2027 + 3 PDL)
  // ---------------------------------------------------------------------------
  describe("1. Catálogo Histórico y Conciliación Oficial del Plan Plurianual de Inversiones (PPI)", () => {
    it("1. el catálogo contiene los 5 Planes de Desarrollo Distritales y los 3 Planes Locales (2012–2027)", () => {
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

    it("2. el PDD 2024–2027 «Cartagena, Ciudad de Derechos» (Acuerdo 139) tiene PPI oficial de $12,801B COP", () => {
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

    it("3. el PDD 2020–2023 «Salvemos Juntos a Cartagena» (P.A. 016/2020) tiene PPI de $6,023B COP", () => {
      const pdd2020 = CATALOGO_PLANES_DESARROLLO.find((p) => p.codigo === "PDD_2020_2023");
      expect(pdd2020).toBeDefined();
      expect(pdd2020?.alcalde).toBe("William Dau Chamat");
      expect(pdd2020?.ppi_total_cuatrienio_mcop).toBeGreaterThan(6_022_000);
      expect(pdd2020?.ppi_total_cuatrienio_mcop).toBeLessThan(6_024_000);
      expect(pdd2020?.metas_pdd_unicas).toBe(1832);
      expect(pdd2020?.filas_bd_csh).toBe(24421);
    });

    it("4. el PDD 2013–2015 «Ahora Sí Cartagena» (Acuerdo 016/2013) tiene PPI de $1.874.167.605.000 COP", () => {
      const pdd2013 = CATALOGO_PLANES_DESARROLLO.find((p) => p.codigo === "PDD_2013_2015");
      expect(pdd2013).toBeDefined();
      expect(pdd2013?.nombre_oficial).toBe("Ahora Sí Cartagena");
      expect(pdd2013?.norma_adopcion).toBe("Acuerdo Distrital 016 del 26 de diciembre de 2013");
      expect(pdd2013?.alcalde).toBe("Dionisio Vélez Trujillo");
      expect(pdd2013?.ppi_total_cuatrienio_mcop).toBe(1874167.605);
      expect(pdd2013?.filas_bd_csh).toBe(1245);
    });

    it("5. los 3 Fondos de Desarrollo Local (PDL 2024–2027) suman $304,98 mil millones COP", () => {
      expect(FONDOS_DESARROLLO_LOCAL_DETALLE).toHaveLength(3);
      const totalFdl = FONDOS_DESARROLLO_LOCAL_DETALLE.reduce((acc, f) => acc + f.total_fdl_mcop, 0);
      expect(totalFdl).toBeCloseTo(304981.04, 1);

      const fdl1 = FONDOS_DESARROLLO_LOCAL_DETALLE.find((f) => f.localidad_id === 1);
      expect(fdl1?.total_fdl_mcop).toBeCloseTo(97691.04, 1);
      expect(fdl1?.nombre_localidad).toContain("Histórica");

      const fdl2 = FONDOS_DESARROLLO_LOCAL_DETALLE.find((f) => f.localidad_id === 2);
      expect(fdl2?.total_fdl_mcop).toBeCloseTo(161289.996, 1);
      expect(fdl2?.nombre_localidad).toContain("Virgen");

      const fdl3 = FONDOS_DESARROLLO_LOCAL_DETALLE.find((f) => f.localidad_id === 3);
      expect(fdl3?.total_fdl_mcop).toBe(46000.0);
      expect(fdl3?.nombre_localidad).toContain("Industrial");
    });

    it("6. la conciliación PPI vs bd_csh evidencia factor de calibración 0.82x (2024–2027) y 0.80x (2020–2023)", () => {
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

    it("7. la serie histórica IPC DANE Base Cerrada 2025 = 100 cubre de 2012 a 2025 con inflación 2025 = 5.10%", () => {
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
  // 2. EXPLORADOR PROGRAMÁTICO (42 IMPULSORES & 172 PROGRAMAS)
  // ---------------------------------------------------------------------------
  describe("2. Explorador de Líneas, Impulsores y Programas Oficiales", () => {
    it("8. el árbol programático contiene los impulsores y programas con techos y metas", () => {
      expect(ARBOL_PROGRAMATICO_PDD_2024_2027.length).toBeGreaterThanOrEqual(10);
      const codigos = ARBOL_PROGRAMATICO_PDD_2024_2027.map((p) => p.codigo_impulsor);
      expect(codigos).toContain("1.1");
      expect(codigos).toContain("1.2");
      expect(codigos).toContain("1.3");
      expect(codigos).toContain("2.1");

      const pTitan = ARBOL_PROGRAMATICO_PDD_2024_2027.find((p) => p.codigo_programa === "1.1.1");
      expect(pTitan).toBeDefined();
      expect(pTitan?.nombre_programa).toContain("Titán 24");
      expect(pTitan?.presupuesto_cuatrienio_mcop).toBeCloseTo(35547.29, 1);
      expect(pTitan?.entidad_responsable).toContain("Distriseguridad");
    });
  });

  // ---------------------------------------------------------------------------
  // 3. SEMÁFORO DE METAS & CRUCE TRIPARTITO (PDD <-> PA <-> BPIM)
  // ---------------------------------------------------------------------------
  describe("3. Cumplimiento de Metas & Imputación Tripartita (PDD ↔ PA ↔ Presupuesto)", () => {
    it("9. el cruce tripartito cuantifica 99.424 filas PDD, 28.630 en PA y 20.953 con presupuesto", () => {
      expect(ESTADISTICAS_CRUCE_TRIPARTITO_PDD.filas_totales_pdd).toBe(99424);
      expect(ESTADISTICAS_CRUCE_TRIPARTITO_PDD.filas_avance_propio_pdd).toBe(32330);
      expect(ESTADISTICAS_CRUCE_TRIPARTITO_PDD.filas_con_avance_en_pa).toBe(28630);
      expect(ESTADISTICAS_CRUCE_TRIPARTITO_PDD.filas_con_soporte_presupuestal).toBe(20953);
      expect(ESTADISTICAS_CRUCE_TRIPARTITO_PDD.filas_saneadas_linea_estrategica).toBe(72701);
    });

    it("10. la imputación tripartita resuelve 226 metas huérfanas y eleva el avance a 78.42%", () => {
      expect(ESTADISTICAS_CRUCE_TRIPARTITO_PDD.metas_huerfanas_directas).toBe(328);
      expect(ESTADISTICAS_CRUCE_TRIPARTITO_PDD.metas_huerfanas_tripartitas_resueltas).toBe(226);
      expect(ESTADISTICAS_CRUCE_TRIPARTITO_PDD.metas_huerfanas_remanentes).toBe(102);
      expect(ESTADISTICAS_CRUCE_TRIPARTITO_PDD.avance_directo_pdd_pct).toBe(67.98);
      expect(ESTADISTICAS_CRUCE_TRIPARTITO_PDD.avance_consolidado_tripartito_pct).toBe(78.42);
    });

    it("11. el semáforo directo clasifica 3.170 metas únicas con 68% en ruta y 10.3% huérfanas", () => {
      const res2024 = RESUMEN_CUMPLIMIENTO_PLANES.find((r) => r.plan_codigo === "PDD_2024_2027");
      expect(res2024).toBeDefined();
      expect(res2024?.metas_totales_unicas).toBe(3170);
      expect(res2024?.metas_en_ruta_ge75).toBe(1932);
      expect(res2024?.porcentaje_en_ruta).toBeCloseTo(67.98, 1);
      expect(res2024?.metas_alerta_media_40_75).toBe(682);
      expect(res2024?.metas_rezago_critico_lt40).toBe(228);
      expect(res2024?.metas_huerfanas_sin_avance).toBe(328);
      expect(res2024?.porcentaje_huerfanas).toBeCloseTo(10.35, 1);
    });

    it("12. el seguimiento a 19 Macroproyectos incluye Malecón del Mar, Drenajes Pluviales y Ciénaga de la Virgen", () => {
      expect(MACROPROYECTOS_ESTRATEGICOS_2024_2027).toHaveLength(19);
      const nombres = MACROPROYECTOS_ESTRATEGICOS_2024_2027.map((m) => m.nombre);
      expect(nombres.some((n) => n.includes("Malecón del Mar"))).toBe(true);
      expect(nombres.some((n) => n.includes("Drenajes Pluviales"))).toBe(true);
      expect(nombres.some((n) => n.includes("Ciénaga de la Virgen"))).toBe(true);
      expect(nombres.some((n) => n.includes("Vía Perimetral"))).toBe(true);
      expect(nombres.some((n) => n.includes("Nueva Cárcel Distrital"))).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. MONITOR LÍNEA 1: SEGURIDAD HUMANA ($5,67B COP)
  // ---------------------------------------------------------------------------
  describe("4. Monitor Línea 1 «Seguridad Humana» (Acuerdo 139 / 2024–2027)", () => {
    it("13. la Línea 1 asigna $5.666.917.744.338 COP representando el 44.27% del PDD cuatrienal", () => {
      expect(MONITOR_SEGURIDAD_HUMANA_DATA.presupuesto_total_mcop).toBe(5666917.74);
      expect(MONITOR_SEGURIDAD_HUMANA_DATA.porcentaje_del_pdd).toBe(44.27);
      expect(MONITOR_SEGURIDAD_HUMANA_DATA.recursos_sin_sgr_mcop).toBe(5658533.74);
      expect(MONITOR_SEGURIDAD_HUMANA_DATA.recursos_sgr_mcop).toBe(8384.0);
    });

    it("14. el Impulsor 1.1 Seguridad Ciudadana y Titán 24 tiene asignados $211.387,6 M COP", () => {
      const imp11 = MONITOR_SEGURIDAD_HUMANA_DATA.impulsores.find((i) => i.codigo === "1.1");
      expect(imp11).toBeDefined();
      expect(imp11?.presupuesto_ppi_mcop).toBe(211387.6);
      expect(imp11?.entidad_lider).toContain("Interior");
      expect(imp11?.programas_destacados?.some((p) => p.includes("Titán 24"))).toBe(true);
    });

    it("15. los 5 Impulsores de Seguridad Humana totalizan 892 metas PDD", () => {
      expect(COMPONENTES_SEGURIDAD_HUMANA_2024_2027).toHaveLength(5);
      const totalMetas = COMPONENTES_SEGURIDAD_HUMANA_2024_2027.reduce((acc, c) => acc + c.metas_cantidad, 0);
      expect(totalMetas).toBe(892);
    });

    it("16. el monitor articula las 8 Dimensiones PNUD de la Seguridad Humana", () => {
      expect(MONITOR_SEGURIDAD_HUMANA_DATA.dimensiones_pnud).toHaveLength(8);
      const nombres = MONITOR_SEGURIDAD_HUMANA_DATA.dimensiones_pnud.map((d) => d.dimension);
      expect(nombres).toContain("Económica");
      expect(nombres).toContain("Alimentaria");
      expect(nombres).toContain("Salud");
      expect(nombres).toContain("Ambiental");
      expect(nombres).toContain("Personal");
    });

    it("17. el monitor cruza 35 Mesas Territoriales, 10 Compromisos PAS y 12.280 hurtos georreferenciados", () => {
      expect(MONITOR_SEGURIDAD_HUMANA_DATA.mesas_territoriales.total_mesas).toBe(35);
      expect(MONITOR_SEGURIDAD_HUMANA_DATA.mesas_territoriales.demandas_priorizadas_seguridad).toBe(142);
      expect(MONITOR_SEGURIDAD_HUMANA_DATA.compromisos_pas.total_compromisos).toBe(10);
      expect(MONITOR_SEGURIDAD_HUMANA_DATA.compromisos_pas.articulacion_pct).toBe(80.0);
      expect(MONITOR_SEGURIDAD_HUMANA_DATA.delincuencia_hurtos.total_registros_georreferenciados).toBe(12280);
      expect(MONITOR_SEGURIDAD_HUMANA_DATA.delincuencia_hurtos.intervencion_titan24_priorizada).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. FRONTERA DEA MULTI-NIVEL (ENTIDADES, LÍNEAS & PDL)
  // ---------------------------------------------------------------------------
  describe("5. Frontera Eficiente DEA Multi-Nivel con HiGHS Solver", () => {
    it("18. cumple la Regla de Cooper para DMUs de entidades responsables del PDD (n=28 >= 9)", () => {
      const entidades2024 = DMUS_DEA_PDD_ENTIDADES.filter((d) => d.plan_codigo === "PDD_2024_2027");
      expect(entidades2024.length).toBeGreaterThanOrEqual(15);
      expect(DMUS_DEA_PDD_ENTIDADES.length).toBe(28);
      expect(DMUS_DEA_PDD_ENTIDADES.length).toBeGreaterThanOrEqual(9);
    });

    it("19. los puntajes de eficiencia satisfacen cotas matemáticas 0 < theta <= 1 y theta_CCR <= theta_BCC", () => {
      DMUS_DEA_PDD_ENTIDADES.forEach((dmu) => {
        expect(dmu.theta_ccr).toBeGreaterThan(0);
        expect(dmu.theta_ccr).toBeLessThanOrEqual(1.0);
        expect(dmu.theta_bcc).toBeGreaterThan(0);
        expect(dmu.theta_bcc).toBeLessThanOrEqual(1.0);
        expect(dmu.theta_ccr).toBeLessThanOrEqual(dmu.theta_bcc + 0.001);
      });
    });

    it("20. la eficiencia de escala SE = theta_CCR / theta_BCC está acotada en (0, 1] y clasifica retornos RTS", () => {
      DMUS_DEA_PDD_ENTIDADES.forEach((dmu) => {
        expect(dmu.escala_eficiencia_se).toBeGreaterThan(0);
        expect(dmu.escala_eficiencia_se).toBeLessThanOrEqual(1.001);
        expect(["CRS", "IRS", "DRS"]).toContain(dmu.retornos_escala);
      });
    });

    it("21. las holguras (slacks) y metas objetivo (targets) prescriben incrementos no negativos", () => {
      DMUS_DEA_PDD_ENTIDADES.forEach((dmu) => {
        const { slacks, targets } = dmu;
        expect(slacks.slack_x1_mcop).toBeGreaterThanOrEqual(0);
        expect(slacks.slack_y1_metas).toBeGreaterThanOrEqual(0);
        expect(slacks.slack_y2_indicadores).toBeGreaterThanOrEqual(0);

        expect(targets.target_x1_mcop).toBeLessThanOrEqual(dmu.x1_ppi_conciliado_constante_2025_mcop);
        expect(targets.target_y1_metas).toBeGreaterThanOrEqual(dmu.y1_metas_pdd_cumplidas_equivalentes - 0.001);
      });
    });

    it("22. la frontera DEA programática por Línea Estratégica evalúa las 6 líneas del Acuerdo 139", () => {
      expect(DMUS_DEA_PDD_LINEAS_ESTRATEGICAS).toHaveLength(6);
      const nombresLineas = DMUS_DEA_PDD_LINEAS_ESTRATEGICAS.map((l) => l.linea_nombre);
      expect(nombresLineas).toContain("Seguridad Humana");
      expect(nombresLineas).toContain("Vida Digna");
    });

    it("23. la frontera DEA territorial por Localidad PDL evalúa los 3 Planes Locales", () => {
      expect(FRONTERA_DEA_PDL_LOCALIDADES).toHaveLength(3);
      FRONTERA_DEA_PDL_LOCALIDADES.forEach((loc) => {
        expect(loc.theta_bcc).toBeGreaterThan(0);
        expect(loc.theta_bcc).toBeLessThanOrEqual(1.0);
        expect(loc.theta_ccr).toBeLessThanOrEqual(loc.theta_bcc + 0.001);
        expect(loc.x1_fdl_presupuesto_constante_2025_mcop).toBeGreaterThan(0);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 6. ECONOMETRÍA COMPARADA, MALMQUIST, FDR, GINI Y WILCOXON
  // ---------------------------------------------------------------------------
  describe("6. Econometría Comparada, Malmquist Inter-Planes, FDR y Wilcoxon", () => {
    it("24. el índice dinámico de Malmquist inter-planes muestra crecimiento acumulado (MPI = 1.050)", () => {
      expect(MALMQUIST_INTER_PLANES_DATA).toHaveLength(3);
      const sexenio = MALMQUIST_INTER_PLANES_DATA.find((m) => m.periodo_transicion.includes("2016–2027"));
      expect(sexenio).toBeDefined();
      expect(sexenio?.mpi_medio_geometrico).toBe(1.050);
      expect(sexenio?.effch_catch_up_medio).toBe(1.028);
      expect(sexenio?.techch_desplazamiento_medio).toBe(1.021);
      expect(sexenio?.entidades_con_avance_mpi).toBe(23);
    });

    it("25. la matriz de correlaciones con control FDR garantiza q-value >= p-value", () => {
      expect(CORRELACIONES_PDD_FDR_DATA.length).toBeGreaterThanOrEqual(4);
      CORRELACIONES_PDD_FDR_DATA.forEach((cor) => {
        expect(cor.q_value_fdr).toBeGreaterThanOrEqual(cor.p_value);
        expect(cor.n_observaciones).toBe(28);
      });
    });

    it("26. la concentración del PPI se cuantifica con Gini = 0.512 y HHI = 1810 para el PDD 2024–2027", () => {
      const d2024 = DESIGUALDAD_PPI_GINI_HHI.find((d) => d.plan_codigo === "PDD_2024_2027");
      expect(d2024).toBeDefined();
      expect(d2024?.gini_ppi_lineas).toBe(0.512);
      expect(d2024?.hhi_ppi_lineas).toBe(1810);
    });

    it("27. la prueba pareada de Wilcoxon rechaza H0 entre 2020-2023 y 2024-2027 (p = 0.0038 < 0.01)", () => {
      const testDauVsDumek = PRUEBAS_WILCOXON_INTER_PLANES.find((w) => w.comparacion.includes("2020–2023 vs. PDD 2024–2027"));
      expect(testDauVsDumek).toBeDefined();
      expect(testDauVsDumek?.p_value).toBeLessThan(0.01);
      expect(testDauVsDumek?.diferencia_mediana_pct).toBe(7.4);
      expect(testDauVsDumek?.n_entidades_comunes).toBe(26);
      expect(testDauVsDumek?.conclusion_estadistica).toContain("Rechaza H0");
    });
  });

  // ---------------------------------------------------------------------------
  // 7. CLIENTES API Y FALLBACKS LOCALES
  // ---------------------------------------------------------------------------
  describe("7. Clientes API Tipados y Fallbacks Locales Resilientes", () => {
    it("28. los getters locales devuelven estructuras íntegras de catálogo, explorador y frontera", () => {
      const cat = obtenerCatalogoYConciliacionPpiLocal();
      expect(cat.catalogo_planes.length).toBe(6);
      expect(cat.fondos_desarrollo_local.length).toBe(3);

      const exp = obtenerExploradorProgramasYSeguridadHumanaLocal();
      expect(exp.fondos_locales.length).toBe(3);
      expect(exp.arbol_impulsores_programas.length).toBeGreaterThan(0);
      expect(exp.monitor_seguridad_humana.presupuesto_total_mcop).toBeGreaterThan(5_000_000);
      expect(exp.cruce_tripartito.filas_totales_pdd).toBe(99424);

      const fro = obtenerFronteraDeaPddLocal({ plan: "PDD_2024_2027", nivel: "LOCALIDADES_PDL" });
      expect(fro.ranking_localidades_pdl.length).toBe(3);

      const cum = obtenerCumplimientoMetasPddLocal({ plan: "PDD_2024_2027" });
      expect(cum.resumen_planes.length).toBeGreaterThan(0);

      const eco = obtenerEconometriaComparadaPddLocal();
      expect(eco.malmquist_inter_planes.length).toBe(3);

      expect(PLANES_DESARROLLO_LOCAL_AVANCE).toHaveLength(3);
    });

    it("29. los clientes API devuelven fallback seguro en ausencia de red", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Offline"));
      try {
        const catApi = await obtenerCatalogoYConciliacionPpiApi();
        expect(catApi.catalogo_planes.length).toBe(6);

        const expApi = await obtenerExploradorProgramasYSeguridadHumanaApi();
        expect(expApi.fondos_locales.length).toBe(3);

        const cumApi = await obtenerCumplimientoMetasPddApi({ plan: "PDD_2024_2027" });
        expect(cumApi.resumen_planes.length).toBeGreaterThan(0);

        const froApi = await obtenerFronteraDeaPddApi({ plan: "PDD_2024_2027" });
        expect(froApi.ranking_entidades.length).toBeGreaterThan(0);

        const ecoApi = await obtenerEconometriaComparadaPddApi();
        expect(ecoApi.malmquist_inter_planes.length).toBeGreaterThan(0);

        const resApi = await obtenerResumenEjecutivoPddDeaApi();
        expect(resApi.version_motor).toContain("POLIS-PDD-DEA");
      } finally {
        fetchSpy.mockRestore();
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 8. RENDERIZADO SSR Y COMPONENTES
  // ---------------------------------------------------------------------------
  describe("8. Integración y Renderizado SSR de PddDeaEvaluacionPanel y TriadaMotoresTab", () => {
    it("30. PddDeaEvaluacionPanel se renderiza en SSR con las 6 sub-pestañas y sus test IDs", () => {
      const html = renderToString(<PddDeaEvaluacionPanel puedeEditar={false} />);
      expect(html).toContain('data-testid="panel-pdd-dea"');
      expect(html).toContain('data-testid="tab-pdd-catalogo-ppi"');
      expect(html).toContain('data-testid="tab-pdd-explorador"');
      expect(html).toContain('data-testid="tab-pdd-cumplimiento"');
      expect(html).toContain('data-testid="tab-pdd-seguridad-humana"');
      expect(html).toContain('data-testid="tab-pdd-frontera-dea"');
      expect(html).toContain('data-testid="tab-pdd-econometria"');
      expect(html).toContain("Evaluación &amp; DEA de Planes de Desarrollo");
      expect(html).toContain("12,801 Billones");
    });

    it("31. TriadaMotoresTab incluye el botón tab-nav-pdd-dea para la Sub-vista 6", () => {
      const html = renderToString(<TriadaMotoresTab puedeEditar={false} />);
      expect(html).toContain('data-testid="tab-nav-pdd-dea"');
      expect(html).toContain("6. Evaluación &amp; DEA Planes de Desarrollo (2012–2027 · Acuerdo 139)");
    });

    it("32. el resumen ejecutivo PDD-DEA consolida los 5 submódulos en un solo objeto auditado", () => {
      const res = obtenerResumenEjecutivoPddDeaLocal();
      expect(res.catalogo).toBeDefined();
      expect(res.cumplimiento).toBeDefined();
      expect(res.frontera).toBeDefined();
      expect(res.econometria).toBeDefined();
      expect(res.explorador).toBeDefined();
      expect(res.version_motor).toBe("POLIS-PDD-DEA-HiGHS-v2.0");
    });
  });

  // ---------------------------------------------------------------------------
  // 9. CIERRE TOTAL DE TECHOS OFICIALES OCR, METAS Y SERIE PLURIANUAL 2012–2027
  // ---------------------------------------------------------------------------
  describe("9. Cierre Total de Techos Oficiales OCR, Metas de Acuerdos y Serie 2012–2027 ([TRIADA-FRONTEND-CIERRE-TOTAL-10])", () => {
    it("33. el PPI OCR de PDD 2012–2015 («Campo para Todos» - Acuerdo 001/2012) es exactamente $3.049.788.268.000 COP y desglosa sus 5 Ejes Oficiales", () => {
      const pdd2012 = CATALOGO_PLANES_DESARROLLO.find((p) => p.codigo === "PDD_2012_2015");
      expect(pdd2012).toBeDefined();
      expect(pdd2012?.ppi_total_cuatrienio_mcop).toBe(3049788.268);
      expect(pdd2012?.ppi_estado).toBe("OFICIAL_EXTRAIDO");
      expect(pdd2012?.norma_adopcion).toBe("Acuerdo Distrital 001 del 4 de julio de 2012");
      expect(pdd2012?.fuente_archivo_md).toBe("pdd_2012_2015_acuerdo_001_campo_para_todos.md");

      expect(EJES_OFICIALES_PDD_2012_2015).toHaveLength(5);
      const totalEjes = EJES_OFICIALES_PDD_2012_2015.reduce((sum, e) => sum + e.monto_total_cuatrienio_mcop, 0);
      expect(totalEjes).toBeCloseTo(3049788.268, 2);

      const eje1 = EJES_OFICIALES_PDD_2012_2015.find((e) => e.eje_codigo === "EJE_1");
      expect(eje1?.monto_total_cuatrienio_mcop).toBe(196661.713);
      expect(eje1?.participacion_pct).toBe(6.45);

      const eje2 = EJES_OFICIALES_PDD_2012_2015.find((e) => e.eje_codigo === "EJE_2");
      expect(eje2?.monto_total_cuatrienio_mcop).toBe(2068532.775);
      expect(eje2?.participacion_pct).toBe(67.83);

      const eje3 = EJES_OFICIALES_PDD_2012_2015.find((e) => e.eje_codigo === "EJE_3");
      expect(eje3?.monto_total_cuatrienio_mcop).toBe(179995.114);
      expect(eje3?.participacion_pct).toBe(5.9);

      const eje4 = EJES_OFICIALES_PDD_2012_2015.find((e) => e.eje_codigo === "EJE_4");
      expect(eje4?.monto_total_cuatrienio_mcop).toBe(434185.669);
      expect(eje4?.participacion_pct).toBe(14.24);

      const eje5 = EJES_OFICIALES_PDD_2012_2015.find((e) => e.eje_codigo === "EJE_5");
      expect(eje5?.monto_total_cuatrienio_mcop).toBe(170412.997);
      expect(eje5?.participacion_pct).toBe(5.59);
    });

    it("34. el PPI OCR de PDD 2016–2019 («Primero la Gente» - Acuerdo 006/2016 Tabla 209) es $4.331.941.000.000 COP con 3 Objetivos Estratégicos y conciliación 1.06x", () => {
      const pdd2016 = CATALOGO_PLANES_DESARROLLO.find((p) => p.codigo === "PDD_2016_2019");
      expect(pdd2016).toBeDefined();
      expect(pdd2016?.ppi_total_cuatrienio_mcop).toBe(4331941.0);
      expect(pdd2016?.ppi_estado).toBe("OFICIAL_EXTRAIDO");
      expect(pdd2016?.norma_adopcion).toBe("Acuerdo Distrital 006 del 13 de junio de 2016");
      expect(pdd2016?.fuente_archivo_md).toBe("pdd_2016_2019_acuerdo_006_primero_la_gente.md");

      expect(OBJETIVOS_OFICIALES_PDD_2016_2019).toHaveLength(3);
      const totalObj = OBJETIVOS_OFICIALES_PDD_2016_2019.reduce((sum, o) => sum + o.monto_total_cuatrienio_mcop, 0);
      expect(totalObj).toBe(4331941.0);

      const obj1 = OBJETIVOS_OFICIALES_PDD_2016_2019.find((o) => o.objetivo_codigo === "OBJ_1");
      expect(obj1?.monto_total_cuatrienio_mcop).toBe(3183163.0);
      expect(obj1?.participacion_pct).toBe(73.0);

      const obj2 = OBJETIVOS_OFICIALES_PDD_2016_2019.find((o) => o.objetivo_codigo === "OBJ_2");
      expect(obj2?.monto_total_cuatrienio_mcop).toBe(852631.0);
      expect(obj2?.participacion_pct).toBe(20.0);

      const obj3 = OBJETIVOS_OFICIALES_PDD_2016_2019.find((o) => o.objetivo_codigo === "OBJ_3");
      expect(obj3?.monto_total_cuatrienio_mcop).toBe(296147.0);
      expect(obj3?.participacion_pct).toBe(7.0);

      const conc2016 = CONCILIACION_PPI_BD_CSH.find((c) => c.plan_codigo === "PDD_2016_2019");
      expect(conc2016).toBeDefined();
      expect(conc2016?.ppi_oficial_acuerdo_mcop).toBe(4331941.0);
      expect(conc2016?.reportado_matrices_bd_csh_mcop).toBe(4603448.54);
      expect(conc2016?.factor_calibracion).toBe(1.06);
      expect(conc2016?.brecha_sobrerreporte_mcop).toBeCloseTo(271507.54, 1);
    });

    it("35. el octeto canónico de 8 planes (5 PDD + 3 PDL) tiene el 100% de techos oficiales extraídos (ppi_estado === 'OFICIAL_EXTRAIDO' y ppi_total_corriente_cop > 0)", () => {
      expect(PLANES_OCTETO_CANONICO).toHaveLength(8);

      const pdds = PLANES_OCTETO_CANONICO.filter((p) => p.tipo === "PDD");
      const pdls = PLANES_OCTETO_CANONICO.filter((p) => p.tipo === "PDL");
      expect(pdds).toHaveLength(5);
      expect(pdls).toHaveLength(3);

      for (const plan of PLANES_OCTETO_CANONICO) {
        expect(plan.ppi_estado).toBe("OFICIAL_EXTRAIDO");
        expect(plan.ppi_total_corriente_cop).toBeGreaterThan(0);
        expect(plan.ppi_total_constante_2025_cop).toBeGreaterThan(0);
        expect(plan.lineas_o_ejes_count).toBeGreaterThan(0);
      }

      for (const plan of CATALOGO_PLANES_DESARROLLO) {
        expect(plan.ppi_estado).toBe("OFICIAL_EXTRAIDO");
        expect(plan.ppi_total_cuatrienio_mcop).toBeGreaterThan(0);
      }
    });

    it("36. el emparejamiento semántico vincula las 2.068 metas oficiales extraídas de los Acuerdos con bd_csh", () => {
      expect(RESUMEN_EMPAREJAMIENTO_METAS_OFICIALES).toHaveLength(5);

      const totalOficiales = RESUMEN_EMPAREJAMIENTO_METAS_OFICIALES.reduce(
        (sum, r) => sum + r.total_metas_oficiales_acuerdo,
        0
      );
      expect(totalOficiales).toBe(2068);

      const pdd2024 = RESUMEN_EMPAREJAMIENTO_METAS_OFICIALES.find((r) => r.plan_codigo === "PDD_2024_2027");
      expect(pdd2024?.total_metas_oficiales_acuerdo).toBe(892);
      expect(pdd2024?.metas_vinculadas_bd_csh).toBe(874);

      const pdd2020 = RESUMEN_EMPAREJAMIENTO_METAS_OFICIALES.find((r) => r.plan_codigo === "PDD_2020_2023");
      expect(pdd2020?.total_metas_oficiales_acuerdo).toBe(486);
      expect(pdd2020?.metas_vinculadas_bd_csh).toBe(462);

      const pdd2016 = RESUMEN_EMPAREJAMIENTO_METAS_OFICIALES.find((r) => r.plan_codigo === "PDD_2016_2019");
      expect(pdd2016?.total_metas_oficiales_acuerdo).toBe(312);
      expect(pdd2016?.metas_vinculadas_bd_csh).toBe(298);

      const pdd2013 = RESUMEN_EMPAREJAMIENTO_METAS_OFICIALES.find((r) => r.plan_codigo === "PDD_2013_2015");
      expect(pdd2013?.total_metas_oficiales_acuerdo).toBe(218);
      expect(pdd2013?.metas_vinculadas_bd_csh).toBe(206);

      const pdd2012 = RESUMEN_EMPAREJAMIENTO_METAS_OFICIALES.find((r) => r.plan_codigo === "PDD_2012_2015");
      expect(pdd2012?.total_metas_oficiales_acuerdo).toBe(160);
      expect(pdd2012?.metas_vinculadas_bd_csh).toBe(144);

      const totalVinculadas = RESUMEN_EMPAREJAMIENTO_METAS_OFICIALES.reduce(
        (sum, r) => sum + r.metas_vinculadas_bd_csh,
        0
      );
      expect(totalVinculadas).toBe(1984);
      expect(totalVinculadas / totalOficiales).toBeGreaterThan(0.95);
    });

    it("37. la tabla anualizada oficial del PPI cubre las 16 vigencias completas (2012–2027) sin vacíos", () => {
      expect(TABLA_OFICIAL_PPI_ANUAL).toHaveLength(16);

      const vigencias = TABLA_OFICIAL_PPI_ANUAL.map((t) => t.vigencia);
      const esperadas = [2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027];
      expect(vigencias).toEqual(esperadas);

      for (const fila of TABLA_OFICIAL_PPI_ANUAL) {
        expect(fila.monto_corriente_mcop).toBeGreaterThan(0);
        expect(fila.monto_constante_2025_mcop).toBeGreaterThan(0);
        expect(fila.factor_deflactacion_ipc).toBeGreaterThan(0);
        expect(fila.recursos_distritales_ordinarios_mcop).toBeGreaterThan(0);
      }

      const totalCorriente = TABLA_OFICIAL_PPI_ANUAL.reduce((sum, f) => sum + f.monto_corriente_mcop, 0);
      expect(totalCorriente).toBeGreaterThan(26_000_000);
    });
  });

  // ---------------------------------------------------------------------------
  // 10. LABORATORIO PRESCRIPTIVO PDD, NETWORK DEA BI-ETAPA & CONTROL FISCAL
  // ---------------------------------------------------------------------------
  describe("10. Laboratorio Prescriptivo PDD, Network DEA Bi-Etapa, Simulador Inverse DEA Pareto y Control Fiscal ([TRIADA-FRONTEND-LAB-PDD-11B])", () => {
    it("38. el modelo Network DEA Bi-Etapa evalúa las 12 entidades identificando ilusión burocrática (brecha theta_1 - theta_2 > 0.20) y estabilidad de ranking", () => {
      expect(NETWORK_DEA_BI_ETAPA).toHaveLength(12);

      for (const item of NETWORK_DEA_BI_ETAPA) {
        expect(item.score_etapa1_operativa_pa).toBeGreaterThan(0);
        expect(item.score_etapa1_operativa_pa).toBeLessThanOrEqual(1.0);
        expect(item.score_etapa2_estrategica_pdd).toBeGreaterThan(0);
        expect(item.score_etapa2_estrategica_pdd).toBeLessThanOrEqual(1.0);
        expect(item.score_global_red).toBeGreaterThan(0);
        expect(item.score_global_red).toBeLessThanOrEqual(1.0);
        expect(item.brecha_ilusion_burocratica).toBeCloseTo(
          item.score_etapa1_operativa_pa - item.score_etapa2_estrategica_pdd,
          3
        );
        expect(["ESTABLE", "MODERADO", "VOLATIL"]).toContain(item.ranking_robustness);
      }

      // Ilusión burocrática en DATT, Corvivienda y EPA (> 0.20)
      const ilusionBurocratica = NETWORK_DEA_BI_ETAPA.filter((n) => n.diagnostico === "ILUSION_BUROCRATICA");
      expect(ilusionBurocratica).toHaveLength(3);
      const siglasIlusion = ilusionBurocratica.map((n) => n.entidad_codigo);
      expect(siglasIlusion).toContain("DATT");
      expect(siglasIlusion).toContain("CORVIVIENDA");
      expect(siglasIlusion).toContain("EPA_CARTAGENA");

      for (const item of ilusionBurocratica) {
        expect(item.brecha_ilusion_burocratica).toBeGreaterThan(0.20);
      }

      // Alta efectividad integral
      const altaEfectividad = NETWORK_DEA_BI_ETAPA.filter((n) => n.diagnostico === "ALTA_EFECTIVIDAD_INTEGRAL");
      expect(altaEfectividad).toHaveLength(6);
      const siglasAlta = altaEfectividad.map((n) => n.entidad_codigo);
      expect(siglasAlta).toContain("SEC_INTERIOR");
      expect(siglasAlta).toContain("SEC_INFRAESTRUCTURA");
      expect(siglasAlta).toContain("DISTRISEGURIDAD");
    });

    it("39. el simulador Inverse DEA Pareto implementa 3 escenarios (±5%, ±10%, ±15%) con suma cero estricta y ledger de restricciones", () => {
      expect(SIMULADOR_INVERSE_DEA_PARETO).toHaveLength(3);

      const niveles = SIMULADOR_INVERSE_DEA_PARETO.map((s) => s.nivel_flexibilidad);
      expect(niveles).toEqual(["±5%", "±10%", "±15%"]);

      // Escenario ±5%
      const s5 = SIMULADOR_INVERSE_DEA_PARETO.find((s) => s.nivel_flexibilidad === "±5%")!;
      expect(s5.factor_alpha).toBe(0.05);
      expect(s5.monto_total_movilizado_mcop).toBe(152000.0);
      expect(s5.ganancia_cumplimiento_pp).toBe(1.8);
      expect(s5.suma_cero_verificada).toBe(true);

      // Escenario ±10%
      const s10 = SIMULADOR_INVERSE_DEA_PARETO.find((s) => s.nivel_flexibilidad === "±10%")!;
      expect(s10.factor_alpha).toBe(0.10);
      expect(s10.monto_total_movilizado_mcop).toBe(304000.0);
      expect(s10.ganancia_cumplimiento_pp).toBe(3.4);
      expect(s10.suma_cero_verificada).toBe(true);

      // Escenario ±15%
      const s15 = SIMULADOR_INVERSE_DEA_PARETO.find((s) => s.nivel_flexibilidad === "±15%")!;
      expect(s15.factor_alpha).toBe(0.15);
      expect(s15.monto_total_movilizado_mcop).toBe(456000.0);
      expect(s15.ganancia_cumplimiento_pp).toBe(4.9);
      expect(s15.suma_cero_verificada).toBe(true);

      // Suma cero estricta en cada escenario: sum(delta_presupuesto_mcop) === 0
      for (const s of SIMULADOR_INVERSE_DEA_PARETO) {
        const sumaDelta = s.reasignaciones.reduce((acc, r) => acc + r.delta_presupuesto_mcop, 0);
        expect(sumaDelta).toBe(0);

        // Donantes vs Receptores
        const donantes = s.reasignaciones.filter((r) => r.rol_reasignacion === "DONANTE_RECURSOS");
        const receptores = s.reasignaciones.filter((r) => r.rol_reasignacion === "RECEPTOR_OPTIMO");
        expect(donantes.length).toBeGreaterThan(0);
        expect(receptores.length).toBeGreaterThan(0);

        // Ledger de restricciones
        expect(s.ledger_restricciones.vigencias_futuras_blindadas_mcop).toBe(412500.0);
        expect(s.ledger_restricciones.destinacion_sgp_intocable_mcop).toBe(1680000.0);
        expect(s.ledger_restricciones.limite_ley_617_cumplido).toBe(true);
        expect(s.ledger_restricciones.advertencia_metodologica).toContain("Simulación");
      }
      expect(s5.ledger_restricciones.advertencia_metodologica).toContain("causalidad");
    });

    it("40. la auditoría forense de metas de los 8 planes (5 PDD + 3 PDL) desglosa 6 estados de cobertura y 4 niveles taxonómicos MGA", () => {
      expect(AUDITORIA_METAS_8_PLANES).toHaveLength(8);

      const codigos = AUDITORIA_METAS_8_PLANES.map((p) => p.plan_codigo);
      expect(codigos).toContain("PDD_2024_2027");
      expect(codigos).toContain("PDD_2020_2023");
      expect(codigos).toContain("PDD_2016_2019");
      expect(codigos).toContain("PDD_2013_2015");
      expect(codigos).toContain("PDD_2012_2015");
      expect(codigos).toContain("PDL_2024_2027_LOC1");
      expect(codigos).toContain("PDL_2024_2027_LOC2");
      expect(codigos).toContain("PDL_2024_2027_LOC3");

      const totalMetas8Planes = AUDITORIA_METAS_8_PLANES.reduce((acc, p) => acc + p.total_metas_oficiales, 0);
      expect(totalMetas8Planes).toBe(2428);

      const metas5Pdd = AUDITORIA_METAS_8_PLANES
        .filter((p) => p.tipo === "PDD")
        .reduce((acc, p) => acc + p.total_metas_oficiales, 0);
      expect(metas5Pdd).toBe(2068);

      for (const p of AUDITORIA_METAS_8_PLANES) {
        // Validación de suma de los 6 estados de cobertura
        const sumaCobertura =
          p.vinculadas_alta_confianza +
          p.candidato_baja_confianza +
          p.duplicadas_fuentes_pdd +
          p.sin_corpus_historico +
          p.sin_codigo_o_entidad +
          p.sin_reporte_alerta_fiscal;
        expect(sumaCobertura).toBe(p.total_metas_oficiales);

        // Validación de suma de las 4 taxonomías MGA
        const sumaMga =
          p.mga_resultado_impacto +
          p.mga_producto_cuantificable +
          p.mga_gestion_proceso_blando +
          p.mga_revision_humana;
        expect(sumaMga).toBe(p.total_metas_oficiales);

        expect(p.pct_cobertura_efectiva).toBeGreaterThan(0);
        expect(p.pct_cobertura_efectiva).toBeLessThanOrEqual(100);
      }
    });

    it("41. la justicia territorial DANE 2025 calcula inversión FDL per cápita para 1.065.570 hab., 35 mesas y compuerta Moran N < 30", () => {
      expect(JUSTICIA_TERRITORIAL_PDL_DANE.poblacion_total_distrito).toBe(1_065_570);
      expect(JUSTICIA_TERRITORIAL_PDL_DANE.mesas_totales_distrito).toBe(35);
      expect(JUSTICIA_TERRITORIAL_PDL_DANE.fdl_total_distrito_mcop).toBe(304981.04);
      expect(JUSTICIA_TERRITORIAL_PDL_DANE.inversion_per_capita_media_cop).toBe(286214.0);

      expect(JUSTICIA_TERRITORIAL_PDL_DANE.localidades).toHaveLength(3);
      const l1 = JUSTICIA_TERRITORIAL_PDL_DANE.localidades.find((l) => l.localidad_id === 1)!;
      const l2 = JUSTICIA_TERRITORIAL_PDL_DANE.localidades.find((l) => l.localidad_id === 2)!;
      const l3 = JUSTICIA_TERRITORIAL_PDL_DANE.localidades.find((l) => l.localidad_id === 3)!;

      expect(l1.poblacion_dane_2025).toBe(412580);
      expect(l2.poblacion_dane_2025).toBe(348190);
      expect(l3.poblacion_dane_2025).toBe(304800);

      const sumaPoblacion = l1.poblacion_dane_2025 + l2.poblacion_dane_2025 + l3.poblacion_dane_2025;
      expect(sumaPoblacion).toBe(1_065_570);

      const sumaMesas = l1.mesas_ciudadanas_count + l2.mesas_ciudadanas_count + l3.mesas_ciudadanas_count;
      expect(sumaMesas).toBe(35);

      // Balance hurtos: 12.280 totales
      expect(JUSTICIA_TERRITORIAL_PDL_DANE.balance_hurtos).toHaveLength(2);
      const urbano = JUSTICIA_TERRITORIAL_PDL_DANE.balance_hurtos.find((b) => b.zona === "URBANA")!;
      const rural = JUSTICIA_TERRITORIAL_PDL_DANE.balance_hurtos.find((b) => b.zona === "RURAL_INSULAR")!;

      expect(urbano.hurtos_count).toBe(11890);
      expect(urbano.participacion_pct).toBe(96.82);
      expect(rural.hurtos_count).toBe(390);
      expect(rural.participacion_pct).toBe(3.18);
      expect(urbano.hurtos_count + rural.hurtos_count).toBe(12280);

      // Compuerta Moran N < 30
      expect(urbano.compuerta_moran).toBe("NO_ESTIMABLE_N_MENOR_30");
      expect(rural.compuerta_moran).toBe("NO_ESTIMABLE_N_MENOR_30");
    });

    it("42. los pliegos de control político/fiscal estructuran cuestionarios por dependencia con hash SHA-256 verificado", () => {
      expect(PLIEGOS_CONTROL_POLITICO_FISCAL).toHaveLength(4);

      const codigos = PLIEGOS_CONTROL_POLITICO_FISCAL.map((p) => p.entidad_codigo);
      expect(codigos).toContain("DATT");
      expect(codigos).toContain("CORVIVIENDA");
      expect(codigos).toContain("EPA_CARTAGENA");
      expect(codigos).toContain("SEC_INTERIOR");

      const datt = PLIEGOS_CONTROL_POLITICO_FISCAL.find((p) => p.entidad_codigo === "DATT")!;
      expect(datt.nivel_alerta).toBe("CRITICA");
      expect(datt.brecha_ilusion_burocratica).toBe(0.230);
      expect(datt.metas_sin_reporte_count).toBe(12);
      expect(datt.cuestionario_control_politico.length).toBeGreaterThanOrEqual(3);
      expect(datt.hash_sha256_dictamen).toHaveLength(64);

      for (const p of PLIEGOS_CONTROL_POLITICO_FISCAL) {
        expect(p.cuestionario_control_politico.length).toBeGreaterThan(0);
        expect(p.hash_sha256_dictamen).toMatch(/^[a-f0-9]{64}$/);
        expect(p.hallazgo_principal.length).toBeGreaterThan(10);
        expect(p.recomendacion_fiscal.length).toBeGreaterThan(10);
      }
    });

    it("43. el cliente API obtenerLaboratorioPrescriptivoPddApi devuelve estructura completa con fallback seguro offline", async () => {
      const local = obtenerLaboratorioPrescriptivoPddLocal();
      expect(local.auditoria_metas_8_planes).toBeDefined();
      expect(local.network_dea_bi_etapa).toBeDefined();
      expect(local.simulador_inverse_dea).toBeDefined();
      expect(local.justicia_territorial).toBeDefined();
      expect(local.pliegos_control_politico).toBeDefined();
      expect(local.metadata.version_laboratorio).toContain("POLIS-LAB-PRESCRIPTIVO");

      // Simular offline para verificar fallback
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Offline"));
      try {
        const res = await obtenerLaboratorioPrescriptivoPddApi();
        expect(res).toBeDefined();
        expect(res.network_dea_bi_etapa).toHaveLength(12);
        expect(res.simulador_inverse_dea).toHaveLength(3);
        expect(res.auditoria_metas_8_planes).toHaveLength(8);
      } finally {
        fetchSpy.mockRestore();
      }
    });

    it("44. PddDeaEvaluacionPanel incluye la sub-pestaña 7 de Laboratorio Prescriptivo y el id pdd-tab-prescriptivo", () => {
      const html = renderToString(<PddDeaEvaluacionPanel puedeEditar={false} />);
      expect(html).toContain('data-testid="pdd-tab-laboratorio-prescriptivo"');
      expect(html).toContain('id="pdd-tab-prescriptivo"');
      expect(html).toContain("7. Laboratorio Prescriptivo &amp; Control Fiscal");
    });

    it("45. métricas de cierre documental reflejan 1.805 metas únicas deduplicadas, 78 PDFs y 1.383 documentos totales", () => {
      const m = METRICAS_CIERRE_DOCUMENTAL_WORKSPACE;
      expect(m.metas_totales_brutas).toBe(2078);
      expect(m.metas_unicas_deduplicadas).toBe(1805);
      expect(m.metas_duplicadas_consolidadas).toBe(273);
      expect(m.metas_totales_brutas - m.metas_duplicadas_consolidadas).toBe(m.metas_unicas_deduplicadas);
      expect(m.pdfs_planes_accion_ingeridos).toBe(78);
      expect(m.libros_excel_ingeridos).toBe(1305);
      expect(m.total_documentos_catalogo).toBe(1383);
      expect(m.pdfs_planes_accion_ingeridos + m.libros_excel_ingeridos).toBe(m.total_documentos_catalogo);
      expect(m.porcentaje_catalogo_cubierto).toBe(100.0);
      expect(m.cobertura_sobre_metas_unicas_pct).toBe(100.0);
      expect(m.entidades_cubiertas).toBe(29);
      expect(m.mesas_oficiales_censo).toBe(35);
      expect(m.agendas_oficiales_censo).toBe(36);
      expect(m.corregimientos_oficiales).toBe(11);
    });

    it("46. cliente API de Google Workspace implementa estado y sincronización con fallback seguro offline", async () => {
      expect(ESTADO_WORKSPACE_INICIAL.conectado).toBe(false);
      expect(ESTADO_WORKSPACE_INICIAL.service_account_email).toBe("polis-pshc@polis-511719.iam.gserviceaccount.com");
      expect(ESTADO_WORKSPACE_INICIAL.carpeta_pshc_id).toBe("1UktNyzYEMg_kTRyAt7xfF3GExJV2aZq6");
      expect(ESTADO_WORKSPACE_INICIAL.subcarpeta_expediente_id).toBe("1pIGP34SOqQqsNpF1cqGPh0YIVgDNSYwe");
      expect(ESTADO_WORKSPACE_INICIAL.archivos_nativos_detectados).toHaveLength(0);

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network down"));
      try {
        const estado = await obtenerEstadoGoogleWorkspace();
        expect(estado.conectado).toBe(false);
        expect(estado.carpeta_pshc_id).toBe("1UktNyzYEMg_kTRyAt7xfF3GExJV2aZq6");
        expect(estado.subcarpeta_expediente_id).toBe("1pIGP34SOqQqsNpF1cqGPh0YIVgDNSYwe");
        expect(estado.archivos_nativos_detectados).toHaveLength(0);

        const sync = await sincronizarGoogleWorkspace();
        // Conforme a 257-H04, ante caída de red nunca se debe enmascarar como éxito
        expect(sync.exito).toBe(false);
        expect(sync.esContingencia).toBe(true);
        expect(sync.archivos_sincronizados.length).toBe(0);
      } finally {
        fetchSpy.mockRestore();
      }
    });

    it("47. GoogleWorkspaceSyncCard renderiza data-testid='google-workspace-sync-card', botón de sync y métricas clave", () => {
      const html = renderToString(
        <GoogleWorkspaceSyncCard
          metricas={METRICAS_CIERRE_DOCUMENTAL_WORKSPACE}
          puedeEditar={true}
        />
      );
      expect(html).toContain('data-testid="google-workspace-sync-card"');
      expect(html).toContain('data-testid="btn-sync-google-workspace"');
      expect(html).toContain("1.805");
      expect(html).toContain("2.078");
      expect(html).toContain("brutas");
      expect(html).toContain("78");
      expect(html).toContain("1.383");
      expect(html).toContain("29");
      expect(html).toContain("35");
      expect(html).toContain("11 corregimientos");
      expect(html).toContain("1UktNyzYEMg_kTRyAt7xfF3GExJV2aZq6");
      expect(html).toContain("1pIGP34SOqQqsNpF1cqGPh0YIVgDNSYwe");
      expect(html).toContain("polis-pshc@polis-511719.iam.gserviceaccount.com");
    });

    it("48. PddDeaEvaluacionPanel incluye acceso a Google Workspace PSHC y embebe la tarjeta de sincronización", () => {
      const htmlNav = renderToString(<PddDeaEvaluacionPanel puedeEditar={true} />);
      expect(htmlNav).toContain("Google Workspace PSHC");
      expect(htmlNav).toContain('data-testid="btn-nav-google-workspace"');

      const htmlLab = renderToString(
        <PddDeaEvaluacionPanel
          puedeEditar={true}
          subvistaInicial="laboratorio_prescriptivo_pdd"
        />
      );
      expect(htmlLab).toContain('data-testid="google-workspace-sync-card"');
      expect(htmlLab).toContain('data-testid="btn-sync-google-workspace"');
    });
  });
});
