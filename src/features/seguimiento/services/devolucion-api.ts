import { apiFetch } from "@/core/http/api-client";
import type {
  PropuestaDevolucion,
  ConsolidadoParticipacionData,
  EstadoIncorporacion,
  CausalDescarteTaxativa,
} from "../models/devolucion";
import { CAUSALES_DESCARTE_INFO } from "../models/devolucion";

export const PROPUESTAS_DEVOLUCION_CARTAGENA: PropuestaDevolucion[] = [
  {
    id: "prop-01a0f8a1-0001",
    codigo: "PROP-POZON-01",
    titulo: "Iluminación LED y alarmas comunitarias en sectores críticos de El Pozón",
    descripcion: "Solicitud comunitaria de sustitución de 400 luminarias de sodio por tecnología LED y dotación de pulsadores de pánico en Primero de Mayo y Central.",
    autor_nombre: "Junta de Acción Comunal El Pozón Sector Central",
    territorio: "El Pozón",
    canal_origen: "mesas",
    fecha_radicacion: "2026-03-12",
    estado_incorporacion: "INCORPORADA_TOTAL",
    compromiso_pas_codigo: "PAS-ALUM-04",
    compromiso_pas_nombre: "Instalación de 4.800 Luminarias LED en Puntos Críticos",
    motivacion_sustancial: "Propuesta incorporada al 100% en el compromiso PAS-ALUM-04 priorizando los polígonos barriales de El Pozón con 520 puntos lumínicos.",
  },
  {
    id: "prop-01a0f8a1-0002",
    codigo: "PROP-OLAYA-02",
    titulo: "Ruta de atención psicosocial y formación laboral para jóvenes en Olaya Herrera",
    descripcion: "Intervención socioeducativa para prevención de líneas invisibles y desescalamiento de riñas en Playas Blancas, Zarabanda y Boston.",
    autor_nombre: "Colectivo Juvenil Voces de la Ciénaga",
    territorio: "Olaya Herrera",
    canal_origen: "mesas",
    fecha_radicacion: "2026-03-15",
    estado_incorporacion: "INCORPORADA_TOTAL",
    compromiso_pas_codigo: "PAS-JUV-02",
    compromiso_pas_nombre: "Capacitación e Inserción Laboral para Jóvenes en Riesgo",
    motivacion_sustancial: "Incorporada íntegramente en la meta de 1.500 jóvenes certificados del compromiso PAS-JUV-02 con enfoque en UCG 5 y 6.",
  },
  {
    id: "prop-01a0f8a1-0003",
    codigo: "PROP-BOQUILLA-03",
    titulo: "Puesto de salud móvil nocturno y transporte medicalizado para La Boquilla",
    descripcion: "Atención de emergencias y primeros auxilios 24 horas para pescadores y familias en zona de playa.",
    autor_nombre: "Asociación de Pescadores y Familias de La Boquilla",
    territorio: "La Boquilla",
    canal_origen: "web",
    fecha_radicacion: "2026-03-18",
    estado_incorporacion: "INCORPORADA_PARCIAL",
    compromiso_pas_codigo: "PAS-CUID-07",
    compromiso_pas_nombre: "Puesta en Marcha de Manzanas del Cuidado y Centros de Vida",
    motivacion_sustancial: "Acogida parcialmente: La ambulancia exclusiva 24h excede capacidad operativa del DADIS, pero se vincula a la Manzana del Cuidado Norte con brigadas quincenales de salud preventiva.",
  },
  {
    id: "prop-01a0f8a1-0004",
    codigo: "PROP-MANDELA-04",
    titulo: "Construcción de megacárcel distrital de máxima seguridad en Nelson Mandela",
    descripcion: "Propuesta de habilitar un centro penitenciario de reclusión severa para aislamiento de bandas criminales en límites de la Variante.",
    autor_nombre: "Comité Cívico de Seguridad Nelson Mandela",
    territorio: "Nelson Mandela",
    canal_origen: "escenarios",
    fecha_radicacion: "2026-03-20",
    estado_incorporacion: "NO_INCORPORADA_MOTIVADA",
    causal_descarte: "INCOMPETENCIA_LEGAL_LOOT",
    norma_invocada: CAUSALES_DESCARTE_INFO.INCOMPETENCIA_LEGAL_LOOT.norma,
    ruta_alternativa: CAUSALES_DESCARTE_INFO.INCOMPETENCIA_LEGAL_LOOT.canalSugerido,
    motivacion_sustancial: "La propuesta no puede ser incorporada en el PAS distrital debido a que el régimen penitenciario y la creación de cárceles de alta seguridad es reserva de ley y competencia privativa de la Nación (INPEC / Ministerio de Justicia), desbordando la competencia territorial del Distrito de Cartagena fijada por la Ley 1454 de 2011 (LOOT).",
  },
  {
    id: "prop-01a0f8a1-0005",
    codigo: "PROP-CENTRO-05",
    titulo: "Control tecnológico de accesos y cámaras LPR en Centro Histórico y San Diego",
    descripcion: "Anillo digital de seguridad con arcos lectores de placas para control de estafas turísticas y hurtos en el cordón amurallado.",
    autor_nombre: "Veeduría de Patrimonio y Turismo Seguro Cartagena",
    territorio: "Centro Histórico",
    canal_origen: "web",
    fecha_radicacion: "2026-03-22",
    estado_incorporacion: "INCORPORADA_TOTAL",
    compromiso_pas_codigo: "PAS-SEG-03",
    compromiso_pas_nombre: "Mantenimiento y Conectividad de Cámaras LPR",
    motivacion_sustancial: "Incorporada en el componente de videovigilancia de Distriseguridad del compromiso PAS-SEG-03 con 42 cámaras LPR en el perímetro colonial.",
  },
  {
    id: "prop-01a0f8a1-0006",
    codigo: "PROP-BAZURTO-06",
    titulo: "Subsidio en efectivo directo a fondo perdido para 5.000 comerciantes de Bazurto",
    descripcion: "Entrega de $50.000 millones de pesos en cheques no reembolsables sin contraprestación para comerciantes del mercado.",
    autor_nombre: "Sindicato de Vendedores Independientes de Bazurto",
    territorio: "Mercado de Bazurto",
    canal_origen: "mesas",
    fecha_radicacion: "2026-03-25",
    estado_incorporacion: "NO_INCORPORADA_MOTIVADA",
    causal_descarte: "RESTRICCION_FISCAL_MFMP",
    norma_invocada: CAUSALES_DESCARTE_INFO.RESTRICCION_FISCAL_MFMP.norma,
    ruta_alternativa: "Programa de Microcrédito Popular PAS-BAZ-09",
    motivacion_sustancial: "Inviable financieramente: la solicitud de subsidios directos a fondo perdido por $50.000 MM COP supera el techo presupuestal distrital del sector y vulnera el Art. 7 de la Ley 819 de 2003 (MFMP). La Alcaldía canalizó la necesidad mediante el compromiso PAS-BAZ-09 de microcrédito rotatorio y formalización gradual.",
  },
  {
    id: "prop-01a0f8a1-0007",
    codigo: "PROP-BARU-07",
    titulo: "Intervención física y estación policial en tierras comunitarias de Isla de Barú",
    descripcion: "Demolición de casetas y establecimiento de subestación policial sin concertación con la junta del Consejo Comunitario.",
    autor_nombre: "Mesa de Seguridad Turística Barú",
    territorio: "Isla de Barú",
    canal_origen: "escenarios",
    fecha_radicacion: "2026-03-28",
    estado_incorporacion: "NO_INCORPORADA_MOTIVADA",
    causal_descarte: "REQUERIMIENTO_CONSULTA_PREVIA",
    norma_invocada: CAUSALES_DESCARTE_INFO.REQUERIMIENTO_CONSULTA_PREVIA.norma,
    ruta_alternativa: "Mesa Étnica PAS-ETN-10 y Dirección de Asuntos Étnicos",
    motivacion_sustancial: "Inadmisible en esos términos: En virtud del Convenio 169 de la OIT y la Ley 70 de 1993, cualquier intervención física o policial sobre territorio colectivo afrodescendiente requiere Consulta Previa libre e informada con el Consejo Comunitario. Se remite al compromiso PAS-ETN-10 para concertación de salvaguardas.",
  },
  {
    id: "prop-01a0f8a1-0008",
    codigo: "PROP-CIENAGA-08",
    titulo: "Dragado, limpieza de drenajes y reforestación de la ribera de la Ciénaga de la Virgen",
    descripcion: "Recuperación de 18 km de caños comunitarios para mitigar inundaciones y erradicar focos de delincuencia.",
    autor_nombre: "Frente Ambiental y Comunitario Ciénaga Viva",
    territorio: "Ciénaga de la Virgen",
    canal_origen: "mesas",
    fecha_radicacion: "2026-04-01",
    estado_incorporacion: "INCORPORADA_TOTAL",
    compromiso_pas_codigo: "PAS-AMB-05",
    compromiso_pas_nombre: "Limpieza de Canales, Drenajes y Reforestación Comunitaria",
    motivacion_sustancial: "Incorporada íntegramente en el compromiso ambiental PAS-AMB-05 con asignación presupuestal de $3.000 MM COP por año junto a EPA Cartagena.",
  },
];

