/**
 * POLIS — Censo Completo de Dependencias y Entes Descentralizados de Cartagena (2026)
 * Fuente Oficial: Informe de Seguimiento a Planes de Acción 2026 a corte 30 de junio de 2026
 * Plan de Desarrollo Distrital "Cartagena Ciudad de Derechos" (2024–2027).
 * Articulado con las 7 Dimensiones de Seguridad Humana (Decreto 037 de 2026 del Ministerio del Interior).
 */

export interface DependenciaDistrital {
  id: string;
  codigo: string;
  nombre: string;
  sigla?: string;
  tipo: "secretaria" | "ente_descentralizado" | "unidad_asesora" | "alcaldia_local" | "empresa_industrial" | "institucion_educativa";
  dimensionesPrincipales: string[]; // "personal", "comunitaria", "ambiental", "economica", "alimentaria", "salud", "politica", "crisis"
  competenciaSeguridadHumana: string;
}

export const DEPENDENCIAS_CARTAGENA_2026: DependenciaDistrital[] = [
  // ==========================================
  // 1. SECRETARÍAS DEL DESPACHO
  // ==========================================
  {
    id: "dep-sicc",
    codigo: "SICC",
    sigla: "SICC",
    nombre: "Secretaría del Interior y Convivencia Ciudadana",
    tipo: "secretaria",
    dimensionesPrincipales: ["personal", "comunitaria", "crisis"],
    competenciaSeguridadHumana: "Orden público, desarticulación de ollas/microtráfico, desarme barrial, convivencia ciudadana (Ley 1801) y articulación con MECAR y Distriseguridad.",
  },
  {
    id: "dep-participacion",
    codigo: "SPD",
    sigla: "PARTICIPACION",
    nombre: "Secretaría de Participación y Desarrollo Social",
    tipo: "secretaria",
    dimensionesPrincipales: ["comunitaria", "alimentaria", "economica"],
    competenciaSeguridadHumana: "Poblaciones diferenciales (mujeres, niñez, juventud, adulto mayor, discapacidad, LGBTIQ+), asuntos étnicos afro/indígenas y desarrollo agropecuario (UMATA).",
  },
  {
    id: "dep-planeacion",
    codigo: "SPD-PLAN",
    sigla: "PLANEACION",
    nombre: "Secretaría de Planeación Distrital",
    tipo: "secretaria",
    dimensionesPrincipales: ["politica", "economica", "ambiental"],
    competenciaSeguridadHumana: "Dirección estratégica distrital, adopción de políticas CONPES, ordenamiento territorial (POT), focalización Sisbén y seguimiento del PDD.",
  },
  {
    id: "dep-educacion",
    codigo: "SED",
    sigla: "EDUCACION",
    nombre: "Secretaría de Educación Distrital",
    tipo: "secretaria",
    dimensionesPrincipales: ["personal", "alimentaria", "comunitaria"],
    competenciaSeguridadHumana: "Entornos escolares seguros, prevención del acoso (bullying) y drogas, permanencia estudiantil y Programa de Alimentación Escolar (PAE).",
  },
  {
    id: "dep-turismo",
    codigo: "STUR",
    sigla: "TURISMO",
    nombre: "Secretaría de Turismo",
    tipo: "secretaria",
    dimensionesPrincipales: ["personal", "economica"],
    competenciaSeguridadHumana: "Prevención estricta de ESCNNA en entornos turísticos, playas y zona insular (Barú/Rosario), y control de cobros abusivos a turistas.",
  },
  {
    id: "dep-hacienda",
    codigo: "SHAC",
    sigla: "HACIENDA",
    nombre: "Secretaría de Hacienda Distrital",
    tipo: "secretaria",
    dimensionesPrincipales: ["economica", "politica"],
    competenciaSeguridadHumana: "Consistencia fiscal, recaudación distrital y administración de los recursos del Fondo de Seguridad Territorial (FONSET).",
  },
  {
    id: "dep-infraestructura",
    codigo: "SINF",
    sigla: "INFRAESTRUCTURA",
    nombre: "Secretaría de Infraestructura",
    tipo: "secretaria",
    dimensionesPrincipales: ["ambiental", "personal"],
    competenciaSeguridadHumana: "Recuperación de malla vial, canalización de canales pluviales mariales y expansión de alumbrado público LED en zonas oscuras.",
  },
  {
    id: "dep-general",
    codigo: "SGEN",
    sigla: "GENERAL",
    nombre: "Secretaría General",
    tipo: "secretaria",
    dimensionesPrincipales: ["politica"],
    competenciaSeguridadHumana: "Gobernanza institucional, atención ciudadana, contratación pública transparente y gestión documental distrital.",
  },

  // ==========================================
  // 2. DEPARTAMENTOS ADMINISTRATIVOS Y ENTES DESCENTRALIZADOS
  // ==========================================
  {
    id: "dep-dadis",
    codigo: "DADIS",
    sigla: "DADIS",
    nombre: "Departamento Administrativo Distrital de Salud",
    tipo: "ente_descentralizado",
    dimensionesPrincipales: ["salud", "alimentaria"],
    competenciaSeguridadHumana: "Atención primaria, salud mental para jóvenes, control epidemiológico de dengue/zika, inspección sanitaria de alimentos y reducción de desnutrición.",
  },
  {
    id: "dep-epa",
    codigo: "EPA",
    sigla: "EPA",
    nombre: "Establecimiento Público Ambiental (EPA Cartagena)",
    tipo: "ente_descentralizado",
    dimensionesPrincipales: ["ambiental"],
    competenciaSeguridadHumana: "Autoridad ambiental urbana: saneamiento de la Ciénaga de la Virgen, control de vertimientos ilegales, calidad del aire y protección de manglares.",
  },
  {
    id: "dep-datt",
    codigo: "DATT",
    sigla: "DATT",
    nombre: "Departamento Administrativo de Tránsito y Transporte",
    tipo: "ente_descentralizado",
    dimensionesPrincipales: ["personal", "ambiental"],
    competenciaSeguridadHumana: "Seguridad vial, control operativo al transporte informal riesgoso, Visión Cero fatalidades y pacificación de vías barriales.",
  },
  {
    id: "dep-pes",
    codigo: "PES-PR",
    sigla: "PES",
    nombre: "Plan de Emergencia Social - Pedro Romero",
    tipo: "ente_descentralizado",
    dimensionesPrincipales: ["economica", "alimentaria"],
    competenciaSeguridadHumana: "Superación de la pobreza extrema, red de comedores comunitarios, bancarización comunitaria contra el 'gota a gota' y habitabilidad básica.",
  },
  {
    id: "dep-corvivienda",
    codigo: "CORVIVIENDA",
    sigla: "CORVIVIENDA",
    nombre: "Fondo de Vivienda de Interés Social y Reforma Urbana",
    tipo: "ente_descentralizado",
    dimensionesPrincipales: ["economica", "ambiental"],
    competenciaSeguridadHumana: "Mejoramiento integral de vivienda, titulación de predios y reasentamiento digno de familias en zonas de alto riesgo de deslizamiento o inundación.",
  },
  {
    id: "dep-ider",
    codigo: "IDER",
    sigla: "IDER",
    nombre: "Instituto Distrital de Deporte y Recreación",
    tipo: "ente_descentralizado",
    dimensionesPrincipales: ["comunitaria", "personal"],
    competenciaSeguridadHumana: "Prevención de la violencia juvenil y reclutamiento mediante escuelas deportivas, 'barrismo social', adecuación de canchas y uso del tiempo libre.",
  },
  {
    id: "dep-idaccc",
    codigo: "IDACCC",
    sigla: "IDACCC",
    nombre: "Instituto Distrital de Acción Comunal y Ciudadana de Cartagena",
    tipo: "ente_descentralizado",
    dimensionesPrincipales: ["comunitaria", "politica"],
    competenciaSeguridadHumana: "Fortalecimiento organizativo y garantías para los dignatarios de las Juntas de Acción Comunal (JAC) y organizaciones de base ciudadana.",
  },
  {
    id: "dep-ipcc",
    codigo: "IPCC",
    sigla: "IPCC",
    nombre: "Instituto de Patrimonio y Cultura de Cartagena",
    tipo: "ente_descentralizado",
    dimensionesPrincipales: ["comunitaria"],
    competenciaSeguridadHumana: "Apropiación cultural comunitaria, salvaguardia del patrimonio afrodescendiente e insular y convivencia pacífica a través del arte.",
  },
  {
    id: "dep-etcar",
    codigo: "ETCAR",
    sigla: "ETCAR",
    nombre: "Escuela Taller Cartagena de Indias",
    tipo: "ente_descentralizado",
    dimensionesPrincipales: ["personal", "comunitaria", "economica"],
    competenciaSeguridadHumana: "Custodia y dinamización social de las Fortificaciones y Murallas de Cartagena, erradicación de focos de inseguridad en baluartes y formación técnica a jóvenes.",
  },
  {
    id: "dep-distriseguridad",
    codigo: "DISTRISEG",
    sigla: "DISTRISEGURIDAD",
    nombre: "Distriseguridad",
    tipo: "ente_descentralizado",
    dimensionesPrincipales: ["personal", "crisis"],
    competenciaSeguridadHumana: "Tecnología para la seguridad ciudadana: red de cámaras de videovigilancia, alarmas comunitarias, radioenlaces y apoyo logístico al C4 de la Policía.",
  },
  {
    id: "dep-transcaribe",
    codigo: "TRANSCARIBE",
    sigla: "TRANSCARIBE",
    nombre: "Transcaribe S.A. (Sistema Integrado de Transporte Masivo)",
    tipo: "empresa_industrial",
    dimensionesPrincipales: ["personal", "ambiental"],
    competenciaSeguridadHumana: "Seguridad y prevención del acoso a mujeres en estaciones y buses, conectividad con zonas periféricas e intermodalidad limpia.",
  },
  {
    id: "dep-colmayor",
    codigo: "COLMAYOR",
    sigla: "U MAYOR",
    nombre: "Institución Universitaria Mayor de Cartagena",
    tipo: "institucion_educativa",
    dimensionesPrincipales: ["economica", "comunitaria"],
    competenciaSeguridadHumana: "Oferta de educación superior técnica y tecnológica orientada a jóvenes de sectores vulnerables para romper ciclos de delincuencia.",
  },

  // ==========================================
  // 3. UNIDADES ASESORAS Y GERENCIAS ESPECIALES
  // ==========================================
  {
    id: "dep-oagrd",
    codigo: "OAGRD",
    sigla: "OAGRD",
    nombre: "Oficina Asesora para la Gestión del Riesgo de Desastres",
    tipo: "unidad_asesora",
    dimensionesPrincipales: ["crisis", "ambiental"],
    competenciaSeguridadHumana: "Prevención, mitigación y respuesta ante emergencias climáticas, alertas por inundaciones, marejadas y deslizamientos en laderas de La Popa.",
  },
  {
    id: "dep-bomberos",
    codigo: "BOMBEROS",
    sigla: "BOMBEROS",
    nombre: "Cuerpo Oficial de Bomberos de Cartagena",
    tipo: "unidad_asesora",
    dimensionesPrincipales: ["crisis", "personal"],
    competenciaSeguridadHumana: "Atención y control de incendios estructurales y forestales en manglares, rescates acuáticos y contingencias en zona industrial de Mamonal.",
  },
  {
    id: "dep-gepm",
    codigo: "GEPM",
    sigla: "GEPM",
    nombre: "Gerencia de Espacio Público y Movilidad",
    tipo: "unidad_asesora",
    dimensionesPrincipales: ["personal", "economica"],
    competenciaSeguridadHumana: "Sostenibilidad y pacificación del espacio público, andenes peatonales y acuerdos de formalización con asociaciones de vendedores ambulantes.",
  },
  {
    id: "dep-gerencia-centro",
    codigo: "GCH",
    sigla: "CENTRO HISTORICO",
    nombre: "Gerencia de Centro Histórico",
    tipo: "unidad_asesora",
    dimensionesPrincipales: ["personal", "comunitaria"],
    competenciaSeguridadHumana: "Articulación interinstitucional para la seguridad en el Centro Histórico, San Diego y Getsemaní: rumba segura, control de ruido y orden urbano.",
  },
  {
    id: "dep-escuela-gob",
    codigo: "EGL",
    sigla: "ESCUELA GOBIERNO",
    nombre: "Escuela de Gobierno y Liderazgo",
    tipo: "unidad_asesora",
    dimensionesPrincipales: ["comunitaria", "politica"],
    competenciaSeguridadHumana: "Pedagogía ciudadana de la legalidad, desarme de palabras, cultura tributaria y formación de líderes comunitarios en derechos humanos.",
  },
  {
    id: "dep-tic",
    codigo: "OTIC",
    sigla: "TIC",
    nombre: "Oficina Asesora de Informática y Telecomunicaciones (TIC)",
    tipo: "unidad_asesora",
    dimensionesPrincipales: ["politica", "personal"],
    competenciaSeguridadHumana: "Zonas WiFi comunitarias seguras, alfabetización digital barrial, infraestructura tecnológica de datos abiertos y ciberseguridad distrital.",
  },

  // ==========================================
  // 4. ALCALDÍAS LOCALES (GOBERNANZA TERRITORIAL)
  // ==========================================
  {
    id: "dep-loc-1",
    codigo: "ALC-LOC-1",
    sigla: "LOCALIDAD 1",
    nombre: "Alcaldía Local 1: Histórica y del Caribe Norte",
    tipo: "alcaldia_local",
    dimensionesPrincipales: ["comunitaria", "personal"],
    competenciaSeguridadHumana: "Gobierno de proximidad en Centro Histórico, Getsemaní, Bocagrande, Castillogrande, La Boquilla, Manzanillo e Islas del Rosario.",
  },
  {
    id: "dep-loc-2",
    codigo: "ALC-LOC-2",
    sigla: "LOCALIDAD 2",
    nombre: "Alcaldía Local 2: De la Virgen y Turística",
    tipo: "alcaldia_local",
    dimensionesPrincipales: ["comunitaria", "personal", "ambiental"],
    competenciaSeguridadHumana: "Gobierno de proximidad en Olaya Herrera, El Pozón, Boston, La Esperanza, Fredonia y entorno de la Ciénaga de la Virgen.",
  },
  {
    id: "dep-loc-3",
    codigo: "ALC-LOC-3",
    sigla: "LOCALIDAD 3",
    nombre: "Alcaldía Local 3: Industrial y de la Bahía",
    tipo: "alcaldia_local",
    dimensionesPrincipales: ["comunitaria", "personal", "economica"],
    competenciaSeguridadHumana: "Gobierno de proximidad en Nelson Mandela, San José de los Campanos, Pasacaballos, Membrillal, Albornoz y territorio de Barú.",
  },
];
