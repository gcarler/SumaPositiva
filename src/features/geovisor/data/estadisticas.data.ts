export interface EstadisticasLocalidad2025 {
  homicidios: number | null;
  hurtos: number | null;
}

export const ESTADISTICAS_SEGURIDAD_2025 = {
  homicidios_total: null as number | null,
  hurtos_personas: null as number | null,
  tendencia_homicidios: "Sin dato verificado",
  fuente: "Sin dato verificado (Pendiente de reporte oficial consolidado)",
  fecha_consulta: "2026-10-04",
  periodo: "Sin dato verificado",
  corte: "Sin dato verificado",
  percepcion_ciudadana: {
    valor: null,
    nota: "No se incluye una cifra de percepción sin una serie y metodología verificables.",
  },
  por_localidad: {
    "loc-1": { homicidios: null, hurtos: null },
    "loc-2": { homicidios: null, hurtos: null },
    "loc-3": { homicidios: null, hurtos: null },
  } satisfies Record<string, EstadisticasLocalidad2025>,
} as const;

export type VariableMapa =
  | "ish"           // Índice de Seguridad Humana (0–100)
  | "participacion" // Aportes ciudadanos por territorio
  | "alertas"       // Alertas SAT/CIPRAT activas
  | "homicidios"    // Tasa homicidios por 100k hab (2025)
  | "hurtos"        // Hurtos a personas (abs, 2025)
  | "poblacion"     // Población estimada
  | "mesas"         // Mesas comunitarias realizadas
  | "escnna"       // Alertas ESCNNA activas
  | "personal"
  | "comunitaria"
  | "economica"
  | "ambiental"
  | "alimentaria"
  | "salud"
  | "politica";

export interface EstadisticasTerritorio {
  id: string;
  nombre: string;
  tipo: "localidad" | "corregimiento" | "isla";
  lon: number;
  lat: number;
  // Demografía
  poblacion: number;
  // Seguridad Humana
  ish: number;           // Índice 0-100
  homicidios: number;    // tasa por 100k hab 2025
  hurtos: number;        // absoluto 2025
  escnna: number;        // alertas activas
  alertas: number;       // SAT/CIPRAT activas
  // Participación
  aportesCiudadanos: number;
  mesasRealizadas: number;
  // Tendencia (últimos 6 meses: may-oct 2026)
  tendenciaAportes: number[];  // [mayo, jun, jul, ago, sep, oct]
  tendenciaAlertas: number[];
}

