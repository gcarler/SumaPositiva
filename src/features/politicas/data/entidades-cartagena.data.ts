/**
 * POLIS — Censo Oficial de 27 Dependencias de la Alcaldía Mayor de Cartagena (2026)
 * Fuente Oficial: Informe de Seguimiento a Planes de Acción 2026 a corte 30 de junio de 2026
 * Plan de Desarrollo Distrital "Cartagena Ciudad de Derechos" (2024–2027).
 * Articulado con las 7 Dimensiones de Seguridad Humana (Ley Estatutaria 1757 de 2015).
 */

export type DependenciaTipo =
  | "secretaria"
  | "ente_descentralizado"
  | "unidad_asesora"
  | "alcaldia_local"
  | "empresa_industrial"
  | "institucion_educativa";

export interface CanalAtencion {
  direccion: string;
  canalVirtual: string;
  web?: string;
}

export interface DependenciaDistrital {
  id: string;
  codigo: string;
  nombre: string;
  sigla?: string;
  tipo: DependenciaTipo;
  dimensionesPrincipales: string[]; // "personal", "comunitaria", "ambiental", "economica", "alimentaria", "salud", "politica", "crisis"
  competenciaSeguridadHumana: string;
  misionPlanAccion2026?: string;
  canalAtencion?: CanalAtencion;
  avancePlanAccion2026?: number; // Porcentaje auditado a 30 de junio 2026
  presupuesto2026Cop?: string;
  fuentesFinanciacion?: string[];
  metasPriorizadas?: string[];
  territoriosPrioritarios?: string[]; // "loc-1", "loc-2", "loc-3", "rural-insular"
  entidadesCorresponsables?: string[];
  palabrasClave?: string[];
}

export const AVANCE_PROMEDIO_PDD_2026 = 38.8;
export const FECHA_CORTE_AUDITORIA = "30 de junio de 2026";
export const PRESUPUESTO_TOTAL_SEGURIDAD_HUMANA_2026 = ".1 Billones COP";

