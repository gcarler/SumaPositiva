/**
 * POLIS — Catálogo Georreferenciado Oficial de las Mesas de Trabajo de Cartagena
 * Coordenadas representativas para cada Localidad, Corregimiento, Isla y Sector.
 * Semáforo:
 *   - Verde (realizada/finalizada)
 *   - Azul (en_curso/en_deliberación)
 *   - Amarillo/Ember (programada)
 */

import {AGENDA_MESAS, type MesaAgenda} from "@/features/mesas/data/agenda.data";
import type {MesaGeovisor, EstadoMesaGeovisor} from "../services/mesas-geovisor-api";

interface CoordenadaReferencia {
  lat: number;
  lng: number;
  territorioCodigo: string;
  territorioNombre: string;
  estadoDefault: EstadoMesaGeovisor;
  realizada: boolean;
  totalAsistentes: number;
  aforo: number;
}

export const COORDENADAS_AGENDA_MESAS: Record<string, CoordenadaReferencia> = {
  // Mesas Territoriales
  "mt-001": {
    lat: 10.4236,
    lng: -75.5506,
    territorioCodigo: "loc-1",
    territorioNombre: "Localidad 1 — Histórica y del Caribe Norte",
    estadoDefault: "PROGRAMADA",
    realizada: false,
    totalAsistentes: 0,
    aforo: 350,
  },
  "mt-002": {
    lat: 10.4045,
    lng: -75.4950,
    territorioCodigo: "loc-2",
    territorioNombre: "Localidad 2 — De la Virgen y Turística",
    estadoDefault: "PROGRAMADA",
    realizada: false,
    totalAsistentes: 0,
    aforo: 400,
  },
  "mt-003": {
    lat: 10.3620,
    lng: -75.4880,
    territorioCodigo: "loc-3",
    territorioNombre: "Localidad 3 — Industrial y de la Bahía",
    estadoDefault: "PROGRAMADA",
    realizada: false,
    totalAsistentes: 0,
    aforo: 350,
  },

  // Mesas Rurales e Insulares
  "mr-001": {
    lat: 10.4783,
    lng: -75.4672,
    territorioCodigo: "loc-2",
    territorioNombre: "Corregimiento La Boquilla",
    estadoDefault: "PROGRAMADA",
    realizada: false,
    totalAsistentes: 0,
    aforo: 60,
  },
  "mr-002": {
    lat: 10.5900,
    lng: -75.3850,
    territorioCodigo: "loc-2",
    territorioNombre: "Corregimiento Arroyo de Piedra",
    estadoDefault: "PROGRAMADA",
    realizada: false,
    totalAsistentes: 0,
    aforo: 25,
  },
  "mr-003": {
    lat: 10.5400,
    lng: -75.4350,
    territorioCodigo: "loc-2",
    territorioNombre: "Corregimiento Punta Canoa",
    estadoDefault: "PROGRAMADA",
    realizada: false,
    totalAsistentes: 0,
    aforo: 20,
  },
  "mr-004": {
    lat: 10.5200,
    lng: -75.4200,
    territorioCodigo: "loc-2",
    territorioNombre: "Corregimiento Bayunca",
    estadoDefault: "PROGRAMADA",
    realizada: false,
    totalAsistentes: 0,
    aforo: 65,
  },
  "mr-005": {
    lat: 10.2800,
    lng: -75.5050,
    territorioCodigo: "loc-3",
    territorioNombre: "Corregimiento Pasacaballos",
    estadoDefault: "PROGRAMADA",
    realizada: false,
    totalAsistentes: 0,
    aforo: 50,
  },
  "mr-006": {
    lat: 10.6300,
    lng: -75.3400,
    territorioCodigo: "loc-2",
    territorioNombre: "Corregimiento Arroyo Grande",
    estadoDefault: "PROGRAMADA",
    realizada: false,
    totalAsistentes: 0,
    aforo: 25,
  },
  "mr-007": {
    lat: 10.2550,
    lng: -75.5450,
    territorioCodigo: "loc-3",
    territorioNombre: "Corregimiento Santa Ana",
    estadoDefault: "PROGRAMADA",
    realizada: false,
    totalAsistentes: 0,
    aforo: 30,
  },
  "mr-008": {
    lat: 10.3400,
    lng: -75.5600,
    territorioCodigo: "loc-1",
    territorioNombre: "Isla de Tierrabomba",
    estadoDefault: "PROGRAMADA",
    realizada: false,
    totalAsistentes: 0,
    aforo: 30,
  },
  "mr-009": {
    lat: 10.3200,
    lng: -75.5850,
    territorioCodigo: "loc-1",
    territorioNombre: "Isla Bocachica",
    estadoDefault: "PROGRAMADA",
    realizada: false,
    totalAsistentes: 0,
    aforo: 30,
  },
  "mr-010": {
    lat: 10.1800,
    lng: -75.7450,
    territorioCodigo: "loc-1",
    territorioNombre: "Archipiélago Islas del Rosario",
    estadoDefault: "PROGRAMADA",
    realizada: false,
    totalAsistentes: 0,
    aforo: 20,
  },
  "mr-011": {
    lat: 10.1450,
    lng: -75.7900,
    territorioCodigo: "loc-1",
    territorioNombre: "Isla Fuerte",
    estadoDefault: "PROGRAMADA",
    realizada: false,
    totalAsistentes: 0,
    aforo: 25,
  },

  // Mesas Poblacionales
  "mp-001": {
    lat: 10.4225,
    lng: -75.5490,
    territorioCodigo: "loc-1",
    territorioNombre: "Distrito de Cartagena — Centro",
    estadoDefault: "PROGRAMADA",
    realizada: false,
    totalAsistentes: 0,
    aforo: 65,
  },
  "mp-002": {
    lat: 10.4180,
    lng: -75.5340,
    territorioCodigo: "loc-1",
    territorioNombre: "Distrito de Cartagena — Pie de la Popa",
    estadoDefault: "PROGRAMADA",
    realizada: false,
    totalAsistentes: 0,
    aforo: 75,
  },
  "mp-003": {
    lat: 10.4050,
    lng: -75.4955,
    territorioCodigo: "loc-2",
    territorioNombre: "Distrito de Cartagena — Estadio Morón",
    estadoDefault: "PROGRAMADA",
    realizada: false,
    totalAsistentes: 0,
    aforo: 40,
  },
  "mp-004": {
    lat: 10.4040,
    lng: -75.4945,
    territorioCodigo: "loc-2",
    territorioNombre: "Distrito de Cartagena — Estadio Morón",
    estadoDefault: "PROGRAMADA",
    realizada: false,
    totalAsistentes: 0,
    aforo: 45,
  },
  "mp-005": {
    lat: 10.4175,
    lng: -75.5335,
    territorioCodigo: "loc-1",
    territorioNombre: "Distrito de Cartagena — Pie de la Popa",
    estadoDefault: "PROGRAMADA",
    realizada: false,
    totalAsistentes: 0,
    aforo: 80,
  },
  "mp-006": {
    lat: 10.4242,
    lng: -75.5515,
    territorioCodigo: "loc-1",
    territorioNombre: "Distrito de Cartagena — San Agustín",
    estadoDefault: "PROGRAMADA",
    realizada: false,
    totalAsistentes: 0,
    aforo: 100,
  },
  "mp-007": {
    lat: 10.4100,
    lng: -75.4620,
    territorioCodigo: "loc-2",
    territorioNombre: "Distrito de Cartagena — Bicentenario",
    estadoDefault: "PROGRAMADA",
    realizada: false,
    totalAsistentes: 0,
    aforo: 60,
  },
  "mp-008": {
    lat: 10.4080,
    lng: -75.5560,
    territorioCodigo: "loc-1",
    territorioNombre: "Distrito de Cartagena — Bocagrande",
    estadoDefault: "PROGRAMADA",
    realizada: false,
    totalAsistentes: 0,
    aforo: 80,
  },
  "mp-009": {
    lat: 10.4220,
    lng: -75.5485,
    territorioCodigo: "loc-1",
    territorioNombre: "Distrito de Cartagena — Centro",
    estadoDefault: "PROGRAMADA",
    realizada: false,
    totalAsistentes: 0,
    aforo: 55,
  },

  // Mesas Sectoriales
  "ms-001": {
    lat: 10.4255,
    lng: -75.5528,
    territorioCodigo: "loc-1",
    territorioNombre: "Distrito de Cartagena — Centro Histórico",
    estadoDefault: "PROGRAMADA",
    realizada: false,
    totalAsistentes: 0,
    aforo: 30,
  },
  "ms-002": {
    lat: 10.3950,
    lng: -75.5100,
    territorioCodigo: "loc-2",
    territorioNombre: "Distrito de Cartagena — Los Ejecutivos",
    estadoDefault: "PROGRAMADA",
    realizada: false,
    totalAsistentes: 0,
    aforo: 30,
  },
  "ms-003": {
    lat: 10.4230,
    lng: -75.5510,
    territorioCodigo: "loc-1",
    territorioNombre: "Distrito de Cartagena — Alcaldía Mayor",
    estadoDefault: "PROGRAMADA",
    realizada: false,
    totalAsistentes: 0,
    aforo: 30,
  },
  "ms-004": {
    lat: 10.4150,
    lng: -75.5280,
    territorioCodigo: "loc-1",
    territorioNombre: "Distrito de Cartagena — Amberes",
    estadoDefault: "PROGRAMADA",
    realizada: false,
    totalAsistentes: 0,
    aforo: 35,
  },
  "ms-005": {
    lat: 10.4234,
    lng: -75.5502,
    territorioCodigo: "loc-1",
    territorioNombre: "Distrito de Cartagena — Plaza Aduana",
    estadoDefault: "PROGRAMADA",
    realizada: false,
    totalAsistentes: 0,
    aforo: 30,
  },
  "ms-006": {
    lat: 10.4210,
    lng: -75.5480,
    territorioCodigo: "loc-1",
    territorioNombre: "Distrito de Cartagena — Getsemaní",
    estadoDefault: "PROGRAMADA",
    realizada: false,
    totalAsistentes: 0,
    aforo: 35,
  },
  "ms-007": {
    lat: 10.4238,
    lng: -75.5504,
    territorioCodigo: "loc-1",
    territorioNombre: "Distrito de Cartagena — Plaza Aduana",
    estadoDefault: "PROGRAMADA",
    realizada: false,
    totalAsistentes: 0,
    aforo: 40,
  },
  "ms-008": {
    lat: 10.4240,
    lng: -75.5508,
    territorioCodigo: "loc-1",
    territorioNombre: "Distrito de Cartagena — Plaza Aduana",
    estadoDefault: "PROGRAMADA",
    realizada: false,
    totalAsistentes: 0,
    aforo: 40,
  },
  "ms-009": {
    lat: 10.4245,
    lng: -75.5520,
    territorioCodigo: "loc-1",
    territorioNombre: "Distrito de Cartagena — Centro",
    estadoDefault: "PROGRAMADA",
    realizada: false,
    totalAsistentes: 0,
    aforo: 40,
  },
  "ms-010": {
    lat: 10.4232,
    lng: -75.5500,
    territorioCodigo: "loc-1",
    territorioNombre: "Distrito de Cartagena — Plaza Aduana",
    estadoDefault: "PROGRAMADA",
    realizada: false,
    totalAsistentes: 0,
    aforo: 45,
  },
  "ms-011": {
    lat: 10.4120,
    lng: -75.5390,
    territorioCodigo: "loc-1",
    territorioNombre: "Distrito de Cartagena — Manga",
    estadoDefault: "PROGRAMADA",
    realizada: false,
    totalAsistentes: 0,
    aforo: 35,
  },
  "ms-012": {
    lat: 10.4235,
    lng: -75.5512,
    territorioCodigo: "loc-1",
    territorioNombre: "Distrito de Cartagena — Plaza Aduana",
    estadoDefault: "PROGRAMADA",
    realizada: false,
    totalAsistentes: 0,
    aforo: 30,
  },

  // Plenaria de Cierre
  "pc-001": {
    lat: 10.4205,
    lng: -75.5465,
    territorioCodigo: "loc-1",
    territorioNombre: "Centro de Convenciones Cartagena",
    estadoDefault: "PROGRAMADA",
    realizada: false,
    totalAsistentes: 0,
    aforo: 350,
  },
};