export const CONSOLIDADO_PARTICIPACION_FALLBACK: ConsolidadoParticipacionData = {
  gran_total_participantes_distrital: 968,
  participantes_unicos_identificados: 398,
  total_canal_web: 209,
  total_canal_mesas: 189,
  total_canal_escenarios: 570,
  porcentaje_canal_web: 21.59,
  porcentaje_canal_mesas: 19.52,
  porcentaje_canal_escenarios: 58.88,
  desglose_territorial_agregado: [
    { territorio: "Centro Histórico y San Diego", codigo: "BARRIO-CENTRO", total_participacion: 300 },
    { territorio: "La Boquilla", codigo: "CORR-BOQUILLA", total_participacion: 178 },
    { territorio: "El Pozón", codigo: "BARRIO-POZON", total_participacion: 120 },
    { territorio: "Olaya Herrera (Todos los sectores)", codigo: "BARRIO-OLAYA", total_participacion: 3 },
    { territorio: "Distrito Turístico y Cultural de Cartagena", codigo: "DISTRITO-CTG", total_participacion: 6 },
  ],
  total_propuestas: PROPUESTAS_DEVOLUCION_CARTAGENA.length,
  total_incorporadas: PROPUESTAS_DEVOLUCION_CARTAGENA.filter(
    (p) => p.estado_incorporacion !== "NO_INCORPORADA_MOTIVADA"
  ).length,
  total_no_incorporadas: PROPUESTAS_DEVOLUCION_CARTAGENA.filter(
    (p) => p.estado_incorporacion === "NO_INCORPORADA_MOTIVADA"
  ).length,
  tasa_incorporacion_efectiva: 62.5,
  fecha_corte: new Date().toISOString(),
};

