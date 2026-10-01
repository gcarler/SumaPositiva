export type TipoTerritorio = "localidad" | "corregimiento" | "isla";

export interface Territorio {
  id: string;
  codigo: string;
  nombre: string;
  tipo: TipoTerritorio;
  localidadId: string;
  lon: number;
  lat: number;
  poblacion: number;
  indicadorSeguridad: number;
  aportesCiudadanos: number;
  mesasRealizadas: number;
  alertasActivas: number;
  descripcion: string;
}

export const TERRITORIOS_CARTAGENA: Territorio[] = [
  {
    id: "loc-1",
    codigo: "LOC-1",
    nombre: "Localidad 1 — Histórica y del Caribe Norte",
    tipo: "localidad",
    localidadId: "loc-1",
    lon: -75.5506,
    lat: 10.4236,
    poblacion: 331000,
    indicadorSeguridad: 62,
    aportesCiudadanos: 3210,
    mesasRealizadas: 12,
    alertasActivas: 8,
    descripcion:
      "Comprende el Centro Histórico, Bocagrande, El Pozón, La Esperanza y sectores turísticos de alta afluencia.",
  },
  {
    id: "loc-2",
    codigo: "LOC-2",
    nombre: "Localidad 2 — De la Virgen y Turística",
    tipo: "localidad",
    localidadId: "loc-2",
    lon: -75.485,
    lat: 10.448,
    poblacion: 448000,
    indicadorSeguridad: 54,
    aportesCiudadanos: 2890,
    mesasRealizadas: 10,
    alertasActivas: 14,
    descripcion:
      "Incluye La Boquilla, Nelson Mandela, Revivir, La Esperanza y zonas de desarrollo turístico costero.",
  },
  {
    id: "loc-3",
    codigo: "LOC-3",
    nombre: "Localidad 3 — Industrial y de la Bahía",
    tipo: "localidad",
    localidadId: "loc-3",
    lon: -75.52,
    lat: 10.325,
    poblacion: 278000,
    indicadorSeguridad: 58,
    aportesCiudadanos: 2320,
    mesasRealizadas: 8,
    alertasActivas: 6,
    descripcion:
      "Zona industrial, Mamonal, Pasacaballos, Ceballos y sectores portuarios y petroquímicos.",
  },
  {
    id: "cor-boquilla",
    codigo: "CORR-BOQUILLA",
    nombre: "La Boquilla",
    tipo: "corregimiento",
    localidadId: "loc-2",
    lon: -75.4672,
    lat: 10.4783,
    poblacion: 18500,
    indicadorSeguridad: 49,
    aportesCiudadanos: 410,
    mesasRealizadas: 3,
    alertasActivas: 5,
    descripcion:
      "Comunidad pesquera con identidad cultural propia. La ficha territorial no reemplaza la consulta a autoridades comunitarias.",
  },
  {
    id: "cor-tierrabomba",
    codigo: "INS-TIERRABOMBA",
    nombre: "Tierra Bomba",
    tipo: "isla",
    localidadId: "loc-1",
    lon: -75.56,
    lat: 10.34,
    poblacion: 6200,
    indicadorSeguridad: 45,
    aportesCiudadanos: 180,
    mesasRealizadas: 2,
    alertasActivas: 3,
    descripcion:
      "Isla habitada con comunidades afrodescendientes y economía pesquera artesanal.",
  },
  {
    id: "cor-baru",
    codigo: "INS-BARU",
    nombre: "Barú",
    tipo: "isla",
    localidadId: "loc-3",
    lon: -75.59,
    lat: 10.23,
    poblacion: 3800,
    indicadorSeguridad: 43,
    aportesCiudadanos: 120,
    mesasRealizadas: 2,
    alertasActivas: 2,
    descripcion:
      "Isla con comunidades y ecosistemas de manglar y arrecifes de coral.",
  },
  {
    id: "cor-pasacaballos",
    codigo: "CORR-PASACABALLOS",
    nombre: "Pasacaballos",
    tipo: "corregimiento",
    localidadId: "loc-3",
    lon: -75.505,
    lat: 10.28,
    poblacion: 12000,
    indicadorSeguridad: 51,
    aportesCiudadanos: 290,
    mesasRealizadas: 3,
    alertasActivas: 4,
    descripcion:
      "Corregimiento en zona industrial con comunidades vulnerables y exposición a riesgos ambientales.",
  },
  {
    id: "cor-bayunca",
    codigo: "CORR-BAYUNCA",
    nombre: "Bayunca",
    tipo: "corregimiento",
    localidadId: "loc-2",
    lon: -75.42,
    lat: 10.52,
    poblacion: 9500,
    indicadorSeguridad: 56,
    aportesCiudadanos: 210,
    mesasRealizadas: 2,
    alertasActivas: 3,
    descripcion:
      "Corregimiento rural en zona norte con economía agropecuaria y pesquera.",
  },
];

export const LEYENDA_TERRITORIAL = [
  {
    id: "loc-1",
    label: "Localidad 1",
    token: "--info",
    territorioId: "loc-1",
  },
  {
    id: "loc-2",
    label: "Localidad 2",
    token: "--warning",
    territorioId: "loc-2",
  },
  {
    id: "loc-3",
    label: "Localidad 3",
    token: "--success",
    territorioId: "loc-3",
  },
  {
    id: "zona-corregimental",
    label: "Zona corregimental e insular",
    token: "--text-tertiary",
  },
] as const;

export function obtenerTerritorio(id: string): Territorio | undefined {
  return TERRITORIOS_CARTAGENA.find((territorio) => territorio.id === id);
}
