import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import {
  DIMENSIONES_SEGURIDAD_HUMANA_INFO,
  PERIODOS_GOBIERNO_INFO,
  ENTIDADES_CANONICAS_30_BD,
  SEED_M0_RESUMEN_EJECUTIVO,
  SEED_M1_PATOLOGIAS_DNP,
  SEED_M2_CONTINUIDAD_GOBIERNOS,
  SEED_M3_RADAR_TRANSPARENCIA,
  SEED_M4_ALINEACION_TERRITORIAL,
  SEED_M5_BUSCADOR_DEFECTO,
  SEED_M6_SIMULADOR_CIERRE,
} from "../data/inteligencia-triada-6m.data";
import {
  obtenerResumenEjecutivoInteligenciaLocal,
  obtenerPatologiasDnpLocal,
  obtenerContinuidadGobiernosLocal,
  obtenerRadarTransparenciaLocal,
  obtenerAlineacionTerritorialLocal,
  buscarTransversalDuplicidadLocal,
  obtenerSimuladorCierreLocal,
} from "../services/plan-accion-dnp-api";
import { InteligenciaForense6MPanel } from "../components/inteligencia-forense-6m-panel";
import { TriadaMotoresTab } from "../components/triada-motores-tab";

describe("Laboratorio de Inteligencia Forense de 6 Motores ([TRIADA-INTELIGENCIA-6M-06])", () => {
  // ---------------------------------------------------------------------------
  // 1. DATASET CANÓNICO AUDITADO DE BD_CSH
  // ---------------------------------------------------------------------------
  describe("1. Dataset Canónico Auditado de bd_csh", () => {
    it("las 8 Dimensiones de Seguridad Humana están formalmente definidas con datos reales", () => {
      expect(DIMENSIONES_SEGURIDAD_HUMANA_INFO).toHaveLength(8);
      const totalRegistros = DIMENSIONES_SEGURIDAD_HUMANA_INFO.reduce(
        (acc, d) => acc + d.registros_bd,
        0
      );
      expect(totalRegistros).toBeGreaterThanOrEqual(200000);
      expect(DIMENSIONES_SEGURIDAD_HUMANA_INFO[0].id).toBe("1. Seguridad Personal");
      expect(DIMENSIONES_SEGURIDAD_HUMANA_INFO[7].id).toBe("8. Crisis");
    });

    it("los 3 Periodos de Gobierno cubren desde 2016 hasta 2026", () => {
      expect(PERIODOS_GOBIERNO_INFO).toHaveLength(3);
      expect(PERIODOS_GOBIERNO_INFO.map((p) => p.codigo)).toEqual([
        "ANTES_2020",
        "2020_2023",
        "2024_2027",
      ]);
      const sumaFilas = PERIODOS_GOBIERNO_INFO.reduce((acc, p) => acc + p.total_registros, 0);
      expect(sumaFilas).toBeGreaterThanOrEqual(210000);
    });

    it("las 30 Entidades Oficiales Canónicas suman el 99,97% de cobertura distrital", () => {
      expect(ENTIDADES_CANONICAS_30_BD).toHaveLength(30);
      const totalFilasCanonicas = ENTIDADES_CANONICAS_30_BD.reduce(
        (acc, e) => acc + e.registros_bd,
        0
      );
      expect(totalFilasCanonicas).toBe(217678);
      expect(ENTIDADES_CANONICAS_30_BD[0].sigla).toBe("DADIS");
      expect(ENTIDADES_CANONICAS_30_BD[0].registros_bd).toBe(18983);
    });

    it("el universo M0 refleja exactamente los conteos auditados de bd_csh", () => {
      const u = SEED_M0_RESUMEN_EJECUTIVO.universo;
      expect(u.total_registros_saneados).toBe(217740);
      expect(u.total_archivos_activos).toBe(608);
      expect(u.entidades_canonicas).toBe(30);
      expect(u.cobertura_entidad_canonica_pct).toBe(99.97);
      expect(u.bpims_unicos).toBe(1516);
      expect(u.metas_pdd_unicas).toBe(4600);
      expect(u.hurtos_georreferenciados).toBe(12280);
      expect(u.mesas_ciudadanas).toBe(33);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. MOTOR 1: PATOLOGÍAS DNP Y EFECTO ESPEJISMO
  // ---------------------------------------------------------------------------
  describe("2. Motor 1: Detector Forense de Efecto Espejismo y Patologías DNP", () => {
    it("reporta el balance lingüístico con 57,8% de verbos débiles ('reunionitis')", () => {
      const m1 = SEED_M1_PATOLOGIAS_DNP.resumen_global;
      expect(m1.actividades_verbo_debil).toBe(27182);
      expect(m1.actividades_verbo_fuerte).toBe(19869);
      expect(m1.total_actividades_evaluadas).toBe(47051);
      expect(m1.tasa_reunionitis_pct).toBeCloseTo(57.77, 1);
    });

    it("cuantifica las alertas de patologías críticas", () => {
      const m1 = SEED_M1_PATOLOGIAS_DNP.resumen_global;
      expect(m1.total_alertas_espejismo).toBe(184);
      expect(m1.total_alertas_sobreejecucion_financiera).toBe(67);
      expect(m1.total_alertas_cuello_botella_contractual).toBe(92);
    });

    it("el ranking DNP clasifica a cada una de las 30 entidades con puntaje 0-100", () => {
      for (const ent of ENTIDADES_CANONICAS_30_BD) {
        expect(ent.indice_calidad_dnp_100).toBeGreaterThanOrEqual(0);
        expect(ent.indice_calidad_dnp_100).toBeLessThanOrEqual(100);
        expect([
          "SALUDABLE",
          "ESPEJISMO_OPERATIVO",
          "FORMULACION_DEBIL_DNP",
          "CUELLO_BOTELLA_PRESUPUESTAL",
          "DESACOPLE_FISICO_FINANCIERO",
        ]).toContain(ent.patologia_predominante);
      }
    });

    it("permite filtrar el ranking DNP por entidad específica", () => {
      const filtrado = obtenerPatologiasDnpLocal({ entidad: "DADIS" });
      expect(filtrado.ranking_entidades_dnp).toHaveLength(1);
      expect(filtrado.ranking_entidades_dnp[0].sigla).toBe("DADIS");
    });
  });

  // ---------------------------------------------------------------------------
  // 3. MOTOR 2: ADN CONTINUIDAD 3 GOBIERNOS Y 8 DIMENSIONES
  // ---------------------------------------------------------------------------
  describe("3. Motor 2: ADN Continuidad vs Ruptura (2016–2026)", () => {
    it("cuantifica los proyectos BPIM sobrevivientes vs huérfanos", () => {
      const bpim = SEED_M2_CONTINUIDAD_GOBIERNOS.continuidad_bpim;
      expect(bpim.total_bpims_historicos).toBe(1516);
      expect(bpim.bpims_en_multiples_periodos).toBe(253);
      expect(bpim.bpims_huerfanos_un_solo_periodo).toBe(1263);
      expect(bpim.tasa_continuidad_institucional_pct).toBeCloseTo(16.69, 1);
    });

    it("incluye proyectos emblemáticos con continuidad en los 3 gobiernos", () => {
      const drenajes = SEED_M2_CONTINUIDAD_GOBIERNOS.continuidad_bpim.proyectos_continuos_destacados.find(
        (p) => p.codigo_bpim === "2016130010045"
      );
      expect(drenajes).toBeDefined();
      expect(drenajes?.estado_continuidad).toBe("SOBREVIVIENTE_3_GOBIERNOS");
      expect(drenajes?.periodos).toHaveLength(3);
    });

    it("traza la evolución porcentual de las 8 dimensiones de seguridad humana", () => {
      const dims = SEED_M2_CONTINUIDAD_GOBIERNOS.migracion_dimensiones_seguridad;
      expect(dims).toHaveLength(8);
      for (const d of dims) {
        expect(["CRECIENTE", "ESTABLE", "DECRECIENTE"]).toContain(d.tendencia);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 4. MOTOR 3: RADAR TRANSPARENCIA Y COPY-PASTE TRIMESTRAL
  // ---------------------------------------------------------------------------
  describe("4. Motor 3: Radar de Inercia, Copy-Paste y Matriz de Transparencia", () => {
    it("expone con exactitud los 5 archivos con corte clonado", () => {
      const clones = SEED_M3_RADAR_TRANSPARENCIA.archivos_corte_clonado;
      expect(clones).toHaveLength(5);
      const entidadesConClon = clones.map((c) => c.entidad);
      expect(entidadesConClon).toContain("Transcaribe");
      expect(entidadesConClon).toContain("Alcaldía Local Industrial y de la Bahía");
      expect(entidadesConClon).toContain("Alcaldía Local Histórica y del Caribe Norte");
      expect(entidadesConClon).toContain("Instituto Distrital de Deporte y Recreación");
    });

    it("registra la fusión del libro clon de DADIS 2021", () => {
      const fusiones = SEED_M3_RADAR_TRANSPARENCIA.clones_tabulares_mismo_corte;
      expect(fusiones).toHaveLength(1);
      expect(fusiones[0].entidad).toBe("Departamento Administrativo Distrital de Salud");
      expect(fusiones[0].filas_eliminadas_deduplicadas).toBe(477);
    });

    it("detecta metas congeladas zombies y efecto diciembre mágico", () => {
      expect(SEED_M3_RADAR_TRANSPARENCIA.metas_congeladas_zombies.length).toBeGreaterThanOrEqual(1);
      expect(SEED_M3_RADAR_TRANSPARENCIA.efecto_diciembre_magico.length).toBeGreaterThanOrEqual(1);
      const salto = SEED_M3_RADAR_TRANSPARENCIA.efecto_diciembre_magico[0].salto_abrupto_pts;
      expect(salto).toBeGreaterThanOrEqual(50);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. MOTOR 4: ALINEACIÓN TERRITORIAL (PLANES VS DELITO Y MESAS)
  // ---------------------------------------------------------------------------
  describe("5. Motor 4: Cruce Geoespacial Inversión vs Delito y Mesas", () => {
    it("evalúa las 3 Localidades oficiales de Cartagena", () => {
      const locs = SEED_M4_ALINEACION_TERRITORIAL.localidades;
      expect(locs).toHaveLength(3);
      expect(locs.map((l) => l.localidad)).toEqual(["Localidad 1", "Localidad 2", "Localidad 3"]);
      const totalHurtos = locs.reduce((acc, l) => acc + l.hurtos_registrados, 0);
      expect(totalHurtos).toBe(12280);
      const totalMesas = locs.reduce((acc, l) => acc + l.mesas_ciudadanas, 0);
      expect(totalMesas).toBe(33);
    });

    it("identifica el déficit de atención en Localidad 2", () => {
      const loc2 = SEED_M4_ALINEACION_TERRITORIAL.localidades.find((l) => l.numero === 2);
      expect(loc2).toBeDefined();
      expect(loc2?.estado_alineacion).toBe("SUBINVERSION_MODERADA");
      expect(loc2?.brecha_desalineacion_pct).toBeLessThan(0);
    });

    it("prioriza los barrios foco de Cartagena", () => {
      const barrios = SEED_M4_ALINEACION_TERRITORIAL.barrios_foco;
      expect(barrios.length).toBeGreaterThanOrEqual(5);
      const nombres = barrios.map((b) => b.nombre);
      expect(nombres).toContain("Olaya Herrera");
      expect(nombres).toContain("El Pozón");
      expect(nombres).toContain("Nelson Mandela");
    });
  });

  // ---------------------------------------------------------------------------
  // 6. MOTOR 5: BUSCADOR TRANSVERSAL Y DUPLICIDAD
  // ---------------------------------------------------------------------------
  describe("6. Motor 5: Buscador Transversal e Inspector de Duplicidad", () => {
    it("ejecuta búsqueda semántica de respaldo local para términos transversales", () => {
      const res = buscarTransversalDuplicidadLocal({ q: "cámaras" });
      expect(res.consulta.q).toBe("cámaras");
      expect(res.total_coincidencias).toBeGreaterThanOrEqual(1);
    });

    it("detecta alertas de duplicidad interinstitucional sobre el mismo tema", () => {
      const alertas = SEED_M5_BUSCADOR_DEFECTO.alertas_duplicidad_institucional;
      expect(alertas.length).toBeGreaterThanOrEqual(1);
      expect(alertas[0].entidades.length).toBeGreaterThanOrEqual(2);
      expect(alertas[0].apropiacion_conjunta_cop).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 7. MOTOR 6: SIMULADOR PREDICTIVO CIERRE 2027
  // ---------------------------------------------------------------------------
  describe("7. Motor 6: Simulador Predictivo Cierre de Gobierno (2024–2027)", () => {
    it("calcula proyecciones con semáforos para el horizonte 2027", () => {
      const m6 = SEED_M6_SIMULADOR_CIERRE;
      expect(m6.horizonte.periodo).toBe("2024_2027");
      expect(m6.horizonte.anio_cierre).toBe(2027);
      expect(m6.resumen_prediccion.entidades_cumpliran).toBe(11);
      expect(m6.resumen_prediccion.entidades_riesgo_moderado).toBe(14);
      expect(m6.resumen_prediccion.entidades_incumplimiento_inminente).toBe(5);
    });

    it("calcula la aceleración trimestral requerida por dependencia", () => {
      for (const ent of SEED_M6_SIMULADOR_CIERRE.proyecciones_por_entidad) {
        expect(ent.aceleracion_trimestral_requerida_pct).toBeGreaterThan(0);
        expect(["CUMPLIRA", "RIESGO_MODERADO", "INCUMPLIMIENTO_INMINENTE"]).toContain(
          ent.semaforo_predictivo
        );
      }
    });

    it("permite simular impulso de aceleración dinámica", () => {
      const ent = SEED_M6_SIMULADOR_CIERRE.proyecciones_por_entidad[0];
      const boostPct = 10;
      const base = ent.proyeccion_cierre_2027_pct;
      const simulado = Math.min(100, base + (100 - base) * (boostPct / 100));
      expect(simulado).toBeGreaterThanOrEqual(base);
    });

    it("las funciones de fallback local de servicios responden con datos íntegros", () => {
      const r0 = obtenerResumenEjecutivoInteligenciaLocal();
      expect(r0.universo.total_registros_saneados).toBe(217740);

      const r2 = obtenerContinuidadGobiernosLocal({ dimension: "1. Seguridad Personal" });
      expect(r2.migracion_dimensiones_seguridad.length).toBe(1);

      const r3 = obtenerRadarTransparenciaLocal({ vigencia: 2026 });
      expect(r3.archivos_corte_clonado.length).toBeGreaterThanOrEqual(1);

      const r4 = obtenerAlineacionTerritorialLocal();
      expect(r4.localidades).toHaveLength(3);

      const r6 = obtenerSimuladorCierreLocal({ entidad: "Planeación" });
      expect(r6.proyecciones_por_entidad.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ---------------------------------------------------------------------------
  // 8. RENDERIZADO SSR DE COMPONENTES
  // ---------------------------------------------------------------------------
  describe("8. Renderizado SSR de Componentes", () => {
    it("InteligenciaForense6MPanel renderiza en SSR sin errores", () => {
      const html = renderToString(<InteligenciaForense6MPanel puedeEditar={true} />);
      expect(html).toContain('data-testid="panel-inteligencia-forense-6m"');
      expect(html).toContain("Laboratorio de Inteligencia Forense de 6 Motores");
      expect(html).toContain('data-testid="selector-motor-patologias-dnp"');
      expect(html).toContain('data-testid="selector-motor-continuidad-gobiernos"');
      expect(html).toContain('data-testid="selector-motor-radar-transparencia"');
      expect(html).toContain('data-testid="selector-motor-alineacion-territorial"');
      expect(html).toContain('data-testid="selector-motor-buscador-duplicidad"');
      expect(html).toContain('data-testid="selector-motor-simulador-cierre"');
      expect(html).toContain('data-testid="vista-motor-patologias-dnp"');
    });

    it("TriadaMotoresTab incluye la navegación al Laboratorio de Inteligencia y la insignia 99,97%", () => {
      const html = renderToString(<TriadaMotoresTab puedeEditar={true} />);
      expect(html).toContain('data-testid="tab-nav-inteligencia-forense-6m"');
      expect(html).toContain("4. Laboratorio de Inteligencia Forense (6 Motores · 217k)");
      expect(html).toContain("Calidad Forense 99,97% (217.740 registros saneados en bd_csh)");
    });
  });
});
