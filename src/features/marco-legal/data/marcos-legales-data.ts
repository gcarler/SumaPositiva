/**
 * POLIS — Marcos Jurídicos, Doctrinales y Normativos.
 *
 * Estructura de datos canónica que diferencia explícitamente:
 * 1. Pilar A: Política Pública de Seguridad Humana Integral (Distrito de Cartagena de Indias).
 * 2. Pilar B: Plataforma Cívica Digital, Ecosistema de Datos y Fe Pública POLIS (Ples SAS).
 */

export type AmbitoMarco = "politica" | "plataforma";

export interface NormaLegal {
  id: string;
  nombre: string;
  subtitulo?: string;
  enfasis: string;
  nivel: string;
  badgeVariant?: "ember" | "outline" | "info" | "success" | "secondary" | "default";
  puntos: string[];
  anclaId?: string;
  expandir?: boolean;
  citaOficial?: string;
}

export interface SeccionMarcoLegal {
  id: string;
  ambito: AmbitoMarco;
  epigrafe: string;
  titulo: string;
  tituloCorto: string;
  conteo: string;
  icono: "Landmark" | "BookOpen" | "Building2" | "Globe2" | "ShieldCheck" | "FileCode" | "Lock" | "Layers" | "MapPin" | "Coins";
  normas: NormaLegal[];
}

export interface PilarMarcoInfo {
  id: AmbitoMarco;
  nombre: string;
  subtitulo: string;
  entidad: string;
  descripcion: string;
  objeto: string;
  insignia: string;
  colorBorder: string;
  kpis: Array<{ etiqueta: string; valor: string }>;
}

export const PILARES_INFO: Record<AmbitoMarco, PilarMarcoInfo> = {
  politica: {
    id: "politica",
    nombre: "Política Pública de Seguridad Humana Integral",
    subtitulo: "Marco sustantivo, social y de convivencia ciudadana",
    entidad: "Distrito Turístico y Cultural de Cartagena de Indias",
    descripcion:
      "Garantía de derechos fundamentales, convivencia pacífica, dignidad humana y justicia social en las 3 localidades, 15 UCGs y zonas rural e insular de Cartagena de Indias.",
    objeto:
      "Regula los derechos de la población, los compromisos de las autoridades distritales, el diálogo en 35 mesas de trabajo territoriales y las 7 dimensiones canónicas de la Seguridad Humana.",
    insignia: "Cartagena de Indias · Mandato Distrital",
    colorBorder: "var(--ember)",
    kpis: [
      { etiqueta: "Nivel Territorial", valor: "Distrito Cartagena" },
      { etiqueta: "Mesas Territoriales", valor: "35 Mesas Censo" },
      { etiqueta: "Dimensiones", valor: "7 Dimensiones ONU" },
      { etiqueta: "Enfoque Primario", valor: "Acción sin Daño" },
    ],
  },
  plataforma: {
    id: "plataforma",
    nombre: "Plataforma Cívica Digital y Fe Pública POLIS",
    subtitulo: "Marco tecnológico, fe pública probatoria y gobernanza de datos",
    entidad: "Desarrollado y operado por Ples SAS para la deliberación ciudadana",
    descripcion:
      "Arquitectura de software cívico, equivalencia funcional de mensajes de datos, sellado inmutable SHA-256 de actas, despojo pericial de metadatos GPS/EXIF y cumplimiento estricto de Habeas Data.",
    objeto:
      "Regula la infraestructura transaccional, la custodia criptográfica de aportes ciudadanos, el principio de máxima divulgación de datos abiertos y la interoperabilidad geoespacial OGC/PostGIS.",
    insignia: "Ples SAS · Infraestructura & Fe Pública",
    colorBorder: "var(--color-primary-base, #0ea5e9)",
    kpis: [
      { etiqueta: "Equivalencia Legal", valor: "Ley 527 de 1999" },
      { etiqueta: "Protección de Datos", valor: "Ley 1581 (Habeas Data)" },
      { etiqueta: "Inmutabilidad", valor: "SHA-256 Criptográfico" },
      { etiqueta: "Participación Digital", valor: "Ley 1757 (Sentencia C-150)" },
    ],
  },
};

