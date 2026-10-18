import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  obtenerEstadoSistemaMultiagentePdd,
  ejecutarSistemaMultiagentePdd,
  obtenerComparativoSeguridadHumanaPdd,
  obtenerCruceMultiagentePaBpim,
  obtenerArquitecturaAgentesIaPdd,
  consultarAgentesInteligentesPdd,
  interpretarFragmentoSemanticoPdd,
  obtenerEstadoSistemaMultiagentePddLocal,
  obtenerComparativoSeguridadHumanaPddLocal,
  obtenerCruceMultiagentePaBpimLocal,
  ARCHIVOS_COBERTURA_PDF_CANONICOS,
  PLANES_PDD_COMPARATIVO_CANONICO,
  ANEXO_PDL_TERRITORIAL_CANONICO,
  PREGUNTAS_ESTRATEGICAS_DIAGNOSTICO_PDD,
  PUERTAS_CALIDAD_MULTIAGENTE_CANONICAS,
  ARQUITECTURA_AGENTES_IA_PDD_CANONICA,
  FRAGMENTOS_PRUEBA_INTERPRETE_PDD,
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

  it("8. obtenerCruceMultiagentePaBpim normaliza el payload real del backend en vivo sin campos undefined ni NaN", async () => {
    const backendPayloadVivo = {
      resumen_ejecutivo: {
        total_nodos_pdd_pdl: 1524,
        desglose_frontalidad: { A: 205, B: 416, C: 263, N: 640 },
        total_metas_pdd: 2228,
        total_metas_pdl: 401,
        total_actividades_pa: 281,
        entidades_activas: 29,
        cobertura_articulacion_vigente_2024_2027: {
          articuladas: 265,
          brechas: 16,
        },
      },
      articulacion_por_dimension_sh: [
        {
          dimension: "Personal",
          nodos_ab: 47,
          ppi_constante_asignado_cop: 1369619394914.62,
          actividades_pa: 365,
          avance_fisico_promedio: 39.01,
          entidades_lideres: ["Secretaría del Interior y Convivencia Ciudadana", "Distriseguridad"],
        },
        {
          dimension: "Salud",
          nodos_ab: 88,
          ppi_constante_asignado_cop: 4820410290110,
          actividades_pa: 38,
          avance_fisico_promedio: 73.1,
          entidades_lideres: ["DADIS"],
        },
      ],
      articulacion_por_entidad: [
        {
          entidad: "Secretaría del Interior y Convivencia Ciudadana",
          actividades_pa: 39,
          metas_pdd_asociadas: 39,
          productos_mga_bpim: 39,
          grado_frontalidad_predominante: "A",
        },
      ],
      matriz_trazabilidad_pa_bpim: [
        {
          codigo_plan: "PDD_2024_2027",
          codigo_nodo: "PDD24-L1-P01",
          nombre_programa: "Cartagena Segura, Ordenada y en Paz (Plan Titán 24)",
          grado_frontalidad: "A",
          dimension_sh_principal: "Personal",
          meta_pdd: "MP-2024-001: Reducir la tasa de homicidios por cada 100.000 habitantes",
          actividad_pa_id: "PA-2026-SECINT-001",
          descripcion_actividad_pa: "Ejecutar operativos integrados de control territorial",
          dependencia_responsable: "Secretaría del Interior y Convivencia Ciudadana",
          codigo_bpim_sugerido: "2024130010012",
          producto_mga_dnp: "4501001 - Servicio de apoyo a la convivencia y seguridad ciudadana",
          avance_fisico_pct: 18.0,
          estado_articulacion: "ARTICULADA",
        },
      ],
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(backendPayloadVivo), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    try {
      const cruce = await obtenerCruceMultiagentePaBpim();

      // 1. Resumen ejecutivo normalizado
      expect(cruce.resumen_ejecutivo.nodos_grado_a).toBe(205);
      expect(cruce.resumen_ejecutivo.nodos_grado_b).toBe(416);
      expect(cruce.resumen_ejecutivo.nodos_grado_c).toBe(263);
      expect(cruce.resumen_ejecutivo.nodos_grado_n).toBe(640);
      expect(cruce.resumen_ejecutivo.cobertura_articulacion_vigente_2024_2027_pct).toBeCloseTo(
        94.31,
        1
      );

      // 2. Dimensiones normalizadas
      const dimPersonal = cruce.articulacion_por_dimension_sh[0]!;
      expect(dimPersonal.dimension).toBe("Seguridad Personal");
      expect(dimPersonal.nodos_a_mas_b).toBe(47);
      expect(dimPersonal.presupuesto_ppi_constante_2025_cop).toBeCloseTo(1369619394914.62, 2);
      expect(dimPersonal.actividades_pa_vinculadas).toBe(365);
      expect(dimPersonal.avance_fisico_promedio_pct).toBe(39.01);

      const dimSalud = cruce.articulacion_por_dimension_sh[1]!;
      expect(dimSalud.dimension).toBe("Seguridad en la Salud");
      expect(dimSalud.nodos_a_mas_b).toBe(88);

      // 3. Entidad normalizada
      const ent = cruce.articulacion_por_entidad[0]!;
      expect(ent.entidad_responsable).toBe("Secretaría del Interior y Convivencia Ciudadana");
      expect(ent.sigla).toBeTruthy();
      expect(ent.actividades_pa_count).toBe(39);
      expect(ent.metas_pdd_asociadas).toBe(39);
      expect(ent.productos_mga_bpim).toBe(39);
      expect(Number.isNaN(ent.presupuesto_pa_programado_cop)).toBe(false);
      expect(Number.isNaN(ent.avance_fisico_promedio_pct)).toBe(false);

      // 4. Matriz de trazabilidad normalizada
      const reg = cruce.matriz_trazabilidad_pa_bpim[0]!;
      expect(reg.id_trazabilidad).toBe("TRZ-001-PDD24-L1-P01-PA-2026-SECINT-001");
      expect(reg.dimension_sh_principal).toBe("Seguridad Personal");
      expect(reg.meta_pdd_codigo).toContain("MP-2024-001");
      expect(reg.meta_pdd_descripcion).toContain("Reducir la tasa de homicidios");
      expect(reg.actividad_pa_codigo).toBe("PA-2026-SECINT-001");
      expect(reg.codigo_bpim).toBe("2024130010012");
      expect(reg.estado_articulacion).toBe("ARTICULADO_VERIFICADO");
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("9. obtenerArquitecturaAgentesIaPdd y consultarAgentesInteligentesPdd normalizan respuestas reales de LangGraph + PydanticAI ([20B])", async () => {
    const mockArquitectura = {
      motor: "POLIS_NEUROSIMBOLICO_LANGGRAPH_PYDANTIC_AI_V2",
      orquestador: "LangGraph StateGraph",
      framework_agentes: "PydanticAI",
      nodos_langgraph: ARQUITECTURA_AGENTES_IA_PDD_CANONICA.nodos_langgraph,
      aristas_grafo: ARQUITECTURA_AGENTES_IA_PDD_CANONICA.aristas_grafo,
      herramientas_registradas: ARQUITECTURA_AGENTES_IA_PDD_CANONICA.herramientas_registradas,
      corpus_conectado: {
        evidencias_paginas: 2734,
        nodos_mga: 1573,
        metas_pdd: 4236,
        metas_pdl: 401,
      },
    };

    const mockConsulta = {
      run_id: "LG-VIVO-001",
      motor: "POLIS_NEUROSIMBOLICO_LANGGRAPH_PYDANTIC_AI_V2",
      pregunta: "¿Cómo evolucionó la inversión frontal en Seguridad Personal?",
      sintesis_ejecutiva: "Síntesis verificada desde PostgreSQL con 0% alucinación.",
      dictamen_forense_detallado: "Comparativo longitudinal 2012-2027 verificado.",
      traza_langgraph: [
        {
          orden: 1,
          nodo_langgraph: "lector_semantico_documental",
          agente: "AgenteLectorSemanticoDocumental",
          razonamiento: "Búsqueda en pdd_evidencia_paginas",
          herramientas_invocadas: [
            { herramienta: "tool_buscar_evidencia_paginas_pdd", registros_recuperados: 12 },
          ],
          duracion_ms: 35.4,
          estado: "COMPLETADO",
        },
      ],
      citas_evidencia_documental: [
        {
          codigo_plan: "PDD_2024_2027",
          archivo: "pdd_2024_2027_acuerdo_139_oficial.pdf",
          pagina: 84,
          sha256_contenido: "d5e6f7a8b9c01234567890abcdef1234567890abcdef1234567890abcdef1234",
          origen_texto: "TEXTO_NATIVO_PDF",
          extracto_relevante: "Línea Estratégica 1: Vida Digna",
        },
      ],
      verificacion_critica: {
        aprobado: true,
        iteraciones_langgraph: 1,
        cero_alucinacion_financiera: true,
        citas_sha256_verificadas: 1,
        observacion_verificador: "Citas y cifras conciliadas al 100%.",
      },
    };

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockArquitectura), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockConsulta), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

    try {
      const arq = await obtenerArquitecturaAgentesIaPdd();
      expect(arq.orquestador).toBe("LangGraph StateGraph");
      expect(arq.framework_agentes).toBe("PydanticAI");
      expect(arq.nodos_langgraph).toHaveLength(6);
      expect(arq.herramientas_registradas).toHaveLength(5);
      expect(arq.corpus_conectado.evidencias_paginas).toBe(2734);

      const res = await consultarAgentesInteligentesPdd({
        pregunta: "¿Cómo evolucionó la inversión frontal en Seguridad Personal?",
        codigo_plan: "TODOS",
      });
      expect(res.run_id).toBe("LG-VIVO-001");
      expect(res.verificacion_critica.aprobado).toBe(true);
      expect(res.verificacion_critica.cero_alucinacion_financiera).toBe(true);
      expect(res.traza_langgraph[0]?.agente).toBe("AgenteLectorSemanticoDocumental");
      expect(res.citas_evidencia_documental[0]?.pagina).toBe(84);
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("10. interpretarFragmentoSemanticoPdd normaliza extracción MGA, evaluación CREMA, pesos_7d y sugerencia BPIM ([20B])", async () => {
    const mockInterpretacion = {
      texto_fragmento: FRAGMENTOS_PRUEBA_INTERPRETE_PDD[0]!.texto_fragmento,
      codigo_plan_referencia: "PDD_2024_2027",
      archivo_origen: "pdd_2024_2027_acuerdo_139_oficial.pdf",
      pagina: 84,
      nodos_extraidos: [
        {
          nivel: "PROGRAMA",
          codigo_detectado: "PRG-ALIM-01",
          nombre: "Cartagena Sin Hambre y Soberanía Alimentaria",
          problema_central_inferido: "Inseguridad alimentaria severa en hogares vulnerables",
          objetivo_mga_inferido: "Garantizar acceso nutricional mediante comedores y huertas",
        },
      ],
      metas_extraidas: [
        {
          tipo_meta: "RESULTADO",
          descripcion_meta: "Reducir del 18,4% al 10,0% la prevalencia de inseguridad alimentaria severa",
          indicador_sugerido: "Prevalencia de inseguridad alimentaria severa (%)",
          linea_base: 18.4,
          meta_cuatrienio: 10.0,
          evaluacion_crema: {
            claro: true,
            relevante: true,
            economico: true,
            medible: true,
            adecuado: true,
            puntaje_crema_pct: 100,
            observacion_dnp: "Indicador cumple 5/5 atributos CREMA.",
          },
        },
      ],
      clasificacion_neurosimbolica: {
        grado_frontalidad: "B",
        etiqueta_frontalidad: "B_DETERMINANTE_DIRECTO",
        dimension_sh_primaria: "Alimentaria",
        pesos_7d: {
          Alimentaria: 0.65,
          Salud: 0.15,
          Economica: 0.1,
          Comunitaria: 0.05,
          Personal: 0.03,
          Ambiental: 0.01,
          Politica: 0.01,
        },
        justificacion_causal_ia: "Mitigación directa de vulnerabilidad nutricional en hogares.",
      },
      articulacion_bpim_sugerida: {
        codigo_bpim_sugerido: "2026130010103",
        producto_catalogo_mga_dnp: "4102019 - Servicios de asistencia alimentaria",
        entidad_responsable_sugerida: "PES Pedro Romero",
      },
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockInterpretacion), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    try {
      const interp = await interpretarFragmentoSemanticoPdd({
        texto_fragmento: FRAGMENTOS_PRUEBA_INTERPRETE_PDD[0]!.texto_fragmento,
        codigo_plan_referencia: "PDD_2024_2027",
      });
      expect(interp.nodos_extraidos[0]?.codigo_detectado).toBe("PRG-ALIM-01");
      expect(interp.metas_extraidas[0]?.linea_base).toBe("18.4");
      expect(interp.metas_extraidas[0]?.meta_cuatrienio).toBe("10");
      expect(interp.metas_extraidas[0]?.evaluacion_crema.puntaje_crema_pct).toBe(100);
      expect(interp.clasificacion_neurosimbolica.grado_frontalidad).toBe("B");
      expect(interp.clasificacion_neurosimbolica.dimension_sh_primaria).toBe(
        "Seguridad Alimentaria"
      );
      expect(interp.clasificacion_neurosimbolica.pesos_7d["Seguridad Alimentaria"]).toBeCloseTo(
        0.65,
        2
      );
      expect(interp.clasificacion_neurosimbolica.pesos_7d["Seguridad en la Salud"]).toBeCloseTo(
        0.15,
        2
      );
      expect(interp.articulacion_bpim_sugerida.codigo_bpim_sugerido).toBe("2026130010103");
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("11. Bloque 4 renderiza los 6 agentes LangGraph, las 5 @agent.tool, la Consola de Consulta y el Intérprete Semántico ([20B])", () => {
    const html = renderToString(<SistemaMultiagentePddPanel puedeEditar={true} />);

    expect(html).toContain('data-testid="bloque-agentes-inteligentes-langgraph"');
    expect(html).toContain('data-testid="cinta-arquitectura-neurosimbolica"');
    expect(html).toContain('data-testid="consola-consulta-agentes-pdd"');
    expect(html).toContain('data-testid="btn-ejecutar-consulta-agentes"');
    expect(html).toContain('data-testid="consola-interprete-semantico-pdd"');
    expect(html).toContain('data-testid="btn-interpretar-fragmento-pdd"');

    for (const nodo of ARQUITECTURA_AGENTES_IA_PDD_CANONICA.nodos_langgraph) {
      expect(html).toContain(nodo.nombre_agente);
    }
    for (const tool of ARQUITECTURA_AGENTES_IA_PDD_CANONICA.herramientas_registradas) {
      expect(html).toContain(tool.nombre);
    }
  });
});


