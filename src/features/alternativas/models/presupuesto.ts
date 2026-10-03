/**
 * POLIS — Modelos de Datos para Costeo Presupuestal y Asignación de Fuentes
 * Fase de Formulación Estratégica (Hito F-3)
 * Conforme con MGA/DNP, Ley 1454/11 (LOOT), Ley 819/03 (MFMP),
 * Ley 1483/11 (Vigencias Futuras Excepcionales), Ley 418/97 & 2272/22 (FONSET),
 * Ley 715/01 (SGP) y Ley 2056/20 (SGR).
 */

export type CodigoFuenteFinanciacion =
  | "FONSET"
  | "SGP-PROPOSITO-GENERAL"
  | "SGR-ASIGNACIONES-DIRECTAS"
  | "PRESUPUESTO-PARTICIPATIVO"
  | "ICLD"
  | string;

export type TipoFuenteFinanciacion =
  | "TRIBUTARIA_DESTINACION_ESPECIFICA"
  | "TRANSFERENCIA_NACION"
  | "REGALIAS"
  | "RECURSOS_PROPIOS_INVERSION"
  | "RECURSOS_PROPIOS"
  | string;

export type TipoVigenciaFutura = "Ordinaria" | "Excepcional";

export interface FuenteFinanciacion {
  id: string;
  codigo: CodigoFuenteFinanciacion;
  nombre: string;
  tipo_fuente: TipoFuenteFinanciacion;
  base_legal: string;
  descripcion?: string;
  activa: boolean;
  metadatos?: Record<string, unknown>;
  creado_en?: string;
  actualizado_en?: string;
}

export interface AsignacionPresupuestal {
  id: string;
  fuente_financiacion_id: string;
  fuente_nombre?: string;
  fuente_codigo?: string;
  linea_estrategica_id?: string | null;
  nodo_instrumento_id?: string | null;
  monto_estimado: number | string;
  anio_vigencia: number;
  es_vigencia_futura: boolean;
  tipo_vigencia_futura?: TipoVigenciaFutura | null;
  codigo_bpin?: string | null;
  justificacion: string;
  metadatos?: {
    alternativa_id?: string;
    alternativa_codigo?: string;
    alternativa_nombre?: string;
    autor_registro?: string;
    fecha_viabilidad?: string;
    [key: string]: unknown;
  };
  creado_en?: string;
  actualizado_en?: string;
}

export interface AsignacionPresupuestalCrear {
  fuente_financiacion_id: string;
  linea_estrategica_id?: string | null;
  nodo_instrumento_id?: string | null;
  monto_estimado: number;
  anio_vigencia: number;
  es_vigencia_futura: boolean;
  tipo_vigencia_futura?: TipoVigenciaFutura | null;
  codigo_bpin?: string | null;
  justificacion: string;
  metadatos?: Record<string, unknown>;
}

export interface ResumenCosteo {
  total_asignado: number | string;
  por_fuente: Array<{
    fuente: string;
    total: number;
  }>;
  por_vigencia: Array<{
    vigencia: number;
    total: number;
  }>;
}

export interface KpisPresupuesto {
  totalAsignado: number;
  totalFonset: number;
  totalSgpSgr: number;
  totalVigenciasFuturas: number;
  conteoAsignaciones: number;
}