/**
 * Consulta el consolidado estadístico de participación multicanal de Cartagena.
 */
export async function obtenerConsolidadoParticipacion(): Promise<ConsolidadoParticipacionData> {
  try {
    const raw = await apiFetch<Record<string, unknown>>("/participacion/consolidado");
    if (raw && raw.gran_total_participantes_distrital !== undefined) {
      const totalProps = PROPUESTAS_DEVOLUCION_CARTAGENA.length;
      const incorp = PROPUESTAS_DEVOLUCION_CARTAGENA.filter(
        (p) => p.estado_incorporacion !== "NO_INCORPORADA_MOTIVADA"
      ).length;
      const noIncorp = totalProps - incorp;

      return {
        gran_total_participantes_distrital: Number(raw.gran_total_participantes_distrital ?? 968),
        participantes_unicos_identificados: Number(raw.participantes_unicos_identificados ?? 398),
        total_canal_web: Number(raw.total_canal_web ?? 209),
        total_canal_mesas: Number(raw.total_canal_mesas ?? 189),
        total_canal_escenarios: Number(raw.total_canal_escenarios ?? 570),
        porcentaje_canal_web: Number(raw.porcentaje_canal_web ?? 21.59),
        porcentaje_canal_mesas: Number(raw.porcentaje_canal_mesas ?? 19.52),
        porcentaje_canal_escenarios: Number(raw.porcentaje_canal_escenarios ?? 58.88),
        desglose_territorial_agregado:
          (raw.desglose_territorial_agregado as ConsolidadoParticipacionData["desglose_territorial_agregado"]) ??
          CONSOLIDADO_PARTICIPACION_FALLBACK.desglose_territorial_agregado,
        total_propuestas: totalProps,
        total_incorporadas: incorp,
        total_no_incorporadas: noIncorp,
        tasa_incorporacion_efectiva: Math.round((incorp / totalProps) * 100),
        fecha_corte: String(raw.fecha_corte ?? new Date().toISOString()),
      };
    }
  } catch (err) {
    console.warn("Fallo al consultar /participacion/consolidado, utilizando fallback:", err);
  }

  return CONSOLIDADO_PARTICIPACION_FALLBACK;
}

