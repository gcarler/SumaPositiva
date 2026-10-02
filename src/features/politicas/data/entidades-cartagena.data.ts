/**
 * POLIS — Catálogo Oficial de Dependencias de la Alcaldía Mayor de Cartagena de Indias (2026)
 * Fuente: Planes de Acción 2026 y Plan de Desarrollo 2024–2027 "Cartagena Ciudad de Derechos".
 * Articulado con las 7 Dimensiones de Seguridad Humana (Decreto 037 de 2026 del Ministerio del Interior).
 */

export interface DependenciaDistrital {
  id: string;
  codigo: string;
  nombre: string;
  sigla?: string;
  tipo: "secretaria" | "ente_descentralizado" | "unidad_asesora" | "alcaldia_local";
  dimensionesPrincipales: string[]; // Códigos de dimensión: "personal", "ambiental", etc.
  descripcion: string;
}

export const DEPENDENCIAS_CARTAGENA_2026: DependenciaDistrital[] = [
  // --- SECRETARÍAS DEL DESPACHO ---
  {
    id: "dep-sicc",
    codigo: "SICC",
    sigla: "SICC",
    nombre: "Secretaría del Interior y Convivencia Ciudadana",
    tipo: "secretaria",
    dimensionesPrincipales: ["personal", "comunitaria", "crisis"],
    descripcion: "Orden público, desarme, prevención del delito, convivencia ciudadana y articulación con MECAR y Distriseguridad.",
  },
  {
    id: "dep-participacion",
    codigo: "SPD",
    sigla: "SPD",
    nombre: "Secretaría de Participación y Desarrollo Social",
    tipo: "secretaria",
    dimensionesPrincipales: ["comunitaria", "alimentaria", "economica"],
    descripcion: "Poblaciones vulnerables, equidad de género, juventud, adulto mayor, comunidades étnicas y desarrollo rural (UMATA).",
  },
  {
    id: "dep-planeacion",
    codigo: "SPD-PLAN",
    sigla: "PLANEACION",
    nombre: "Secretaría de Planeación Distrital",
    tipo: "secretaria",
    dimensionesPrincipales: ["politica", "economica", "ambiental"],
    descripcion: "Dirección estratégica del desarrollo, formulación CONPES distrital, POT, SISBEN y seguimiento al Plan de Desarrollo.",
  },
  {
    id: "dep-educacion",
    codigo: "SED",
    sigla: "SED",
    nombre: "Secretaría de Educación Distrital",
    tipo: "secretaria",
    dimensionesPrincipales: ["personal", "alimentaria", "comunitaria"],
    descripcion: "Entornos escolares protegidos, permanencia estudiantil, Programa de Alimentación Escolar (PAE) y calidad educativa.",
  },
  {
    id: "dep-turismo",
    codigo: "STUR",
    sigla: "TURISMO",
    nombre: "Secretaría de Turismo",
    tipo: "secretaria",
    dimensionesPrincipales: ["personal", "economica"],
    descripcion: "Prevención estricta de ESCNNA en entornos turísticos, formalización del sector y control a cobros excesivos.",
  },
  {
    id: "dep-hacienda",
    codigo: "SHAC",
    sigla: "HACIENDA",
    nombre: "Secretaría de Hacienda Distrital",
    tipo: "secretaria",
    dimensionesPrincipales: ["economica", "politica"],
    descripcion: "Gestión presupuestal, administración de fondos especiales (FONSET) y consistencia fiscal plurianual.",
  },
  {
    id: "dep-infraestructura",
    codigo: "SINF",
    sigla: "INFRAESTRUCTURA",
    nombre: "Secretaría de Infraestructura",
    tipo: "secretaria",
    dimensionesPrincipales: ["ambiental", "personal"],
    descripcion: "Malla vial, infraestructura comunitaria, canalización de arroyos y alumbrado público en zonas oscuras.",
  },
  {
    id: "dep-general",
    codigo: "SGEN",
    sigla: "GENERAL",
    nombre: "Secretaría General",
    tipo: "secretaria",
    dimensionesPrincipales: ["politica"],
    descripcion: "Gobernanza interna, contratación pública transparente y atención al ciudadano.",
  },

  // --- ENTIDADES DESCENTRALIZADAS ---
  {
    id: "dep-dadis",
    codigo: "DADIS",
    sigla: "DADIS",
    nombre: "Departamento Administrativo Distrital de Salud",
    tipo: "ente_descentralizado",
    dimensionesPrincipales: ["salud", "alimentaria"],
    descripcion: "Atención primaria en salud, epidemiología (control de dengue), salud mental e inspección sanitaria de alimentos.",
  },
  {
    id: "dep-epa",
    codigo: "EPA",
    sigla: "EPA",
    nombre: "Establecimiento Público Ambiental (EPA Cartagena)",
    tipo: "ente_descentralizado",
    dimensionesPrincipales: ["ambiental"],
    descripcion: "Autoridad ambiental urbana: saneamiento de la Ciénaga de la Virgen, control de vertimientos y protección de manglares.",
  },
  {
    id: "dep-datt",
    codigo: "DATT",
    sigla: "DATT",
    nombre: "Departamento Administrativo de Tránsito y Transporte",
    tipo: "ente_descentralizado",
    dimensionesPrincipales: ["personal", "ambiental"],
    descripcion: "Seguridad vial, control operativo del transporte, Visión Cero fatalidades y movilidad sostenible.",
  },
  {
    id: "dep-pes",
    codigo: "PES-PR",
    sigla: "PES",
    nombre: "Plan de Emergencia Social - Pedro Romero",
    tipo: "ente_descentralizado",
    dimensionesPrincipales: ["economica", "alimentaria"],
    descripcion: "Superación de la pobreza extrema, seguridad alimentaria en comedores comunitarios y bancarización popular contra el 'gota a gota'.",
  },
  {
    id: "dep-corvivienda",
    codigo: "CORVIVIENDA",
    sigla: "CORVIVIENDA",
    nombre: "Fondo de Vivienda de Interés Social y Reforma Urbana",
    tipo: "ente_descentralizado",
    dimensionesPrincipales: ["economica", "ambiental"],
    descripcion: "Mejoramiento integral de vivienda, titulación de predios y reasentamiento de familias en zonas de alto riesgo.",
  },
  {
    id: "dep-idaccc",
    codigo: "IDACCC",
    sigla: "IDACCC",
    nombre: "Instituto Distrital de Acción Comunal y Ciudadana de Cartagena",
    tipo: "ente_descentralizado",
    dimensionesPrincipales: ["comunitaria", "politica"],
    descripcion: "Fortalecimiento técnico y organizativo de las Juntas de Acción Comunal (JAC) y liderazgos de base.",
  },
  {
    id: "dep-ipcc",
    codigo: "IPCC",
    sigla: "IPCC",
    nombre: "Instituto de Patrimonio y Cultura de Cartagena",
    tipo: "ente_descentralizado",
    dimensionesPrincipales: ["comunitaria"],
    descripcion: "Preservación del patrimonio cultural, fomento artístico comunitario y fortalecimiento de identidades afro e insulares.",
  },
  {
    id: "dep-distriseguridad",
    codigo: "DISTRISEG",
    sigla: "DISTRISEGURIDAD",
    nombre: "Distriseguridad",
    tipo: "ente_descentralizado",
    dimensionesPrincipales: ["personal", "crisis"],
    descripcion: "Tecnología para la seguridad, cámaras de videovigilancia, alarmas comunitarias y apoyo logístico a la fuerza pública.",
  },

  // --- UNIDADES ASESORAS Y ESPECIALES ---
  {
    id: "dep-oagrd",
    codigo: "OAGRD",
    sigla: "OAGRD",
    nombre: "Oficina Asesora para la Gestión del Riesgo de Desastres",
    tipo: "unidad_asesora",
    dimensionesPrincipales: ["crisis", "ambiental"],
    descripcion: "Prevención y atención de emergencias, inundaciones, deslizamientos en La Popa y respuesta a desastres climáticos.",
  },
  {
    id: "dep-gepm",
    codigo: "GEPM",
    sigla: "GEPM",
    nombre: "Gerencia de Espacio Público y Movilidad",
    tipo: "unidad_asesora",
    dimensionesPrincipales: ["personal", "economica"],
    descripcion: "Recuperación, sostenibilidad y regulación del espacio público, y concertación con el comercio informal.",
  },
  {
    id: "dep-escuela-gob",
    codigo: "EGL",
    sigla: "ESCUELA GOBIERNO",
    nombre: "Escuela de Gobierno y Liderazgo",
    tipo: "unidad_asesora",
    dimensionesPrincipales: ["comunitaria", "politica"],
    descripcion: "Cultura ciudadana, ética pública y pedagogía comunitaria de la no violencia.",
  },

  // --- ALCALDÍAS LOCALES ---
  {
    id: "dep-loc-1",
    codigo: "ALC-LOC-1",
    sigla: "LOCALIDAD 1",
    nombre: "Alcaldía Local 1: Histórica y del Caribe Norte",
    tipo: "alcaldia_local",
    dimensionesPrincipales: ["comunitaria", "personal"],
    descripcion: "Administración territorial local del Centro Histórico, San Diego, Getsemaní, Bocagrande, La Boquilla y zona insular norte.",
  },
  {
    id: "dep-loc-2",
    codigo: "ALC-LOC-2",
    sigla: "LOCALIDAD 2",
    nombre: "Alcaldía Local 2: De la Virgen y Turística",
    tipo: "alcaldia_local",
    dimensionesPrincipales: ["comunitaria", "personal", "ambiental"],
    descripcion: "Administración territorial local de Olaya Herrera, El Pozón, Boston, La Esperanza y entorno de la Ciénaga de la Virgen.",
  },
  {
    id: "dep-loc-3",
    codigo: "ALC-LOC-3",
    sigla: "LOCALIDAD 3",
    nombre: "Alcaldía Local 3: Industrial y de la Bahía",
    tipo: "alcaldia_local",
    dimensionesPrincipales: ["comunitaria", "personal", "economica"],
    descripcion: "Administración territorial local de Nelson Mandela, El Socorro, San José de los Campanos, Pasacaballos y zona de Barú.",
  },
];
