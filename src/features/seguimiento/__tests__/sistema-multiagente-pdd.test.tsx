import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  obtenerEstadoSistemaMultiagentePdd,
  ejecutarSistemaMultiagentePdd,
  obtenerComparativoSeguridadHumanaPdd,
  obtenerCruceMultiagentePaBpim,
  obtenerEstadoSistemaMultiagentePddLocal,
  obtenerComparativoSeguridadHumanaPddLocal,
  obtenerCruceMultiagentePaBpimLocal,
  ARCHIVOS_COBERTURA_PDF_CANONICOS,
  PLANES_PDD_COMPARATIVO_CANONICO,
  ANEXO_PDL_TERRITORIAL_CANONICO,
  PREGUNTAS_ESTRATEGICAS_DIAGNOSTICO_PDD,
  PUERTAS_CALIDAD_MULTIAGENTE_CANONICAS,
} from "../services/plan-accion-dnp-api";
import { SistemaMultiagentePddPanel } from "../components/sistema-multiagente-pdd-panel";
import { PddDeaEvaluacionPanel } from "../components/pdd-dea-evaluacion-panel";
import { MotorPlanAccionTab } from "../components/motor-plan-accion-tab";

describe("Sistema Multiagente PDD/PDL y Diagnóstico Comparativo de Seguridad Humana ([FRONTEND-TABLERO-MULTIAGENTE-PDD-18B])", () => {
  it("1. las cifras auditadas del corpus reflejan exactamente 2.732 evidencias, 1.524 nodos, 2.228 metas PDD y 401 metas PDL", () => {
    const estado = obtenerEstadoSistemaMultiagentePddLocal();
    expect(estado.estado).toBe("COMPLETADO");
    expect(estado.estado_publicacion_workspace).toBe("SINCRONIZADO_PDD_ONLY");
    expect(estado.metricas_globales.evidencias_absorbidas_total).toBe(2732);
    expect(estado.metricas_globales.paginas_pdf_continuas).toBe(2728);
    expect(estado.metricas_globales.archivos_pdf_verificados).toBe(11);
    expect(estado.metricas_globales.nodos_jerarquicos_mga).toBe(1524);
    expect(estado.metricas_globales.metas_pdd_total).toBe(2228);
    expect(estado.metricas_globales.metas_pdl_anexo).toBe(401);
    expect(estado.metricas_globales.entidades_articuladas_pa).toBe(29);

    const sumaPaginasPdf = ARCHIVOS_COBERTURA_PDF_CANONICOS.reduce(
      (acc, item) => acc + item.paginas_absorbidas,
      0
    );
    expect(sumaPaginasPdf).toBe(2728);

    const compLocal = obtenerComparativoSeguridadHumanaPddLocal();
    const cruceLocal = obtenerCruceMultiagentePaBpimLocal();
    expect(compLocal.resumen_global.total_evidencias_absorbidas).toBe(2732);
    expect(cruceLocal.resumen_ejecutivo.total_nodos_pdd_pdl).toBe(1524);
  });

  it("2. verifica la clasificación A/B/C/N y las metas PDD de los 5 Planes de Desarrollo Distritales (2012–2027)", () => {
    expect(PLANES_PDD_COMPARATIVO_CANONICO).toHaveLength(5);

    const sumaMetasPdd = PLANES_PDD_COMPARATIVO_CANONICO.reduce((acc, p) => acc + p.metas_pdd, 0);
    expect(sumaMetasPdd).toBe(2228);

    const p2012 = PLANES_PDD_COMPARATIVO_CANONICO.find((p) => p.codigo_plan === "PDD_2012_2015");
    expect(p2012?.metas_pdd).toBe(191);
    expect(p2012?.nodos_por_frontalidad).toEqual({ A: 11, B: 16, C: 114, N: 5 });
    expect(p2012?.ppi_oficial_nominal_cop).toBe(3049788268000);

    const p2013 = PLANES_PDD_COMPARATIVO_CANONICO.find((p) => p.codigo_plan === "PDD_2013_2015");
    expect(p2013?.metas_pdd).toBe(195);
    expect(p2013?.nodos_por_frontalidad).toEqual({ A: 22, B: 28, C: 227, N: 6 });
    expect(p2013?.ppi_oficial_nominal_cop).toBe(1874167605000);

    const p2016 = PLANES_PDD_COMPARATIVO_CANONICO.find((p) => p.codigo_plan === "PDD_2016_2019");
    expect(p2016?.metas_pdd).toBe(370);
    expect(p2016?.nodos_por_frontalidad).toEqual({ A: 31, B: 55, C: 324, N: 13 });
    expect(p2016?.ppi_oficial_nominal_cop).toBe(4331941000000);

    const p2020 = PLANES_PDD_COMPARATIVO_CANONICO.find((p) => p.codigo_plan === "PDD_2020_2023");
    expect(p2020?.metas_pdd).toBe(226);
    expect(p2020?.nodos_por_frontalidad).toEqual({ A: 36, B: 37, C: 235, N: 5 });

    const p2024 = PLANES_PDD_COMPARATIVO_CANONICO.find((p) => p.codigo_plan === "PDD_2024_2027");
    expect(p2024?.metas_pdd).toBe(1246);
    expect(p2024?.nodos_por_frontalidad).toEqual({ A: 19, B: 30, C: 181, N: 6 });
  });

  it("3. mantiene el Anexo Territorial de los 3 PDL (2024–2027) separado con 401 metas y $304.981M COP", () => {
    expect(ANEXO_PDL_TERRITORIAL_CANONICO).toHaveLength(3);
    const totalMetasPdl = ANEXO_PDL_TERRITORIAL_CANONICO.reduce((acc, l) => acc + l.metas_pdl, 0);
    expect(totalMetasPdl).toBe(401);

    const totalPpiPdl = ANEXO_PDL_TERRITORIAL_CANONICO.reduce(
      (acc, l) => acc + l.ppi_declarado_cop,
      0
    );
    expect(totalPpiPdl).toBeCloseTo(304981037938.01, 2);
  });

  it("4. los clientes API multiagente proveen fallback resiliente cuando el backend no está disponible o devuelve SIN_EJECUCIONES", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Offline test"));
    try {
      const [est, exec, comp, cruce] = await Promise.all([
        obtenerEstadoSistemaMultiagentePdd(),
        ejecutarSistemaMultiagentePdd({ publicar: false, persistir: true }),
        obtenerComparativoSeguridadHumanaPdd(),
        obtenerCruceMultiagentePaBpim(),
      ]);

      expect(est.estado).toBe("COMPLETADO");
      expect(est.puertas_calidad).toHaveLength(6);
      expect(exec.estado).toBe("COMPLETADO");
      expect(comp.planes_pdd).toHaveLength(5);
      expect(comp.anexo_pdl).toHaveLength(3);
      expect(comp.preguntas_estrategicas).toHaveLength(4);
      expect(cruce.articulacion_por_dimension_sh).toHaveLength(7);
      expect(cruce.puerta_f.estado).toBe("APROBADA");
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("5. SistemaMultiagentePddPanel renderiza las 6 puertas de calidad (A a F), los 5 PDD, el anexo de 3 PDL y las 4 preguntas estratégicas", () => {
    const html = renderToString(<SistemaMultiagentePddPanel puedeEditar={true} />);

    expect(html).toContain('data-testid="sistema-multiagente-pdd-panel"');
    expect(html).toContain("2.732");
    expect(html).toContain("1.524");
    expect(html).toContain("2.228");
    expect(html).toContain("401 metas PDL");

    for (const puerta of PUERTAS_CALIDAD_MULTIAGENTE_CANONICAS) {
      expect(html).toContain(puerta.codigo);
      expect(html).toContain(puerta.titulo);
    }

    for (const plan of PLANES_PDD_COMPARATIVO_CANONICO) {
      expect(html).toContain(plan.codigo_plan);
      expect(html).toContain(plan.nombre);
    }

    for (const pdl of ANEXO_PDL_TERRITORIAL_CANONICO) {
      expect(html).toContain(pdl.nombre);
    }

    for (const preg of PREGUNTAS_ESTRATEGICAS_DIAGNOSTICO_PDD) {
      expect(html).toContain(preg.pregunta);
    }
  });

  it("6. el Drawer lateral (SidePanel · Zero-Modals) renderiza cobertura de páginas PDF con SHA-256 y articulación PA/BPIM", () => {
    const html = renderToString(
      <SistemaMultiagentePddPanel
        puedeEditar={false}
        inspeccionInicial={{ tipo: "PLAN", codigoPlan: "PDD_2024_2027" }}
      />
    );

    expect(html).toContain('data-testid="drawer-lateral-multiagente"');
    expect(html).toContain('data-slot="side-panel"');
    expect(html).toContain("pdd_2024_2027_acuerdo_139_oficial.pdf");
    expect(html).toContain("304/304 págs.");
    expect(html).toContain("491/491 págs.");
    expect(html).toContain("549/549 págs.");
    expect(html).toContain("2026130010021");
    expect(html).toContain("Distriseguridad");
  });

  it("7. está integrado y accesible desde PddDeaEvaluacionPanel y MotorPlanAccionTab", () => {
    const htmlPdd = renderToString(
      <PddDeaEvaluacionPanel puedeEditar={false} subvistaInicial="sistema_multiagente_pdd" />
    );
    expect(htmlPdd).toContain('data-testid="pdd-tab-sistema-multiagente"');
    expect(htmlPdd).toContain('data-testid="sistema-multiagente-pdd-panel"');

    const htmlMotor = renderToString(<MotorPlanAccionTab puedeEditar={false} />);
    expect(htmlMotor).toContain('data-testid="tab-motor-multiagente-pdd"');
    expect(htmlMotor).toContain("Sistema Multiagente PDD/PDL (2012–2027)");
  });
});
