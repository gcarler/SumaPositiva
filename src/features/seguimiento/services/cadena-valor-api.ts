import { apiFetch } from "@/core/http/api-client";
import type {
  FichaIndicadorDnp,
  CadenaValorData,
  MedicionIndicadorInput,
  MedicionIndicadorRespuesta,
} from "../models/indicador-dnp";
import { calcularAvancePorcentaje } from "../models/indicador-dnp";

export interface CadenaValorRespuestaApi {
  datos: CadenaValorData;
  esContingencia: boolean;
  origen: "api" | "contingencia";
}

export const CADENA_VALOR_CANONICA_CARTAGENA: CadenaValorData = {
  insumo: [
    {
      id: "01a0f7ce-3201-7bd8-819a-d98b2232d04c",
      codigo: "IND-INS-01",
      nombre: "Presupuesto FONSET asignado a programas de convivencia",
      tipo_indicador: "insumo",
      linea_estrategica_id: "LE-01",
      dimension_id: "DIM-SEG",
      nodo_instrumento_id: null,
      definicion: "Total de recursos FONSET destinados a la implementación de planes de convivencia y prevención comunitaria.",
      metodo_calculo: "(Presupuesto FONSET apropiado para programas MGA)",
      unidad_medida: "Pesos COP",
      sentido_esperado: "ascendente",
      periodicidad: "Anual",
      linea_base_valor: 1000000000,
      linea_base_anio: 2023,
      meta_cuatrienio: 4000000000,
      meta_anualizada: { "2026": 1000000000, "2027": 1000000000, "2028": 1000000000, "2029": 1000000000 },
      fuente_datos: "CHIP - DNP / Secretaría de Hacienda",
      responsable_reporte: "Secretaría de Hacienda Distrital",
      metadatos: { programa_dnp: "Seguridad y Convivencia Ciudadana" },
      valor_actual: 2500000000,
      porcentaje_avance: 50,
      tiene_mediciones: true,
      fecha_corte_ultimo_reporte: "2026-03-31",
      periodo_ultimo_reporte: "2026-Q1",
      creado_en: "2026-10-01T14:11:20.704899Z",
      actualizado_en: "2026-10-01T14:11:20.704899Z",
    },
    {
      id: "01a0f7ce-3201-7704-88a4-4d4a4302fe32",
      codigo: "IND-INS-02",
      nombre: "Cámaras de seguridad en mantenimiento y conectividad",
      tipo_indicador: "insumo",
      linea_estrategica_id: "LE-02",
      dimension_id: "DIM-TEC",
      nodo_instrumento_id: null,
      definicion: "Inversión en cámaras de circuito cerrado, fibra óptica y centros de monitoreo.",
      metodo_calculo: "(Inversión anual en mantenimiento LPR y centros de comando)",
      unidad_medida: "Pesos COP",
      sentido_esperado: "ascendente",
      periodicidad: "Anual",
      linea_base_valor: 500000000,
      linea_base_anio: 2023,
      meta_cuatrienio: 2000000000,
      meta_anualizada: { "2026": 500000000, "2027": 500000000, "2028": 500000000, "2029": 500000000 },
      fuente_datos: "Secotic / Distriseguridad",
      responsable_reporte: "Secretaría del Interior",
      metadatos: { tecnologia: "LPR y Videoanalítica" },
      valor_actual: 950000000,
      porcentaje_avance: 30,
      tiene_mediciones: true,
      fecha_corte_ultimo_reporte: "2026-06-30",
      periodo_ultimo_reporte: "2026-S1",
      creado_en: "2026-10-01T14:11:20.705258Z",
      actualizado_en: "2026-10-01T14:11:20.705258Z",
    },
  ],
  producto: [
    {
      id: "01a0f7ce-3201-7cad-8f47-554fa08f43de",
      codigo: "IND-PROD-01",
      nombre: "Número de frentes locales de seguridad conformados",
      tipo_indicador: "producto",
      linea_estrategica_id: "LE-01",
      dimension_id: "DIM-COM",
      nodo_instrumento_id: null,
      definicion: "Total de frentes barriales dotados y apoyados formalmente con alarmas y comunicación directa.",
      metodo_calculo: "(Suma de frentes locales de seguridad comunitarios activos)",
      unidad_medida: "Frentes",
      sentido_esperado: "ascendente",
      periodicidad: "Semestral",
      linea_base_valor: 45,
      linea_base_anio: 2023,
      meta_cuatrienio: 100,
      meta_anualizada: { "2026": 15, "2027": 15, "2028": 15, "2029": 10 },
      fuente_datos: "Policía Metropolitana de Cartagena (MECAR)",
      responsable_reporte: "Distriseguridad",
      metadatos: { tipo_cobertura: "Barrios vulnerables y UCG críticas" },
      valor_actual: 58,
      porcentaje_avance: 23.64,
      tiene_mediciones: true,
      fecha_corte_ultimo_reporte: "2026-06-30",
      periodo_ultimo_reporte: "2026-S1",
      creado_en: "2026-10-01T14:11:20.705280Z",
      actualizado_en: "2026-10-01T14:11:20.705280Z",
    },
    {
      id: "01a0f7ce-3201-7e83-849f-62cc34ee057b",
      codigo: "IND-PROD-02",
      nombre: "Luminarias LED instaladas en puntos críticos",
      tipo_indicador: "producto",
      linea_estrategica_id: "LE-03",
      dimension_id: "DIM-HAB",
      nodo_instrumento_id: null,
      definicion: "Expansión del alumbrado público inteligente en zonas de miedo y senderos peatonales.",
      metodo_calculo: "(Nuevas luminarias LED instaladas en puntos priorizados)",
      unidad_medida: "Luminarias",
      sentido_esperado: "ascendente",
      periodicidad: "Trimestral",
      linea_base_valor: 1200,
      linea_base_anio: 2023,
      meta_cuatrienio: 6000,
      meta_anualizada: { "2026": 1200, "2027": 1200, "2028": 1200, "2029": 1200 },
      fuente_datos: "Concesión de Alumbrado Público Cartagena",
      responsable_reporte: "Secretaría General (Alumbrado Público)",
      metadatos: { sector: "Infraestructura Urbana" },
      valor_actual: 2640,
      porcentaje_avance: 30,
      tiene_mediciones: true,
      fecha_corte_ultimo_reporte: "2026-06-30",
      periodo_ultimo_reporte: "2026-Q2",
      creado_en: "2026-10-01T14:11:20.705292Z",
      actualizado_en: "2026-10-01T14:11:20.705292Z",
    },
    {
      id: "01a0f7ce-3201-793b-8459-76544e9e8d02",
      codigo: "IND-PROD-03",
      nombre: "Jóvenes capacitados en habilidades tecnológicas y laborales",
      tipo_indicador: "producto",
      linea_estrategica_id: "LE-04",
      dimension_id: "DIM-JUV",
      nodo_instrumento_id: null,
      definicion: "Prevención social integral mediante oportunidades educativas y certificación técnica para jóvenes en riesgo.",
      metodo_calculo: "(Número de jóvenes certificados en programas de empleabilidad)",
      unidad_medida: "Jóvenes",
      sentido_esperado: "ascendente",
      periodicidad: "Semestral",
      linea_base_valor: 500,
      linea_base_anio: 2023,
      meta_cuatrienio: 3000,
      meta_anualizada: { "2026": 625, "2027": 625, "2028": 625, "2029": 625 },
      fuente_datos: "Secotic / Secretaría de Participación",
      responsable_reporte: "Secretaría de Participación y Desarrollo Social",
      metadatos: { poblacion_focalizada: "Jóvenes en riesgo de pandillismo" },
      valor_actual: 1350,
      porcentaje_avance: 34,
      tiene_mediciones: true,
      fecha_corte_ultimo_reporte: "2026-06-30",
      periodo_ultimo_reporte: "2026-S1",
      creado_en: "2026-10-01T14:11:20.705303Z",
      actualizado_en: "2026-10-01T14:11:20.705303Z",
    },
  ],
  resultado: [
    {
      id: "01a0f7ce-3201-7d7e-840d-73c90d7f5366",
      codigo: "IND-RES-01",
      nombre: "Tasa de Homicidios por cada 100.000 habitantes",
      tipo_indicador: "resultado",
      linea_estrategica_id: "LE-01",
      dimension_id: "DIM-VIDA",
      nodo_instrumento_id: null,
      definicion: "Impacto estructural en la reducción de muertes violentas intencionales en el Distrito de Cartagena.",
      metodo_calculo: "(Número de homicidios / Población DANE proyectada) * 100.000",
      unidad_medida: "Tasa por 100k hab.",
      sentido_esperado: "descendente",
      periodicidad: "Mensual",
      linea_base_valor: 32.5,
      linea_base_anio: 2023,
      meta_cuatrienio: 25.0,
      meta_anualizada: { "2026": 30.5, "2027": 28.5, "2028": 26.5, "2029": 25.0 },
      fuente_datos: "Medicina Legal / Policía Nacional / Observatorio del Delito",
      responsable_reporte: "Observatorio del Delito (Distriseguridad)",
      metadatos: { tipo_impacto: "Vida e Integridad" },
      valor_actual: 28.75,
      porcentaje_avance: 50,
      tiene_mediciones: true,
      fecha_corte_ultimo_reporte: "2026-08-31",
      periodo_ultimo_reporte: "2026-08",
      creado_en: "2026-10-01T14:11:20.705314Z",
      actualizado_en: "2026-10-01T14:11:20.705314Z",
    },
    {
      id: "01a0f7ce-3201-7ef2-81b4-4f64b0470bc0",
      codigo: "IND-RES-02",
      nombre: "Tasa de hurtos a personas denunciados",
      tipo_indicador: "resultado",
      linea_estrategica_id: "LE-02",
      dimension_id: "DIM-PATR",
      nodo_instrumento_id: null,
      definicion: "Variación en la comisión de delitos patrimoniales contra transeúntes y turistas.",
      metodo_calculo: "(Número de hurtos denunciados / Población DANE) * 100.000",
      unidad_medida: "Tasa por 100k hab.",
      sentido_esperado: "descendente",
      periodicidad: "Mensual",
      linea_base_valor: 450.2,
      linea_base_anio: 2023,
      meta_cuatrienio: 300.0,
      meta_anualizada: { "2026": 410.0, "2027": 370.0, "2028": 330.0, "2029": 300.0 },
      fuente_datos: "SIEDCO - Policía Nacional",
      responsable_reporte: "Secretaría del Interior y Convivencia",
      metadatos: { tipo_impacto: "Seguridad Ciudadana" },
      valor_actual: 385.0,
      porcentaje_avance: 43.41,
      tiene_mediciones: true,
      fecha_corte_ultimo_reporte: "2026-08-31",
      periodo_ultimo_reporte: "2026-08",
      creado_en: "2026-10-01T14:11:20.705324Z",
      actualizado_en: "2026-10-01T14:11:20.705324Z",
    },
    {
      id: "01a0f7ce-3201-72fa-8347-8aa5fc209bf5",
      codigo: "IND-RES-03",
      nombre: "Percepción de Inseguridad en barrios priorizados",
      tipo_indicador: "resultado",
      linea_estrategica_id: "LE-03",
      dimension_id: "DIM-PERC",
      nodo_instrumento_id: null,
      definicion: "Sentimiento ciudadano sobre seguridad local y confianza en las instituciones públicas.",
      metodo_calculo: "(Porcentaje de encuestados que manifiestan sentirse inseguros en su barrio)",
      unidad_medida: "Porcentaje (%)",
      sentido_esperado: "descendente",
      periodicidad: "Anual",
      linea_base_valor: 78.4,
      linea_base_anio: 2023,
      meta_cuatrienio: 60.0,
      meta_anualizada: { "2026": 74.0, "2027": 69.0, "2028": 64.0, "2029": 60.0 },
      fuente_datos: "Encuesta de Percepción Ciudadana — Cartagena Cómo Vamos",
      responsable_reporte: "Secretaría del Interior y Convivencia",
      metadatos: { instrumento_origen: "Encuesta de Percepción y Convivencia" },
      valor_actual: 68.2,
      porcentaje_avance: 55.43,
      tiene_mediciones: true,
      fecha_corte_ultimo_reporte: "2026-07-31",
      periodo_ultimo_reporte: "2026-Anual",
      creado_en: "2026-10-01T14:11:20.705334Z",
      actualizado_en: "2026-10-01T14:11:20.705334Z",
    },
  ],
};