export const MAPA_AGENDA_A_CODIGO_OFICIAL: Record<string, string> = {
  "mt-001": "MT-L01-01",
  "mt-002": "MT-L02-01",
  "mt-003": "MT-L03-01",
  "mp-001": "MP-POB-01",
  "mp-002": "MP-POB-02",
  "mp-003": "MP-POB-03",
  "mp-004": "MP-POB-04",
  "mp-005": "MP-POB-05",
  "mp-006": "MP-POB-06",
  "mp-007": "MP-POB-07",
  "mp-008": "MP-ETN-08",
  "mp-009": "MP-POB-09",
  "ms-001": "MS-SEC-01",
  "ms-002": "MS-SEC-02",
  "ms-003": "MS-SEC-03",
  "ms-004": "MS-SEC-04",
  "ms-005": "MS-SEC-05",
  "ms-006": "MS-SEC-06",
  "ms-007": "MS-SEC-07",
  "ms-008": "MS-SEC-08",
  "ms-009": "MS-SEC-09",
  "ms-010": "MS-SEC-10",
  "ms-011": "MS-SEC-11",
  "ms-012": "MS-SEC-12",
  "mr-001": "MR-RUR-01",
  "mr-002": "MR-RUR-02",
  "mr-003": "MR-RUR-03",
  "mr-004": "MR-RUR-04",
  "mr-005": "MR-RUR-05",
  "mr-006": "MR-RUR-06",
  "mr-007": "MR-ISL-07",
  "mr-008": "MR-ISL-08",
  "mr-009": "MR-ISL-09",
  "mr-010": "MR-ISL-10",
  "mr-011": "MR-ISL-11",
};

