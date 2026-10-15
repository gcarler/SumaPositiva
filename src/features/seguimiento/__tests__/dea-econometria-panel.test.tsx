import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import {
  SEED_AUDITORIA_SANEAMIENTO,
  SEED_FRONTERA_2025_RESPUESTA,
  SEED_DMUS_VIGENCIA_2025,
  SEED_MALMQUIST_RESPUESTA,
  SEED_SEGUNDA_ETAPA_ECONOMETRICA,
  SEED_RESUMEN_INTEGRAL_DEA,
  generarFronteraPorVigencia,
} from "../data/dea-econometria-cartagena.data";
import {
  obtenerAuditoriaSaneamientoDeaLocal,
  obtenerFronteraEficienciaDeaLocal,
  obtenerMalmquistDeaLocal,
  obtenerSegundaEtapaEconometricaDeaLocal,
  obtenerResumenIntegralDeaLocal,
} from "../services/plan-accion-dnp-api";
import { DeaEconometriaPanel } from "../components/dea-econometria-panel";
import { TriadaMotoresTab } from "../components/triada-motores-tab";

describe("Laboratorio de Econometría y Frontera Eficiente DEA ([TRIADA-FRONTEND-DEA-ECONOMETRIA-07B])", () => {
  // ---------------------------------------------------------------------------
  // 1. FASE 0: AUDITORÍA Y SANEAMIENTO FORENSE (RECONCILIACIÓN Y DEFLACTACIÓN)
  // ---------------------------------------------------------------------------
  describe("1. Fase 0: Auditoría y Cascada de Saneamiento Econométrico", () => {
    it("el embudo financiero reconcilia los $293,8B brutos con la capacidad anual saneada", () => {
      const embudo = SEED_AUDITORIA_SANEAMIENTO.embudo_financiero;
      expect(embudo.presupuesto_bruto_cop).toBe(293845000000000);
      expect(embudo.duplicados_intermotor_filas).toBe(58719);
      expect(embudo.bpim_complementarios_preservados).toBe(252);
      expect(embudo.filas_interinstitucionales_preservadas).toBe(15614);
      expect(embudo.grupos_repetidos_despropagados).toBe(1004);
      expect(embudo.sumatorios_podados).toBe(4812);
      expect(embudo.total_registros_bd).toBe(217740);
      // El presupuesto saneado anualizado está en el orden de $2,4B a $6,3B
      expect(embudo.presupuesto_anual_saneado_promedio_cop).toBeGreaterThanOrEqual(2400000000000);
      expect(embudo.presupuesto_anual_saneado_promedio_cop).toBeLessThanOrEqual(6300000000000);
    });

    it("la deflactación IPC DANE utiliza la Base Cerrada 2025 (5,10%) y cubre de 2017 a 2026", () => {
      const defl = SEED_AUDITORIA_SANEAMIENTO.deflactacion_ipc_dane;
      expect(defl).toHaveLength(10);

      const d2025 = defl.find((d) => d.vigencia === 2025);
      expect(d2025).toBeDefined();
      expect(d2025?.inflacion_anual_pct).toBe(5.10);
      expect(d2025?.factor_deflactor_base_2025).toBe(1.000);
      expect(d2025?.estado).toBe("BASE_CERRADA_100");

      const d2017 = defl.find((d) => d.vigencia === 2017);
      expect(d2017?.inflacion_anual_pct).toBe(4.09);
      expect(d2017?.factor_deflactor_base_2025).toBeGreaterThan(1.50);

      const d2026 = defl.find((d) => d.vigencia === "2026_PARCIAL");
      expect(d2026?.estado).toBe("CORTE_PARCIAL_PROVISIONAL");
    });

    it("la auditoría de escalas porcentuales aísla las 373 hojas mixtas y 42 casos en cuarentena", () => {
      const esc = SEED_AUDITORIA_SANEAMIENTO.auditoria_escalas_porcentuales;
      expect(esc.total_hojas_motor_analizadas).toBe(1466);
      expect(esc.hojas_mixtas_detectadas).toBe(373);
      expect(esc.reconciliadas_cociente_ejec_prog).toBe(373);
      expect(esc.casos_cuarentena_escala_ambigua).toBe(42);
      expect(esc.casos_mayores_100_auditados).toBe(18);
    });

    it("los 6 pares entidad-año sin insumo financiero se excluyen estrictamente sin epsilon artificial", () => {
      const pares = SEED_AUDITORIA_SANEAMIENTO.pares_sin_insumo_financiero;
      expect(pares).toHaveLength(6);
      expect(pares.every((p) => p.tratamiento_metodologico.includes("sin epsilon artificial"))).toBe(true);

      const siglas = pares.map((p) => p.sigla);
      expect(siglas).toContain("ALHCN");
      expect(siglas).toContain("ALVT");
      expect(siglas).toContain("ALIB");
      expect(siglas).toContain("IDACCC");
      expect(siglas).toContain("SDE");
    });
  });

  // ---------------------------------------------------------------------------
  // 2. FASE 1: MODELO LINEAL DEA Y FRONTERA EFICIENTE (HIGHS SOLVER)
  // ---------------------------------------------------------------------------
  describe("2. Fase 1: Frontera de Eficiencia DEA (CCR · BCC · SBM · Bootstrap)", () => {
    it("cumple la Regla de Cooper n >= 9 para el modelo núcleo m=1, s=2", () => {
      expect(SEED_FRONTERA_2025_RESPUESTA.dmus_estimables).toBeGreaterThanOrEqual(
        SEED_FRONTERA_2025_RESPUESTA.cooper_n_minimo
      );
      expect(SEED_FRONTERA_2025_RESPUESTA.cooper_n_minimo).toBe(9);
      expect(SEED_FRONTERA_2025_RESPUESTA.ranking_eficiencia.length).toBe(30);
    });

    it("todos los puntajes de eficiencia theta satisfacen las cotas teóricas 0 < theta <= 1", () => {
      SEED_DMUS_VIGENCIA_2025.forEach((dmu) => {
        expect(dmu.theta_ccr).toBeGreaterThan(0);
        expect(dmu.theta_ccr).toBeLessThanOrEqual(1.0);
        expect(dmu.theta_bcc).toBeGreaterThan(0);
        expect(dmu.theta_bcc).toBeLessThanOrEqual(1.0);
        // Teorema DEA: theta_CCR <= theta_BCC
        expect(dmu.theta_ccr).toBeLessThanOrEqual(dmu.theta_bcc + 0.001);

        // Eficiencia de escala SE = theta_CCR / theta_BCC <= 1.0
        expect(dmu.escala_eficiencia_se).toBeLessThanOrEqual(1.001);
        expect(dmu.escala_eficiencia_se).toBeGreaterThan(0);

        // SBM de Tone <= theta_BCC
        expect(dmu.theta_sbm).toBeLessThanOrEqual(dmu.theta_bcc + 0.001);

        // Bootstrap corrigió sesgo y está acotado en el IC 95%
        expect(dmu.theta_bootstrap_corregido).toBeGreaterThanOrEqual(dmu.ic95_inf - 0.001);
        expect(dmu.theta_bootstrap_corregido).toBeLessThanOrEqual(dmu.ic95_sup + 0.001);
      });
    });

    it("las holguras (slacks) y metas objetivo (targets) son coherentes con la frontera envolvente", () => {
      SEED_DMUS_VIGENCIA_2025.forEach((dmu) => {
        const { holguras_slacks: slacks, metas_target_frontera: targets } = dmu;

        // Target de insumo = X - Slack_X <= X
        expect(targets.target_x1_mcop).toBeLessThanOrEqual(dmu.x1_presupuesto_constante_2025_mcop);
        expect(targets.target_x1_mcop + slacks.slack_x1_mcop).toBe(dmu.x1_presupuesto_constante_2025_mcop);

        // Target de producto = Y + Slack_Y >= Y
        expect(targets.target_y1_metas).toBeGreaterThanOrEqual(dmu.y1_metas_pdd_equivalentes - 0.001);
        expect(targets.target_y2_actividades).toBeGreaterThanOrEqual(dmu.y2_actividades_pa_equivalentes - 0.001);

        // Peers tienen ponderadores lambda positivos y suman aproximadamente 1 en BCC
        if (dmu.theta_bcc < 0.999) {
          expect(dmu.peers.length).toBeGreaterThan(0);
          const sumaLambdas = dmu.peers.reduce((acc, p) => acc + p.lambda, 0);
          expect(sumaLambdas).toBeGreaterThanOrEqual(0.70);
          expect(sumaLambdas).toBeLessThan(1.30);
        }
      });
    });

    it("las fronteras de grupo distinguen cumplimiento de Cooper para Sector Central y Descentralizadas", () => {
      const fg = SEED_FRONTERA_2025_RESPUESTA.fronteras_grupo;
      const central = fg.find((g) => g.grupo === "SECTOR_CENTRAL_RECTOR");
      const descentralizadas = fg.find((g) => g.grupo === "DESCENTRALIZADAS_Y_AUTORIDADES");
      const locales = fg.find((g) => g.grupo === "ALCALDIAS_LOCALES");

      expect(central?.cumple_cooper).toBe(true);
      expect(central?.n_efectivo).toBe(11);

      expect(descentralizadas?.cumple_cooper).toBe(true);
      expect(descentralizadas?.n_efectivo).toBe(16);

      // Alcaldías Locales (n=3) no cumple Cooper en corte aislado y se reporta transparentemente
      expect(locales?.cumple_cooper).toBe(false);
      expect(locales?.n_efectivo).toBe(3);
      expect(locales?.estado).toContain("no_estimable_muestra_insuficiente");
    });

    it("el generador de vigencias maneja 2020 con las 3 alcaldías excluidas por falta de insumo", () => {
      const f2020 = generarFronteraPorVigencia(2020);
      expect(f2020.vigencia).toBe(2020);
      expect(f2020.dmus_estimables).toBe(27);
      expect(f2020.dmus_excluidas).toBe(3);
      expect(f2020.entidades_excluidas).toHaveLength(3);
      expect(f2020.entidades_excluidas[0].estado).toBe("no_estimable_sin_insumo_financiero");
    });
  });

  // ---------------------------------------------------------------------------
  // 3. FASE 2: PRODUCTIVIDAD DINÁMICA DE MALMQUIST (2020–2025)
  // ---------------------------------------------------------------------------
  describe("3. Fase 2: Productividad Dinámica de Malmquist", () => {
    it("descompone formalmente MPI = EFFCH x TECHCH en todas las transiciones", () => {
      const { transiciones } = SEED_MALMQUIST_RESPUESTA;
      expect(transiciones.length).toBeGreaterThanOrEqual(6);

      transiciones.forEach((t) => {
        expect(t.mpi_medio).toBeGreaterThan(0.85);
        expect(t.mpi_medio).toBeLessThan(1.25);
        expect(t.effch_medio).toBeGreaterThan(0.85);
        expect(t.techch_medio).toBeGreaterThan(0.85);

        // Descomposición multiplicativa aproximada: MPI ≈ EFFCH * TECHCH
        const prod = t.effch_medio * t.techch_medio;
        expect(Math.abs(t.mpi_medio - prod)).toBeLessThan(0.01);
      });
    });

    it("el acumulado 2020–2025 muestra crecimiento positivo de productividad (+3,2%)", () => {
      const acum = SEED_MALMQUIST_RESPUESTA.transiciones.find(
        (t) => t.periodo === "ACUMULADO_2020_2025"
      );
      expect(acum).toBeDefined();
      expect(acum?.mpi_medio).toBe(1.032);
      expect(acum?.effch_medio).toBe(1.018);
      expect(acum?.techch_medio).toBe(1.014);
      expect(SEED_MALMQUIST_RESPUESTA.resumen_periodo_completo.entidades_avance_productividad).toBe(23);
      expect(SEED_MALMQUIST_RESPUESTA.resumen_periodo_completo.entidades_retroceso_productividad).toBe(7);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. FASE 3: SEGUNDA ETAPA ECONOMÉTRICA, FDR, GINI/HHI Y WILCOXON
  // ---------------------------------------------------------------------------
  describe("4. Fase 3: Segunda Etapa Econométrica, Correlaciones FDR, Gini y Wilcoxon", () => {
    it("el modelo de segunda etapa excluye estrictamente ln(Presupuesto) como regresor", () => {
      const mod = SEED_SEGUNDA_ETAPA_ECONOMETRICA.especificacion_modelo;
      expect(mod.exclusion_endogeneidad).toContain("ln(Presupuesto) excluido");
      expect(mod.observaciones_n).toBe(168);
      expect(mod.r_cuadrado).toBe(0.462);

      const nombresCovariables = SEED_SEGUNDA_ETAPA_ECONOMETRICA.coeficientes_regresion.map(
        (c) => c.nombre_covariable
      );
      expect(nombresCovariables.some((n) => n.toLowerCase().includes("presupuesto"))).toBe(false);
    });

    it("el coeficiente de Verbo Débil DNP (reunionitis) es negativo y estadísticamente significativo al 99,9%", () => {
      const coefVerboDebil = SEED_SEGUNDA_ETAPA_ECONOMETRICA.coeficientes_regresion.find(
        (c) => c.parametro === "β1_VERBO_DEBIL"
      );
      expect(coefVerboDebil).toBeDefined();
      expect(coefVerboDebil?.coeficiente).toBe(-0.324);
      expect(coefVerboDebil?.p_value).toBeLessThan(0.001);
      expect(coefVerboDebil?.t_statistic).toBeLessThan(-3.0);
    });

    it("la matriz de correlaciones aplica control FDR Benjamini-Hochberg (q-value)", () => {
      const matriz = SEED_SEGUNDA_ETAPA_ECONOMETRICA.matriz_correlaciones;
      expect(matriz.length).toBeGreaterThanOrEqual(6);

      matriz.forEach((cor) => {
        // En FDR Benjamini-Hochberg, q-value >= p-value
        expect(cor.q_value_fdr).toBeGreaterThanOrEqual(cor.p_value - 0.000001);
        if (cor.es_significativa_fdr) {
          expect(cor.q_value_fdr).toBeLessThan(0.05);
        }
      });
    });

    it("la desigualdad presupuestal (Gini) muestra desconcentración histórica de 0,634 a 0,538", () => {
      const gini = SEED_SEGUNDA_ETAPA_ECONOMETRICA.desigualdad_presupuestal.gini_historico;
      const g2020 = gini.find((g) => g.vigencia === 2020);
      const g2025 = gini.find((g) => g.vigencia === 2025);

      expect(g2020?.coeficiente_gini).toBe(0.634);
      expect(g2025?.coeficiente_gini).toBe(0.538);
      expect(g2025!.coeficiente_gini).toBeLessThan(g2020!.coeficiente_gini);
    });

    it("la prueba pareada de Wilcoxon rechaza H0 formalmente al 99,8% de confianza (p = 0,0018)", () => {
      const wil = SEED_SEGUNDA_ETAPA_ECONOMETRICA.prueba_wilcoxon_pareada;
      expect(wil.n_pareado).toBe(28);
      expect(wil.eficiencia_media_p2).toBeGreaterThan(wil.eficiencia_media_p1);
      expect(wil.diferencia_medias).toBe(0.082);
      expect(wil.p_value_bilateral).toBe(0.0018);
      expect(wil.p_value_bilateral).toBeLessThan(0.01);
      expect(wil.conclusion_cientifica).toContain("Se rechaza la hipótesis nula");
    });
  });

  // ---------------------------------------------------------------------------
  // 5. GETTERS LOCALES Y RESILIENCIA OFFLINE
  // ---------------------------------------------------------------------------
  describe("5. Getters Locales y Fallback de Servicios", () => {
    it("obtenerAuditoriaSaneamientoDeaLocal devuelve el dataset completo", () => {
      const res = obtenerAuditoriaSaneamientoDeaLocal();
      expect(res.embudo_financiero.total_registros_bd).toBe(217740);
    });

    it("obtenerFronteraEficienciaDeaLocal parametriza por vigencia y modo", () => {
      const f2025 = obtenerFronteraEficienciaDeaLocal({ vigencia: 2025 });
      expect(f2025.vigencia).toBe(2025);
      expect(f2025.ranking_eficiencia.length).toBe(30);

      const f2020 = obtenerFronteraEficienciaDeaLocal({ vigencia: 2020 });
      expect(f2020.vigencia).toBe(2020);
      expect(f2020.dmus_estimables).toBe(27);
    });

    it("obtenerMalmquistDeaLocal devuelve transiciones válidas", () => {
      const res = obtenerMalmquistDeaLocal();
      expect(res.transiciones.length).toBeGreaterThanOrEqual(6);
    });

    it("obtenerSegundaEtapaEconometricaDeaLocal devuelve modelo y correlaciones", () => {
      const res = obtenerSegundaEtapaEconometricaDeaLocal();
      expect(res.coeficientes_regresion.length).toBe(5);
    });

    it("obtenerResumenIntegralDeaLocal resume los 4 bloques", () => {
      const res = obtenerResumenIntegralDeaLocal();
      expect(res.universo_analitico.entidades_canonicas).toBe(30);
      expect(res.frontera_vigente.eficiencia_media_bcc).toBeGreaterThan(0.80);
      expect(res.econometria_clave.p_value_wilcoxon).toBeLessThan(0.01);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. RENDERIZADO SSR Y COMPONENTES VISUALES
  // ---------------------------------------------------------------------------
  describe("6. Renderizado SSR de DeaEconometriaPanel y TriadaMotoresTab", () => {
    it("DeaEconometriaPanel se renderiza en SSR con sus 4 sub-vistas sin errores", () => {
      const html = renderToString(<DeaEconometriaPanel puedeEditar={false} />);
      expect(html).toContain("panel-dea-econometria");
      expect(html).toContain("Frontera Eficiente DEA");
      expect(html).toContain("Solver HiGHS");
      expect(html).toContain("Matriz de Eficiencia DEA");
      expect(html).toContain("Secretaría de Educación");
      expect(html).toContain("DADIS");
      expect(html).toContain("EPA");
    });

    it("TriadaMotoresTab contiene el botón tab-nav-dea-econometria para la Sub-vista 5", () => {
      const html = renderToString(<TriadaMotoresTab puedeEditar={false} />);
      expect(html).toContain('data-testid="tab-nav-dea-econometria"');
      expect(html).toContain("5. Frontera Eficiente DEA &amp; Econometría");
    });
  });
});
