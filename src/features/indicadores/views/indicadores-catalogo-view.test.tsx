import { describe, test, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  QueryClient,
  QueryClientProvider,
  type UseQueryResult,
} from "@tanstack/react-query";
import {
  IndicadoresCatalogoView,
  IndicadorMetodologiaDetalle,
  DIMENSIONES,
  ETIQUETAS_DIMENSION,
  DESCRIPCIONES_TIER,
} from "./indicadores-catalogo-view";
import type {
  CatalogoIndicador,
  CatalogoIndicadoresRespuesta,
} from "../services/indicadores-catalogo-api";
import * as hookModulo from "../services/use-indicadores-catalogo";

describe("Vista del Catálogo de Indicadores [B-2, B-3, N-1..N-9]", () => {
  const indicadorTierA: CatalogoIndicador = {
    codigo: "SALUD_004",
    nombre: "Prevalencia de inseguridad alimentaria moderada o grave",
    dimension: "SALUD",
    definicion:
      "Porcentaje de personas u hogares que experimentan dificultades para acceder a alimentos.",
    formula: "Hogares_FIES / Total_Hogares * 100",
    numerador: "Hogares con escala FIES afirmativa",
    denominador: "Total de hogares muestreados en Cartagena",
    unidad: "Porcentaje (%)",
    tipo_territorio_fuente: "Municipal",
    periodicidad: "Anual",
    tipo_periodo: "Año calendario",
    fuente: "DANE - Encuesta Nacional de Calidad de Vida (ECV)",
    url_fuente: "https://www.dane.gov.co/index.php/estadisticas-por-tema/salud",
    custodio: "DANE - Dirección de Difusión",
    licencia: "Open Data DANE - Ley 1712 de 2014",
    anio_base: "2024",
    interpretacion:
      "Describe la vulnerabilidad nutricional observada en el territorio distrital.",
    riesgo_metodologico:
      "Muestra expandida a nivel municipal sujeta a margen de error muestral.",
    tier: "A",
    estado: "no_publicable",
  };

  const indicadorTierC_1: CatalogoIndicador = {
    codigo: "PERS_009",
    nombre: "Tasa de respuesta institucional ante situaciones de riesgo",
    dimension: "PERS",
    definicion:
      "Medición de los tiempos de reacción comunitaria y cuadrantes en zonas priorizadas.",
    formula: "Tiempo_Total_Atencion / Casos_Atendidos",
    numerador: "Suma de minutos transcurridos",
    denominador: "Número total de requerimientos ciudadanos",
    unidad: "Minutos promedio",
    tipo_territorio_fuente: "Comunal",
    periodicidad: "Mensual",
    tipo_periodo: "Mes calendario",
    fuente: "Observatorio Distrital de Seguridad (en estructuración)",
    url_fuente: "NO_VERIFICADO",
    custodio: "Secretaría del Interior y Convivencia",
    licencia: "Pendiente de formalización",
    anio_base: "2026",
    interpretacion:
      "Mide el tiempo de respuesta ante eventos de riesgo reportados por la ciudadanía.",
    riesgo_metodologico:
      "Registro en proceso de consolidación técnica; sin repositorio verificado.",
    tier: "C",
    estado: "no_publicable",
  };

  const indicadorTierC_2: CatalogoIndicador = {
    codigo: "ECON_007",
    nombre: "Índice de dinamismo económico en economía popular",
    dimension: "ECON",
    definicion:
      "Indicador compuesto sobre liquidez y ventas en nodos comerciales populares.",
    formula: "Ventas_Muestra / Linea_Base_Comercial",
    numerador: "Volumen transaccional estimado",
    denominador: "Capacidad instalada estimada",
    unidad: "Índice (0-100)",
    tipo_territorio_fuente: "Barrial",
    periodicidad: "Trimestral",
    tipo_periodo: "Trimestre",
    fuente: "Censo de Economía Popular (fase preparatoria)",
    url_fuente: "NO_VERIFICADO",
    custodio: "Secretaría de Hacienda Distrital",
    licencia: "En trámite",
    anio_base: "2025",
    interpretacion:
      "Describe la actividad comercial en barrios con predominio de empleo informal.",
    riesgo_metodologico:
      "Requiere calibración con censo económico distrital y verificación de campo.",
    tier: "C",
    estado: "no_publicable",
  };

  const mockRespuesta: CatalogoIndicadoresRespuesta = {
    total: 3,
    archivo_sha256: "sha256_mock_hash_indicadores",
    indicadores: [indicadorTierA, indicadorTierC_1, indicadorTierC_2],
  };

  function crearMockQuery(
    parcial: Partial<UseQueryResult<CatalogoIndicadoresRespuesta, Error>>,
  ): UseQueryResult<CatalogoIndicadoresRespuesta, Error> {
    return {
      data: undefined,
      isLoading: false,
      isError: false,
      isPending: false,
      isSuccess: true,
      status: "success",
      fetchStatus: "idle",
      error: null,
      dataUpdatedAt: Date.now(),
      errorUpdatedAt: 0,
      isFetched: true,
      isFetchedAfterMount: true,
      isFetching: false,
      isLoadingError: false,
      isPaused: false,
      isPlaceholderData: false,
      isRefetchError: false,
      isRefetching: false,
      isStale: false,
      refetch: vi.fn(),
      promise: Promise.resolve(mockRespuesta),
      ...parcial,
    } as unknown as UseQueryResult<CatalogoIndicadoresRespuesta, Error>;
  }

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function renderViewConQuery(ui: React.ReactElement) {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return renderToString(
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
    );
  }

  test("1. (N-1) Utiliza el contenedor fluido del sitio (container-fluid w-full)", () => {
    vi.spyOn(hookModulo, "useCatalogoIndicadores").mockReturnValue(
      crearMockQuery({
        data: mockRespuesta,
        isLoading: false,
        isError: false,
      }),
    );

    const html = renderViewConQuery(<IndicadoresCatalogoView />);
    expect(html).toContain("container-fluid w-full");
    expect(html).not.toContain("max-w-7xl");
  });

  test("2. (N-9) Elimina el total hardcodeado '24' y muestra total dinámico de la API", () => {
    vi.spyOn(hookModulo, "useCatalogoIndicadores").mockReturnValue(
      crearMockQuery({
        data: mockRespuesta,
        isLoading: false,
        isError: false,
      }),
    );

    const html = renderViewConQuery(<IndicadoresCatalogoView />);
    expect(html).toContain("El catálogo registra actualmente 3 indicadores");
    expect(html).not.toContain("Los 24 indicadores siguen");
    expect(html).toContain("3 indicadores encontrados");
  });

  test("3. (N-3) Presenta la leyenda cívica de Tiers (A, B, C) y explica 'no publicable'", () => {
    vi.spyOn(hookModulo, "useCatalogoIndicadores").mockReturnValue(
      crearMockQuery({
        data: mockRespuesta,
        isLoading: false,
        isError: false,
      }),
    );

    const html = renderViewConQuery(<IndicadoresCatalogoView />);
    expect(html).toContain("Madurez metodológica y principio de no publicación");
    expect(html).toContain("Tier A");
    expect(html).toContain(DESCRIPCIONES_TIER.A.detalle);
    expect(html).toContain("Tier B");
    expect(html).toContain(DESCRIPCIONES_TIER.B.detalle);
    expect(html).toContain("Tier C");
    expect(html).toContain(DESCRIPCIONES_TIER.C.detalle);
    expect(html).toContain(
      "¿Por qué todos los indicadores registran el estado «No publicable»?",
    );
    expect(html).toContain(
      "no un tablero de divulgación de cifras ni un cálculo dinámico de valores",
    );
    expect(html).toContain(
      "certifique formalmente la fórmula, el denominador y la licencia de datos",
    );
  });

  test("4. (N-4) Utiliza las etiquetas canónicas de taxonomia_7d_polis.py con códigos visibles", () => {
    vi.spyOn(hookModulo, "useCatalogoIndicadores").mockReturnValue(
      crearMockQuery({
        data: mockRespuesta,
        isLoading: false,
        isError: false,
      }),
    );

    expect(DIMENSIONES).toContain("todas");
    expect(DIMENSIONES).toContain("SALUD");
    expect(DIMENSIONES).toHaveLength(8);

    const html = renderViewConQuery(<IndicadoresCatalogoView />);
    expect(ETIQUETAS_DIMENSION.SALUD).toBe("Alimentaria y sanitaria");
    expect(ETIQUETAS_DIMENSION.POL).toBe(
      "Política, institucional y derechos humanos",
    );
    expect(ETIQUETAS_DIMENSION.SAT).toBe(
      "Alertas tempranas y gestión de crisis",
    );
    expect(ETIQUETAS_DIMENSION.PERS).toBe("Personal y ciudadana");
    expect(ETIQUETAS_DIMENSION.COM).toBe("Convivencia y comunitaria");
    expect(ETIQUETAS_DIMENSION.AMB).toBe("Ambiental y del entorno físico");
    expect(ETIQUETAS_DIMENSION.ECON).toBe("Económica y medios de vida");

    // En la tabla aparecen tanto el código como la etiqueta canónica
    expect(html).toContain("SALUD");
    expect(html).toContain("Alimentaria y sanitaria");
    expect(html).toContain("PERS");
    expect(html).toContain("Personal y ciudadana");
    expect(html).toContain("ECON");
    expect(html).toContain("Económica y medios de vida");
  });

  test("5. (N-2) Corrige ortografía y tildes en textos visibles y aria-label", () => {
    vi.spyOn(hookModulo, "useCatalogoIndicadores").mockReturnValue(
      crearMockQuery({
        data: mockRespuesta,
        isLoading: false,
        isError: false,
      }),
    );

    const html = renderViewConQuery(<IndicadoresCatalogoView />);
    expect(html).toContain("Dimensión");
    expect(html).toContain('aria-label="Filtrar por dimensión"');
    expect(html).toContain("Búsqueda");
    expect(html).toContain("fórmula");
    expect(html).toContain("Catálogo de indicadores");
    expect(html).toContain("3 indicadores encontrados");
  });

  test("6. (N-6 y B-2) Las filas Tier C con NO_VERIFICADO no tienen enlace href; Tier A sí", () => {
    vi.spyOn(hookModulo, "useCatalogoIndicadores").mockReturnValue(
      crearMockQuery({
        data: mockRespuesta,
        isLoading: false,
        isError: false,
      }),
    );

    const html = renderViewConQuery(<IndicadoresCatalogoView />);

    // Tier A tiene enlace oficial https
    expect(html).toContain(
      'href="https://www.dane.gov.co/index.php/estadisticas-por-tema/salud"',
    );
    expect(html).toContain('target="_blank"');

    // Tier C (PERS_009 y ECON_007) figuran NO_VERIFICADO y NO tienen enlace con href
    expect(html).toContain("NO_VERIFICADO");
    expect(html).not.toContain('href="NO_VERIFICADO"');
  });

  test("7. (B-3) IndicadorMetodologiaDetalle muestra exhaustivamente los 15 campos metodológicos", () => {
    const htmlA = renderToString(
      <IndicadorMetodologiaDetalle indicador={indicadorTierA} />,
    );

    // 1. Definición
    expect(htmlA).toContain(indicadorTierA.definicion);
    // 2. Interpretación
    expect(htmlA).toContain(indicadorTierA.interpretacion);
    // 3. Fórmula
    expect(htmlA).toContain(indicadorTierA.formula);
    // 4. Numerador
    expect(htmlA).toContain(indicadorTierA.numerador);
    // 5. Denominador
    expect(htmlA).toContain(indicadorTierA.denominador);
    // 6. Unidad
    expect(htmlA).toContain(indicadorTierA.unidad);
    // 7. Tipo de territorio fuente
    expect(htmlA).toContain(indicadorTierA.tipo_territorio_fuente);
    // 8. Periodicidad
    expect(htmlA).toContain(indicadorTierA.periodicidad);
    // 9. Tipo de periodo
    expect(htmlA).toContain(indicadorTierA.tipo_periodo);
    // 10. Año base
    expect(htmlA).toContain(indicadorTierA.anio_base);
    // 11. Fuente
    expect(htmlA).toContain(indicadorTierA.fuente);
    // 12. Entidad custodia
    expect(htmlA).toContain(indicadorTierA.custodio);
    // 13. Licencia
    expect(htmlA).toContain(indicadorTierA.licencia);
    // 14. URL oficial con enlace seguro
    expect(htmlA).toContain(indicadorTierA.url_fuente);
    expect(htmlA).toContain('target="_blank"');
    // 15. Riesgo metodológico
    expect(htmlA).toContain(indicadorTierA.riesgo_metodologico);
    // Estado y Tier
    expect(htmlA).toContain("Tier A");
    expect(htmlA).toContain("No publicable");

    // Comprobar también Tier C en detalle
    const htmlC = renderToString(
      <IndicadorMetodologiaDetalle indicador={indicadorTierC_1} />,
    );
    expect(htmlC).toContain(indicadorTierC_1.definicion);
    expect(htmlC).toContain(indicadorTierC_1.riesgo_metodologico);
    expect(htmlC).toContain("Tier C");
    expect(htmlC).toContain("Fuente: NO_VERIFICADO");
    expect(htmlC).not.toContain('href="NO_VERIFICADO"');
  });

  test("8. Quita el truncado rígido del nombre para permitir lectura completa y accesible", () => {
    vi.spyOn(hookModulo, "useCatalogoIndicadores").mockReturnValue(
      crearMockQuery({
        data: mockRespuesta,
        isLoading: false,
        isError: false,
      }),
    );

    const html = renderViewConQuery(<IndicadoresCatalogoView />);
    expect(html).not.toContain("max-w-[320px] truncate");
    expect(html).toContain(
      "Prevalencia de inseguridad alimentaria moderada o grave",
    );
  });

  test("9. Renderiza estados de carga, error y vacío de manera accesible", () => {
    // Estado de carga
    vi.spyOn(hookModulo, "useCatalogoIndicadores").mockReturnValue(
      crearMockQuery({
        data: undefined,
        isLoading: true,
        isError: false,
        status: "pending",
        isPending: true,
      }),
    );

    const htmlCarga = renderViewConQuery(<IndicadoresCatalogoView />);
    expect(htmlCarga).toContain("Cargando catálogo de indicadores…");
    expect(htmlCarga).toContain("Consultando catálogo…");

    // Estado de error
    vi.spyOn(hookModulo, "useCatalogoIndicadores").mockReturnValue(
      crearMockQuery({
        data: undefined,
        isLoading: false,
        isError: true,
        status: "error",
      }),
    );

    const htmlError = renderViewConQuery(<IndicadoresCatalogoView />);
    expect(htmlError).toContain(
      "No fue posible consultar el catálogo de indicadores. Intente de nuevo más tarde.",
    );

    // Estado vacío
    vi.spyOn(hookModulo, "useCatalogoIndicadores").mockReturnValue(
      crearMockQuery({
        data: { total: 0, archivo_sha256: "sha_empty", indicadores: [] },
        isLoading: false,
        isError: false,
      }),
    );

    const htmlVacio = renderViewConQuery(<IndicadoresCatalogoView />);
    expect(htmlVacio).toContain(
      "Sin resultados en el catálogo para los filtros seleccionados",
    );
    expect(htmlVacio).toContain("0 indicadores encontrados");
  });
});