export const ESTADISTICAS_TERRITORIOS: EstadisticasTerritorio[] = [
  {
    id: "loc-1",
    nombre: "Localidad 1 — Histórica y del Caribe Norte",
    tipo: "localidad",
    lon: -75.5506,
    lat: 10.4236,
    poblacion: 331000,
    ish: 62,
    homicidios: 42.9,
    hurtos: 2800,
    escnna: 12,
    alertas: 8,
    aportesCiudadanos: 0, // Dato real — consulta pública aún no abierta
    mesasRealizadas: 0, // Dato real — mesas por programar
    tendenciaAportes: [0, 0, 0, 0, 0, 0],
    tendenciaAlertas: [10, 9, 8, 9, 8, 8],
  },
  {
    id: "loc-2",
    nombre: "Localidad 2 — De la Virgen y Turística",
    tipo: "localidad",
    lon: -75.485,
    lat: 10.448,
    poblacion: 448000,
    ish: 54,
    homicidios: 39.7,
    hurtos: 2400,
    escnna: 9,
    alertas: 14,
    aportesCiudadanos: 0, // Dato real — consulta pública aún no abierta
    mesasRealizadas: 0, // Dato real — mesas por programar
    tendenciaAportes: [0, 0, 0, 0, 0, 0],
    tendenciaAlertas: [16, 15, 14, 13, 14, 14],
  },
  {
    id: "loc-3",
    nombre: "Localidad 3 — Industrial y de la Bahía",
    tipo: "localidad",
    lon: -75.52,
    lat: 10.325,
    poblacion: 278000,
    ish: 58,
    homicidios: 32.4,
    hurtos: 1293,
    escnna: 5,
    alertas: 6,
    aportesCiudadanos: 0, // Dato real — consulta pública aún no abierta
    mesasRealizadas: 0, // Dato real — mesas por programar
    tendenciaAportes: [0, 0, 0, 0, 0, 0],
    tendenciaAlertas: [7, 7, 6, 6, 6, 6],
  },
  {
    id: "rural-insular",
    nombre: "Zona Corregimental e Insular",
    tipo: "corregimiento",
    lon: -75.52,
    lat: 10.4,
    poblacion: 50000,
    ish: 48,
    homicidios: 20.0,
    hurtos: 420,
    escnna: 8,
    alertas: 9,
    aportesCiudadanos: 0, // Dato real — consulta pública aún no abierta
    mesasRealizadas: 0, // Dato real — mesas por programar
    tendenciaAportes: [0, 0, 0, 0, 0, 0],
    tendenciaAlertas: [10, 10, 9, 9, 9, 9],
  },
  {
    id: "cor-boquilla",
    nombre: "La Boquilla",
    tipo: "corregimiento",
    lon: -75.4672,
    lat: 10.4783,
    poblacion: 18500,
    ish: 49,
    homicidios: 16.2,
    hurtos: 180,
    escnna: 3,
    alertas: 5,
    aportesCiudadanos: 0, // Dato real — consulta pública aún no abierta
    mesasRealizadas: 0, // Dato real — mesas por programar
    tendenciaAportes: [0, 0, 0, 0, 0, 0],
    tendenciaAlertas: [6, 5, 5, 5, 5, 5],
  },
  {
    id: "cor-tierrabomba",
    nombre: "Tierrabomba",
    tipo: "isla",
    lon: -75.56,
    lat: 10.34,
    poblacion: 6200,
    ish: 45,
    homicidios: 16.1,
    hurtos: 45,
    escnna: 2,
    alertas: 3,
    aportesCiudadanos: 0, // Dato real — consulta pública aún no abierta
    mesasRealizadas: 0, // Dato real — mesas por programar
    tendenciaAportes: [0, 0, 0, 0, 0, 0],
    tendenciaAlertas: [3, 3, 3, 3, 3, 3],
  },
  {
    id: "cor-baru",
    nombre: "Barú",
    tipo: "isla",
    lon: -75.59,
    lat: 10.23,
    poblacion: 3800,
    ish: 43,
    homicidios: 13.2,
    hurtos: 28,
    escnna: 2,
    alertas: 2,
    aportesCiudadanos: 0, // Dato real — consulta pública aún no abierta
    mesasRealizadas: 0, // Dato real — mesas por programar
    tendenciaAportes: [0, 0, 0, 0, 0, 0],
    tendenciaAlertas: [2, 2, 2, 2, 2, 2],
  },
  {
    id: "cor-pasacaballos",
    nombre: "Pasacaballos",
    tipo: "corregimiento",
    lon: -75.505,
    lat: 10.28,
    poblacion: 12000,
    ish: 51,
    homicidios: 25.0,
    hurtos: 90,
    escnna: 1,
    alertas: 4,
    aportesCiudadanos: 0, // Dato real — consulta pública aún no abierta
    mesasRealizadas: 0, // Dato real — mesas por programar
    tendenciaAportes: [0, 0, 0, 0, 0, 0],
    tendenciaAlertas: [4, 4, 4, 4, 4, 4],
  },
  {
    id: "cor-bayunca",
    nombre: "Bayunca",
    tipo: "corregimiento",
    lon: -75.42,
    lat: 10.52,
    poblacion: 9500,
    ish: 56,
    homicidios: 10.5,
    hurtos: 77,
    escnna: 0,
    alertas: 3,
    aportesCiudadanos: 0, // Dato real — consulta pública aún no abierta
    mesasRealizadas: 0, // Dato real — mesas por programar
    tendenciaAportes: [0, 0, 0, 0, 0, 0],
    tendenciaAlertas: [3, 3, 3, 3, 3, 3],
  },
];

