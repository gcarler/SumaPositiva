import { describe, expect, test } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  CATEGORIAS_TRANSPARENCIA_CARTAGENA,
  ARCHIVOS_EXCEL_PLAN_ACCION_2026,
  PERFILES_FORMATO_EXCEL,
  HOMOLOGACION_COLUMNAS_CANONICAS,
  MATRIZ_COMPARATIVA_INTERANUAL,
  MUESTRAS_SIMULACION_HUELLA,
  METAS_ESTRATEGICAS_PDD_CANONICAS,
  PROYECTOS_INVERSION_BPIM_CANONICOS,
  CRUCE_TRIPARTITO_LECTURAS,
  RESUMEN_CONSOLIDADO_TRIADA_CANONICO,
  obtenerResumenTriadaMotoresLocal,
  detectarFormatoPlanAccionLocal,
  cruzarTresLecturasLocal,
} from "../services/plan-accion-dnp-api";
import { TriadaMotoresTab } from "./triada-motores-tab";

describe("Triada de Motores y Conector Transparencia Cartagena (Hito [TRIADA-FRONTEND-02])", () => {
  describe("1. Catálogo Oficial cartagena.gov.co/transparencia (Secciones 4.1 a 4.4)", () => {
    test("contiene las 4 categorías oficiales de Planeación, Presupuesto e Informes", () => {
      expect(CATEGORIAS_TRANSPARENCIA_CARTAGENA.length).toBe(4);
      const codigos = CATEGORIAS_TRANSPARENCIA_CARTAGENA.map((c) => c.codigo);
      expect(codigos).toEqual(["4.1", "4.2", "4.3", "4.4"]);

      // Verificar categoría 4.3 Plan de Acción
      const cat43 = CATEGORIAS_TRANSPARENCIA_CARTAGENA.find((c) => c.codigo === "4.3");
      expect(cat43).toBeDefined();
      expect(cat43?.url_portal).toContain("categoria=52");
      expect(cat43?.normativa_soporte).toContain("Ley 1474 de 2011 Art. 74");
    });

    test("registra exactamente los 23 archivos Excel 2026 institucionales de la Alcaldía", () => {
      expect(ARCHIVOS_EXCEL_PLAN_ACCION_2026.length).toBe(23);

      const nombresArchivos = ARCHIVOS_EXCEL_PLAN_ACCION_2026.map((a) => a.nombre_archivo);
      expect(nombresArchivos).toContain("DADIS.xls");
      expect(nombresArchivos).toContain("SECRETARIA DE HACIENDA.xlsx");
      expect(nombresArchivos).toContain("SECRETARÍA DE PLANEACION.xlsx");
      expect(nombresArchivos).toContain("SEC_EDUCACION.xlsx");
      expect(nombresArchivos).toContain("DATT.xlsx");
      expect(nombresArchivos).toContain("INFRAESTRUCTURA.xlsx");
      expect(nombresArchivos).toContain("DISTRISEGURIDAD.xlsx");
      expect(nombresArchivos).toContain("SICC.xlsx");
    });

    test("detecta correctamente el archivo legacy DADIS.xls con formato monohoja", () => {
      const dadis = ARCHIVOS_EXCEL_PLAN_ACCION_2026.find((a) => a.nombre_archivo === "DADIS.xls");
      expect(dadis).toBeDefined();
      expect(dadis?.extension).toBe(".xls");
      expect(dadis?.perfil_formato).toBe("PA_MONOHOJA_2016_2019");
      expect(dadis?.total_hojas).toBe(1);
      expect(dadis?.estado_normalizacion).toBe("EN_CONVERSION_LEGACY");
    });

    test("los archivos multihoja 2026 poseen 4 hojas estructuradas (Ficha, Indicativo, Acción, POAI)", () => {
      const hacienda = ARCHIVOS_EXCEL_PLAN_ACCION_2026.find(
        (a) => a.nombre_archivo === "SECRETARIA DE HACIENDA.xlsx"
      );
      expect(hacienda).toBeDefined();
      expect(hacienda?.extension).toBe(".xlsx");
      expect(hacienda?.perfil_formato).toBe("PA_MULTIHOJA_2024_2026");
      expect(hacienda?.total_hojas).toBe(4);
      expect(hacienda?.nombres_hojas).toContain("Plan de Acción T1-T4");
      expect(hacienda?.nombres_hojas).toContain("Plan Indicativo");
    });
  });

  describe("2. Detector Polimórfico de Formatos Excel (2016 Monohoja vs 2020 vs 2026 Multihoja)", () => {
    test("los 4 perfiles de formato histórico están formalmente tipados y documentados", () => {
      const perfiles = Object.keys(PERFILES_FORMATO_EXCEL);
      expect(perfiles).toHaveLength(4);
      expect(perfiles).toContain("PA_MONOHOJA_2016_2019");
      expect(perfiles).toContain("PA_HIBRIDO_2020_2023");
      expect(perfiles).toContain("PA_MULTIHOJA_2024_2026");
      expect(perfiles).toContain("PA_CANONICO_DNP_POLIS");
    });

    test("las 4 muestras de simulación cubren todos los perfiles polimórficos", () => {
      expect(MUESTRAS_SIMULACION_HUELLA).toHaveLength(4);
      const perfilesMuestras = MUESTRAS_SIMULACION_HUELLA.map((m) => m.perfil_esperado);
      expect(perfilesMuestras).toContain("PA_MONOHOJA_2016_2019");
      expect(perfilesMuestras).toContain("PA_HIBRIDO_2020_2023");
      expect(perfilesMuestras).toContain("PA_MULTIHOJA_2024_2026");
      expect(perfilesMuestras).toContain("PA_CANONICO_DNP_POLIS");
    });

    test("detecta con alta confianza el formato monohoja 2016 (DADIS) a partir de 1 sola hoja", () => {
      const res = detectarFormatoPlanAccionLocal({
        codigo_muestra: "muestra-2016-dadis",
      });

      expect(res.perfil_detectado).toBe("PA_MONOHOJA_2016_2019");
      expect(res.confianza_porcentaje).toBeGreaterThan(95);
      expect(res.total_hojas_analizadas).toBe(1);
      expect(res.vigencia_inferida).toBe(2016);
      expect(res.resumen_auditoria_dnp.cumplimiento_calidad_pct).toBeLessThan(60);
    });

    test("detecta el formato híbrido por pilares 2020–2023 (Salvemos Juntos)", () => {
      const res = detectarFormatoPlanAccionLocal({
        codigo_muestra: "muestra-2021-distriseguridad",
      });

      expect(res.perfil_detectado).toBe("PA_HIBRIDO_2020_2023");
      expect(res.confianza_porcentaje).toBeGreaterThan(95);
      expect(res.nombres_hojas_analizadas).toContain("Cartagena Resiliente");
    });

    test("detecta el formato multihoja 2026 oficial (Secretaría de Planeación)", () => {
      const res = detectarFormatoPlanAccionLocal({
        codigo_muestra: "muestra-2026-planeacion",
      });

      expect(res.perfil_detectado).toBe("PA_MULTIHOJA_2024_2026");
      expect(res.confianza_porcentaje).toBeGreaterThan(95);
      expect(res.total_hojas_analizadas).toBe(4);
      expect(res.nombres_hojas_analizadas).toContain("Plan de Acción T1-T4");
    });

    test("detecta el formato canónico dual DNP POLIS con confianza superior al 99%", () => {
      const res = detectarFormatoPlanAccionLocal({
        codigo_muestra: "muestra-2026-canonico-polis",
      });

      expect(res.perfil_detectado).toBe("PA_CANONICO_DNP_POLIS");
      expect(res.confianza_porcentaje).toBeGreaterThan(99);
      expect(res.total_hojas_analizadas).toBe(2);
      expect(res.nombres_hojas_analizadas).toEqual(["Plan_Accion", "Plan_Indicativo"]);
    });

    test("la tabla de homologación semántica mapea todas las columnas clave a POLIS", () => {
      expect(HOMOLOGACION_COLUMNAS_CANONICAS.length).toBeGreaterThanOrEqual(14);
      const campos = HOMOLOGACION_COLUMNAS_CANONICAS.map((h) => h.campo_canonico_polis);

      expect(campos).toContain("dependencia_responsable");
      expect(campos).toContain("linea_estrategica_codigo");
      expect(campos).toContain("codigo_meta_pdd");
      expect(campos).toContain("descripcion_actividad");
      expect(campos).toContain("verbo_infinitivo");
      expect(campos).toContain("porcentaje_avance_fisico");
      expect(campos).toContain("monto_programado_cop");
      expect(campos).toContain("monto_ejecutado_cop");
    });

    test("la matriz comparativa interanual estandarizada permite cotejar 2016 vs 2020 vs 2026", () => {
      expect(MATRIZ_COMPARATIVA_INTERANUAL.length).toBeGreaterThanOrEqual(5);

      const interior = MATRIZ_COMPARATIVA_INTERANUAL.find((d) => d.sigla === "INTERIOR");
      expect(interior).toBeDefined();
      expect(interior?.v2016.vigencia).toBe(2016);
      expect(interior?.v2020.vigencia).toBe(2020);
      expect(interior?.v2026.vigencia).toBe(2026);
      expect(interior?.v2026.calidad_redaccion_dnp_pct).toBeGreaterThan(
        interior?.v2016.calidad_redaccion_dnp_pct || 0
      );
    });
  });

  describe("3. Motor 3 (Inversión) y Cruce Tripartito de las 3 Lecturas", () => {
    test("la cascada presupuestal distrital refleja la cadena completa de ejecución", () => {
      const p = RESUMEN_CONSOLIDADO_TRIADA_CANONICO.totales_presupuesto;

      expect(p.apropiacion_definitiva_cop).toBeGreaterThan(p.apropiacion_inicial_cop);
      expect(p.cdp_acumulado_cop).toBeLessThanOrEqual(p.apropiacion_definitiva_cop);
      expect(p.compromisos_rp_cop).toBeLessThanOrEqual(p.cdp_acumulado_cop);
      expect(p.obligaciones_cop).toBeLessThanOrEqual(p.compromisos_rp_cop);
      expect(p.pagos_tesoreria_cop).toBeLessThanOrEqual(p.obligaciones_cop);

      expect(p.porcentaje_cdp_global).toBe(86.6);
      expect(p.porcentaje_rp_global).toBe(78.0);
      expect(p.porcentaje_pagos_global).toBe(57.1);
    });

    test("el cruce tripartito cubre los 4 estados forenses del semáforo", () => {
      const cruces = cruzarTresLecturasLocal().cruces;
      expect(cruces.length).toBeGreaterThanOrEqual(6);

      const estados = cruces.map((c) => c.estado_semaforo);
      expect(estados).toContain("COHERENCIA_INTEGRAL_ALTA");
      expect(estados).toContain("DESFASE_CRITICO_SOBREEJECUCION");
      expect(estados).toContain("REZAGO_CONTRACTUAL_INVERSION");
      expect(estados).toContain("META_PDD_SUBOPERACIONALIZADA");
    });

    test("detecta sobreejecución financiera con brecha física pericial (+46 pts en Equipamientos)", () => {
      const cruceSobreejecucion = CRUCE_TRIPARTITO_LECTURAS.find(
        (c) => c.estado_semaforo === "DESFASE_CRITICO_SOBREEJECUCION"
      );

      expect(cruceSobreejecucion).toBeDefined();
      expect(cruceSobreejecucion?.ejecucion_financiera_rp_pct).toBe(94.0);
      expect(cruceSobreejecucion?.avance_operativo_pa_pct).toBe(48.0);
      expect(cruceSobreejecucion?.brecha_fisico_financiera_pts).toBe(46.0);
      expect(cruceSobreejecucion?.hallazgo_forense).toContain("Sobreejecución financiera acelerada");
    });

    test("detecta rezago contractual de inversión (-37 pts en Frentes de Seguridad)", () => {
      const cruceRezago = CRUCE_TRIPARTITO_LECTURAS.find(
        (c) => c.estado_semaforo === "REZAGO_CONTRACTUAL_INVERSION"
      );

      expect(cruceRezago).toBeDefined();
      expect(cruceRezago?.ejecucion_financiera_rp_pct).toBe(28.0);
      expect(cruceRezago?.avance_operativo_pa_pct).toBe(65.0);
      expect(cruceRezago?.brecha_fisico_financiera_pts).toBe(-37.0);
      expect(cruceRezago?.hallazgo_forense).toContain("Cuello de botella en la contratación pública");
    });

    test("el filtrado por dependencia y fuente funciona correctamente", () => {
      const filtradoFONSET = cruzarTresLecturasLocal({
        fuente_financiacion: "FONSET",
      });
      expect(filtradoFONSET.cruces.every((c) => c.fuente_financiacion === "FONSET")).toBe(true);

      const filtradoInterior = cruzarTresLecturasLocal({
        dependencia: "Interior",
      });
      expect(
        filtradoInterior.cruces.every((c) =>
          c.dependencia.toLowerCase().includes("interior")
        )
      ).toBe(true);
    });

    test("el catálogo canónico incluye metas estratégicas PDD y proyectos de inversión BPIM", () => {
      expect(METAS_ESTRATEGICAS_PDD_CANONICAS.length).toBeGreaterThanOrEqual(5);
      expect(PROYECTOS_INVERSION_BPIM_CANONICOS.length).toBeGreaterThanOrEqual(6);

      const resumen = obtenerResumenTriadaMotoresLocal();
      expect(resumen.catalogo_transparencia).toHaveLength(4);
      expect(resumen.archivos_excel_2026).toHaveLength(23);
      expect(resumen.esContingencia).toBe(true);
    });
  });

  describe("4. Renderizado del Componente TriadaMotoresTab", () => {
    test("renderiza en modo SSR sin fallos", () => {
      const html = renderToString(<TriadaMotoresTab puedeEditar={true} />);
      expect(html).toContain("Triada de Lecturas");
      expect(html).toContain("Detector Polimórfico");
      expect(html).toContain("Conector Transparencia");
      expect(html).toContain("Ley 152/94");
    });

    test("el HTML renderizado contiene las pestañas de navegación principales", () => {
      const html = renderToString(<TriadaMotoresTab puedeEditar={false} />);
      expect(html).toContain('data-testid="tab-nav-triada-lecturas"');
      expect(html).toContain('data-testid="tab-nav-detector-multiformato"');
      expect(html).toContain('data-testid="tab-nav-conector-transparencia"');
    });

    test("la sub-vista 1 inicial renderiza los 3 motores y la cascada presupuestal", () => {
      const html = renderToString(<TriadaMotoresTab puedeEditar={false} />);
      expect(html).toContain("Motor 1 · Estratégico");
      expect(html).toContain("Motor 2 · Operativo");
      expect(html).toContain("Motor 3 · Financiero");
      expect(html).toContain("Cascada Presupuestal Distrital 2026");
      expect(html).toContain("Compromisos (RP)");
      expect(html).toContain("Matriz Cruzada de las 3 Lecturas");
    });
  });
});
