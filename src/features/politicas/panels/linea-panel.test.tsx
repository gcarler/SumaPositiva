import { describe, test, expect, beforeEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LineaPanel } from "./linea-panel";
import { usePoliticasStore } from "@/features/politicas/state/politicas-store";
import { POLITICAS_QUERY_KEYS } from "@/features/politicas/services/use-politicas-queries";
import { APORTES_QUERY_KEY, MIS_APOYOS_QUERY_KEY } from "@/features/aportes/services/use-aportes-queries";

describe("LineaPanel — Resolución Híbrida TanStack Query [LINEAS-APORTES-01]", () => {
  beforeEach(() => {
    // Asegurar que usePoliticasStore está completamente vacío como ocurre en producción
    usePoliticasStore.setState({ politicas: [] });
  });

  test("renderiza correctamente título, kicker, muro y botón 'Aportar a esta línea' con UUIDs reales y store Zustand vacío", () => {
    const testLineaId = "01a0f61b-6252-73d5-b035-7671ed9cf089";
    const testFaseId = "01a0f61b-1111-73d5-b035-7671ed9cf089";
    const testPoliticaId = "pol-001";

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    // Sembrar la caché de TanStack Query con los datos reales que entrega la API
    queryClient.setQueryData(POLITICAS_QUERY_KEYS.lineas, [
      {
        id: testLineaId,
        fase_id: testFaseId,
        codigo: "LE-01",
        titulo: "Seguridad Territorial, Desarme y Convivencia Comunitaria",
        descripcion: "Intervención integral en puntos calientes y desarme comunitario.",
        costo_estimado: 5000000000,
        fuentes_financiacion: ["FONSET"],
        entidad_lider: "Secretaría del Interior y Convivencia",
        activa: true,
        aportes_count: 3,
      },
    ]);

    queryClient.setQueryData(POLITICAS_QUERY_KEYS.fases, [
      {
        id: testFaseId,
        orden: 1,
        codigo: "FASE_1_DIAGNOSTICO",
        nombre: "Fase 1: Diagnóstico Participativo e Intersectorial",
        estado: "activa",
        progreso_porcentaje: 15,
      },
    ]);

    queryClient.setQueryData(POLITICAS_QUERY_KEYS.todas, [
      {
        id: testPoliticaId,
        slug: "seguridad-humana-cartagena",
        titulo: "Política Pública de Seguridad Humana Integral de Cartagena 2026–2036",
        resumen: "Construcción participativa de la Política Pública de Seguridad Humana Integral.",
        descripcion: "",
        problema: "",
        sector: "seguridad",
        estado: "consulta_publica",
        cobertura: "Distrito de Cartagena",
        fechaInicio: "2026-02-01",
        fechaCierre: "2026-12-31",
        participantes: 1540,
        fases: [],
      },
    ]);

    queryClient.setQueryData([...APORTES_QUERY_KEY, { linea_id: testLineaId }], {
      total: 1,
      elementos: [
        {
          id: "01a0f61b-9999-73d5-b035-7671ed9cf089",
          codigo_radicado: "POL-2026-0001",
          tipo_aporte: "propuesta",
          titulo: "Cámaras de vigilancia comunitaria en El Pozón",
          descripcion: "Instalación de cámaras conectadas al CAD Distrital.",
          autor_nombre: "María Pérez",
          es_anonimo: false,
          apoyos_contador: 12,
          creado_en: "2026-03-15T10:00:00Z",
        },
      ],
    });

    queryClient.setQueryData(MIS_APOYOS_QUERY_KEY, []);

    const html = renderToString(
      <QueryClientProvider client={queryClient}>
        <LineaPanel
          entryKey="linea-panel-test"
          props={{
            politicaId: testPoliticaId,
            faseId: testFaseId,
            lineaId: testLineaId,
          }}
        />
      </QueryClientProvider>
    );

    // No debe mostrar la pantalla de fallo prematuro
    expect(html).not.toContain("Línea no disponible");
    expect(html).not.toContain("Esta línea estratégica ya no está disponible");

    // Debe renderizar título, código y metadatos de la línea
    expect(html).toContain("LE-01");
    expect(html).toContain("Seguridad Territorial, Desarme y Convivencia Comunitaria");
    expect(html).toContain("Línea estratégica LE-01");

    // Debe renderizar el botón oficial para aportar
    expect(html).toContain("Aportar a esta línea");

    // Debe renderizar el aporte cívico del muro
    expect(html).toContain("Cámaras de vigilancia comunitaria en El Pozón");
    expect(html).toContain("María Pérez");
  });

  test("renderiza estado de carga esqueleto mientras useLineas está pendiente", () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    const html = renderToString(
      <QueryClientProvider client={queryClient}>
        <LineaPanel
          entryKey="linea-panel-loading"
          props={{
            politicaId: "pol-001",
            faseId: "fase-test",
            lineaId: "linea-test",
          }}
        />
      </QueryClientProvider>
    );

    // Debe mostrar estado de carga, no error
    expect(html).toContain("Cargando línea…");
    expect(html).not.toContain("Esta línea estratégica ya no está disponible");
  });
});