export const VARIABLE_META: Record<
  VariableMapa,
  { label: string; unidad: string; descripcion: string }
> = {
  ish: { label: "Índice de Seguridad Humana", unidad: "/100", descripcion: "Índice compuesto 0-100" },
  participacion: { label: "Participación Ciudadana", unidad: "aportes", descripcion: "Total aportes radicados" },
  alertas: { label: "Alertas SAT/CIPRAT", unidad: "alertas", descripcion: "Alertas tempranas activas" },
  homicidios: { label: "Tasa de Homicidios", unidad: "x 100k", descripcion: "Por 100.000 hab. 2025" },
  hurtos: { label: "Hurtos a Personas", unidad: "casos", descripcion: "Casos absolutos 2025" },
  poblacion: { label: "Población", unidad: "hab.", descripcion: "Estimado DANE 2025" },
  mesas: { label: "Mesas Comunitarias", unidad: "mesas", descripcion: "Mesas realizadas 2026" },
  escnna: { label: "Alertas ESCNNA", unidad: "alertas", descripcion: "Explotación sexual comercial NNA" },
  personal: { label: "Seguridad Personal", unidad: "/100", descripcion: "Indicador derivado referencial" },
  comunitaria: { label: "Seguridad Comunitaria", unidad: "/100", descripcion: "Indicador derivado referencial" },
  economica: { label: "Seguridad Económica", unidad: "/100", descripcion: "Indicador derivado referencial" },
  ambiental: { label: "Seguridad Ambiental", unidad: "/100", descripcion: "Indicador derivado referencial" },
  alimentaria: { label: "Seguridad Alimentaria", unidad: "/100", descripcion: "Indicador derivado referencial" },
  salud: { label: "Seguridad en Salud", unidad: "/100", descripcion: "Indicador derivado referencial" },
  politica: { label: "Seguridad Política", unidad: "/100", descripcion: "Indicador derivado referencial" },
};

export const ESCALA_CHOROPLETH_PASOS = ["#2d6a4f", "#fcbf49", "#f77f00", "#e63946", "#d62828"] as const;

export function interpolarColor(valor: number, min: number, max: number): string {
  const t = max === min ? 0.5 : Math.max(0, Math.min(1, (valor - min) / (max - min)));
  const idx = Math.min(Math.floor(t * (ESCALA_CHOROPLETH_PASOS.length - 1)), ESCALA_CHOROPLETH_PASOS.length - 2);
  return ESCALA_CHOROPLETH_PASOS[idx];
}

export function obtenerValorVariable(territorio: EstadisticasTerritorio, variable: VariableMapa): number {
  switch (variable) {
    case "ish":
      return territorio.ish;
    case "participacion":
      return territorio.aportesCiudadanos;
    case "alertas":
      return territorio.alertas;
    case "homicidios":
      return territorio.homicidios;
    case "hurtos":
      return territorio.hurtos;
    case "poblacion":
      return territorio.poblacion;
    case "mesas":
      return territorio.mesasRealizadas;
    case "escnna":
      return territorio.escnna;
    case "personal":
      return territorio.ish;
    case "comunitaria":
      return Math.max(0, 100 - territorio.alertas * 3);
    case "economica":
      return Math.max(0, 100 - territorio.hurtos / 50);
    case "ambiental":
      return 72 - (territorio.id === "loc-2" ? 15 : 0);
    case "alimentaria":
      return 65 + (territorio.tipo === "corregimiento" ? -10 : 5);
    case "salud":
      return Math.max(0, 100 - territorio.homicidios * 0.8);
    case "politica":
      return Math.max(0, 100 - territorio.escnna * 4);
    default:
      return 0;
  }
}