export const DEPENDENCIAS_CARTAGENA_2026: DependenciaDistrital[] = [
  {
    "id": "dep-sicc",
    "codigo": "SICC",
    "sigla": "SICC",
    "nombre": "Secretaría del Interior y Convivencia Ciudadana",
    "tipo": "secretaria",
    "dimensionesPrincipales": [
      "personal",
      "comunitaria",
      "crisis"
    ],
    "competenciaSeguridadHumana": "Orden público, desarticulación de ollas/microtráfico, desarme barrial, convivencia ciudadana (Ley 1801) y articulación con MECAR y Distriseguridad.",
    "misionPlanAccion2026": "Liderar el orden público, la seguridad ciudadana y la convivencia comunitaria en los barrios y corregimientos de Cartagena.",
    "avancePlanAccion2026": 44.5,
    "presupuesto2026Cop": "8.400 Millones",
    "fuentesFinanciacion": [
      "FONSET",
      "ICLD"
    ],
    "metasPriorizadas": [
      "15 cuadrantes comunitarios de paz implementados",
      "30 frentes de seguridad barrial y alarmas comunitarias",
      "Desarticulación de expendios de drogas en entornos escolares"
    ],
    "territoriosPrioritarios": [
      "loc-1",
      "loc-2",
      "loc-3",
      "rural-insular"
    ],
    "entidadesCorresponsables": [
      "DISTRISEG",
      "DATT",
      "PARTICIPACION",
      "GEPM"
    ],
    "canalAtencion": {
      "direccion": "Plaza de la Aduana, Palacio de la Aduana, Piso 2",
      "canalVirtual": "Sede Electrónica Oficial y Ventanilla Única",
      "web": "https://cartagena.gov.co/dependencias/interior"
    },
    "palabrasClave": [
      "droga",
      "olla",
      "sicariato",
      "atraco",
      "pandilla",
      "riña",
      "armas",
      "bala",
      "homicidio",
      "extorsion",
      "vacunas",
      "orden publico",
      "convivencia",
      "robo",
      "hurto",
      "microtrafico"
    ]
  },
  {
    "id": "dep-participacion",
    "codigo": "SPD",
    "sigla": "PARTICIPACION",
    "nombre": "Secretaría de Participación y Desarrollo Social",
    "tipo": "secretaria",
    "dimensionesPrincipales": [
      "comunitaria",
      "alimentaria",
      "economica"
    ],
    "competenciaSeguridadHumana": "Poblaciones diferenciales (mujeres, niñez, juventud, adulto mayor, discapacidad, LGBTIQ+), asuntos étnicos afro/indígenas y desarrollo agropecuario (UMATA).",
    "misionPlanAccion2026": "Garantizar los derechos de poblaciones vulnerables, mujeres, niñez, etnias y personas en discapacidad con enfoque de género y diferencial.",
    "avancePlanAccion2026": 42.2,
    "presupuesto2026Cop": "4.200 Millones",
    "fuentesFinanciacion": [
      "SGP",
      "ICLD"
    ],
    "metasPriorizadas": [
      "4 Casas de la Mujer Empoderada operando en barrios de alta criticidad",
      "12 centros comunitarios de atención a primera infancia y juventud",
      "Ruta de atención prioritaria para 2.500 víctimas del conflicto armado"
    ],
    "territoriosPrioritarios": [
      "loc-1",
      "loc-2",
      "loc-3",
      "rural-insular"
    ],
    "entidadesCorresponsables": [
      "PES-PR",
      "DADIS",
      "IDACCC",
      "EDUCACION"
    ],
    "canalAtencion": {
      "direccion": "Manga, 3ra Avenida Calle 28 #21-62",
      "canalVirtual": "Sede Electrónica Oficial y Ventanilla Única",
      "web": "https://cartagena.gov.co/dependencias/participacion"
    },
    "palabrasClave": [
      "mujer",
      "violencia de genero",
      "feminicidio",
      "maltrato intrafamiliar",
      "niñez",
      "niños",
      "adulto mayor",
      "discapacidad",
      "lgbtiq",
      "etnico",
      "afro",
      "palenquero",
      "raizal",
      "indigena",
      "vulnerabilidad"
    ]
  },
  {
    "id": "dep-planeacion",
    "codigo": "SPD-PLAN",
    "sigla": "PLANEACION",
    "nombre": "Secretaría de Planeación Distrital",
    "tipo": "secretaria",
    "dimensionesPrincipales": [
      "politica",
      "economica",
      "ambiental"
    ],
    "competenciaSeguridadHumana": "Dirección estratégica distrital, adopción de políticas públicas distritales, ordenamiento territorial (POT), focalización Sisbén y seguimiento del PDD.",
    "misionPlanAccion2026": "Orientar la planificación territorial, el seguimiento al PDD \"Cartagena Ciudad de Derechos\" y la focalización social transparente.",
    "avancePlanAccion2026": 46.8,
    "presupuesto2026Cop": "2.100 Millones",
    "fuentesFinanciacion": [
      "ICLD",
      "Regalías"
    ],
    "metasPriorizadas": [
      "Adopción y reglamentación del nuevo Plan de Ordenamiento Territorial (POT)",
      "Actualización y depuración al 100% de la base Sisbén IV",
      "6 mesas distritales de seguimiento de políticas públicas"
    ],
    "territoriosPrioritarios": [
      "loc-1",
      "loc-2",
      "loc-3",
      "rural-insular"
    ],
    "entidadesCorresponsables": [
      "CORVIVIENDA",
      "EPA",
      "HACIENDA",
      "GENERAL"
    ],
    "canalAtencion": {
      "direccion": "Centro Histórico, Edificio Banco Agrario, Piso 6",
      "canalVirtual": "Sede Electrónica Oficial y Ventanilla Única",
      "web": "https://planeacion.cartagena.gov.co"
    },
    "palabrasClave": [
      "pot",
      "ordenamiento territorial",
      "sisben",
      "politicas publicas",
      "politica_distrital",
      "planeacion",
      "uso del suelo",
      "estratificacion",
      "censo"
    ]
  },
  {
    "id": "dep-educacion",
    "codigo": "SED",
    "sigla": "EDUCACION",
    "nombre": "Secretaría de Educación Distrital",
    "tipo": "secretaria",
    "dimensionesPrincipales": [
      "personal",
      "alimentaria",
      "comunitaria"
    ],
    "competenciaSeguridadHumana": "Entornos escolares seguros, prevención del acoso (bullying) y drogas, permanencia estudiantil y Programa de Alimentación Escolar (PAE).",
    "misionPlanAccion2026": "Asegurar cobertura educativa universal de calidad, permanencia escolar y entornos escolares seguros libres de violencia y microtráfico.",
    "avancePlanAccion2026": 44.2,
    "presupuesto2026Cop": "10.000 Millones",
    "fuentesFinanciacion": [
      "SGP",
      "ICLD",
      "FONSET"
    ],
    "metasPriorizadas": [
      "100% de cobertura del Programa de Alimentación Escolar (PAE) para 108.000 estudiantes",
      "Adecuación y blindaje perimetral de 45 sedes educativas oficiales",
      "Estrategia \"Entornos Escolares Seguros\" en articulación con la Policía de Infancia"
    ],
    "territoriosPrioritarios": [
      "loc-1",
      "loc-2",
      "loc-3",
      "rural-insular"
    ],
    "entidadesCorresponsables": [
      "SICC",
      "DADIS",
      "COLMAYOR",
      "PARTICIPACION"
    ],
    "canalAtencion": {
      "direccion": "Plazoleta Telecom, Calle Larga #10B-89",
      "canalVirtual": "Sede Electrónica Oficial y Ventanilla Única",
      "web": "https://sedcartagena.gov.co"
    },
    "palabrasClave": [
      "colegio",
      "escuela",
      "bullying",
      "acoso escolar",
      "profesores",
      "pae",
      "alimentacion escolar",
      "drogas en colegios",
      "desercion escolar",
      "infraestructura escolar"
    ]
  },
  {
    "id": "dep-turismo",
    "codigo": "STUR",
    "sigla": "TURISMO",
    "nombre": "Secretaría de Turismo",
    "tipo": "secretaria",
    "dimensionesPrincipales": [
      "personal",
      "economica"
    ],
    "competenciaSeguridadHumana": "Prevención estricta de ESCNNA en entornos turísticos, playas y zona insular (Barú/Rosario), y control de cobros abusivos a turistas.",
    "misionPlanAccion2026": "Desarrollar el turismo sostenible y seguro, protegiendo a niños, niñas y adolescentes de la explotación sexual comercial (ESCNNA).",
    "avancePlanAccion2026": 39.0,
    "presupuesto2026Cop": "4.500 Millones",
    "fuentesFinanciacion": [
      "ICLD",
      "Fontur"
    ],
    "metasPriorizadas": [
      "Sello \"Cartagena Libre de ESCNNA\" implementado en 180 prestadores turísticos",
      "Inspección y control a 35 operadores turísticos en playas de Barú e Islas del Rosario",
      "Puntos de atención y denuncia inmediata contra cobros abusivos y estafas"
    ],
    "territoriosPrioritarios": [
      "loc-1",
      "rural-insular"
    ],
    "entidadesCorresponsables": [
      "SICC",
      "ETCAR",
      "CENTRO HISTORICO",
      "DATT"
    ],
    "canalAtencion": {
      "direccion": "Centro Histórico, Calle de la Inquisición #3-53",
      "canalVirtual": "Sede Electrónica Oficial y Ventanilla Única",
      "web": "https://cartagena.gov.co/dependencias/turismo"
    },
    "palabrasClave": [
      "turismo",
      "turista",
      "playa",
      "baru",
      "islas del rosario",
      "escnna",
      "explotacion sexual",
      "cobros excesivos",
      "estafa a turistas",
      "lanchas",
      "cholon",
      "centro historico"
    ]
  },
  {
    "id": "dep-hacienda",
    "codigo": "SHAC",
    "sigla": "HACIENDA",
    "nombre": "Secretaría de Hacienda Distrital",
    "tipo": "secretaria",
    "dimensionesPrincipales": [
      "economica",
      "politica"
    ],
    "competenciaSeguridadHumana": "Consistencia fiscal, recaudación distrital y administración de los recursos del Fondo de Seguridad Territorial (FONSET).",
    "misionPlanAccion2026": "Administrar con transparencia los recursos fiscales del Distrito, blindando la asignación oportuna al Fondo de Seguridad (FONSET).",
    "avancePlanAccion2026": 48.5,
    "presupuesto2026Cop": "1.800 Millones",
    "fuentesFinanciacion": [
      "ICLD"
    ],
    "metasPriorizadas": [
      "Recaudo fiscal récord de .2 Billones COP para inversión social",
      "Modernización del catastro multipropósito distrital",
      "Asignación oportuna y auditada del 100% de los recursos FONSET a seguridad"
    ],
    "territoriosPrioritarios": [
      "loc-1",
      "loc-2",
      "loc-3"
    ],
    "entidadesCorresponsables": [
      "GENERAL",
      "PLANEACION",
      "SICC"
    ],
    "canalAtencion": {
      "direccion": "Plaza de la Aduana, Palacio de la Aduana, Piso 1",
      "canalVirtual": "Sede Electrónica Oficial y Ventanilla Única",
      "web": "https://hacienda.cartagena.gov.co"
    },
    "palabrasClave": [
      "hacienda",
      "impuestos",
      "fonset",
      "presupuesto",
      "recursos",
      "recaudo",
      "catastro",
      "predial",
      "ica"
    ]
  },
  {
    "id": "dep-infraestructura",
    "codigo": "SINF",
    "sigla": "INFRAESTRUCTURA",
    "nombre": "Secretaría de Infraestructura",
    "tipo": "secretaria",
    "dimensionesPrincipales": [
      "ambiental",
      "personal"
    ],
    "competenciaSeguridadHumana": "Recuperación de malla vial, canalización de canales pluviales mariales y expansión de alumbrado público LED en zonas oscuras.",
    "misionPlanAccion2026": "Ejecutar las obras viales, drenajes pluviales, recuperación de puentes y modernización de luminarias LED en barrios críticos.",
    "avancePlanAccion2026": 42.0,
    "presupuesto2026Cop": "85.000 Millones",
    "fuentesFinanciacion": [
      "ICLD",
      "Regalías",
      "Crédito"
    ],
    "metasPriorizadas": [
      "Pavimentación y mantenimiento de 40 km de vías barriales en sectores críticos",
      "Limpieza y canalización de 25 canales pluviales mariales para mitigar arroyos",
      "Instalación de 4.200 luminarias LED de alumbrado público en puntos ciegos"
    ],
    "territoriosPrioritarios": [
      "loc-1",
      "loc-2",
      "loc-3",
      "rural-insular"
    ],
    "entidadesCorresponsables": [
      "EPA",
      "OAGRD",
      "DISTRISEG",
      "DATT"
    ],
    "canalAtencion": {
      "direccion": "Centro Histórico, Edificio Ronda Real, Torre B, Piso 3",
      "canalVirtual": "Sede Electrónica Oficial y Ventanilla Única",
      "web": "https://cartagena.gov.co/dependencias/infraestructura"
    },
    "palabrasClave": [
      "calle",
      "hueco",
      "via",
      "pavimento",
      "canal pluvial",
      "arroyo",
      "alumbrado publico",
      "lampara",
      "oscuridad",
      "puente",
      "caño",
      "alcantarilla",
      "inundacion"
    ]
  },
  {
    "id": "dep-general",
    "codigo": "SGEN",
    "sigla": "GENERAL",
    "nombre": "Secretaría General",
    "tipo": "secretaria",
    "dimensionesPrincipales": [
      "politica"
    ],
    "competenciaSeguridadHumana": "Gobernanza institucional, atención ciudadana, contratación pública transparente y gestión documental distrital.",
    "misionPlanAccion2026": "Modernizar la gestión pública distrital, asegurar la transparencia contractual y liderar los canales de atención al ciudadano.",
    "avancePlanAccion2026": 42.8,
    "presupuesto2026Cop": "5.600 Millones",
    "fuentesFinanciacion": [
      "ICLD"
    ],
    "metasPriorizadas": [
      "Ventanilla Única Distrital 100% digital y accesible",
      "Certificación antisoborno ISO 37001 en contratación distrital",
      "8 jornadas móviles de atención y trámites en barrios periféricos"
    ],
    "territoriosPrioritarios": [
      "loc-1",
      "loc-2",
      "loc-3",
      "rural-insular"
    ],
    "entidadesCorresponsables": [
      "PLANEACION",
      "TIC",
      "HACIENDA"
    ],
    "canalAtencion": {
      "direccion": "Plaza de la Aduana, Palacio de la Aduana, Piso 1",
      "canalVirtual": "Sede Electrónica Oficial y Ventanilla Única",
      "web": "https://cartagena.gov.co/dependencias/general"
    },
    "palabrasClave": [
      "tramites",
      "corrupcion",
      "soborno",
      "contratacion",
      "atencion al ciudadano",
      "quejas",
      "reclamos",
      "ventanilla unica"
    ]
  },
  {
    "id": "dep-dadis",
    "codigo": "DADIS",
    "sigla": "DADIS",
    "nombre": "Departamento Administrativo Distrital de Salud",
    "tipo": "ente_descentralizado",
    "dimensionesPrincipales": [
      "salud",
      "alimentaria"
    ],
    "competenciaSeguridadHumana": "Atención primaria, salud mental para jóvenes, control epidemiológico de dengue/zika, inspección sanitaria de alimentos y reducción de desnutrición.",
    "misionPlanAccion2026": "Garantizar el derecho a la salud pública, la vigilancia epidemiológica, la salud mental juvenil y el acceso oportuno a urgencias.",
    "avancePlanAccion2026": 40.2,
    "presupuesto2026Cop": "90.000 Millones",
    "fuentesFinanciacion": [
      "SGP",
      "ICLD",
      "ADRES"
    ],
    "metasPriorizadas": [
      "Tasa de letalidad por dengue reducida al 0% mediante fumigación y control focal",
      "25.000 atenciones en salud mental barrial y Línea 106",
      "Reapertura y modernización de 8 Centros de Atención Primaria (CAP)"
    ],
    "territoriosPrioritarios": [
      "loc-1",
      "loc-2",
      "loc-3",
      "rural-insular"
    ],
    "entidadesCorresponsables": [
      "EPA",
      "PES-PR",
      "PARTICIPACION"
    ],
    "canalAtencion": {
      "direccion": "Casa Fátima, Getsemaní Calle Larga #9A-47",
      "canalVirtual": "Sede Electrónica Oficial y Ventanilla Única",
      "web": "https://dadiscartagena.gov.co"
    },
    "palabrasClave": [
      "salud",
      "hospital",
      "cap",
      "centro de salud",
      "dengue",
      "zika",
      "enfermedad",
      "salud mental",
      "suicidio",
      "depresion",
      "insalubridad",
      "ambulancia",
      "urgencias",
      "vacunas",
      "alimentos en mal estado"
    ]
  },
  {
    "id": "dep-epa",
    "codigo": "EPA",
    "sigla": "EPA",
    "nombre": "Establecimiento Público Ambiental (EPA Cartagena)",
    "tipo": "ente_descentralizado",
    "dimensionesPrincipales": [
      "ambiental"
    ],
    "competenciaSeguridadHumana": "Autoridad ambiental urbana: saneamiento de la Ciénaga de la Virgen, control de vertimientos ilegales, calidad del aire y protección de manglares.",
    "misionPlanAccion2026": "Ejercer la autoridad ambiental en el perímetro urbano, controlando la contaminación hídrica, acústica, de aire y residuos sólidos.",
    "avancePlanAccion2026": 37.1,
    "presupuesto2026Cop": "8.900 Millones",
    "fuentesFinanciacion": [
      "Sobretasa Ambiental",
      "ICLD"
    ],
    "metasPriorizadas": [
      "Recuperación ambiental integral de 12 puntos críticos en la Ciénaga de la Virgen",
      "Clausura y sanción de 30 puntos de vertimiento ilegal de aguas servidas",
      "45 operativos contra la contaminación acústica y picós en zonas residenciales"
    ],
    "territoriosPrioritarios": [
      "loc-1",
      "loc-2",
      "loc-3"
    ],
    "entidadesCorresponsables": [
      "INFRAESTRUCTURA",
      "OAGRD",
      "SICC"
    ],
    "canalAtencion": {
      "direccion": "Manga, Calle Real #22-54",
      "canalVirtual": "Sede Electrónica Oficial y Ventanilla Única",
      "web": "https://epacartagena.gov.co"
    },
    "palabrasClave": [
      "ambiental",
      "basura",
      "caño",
      "cienaga de la virgen",
      "manglar",
      "arboles",
      "ruido",
      "picoteros",
      "vertimientos",
      "agua servida",
      "contaminacion",
      "olores",
      "reciclaje"
    ]
  },
  {
    "id": "dep-datt",
    "codigo": "DATT",
    "sigla": "DATT",
    "nombre": "Departamento Administrativo de Tránsito y Transporte",
    "tipo": "ente_descentralizado",
    "dimensionesPrincipales": [
      "personal",
      "ambiental"
    ],
    "competenciaSeguridadHumana": "Seguridad vial, control operativo al transporte informal riesgoso, Visión Cero fatalidades y pacificación de vías barriales.",
    "misionPlanAccion2026": "Salvaguardar la vida en las vías de Cartagena, ordenando el tránsito y combatiendo la siniestralidad vial con enfoque \"Visión Cero\".",
    "avancePlanAccion2026": 42.8,
    "presupuesto2026Cop": "4.700 Millones",
    "fuentesFinanciacion": [
      "Recursos Propios",
      "ICLD"
    ],
    "metasPriorizadas": [
      "Reducción del 20% en víctimas fatales por siniestros viales",
      "120 operativos de alcoholemia y control de velocidad en corredores principales",
      "Señalización y pacificación vial de 60 zonas escolares y peatonales"
    ],
    "territoriosPrioritarios": [
      "loc-1",
      "loc-2",
      "loc-3"
    ],
    "entidadesCorresponsables": [
      "TRANSCARIBE",
      "SICC",
      "INFRAESTRUCTURA"
    ],
    "canalAtencion": {
      "direccion": "Manga, 4ta Avenida Calle 29 #23-28",
      "canalVirtual": "Sede Electrónica Oficial y Ventanilla Única",
      "web": "https://transitocartagena.gov.co"
    },
    "palabrasClave": [
      "transito",
      "choque",
      "accidente",
      "atropellado",
      "semaforo",
      "motos",
      "andenes",
      "parqueo indebido",
      "agentes de transito",
      "fotomulta",
      "congestion",
      "mototaxismo"
    ]
  },
  {
    "id": "dep-pes",
    "codigo": "PES-PR",
    "sigla": "PES",
    "nombre": "Plan de Emergencia Social - Pedro Romero",
    "tipo": "ente_descentralizado",
    "dimensionesPrincipales": [
      "economica",
      "alimentaria"
    ],
    "competenciaSeguridadHumana": "Superación de la pobreza extrema, red de comedores comunitarios, bancarización comunitaria contra el 'gota a gota' y habitabilidad básica.",
    "misionPlanAccion2026": "Erradicar la pobreza extrema en los barrios periféricos, asegurando soberanía alimentaria, habitabilidad e inclusión productiva digna.",
    "avancePlanAccion2026": 35.2,
    "presupuesto2026Cop": "8.300 Millones",
    "fuentesFinanciacion": [
      "ICLD",
      "Cooperación Internacional"
    ],
    "metasPriorizadas": [
      "18 comedores comunitarios activos con 6.000 raciones nutricionales diarias",
      "Bancarización y microcréditos para 3.000 familias liberadas del \"gota a gota\"",
      "1.200 mejoramientos de pisos de tierra y habitabilidad básica"
    ],
    "territoriosPrioritarios": [
      "loc-2",
      "loc-3",
      "rural-insular"
    ],
    "entidadesCorresponsables": [
      "DADIS",
      "PARTICIPACION",
      "CORVIVIENDA"
    ],
    "canalAtencion": {
      "direccion": "Centro Histórico, Edificio Portobelo, Piso 3",
      "canalVirtual": "Sede Electrónica Oficial y Ventanilla Única",
      "web": "https://cartagena.gov.co/dependencias/pes"
    },
    "palabrasClave": [
      "pobreza extrema",
      "hambre",
      "comedores",
      "comida",
      "gota a gota",
      "subsidios",
      "desnutricion",
      "el pozon",
      "nelson mandela",
      "miseria",
      "bancarizacion"
    ]
  },
  {
    "id": "dep-corvivienda",
    "codigo": "CORVIVIENDA",
    "sigla": "CORVIVIENDA",
    "nombre": "Fondo de Vivienda de Interés Social y Reforma Urbana",
    "tipo": "ente_descentralizado",
    "dimensionesPrincipales": [
      "economica",
      "ambiental"
    ],
    "competenciaSeguridadHumana": "Mejoramiento integral de vivienda, titulación de predios y reasentamiento digno de familias en zonas de alto riesgo de deslizamiento o inundación.",
    "misionPlanAccion2026": "Promover el acceso a vivienda digna, titulación masiva de predios y reasentamiento de familias en zonas de alto riesgo no mitigable.",
    "avancePlanAccion2026": 24.2,
    "presupuesto2026Cop": "6.000 Millones",
    "fuentesFinanciacion": [
      "ICLD",
      "Regalías"
    ],
    "metasPriorizadas": [
      "1.500 mejoramientos integrales de vivienda en barrios populares",
      "800 títulos de propiedad formalizados a familias en asentamientos históricos",
      "Reasentamiento digno de 120 familias de las laderas de La Popa"
    ],
    "territoriosPrioritarios": [
      "loc-2",
      "loc-3"
    ],
    "entidadesCorresponsables": [
      "PLANEACION",
      "OAGRD",
      "INFRAESTRUCTURA"
    ],
    "canalAtencion": {
      "direccion": "Manga, 3ra Avenida Calle 28 #21-14",
      "canalVirtual": "Sede Electrónica Oficial y Ventanilla Única",
      "web": "https://corvivienda.gov.co"
    },
    "palabrasClave": [
      "vivienda",
      "techo",
      "casa",
      "reasentamiento",
      "desalojo",
      "predio",
      "titulacion",
      "barrio subnormal",
      "laderas",
      "riesgo de colapso",
      "invasiones"
    ]
  },
  {
    "id": "dep-ider",
    "codigo": "IDER",
    "sigla": "IDER",
    "nombre": "Instituto Distrital de Deporte y Recreación",
    "tipo": "ente_descentralizado",
    "dimensionesPrincipales": [
      "comunitaria",
      "personal"
    ],
    "competenciaSeguridadHumana": "Prevención de la violencia juvenil y reclutamiento mediante escuelas deportivas, 'barrismo social', adecuación de canchas y uso del tiempo libre.",
    "misionPlanAccion2026": "Transformar vidas a través del deporte, la actividad física y la recreación comunitaria como antídoto contra el pandillismo juvenil.",
    "avancePlanAccion2026": 46.8,
    "presupuesto2026Cop": "2.400 Millones",
    "fuentesFinanciacion": [
      "ICLD",
      "Sobretasa Deportiva"
    ],
    "metasPriorizadas": [
      "Intervención integral de 50 canchas y escenarios deportivos barriales",
      "18.000 niños y jóvenes formándose en escuelas deportivas comunitarias",
      "Torneo distrital \"Deporte por la Paz y la Convivencia\""
    ],
    "territoriosPrioritarios": [
      "loc-1",
      "loc-2",
      "loc-3",
      "rural-insular"
    ],
    "entidadesCorresponsables": [
      "EDUCACION",
      "SICC",
      "PARTICIPACION"
    ],
    "canalAtencion": {
      "direccion": "Pie de la Popa, Calle Real #29-33",
      "canalVirtual": "Sede Electrónica Oficial y Ventanilla Única",
      "web": "https://ider.gov.co"
    },
    "palabrasClave": [
      "deporte",
      "cancha",
      "parque",
      "recreacion",
      "escuelas deportivas",
      "pandillismo",
      "tiempo libre",
      "futbol",
      "beisbol",
      "patinaje",
      "escenarios deportivos"
    ]
  },
  {
    "id": "dep-idaccc",
    "codigo": "IDACCC",
    "sigla": "IDACCC",
    "nombre": "Instituto Distrital de Acción Comunal y Ciudadana de Cartagena",
    "tipo": "ente_descentralizado",
    "dimensionesPrincipales": [
      "comunitaria",
      "politica"
    ],
    "competenciaSeguridadHumana": "Fortalecimiento organizativo y garantías para los dignatarios de las Juntas de Acción Comunal (JAC) y organizaciones de base ciudadana.",
    "misionPlanAccion2026": "Fortalecer la gobernanza comunal, capacitar a las JAC y proteger la vida de líderes y lideresas barriales.",
    "avancePlanAccion2026": 34.1,
    "presupuesto2026Cop": ".900 Millones",
    "fuentesFinanciacion": [
      "ICLD"
    ],
    "metasPriorizadas": [
      "Fortalecimiento y bancarización de 280 Juntas de Acción Comunal",
      "Mecanismo de Alerta Rápida para dignatarios comunales en riesgo",
      "30 iniciativas de Presupuesto Participativo formuladas por comunidades"
    ],
    "territoriosPrioritarios": [
      "loc-1",
      "loc-2",
      "loc-3",
      "rural-insular"
    ],
    "entidadesCorresponsables": [
      "SICC",
      "ESCUELA GOBIERNO",
      "PARTICIPACION"
    ],
    "canalAtencion": {
      "direccion": "Centro Histórico, Calle Cuartel #36-24",
      "canalVirtual": "Sede Electrónica Oficial y Ventanilla Única",
      "web": "https://idaccc.gov.co"
    },
    "palabrasClave": [
      "jac",
      "junta de accion comunal",
      "lider comunal",
      "lideresa barrial",
      "amenazas a lideres",
      "participacion ciudadana",
      "presupuesto participativo"
    ]
  },
  {
    "id": "dep-ipcc",
    "codigo": "IPCC",
    "sigla": "IPCC",
    "nombre": "Instituto de Patrimonio y Cultura de Cartagena",
    "tipo": "ente_descentralizado",
    "dimensionesPrincipales": [
      "comunitaria"
    ],
    "competenciaSeguridadHumana": "Apropiación cultural comunitaria, salvaguardia del patrimonio afrodescendiente e insular y convivencia pacífica a través del arte.",
    "misionPlanAccion2026": "Fomentar el desarrollo cultural, el patrimonio inmaterial cartagenero y la convivencia barrial a través del arte y la memoria.",
    "avancePlanAccion2026": 41.2,
    "presupuesto2026Cop": "6.700 Millones",
    "fuentesFinanciacion": [
      "ICLD",
      "Estampilla Pro-Cultura"
    ],
    "metasPriorizadas": [
      "12 Casas de Cultura barriales y centros de formación artística activos",
      "Estímulos culturales para 350 artistas y gestores comunitarios",
      "Estrategia de Paz y Convivencia en Fiestas de Independencia del 11 de Noviembre"
    ],
    "territoriosPrioritarios": [
      "loc-1",
      "loc-2",
      "loc-3",
      "rural-insular"
    ],
    "entidadesCorresponsables": [
      "ETCAR",
      "EDUCACION",
      "TURISMO"
    ],
    "canalAtencion": {
      "direccion": "Centro Histórico, Barrio Getsemaní, Calle Larga #9A-47",
      "canalVirtual": "Sede Electrónica Oficial y Ventanilla Única",
      "web": "https://ipcc.gov.co"
    },
    "palabrasClave": [
      "cultura",
      "arte",
      "musica",
      "baile",
      "fiestas de noviembre",
      "champeta",
      "patrimonio inmaterial",
      "bibliotecas barriales",
      "casas de cultura"
    ]
  },
  {
    "id": "dep-etcar",
    "codigo": "ETCAR",
    "sigla": "ETCAR",
    "nombre": "Escuela Taller Cartagena de Indias",
    "tipo": "ente_descentralizado",
    "dimensionesPrincipales": [
      "personal",
      "comunitaria",
      "economica"
    ],
    "competenciaSeguridadHumana": "Custodia y dinamización social de las Fortificaciones y Murallas de Cartagena, erradicación de focos de inseguridad en baluartes y formación técnica a jóvenes.",
    "misionPlanAccion2026": "Conservar, restaurar y dinamizar socialmente el patrimonio fortificado, erradicando zonas oscuras y focos de inseguridad en murallas.",
    "avancePlanAccion2026": 47.0,
    "presupuesto2026Cop": "2.300 Millones",
    "fuentesFinanciacion": [
      "Explotación Comercial",
      "ICLD"
    ],
    "metasPriorizadas": [
      "Mantenimiento y seguridad integral en 11 km de murallas y Castillo San Felipe",
      "Iluminación y recuperación de 8 baluartes para erradicar focos delictivos",
      "200 jóvenes becados en oficios tradicionales de restauración patrimonial"
    ],
    "territoriosPrioritarios": [
      "loc-1",
      "rural-insular"
    ],
    "entidadesCorresponsables": [
      "TURISMO",
      "CENTRO HISTORICO",
      "SICC"
    ],
    "canalAtencion": {
      "direccion": "Centro Histórico, Baluarte San Pedro Mártir",
      "canalVirtual": "Sede Electrónica Oficial y Ventanilla Única",
      "web": "https://fortificacionescartagena.com.co"
    },
    "palabrasClave": [
      "murallas",
      "baluartes",
      "castillo de san felipe",
      "bocachica",
      "patrimonio fortificado",
      "preservacion historica",
      "escuela taller"
    ]
  },
  {
    "id": "dep-distriseguridad",
    "codigo": "DISTRISEG",
    "sigla": "DISTRISEGURIDAD",
    "nombre": "Distriseguridad",
    "tipo": "ente_descentralizado",
    "dimensionesPrincipales": [
      "personal",
      "crisis"
    ],
    "competenciaSeguridadHumana": "Tecnología para la seguridad ciudadana: red de cámaras de videovigilancia, alarmas comunitarias, radioenlaces y apoyo logístico al C4 de la Policía.",
    "misionPlanAccion2026": "Suministrar infraestructura tecnológica de punta, videovigilancia con IA y alarmas comunitarias conectadas al C4 de la Policía.",
    "avancePlanAccion2026": 44.2,
    "presupuesto2026Cop": "2.000 Millones",
    "fuentesFinanciacion": [
      "FONSET"
    ],
    "metasPriorizadas": [
      "1.200 cámaras de videovigilancia con analítica de IA integradas al C4",
      "80 sistemas de alarmas comunitarias activadas en barrios con altos índices de hurto",
      "Mantenimiento tecnológico integral y equipamiento de 45 CAI y estaciones MECAR"
    ],
    "territoriosPrioritarios": [
      "loc-1",
      "loc-2",
      "loc-3"
    ],
    "entidadesCorresponsables": [
      "SICC",
      "DATT",
      "TIC"
    ],
    "canalAtencion": {
      "direccion": "Manga, Callejón Dandy #27-55",
      "canalVirtual": "Sede Electrónica Oficial y Ventanilla Única",
      "web": "https://distriseguridad.gov.co"
    },
    "palabrasClave": [
      "camaras de seguridad",
      "alarmas",
      "c4",
      "cai",
      "vigilancia",
      "tecnologia policial",
      "radios",
      "sirenas",
      "patrullas",
      "motos de policia"
    ]
  },
  {
    "id": "dep-transcaribe",
    "codigo": "TRANSCARIBE",
    "sigla": "TRANSCARIBE",
    "nombre": "Transcaribe S.A. (Sistema Integrado de Transporte Masivo)",
    "tipo": "empresa_industrial",
    "dimensionesPrincipales": [
      "personal",
      "ambiental"
    ],
    "competenciaSeguridadHumana": "Seguridad y prevención del acoso a mujeres en estaciones y buses, conectividad con zonas periféricas e intermodalidad limpia.",
    "misionPlanAccion2026": "Proveer transporte público digno, accesible y seguro, implementando protocolos de prevención del acoso a mujeres y combate al fraude.",
    "avancePlanAccion2026": 39.6,
    "presupuesto2026Cop": "5.000 Millones",
    "fuentesFinanciacion": [
      "Tarifa",
      "FET",
      "ICLD"
    ],
    "metasPriorizadas": [
      "100% de la flota de buses articulados y padrones con cámaras interiores activas",
      "Botón violeta anti-acoso y protocolos de género en las 18 estaciones troncales",
      "Expansión de cobertura de rutas alimentadoras hacia Nelson Mandela y El Pozón"
    ],
    "territoriosPrioritarios": [
      "loc-1",
      "loc-2",
      "loc-3"
    ],
    "entidadesCorresponsables": [
      "DATT",
      "SICC",
      "PARTICIPACION"
    ],
    "canalAtencion": {
      "direccion": "Barrio España, Avenida Pedro de Heredia Calle 30 #39B-150",
      "canalVirtual": "Sede Electrónica Oficial y Ventanilla Única",
      "web": "https://transcaribe.gov.co"
    },
    "palabrasClave": [
      "transcaribe",
      "bus",
      "estacion",
      "rutas alimentadoras",
      "acoso en transporte",
      "pasajes",
      "colados",
      "paraderos"
    ]
  },
  {
    "id": "dep-colmayor",
    "codigo": "COLMAYOR",
    "sigla": "U MAYOR",
    "nombre": "Institución Universitaria Mayor de Cartagena",
    "tipo": "institucion_educativa",
    "dimensionesPrincipales": [
      "economica",
      "comunitaria"
    ],
    "competenciaSeguridadHumana": "Oferta de educación superior técnica y tecnológica orientada a jóvenes de sectores vulnerables para romper ciclos de delincuencia.",
    "misionPlanAccion2026": "Brindar educación superior pública y técnica pertinente a jóvenes de estratos 1 y 2 para cerrar brechas de empleabilidad.",
    "avancePlanAccion2026": 43.8,
    "presupuesto2026Cop": "9.400 Millones",
    "fuentesFinanciacion": [
      "SGP",
      "ICLD",
      "Matrícula Cero"
    ],
    "metasPriorizadas": [
      "Gratuidad educativa asegurada para 4.500 estudiantes de sectores vulnerables",
      "Apertura de la sede académica distrital en la Localidad 2 (El Pozón/Olaya)",
      "6 nuevos programas técnicos y tecnológicos orientados a la industria portuaria y digital"
    ],
    "territoriosPrioritarios": [
      "loc-1",
      "loc-2",
      "loc-3"
    ],
    "entidadesCorresponsables": [
      "EDUCACION",
      "PES-PR",
      "TIC"
    ],
    "canalAtencion": {
      "direccion": "Centro Histórico, Calle de la Factoría #36-27",
      "canalVirtual": "Sede Electrónica Oficial y Ventanilla Única",
      "web": "https://umayor.edu.co"
    },
    "palabrasClave": [
      "universidad",
      "becas",
      "educacion superior",
      "carreras tecnicas",
      "jovenes",
      "colmayor",
      "empleo juvenil",
      "matricula cero"
    ]
  },
  {
    "id": "dep-oagrd",
    "codigo": "OAGRD",
    "sigla": "OAGRD",
    "nombre": "Oficina Asesora para la Gestión del Riesgo de Desastres",
    "tipo": "unidad_asesora",
    "dimensionesPrincipales": [
      "crisis",
      "ambiental"
    ],
    "competenciaSeguridadHumana": "Prevención, mitigación y respuesta ante emergencias climáticas, alertas por inundaciones, marejadas y deslizamientos en laderas de La Popa.",
    "misionPlanAccion2026": "Coordinar la gestión del riesgo de desastres, el monitoreo hidroclimático y la respuesta humanitaria ante calamidades públicas.",
    "avancePlanAccion2026": 24.8,
    "presupuesto2026Cop": "1.500 Millones",
    "fuentesFinanciacion": [
      "Fondo de Gestión del Riesgo",
      "ICLD"
    ],
    "metasPriorizadas": [
      "Sistema de Alertas Tempranas (SAT) hidrometeorológico en 8 arroyos críticos",
      "Monitoreo geotécnico de 14 zonas con riesgo de deslizamiento en cerro de La Popa",
      "Reubicación preventiva de 180 familias ante riesgo inminente de remoción en masa"
    ],
    "territoriosPrioritarios": [
      "loc-1",
      "loc-2",
      "loc-3",
      "rural-insular"
    ],
    "entidadesCorresponsables": [
      "BOMBEROS",
      "CORVIVIENDA",
      "EPA",
      "INFRAESTRUCTURA"
    ],
    "canalAtencion": {
      "direccion": "Manga, 4ta Avenida Calle 29 #23-45",
      "canalVirtual": "Sede Electrónica Oficial y Ventanilla Única",
      "web": "https://oagrd.cartagena.gov.co"
    },
    "palabrasClave": [
      "desastre natural",
      "inundacion",
      "ola invernal",
      "deslizamiento",
      "marea alta",
      "lluvia",
      "tormenta tropical",
      "alerta temprana",
      "arroyos",
      "derrumbe",
      "ayuda humanitaria"
    ]
  },
  {
    "id": "dep-bomberos",
    "codigo": "BOMBEROS",
    "sigla": "BOMBEROS",
    "nombre": "Cuerpo Oficial de Bomberos de Cartagena",
    "tipo": "unidad_asesora",
    "dimensionesPrincipales": [
      "crisis",
      "personal"
    ],
    "competenciaSeguridadHumana": "Atención y control de incendios estructurales y forestales en manglares, rescates acuáticos y contingencias en zona industrial de Mamonal.",
    "misionPlanAccion2026": "Proteger vidas y bienes mediante la atención profesional de incendios, rescates vehiculares, emergencias con materiales peligrosos y contingencias marinas.",
    "avancePlanAccion2026": 48.5,
    "presupuesto2026Cop": "7.800 Millones",
    "fuentesFinanciacion": [
      "Sobretasa Bomberil",
      "ICLD"
    ],
    "metasPriorizadas": [
      "Tiempo promedio de respuesta reducido a menos de 8 minutos en el casco urbano",
      "Adquisición de 4 nuevas máquinas extintoras y equipos de rescate acuático",
      "Inspección de seguridad humana y protección contra incendios en 1.500 establecimientos"
    ],
    "territoriosPrioritarios": [
      "loc-1",
      "loc-2",
      "loc-3",
      "rural-insular"
    ],
    "entidadesCorresponsables": [
      "OAGRD",
      "DADIS",
      "SICC"
    ],
    "canalAtencion": {
      "direccion": "Barrio Santa Lucía, Diagonal 31 #54-12",
      "canalVirtual": "Sede Electrónica Oficial y Ventanilla Única",
      "web": "https://bomberos.cartagena.gov.co"
    },
    "palabrasClave": [
      "incendio",
      "fuego",
      "rescate",
      "escape de gas",
      "corto circuito",
      "arbol caido",
      "abejas",
      "quema de manglar",
      "emergencia",
      "sirena",
      "bombero"
    ]
  },
  {
    "id": "dep-gepm",
    "codigo": "GEPM",
    "sigla": "GEPM",
    "nombre": "Gerencia de Espacio Público y Movilidad",
    "tipo": "unidad_asesora",
    "dimensionesPrincipales": [
      "personal",
      "economica"
    ],
    "competenciaSeguridadHumana": "Sostenibilidad y pacificación del espacio público, andenes peatonales y acuerdos de formalización con asociaciones de vendedores ambulantes.",
    "misionPlanAccion2026": "Garantizar el goce colectivo del espacio público mediante la concertación social con comerciantes informales y la liberación de andenes peatonales.",
    "avancePlanAccion2026": 35.6,
    "presupuesto2026Cop": "1.200 Millones",
    "fuentesFinanciacion": [
      "ICLD"
    ],
    "metasPriorizadas": [
      "Formalización y reubicación concertada de 450 vendedores ambulantes",
      "Recuperación de 18.000 m² de espacio público peatonal en Bazurto y La Matuna",
      "Plan de embellecimiento y pacificación del Centro Histórico y San Diego"
    ],
    "territoriosPrioritarios": [
      "loc-1",
      "loc-2",
      "loc-3"
    ],
    "entidadesCorresponsables": [
      "SICC",
      "DATT",
      "PES-PR"
    ],
    "canalAtencion": {
      "direccion": "Centro Histórico, Edificio Portobelo, Piso 2",
      "canalVirtual": "Sede Electrónica Oficial y Ventanilla Única",
      "web": "https://cartagena.gov.co/dependencias/espaciopublico"
    },
    "palabrasClave": [
      "espacio publico",
      "andenes",
      "vendedores ambulantes",
      "bazurto",
      "la matuna",
      "carretillas",
      "recuperacion de andenes",
      "ocupacion indebida"
    ]
  },
  {
    "id": "dep-gerencia-centro",
    "codigo": "GCH",
    "sigla": "CENTRO HISTORICO",
    "nombre": "Gerencia de Centro Histórico",
    "tipo": "unidad_asesora",
    "dimensionesPrincipales": [
      "personal",
      "comunitaria"
    ],
    "competenciaSeguridadHumana": "Articulación interinstitucional para la seguridad en el Centro Histórico, San Diego y Getsemaní: rumba segura, control de ruido y orden urbano.",
    "misionPlanAccion2026": "Articular de manera integral la seguridad, la habitabilidad y el ordenamiento en el Centro Histórico, San Diego y Getsemaní.",
    "avancePlanAccion2026": 45.0,
    "presupuesto2026Cop": ".800 Millones",
    "fuentesFinanciacion": [
      "ICLD"
    ],
    "metasPriorizadas": [
      "Estrategia \"Centro Histórico 24H Seguro y Habitable\" en marcha",
      "Control de decibeles y rumba segura en Getsemaní y Calle del Arsenal",
      "Cero tolerancia a la prostitución forzada y drogas en plazas emblemáticas"
    ],
    "territoriosPrioritarios": [
      "loc-1"
    ],
    "entidadesCorresponsables": [
      "SICC",
      "ETCAR",
      "TURISMO",
      "DATT"
    ],
    "canalAtencion": {
      "direccion": "Centro Histórico, Plaza de San Pedro Claver",
      "canalVirtual": "Sede Electrónica Oficial y Ventanilla Única",
      "web": "https://cartagena.gov.co/dependencias/centrohistorico"
    },
    "palabrasClave": [
      "centro historico",
      "san diego",
      "getsemani",
      "rumba segura",
      "ruido en bares",
      "prostitucion en centro",
      "torre del reloj",
      "plaza de los coches"
    ]
  },
  {
    "id": "dep-escuela-gob",
    "codigo": "EGL",
    "sigla": "ESCUELA GOBIERNO",
    "nombre": "Escuela de Gobierno y Liderazgo",
    "tipo": "unidad_asesora",
    "dimensionesPrincipales": [
      "comunitaria",
      "politica"
    ],
    "competenciaSeguridadHumana": "Pedagogía ciudadana de la legalidad, desarme de palabras, cultura tributaria y formación de líderes comunitarios en derechos humanos.",
    "misionPlanAccion2026": "Promover la cultura ciudadana, la pedagogía de la paz, la resolución dialogada de conflictos y el liderazgo democrático barrial.",
    "avancePlanAccion2026": 38.2,
    "presupuesto2026Cop": ".200 Millones",
    "fuentesFinanciacion": [
      "ICLD"
    ],
    "metasPriorizadas": [
      "12.000 ciudadanos capacitados en diálogo y resolución pacífica de conflictos",
      "Programa barrial \"Cartagena Libre de Riñas y Violencia Vecinal\"",
      "Observatorio de Cultura Ciudadana midiendo indicadores de confianza barrial"
    ],
    "territoriosPrioritarios": [
      "loc-1",
      "loc-2",
      "loc-3",
      "rural-insular"
    ],
    "entidadesCorresponsables": [
      "IDACCC",
      "PARTICIPACION",
      "SICC"
    ],
    "canalAtencion": {
      "direccion": "Pie de la Popa, Callejon de la Concretera #21-12",
      "canalVirtual": "Sede Electrónica Oficial y Ventanilla Única",
      "web": "https://escueladegobierno.cartagena.gov.co"
    },
    "palabrasClave": [
      "cultura ciudadana",
      "resolucion de conflictos",
      "dialogo",
      "desarme de palabras",
      "mediacion comunitaria",
      "lideres barriales",
      "pedagogia de paz"
    ]
  },
  {
    "id": "dep-tic",
    "codigo": "OTIC",
    "sigla": "TIC",
    "nombre": "Oficina Asesora de Informática y Telecomunicaciones (TIC)",
    "tipo": "unidad_asesora",
    "dimensionesPrincipales": [
      "politica",
      "personal"
    ],
    "competenciaSeguridadHumana": "Zonas WiFi comunitarias seguras, alfabetización digital barrial, infraestructura tecnológica de datos abiertos y ciberseguridad distrital.",
    "misionPlanAccion2026": "Impulsar la transformación digital distrital, la conectividad barrial gratuita y la ciberseguridad para la gobernanza abierta.",
    "avancePlanAccion2026": 39.0,
    "presupuesto2026Cop": "4.100 Millones",
    "fuentesFinanciacion": [
      "ICLD",
      "MINTIC"
    ],
    "metasPriorizadas": [
      "85 zonas WiFi comunitarias gratuitas y con filtro seguro en barrios priorizados",
      "Portal Distrital de Datos Abiertos y Trazabilidad Ciudadana POLIS",
      "Blindaje de la infraestructura distrital contra ciberataques y fugas de datos"
    ],
    "territoriosPrioritarios": [
      "loc-1",
      "loc-2",
      "loc-3",
      "rural-insular"
    ],
    "entidadesCorresponsables": [
      "GENERAL",
      "DISTRISEG",
      "PLANEACION"
    ],
    "canalAtencion": {
      "direccion": "Plaza de la Aduana, Palacio de la Aduana, Piso 3",
      "canalVirtual": "Sede Electrónica Oficial y Ventanilla Única",
      "web": "https://cartagena.gov.co/dependencias/tic"
    },
    "palabrasClave": [
      "wifi barrial",
      "internet gratis",
      "ciberseguridad",
      "datos abiertos",
      "tecnologia",
      "tramites digitales",
      "conectividad",
      "software"
    ]
  },
  {
    "id": "dep-loc-1",
    "codigo": "ALC-LOC-1",
    "sigla": "LOCALIDAD 1",
    "nombre": "Alcaldía Local 1: Histórica y del Caribe Norte",
    "tipo": "alcaldia_local",
    "dimensionesPrincipales": [
      "comunitaria",
      "personal"
    ],
    "competenciaSeguridadHumana": "Gobierno de proximidad en Centro Histórico, Getsemaní, Bocagrande, Castillogrande, La Boquilla, Manzanillo e Islas del Rosario.",
    "misionPlanAccion2026": "Ejercer la autoridad territorial de proximidad en la Localidad 1, coordinando inspecciones de policía, comisarías de familia y proyectos locales.",
    "avancePlanAccion2026": 22.2,
    "presupuesto2026Cop": "5.800 Millones",
    "fuentesFinanciacion": [
      "Fondo de Desarrollo Local 1"
    ],
    "metasPriorizadas": [
      "Dotación y modernización a 4 inspecciones de policía y comisarías de familia",
      "15 obras barriales de infraestructura comunitaria en La Boquilla y Canapote",
      "Comités locales de seguridad y convivencia activos en 18 barrios"
    ],
    "territoriosPrioritarios": [
      "loc-1",
      "rural-insular"
    ],
    "entidadesCorresponsables": [
      "SICC",
      "CENTRO HISTORICO",
      "DATT"
    ],
    "canalAtencion": {
      "direccion": "Country Club, Calle 30 #54-18",
      "canalVirtual": "Sede Electrónica Oficial y Ventanilla Única",
      "web": "https://alcaldialocal1.cartagena.gov.co"
    },
    "palabrasClave": [
      "localidad 1",
      "centro historico",
      "crespo",
      "canapote",
      "la boquilla",
      "manzanillo",
      "islas del rosario",
      "inspeccion de policia",
      "comisaria de familia"
    ]
  },
  {
    "id": "dep-loc-2",
    "codigo": "ALC-LOC-2",
    "sigla": "LOCALIDAD 2",
    "nombre": "Alcaldía Local 2: De la Virgen y Turística",
    "tipo": "alcaldia_local",
    "dimensionesPrincipales": [
      "comunitaria",
      "personal",
      "ambiental"
    ],
    "competenciaSeguridadHumana": "Gobierno de proximidad en Olaya Herrera, El Pozón, Boston, La Esperanza, Fredonia y entorno de la Ciénaga de la Virgen.",
    "misionPlanAccion2026": "Desplegar gobierno barrial en las comunidades ribereñas a la Ciénaga de la Virgen, resolviendo conflictos de convivencia y riesgo socioambiental.",
    "avancePlanAccion2026": 23.7,
    "presupuesto2026Cop": "8.200 Millones",
    "fuentesFinanciacion": [
      "Fondo de Desarrollo Local 2"
    ],
    "metasPriorizadas": [
      "20 obras comunitarias concertadas en El Pozón, Olaya y Boston",
      "Pacto barrial de no agresión y desarme juvenil entre sectores de Olaya",
      "Jornadas de saneamiento y protección de caños pluviales locales"
    ],
    "territoriosPrioritarios": [
      "loc-2"
    ],
    "entidadesCorresponsables": [
      "SICC",
      "EPA",
      "PES-PR",
      "INFRAESTRUCTURA"
    ],
    "canalAtencion": {
      "direccion": "Chiquinquirá, Calle 31D #58-30",
      "canalVirtual": "Sede Electrónica Oficial y Ventanilla Única",
      "web": "https://alcaldialocal2.cartagena.gov.co"
    },
    "palabrasClave": [
      "localidad 2",
      "olaya herrera",
      "el pozon",
      "boston",
      "la esperanza",
      "fredonia",
      "cienaga de la virgen",
      "inspeccion de policia local 2",
      "jal 2"
    ]
  },
  {
    "id": "dep-loc-3",
    "codigo": "ALC-LOC-3",
    "sigla": "LOCALIDAD 3",
    "nombre": "Alcaldía Local 3: Industrial y de la Bahía",
    "tipo": "alcaldia_local",
    "dimensionesPrincipales": [
      "comunitaria",
      "personal",
      "economica"
    ],
    "competenciaSeguridadHumana": "Gobierno de proximidad en Nelson Mandela, San José de los Campanos, Pasacaballos, Membrillal, Albornoz y territorio de Barú.",
    "misionPlanAccion2026": "Coordinar la seguridad humana en el corredor industrial y los asentamientos del sur de Cartagena y territorio insular de Barú.",
    "avancePlanAccion2026": 22.0,
    "presupuesto2026Cop": "7.500 Millones",
    "fuentesFinanciacion": [
      "Fondo de Desarrollo Local 3"
    ],
    "metasPriorizadas": [
      "Plan de choque contra la extorsión y el microtráfico en Nelson Mandela",
      "Adecuación de 10 caminos veredales y muelles comunales en Pasacaballos y Barú",
      "Dotación a las Casas de Justicia y frentes de seguridad de San José"
    ],
    "territoriosPrioritarios": [
      "loc-3",
      "rural-insular"
    ],
    "entidadesCorresponsables": [
      "SICC",
      "CORVIVIENDA",
      "OAGRD",
      "INFRAESTRUCTURA"
    ],
    "canalAtencion": {
      "direccion": "Biblioteca Distrital Jorge Artel, Los Ejecutivos",
      "canalVirtual": "Sede Electrónica Oficial y Ventanilla Única",
      "web": "https://alcaldialocal3.cartagena.gov.co"
    },
    "palabrasClave": [
      "localidad 3",
      "nelson mandela",
      "san jose de los campanos",
      "pasacaballos",
      "arroyohondo",
      "baru",
      "industrial",
      "fdl 3",
      "jal 3"
    ]
  }
];