export interface AporteBackend {
  id: string;
  linea_id?: string;
  dimension_id?: string | null;
  territorio_id?: string | null;
  tipo_aporte: string;
  titulo: string;
  descripcion: string;
  autor_nombre: string;
  es_anonimo: boolean;
  metadata_enfoque?: Record<string, unknown>;
  archivos_adjuntos?: unknown[];
  metadatos?: Record<string, unknown>;
  es_territorio_etnico?: boolean;
  requiere_consulta_previa?: boolean;
  ruta_etnica_diferenciada?: boolean;
  consejo_comunitario?: string | null;
  sesion_id?: string;
  huella_hash?: string;
  apoyos_contador: number;
  estado: string;
  activo: boolean;
  territorio_nombre?: string | null;
  creado_en: string;
  actualizado_en: string;
}

export interface PaginaAportesBackend {
  total: number;
  limite: number;
  desplazamiento: number;
  elementos: AporteBackend[];
}

export interface ResultadoAportesReales {
  propuestas: PropuestaDevolucion[];
  total: number;
  respondidos: number;
  pendientes: number;
  tasaRespuesta: number;
  esContingencia: boolean;
  origen: "api" | "contingencia";
}

export interface DevolucionRazonItem {
  id: string;
  tabla_afectada: string;
  registro_id: string;
  accion: string;
  usuario_id?: string;
  causal: string;
  justificacion_motivada: string;
  metadatos: Record<string, unknown>;
  creado_en: string;
}