/** Catálogo Canónico de Fuentes Oficiales sembradas en Cartagena (bd_csh) */
export const FUENTES_FINANCIACION_FALLBACK: FuenteFinanciacion[] = [
  {
    id: "01a0f7ce-31fe-791b-8076-412a21d6544f",
    codigo: "FONSET",
    nombre: "Fondo Territorial de Seguridad y Convivencia Ciudadana",
    tipo_fuente: "TRIBUTARIA_DESTINACION_ESPECIFICA",
    base_legal: "Ley 418 de 1997, Ley 2272 de 2022",
    descripcion:
      "Recursos recaudados por contribución del 5% en contratos de obra pública para inversión en seguridad y orden público.",
    activa: true,
    metadatos: { prioridad: "alta", sector: "seguridad_convivencia" },
  },
  {
    id: "01a0f7ce-3200-7f51-9005-b10e3532f9d7",
    codigo: "SGP-PROPOSITO-GENERAL",
    nombre: "Sistema General de Participaciones - Propósito General",
    tipo_fuente: "TRANSFERENCIA_NACION",
    base_legal: "Ley 715 de 2001",
    descripcion:
      "Transferencias directas de la nación de libre destinación parcial para municipios y distritos especiales.",
    activa: true,
    metadatos: { prioridad: "media", sector: "social_comunitario" },
  },
  {
    id: "01a0f7ce-3200-76be-b76f-27fade529af2",
    codigo: "SGR-ASIGNACIONES-DIRECTAS",
    nombre: "Sistema General de Regalías - Asignaciones Directas",
    tipo_fuente: "REGALIAS",
    base_legal: "Ley 2056 de 2020",
    descripcion:
      "Recursos derivados de explotación y transporte de hidrocarburos/minerales para infraestructura estratégica.",
    activa: true,
    metadatos: { prioridad: "alta", sector: "infraestructura_ambiente" },
  },
  {
    id: "01a0f7ce-3200-7909-a091-3ef3554fa4ad",
    codigo: "PRESUPUESTO-PARTICIPATIVO",
    nombre: "Presupuesto Participativo (Acuerdos Ciudadanos)",
    tipo_fuente: "RECURSOS_PROPIOS_INVERSION",
    base_legal: "Ley Estatutaria 1757 de 2015",
    descripcion:
      "Porción del presupuesto distrital concertada obligatoriamente en asambleas ciudadanas y mesas de deliberación.",
    activa: true,
    metadatos: { prioridad: "media", sector: "participacion_ciudadana" },
  },
  {
    id: "01a0f7ce-3200-7d84-b38a-0b6d926bd985",
    codigo: "ICLD",
    nombre: "Ingresos Corrientes de Libre Destinación",
    tipo_fuente: "RECURSOS_PROPIOS",
    base_legal: "Ley 617 de 2000",
    descripcion:
      "Recursos propios tributarios distritales (predial, ICA) sin destinación específica predeterminada.",
    activa: true,
    metadatos: { prioridad: "media", sector: "desarrollo_economico" },
  },
];