export const MAPA_CODIGO_OFICIAL_A_AGENDA: Record<string, string> = {
  "MT-L01-01": "mt-001",
  "MT-L02-01": "mt-002",
  "MT-L03-01": "mt-003",
  "MP-POB-01": "mp-001",
  "MP-POB-02": "mp-002",
  "MP-POB-03": "mp-003",
  "MP-POB-04": "mp-004",
  "MP-POB-05": "mp-005",
  "MP-POB-06": "mp-006",
  "MP-POB-07": "mp-007",
  "MP-ETN-08": "mp-008",
  "MP-POB-09": "mp-009",
  "MS-SEC-01": "ms-001",
  "MS-SEC-02": "ms-002",
  "MS-SEC-03": "ms-003",
  "MS-SEC-04": "ms-004",
  "MS-SEC-05": "ms-005",
  "MS-SEC-06": "ms-006",
  "MS-SEC-07": "ms-007",
  "MS-SEC-08": "ms-008",
  "MS-SEC-09": "ms-009",
  "MS-SEC-10": "ms-010",
  "MS-SEC-11": "ms-011",
  "MS-SEC-12": "ms-012",
  "MR-RUR-01": "mr-001",
  "MR-RUR-02": "mr-002",
  "MR-RUR-03": "mr-003",
  "MR-RUR-04": "mr-004",
  "MR-RUR-05": "mr-005",
  "MR-RUR-06": "mr-006",
  "MR-ISL-07": "mr-007",
  "MR-ISL-08": "mr-008",
  "MR-ISL-09": "mr-009",
  "MR-ISL-10": "mr-010",
  "MR-ISL-11": "mr-011",
};

