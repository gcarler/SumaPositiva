/**
 * POLIS — Marcos Jurídicos, Doctrinales y Normativos.
 *
 * Estructura de datos canónica que diferencia explícitamente:
 * 1. Pilar A: Política Pública de Seguridad Humana Integral (Distrito de Cartagena de Indias).
 * 2. Pilar B: Plataforma Cívica Digital, datos y trazabilidad documental POLIS (Ples SAS).
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
  fuenteUrl?: string;
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
  "politica": {
    "id": "politica",
    "nombre": "Política Pública de Seguridad Humana Integral",
    "subtitulo": "Marco sustantivo, social y de convivencia ciudadana",
    "entidad": "Distrito Turístico y Cultural de Cartagena de Indias",
    "descripcion": "Referencias para la formulación y seguimiento de la política pública de Cartagena de Indias, con diferenciación entre normas nacionales y distritales.",
    "objeto": "Relaciona derechos, instrumentos territoriales y criterios de participación. Las 35 mesas son programación local; su conteo no se atribuye al decreto nacional.",
    "insignia": "Cartagena de Indias · Mandato Distrital",
    "colorBorder": "var(--ember)",
    "kpis": [
      {
        "etiqueta": "Ámbito",
        "valor": "Distrito de Cartagena"
      },
      {
        "etiqueta": "Programación local",
        "valor": "35 mesas programadas"
      },
      {
        "etiqueta": "Perfil analítico",
        "valor": "7 ejes POLIS"
      },
      {
        "etiqueta": "Enfoque",
        "valor": "Acción sin daño"
      }
    ]
  },
  "plataforma": {
    "id": "plataforma",
    "nombre": "Plataforma Cívica Digital POLIS",
    "subtitulo": "Tratamiento de datos y trazabilidad documental",
    "entidad": "Desarrollado y operado por Ples SAS para la deliberación ciudadana",
    "descripcion": "Ples SAS desarrolla y opera software cívico. La trazabilidad informática no constituye por sí sola certificación de una autoridad pública.",
    "objeto": "Marco de mensajes de datos, privacidad y controles de integridad. La valoración de un documento depende de requisitos y evidencias del caso concreto.",
    "insignia": "Ples SAS · Plataforma tecnológica",
    "colorBorder": "var(--info)",
    "kpis": [
      {
        "etiqueta": "Mensajes de datos",
        "valor": "Ley 527 de 1999"
      },
      {
        "etiqueta": "Protección de datos",
        "valor": "Ley 1581 (Habeas Data)"
      },
      {
        "etiqueta": "Integridad",
        "valor": "Registro SHA-256"
      },
      {
        "etiqueta": "Valoración",
        "valor": "Requisitos por documento"
      }
    ]
  }
};

export const SECCIONES_MARCO_LEGAL: SeccionMarcoLegal[] = [
  {
    "id": "distrital",
    "ambito": "politica",
    "epigrafe": "Pilar 1 · Marco Distrital Cartagena",
    "titulo": "Cartagena de Indias: Acuerdos y Decretos de la Política Pública",
    "tituloCorto": "Marco Distrital Cartagena",
    "conteo": "3 referencias",
    "icono": "Building2",
    "normas": [
      {
        "id": "acuerdo-139-2024",
        "nombre": "Acuerdo Distrital 139 de 2024",
        "subtitulo": "Concejo Distrital de Cartagena de Indias",
        "enfasis": "Plan de Desarrollo 2024–2027 “Cartagena, Ciudad de Derechos”",
        "nivel": "Acuerdo Distrital",
        "badgeVariant": "ember",
        "anclaId": "distrital",
        "puntos": [
          "Adopta el Plan de Desarrollo Distrital para el periodo 2024–2027.",
          "Sus programas y metas permiten contrastar las actuaciones de la política con la planeación del Distrito.",
          "La correspondencia con líneas, programas y presupuestos debe sustentarse en la versión oficial del plan."
        ],
        "citaOficial": "Concejo Distrital de Cartagena, Acuerdo 139 del 29 de mayo de 2024.",
        "fuenteUrl": "https://planeacion.cartagena.gov.co/sites/default/files/2024-05/ACUERDO-139-DE-2024-PLAN-DE-DESARROLLO-2024-2027-CARTAGENA-CIUDAD-DE-DERECHO.pdf"
      },
      {
        "id": "decreto-0730-2023",
        "nombre": "Decreto Distrital 0730 de 2023",
        "subtitulo": "Consejo de Política Económica y Social Distrital",
        "enfasis": "Organización del CONPES Distrital",
        "nivel": "Decreto Distrital",
        "badgeVariant": "ember",
        "puntos": [
          "El catálogo de Planeación Distrital lo identifica como la disposición que constituye el CONPES y sustituye el Decreto 1070 de 2021.",
          "Su alcance y los actos reglamentarios deben revisarse al tramitar la formulación, articulación y seguimiento de cada política."
        ],
        "citaOficial": "Secretaría de Planeación Distrital, catálogo PP Normativa: Decreto 0730 de 2023.",
        "fuenteUrl": "https://planeacion.cartagena.gov.co/pp-normativa"
      },
      {
        "id": "decreto-1070-2021",
        "nombre": "Decreto Distrital 1070 de 2021",
        "subtitulo": "Secretaría de Planeación Distrital de Cartagena",
        "enfasis": "Antecedente del CONPES Distrital; sustituido por el Decreto 0730 de 2023",
        "nivel": "Antecedente distrital",
        "badgeVariant": "outline",
        "puntos": [
          "Se conserva para reconstruir el marco utilizado por documentos anteriores.",
          "Planeación informa su derogatoria por el Decreto 0730 de 2023; no se presenta aquí como fundamento vigente del trámite actual."
        ],
        "citaOficial": "Secretaría de Planeación Distrital, PP Normativa: antecedente Decreto 1070 de 2021.",
        "fuenteUrl": "https://planeacion.cartagena.gov.co/pp-normativa"
      }
    ]
  },
  {
    "id": "constitucional",
    "ambito": "politica",
    "epigrafe": "Pilar 1 · Fundamento Superior",
    "titulo": "Constitución Política de Colombia (1991)",
    "tituloCorto": "Constitución Política (1991)",
    "conteo": "4 referencias",
    "icono": "Landmark",
    "normas": [
      {
        "id": "art-1-cp",
        "nombre": "Artículo 1 — Dignidad Humana y Democracia Participativa",
        "enfasis": "Estado Social de Derecho y soberanía ciudadana",
        "nivel": "Norma Superior",
        "badgeVariant": "ember",
        "puntos": [
          "Colombia es un Estado social de derecho fundado en la dignidad humana, el trabajo, la solidaridad y la prevalencia del interés general.",
          "La participación orienta la formulación de las políticas; el alcance vinculante de cada mecanismo depende de su régimen aplicable."
        ]
      },
      {
        "id": "art-2-cp",
        "nombre": "Artículo 2 — Fines Esenciales del Estado",
        "enfasis": "Protección efectiva de derechos y facilitación de la participación",
        "nivel": "Norma Superior",
        "badgeVariant": "ember",
        "puntos": [
          "Son fines esenciales servir a la comunidad, promover la prosperidad general y garantizar la efectividad de los principios, derechos y deberes constitucionales.",
          "Las autoridades de la República están instituidas para proteger a todas las personas en su vida, honra, bienes, creencias y demás derechos y libertades."
        ]
      },
      {
        "id": "art-11-cp",
        "nombre": "Artículo 11 — Derecho Fundamental a la Vida",
        "enfasis": "Inviolabilidad de la vida y deber distrital de protección",
        "nivel": "Derecho Fundamental",
        "badgeVariant": "ember",
        "puntos": [
          "Reconoce la inviolabilidad del derecho a la vida y prohíbe la pena de muerte.",
          "La lectura de este derecho debe distinguir el texto constitucional de los instrumentos territoriales utilizados para protegerlo."
        ]
      },
      {
        "id": "art-22-cp",
        "nombre": "Artículo 22 — Derecho y Deber de la Paz",
        "enfasis": "Convivencia pacífica y reconciliación territorial",
        "nivel": "Norma Superior",
        "badgeVariant": "ember",
        "puntos": [
          "La paz es un derecho y un deber de obligatorio cumplimiento en todo el territorio de la Nación.",
          "Orienta las acciones distritales de desarme, mediación comunitaria de conflictos barriales y reconstrucción del tejido social en sectores históricamente segregados."
        ]
      }
    ]
  },
  {
    "id": "nacional",
    "ambito": "politica",
    "epigrafe": "Pilar 1 · Marco Nacional de Política Pública",
    "titulo": "Marco Nacional: Plan de Desarrollo y Seguridad Humana",
    "tituloCorto": "Marco Nacional (Ley 2294)",
    "conteo": "2 referencias",
    "icono": "BookOpen",
    "normas": [
      {
        "id": "ley-2294-2023",
        "nombre": "Ley 2294 de 2023 — Plan Nacional de Desarrollo",
        "subtitulo": "“Colombia Potencia Mundial de la Vida” (2022–2026)",
        "enfasis": "Eje Transversal de Seguridad Humana y Justicia Social",
        "nivel": "Ley de la República",
        "badgeVariant": "outline",
        "expandir": true,
        "puntos": [
          "Adopta el Plan Nacional de Desarrollo 2022–2026 e incluye la transformación de seguridad humana y justicia social.",
          "La articulación con programas y recursos distritales exige comprobar instrumentos, competencias y presupuestos específicos."
        ],
        "citaOficial": "Congreso de la República de Colombia, Ley 2294 de mayo de 2023."
      },
      {
        "id": "decreto-037-2026",
        "nombre": "Decreto Nacional 0037 de 2026",
        "subtitulo": "Presidencia de la República · Ministerio del Interior",
        "enfasis": "Marco nacional de convivencia y seguridad humana",
        "nivel": "Decreto Nacional",
        "badgeVariant": "ember",
        "expandir": true,
        "puntos": [
          "Adopta la Política Pública de Convivencia y Seguridad Humana mediante una adición al Decreto 1066 de 2015.",
          "Es una referencia nacional para la articulación territorial. No acredita por sí mismo la adopción de una política distrital ni el número de sus mesas."
        ],
        "citaOficial": "Presidencia de la República, Decreto 0037 del 20 de enero de 2026.",
        "fuenteUrl": "https://dapre.presidencia.gov.co/normativa/normativa/DECRETO%20No.%200037%20DEL%2020%20DE%20ENERO%20DE%202026.pdf"
      }
    ]
  },
  {
    "id": "internacional",
    "ambito": "politica",
    "epigrafe": "Pilar 1 · Doctrina Internacional",
    "titulo": "Consenso Global de Seguridad Humana (ONU y PNUD)",
    "tituloCorto": "Doctrina ONU / PNUD",
    "conteo": "3 referencias",
    "icono": "Globe2",
    "normas": [
      {
        "id": "res-66-290-onu",
        "nombre": "Resolución 66/290 de la Asamblea General de la ONU (2012)",
        "subtitulo": "Naciones Unidas — Consenso Global",
        "enfasis": "Tríada Canónica: Libertad frente al Miedo, Necesidad y Vivir con Dignidad",
        "nivel": "Resolución ONU",
        "badgeVariant": "info",
        "puntos": [
          "Establece que la seguridad humana es un enfoque centrado en las personas, comprensivo, adaptado a cada contexto y orientado a la prevención.",
          "Libertad frente al miedo (Freedom from Fear): protección ante la violencia, la criminalidad y la impunidad.",
          "Libertad frente a la necesidad (Freedom from Want): garantía de condiciones materiales, salud, nutrición y educación.",
          "Libertad para vivir con dignidad (Freedom to Live in Dignity): ejercicio pleno de derechos humanos y no discriminación."
        ],
        "fuenteUrl": "https://docs.un.org/es/A/RES/66/290",
        "citaOficial": "Asamblea General de las Naciones Unidas, resolución A/RES/66/290."
      },
      {
        "id": "informe-pnud-1994",
        "nombre": "Informe sobre Desarrollo Humano del PNUD (1994)",
        "subtitulo": "Programa de las Naciones Unidas para el Desarrollo",
        "enfasis": "Siete Dimensiones Integrales de la Seguridad Humana",
        "nivel": "Doctrina Global",
        "badgeVariant": "info",
        "puntos": [
          "El informe distingue ámbitos económicos, alimentarios, sanitarios, ambientales, personales, comunitarios y políticos.",
          "El perfil analítico de POLIS documenta sus propias agrupaciones y equivalencias; no se atribuyen esas adaptaciones a la ONU."
        ],
        "fuenteUrl": "https://hdr.undp.org/content/human-development-report-1994",
        "citaOficial": "PNUD, Informe sobre Desarrollo Humano 1994."
      },
      {
        "id": "agenda-2030-ods",
        "nombre": "Agenda 2030 y Objetivos de Desarrollo Sostenible (ODS)",
        "subtitulo": "Sistema de Naciones Unidas",
        "enfasis": "Metas de Paz, Reducción de Desigualdades y Hábitat Sostenible",
        "nivel": "Compromiso Internacional",
        "badgeVariant": "info",
        "puntos": [
          "Los objetivos 16, 11 y 10 ofrecen referencias sobre paz, ciudades e inclusión.",
          "Cada indicador local debe documentar su correspondencia y diferencias antes de presentarse como una medición de una meta ODS."
        ],
        "fuenteUrl": "https://sdgs.un.org/2030agenda",
        "citaOficial": "Naciones Unidas, Agenda 2030 para el Desarrollo Sostenible."
      }
    ]
  },
  {
    "id": "salvaguardas",
    "ambito": "politica",
    "epigrafe": "Pilar 1 · Salvaguardas Éticas Distritales",
    "titulo": "No Revictimización, Acción sin Daño y Enfoque Diferencial",
    "tituloCorto": "Salvaguardas Éticas",
    "conteo": "2 referencias",
    "icono": "ShieldCheck",
    "normas": [
      {
        "id": "accion-sin-dano",
        "nombre": "Principio de Acción sin Daño y Confidencialidad Comunitaria",
        "enfasis": "Protección integral de víctimas, reclamantes y líderes barriales",
        "nivel": "Protocolo Ético",
        "badgeVariant": "success",
        "expandir": true,
        "puntos": [
          "Orienta la prevención de riesgos para víctimas, participantes y líderes durante la recepción y uso de testimonios.",
          "Requiere evaluar necesidad, reserva, minimización de datos y medidas de protección para cada proceso.",
          "Su enunciación no acredita por sí sola anonimato o reserva absoluta de todos los registros."
        ]
      },
      {
        "id": "enfoque-diferencial",
        "nombre": "Enfoque Diferencial, Étnico e Interseccional",
        "enfasis": "Reconocimiento de vulnerabilidades específicas en el territorio",
        "nivel": "Criterio de Justicia Social",
        "badgeVariant": "success",
        "puntos": [
          "Orienta el reconocimiento de necesidades y derechos de comunidades étnicas y poblaciones con vulnerabilidades específicas.",
          "La perspectiva de género y el enfoque de discapacidad deben traducirse en medidas comprobables en cada proceso.",
          "La accesibilidad requiere evaluaciones de las herramientas y contenidos, además de declarar el principio."
        ]
      }
    ]
  },
  {
    "id": "fe-publica",
    "ambito": "plataforma",
    "epigrafe": "Pilar 2 · Mensajes de datos e integridad",
    "titulo": "Trazabilidad documental y valoración de mensajes de datos",
    "tituloCorto": "Mensajes de datos (Ley 527)",
    "conteo": "2 referencias",
    "icono": "FileCode",
    "normas": [
      {
        "id": "ley-527-1999",
        "nombre": "Ley 527 de 1999 — Mensajes de Datos y Firma Digital",
        "subtitulo": "Régimen de Comercio Electrónico y Equivalencia Funcional",
        "enfasis": "Integridad, conservación y valoración de mensajes de datos",
        "nivel": "Ley de la República",
        "badgeVariant": "ember",
        "anclaId": "plataforma",
        "expandir": true,
        "puntos": [
          "La ley reconoce la admisibilidad de mensajes de datos y fija criterios para su valoración.",
          "La confiabilidad, integridad e identificación del iniciador deben examinarse en el caso concreto.",
          "Un hash permite contrastar contenido; no atribuye por sí solo identidad, firma digital ni fe pública a la plataforma."
        ],
        "citaOficial": "Congreso de la República de Colombia, Ley 527 del 18 de agosto de 1999.",
        "fuenteUrl": "https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=4276"
      },
      {
        "id": "decreto-2364-2012",
        "nombre": "Decreto 2364 de 2012 — Firma Electrónica",
        "subtitulo": "Ministerio de Comercio, Industria y Turismo",
        "enfasis": "Validez y Confiabilidad en Mecanismos de Suscripción Digital",
        "nivel": "Decreto Nacional",
        "badgeVariant": "outline",
        "puntos": [
          "Regula condiciones de confiabilidad de mecanismos de firma electrónica.",
          "La presencia de una cuenta o un hash no demuestra por sí sola que cada documento cumpla esos requisitos."
        ],
        "fuenteUrl": "https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=50583",
        "citaOficial": "Ministerio de Comercio, Industria y Turismo, Decreto 2364 de 2012."
      }
    ]
  },
  {
    "id": "datos-privacidad",
    "ambito": "plataforma",
    "epigrafe": "Pilar 2 · Protección de Datos y Privacidad Comunitaria",
    "titulo": "Habeas Data, Sanitización PII y Despojo de Metadatos",
    "tituloCorto": "Habeas Data (Ley 1581)",
    "conteo": "2 referencias",
    "icono": "Lock",
    "normas": [
      {
        "id": "ley-1581-2012",
        "nombre": "Ley Estatutaria 1581 de 2012 y Decreto 1377 de 2013",
        "subtitulo": "Régimen General de Protección de Datos Personales (Habeas Data)",
        "enfasis": "Principios, derechos y responsabilidades en el tratamiento de datos",
        "nivel": "Ley Estatutaria",
        "badgeVariant": "ember",
        "expandir": true,
        "puntos": [
          "El tratamiento debe respetar los principios y derechos definidos por la ley y su reglamentación.",
          "Las finalidades, bases jurídicas, medidas de protección y atención a titulares deben acreditarse por proceso.",
          "La publicación de información no elimina las restricciones aplicables a datos personales o sensibles."
        ],
        "citaOficial": "Congreso de la República de Colombia, Ley Estatutaria 1581 de octubre de 2012.",
        "fuenteUrl": "https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=49981"
      },
      {
        "id": "protocolo-exif-gps",
        "nombre": "Minimización de metadatos EXIF / GPS en imágenes",
        "subtitulo": "Seguridad Operativa Ples SAS para POLIS",
        "enfasis": "Control operativo de privacidad",
        "nivel": "Práctica operativa",
        "badgeVariant": "outline",
        "puntos": [
          "La eliminación de metadatos reduce exposición de información de una imagen; debe comprobarse en el flujo y formato correspondiente.",
          "No demuestra anonimato total ni elimina riesgos del contenido visible, de otros archivos o de sus enlaces.",
          "Los controles de almacenamiento y descarga se verifican por operación; no se atribuyen aquí garantías universales a todas las evidencias."
        ]
      }
    ]
  },
  {
    "id": "gobernanza-tecnologica",
    "ambito": "plataforma",
    "epigrafe": "Pilar 2 · Gobernanza Tecnológica y Veeduría Social",
    "titulo": "Transparencia, Datos Abiertos y Función Administrativa Digital",
    "tituloCorto": "Transparencia y Veeduría (1712 y 1757)",
    "conteo": "3 referencias",
    "icono": "Layers",
    "normas": [
      {
        "id": "ley-1712-2014",
        "nombre": "Ley 1712 de 2014 — Transparencia y Acceso a la Información",
        "subtitulo": "Principio de Máxima Divulgación y Soberanía Cívica",
        "enfasis": "Catálogo de Datos Abiertos e Interoperabilidad Libre de Barreras",
        "nivel": "Ley Ordinaria",
        "badgeVariant": "outline",
        "puntos": [
          "Regula el derecho de acceso a información pública y sus excepciones.",
          "La publicación debe distinguir información abierta, clasificada y reservada; la presencia en una plataforma no equivale a autorización universal de divulgación."
        ],
        "citaOficial": "Congreso de la República de Colombia, Ley 1712 del 6 de marzo de 2014.",
        "fuenteUrl": "https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=56882"
      },
      {
        "id": "ley-1757-2015",
        "nombre": "Ley Estatutaria 1757 de 2015 y Sentencia C-150 de 2015",
        "subtitulo": "Corte Constitucional — Estatuto de Participación Democrática",
        "enfasis": "Participación democrática y control social",
        "nivel": "Ley Estatutaria",
        "badgeVariant": "ember",
        "expandir": true,
        "puntos": [
          "Regula mecanismos de participación democrática y disposiciones de control social.",
          "La sentencia C-150 de 2015 revisó el proyecto estatutario. No se presenta como una certificación de fe pública de los registros de POLIS.",
          "La respuesta institucional a aportes debe distinguir obligaciones aplicables, estado del trámite y evidencia de cada actuación."
        ],
        "citaOficial": "Ley 1757 de 2015 y control constitucional C-150 de 2015.",
        "fuenteUrl": "https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=65335"
      },
      {
        "id": "art-209-cp-admin",
        "nombre": "Artículo 209 — Principios de la Función Administrativa",
        "subtitulo": "Constitución Política de Colombia (1991)",
        "enfasis": "Igualdad, moralidad, eficacia, economía, celeridad, imparcialidad y publicidad",
        "nivel": "Norma Superior",
        "badgeVariant": "outline",
        "puntos": [
          "La función administrativa sirve a los intereses generales y se desarrolla conforme a estos principios.",
          "La trazabilidad digital puede apoyar su seguimiento; la plataforma no sustituye las competencias ni las decisiones de las autoridades."
        ]
      }
    ]
  },
  {
    "id": "ordenamiento-territorial",
    "ambito": "plataforma",
    "epigrafe": "Pilar 2 · Ordenamiento Territorial y Viabilidad Fiscal",
    "titulo": "Modelado Espacial OGC, Consulta Previa Étnica y Reglas Fiscales",
    "tituloCorto": "Territorio y Finanzas (388, 1454 y FONSET)",
    "conteo": "3 referencias",
    "icono": "MapPin",
    "normas": [
      {
        "id": "ley-388-1454-loot",
        "nombre": "Ley 388 de 1997 y Ley 1454 de 2011 (LOOT)",
        "subtitulo": "Desarrollo Territorial y Ley Orgánica de Ordenamiento Territorial",
        "enfasis": "Planeación y organización territorial",
        "nivel": "Legislación territorial",
        "badgeVariant": "outline",
        "puntos": [
          "Ofrecen referencias para el ordenamiento y la organización territorial.",
          "La selección de geometrías y códigos requiere contrastar procedencia, versión y acto territorial; una capa cargada no acredita por sí sola un límite vigente.",
          "Un cruce espacial es un insumo analítico y no reemplaza una determinación de la autoridad competente."
        ]
      },
      {
        "id": "convenio-169-oit",
        "nombre": "Convenio 169 de la OIT y Artículo 330 C.P. — Consulta Previa",
        "subtitulo": "Derechos de los pueblos indígenas y tribales",
        "enfasis": "Identificación y revisión de posibles afectaciones",
        "nivel": "Bloque de Constitucionalidad",
        "badgeVariant": "ember",
        "expandir": true,
        "puntos": [
          "El Convenio 169, aprobado mediante la Ley 21 de 1991, contempla la consulta a pueblos interesados ante medidas susceptibles de afectarles directamente.",
          "La información territorial puede orientar la revisión de posibles afectaciones; no acredita que POLIS emita alertas automáticas ni sustituye el trámite ante las autoridades competentes."
        ],
        "fuenteUrl": "https://www1.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=37032",
        "citaOficial": "Ley 21 de 1991, aprobatoria del Convenio 169 de la OIT."
      },
      {
        "id": "reglas-fiscales-fonset",
        "nombre": "Ley 418 de 1997 / Ley 1421 de 2010 (FONSET) y Ley 1483 de 2011",
        "subtitulo": "Fondos Territoriales de Seguridad y Vigencias Futuras",
        "enfasis": "Revisión de fuentes y requisitos presupuestales",
        "nivel": "Régimen Fiscal",
        "badgeVariant": "outline",
        "puntos": [
          "Las propuestas de financiación deben contrastarse con las reglas del fondo y las competencias aplicables.",
          "La Ley 1483 de 2011 establece requisitos para vigencias futuras excepcionales en entidades territoriales.",
          "Una propuesta registrada en POLIS no acredita aprobación fiscal, disponibilidad presupuestal ni viabilidad jurídica."
        ],
        "fuenteUrl": "https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=44949",
        "citaOficial": "Ley 1483 de 2011. La elegibilidad FONSET requiere revisión específica del régimen aplicable."
      }
    ]
  }
];