export function obtenerDependenciaPorId(id: string): DependenciaDistrital | undefined {
  return DEPENDENCIAS_CARTAGENA_2026.find((d) => d.id === id || d.codigo.toLowerCase() === id.toLowerCase() || d.sigla?.toLowerCase() === id.toLowerCase());
}

export function obtenerDependenciasPorDimension(dimension: string): DependenciaDistrital[] {
  const norm = dimension.toLowerCase();
  return DEPENDENCIAS_CARTAGENA_2026.filter((d) =>
    d.dimensionesPrincipales.some((dim) => dim.toLowerCase().includes(norm) || norm.includes(dim.toLowerCase()))
  );
}

export function obtenerDependenciasPorTerritorio(territorioId: string): DependenciaDistrital[] {
  return DEPENDENCIAS_CARTAGENA_2026.filter((d) =>
    !d.territoriosPrioritarios || d.territoriosPrioritarios.includes(territorioId)
  );
}

export interface EnrutamientoCiudadanoResultado {
  dependenciaLider: DependenciaDistrital;
  entidadesAliadas: DependenciaDistrital[];
  dimensionPrincipal: {
    id: string;
    nombre: string;
    tokenBadge: string;
  };
  proyectosActivos: string[];
  puntajeCoincidencia: number;
  categoriaSugerida: string;
}