export const MAPA_SHORTCODE_A_AGENDA: Record<string, string> = {
  "MT101": "mt-001",
  "MT201": "mt-002",
  "MT301": "mt-003",
  "MP101": "mp-001",
  "MP102": "mp-002",
  "MP103": "mp-003",
  "MP104": "mp-004",
  "MP105": "mp-005",
  "MP106": "mp-006",
  "MP107": "mp-007",
  "MP108": "mp-008",
  "MP109": "mp-009",
  "MS101": "ms-001",
  "MS102": "ms-002",
  "MS103": "ms-003",
  "MS104": "ms-004",
  "MS105": "ms-005",
  "MS106": "ms-006",
  "MS107": "ms-007",
  "MS108": "ms-008",
  "MS109": "ms-009",
  "MS110": "ms-010",
  "MS111": "ms-011",
  "MS112": "ms-012",
  "MR101": "mr-001",
  "MR102": "mr-002",
  "MR103": "mr-003",
  "MR104": "mr-004",
  "MR105": "mr-005",
  "MR106": "mr-006",
  "MR107": "mr-007",
  "MR108": "mr-008",
  "MR109": "mr-009",
  "MR110": "mr-010",
  "MR111": "mr-011",
};

export const MAPA_UUID_A_AGENDA: Record<string, string> = {
  "01a0f5fe-86df-717b-a4d0-5b6605bdf993": "mt-001",
  "01a0f5fe-86e1-7175-8932-3799c59182c4": "mt-002",
  "01a0f5fe-86e1-7e78-a8e2-401657b07e30": "mt-003",
  "01a0f5fe-86e3-7282-a54b-f042f85fa1bc": "mp-001",
  "01a0f5fe-86e3-7cc2-8436-ebc34e6acbc4": "mp-002",
  "01a0f5fe-86e3-773b-9bbb-287eb0a475c4": "mp-003",
  "01a0f5fe-86e3-71a2-a832-83a2b8757f4a": "mp-004",
  "01a0f5fe-86e3-7cc0-9494-9b43b0de02b0": "mp-005",
  "01a0f5fe-86e3-7ece-aa45-f734eaf5d4dd": "mp-006",
  "01a0f5fe-86e3-7e68-89c5-7cc6c9cc4ce8": "mp-007",
  "01a0f5fe-86e3-7bca-a222-69ddd0da41f4": "mp-008",
  "01a0f5fe-86e2-7209-9001-000000000009": "mp-009",
  "01a0f5fe-86e4-7462-9bf4-7fba713251dd": "ms-001",
  "01a0f5fe-86e4-7a89-a279-abfbadfa1e91": "ms-002",
  "01a0f5fe-86e5-7ff9-a971-27375ae9f301": "ms-003",
  "01a0f5fe-86e5-7883-9644-8c7a2dac9923": "ms-004",
  "01a0f5fe-86e5-7e28-8bd7-4a18a3ea9c19": "ms-005",
  "01a0f5fe-86e5-7d19-a547-3edee16440b1": "ms-006",
  "01a0f5fe-86e5-752b-bf52-fa98aeb8406a": "ms-007",
  "01a0f5fe-86e5-7e6f-bf6c-9e7b9837816f": "ms-008",
  "01a0f5fe-86e5-7d46-8bfb-527585d6d433": "ms-009",
  "01a0f5fe-86e5-7322-953d-72489185aead": "ms-010",
  "01a0f5fe-86e5-767a-8851-6b6a5eb052e6": "ms-011",
  "01a0f5fe-86e5-7ff9-a971-000000000012": "ms-012",
  "01a0f5fe-86e2-7b56-b70b-aa6b3c6feb08": "mr-001",
  "01a0f5fe-86e2-7eb8-85f0-7f8edbd8d441": "mr-002",
  "01a0f5fe-86e2-7b3a-99ca-973a388ae602": "mr-003",
  "01a0f5fe-86e2-76ca-8fb4-8c2403144877": "mr-004",
  "01a0f5fe-86e2-71eb-98b5-16f61f5a3b80": "mr-005",
  "01a0f5fe-86e2-7e7d-b043-8b61c7c913e0": "mr-006",
  "01a0f5fe-86e2-7ebb-90f1-7268653ea79d": "mr-007",
  "01a0f5fe-86e2-77ec-aa3f-d52f9fbb8125": "mr-008",
  "01a0f5fe-86e2-70f0-84de-854dae52dc89": "mr-009",
  "01a0f5fe-86e2-7c68-a9f7-4ecbfa5236b5": "mr-010",
  "01a0f5fe-86e3-7288-8425-1317a98eebd4": "mr-011",
};