function normalizarFicha(item: Record<string, unknown>): FichaIndicadorDnp {
  const lineaBase = Number(item.linea_base_valor ?? 0);
  const meta = Number(item.meta_cuatrienio ?? 0);
  const valorActual = Number(item.valor_actual ?? 0);
  const sentido = (item.sentido_esperado as FichaIndicadorDnp["sentido_esperado"]) ?? "ascendente";
  const avanceCalculado = calcularAvancePorcentaje(valorActual, lineaBase, meta, sentido);

  const tieneMed = item.tiene_mediciones !== undefined
    ? Boolean(item.tiene_mediciones)
    : (valorActual > 0 || Number(item.porcentaje_avance ?? 0) > 0 || Boolean(item.fecha_corte_ultimo_reporte));

  const fechaCorte = item.fecha_corte_ultimo_reporte
    ? String(item.fecha_corte_ultimo_reporte)
    : (item.metadatos && typeof item.metadatos === "object" && (item.metadatos as Record<string, unknown>).fecha_corte_ultimo_reporte
      ? String((item.metadatos as Record<string, unknown>).fecha_corte_ultimo_reporte)
      : null);

  const periodo = item.periodo_ultimo_reporte
    ? String(item.periodo_ultimo_reporte)
    : (item.metadatos && typeof item.metadatos === "object" && (item.metadatos as Record<string, unknown>).periodo_ultimo_reporte
      ? String((item.metadatos as Record<string, unknown>).periodo_ultimo_reporte)
      : null);

  return {
    id: String(item.id),
    codigo: String(item.codigo),
    nombre: String(item.nombre),
    tipo_indicador: String(item.tipo_indicador) as FichaIndicadorDnp["tipo_indicador"],
    linea_estrategica_id: item.linea_estrategica_id ? String(item.linea_estrategica_id) : null,
    dimension_id: item.dimension_id ? String(item.dimension_id) : null,
    nodo_instrumento_id: item.nodo_instrumento_id ? String(item.nodo_instrumento_id) : null,
    definicion: String(item.definicion ?? ""),
    metodo_calculo: String(item.metodo_calculo ?? ""),
    unidad_medida: String(item.unidad_medida ?? ""),
    sentido_esperado: sentido,
    periodicidad: String(item.periodicidad ?? "Anual"),
    linea_base_valor: lineaBase,
    linea_base_anio: Number(item.linea_base_anio ?? 2023),
    meta_cuatrienio: meta,
    meta_anualizada: (item.meta_anualizada as Record<string, unknown>) ?? {},
    fuente_datos: String(item.fuente_datos ?? ""),
    responsable_reporte: String(item.responsable_reporte ?? ""),
    metadatos: (item.metadatos as Record<string, unknown>) ?? {},
    valor_actual: valorActual,
    porcentaje_avance: item.porcentaje_avance !== undefined ? Number(item.porcentaje_avance) : avanceCalculado,
    tiene_mediciones: tieneMed,
    fecha_corte_ultimo_reporte: fechaCorte,
    periodo_ultimo_reporte: periodo,
    creado_en: item.creado_en ? String(item.creado_en) : undefined,
    actualizado_en: item.actualizado_en ? String(item.actualizado_en) : undefined,
  };
}

