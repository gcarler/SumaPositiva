import { describe, test, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GeovisorHurtosPanel } from "./geovisor-hurtos-panel";

function renderPanel(props: Parameters<typeof GeovisorHurtosPanel>[0] = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return renderToString(
    <QueryClientProvider client={queryClient}>
      <GeovisorHurtosPanel
        delitoSeleccionado="hurto_motocicletas"
        onDelitoChange={vi.fn()}
        anioSeleccionado={2024}
        onAnioChange={vi.fn()}
        onActivarCapaMapa={vi.fn()}
        onCargarGeojsonPersonalizado={vi.fn()}
        {...props}
      />
    </QueryClientProvider>
  );
}

describe("GeovisorHurtosPanel Component (GEO-GESTOR-01 / GEO-HURTOS-01)", () => {
  test("renderiza el panel con la barra de navegación de 3 modos (Workbench)", () => {
    const html = renderPanel();

    expect(html).toContain('data-testid="geovisor-hurtos-panel"');
    expect(html).toContain("Analítica Espacial de Hurtos SIEDCO");
    expect(html).toContain("2018–2026");
    expect(html).toContain("12.280 registros georreferenciados");

    // Barra de 3 modos de trabajo
    expect(html).toContain("1. Resumen y Gráficos");
    expect(html).toContain("2. Procesador y Tabla (12.280 registros)");
    expect(html).toContain("3. Gestor e Importador GeoJSON");
  });

  test("Modo 1: «Resumen y Gráficos» renderiza selectores, botones rápidos de pintado, KPIs y gráficos", () => {
    const html = renderPanel({ modoInicial: "resumen" });

    // Botones rápidos de pintado de capas en mapa
    expect(html).toContain("Pintar en Mapa: Motocicletas");
    expect(html).toContain("Pintar: Residencias");
    expect(html).toContain("Pintar: Comercio");
    expect(html).toContain("Pintar: Consolidado");

    // Selectores iniciales
    expect(html).toContain("Tipo de Delito");
    expect(html).toContain("Periodo / Año");
    expect(html).toContain("Ámbito Territorial");

    // KPI Titles
    expect(html).toContain("Total Incidentes");
    expect(html).toContain("Perímetro Urbano");
    expect(html).toContain("Zona Rural / Insular");
    expect(html).toContain("Modalidad Predominante");

    // Charts Titles
    expect(html).toContain("Evolución Histórica Anual (2018–2026)");
    expect(html).toContain("Distribución Mensual");
    expect(html).toContain("Top 5 Modalidades / Armas Empleadas");
    expect(html).toContain("Top 5 Clases de Sitio de Ocurrencia");
  });

  test("Modo 2: «Procesador y Tabla de Datos GeoJSON» renderiza filtros multicriterio, pivot y botones de exportación", () => {
    const html = renderPanel({ modoInicial: "procesador" });

    // Título y filtros avanzados
    expect(html).toContain("Filtros Multicriterio de los 12.280 Registros GeoJSON");
    expect(html).toContain("Búsqueda Textual Libre");
    expect(html).toContain("Agrupar y Procesar por");

    // Botones de exportación
    expect(html).toContain("Exportar CSV Procesado");
    expect(html).toContain("Exportar GeoJSON Filtrado");

    // Tabla dinámica (Pivot)
    expect(html).toContain("Procesamiento Agrupado Dinámico (Pivot)");
    expect(html).toContain("Categoría / Dimensión");
    expect(html).toContain("Registros GeoJSON");
    expect(html).toContain("Total Incidentes");

    // Tabla paginada de registros
    expect(html).toContain("Registros GeoJSON Detallados");
    expect(html).toContain("Delito");
    expect(html).toContain("Año / Mes");
    expect(html).toContain("Arma / Modalidad");
    expect(html).toContain("Clase de Sitio");
    expect(html).toContain("Anterior");
    expect(html).toContain("Siguiente");
  });

  test("Modo 3: «Gestor e Importador GeoJSON» renderiza catálogo oficial y dropzone de importación local", () => {
    const html = renderPanel({ modoInicial: "gestor" });

    // Catálogo de capas oficiales SIEDCO
    expect(html).toContain("Catálogo de Capas GeoJSON Oficiales SIEDCO (Google Drive)");
    expect(html).toContain("Hurto_Motocicletas.geojson");
    expect(html).toContain("2.520 features");
    expect(html).toContain("Hurto_Residencias.geojson");
    expect(html).toContain("3.853 features");
    expect(html).toContain("Hurto_Comerciantes.geojson");
    expect(html).toContain("5.907 features");

    // Importador en navegador
    expect(html).toContain("Cargar e Importar Archivo GeoJSON Local en el Navegador");
    expect(html).toContain("Arrastra un archivo GeoJSON aquí o haz clic para examinar");
    expect(html).toContain("Seleccionar Archivo Local");
  });

  test("Modo 1 no falla ante datos de serie con 'periodo' en lugar de 'etiqueta' (GEO-FIX-CONSOLE-01)", () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    queryClient.setQueryData(["analitica-hurtos", "hurto_motocicletas", 2024, "TODAS"], {
      total_casos: 2062,
      delito: "HURTO MOTOCICLETA",
      anio: 2024,
      zona: null,
      serie_anual: [
        { periodo: "2024", cantidad: 2062, porcentaje: 100 },
      ],
      serie_mensual: [
        { periodo: "Enero", cantidad: 180, porcentaje: 8.7 },
      ],
      top_armas: [{ categoria: "SIN EMPLEO DE ARMAS", cantidad: 1200, porcentaje: 58.2 }],
      top_sitios: [{ categoria: "VIAS PUBLICAS", cantidad: 1100, porcentaje: 53.3 }],
      distribucion_zona: [{ zona: "URBANA", cantidad: 2062, porcentaje: 100 }],
    });

    const html = renderToString(
      <QueryClientProvider client={queryClient}>
        <GeovisorHurtosPanel
          delitoSeleccionado="hurto_motocicletas"
          anioSeleccionado={2024}
          modoInicial="resumen"
        />
      </QueryClientProvider>
    );

    // Debe renderizar '24' (slice de '2024') y 'Ene' (slice de 'Enero') sin crashear
    expect(html).toContain("24");
    expect(html).toContain("Ene");
  });
});