export function buscarCoordenadasMesa(identificador: {
  id: string;
  codigo_oficial?: string | null;
  shortcode_ciudadano?: string | null;
}): CoordenadaReferencia | undefined {
  if (COORDENADAS_AGENDA_MESAS[identificador.id]) {
    return COORDENADAS_AGENDA_MESAS[identificador.id];
  }
  const idLower = identificador.id.toLowerCase();
  if (COORDENADAS_AGENDA_MESAS[idLower]) {
    return COORDENADAS_AGENDA_MESAS[idLower];
  }

  if (identificador.codigo_oficial) {
    const codOficial = identificador.codigo_oficial.toUpperCase();
    const agendaId = MAPA_CODIGO_OFICIAL_A_AGENDA[codOficial];
    if (agendaId && COORDENADAS_AGENDA_MESAS[agendaId]) {
      return COORDENADAS_AGENDA_MESAS[agendaId];
    }
  }

  if (identificador.shortcode_ciudadano) {
    const shortcode = identificador.shortcode_ciudadano.toUpperCase();
    const agendaId = MAPA_SHORTCODE_A_AGENDA[shortcode];
    if (agendaId && COORDENADAS_AGENDA_MESAS[agendaId]) {
      return COORDENADAS_AGENDA_MESAS[agendaId];
    }
  }

  const agendaFromUuid = MAPA_UUID_A_AGENDA[idLower];
  if (agendaFromUuid && COORDENADAS_AGENDA_MESAS[agendaFromUuid]) {
    return COORDENADAS_AGENDA_MESAS[agendaFromUuid];
  }

  return undefined;
}