/**
 * Obtiene la Cadena de Valor SINERGIA DNP completa desde el backend FastAPI.
 * Si el backend está disponible, devuelve los datos de la base de datos PostgreSQL con esContingencia: false.
 * Si ocurre un error de red o de API, retorna el catálogo canónico marcando esContingencia: true (AUD-02).
 */
export async function obtenerCadenaValor(): Promise<CadenaValorRespuestaApi> {
  try {
    const raw = await apiFetch<CadenaValorData>("/indicadores/cadena-valor");
    if (raw && (raw.insumo?.length || raw.producto?.length || raw.resultado?.length)) {
      return {
        datos: {
          insumo: (raw.insumo ?? []).map((x) => normalizarFicha(x as unknown as Record<string, unknown>)),
          producto: (raw.producto ?? []).map((x) => normalizarFicha(x as unknown as Record<string, unknown>)),
          resultado: (raw.resultado ?? []).map((x) => normalizarFicha(x as unknown as Record<string, unknown>)),
        },
        esContingencia: false,
        origen: "api",
      };
    }
  } catch (err) {
    console.warn("No fue posible consultar /indicadores/cadena-valor, utilizando catálogo de contingencia:", err);
  }

  return {
    datos: CADENA_VALOR_CANONICA_CARTAGENA,
    esContingencia: true,
    origen: "contingencia",
  };
}

