/**
 * POLIS — Catálogo Canónico de Barrios Populares y Corregimientos de Cartagena
 * Optimizado para el Modo Barrio ultraligero (/barrio).
 */

export interface BarrioCartagena {
  id: string;
  nombre: string;
  localidad: string;
  localidadNumero: 1 | 2 | 3;
  tipo: "barrio" | "corregimiento" | "isla";
  destacado: boolean;
  mesaCodigo: string;
  mesaNombre: string;
  poblacionAprox?: string;
  prioridades: string[];
}

export const BARRIOS_CARTAGENA: BarrioCartagena[] = [
  // Localidad 2: De la Virgen y Turística (Prioridad comunitaria)
  {
    id: "olaya-herrera",
    nombre: "Olaya Herrera",
    localidad: "Localidad 2 — De la Virgen y Turística",
    localidadNumero: 2,
    tipo: "barrio",
    destacado: true,
    mesaCodigo: "MT-L02-01",
    mesaNombre: "Mesa Territorial Localidad De La Virgen y Turística",
    poblacionAprox: "95.000 hab.",
    prioridades: [
      "Desarme y desarticulación de fronteras invisibles en Vía Perimetral",
      "Iluminación LED en calles principales y callejones del Canal Ricaurte",
      "Oportunidades de empleo y formación técnica para jóvenes en riesgo",
      "Alarmas vecinales conectadas al CAD 123",
    ],
  },
  {
    id: "el-pozon",
    nombre: "El Pozón",
    localidad: "Localidad 2 — De la Virgen y Turística",
    localidadNumero: 2,
    tipo: "barrio",
    destacado: true,
    mesaCodigo: "MT-L02-01",
    mesaNombre: "Mesa Territorial Localidad De La Virgen y Turística",
    poblacionAprox: "70.000 hab.",
    prioridades: [
      "Puntos de atención y justicia cercana en sectores Primero de Mayo y Central",
      "Cámaras comunitarias de seguridad y vigilancia en vías arteriales",
      "Drenaje pluvial y mitigación de inundaciones en temporada de lluvias",
      "Programas deportivos y escuelas de formación contra el reclutamiento",
    ],
  },
  {
    id: "fredonia",
    nombre: "Fredonia",
    localidad: "Localidad 2 — De la Virgen y Turística",
    localidadNumero: 2,
    tipo: "barrio",
    destacado: true,
    mesaCodigo: "MT-L02-01",
    mesaNombre: "Mesa Territorial Localidad De La Virgen y Turística",
    poblacionAprox: "25.000 hab.",
    prioridades: [
      "Pacto barrial de convivencia y desarme juvenil",
      "Instalación de luminarias solares en sectores de bajamar",
      "Recuperación del espacio público y senderos comunales",
    ],
  },
  {
    id: "boston",
    nombre: "Boston",
    localidad: "Localidad 2 — De la Virgen y Turística",
    localidadNumero: 2,
    tipo: "barrio",
    destacado: false,
    mesaCodigo: "MT-L02-01",
    mesaNombre: "Mesa Territorial Localidad De La Virgen y Turística",
    poblacionAprox: "30.000 hab.",
    prioridades: [
      "Corredores seguros escolares hacia instituciones educativas",
      "Mitigación de basureros satélites y vectores en bordes de caño",
    ],
  },
  {
    id: "la-esperanza",
    nombre: "La Esperanza",
    localidad: "Localidad 2 — De la Virgen y Turística",
    localidadNumero: 2,
    tipo: "barrio",
    destacado: false,
    mesaCodigo: "MT-L02-01",
    mesaNombre: "Mesa Territorial Localidad De La Virgen y Turística",
    poblacionAprox: "28.000 hab.",
    prioridades: [
      "Mejoramiento de vías peatonales y alumbrado en el cerro",
      "Apoyo a frentes comunitarios de seguridad con la Policía",
    ],
  },
  {
    id: "la-candelaria",
    nombre: "La Candelaria",
    localidad: "Localidad 2 — De la Virgen y Turística",
    localidadNumero: 2,
    tipo: "barrio",
    destacado: false,
    mesaCodigo: "MT-L02-01",
    mesaNombre: "Mesa Territorial Localidad De La Virgen y Turística",
    poblacionAprox: "22.000 hab.",
    prioridades: [
      "Control de expendios de microtráfico cerca a canchas comunitarias",
      "Dotación de espacios recreativos para la infancia y juventud",
    ],
  },

  // Localidad 3: Industrial y de la Bahía
  {
    id: "nelson-mandela",
    nombre: "Nelson Mandela",
    localidad: "Localidad 3 — Industrial y de la Bahía",
    localidadNumero: 3,
    tipo: "barrio",
    destacado: true,
    mesaCodigo: "MT-L03-01",
    mesaNombre: "Mesa Territorial Localidad Industrial y de la Bahía",
    poblacionAprox: "65.000 hab.",
    prioridades: [
      "Sede distrital de justicia restaurativa y mediación de conflictos",
      "Intervención integral de jóvenes en riesgo y habilidades productivas",
      "Iluminación nocturna de paraderos de transporte y corredores vecinales",
      "Prevención de violencia intrafamiliar y casas de cuidado comunitario",
    ],
  },
  {
    id: "pasacaballos",
    nombre: "Pasacaballos",
    localidad: "Localidad 3 — Industrial y de la Bahía",
    localidadNumero: 3,
    tipo: "corregimiento",
    destacado: true,
    mesaCodigo: "MT-L03-01",
    mesaNombre: "Mesa Territorial Localidad Industrial y de la Bahía",
    poblacionAprox: "20.000 hab.",
    prioridades: [
      "Protección de corredores de pesca artesanal y seguridad fluvial",
      "Centro de formación técnica industrial y portuaria para jóvenes locales",
      "Control de tránsito de carga pesada y señalización en accesos",
    ],
  },
  {
    id: "san-jose-de-los-campanos",
    nombre: "San José de los Campanos",
    localidad: "Localidad 3 — Industrial y de la Bahía",
    localidadNumero: 3,
    tipo: "barrio",
    destacado: false,
    mesaCodigo: "MT-L03-01",
    mesaNombre: "Mesa Territorial Localidad Industrial y de la Bahía",
    poblacionAprox: "40.000 hab.",
    prioridades: [
      "Construcción y dotación de nuevo CAI de Policía Metropolitana",
      "Pavimentación de vías de acceso y rutas de transporte escolar",
    ],
  },
  {
    id: "membrillal",
    nombre: "Membrillal",
    localidad: "Localidad 3 — Industrial y de la Bahía",
    localidadNumero: 3,
    tipo: "corregimiento",
    destacado: false,
    mesaCodigo: "MT-L03-01",
    mesaNombre: "Mesa Territorial Localidad Industrial y de la Bahía",
    poblacionAprox: "6.000 hab.",
    prioridades: [
      "Mitigación de riesgos industriales y ambientales de la zona fabril",
      "Conectividad y transporte comunitario regular hacia el centro",
    ],
  },
  {
    id: "policarpa",
    nombre: "Policarpa / Arroz Barato",
    localidad: "Localidad 3 — Industrial y de la Bahía",
    localidadNumero: 3,
    tipo: "barrio",
    destacado: false,
    mesaCodigo: "MT-L03-01",
    mesaNombre: "Mesa Territorial Localidad Industrial y de la Bahía",
    poblacionAprox: "18.000 hab.",
    prioridades: [
      "Prevención de riesgos tecnológicos y canalización de aguas lluvias",
      "Frentes de seguridad barrial conectados con estación Mamonal",
    ],
  },

  // Localidad 1: Histórica y del Caribe Norte
  {
    id: "san-francisco",
    nombre: "San Francisco",
    localidad: "Localidad 1 — Histórica y del Caribe Norte",
    localidadNumero: 1,
    tipo: "barrio",
    destacado: true,
    mesaCodigo: "MT-L01-01",
    mesaNombre: "Mesa Territorial Localidad Histórica y del Caribe Norte",
    poblacionAprox: "22.000 hab.",
    prioridades: [
      "Monitoreo geotécnico y estabilización de la ladera de La Popa",
      "Reasentamiento digno y seguro de familias en alto riesgo",
      "Puntos de vigilancia comunitaria y prevención de hurtos",
    ],
  },
  {
    id: "bayunca",
    nombre: "Bayunca",
    localidad: "Localidad 1 — Histórica y del Caribe Norte",
    localidadNumero: 1,
    tipo: "corregimiento",
    destacado: true,
    mesaCodigo: "MR-RUR-02",
    mesaNombre: "Mesa Rural Norte — Arroyo de Piedra y Bayunca",
    poblacionAprox: "16.000 hab.",
    prioridades: [
      "Construcción del sistema de alcantarillado y saneamiento básico",
      "Seguridad vial en la carretera de la Cordialidad y reductores",
      "Dotación del puesto de salud con atención médica permanente",
    ],
  },
  {
    id: "la-boquilla",
    nombre: "La Boquilla",
    localidad: "Localidad 1 — Histórica y del Caribe Norte",
    localidadNumero: 1,
    tipo: "corregimiento",
    destacado: true,
    mesaCodigo: "MT-L01-01",
    mesaNombre: "Mesa Territorial Localidad Histórica y del Caribe Norte",
    poblacionAprox: "19.000 hab.",
    prioridades: [
      "Protección de derechos territoriales del Consejo Comunitario",
      "Prevención integral contra ESCNNA en playas y muelles turísticos",
      "Seguridad náutica y formalización de servidores turísticos nativos",
    ],
  },
  {
    id: "getsemani",
    nombre: "Getsemaní",
    localidad: "Localidad 1 — Histórica y del Caribe Norte",
    localidadNumero: 1,
    tipo: "barrio",
    destacado: false,
    mesaCodigo: "MT-L01-01",
    mesaNombre: "Mesa Territorial Localidad Histórica y del Caribe Norte",
    poblacionAprox: "5.000 hab.",
    prioridades: [
      "Control de ruido, espacio público y convivencia en la Plaza de la Trinidad",
      "Protección a los residentes históricos frente a gentrificación",
    ],
  },
  {
    id: "baru",
    nombre: "Barú (Santa Ana y Ararca)",
    localidad: "Localidad 1 — Histórica y del Caribe Norte",
    localidadNumero: 1,
    tipo: "isla",
    destacado: false,
    mesaCodigo: "MT-L01-01",
    mesaNombre: "Mesa Territorial Localidad Histórica y del Caribe Norte",
    poblacionAprox: "12.000 hab.",
    prioridades: [
      "Agua potable permanente y tratamiento de residuos sólidos",
      "Control de velocidad marítima y boyado de seguridad para bañistas",
    ],
  },
  {
    id: "tierrabomba",
    nombre: "Tierrabomba (Bocachica / Caño del Oro)",
    localidad: "Localidad 1 — Histórica y del Caribe Norte",
    localidadNumero: 1,
    tipo: "isla",
    destacado: false,
    mesaCodigo: "MT-L01-01",
    mesaNombre: "Mesa Territorial Localidad Histórica y del Caribe Norte",
    poblacionAprox: "14.000 hab.",
    prioridades: [
      "Defensa costera contra la erosión marítima en Bocachica",
      "Preservación de monumentos y patrimonio afrocolombiano insular",
    ],
  },
];

export const BARRIO_DEFECTO = BARRIOS_CARTAGENA[0]; // Olaya Herrera

export function buscarBarrioPorId(id: string): BarrioCartagena {
  return BARRIOS_CARTAGENA.find((b) => b.id === id) ?? BARRIO_DEFECTO;
}