/**
 * Convierte la lista oficial de AGENDA_MESAS a formato MesaGeovisor
 * con coordenadas geográficas reales de Cartagena.
 */
export function obtenerMesasGeovisorOficiales(
  agendas: MesaAgenda[] = AGENDA_MESAS
): MesaGeovisor[] {
  return agendas.map((m) => {
    const geo = COORDENADAS_AGENDA_MESAS[m.id] ?? {
      lat: 10.4236,
      lng: -75.5506,
      territorioCodigo: "loc-1",
      territorioNombre: m.territorio,
      estadoDefault: "PROGRAMADA",
      realizada: false,
      totalAsistentes: 0,
      aforo: 80,
    };

    let estadoCalculado = geo.estadoDefault;
    if (m.estado === "en_curso") estadoCalculado = "EN_DELIBERACION";
    else if (m.estado === "realizada") estadoCalculado = "ACTA_CONCERTADA";
    else if (m.estado === "reprogramada") estadoCalculado = "CONVOCADA";

    const horarioStr = (m.horaInicio && m.horaInicio !== "Por definir")
      ? `${m.horaInicio} – ${m.horaFin}`
      : "Por definir";

    return {
      id: m.id,
      nombre: m.nombre,
      fecha: (m.fecha && m.fecha !== "Por definir") ? m.fecha : null,
      horario: horarioStr,
      estado: estadoCalculado,
      realizada: m.estado === "realizada" || geo.realizada,
      total_asistentes: geo.totalAsistentes,
      territorio_id: geo.territorioCodigo,
      territorio_nombre: geo.territorioNombre,
      territorio_codigo: geo.territorioCodigo,
      longitud_referencia: geo.lng,
      latitud_referencia: geo.lat,
      tipo_ubicacion: "centroide_territorial_referencia" as const,
      fotos: [],
      aforo: geo.aforo,
    };
  });
}