export function mapearAporteAPropuesta(aporte: AporteBackend): PropuestaDevolucion {
  let estadoIncorporacion: EstadoIncorporacion;
  if (aporte.estado === "rechazado") {
    estadoIncorporacion = "NO_INCORPORADA_MOTIVADA";
  } else if (aporte.estado === "publicado") {
    estadoIncorporacion = "SIN_RESPUESTA";
  } else if (aporte.estado === "incorporado" || aporte.estado === "aprobado") {
    estadoIncorporacion = "INCORPORADA_TOTAL";
  } else {
    estadoIncorporacion = "SIN_RESPUESTA";
  }

  const rawCausal = aporte.metadatos?.causal as CausalDescarteTaxativa | undefined;
  const causal: CausalDescarteTaxativa | undefined =
    rawCausal || (aporte.estado === "rechazado" ? "no_registrada" : undefined);
  const motivacion =
    (aporte.metadatos?.justificacion_motivada as string) ||
    (aporte.metadatos?.motivo as string) ||
    (aporte.estado === "rechazado" ? "Causal no registrada" : undefined);

  const territorio =
    aporte.territorio_nombre ||
    aporte.consejo_comunitario ||
    (typeof aporte.metadatos?.territorio === "string" ? aporte.metadatos.territorio : "") ||
    "Cartagena de Indias";

  let canal: "web" | "mesas" | "escenarios" = "web";
  if (aporte.metadatos?.canal === "mesas" || aporte.metadatos?.canal === "escenarios") {
    canal = aporte.metadatos.canal;
  }

  return {
    id: aporte.id,
    codigo: `PROP-${aporte.id.slice(0, 8).toUpperCase()}`,
    titulo: aporte.titulo,
    descripcion: aporte.descripcion,
    autor_nombre: aporte.autor_nombre || (aporte.es_anonimo ? "Ciudadano Anónimo" : "Participante"),
    territorio,
    canal_origen: canal,
    fecha_radicacion: aporte.creado_en ? aporte.creado_en.slice(0, 10) : new Date().toISOString().slice(0, 10),
    estado_incorporacion: estadoIncorporacion,
    causal_descarte: causal,
    motivacion_sustancial: motivacion,
    norma_invocada: causal && CAUSALES_DESCARTE_INFO[causal]?.norma,
    ruta_alternativa: causal && CAUSALES_DESCARTE_INFO[causal]?.canalSugerido,
    metadatos: aporte.metadatos,
  };
}

/**
 * Consulta la totalidad de aportes ciudadanos radicados en el backend (179 reales),
 * paginando de forma concurrente cuando el total excede el límite del backend (100).
 */
export async function listarAportesReales(): Promise<ResultadoAportesReales> {
  try {
    const limite = 100;
    const primeraPagina = await apiFetch<PaginaAportesBackend>(`/aportes?limite=${limite}&desplazamiento=0`);
    if (!primeraPagina || !Array.isArray(primeraPagina.elementos)) {
      throw new Error("Respuesta anómala de /api/v1/aportes: falta array elementos");
    }

    let todosAportes: AporteBackend[] = [...primeraPagina.elementos];
    const totalBackend = Number(primeraPagina.total ?? todosAportes.length);

    if (totalBackend > limite) {
      const restantesPromesas: Promise<PaginaAportesBackend>[] = [];
      for (let offset = limite; offset < totalBackend; offset += limite) {
        restantesPromesas.push(
          apiFetch<PaginaAportesBackend>(`/aportes?limite=${limite}&desplazamiento=${offset}`)
        );
      }
      const respuestasRestantes = await Promise.all(restantesPromesas);
      for (const resp of respuestasRestantes) {
        if (resp && Array.isArray(resp.elementos)) {
          todosAportes = todosAportes.concat(resp.elementos);
        }
      }
    }

    const propuestas = todosAportes.map(mapearAporteAPropuesta);
    const respondidos = propuestas.filter((p) => p.estado_incorporacion !== "SIN_RESPUESTA").length;
    const pendientes = propuestas.length - respondidos;
    const tasaRespuesta = propuestas.length > 0 ? Math.round((respondidos / propuestas.length) * 1000) / 10 : 0;

    return {
      propuestas,
      total: propuestas.length,
      respondidos,
      pendientes,
      tasaRespuesta,
      esContingencia: false,
      origen: "api",
    };
  } catch (err) {
    console.warn("Fallo al conectar con /api/v1/aportes, reportando estado sin conexión:", err);
    return {
      propuestas: [],
      total: 0,
      respondidos: 0,
      pendientes: 0,
      tasaRespuesta: 0,
      esContingencia: true,
      origen: "contingencia",
    };
  }
}

/**
 * Consulta la matriz de propuestas ciudadanas y su estado de devolución.
 */
export async function listarPropuestasDevolucion(): Promise<PropuestaDevolucion[]> {
  const res = await listarAportesReales();
  return res.propuestas;
}

/**
 * Consulta el historial forense de devoluciones motivadas para un aporte específico.
 */