export function enrutarCasoCiudadano(
  textoConsulta: string,
  territorioId?: string
): EnrutamientoCiudadanoResultado {
  const q = textoConsulta.toLowerCase().trim();
  const palabras = q.split(/\s+/).filter((w) => w.length > 2);

  let mejorDependencia = DEPENDENCIAS_CARTAGENA_2026[0];
  let mejorPuntaje = -1;

  for (const dep of DEPENDENCIAS_CARTAGENA_2026) {
    let score = 0;
    const palabrasDep = dep.palabrasClave ?? [];
    for (const palabra of palabras) {
      if (palabrasDep.some((pk) => pk.includes(palabra) || palabra.includes(pk))) {
        score += 15;
      }
      if (dep.competenciaSeguridadHumana.toLowerCase().includes(palabra)) {
        score += 8;
      }
      if (dep.nombre.toLowerCase().includes(palabra)) {
        score += 12;
      }
    }

    if (territorioId && territorioId !== "todos" && dep.territoriosPrioritarios?.includes(territorioId)) {
      score += 5;
    }

    if (score > mejorPuntaje) {
      mejorPuntaje = score;
      mejorDependencia = dep;
    }
  }

  // Identificar aliadas
  const aliadasCodigos = mejorDependencia.entidadesCorresponsables ?? [];
  const entidadesAliadas = DEPENDENCIAS_CARTAGENA_2026.filter(
    (d) => d.id !== mejorDependencia.id && (aliadasCodigos.includes(d.sigla ?? "") || aliadasCodigos.includes(d.codigo))
  ).slice(0, 3);

  // Mapear dimensión
  const dimCodigo = mejorDependencia.dimensionesPrincipales[0] ?? "personal";
  const MAPA_DIMENSIONES: Record<string, { id: string; nombre: string; tokenBadge: string }> = {
    personal: { id: "d1", nombre: "Seguridad Personal y Ciudadana", tokenBadge: "var(--danger)" },
    comunitaria: { id: "d2", nombre: "Convivencia y Seguridad Comunitaria", tokenBadge: "var(--ember)" },
    ambiental: { id: "d3", nombre: "Seguridad Ambiental y del Entorno", tokenBadge: "var(--success)" },
    economica: { id: "d4", nombre: "Seguridad Económica y Medios de Vida", tokenBadge: "var(--warning)" },
    alimentaria: { id: "d5", nombre: "Seguridad Alimentaria y Nutricional", tokenBadge: "var(--warning)" },
    salud: { id: "d5", nombre: "Seguridad en Salud y Sanitaria", tokenBadge: "var(--danger)" },
    politica: { id: "d6", nombre: "Seguridad Política e Institucional", tokenBadge: "var(--info)" },
    crisis: { id: "d7", nombre: "Alertas Tempranas y Gestión del Riesgo", tokenBadge: "var(--danger)" },
  };

  const dimensionInfo = MAPA_DIMENSIONES[dimCodigo] ?? MAPA_DIMENSIONES.personal;

  return {
    dependenciaLider: mejorDependencia,
    entidadesAliadas,
    dimensionPrincipal: dimensionInfo,
    proyectosActivos: mejorDependencia.metasPriorizadas ?? [
      "Plan de intervención integral y patrullaje barrial concertado",
      "Mesa territorial de seguimiento y respuesta interinstitucional",
    ],
    puntajeCoincidencia: Math.max(mejorPuntaje, 10),
    categoriaSugerida: mejorDependencia.sigla ?? mejorDependencia.codigo,
  };
}