/**
 * Catálogo completo de secciones y normas organizado por ámbito.
 * Preserva estrictamente todas las anclas históricas:
 * #distrital, #constitucional, #nacional, #internacional, #salvaguardas
 * e incorpora las nuevas anclas tecnológicas:
 * #plataforma, #fe-publica, #datos-privacidad, #gobernanza-tecnologica, #ordenamiento-territorial
 */
export const SECCIONES_MARCO_LEGAL: SeccionMarcoLegal[] = [
  // =========================================================================
  // PILAR A: POLÍTICA PÚBLICA DE SEGURIDAD HUMANA INTEGRAL (CARTAGENA)
  // =========================================================================
  {
    id: "distrital",
    ambito: "politica",
    epigrafe: "Pilar 1 · Marco Distrital Cartagena",
    titulo: "Cartagena de Indias: Acuerdos y Decretos de la Política Pública",
    tituloCorto: "Marco Distrital Cartagena",
    conteo: "3 instrumentos",
    icono: "Building2",
    normas: [
      {
        id: "acuerdo-139-2024",
        nombre: "Acuerdo Distrital 139 de 2024",
        subtitulo: "Concejo Distrital de Cartagena de Indias",
        enfasis: "Plan de Desarrollo 2024–2027 “Cartagena, Ciudad de Derechos”",
        nivel: "Acuerdo Distrital",
        badgeVariant: "ember",
        anclaId: "distrital",
        puntos: [
          "Consagra la Línea Estratégica 1: Seguridad Humana como pilar articulador de la transformación distrital.",
          "Mandata la focalización de inversiones en reducción de brechas de desigualdad, prevención integral del delito y justicia social.",
          "Vincula las metas sectoriales del Distrito con el bienestar comunitario en las 3 localidades urbanas y el territorio insular y rural.",
        ],
        citaOficial: "Concejo Distrital de Cartagena de Indias, Acuerdo 139 de mayo de 2024.",
      },
      {
        id: "decreto-037-2026",
        nombre: "Decreto Distrital 037 de 2026",
        subtitulo: "Alcaldía Mayor de Cartagena de Indias",
        enfasis: "Política Pública de Seguridad Humana y Convivencia Ciudadana (PSHC)",
        nivel: "Decreto Distrital",
        badgeVariant: "ember",
        expandir: true,
        puntos: [
          "Ordena la formulación participativa, adopción e implementación de la Política Pública de Seguridad Humana y Convivencia Ciudadana en Cartagena.",
          "Institucionaliza las 35 mesas territoriales de co-creación ciudadana en las 15 Unidades Comuneras de Gobierno (UCG), corregimientos y zonas insulares.",
          "Establece la obligatoriedad de rendición de cuentas periódica y trazabilidad del ciclo de formulación.",
        ],
        citaOficial: "Despacho del Alcalde Mayor de Cartagena de Indias, Decreto 037 de enero de 2026.",
      },
      {
        id: "decreto-1070-2021",
        nombre: "Decreto Distrital 1070 de 2021",
        subtitulo: "Secretaría de Planeación Distrital de Cartagena",
        enfasis: "Ciclo Metodológico Oficial de Políticas Públicas Distritales",
        nivel: "Decreto Distrital",
        badgeVariant: "outline",
        puntos: [
          "Regula las etapas obligatorias para el ciclo de políticas públicas del Distrito: Alistamiento, Diagnóstico, Formulación, Implementación y Seguimiento.",
          "Exige la aplicación rigurosa de la Ficha de Estructuración Técnica y la concertación previa con los actores comunitarios.",
          "Garantiza la coherencia entre las metas del Plan de Desarrollo y los instrumentos de planeación de mediano y largo plazo.",
        ],
        citaOficial: "Alcaldía Mayor de Cartagena de Indias, Decreto 1070 del 11 de noviembre de 2021.",
      },
    ],
  },
  {
    id: "constitucional",
    ambito: "politica",
    epigrafe: "Pilar 1 · Fundamento Superior",
    titulo: "Constitución Política de Colombia (1991)",
    tituloCorto: "Constitución Política (1991)",
    conteo: "4 artículos",
    icono: "Landmark",
    normas: [
      {
        id: "art-1-cp",
        nombre: "Artículo 1 — Dignidad Humana y Democracia Participativa",
        enfasis: "Estado Social de Derecho y soberanía ciudadana",
        nivel: "Norma Superior",
        badgeVariant: "ember",
        puntos: [
          "Colombia se funda en el respeto de la dignidad humana, en el trabajo y la solidaridad de las personas que la integran y en la prevalencia del interés general.",
          "La democracia participativa y pluralista constituye la esencia del ordenamiento: las decisiones públicas cobran legitimidad mediante la deliberación ciudadana vinculante.",
        ],
      },
      {
        id: "art-2-cp",
        nombre: "Artículo 2 — Fines Esenciales del Estado",
        enfasis: "Protección efectiva de derechos y facilitación de la participación",
        nivel: "Norma Superior",
        badgeVariant: "ember",
        puntos: [
          "Son fines esenciales servir a la comunidad, promover la prosperidad general y garantizar la efectividad de los principios, derechos y deberes constitucionales.",
          "Las autoridades de la República están instituidas para proteger a todas las personas en su vida, honra, bienes, creencias y demás derechos y libertades.",
        ],
      },
      {
        id: "art-11-cp",
        nombre: "Artículo 11 — Derecho Fundamental a la Vida y Seguridad Personal",
        enfasis: "Inviolabilidad de la vida y deber distrital de protección",
        nivel: "Derecho Fundamental",
        badgeVariant: "ember",
        puntos: [
          "El derecho a la vida es inviolable. No habrá pena de muerte ni desaparición forzada.",
          "El deber de protección distrital no se agota en la ausencia de violencia física, sino que exige salvaguardar las condiciones materiales de supervivencia y dignidad humana.",
        ],
      },
      {
        id: "art-22-cp",
        nombre: "Artículo 22 — Derecho y Deber de la Paz",
        enfasis: "Convivencia pacífica y reconciliación territorial",
        nivel: "Norma Superior",
        badgeVariant: "ember",
        puntos: [
          "La paz es un derecho y un deber de obligatorio cumplimiento en todo el territorio de la Nación.",
          "Orienta las acciones distritales de desarme, mediación comunitaria de conflictos barriales y reconstrucción del tejido social en sectores históricamente segregados.",
        ],
      },
    ],
  },
  {
    id: "nacional",
    ambito: "politica",
    epigrafe: "Pilar 1 · Marco Nacional de Política Pública",
    titulo: "Marco Nacional: Plan de Desarrollo y Seguridad Humana",
    tituloCorto: "Marco Nacional (Ley 2294)",
    conteo: "1 ley rectora",
    icono: "BookOpen",
    normas: [
      {
        id: "ley-2294-2023",
        nombre: "Ley 2294 de 2023 — Plan Nacional de Desarrollo",
        subtitulo: "“Colombia Potencia Mundial de la Vida” (2022–2026)",
        enfasis: "Eje Transversal de Seguridad Humana y Justicia Social",
        nivel: "Ley de la República",
        badgeVariant: "outline",
        expandir: true,
        puntos: [
          "Redefine la seguridad del Estado hacia un paradigma centrado en la protección integral de las personas y sus medios de vida.",
          "Prioriza la superación de las privaciones multidimensionales: acceso a agua potable, saneamiento básico, soberanía alimentaria y entornos libres de violencia.",
          "Sincroniza la planeación distrital de Cartagena con las inversiones estratégicas de la Nación en convergencia regional y justicia ambiental.",
        ],
        citaOficial: "Congreso de la República de Colombia, Ley 2294 de mayo de 2023.",
      },
    ],
  },
  {
    id: "internacional",
    ambito: "politica",
    epigrafe: "Pilar 1 · Doctrina Internacional",
    titulo: "Consenso Global de Seguridad Humana (ONU y PNUD)",
    tituloCorto: "Doctrina ONU / PNUD",
    conteo: "3 instrumentos",
    icono: "Globe2",
    normas: [
      {
        id: "res-66-290-onu",
        nombre: "Resolución 66/290 de la Asamblea General de la ONU (2012)",
        subtitulo: "Naciones Unidas — Consenso Global",
        enfasis: "Tríada Canónica: Libertad frente al Miedo, Necesidad y Vivir con Dignidad",
        nivel: "Resolución ONU",
        badgeVariant: "info",
        puntos: [
          "Establece que la seguridad humana es un enfoque centrado en las personas, comprensivo, adaptado a cada contexto y orientado a la prevención.",
          "Libertad frente al miedo (Freedom from Fear): protección ante la violencia, la criminalidad y la impunidad.",
          "Libertad frente a la necesidad (Freedom from Want): garantía de condiciones materiales, salud, nutrición y educación.",
          "Libertad para vivir con dignidad (Freedom to Live in Dignity): ejercicio pleno de derechos humanos y no discriminación.",
        ],
      },
      {
        id: "informe-pnud-1994",
        nombre: "Informe sobre Desarrollo Humano del PNUD (1994)",
        subtitulo: "Programa de las Naciones Unidas para el Desarrollo",
        enfasis: "Siete Dimensiones Integrales de la Seguridad Humana",
        nivel: "Doctrina Global",
        badgeVariant: "info",
        puntos: [
          "Rompe el concepto restringido de defensa territorial militar para enfocar la seguridad en la vida cotidiana de la gente.",
          "Consagra las 7 dimensiones analíticas implementadas en POLIS: Económica, Alimentaria, Salud, Ambiental, Personal, Comunitaria y Política.",
        ],
      },
      {
        id: "agenda-2030-ods",
        nombre: "Agenda 2030 y Objetivos de Desarrollo Sostenible (ODS)",
        subtitulo: "Sistema de Naciones Unidas",
        enfasis: "Metas de Paz, Reducción de Desigualdades y Hábitat Sostenible",
        nivel: "Compromiso Internacional",
        badgeVariant: "info",
        puntos: [
          "Vinculación directa con el ODS 16 (Paz, Justicia e Instituciones Sólidas), ODS 11 (Ciudades y Comunidades Sostenibles) y ODS 10 (Reducción de Desigualdades).",
          "Métricas territoriales de POLIS alineadas con indicadores universales de hábitat pacífico e inclusión social.",
        ],
      },
    ],
  },
  {
    id: "salvaguardas",
    ambito: "politica",
    epigrafe: "Pilar 1 · Salvaguardas Éticas Distritales",
    titulo: "No Revictimización, Acción sin Daño y Enfoque Diferencial",
    tituloCorto: "Salvaguardas Éticas",
    conteo: "2 protocolos",
    icono: "ShieldCheck",
    normas: [
      {
        id: "accion-sin-dano",
        nombre: "Principio de Acción sin Daño y Confidencialidad Comunitaria",
        enfasis: "Protección integral de víctimas, reclamantes y líderes barriales",
        nivel: "Protocolo Ético",
        badgeVariant: "success",
        expandir: true,
        puntos: [
          "Regla rectora de POLIS: el aporte o testimonio ciudadano nunca debe incrementar el riesgo físico, psicológico o patrimonial de la persona que lo suministra.",
          "Reserva absoluta y disociación de identidad en testimonios comunitarios de zonas con presencia de actores armados o rentas criminales.",
          "Manejo humanitario y no instrumental de la memoria comunitaria durante las sesiones en las 35 mesas de trabajo.",
        ],
      },
      {
        id: "enfoque-diferencial",
        nombre: "Enfoque Diferencial, Étnico e Interseccional",
        enfasis: "Reconocimiento de vulnerabilidades específicas en el territorio",
        nivel: "Criterio de Justicia Social",
        badgeVariant: "success",
        puntos: [
          "Ponderación reforzada de las necesidades de comunidades afrodescendientes, negras, raizales, palenqueras e indígenas de Cartagena de Indias.",
          "Perspectiva de género y protección especializada contra la violencia machista y la trata de personas en zonas de alto flujo turístico.",
          "Garantía de accesibilidad universal para personas con discapacidad y personas adultas mayores en todas las herramientas del sistema.",
        ],
      },
    ],
  },

  // =========================================================================
  // PILAR B: PLATAFORMA CÍVICA DIGITAL, GOBERNANZA DE DATOS Y FE PÚBLICA (PLES SAS)
  // =========================================================================
  {
    id: "fe-publica",
    ambito: "plataforma",
    epigrafe: "Pilar 2 · Fe Pública Digital y Validez Probatoria",
    titulo: "Comercio Electrónico, Mensajes de Datos y Equivalencia Legal",
    tituloCorto: "Fe Pública y Ley 527",
    conteo: "2 normas rectoras",
    icono: "FileCode",
    normas: [
      {
        id: "ley-527-1999",
        nombre: "Ley 527 de 1999 — Mensajes de Datos y Firma Digital",
        subtitulo: "Régimen de Comercio Electrónico y Equivalencia Funcional",
        enfasis: "Sellado Criptográfico SHA-256 e Inmutabilidad de Actas Ciudadanas",
        nivel: "Ley de la República",
        badgeVariant: "ember",
        anclaId: "plataforma",
        expandir: true,
        puntos: [
          "Principio de equivalencia funcional: las actas, constancias de radicación y deliberaciones firmadas digitalmente en POLIS tienen idéntica validez probatoria que los documentos físicos en papel.",
          "Garantía de integridad de mensajes de datos: cada acta pericial de mesa territorial genera un hash criptográfico SHA-256 inmutable almacenado en base de datos transaccional.",
          "Fuerza probatoria ante organismos de control (Procuraduría, Contraloría, Personería Distrital) en caso de controversia sobre acuerdos comunitarios.",
        ],
        citaOficial: "Congreso de la República de Colombia, Ley 527 del 18 de agosto de 1999.",
      },
      {
        id: "decreto-2364-2012",
        nombre: "Decreto 2364 de 2012 — Firma Electrónica",
        subtitulo: "Ministerio de Comercio, Industria y Turismo",
        enfasis: "Validez y Confiabilidad en Mecanismos de Suscripción Digital",
        nivel: "Decreto Nacional",
        badgeVariant: "outline",
        puntos: [
          "Regula los requisitos de fiabilidad de los datos de creación de firma electrónica para constancias ciudadanas y radicación de iniciativas.",
          "Asocia de manera unívoca al firmante o relator comunitario con el contenido del acta de mesa concertada.",
        ],
      },
    ],
  },
  {
    id: "datos-privacidad",
    ambito: "plataforma",
    epigrafe: "Pilar 2 · Protección de Datos y Privacidad Comunitaria",
    titulo: "Habeas Data, Sanitización PII y Despojo de Metadatos",
    tituloCorto: "Habeas Data (Ley 1581)",
    conteo: "2 normas rectoras",
    icono: "Lock",
    normas: [
      {
        id: "ley-1581-2012",
        nombre: "Ley Estatutaria 1581 de 2012 y Decreto 1377 de 2013",
        subtitulo: "Régimen General de Protección de Datos Personales (Habeas Data)",
        enfasis: "Privacidad por Diseño y Sanitización Estricta de Datos Sensibles",
        nivel: "Ley Estatutaria",
        badgeVariant: "ember",
        expandir: true,
        puntos: [
          "Consentimiento informado, libre y previo de la ciudadanía antes de almacenar cualquier registro en la plataforma.",
          "Anonimización por defecto en los testimonios y opiniones de diagnóstico comunitario para impedir perfilamientos.",
          "Ejercicio irrestricto de derechos de conocer, actualizar y rectificar información ante el Oficial de Datos de Ples SAS.",
        ],
        citaOficial: "Congreso de la República de Colombia, Ley Estatutaria 1581 de octubre de 2012.",
      },
      {
        id: "protocolo-exif-gps",
        nombre: "Protocolo Pericial de Despojo de Metadatos EXIF / GPS",
        subtitulo: "Seguridad Operativa Ples SAS para POLIS",
        enfasis: "Blindaje de Evidencias Fotográficas contra Geolocalización Forzada",
        nivel: "Protocolo de Seguridad",
        badgeVariant: "success",
        puntos: [
          "Despojo algorítmico automatizado e irreversible de coordenadas GPS, fecha exacta y número de serie de cámara en cada fotografía subida por la comunidad.",
          "Neutraliza el riesgo de que actores armados o terceros hostiles ubiquen el domicilio o recorrido del denunciante comunal.",
          "Almacenamiento de evidencias en bóveda segura con enlaces firmados temporales (Secure Presigned URLs).",
        ],
      },
    ],
  },
  {
    id: "gobernanza-tecnologica",
    ambito: "plataforma",
    epigrafe: "Pilar 2 · Gobernanza Tecnológica y Veeduría Social",
    titulo: "Transparencia, Datos Abiertos y Función Administrativa Digital",
    tituloCorto: "Transparencia y Veeduría (1712 y 1757)",
    conteo: "3 normas rectoras",
    icono: "Layers",
    normas: [
      {
        id: "ley-1712-2014",
        nombre: "Ley 1712 de 2014 — Transparencia y Acceso a la Información",
        subtitulo: "Principio de Máxima Divulgación y Soberanía Cívica",
        enfasis: "Catálogo de Datos Abiertos e Interoperabilidad Libre de Barreras",
        nivel: "Ley Ordinaria",
        badgeVariant: "outline",
        puntos: [
          "Adopta el principio de máxima publicidad: la información sobre diagnósticos territoriales, metas de política e inversión es pública por mandato legal.",
          "Disponibilidad de microdatos y catálogos en formatos abiertos estructurados (JSON, CSV, GeoJSON) para periodistas de datos y academia.",
          "Cero barreras de acceso arancelarias o discriminatorias para consultar el avance de la Seguridad Humana.",
        ],
        citaOficial: "Congreso de la República de Colombia, Ley 1712 del 6 de marzo de 2014.",
      },
      {
        id: "ley-1757-2015",
        nombre: "Ley Estatutaria 1757 de 2015 y Sentencia C-150 de 2015",
        subtitulo: "Corte Constitucional — Estatuto de Participación Democrática",
        enfasis: "Veedurías Ciudadanas, Deliberación Inmutable y Control Social",
        nivel: "Estatuto Constitucional",
        badgeVariant: "ember",
        expandir: true,
        puntos: [
          "Protege y garantiza el derecho a la participación democrática en todas las etapas de la gestión pública.",
          "Reconoce el papel de las Veedurías Ciudadanas como órganos de fiscalización popular con derecho a acceder a soportes auténticos.",
          "La Sentencia C-150 de 2015 ratifica que los pactos comunitarios suscritos en procesos deliberativos constituyen compromisos de fe pública que deben ser honrados por las autoridades.",
        ],
        citaOficial: "Corte Constitucional de Colombia, Sentencia C-150 de 2015 (M.P. Mauricio González Escobar).",
      },
      {
        id: "art-209-cp-admin",
        nombre: "Artículo 209 — Principios de la Función Administrativa Digital",
        subtitulo: "Constitución Política de Colombia (1991)",
        enfasis: "Moralidad, Eficacia, Economía, Celeridad e Imparcialidad",
        nivel: "Norma Superior",
        badgeVariant: "outline",
        puntos: [
          "La función administrativa está al servicio de los intereses generales y se desarrolla con base en la igualdad, moralidad, celeridad y publicidad.",
          "POLIS implementa trazabilidad algorítmica para auditar tiempos de respuesta institucional a radicados ciudadanos (POL-2026-XXXX).",
          "La descentralización y desconcentración se materializan acercando el panel de gestión a las inspecciones de policía, comisarías y corregidurías.",
        ],
      },
    ],
  },
  {
    id: "ordenamiento-territorial",
    ambito: "plataforma",
    epigrafe: "Pilar 2 · Ordenamiento Territorial y Viabilidad Fiscal",
    titulo: "Modelado Espacial OGC, Consulta Previa Étnica y Reglas Fiscales",
    tituloCorto: "Territorio y Finanzas (388, 1454 y FONSET)",
    conteo: "3 normas rectoras",
    icono: "MapPin",
    normas: [
      {
        id: "ley-388-1454-loot",
        nombre: "Ley 388 de 1997 y Ley 1454 de 2011 (LOOT)",
        subtitulo: "Desarrollo Territorial y Ley Orgánica de Ordenamiento Territorial",
        enfasis: "Estandarización Cartográfica OGC y Modelado Espacial PostGIS",
        nivel: "Leyes Orgánicas",
        badgeVariant: "outline",
        puntos: [
          "Normalización geoespacial de la división político-administrativa de Cartagena: 3 Localidades, 15 UCGs, barrios y corregimientos.",
          "Capas geográficas interoperables bajo estándares del Open Geospatial Consortium (OGC) servidas desde PostGIS sin sesgos territoriales.",
          "Permite la superposición analítica de capas de conflictividad social sobre la zonificación del Plan de Ordenamiento Territorial (POT).",
        ],
      },
      {
        id: "convenio-169-oit",
        nombre: "Convenio 169 de la OIT y Artículo 330 C.P. — Consulta Previa",
        subtitulo: "Derecho Internacional Humanitario y Jurisprudencia Constitucional",
        enfasis: "Alertas Preventivas Automáticas de Consulta Previa Étnica",
        nivel: "Bloque de Constitucionalidad",
        badgeVariant: "ember",
        expandir: true,
        puntos: [
          "Garantía del derecho fundamental a la consulta previa, libre e informada de las comunidades étnicas titulares de territorios colectivos.",
          "El Geovisor y la plataforma POLIS disparan alertas automáticas preventivas cuando una iniciativa comunitaria intersecta áreas tituladas a Consejos Comunitarios de Comunidades Negras o Resguardos.",
          "Evita la nulidad jurídica de proyectos por omisión de consulta previa ante el Ministerio del Interior.",
        ],
      },
      {
        id: "reglas-fiscales-fonset",
        nombre: "Ley 418 de 1997 / Ley 1421 de 2010 (FONSET) y Ley 1483 de 2011",
        subtitulo: "Fondos Territoriales de Seguridad y Vigencias Futuras",
        enfasis: "Verificación Algorítmica de Viabilidad Fiscal y Fuentes de Financiación",
        nivel: "Régimen Fiscal",
        badgeVariant: "outline",
        puntos: [
          "Alinea las propuestas ciudadanas de seguridad con los rubros elegibles de inversión del Fondo Territorial de Seguridad y Convivencia Ciudadana (FONSET).",
          "Aplica validaciones sobre la prohibición de comprometer vigencias futuras excepcionales sin aprobación previa del Concejo Distrital (Ley 1483 de 2011).",
          "Conecta la aspiración comunitaria con la realidad de ejecución presupuestal del Distrito de Cartagena.",
        ],
      },
    ],
  },
];