/**
 * Consulta la ficha técnica DNP detallada de un indicador por ID.
 */
export async function obtenerFichaIndicador(id: string): Promise<FichaIndicadorDnp | null> {
  try {
    const raw = await apiFetch<Record<string, unknown>>(`/indicadores/fichas/${id}`);
    if (raw && raw.id) {
      return normalizarFicha(raw);
    }
  } catch {
    // Buscar en catálogo de contingencia
  }

  const todos = [
    ...CADENA_VALOR_CANONICA_CARTAGENA.insumo,
    ...CADENA_VALOR_CANONICA_CARTAGENA.producto,
    ...CADENA_VALOR_CANONICA_CARTAGENA.resultado,
  ];
  return todos.find((x) => x.id === id || x.codigo === id) ?? null;
}

/**
 * Registra una medición de avance cuantitativo y cualitativo en la ficha DNP.
 * AUD-02: NO captura errores silenciosamente; si la API falla, relanza la excepción
 * para que el store registre el fallo y no mute su estado en memoria.
 */
export async function registrarMedicionIndicador(
  indicadorId: string,
  datos: MedicionIndicadorInput
): Promise<MedicionIndicadorRespuesta> {
  return await apiFetch<MedicionIndicadorRespuesta>(
    `/indicadores/fichas/${indicadorId}/mediciones`,
    {
      method: "POST",
      body: datos,
    }
  );
}