/** Asignaciones Presupuestales Canónicas vinculadas a Alternativas MGA de Cartagena */
export const ASIGNACIONES_FALLBACK: AsignacionPresupuestal[] = [
  {
    id: "asig-001",
    fuente_financiacion_id: "01a0f7ce-31fe-791b-8076-412a21d6544f",
    fuente_nombre: "Fondo Territorial de Seguridad y Convivencia Ciudadana",
    fuente_codigo: "FONSET",
    monto_estimado: 2500000000,
    anio_vigencia: 2026,
    es_vigencia_futura: false,
    tipo_vigencia_futura: null,
    codigo_bpin: "BPIN-2026-CTG-00142",
    justificacion:
      "Financiamiento de cuadrantes turísticos y protección contra ESCNNA en el Centro Histórico y Playa Blanca.",
    metadatos: {
      alternativa_id: "alt-escnna-01",
      alternativa_codigo: "ALT-ESCNNA-01",
      alternativa_nombre:
        "Ruta Distrital Segura y Protección Integral contra la ESCNNA",
    },
    creado_en: "2026-10-01T14:14:14Z",
  },
  {
    id: "asig-002",
    fuente_financiacion_id: "01a0f7ce-31fe-791b-8076-412a21d6544f",
    fuente_nombre: "Fondo Territorial de Seguridad y Convivencia Ciudadana",
    fuente_codigo: "FONSET",
    monto_estimado: 3200000000,
    anio_vigencia: 2026,
    es_vigencia_futura: false,
    tipo_vigencia_futura: null,
    codigo_bpin: "BPIN-2026-CTG-00289",
    justificacion:
      "Fase I Desarme social e intervención psicosocial en Olaya Herrera, Pozón y Nelson Mandela.",
    metadatos: {
      alternativa_id: "alt-conv-02",
      alternativa_codigo: "ALT-CONV-02",
      alternativa_nombre:
        'Programa Integral de Desarme Social "Jóvenes Constructores de Paz"',
    },
    creado_en: "2026-10-01T14:15:00Z",
  },
  {
    id: "asig-003",
    fuente_financiacion_id: "01a0f7ce-3200-76be-b76f-27fade529af2",
    fuente_nombre: "Sistema General de Regalías - Asignaciones Directas",
    fuente_codigo: "SGR-ASIGNACIONES-DIRECTAS",
    monto_estimado: 6000000000,
    anio_vigencia: 2027,
    es_vigencia_futura: true,
    tipo_vigencia_futura: "Excepcional",
    codigo_bpin: "BPIN-2026-CTG-00411",
    justificacion:
      "Obras hidráulicas, canalización de drenajes y borde de protección perimetral en la Ciénaga de la Virgen (Ley 1483/11).",
    metadatos: {
      alternativa_id: "alt-amb-03",
      alternativa_codigo: "ALT-AMB-03",
      alternativa_nombre:
        "Plan de Restauración Ecoterritorial en la Ciénaga de la Virgen",
    },
    creado_en: "2026-10-01T14:16:00Z",
  },
  {
    id: "asig-004",
    fuente_financiacion_id: "01a0f7ce-3200-7f51-9005-b10e3532f9d7",
    fuente_nombre: "Sistema General de Participaciones - Propósito General",
    fuente_codigo: "SGP-PROPOSITO-GENERAL",
    monto_estimado: 1800000000,
    anio_vigencia: 2026,
    es_vigencia_futura: false,
    tipo_vigencia_futura: null,
    codigo_bpin: "BPIN-2026-CTG-00508",
    justificacion:
      "Adecuación y dotación de dos Manzanas del Cuidado en El Pozón y San José de los Campanos.",
    metadatos: {
      alternativa_id: "alt-cuid-04",
      alternativa_codigo: "ALT-CUID-04",
      alternativa_nombre:
        "Red Distrital de Manzanas del Cuidado y Centros de Día Comunitarios",
    },
    creado_en: "2026-10-01T14:17:00Z",
  },
  {
    id: "asig-005",
    fuente_financiacion_id: "01a0f7ce-3200-76be-b76f-27fade529af2",
    fuente_nombre: "Sistema General de Regalías - Asignaciones Directas",
    fuente_codigo: "SGR-ASIGNACIONES-DIRECTAS",
    monto_estimado: 2900000000,
    anio_vigencia: 2027,
    es_vigencia_futura: true,
    tipo_vigencia_futura: "Excepcional",
    codigo_bpin: "BPIN-2026-CTG-00623",
    justificacion:
      "Infraestructura tecnológica y náutica en territorios insulares de Tierrabomba y Barú (Ley 70/93 y OIT 169).",
    metadatos: {
      alternativa_id: "alt-ins-05",
      alternativa_codigo: "ALT-INS-05",
      alternativa_nombre:
        "Centro de Innovación Tecnológica y Bilingüismo para Jóvenes Insulares",
    },
    creado_en: "2026-10-01T14:18:00Z",
  },
  {
    id: "asig-006",
    fuente_financiacion_id: "01a0f7ce-31fe-791b-8076-412a21d6544f",
    fuente_nombre: "Fondo Territorial de Seguridad y Convivencia Ciudadana",
    fuente_codigo: "FONSET",
    monto_estimado: 5000000000,
    anio_vigencia: 2026,
    es_vigencia_futura: false,
    tipo_vigencia_futura: null,
    codigo_bpin: "BPIN-2026-CTG-00780",
    justificacion:
      "Modernización tecnológica de 120 cámaras con lectura LPR y botón de pánico en puntos críticos distritales.",
    metadatos: {
      alternativa_id: "alt-seg-06",
      alternativa_codigo: "ALT-SEG-06",
      alternativa_nombre:
        "Modernización del Sistema de Videovigilancia LPR y Alarmas Inteligentes",
    },
    creado_en: "2026-10-01T14:19:00Z",
  },
];
