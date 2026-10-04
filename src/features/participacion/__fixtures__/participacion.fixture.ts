import type {
  TableroConsolidado,
  DesgloseWeb,
  DesgloseMesas,
  EscenarioEspecial,
} from "../models/participacion";

export const MOCK_CONSOLIDADO: TableroConsolidado = {
  gran_total_participantes_distrital: 15420,
  participantes_unicos_identificados: 13300,
  total_canal_web: 8200,
  total_canal_mesas: 5100,
  total_canal_escenarios: 2120,
  porcentaje_canal_web: 53.18,
  porcentaje_canal_mesas: 33.07,
  porcentaje_canal_escenarios: 13.75,
  desglose_territorial_agregado: [
    { territorio: "Centro Histórico y San Diego", codigo: "BARRIO-CENTRO", total_participacion: 3500 },
    { territorio: "La Boquilla", codigo: "CORR-BOQUILLA", total_participacion: 2800 },
    { territorio: "El Pozón", codigo: "BARRIO-POZON", total_participacion: 2200 },
    { territorio: "Olaya Herrera (Todos los sectores)", codigo: "BARRIO-OLAYA", total_participacion: 1900 },
  ],
  fecha_corte: "2026-10-04T08:00:00.000Z",

  // Retrocompatibilidad
  totalCartageneros: 15420,
  participacionWeb: 8200,
  participacionMesas: 5100,
  participacionEscenarios: 2120,
  desglose: {
    hombres: 7100,
    mujeres: 8200,
    otros: 120,
    jovenes: 4500,
    adultos: 8000,
    adultosMayores: 2920,
    enfoqueDiferencial: {
      "Ley 1448 (Víctimas)": 1500,
      "Ley 1618 (Discapacidad)": 450,
      "Comunidades Negras": 3200,
      "Indígenas": 120,
    },
  },
  ultimaActualizacion: "2026-10-04T08:00:00.000Z",
};

export const MOCK_WEB: DesgloseWeb = {
  total_aportes: 179,
  total_apoyos: 130,
  total_respuestas_formularios: 0,
  participantes_unicos_web: 209,
  por_linea_estrategica: [
    {
      linea_id: "01a0f61b-6252-73d5-b035-7671ed9cf089",
      codigo: "LE-APORTE-8ff57e",
      titulo: "Línea de Participación y Convivencia",
      dimension_codigo: "comunitaria",
      dimension_nombre: "Seguridad Comunitaria",
      total_aportes: 179,
      total_apoyos: 104,
    },
  ],
  por_dimension: [
    {
      dimension_id: "01a0f5dd-532d-7da9-9394-0f99be53424e",
      codigo: "economica",
      nombre: "Seguridad Económica",
      total_aportes: 6,
    },
    {
      dimension_id: "01a0f5dd-532e-7a59-8f56-f5dbba0cae99",
      codigo: "comunitaria",
      nombre: "Seguridad Comunitaria",
      total_aportes: 3,
    },
  ],
  por_territorio: [
    {
      territorio_id: "01a0f5dd-5392-79e4-b09a-1d1f26e7712f",
      codigo: "CORR-BOQUILLA",
      nombre: "La Boquilla",
      total_aportes: 28,
    },
    {
      territorio_id: "01a0f5dd-538e-7900-afb0-68db850f2153",
      codigo: "DISTRITO-CTG",
      nombre: "Distrito Turístico y Cultural de Cartagena de Indias",
      total_aportes: 6,
    },
  ],

  // Retrocompatibilidad
  totalAportes: 179,
  porLineaEstrategica: {
    "Línea de Participación y Convivencia": 179,
  },
  porDimension: {
    "Seguridad Económica": 6,
    "Seguridad Comunitaria": 3,
  },
};

export const MOCK_MESAS: DesgloseMesas = {
  total_mesas_principales: 36,
  total_submesas: 2,
  total_participantes: 189,
  participantes_unicos_mesas: 189,
  total_actas_cerradas: 0,
  jerarquia_mesas: [
    {
      id: "01a0f5fe-86df-717b-a4d0-5b6605bdf993",
      codigo: "MT-L01-01",
      nombre: "Mesa Territorial Localidad Histórica y del Caribe Norte",
      path: "csh.mt.loc1",
      tipo_mesa: "TERRITORIAL",
      territorio: "Localidad 1: Histórica y del Caribe Norte",
      territorio_nombre: "Localidad 1: Histórica y del Caribe Norte",
      asistentes_conteo: 0,
      acta_firmada: false,
      submesas: [],
    },
  ],

  // Retrocompatibilidad
  totalAsistentes: 189,
  porMesa: {
    "Mesa Territorial Localidad Histórica y del Caribe Norte": 0,
  },
};

export const MOCK_ESCENARIOS: EscenarioEspecial[] = [
  {
    id: "01a0f836-6fa8-7719-9a6f-706ec34f570c",
    codigo_unico: "ESC-003",
    nombre: "Foro de Reactivación, Seguridad Turística y Competitividad",
    tipo_escenario: "FORO_GREMIAL",
    territorio_id: "01a0f5dd-5395-72f4-88ab-c3d1f39baa6c",
    territorio_nombre: "Centro Histórico y San Diego",
    fecha: "2026-09-28",
    lugar: "Centro de Convenciones Julio César Turbay Ayala - Salón Barahona",
    entidad_convocante: "Corpoturismo / Cámara de Comercio de Cartagena / ANDI",
    total_asistentes: 300,
    desglose_poblacional: { gremios: 150, academia: 50, operadores_turisticos: 100 },
    sintesis_acuerdos: "Compromisos de frente común empresarial para la seguridad en Centro Histórico, Getsemaní y corredores portuarios.",
    url_evidencia: null,
    estado: "REALIZADO",
    creado_en: "2026-10-01T16:05:12.231823Z",
    actualizado_en: "2026-10-01T16:05:12.231824Z",

    // Retrocompatibilidad
    titulo: "Foro de Reactivación, Seguridad Turística y Competitividad",
    tipo: "foro_sectorial",
    territorioId: "01a0f5dd-5395-72f4-88ab-c3d1f39baa6c",
    entidadConvocante: "Corpoturismo / Cámara de Comercio de Cartagena / ANDI",
    asistentes: 300,
    desglose: {
      hombres: 150,
      mujeres: 150,
      otros: 0,
      jovenes: 50,
      adultos: 200,
      adultosMayores: 50,
      enfoqueDiferencial: { Gremios: 150, Operadores: 100 },
    },
  },
];