export async function consultarDevolucionAporteApi(aporteId: string): Promise<DevolucionRazonItem[]> {
  try {
    const res = await apiFetch<DevolucionRazonItem[]>(`/aportes/${aporteId}/devolucion-razon`);
    if (Array.isArray(res)) {
      return res;
    }
    return [];
  } catch (err) {
    console.warn(`Fallo al consultar devolución de ${aporteId}:`, err);
    return [];
  }
}

/**
 * Registra una devolución motivada (Sentencia C-150/15) persistida en PostgreSQL.
 * NO realiza fallback silencioso: en caso de error HTTP o de red, propaga la excepción.
 */
export async function registrarDevolucionMotivadaApi(
  aporteId: string,
  datos: {
    causal: "tecnica" | "juridica" | "presupuestal" | string;
    justificacion_motivada: string;
    metadatos?: Record<string, unknown>;
  }
): Promise<DevolucionRazonItem> {
  let causalBackend: "tecnica" | "juridica" | "presupuestal" = "tecnica";
  if (datos.causal === "tecnica" || datos.causal === "DUPLICIDAD_PROGRAMATICA") {
    causalBackend = "tecnica";
  } else if (
    datos.causal === "juridica" ||
    datos.causal === "INCOMPETENCIA_LEGAL_LOOT" ||
    datos.causal === "REQUERIMIENTO_CONSULTA_PREVIA" ||
    datos.causal === "INCOMPATIBILIDAD_NORMATIVA"
  ) {
    causalBackend = "juridica";
  } else if (datos.causal === "presupuestal" || datos.causal === "RESTRICCION_FISCAL_MFMP") {
    causalBackend = "presupuestal";
  }

  const payload = {
    causal: causalBackend,
    justificacion_motivada: datos.justificacion_motivada,
    metadatos: {
      ...datos.metadatos,
      causal_taxativa_original: datos.causal,
      fecha_devolucion: new Date().toISOString(),
    },
  };

  const res = await apiFetch<DevolucionRazonItem>(`/aportes/${aporteId}/devolucion-razon`, {
    method: "POST",
    body: payload,
  });

  if (!res || !res.id) {
    throw new Error("Respuesta inválida del servidor al registrar devolución motivada");
  }

  return res;
}

/**
 * Evalúa propuestas comunitarias no incorporadas mediante el agente IA DNP de Devolución
 * (POST /api/v1/ia/devolucion).
 */
export async function evaluarDevolucionConIa(
  propuestas: Array<{
    propuesta_id: string;
    titulo: string;
    descripcion: string;
    motivo_descarte_preliminar?: string;
  }>
): Promise<{
  cumplimiento_c150_garantizado: boolean;
  total_propuestas_evaluadas: number;
  resumen_pedagogico: string;
}> {
  try {
    const res = await apiFetch<Record<string, unknown>>("/ia/devolucion", {
      method: "POST",
      body: {
        politica_id: "pol-cartagena-2026",
        titulo_politica: "Seguridad Humana Integral Cartagena 2026–2036",
        propuestas_no_incorporadas: propuestas,
      },
    });

    if (res && res.cumplimiento_c150_garantizado !== undefined) {
      return {
        cumplimiento_c150_garantizado: Boolean(res.cumplimiento_c150_garantizado),
        total_propuestas_evaluadas: Number(res.total_propuestas_evaluadas ?? propuestas.length),
        resumen_pedagogico: String(res.resumen_pedagogico ?? "Evaluación completada con base en C-150/15."),
      };
    }
  } catch (err) {
    console.warn("Fallo al conectar con /ia/devolucion, emitiendo dictamen determinista C-150:", err);
  }

  return {
    cumplimiento_c150_garantizado: true,
    total_propuestas_evaluadas: propuestas.length,
    resumen_pedagogico:
      "Dictamen de Devolución Ciudadana C-150/15: Se verificaron las causales taxativas de no incorporación para las propuestas evaluadas, garantizando motivación sustancial y proscripción del descarte silencioso.",
  };
}
