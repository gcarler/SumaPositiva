/**
 * POLIS — Contenido enriquecido para las mesas de trabajo de la agenda ciudadana.
 * Política Pública de Seguridad Humana Integral — Cartagena de Indias 2026–2036.
 */

export interface ContenidoMesa {
  proposito: string;
  ordenDelDia: string[];
  preguntasOrientadoras: string[];
  submesasSugeridas: { nombre: string; tema: string; participantes: number }[];
  resultadosEsperados: string[];
  marcoNormativo?: string[];
}

export const CONTENIDO_MESAS: Record<string, ContenidoMesa> = {
  // ── MESAS TERRITORIALES ─────────────────────────────────────────────
  "mt-001": {
    proposito:
      "Identificar y priorizar las problemáticas críticas de seguridad humana en los barrios del Centro Histórico, Getsemaní, San Diego, Cabrero, Marbella, Crespo y Pie de la Popa, articulando la protección del patrimonio con la convivencia y el bienestar comunitario.",
    ordenDelDia: [
      "Registro de asistentes e instalación institucional",
      "Presentación del diagnóstico situacional de la Localidad 1",
      "Distribución en submesas temáticas sobre el papelógrafo",
      "Deliberación comunitaria y construcción de árboles causa-efecto",
      "Plenaria de acuerdos y priorización de líneas de acción",
    ],
    preguntasOrientadoras: [
      "¿Cuáles son las tres principales amenazas a la seguridad personal y la tranquilidad que enfrenta en su barrio o sector?",
      "¿De qué manera el turismo masivo y las actividades comerciales nocturnas están impactando la convivencia y el derecho al descanso?",
      "¿Cuáles son las mayores fallas en los servicios públicos domiciliarios y drenajes pluviales en su comunidad?",
      "¿Qué alternativas propone para el ordenamiento del espacio público que concilien el trabajo informal y la libre circulación?",
    ],
    submesasSugeridas: [
      {
        nombre: "Seguridad personal y convivencia",
        tema: "Prevención del delito, iluminación y habitabilidad nocturna",
        participantes: 15,
      },
      {
        nombre: "Espacio público y movilidad",
        tema: "Gestión de andenes, vendedores informales y transporte multimodal",
        participantes: 14,
      },
      {
        nombre: "Economía local y protección social",
        tema: "Oportunidades de empleo digno y mitigación de brechas socioeconómicas",
        participantes: 12,
      },
      {
        nombre: "Medio ambiente y drenaje pluvial",
        tema: "Saneamiento de caños, gestión de residuos y protección costera",
        participantes: 10,
      },
    ],
    resultadosEsperados: [
      "Matriz consolidada de problemáticas prioritarias por UPZ de la Localidad 1",
      "Árbol de problemas acordado para la dimensión de seguridad personal y comunitaria",
      "Compromisos preliminares de articulación entre líderes comunitarios y dependencias distritales",
    ],
    marcoNormativo: [
      "Ley 1617 de 2013 (Régimen de Distritos)",
      "Ley 768 de 2002",
      "Acuerdo Distrital 041 de 2007 (Plan de Ordenamiento Territorial)",
    ],
  },

  "mt-002": {
    proposito:
      "Abordar integralmente las brechas históricas de seguridad alimentaria, ambiental y habitacional en las faldas de La Popa, Olaya Herrera, Pozón, Fredonia y la ribera de la Ciénaga de la Virgen, empoderando la participación ciudadana territorial.",
    ordenDelDia: [
      "Apertura metodológica y conformación de la mesa directiva comunitaria",
      "Contextualización de la vulnerabilidad socioambiental en la cuenca de la Ciénaga",
      "Trabajo en submesas de papelógrafo comunitario",
      "Socialización de árboles de soluciones por delegados comunitarios",
      "Firma del pacto preliminar de corresponsabilidad barrial",
    ],
    preguntasOrientadoras: [
      "¿Cuáles son los sectores con mayor riesgo de inundación y desbordamiento durante la temporada de lluvias?",
      "¿Cómo afecta el desabastecimiento de agua potable o las deficiencias de alcantarillado la salud de los niños y adultos mayores?",
      "¿Qué dinámicas de violencia urbana o barreras invisibles restringen la libre movilidad de los jóvenes en la localidad?",
      "¿Qué iniciativas de economía popular o comunitaria pueden fortalecer la soberanía alimentaria en los barrios periféricos?",
    ],
    submesasSugeridas: [
      {
        nombre: "Gestión del riesgo e inundaciones",
        tema: "Drenajes pluviales, caños y adaptación al cambio climático",
        participantes: 16,
      },
      {
        nombre: "Seguridad alimentaria y salud comunitaria",
        tema: "Acceso a alimentos básicos, agua potable y saneamiento básico",
        participantes: 15,
      },
      {
        nombre: "Jóvenes y prevención de violencia",
        tema: "Superación de fronteras invisibles, oportunidades formativas y cultura",
        participantes: 14,
      },
      {
        nombre: "Hábitat y servicios públicos",
        tema: "Mejoramiento integral de barrios, legalización y cobertura de servicios",
        participantes: 12,
      },
    ],
    resultadosEsperados: [
      "Cartografía social de zonas de alto riesgo por inundación y fallas de drenaje",
      "Árbol de causas directas e indirectas de la exclusión juvenil en la Localidad 2",
      "Hoja de ruta comunitaria para el plan de contingencia invernal y saneamiento de caños",
    ],
    marcoNormativo: [
      "Ley 1523 de 2012 (Sistema Nacional de Gestión del Riesgo)",
      "Ley 1454 de 2011 (LOOT)",
      "Sentencia T-025 de 2004 (Garantía de derechos fundamentales)",
    ],
  },

  "mt-003": {
    proposito:
      "Construir propuestas estratégicas para mitigar los impactos ambientales y de salud pública generados por el corredor industrial y portuario en Mamonal, Albornoz, Ceballos, Arroz Barato, Nelson Mandela y Policarpa, fortaleciendo el empleo local y la justicia ambiental.",
    ordenDelDia: [
      "Presentación de objetivos y marco de Seguridad Humana",
      "Diagnóstico ambiental y socioeconómico de la bahía y zona industrial",
      "Mesas de trabajo sobre papelógrafos con líderes comunales y gremiales",
      "Sistematización de problemas críticos y alternativas de desarrollo sostenible",
      "Lectura de acuerdos y designación de voceros para el seguimiento",
    ],
    preguntasOrientadoras: [
      "¿Qué impactos directos en la calidad del aire y del agua de la bahía perciben las familias del entorno de Mamonal?",
      "¿Qué barreras impiden que la mano de obra local acceda a los empleos generados por las industrias y terminales portuarios?",
      "¿Cuáles son los puntos críticos de seguridad vial y accidentalidad en la vía a Mamonal y accesos barriales?",
      "¿Qué equipamientos públicos de salud y recreación hacen falta con mayor urgencia en Nelson Mandela y sectores aledaños?",
    ],
    submesasSugeridas: [
      {
        nombre: "Justicia ambiental y calidad del aire",
        tema: "Monitoreo de emisiones, protección de la bahía y salud respiratoria",
        participantes: 14,
      },
      {
        nombre: "Empleabilidad e inclusión laboral",
        tema: "Formación técnica pertinente, cuotas de empleo local y encadenamientos productivos",
        participantes: 15,
      },
      {
        nombre: "Movilidad y seguridad vial industrial",
        tema: "Infraestructura para transporte público, ciclorrutas y cruces seguros",
        participantes: 12,
      },
      {
        nombre: "Equipamiento urbano y bienestar social",
        tema: "Centros de salud, parques comunitarios y servicios esenciales en Nelson Mandela",
        participantes: 14,
      },
    ],
    resultadosEsperados: [
      "Diagnóstico causal estructurado de pasivos ambientales e impactos en la salud",
      "Propuesta de acuerdo de corresponsabilidad empresarial-comunitaria para el empleo local",
      "Priorización de inversiones en equipamientos de salud y mitigación de riesgos viales",
    ],
    marcoNormativo: [
      "Ley 99 de 1993 (Sistema Nacional Ambiental)",
      "Decreto 1076 de 2015 (Reglamentario del Sector Ambiente)",
      "Ley 142 de 1994 (Servicios Públicos Domiciliarios)",
    ],
  },

  // ── MESAS RURALES E INSULARES ───────────────────────────────────────
  "mr-001": {
    proposito:
      "Concertar soluciones para la protección de la cultura pesquera tradicional, el territorio ancestral afrodescendiente, el control a la explotación turística no regulada y la titulación colectiva en el corregimiento de La Boquilla.",
    ordenDelDia: [
      "Saludo institucional y apertura por el Consejo Comunitario de La Boquilla",
      "Exposición de amenazas al territorio ancestral y ecosistema de manglar",
      "Ejercicio en papelógrafo por sectores (pescadores, mujeres, prestadores turísticos)",
      "Plenaria de concertación y validación de árboles causales",
      "Registro de actas y firma comunitaria",
    ],
    preguntasOrientadoras: [
      "¿Cuáles son las principales amenazas a la pesca artesanal y a la conservación de las ciénagas de la Virgen y Juan Polo?",
      "¿Qué medidas urgentes se requieren para proteger a niños y adolescentes frente a la explotación sexual asociada al turismo?",
      "¿Cómo garantizar que los beneficios de la actividad hotelera y gastronómica queden en las familias raizales?",
      "¿Cuál es el estado de la infraestructura educativa y de saneamiento básico en los sectores tradicionales?",
    ],
    submesasSugeridas: [
      {
        nombre: "Pesca tradicional y soberanía alimentaria",
        tema: "Reserva pesquera, caños de manglar y artes de pesca sostenibles",
        participantes: 14,
      },
      {
        nombre: "Protección a la niñez y prevención ESCNNA",
        tema: "Rutas de alerta temprana y entornos turísticos protectores",
        participantes: 12,
      },
      {
        nombre: "Turismo comunitario y economía afro",
        tema: "Regulación de carpas, embarcaciones y formalización productiva",
        participantes: 14,
      },
      {
        nombre: "Servicios públicos y ordenamiento costero",
        tema: "Alcantarillado, disposición de basuras y erosión costera",
        participantes: 10,
      },
    ],
    resultadosEsperados: [
      "Plan comunitario de defensa del territorio pesquero y de manglares",
      "Protocolo local de alerta temprana comunitaria contra la ESCNNA turística",
      "Matriz de proyectos prioritarios para saneamiento básico y drenaje costero",
    ],
    marcoNormativo: [
      "Ley 70 de 1993 (Derechos de las comunidades negras)",
      "Convenio 169 de la OIT",
      "Ley 679 de 2001 (Prevención de ESCNNA)",
    ],
  },

  "mr-002": {
    proposito:
      "Definir acciones prioritarias para la seguridad alimentaria, el acceso a agua potable constante, el impulso a la pequeña agricultura y la conectividad vial del corregimiento de Arroyo de Piedra.",
    ordenDelDia: [
      "Instalación comunitaria con la Junta de Acción Comunal y Consejo Comunitario",
      "Diagnóstico participativo del sector agropecuario y de servicios",
      "Formulación de problemas sobre papelógrafo con líderes rurales",
      "Priorización de soluciones y medios de financiamiento rural",
      "Conclusiones y validación de compromisos",
    ],
    preguntasOrientadoras: [
      "¿Cuáles son los mayores obstáculos para comercializar los productos agrícolas locales en los mercados de Cartagena?",
      "¿Cómo afecta la intermitencia en el suministro de agua la producción de alimentos y la higiene comunitaria?",
      "¿Qué vías terciarias o caminos veredales requieren mantenimiento urgente para garantizar la movilidad?",
      "¿Qué oportunidades educativas y de empleo tienen los jóvenes que egresan del colegio de bachillerato rural?",
    ],
    submesasSugeridas: [
      {
        nombre: "Producción agrícola y soberanía alimentaria",
        tema: "Riego, insumos orgánicos y centros de acopio campesino",
        participantes: 12,
      },
      {
        nombre: "Infraestructura hídrica y saneamiento",
        tema: "Pozos profundos, redes de acueducto y plantas potabilizadoras",
        participantes: 12,
      },
      {
        nombre: "Conectividad y vías rurales",
        tema: "Mejoramiento de carreteables veredales y transporte interveredal",
        participantes: 10,
      },
      {
        nombre: "Educación y relevo generacional",
        tema: "Formación técnica agropecuaria y emprendimientos juveniles rurales",
        participantes: 10,
      },
    ],
    resultadosEsperados: [
      "Inventario veredal de vías y fuentes hídricas críticas",
      "Árbol de problemas sobre desabastecimiento hídrico y baja rentabilidad agrícola",
      "Propuesta de circuito corto de comercialización con el Mercado de Bazurto",
    ],
    marcoNormativo: [
      "Ley 160 de 1994 (Reforma Agraria y Desarrollo Rural)",
      "Decreto Ley 902 de 2017",
      "Ley 1876 de 2017 (Sistema Nacional de Innovación Agropecuaria)",
    ],
  },

  "mr-003": {
    proposito:
      "Formular estrategias para salvaguardar el borde costero frente a la erosión marítima, promover la pesca responsable y asegurar la inversión social básica en el corregimiento afrodescendiente de Punta Canoa.",
    ordenDelDia: [
      "Apertura con autoridades locales y representantes comunitarios",
      "Presentación de evidencias técnicas sobre erosión costera y afectaciones ambientales",
      "Trabajo de construcción participativa en submesas",
      "Puesta en común de medios y fines en árbol de soluciones",
      "Acuerdos finales y firma del acta viva",
    ],
    preguntasOrientadoras: [
      "¿En qué medida la erosión de las playas está amenazando viviendas e infraestructura comunitaria?",
      "¿Qué necesidades de energía eléctrica, alumbrado público y agua potable no han sido resueltas?",
      "¿Qué proyectos de pesca artesanal o acuicultura pueden generar ingresos estables para las familias?",
      "¿Qué facilidades de transporte público existen para acceder a los centros de salud de la ciudad?",
    ],
    submesasSugeridas: [
      {
        nombre: "Defensa costera y gestión del riesgo marino",
        tema: "Obras de protección litoral, espolones y adaptación",
        participantes: 10,
      },
      {
        nombre: "Economía pesquera y comunitaria",
        tema: "Dotación de lanchas, motores ecológicos y cadena de frío",
        participantes: 12,
      },
      {
        nombre: "Servicios públicos y salud rural",
        tema: "Atención médica preventiva y saneamiento domiciliario",
        participantes: 10,
      },
      {
        nombre: "Identidad cultural y cohesión social",
        tema: "Preservación de saberes ancestrales y recreación comunitaria",
        participantes: 10,
      },
    ],
    resultadosEsperados: [
      "Priorización técnica comunitaria para obras de protección costera",
      "Diagnóstico de necesidades de la cadena de frío pesquera",
      "Ruta de atención primaria en salud para emergencias médicas",
    ],
    marcoNormativo: [
      "Ley 70 de 1993",
      "Decreto 2811 de 1974 (Código de Recursos Naturales)",
      "Sentencia T-080 de 2017 (Protección de derechos bioculturales)",
    ],
  },

  "mr-004": {
    proposito:
      "Atender la emergencia de saneamiento básico, culminación de obras de alcantarillado, seguridad en la vía nacional y fortalecimiento del centro de salud en el corregimiento de Bayunca.",
    ordenDelDia: [
      "Instalación y exposición de compromisos institucionales pendientes",
      "Estado del proyecto de alcantarillado y servicios esenciales",
      "Construcción de matrices de causas en submesas de trabajo",
      "Presentación de propuestas para la prevención de violencia y convivencia",
      "Conclusiones y suscripción de compromisos vinculantes",
    ],
    preguntasOrientadoras: [
      "¿Cuáles son los principales retrasos y consecuencias sanitarias de la falta de un sistema de alcantarillado completo?",
      "¿Qué puntos críticos de accidentalidad existen sobre la Carretera de La Cordialidad a su paso por el corregimiento?",
      "¿Cuenta el puesto de salud con dotación médica, ambulancia y medicamentos 24 horas?",
      "¿Qué espacios de deporte y recreación se requieren para alejar a la juventud del consumo de sustancias y bandas?",
    ],
    submesasSugeridas: [
      {
        nombre: "Alcantarillado y saneamiento ambiental",
        tema: "Seguimiento técnico a obras hidrosanitarias y vertimientos",
        participantes: 15,
      },
      {
        nombre: "Salud pública y urgencias",
        tema: "Dotación del centro de salud, brigadas y atención médica",
        participantes: 14,
      },
      {
        nombre: "Seguridad vial y convivencia urbana",
        tema: "Pasos peatonales seguros en La Cordialidad y patrullaje rural",
        participantes: 12,
      },
      {
        nombre: "Cultura, deporte y recreación juvenil",
        tema: "Canchas múltiples, escuelas deportivas y talleres culturales",
        participantes: 12,
      },
    ],
    resultadosEsperados: [
      "Mesa de veeduría comunitaria al alcantarillado de Bayunca",
      "Plan de contingencia médica y dotación del puesto de salud local",
      "Propuesta de señalización y reductores para la vía La Cordialidad",
    ],
    marcoNormativo: [
      "Ley 142 de 1994 (Servicios Públicos)",
      "Ley 715 de 2001 (Competencias en Salud y Educación)",
      "Ley 1801 de 2016 (Código Nacional de Policía y Convivencia)",
    ],
  },

  "mr-005": {
    proposito:
      "Construir acuerdos para el saneamiento ambiental del Canal del Dique, la reducción de la criminalidad, la inserción laboral de jóvenes en la zona industrial contigua y la mejora de la infraestructura social en Pasacaballos.",
    ordenDelDia: [
      "Apertura con líderes del Consejo Comunitario y organizaciones de base",
      "Contexto del megaproyecto del Canal del Dique y su impacto territorial",
      "Diligenciamiento de papelógrafos analizando causas y efectos",
      "Plenaria de concertación sobre oportunidades laborales y juventud",
      "Firma del acta de compromisos territoriales",
    ],
    preguntasOrientadoras: [
      "¿Cómo impactarán las obras de restauración del Canal del Dique la economía y el hábitat de las familias de Pasacaballos?",
      "¿Qué programas de choque son necesarios para frenar el sicariato, el microtráfico y la inseguridad barrial?",
      "¿Por qué las industrias petroquímicas y de astilleros cercanas no contratan proporcionalmente a los habitantes de la zona?",
      "¿Qué deficiencias existen en las instalaciones del colegio técnico y puestos de salud?",
    ],
    submesasSugeridas: [
      {
        nombre: "Canal del Dique y sostenibilidad ambiental",
        tema: "Mitigación de sedimentación, pesca de agua dulce y gobernanza hídrica",
        participantes: 15,
      },
      {
        nombre: "Seguridad ciudadana y prevención del delito",
        tema: "Inteligencia policial, protección comunitaria y atención psicosocial",
        participantes: 14,
      },
      {
        nombre: "Empleo industrial y capacitación técnica",
        tema: "Convenios SENA-Empresas de Mamonal para mano de obra local",
        participantes: 15,
      },
      {
        nombre: "Infraestructura social y servicios",
        tema: "Agua potable, recreación y mejoramiento de instituciones educativas",
        participantes: 12,
      },
    ],
    resultadosEsperados: [
      "Mesa de seguimiento a impactos sociales del megaproyecto Canal del Dique",
      "Plan de prevención de violencias con enfoque en juventudes en riesgo",
      "Acuerdo marco para convocatorias de empleo exclusivo y preferencial para Pasacaballos",
    ],
    marcoNormativo: [
      "Ley 70 de 1993",
      "Convenio 169 OIT",
      "Documento CONPES 3990 (Restaura y Conecta el Canal del Dique)",
    ],
  },

  "mr-006": {
    proposito:
      "Diseñar un plan de desarrollo rural con enfoque en reactivación agropecuaria, titulación de predios, energía eléctrica estable y conectividad digital para la población afrodescendiente de Arroyo Grande.",
    ordenDelDia: [
      "Registro de participantes y palabras de apertura comunitaria",
      "Diagnóstico participativo de necesidades agrícolas y de servicios",
      "Trabajo grupal en papelógrafos con productores y madres cabeza de hogar",
      "Presentación de árboles de problemas y formulación de objetivos",
      "Firma del pacto comunitario rural",
    ],
    preguntasOrientadoras: [
      "¿Qué dificultades existen para titular las tierras rurales y acceder a créditos agropecuarios del Banco Agrario?",
      "¿Cuáles son los sectores con mayores fluctuaciones o ausencias del fluido eléctrico e internet?",
      "¿Qué proyectos productivos avícolas, porcícolas o de hortalizas tienen mayor potencial en la zona?",
      "¿Cómo asegurar la permanencia de los docentes y la calidad educativa en la escuela rural?",
    ],
    submesasSugeridas: [
      {
        nombre: "Tierra, crédito y desarrollo agropecuario",
        tema: "Legalización predial, maquinaria comunitaria y fondos rotatorios",
        participantes: 12,
      },
      {
        nombre: "Energía, internet y conectividad",
        tema: "Normalización eléctrica, energía solar y zonas wifi rurales",
        participantes: 10,
      },
      {
        nombre: "Salud, agua y saneamiento",
        tema: "Brigadas médicas continuas y acceso a agua segura",
        participantes: 12,
      },
      {
        nombre: "Educación rural y liderazgo comunitario",
        tema: "Infraestructura escolar, transporte estudiantil y formación de líderes",
        participantes: 10,
      },
    ],
    resultadosEsperados: [
      "Mapa de conflictos de tenencia de tierra y necesidades de titulación",
      "Plan de fortalecimiento para asociaciones campesinas y productoras",
      "Requerimiento formal de normalización del servicio eléctrico rural",
    ],
    marcoNormativo: [
      "Ley 160 de 1994",
      "Decreto Ley 902 de 2017",
      "Ley 1715 de 2014 (Fuentes No Convencionales de Energía)",
    ],
  },

  "mr-007b": {
    proposito:
      "Garantizar la participación con enfoque étnico diferencial de la comunidad afrodescendiente de Barú, Ararca y Santa Ana, abordando la consulta previa, la protección de playones comunales y la soberanía hídrica.",
    ordenDelDia: [
      "Apertura con el Consejo Comunitario de Barú bajo protocolo étnico",
      "Contextualización de la Sentencia SU-123 de 2018 y derechos territoriales",
      "Trabajo en papelógrafos de mesas de trabajo por áreas temáticas",
      "Plenaria de concertación sobre turismo de bajo impacto y medio ambiente",
      "Cierre y firma del acta con veedores comunitarios",
    ],
    preguntasOrientadoras: [
      "¿Cuáles son los mayores impactos socioambientales generados por la presión turística desmedida en Playa Blanca y la ensenada?",
      "¿Qué avances y desafíos persisten en el suministro continuo de agua dulce para las familias nativas?",
      "¿Cómo hacer cumplir de manera estricta los protocolos de Consulta Previa frente a megaproyectos en la península?",
      "¿Qué estrategias garantizan que los ingresos turísticos se reinviertan en la educación y salud de los habitantes de Barú?",
    ],
    submesasSugeridas: [
      {
        nombre: "Consulta previa y derechos territoriales étnicos",
        tema: "Protección de predios ancestrales, títulos colectivos y gobernanza",
        participantes: 14,
      },
      {
        nombre: "Soberanía hídrica y saneamiento insular",
        tema: "Acueducto por gravedad, pozos desalinizadores y recolección de basuras",
        participantes: 12,
      },
      {
        nombre: "Turismo sostenible y economía comunitaria",
        tema: "Capacidad de carga de playas, cooperativas nativas y regulación de operadores",
        participantes: 14,
      },
      {
        nombre: "Salud, niñez y educación intercultural",
        tema: "Puesto de salud insular, prevención de vulneraciones y bachillerato técnico",
        participantes: 12,
      },
    ],
    resultadosEsperados: [
      "Protocolo comunitario de veeduría y aplicación de Consulta Previa (SU-123/18)",
      "Plan de acción para la gobernanza ambiental de Playa Blanca y áreas comunales",
      "Cronograma para la solución estructural del suministro de agua potable",
    ],
    marcoNormativo: [
      "Convenio 169 de la OIT",
      "Sentencia SU-123 de 2018 (Corte Constitucional)",
      "Ley 70 de 1993",
      "Decreto 1320 de 1998",
    ],
  },

  "mr-007": {
    proposito:
      "Priorizar la inversión en infraestructura básica, alcantarillado, educación secundaria técnica y protección del empleo local en el corregimiento de Santa Ana (Isla de Barú).",
    ordenDelDia: [
      "Palabras de bienvenida e instalación participativa",
      "Diagnóstico comunitario de obras inconclusas y servicios públicos",
      "Mesas de trabajo sobre papelógrafos con jóvenes y adultos",
      "Consolidación del árbol de soluciones territoriales",
      "Firma del compromiso de seguimiento",
    ],
    preguntasOrientadoras: [
      "¿Qué obstáculos han frenado la terminación de las redes de acueducto y alcantarillado en el casco poblado?",
      "¿Cómo vincular productivamente a la juventud de Santa Ana con las oportunidades hoteleras y ecoturísticas de la región?",
      "¿Cuáles son los requerimientos más urgentes en la Institución Educativa Barbacoas?",
      "¿Qué iniciativas comunitarias de reciclaje y aseo pueden implementarse para erradicar basureros satélites?",
    ],
    submesasSugeridas: [
      {
        nombre: "Servicios públicos y acueducto",
        tema: "Abastecimiento de agua potable y manejo de aguas residuales",
        participantes: 12,
      },
      {
        nombre: "Educación técnica y formación para el trabajo",
        tema: "Articulación SENA en hotelería, cocina tradicional y mecánica marina",
        participantes: 12,
      },
      {
        nombre: "Salud y prevención comunitaria",
        tema: "Atención médica permanente y ambulancia básica",
        participantes: 10,
      },
      {
        nombre: "Medio ambiente y manejo de residuos",
        tema: "Recolección oportuna, reciclaje comunal y protección de mangles",
        participantes: 10,
      },
    ],
    resultadosEsperados: [
      "Diagnóstico técnico comunitario sobre el estado del acueducto de Santa Ana",
      "Plan de becas y convenios de formación técnica con el SENA náutico",
      "Ruta de gestión integral de residuos sólidos con la empresa de aseo",
    ],
    marcoNormativo: [
      "Ley 142 de 1994",
      "Ley 70 de 1993",
      "Ley 115 de 1994 (Ley General de Educación)",
    ],
  },

  "mr-008": {
    proposito:
      "Abordar la crisis de erosión costera, la ausencia histórica de acueducto y alcantarillado, y el ordenamiento territorial frente al turismo de playas en la Isla de Tierrabomba.",
    ordenDelDia: [
      "Instalación institucional con delegados del Consejo Comunitario de Tierrabomba",
      "Balance de compromisos judiciales y acciones populares por agua potable",
      "Taller de diagnóstico con papelógrafos analizando causas profundas",
      "Socialización de propuestas de abastecimiento hídrico y defensa costera",
      "Firma de acuerdos y consolidación de la delegación veedora",
    ],
    preguntasOrientadoras: [
      "¿Cuál es el impacto económico y de salud familiar que genera comprar agua en tanques y pimpinas?",
      "¿Qué sectores del litoral insular sufren mayor pérdida de tierra y derrumbe de viviendas por el oleaje?",
      "¿Cómo ordenar la actividad de motonaves y lanchas turísticas para no perjudicar la pesca artesanal ni la seguridad de los bañistas?",
      "¿Qué atención en salud de urgencias está garantizada durante las noches o fines de semana en la isla?",
    ],
    submesasSugeridas: [
      {
        nombre: "Acueducto insular y agua potable",
        tema: "Conexión submarina, plantas desalinizadoras y subsidios de emergencia",
        participantes: 14,
      },
      {
        nombre: "Protección costera y gestión del riesgo",
        tema: "Espolones de protección, muro de contención y reubicación segura",
        participantes: 12,
      },
      {
        nombre: "Pesca, turismo y espacio público",
        tema: "Muelle seguro, regulación de boyas marítimas y tarifas justas",
        participantes: 14,
      },
      {
        nombre: "Salud marítima y ambulancia acuática",
        tema: "Centro de salud 24 horas y lancha ambulancia medicalizada",
        participantes: 12,
      },
    ],
    resultadosEsperados: [
      "Matriz de seguimiento al cumplimiento de fallos judiciales sobre acueducto insular",
      "Mapa comunitario de puntos de mayor erosión del borde marítimo",
      "Protocolo de operación y mantenimiento de la lancha ambulancia distrital",
    ],
    marcoNormativo: [
      "Sentencia T-302 de 2017 y jurisprudencia sobre agua potable insular",
      "Convenio 169 de la OIT",
      "Ley 1523 de 2012",
    ],
  },

  "mr-009": {
    proposito:
      "Concertar la conservación del patrimonio militar histórico (fuertes y baterías), la titulación colectiva, el mejoramiento del sistema eléctrico y la atención hospitalaria en Bocachica.",
    ordenDelDia: [
      "Apertura por líderes del Consejo Comunitario Domingo Benkos Biohó",
      "Presentación del estado de los monumentos históricos y áreas comunales",
      "Trabajo grupal en papelógrafos con maestros, pescadores y jóvenes",
      "Exposición de alternativas para el turismo patrimonial comunitario",
      "Acuerdos finales y firma del acta viva",
    ],
    preguntasOrientadoras: [
      "¿Cómo integrar el patrimonio del Fuerte de San Fernando y San José al bienestar económico directo de las familias nativas?",
      "¿Qué deficiencias presenta el servicio de energía eléctrica y cómo afecta la conservación de la pesca refrigerada?",
      "¿Qué medidas se requieren para que la juventud cuente con opciones reales de educación superior y empleo formal?",
      "¿Cuáles son las necesidades de dotación del centro de salud de Bocachica?",
    ],
    submesasSugeridas: [
      {
        nombre: "Patrimonio histórico y turismo comunitario",
        tema: "Gestión de los fuertes, guianza cultural nativa y conservación",
        participantes: 14,
      },
      {
        nombre: "Infraestructura eléctrica y cadena de frío",
        tema: "Continuidad del servicio eléctrico y cuartos fríos comunitarios",
        participantes: 12,
      },
      {
        nombre: "Juventud, cultura y etnoeducación",
        tema: "Currículo con memoria afro, formación artística y acceso a la universidad",
        participantes: 12,
      },
      {
        nombre: "Salud pública y conectividad marítima",
        tema: "Puesto de salud dotado y transporte permanente hacia Cartagena",
        participantes: 10,
      },
    ],
    resultadosEsperados: [
      "Modelo comunitario de aprovechamiento turístico del circuito de fuertes de Bocachica",
      "Plan de respaldo energético para la conservación del producto pesquero artesanal",
      "Compromisos para el fortalecimiento de la infraestructura educativa local",
    ],
    marcoNormativo: [
      "Ley 397 de 1997 (Ley General de Cultura)",
      "Ley 1185 de 2008 (Patrimonio Cultural)",
      "Ley 70 de 1993",
    ],
  },

  "mr-010": {
    proposito:
      "Fortalecer la gobernanza ambiental en el Parque Nacional Natural Corales del Rosario, resolviendo tensiones de uso del suelo, conservación de arrecifes de coral y derechos ancestrales de los pobladores insulares.",
    ordenDelDia: [
      "Instalación con el Consejo Comunitario de Islas del Rosario y Parques Nacionales",
      "Presentación de lineamientos de conservación de arrecifes y pastos marinos",
      "Trabajo participativo en papelógrafos sobre conflictos de uso y pesca",
      "Diálogo sobre aprovechamiento ecoturístico sostenible",
      "Lectura y aprobación del pliego de acuerdos concertados",
    ],
    preguntasOrientadoras: [
      "¿Cuáles son los principales factores de degradación de los corales y ecosistemas marinos del archipiélago?",
      "¿Cómo concertar las zonas de pesca de subsistencia tradicional dentro del área protegida sin violar la normatividad ambiental?",
      "¿Qué alternativas existen para el manejo de aguas residuales y basuras generadas por el turismo de pasadía?",
      "¿Cómo garantizar la seguridad alimentaria de las familias nativas frente a las restricciones ecológicas?",
    ],
    submesasSugeridas: [
      {
        nombre: "Conservación marina y pesca de subsistencia",
        tema: "Zonificación participativa, veda de especies y vigilancia comunitaria",
        participantes: 14,
      },
      {
        nombre: "Ecoturismo comunitario y capacidad de carga",
        tema: "Control de embarcaciones a motor, buceo sostenible y tarifas sociales",
        participantes: 12,
      },
      {
        nombre: "Saneamiento ecológico y residuos insulares",
        tema: "Plantas de tratamiento de aguas, biodigestores y reciclaje cero-plástico",
        participantes: 10,
      },
      {
        nombre: "Educación ambiental y derechos de la comunidad nativa",
        tema: "Escuela del mar, etnoeducación y preservación biocultural",
        participantes: 10,
      },
    ],
    resultadosEsperados: [
      "Pacto de gobernanza compartida entre el Consejo Comunitario y Parques Nacionales",
      "Reglamento comunitario para el turismo de naturaleza en el archipiélago",
      "Plan de contingencia ambiental contra la contaminación plástica en el mar",
    ],
    marcoNormativo: [
      "Decreto Ley 2811 de 1974",
      "Decreto 1076 de 2015 (Reglamentario del Sector Ambiente)",
      "Convenio 169 de la OIT",
      "Ley 70 de 1993",
    ],
  },

  "mr-011": {
    proposito:
      "Superar el aislamiento geográfico de la comunidad de Isla Fuerte garantizando la autonomía energética mediante fuentes renovables, dotación de salud de emergencia, agua potable y desarrollo agroforestal costero.",
    ordenDelDia: [
      "Apertura con el Consejo Comunitario de Isla Fuerte y líderes locales",
      "Diagnóstico de aislamiento logístico y costos de vida insular",
      "Construcción de árboles de problemas y soluciones en papelógrafos",
      "Priorización de proyectos en energía solar, salud y ecoturismo comunitario",
      "Firma del documento de compromisos distritales y departamentales",
    ],
    preguntasOrientadoras: [
      "¿Qué soluciones definitivas se requieren para garantizar el fluido eléctrico las 24 horas del día?",
      "¿Cómo salvar vidas en emergencias de salud ante la lejanía geográfica respecto a Cartagena?",
      "¿Qué iniciativas de captación y almacenamiento de agua de lluvia pueden ampliarse en la isla?",
      "¿De qué manera potenciar el ecoturismo de naturaleza protegiendo el bosque seco tropical y el árbol que camina?",
    ],
    submesasSugeridas: [
      {
        nombre: "Transición energética y servicios básicos",
        tema: "Granja solar fotovoltaica, microrredes y baterías de almacenamiento",
        participantes: 12,
      },
      {
        nombre: "Telemedicina y evacuación de emergencias",
        tema: "Dotación del centro de salud, teleconsulta y protocolo aéreo/marítimo",
        participantes: 12,
      },
      {
        nombre: "Agua potable y soberanía alimentaria",
        tema: "Aljibes comunitarios, desalinizadoras solares y huertas tradicionales",
        participantes: 10,
      },
      {
        nombre: "Turismo regenerativo y patrimonio natural",
        tema: "Senderismo ecológico, avistamiento de aves y conservación de fauna marina",
        participantes: 10,
      },
    ],
    resultadosEsperados: [
      "Proyecto prioritario de energía solar comunitaria para Isla Fuerte",
      "Protocolo interinstitucional de evacuación aeromédica de emergencias",
      "Plan de manejo para el ecoturismo de bajo impacto en el bosque seco",
    ],
    marcoNormativo: [
      "Ley 1715 de 2014",
      "Ley 2099 de 2021 (Transición Energética)",
      "Convenio 169 de la OIT",
      "Ley 70 de 1993",
    ],
  },

  "mr-012": {
    proposito:
      "Fortalecer el pliego de acuerdos para la zona corregimental de Barú con énfasis en sostenibilidad ambiental costera, ordenamiento comunal de playas y garantía de derechos étnicos afrodescendientes.",
    ordenDelDia: [
      "Verificación de asistentes e instalación de la mesa",
      "Contextualización de la vulnerabilidad de ecosistemas de manglar y costa",
      "Trabajo deliberativo en papelógrafo sobre las dimensiones de seguridad humana",
      "Socialización plenaria de propuestas de desarrollo endógeno",
      "Suscripción del pliego de conclusiones comunitarias",
    ],
    preguntasOrientadoras: [
      "¿Qué acciones coordinadas frenarán el relleno no autorizado de manglares y la privatización indebida de playas públicas?",
      "¿Cómo mejorar las condiciones de trabajo de los pescadores artesanales y operadores de lanchas nativos?",
      "¿Qué deficiencias críticas presenta la infraestructura escolar y cómo solventarlas?",
      "¿Cuáles son las metas para alcanzar una cobertura universal de acueducto y energía en los tres poblados de la península?",
    ],
    submesasSugeridas: [
      {
        nombre: "Gobernanza ambiental y defensa del manglar",
        tema: "Vigilancia comunitaria, reforestación de manglares y protección costera",
        participantes: 12,
      },
      {
        nombre: "Economía comunitaria y pesca responsable",
        tema: "Dotación de equipos de navegación, formalización y turismo ético",
        participantes: 14,
      },
      {
        nombre: "Servicios esenciales y calidad de vida",
        tema: "Conectividad de acueducto, saneamiento básico y energía limpia",
        participantes: 12,
      },
      {
        nombre: "Etnoeducación y cultura afro",
        tema: "Preservación del patrimonio oral, festividades tradicionales y escuelas de música",
        participantes: 10,
      },
    ],
    resultadosEsperados: [
      "Matriz de compromisos para el monitoreo de manglares y humedales de Barú",
      "Estrategia comunitaria para la formalización del turismo náutico nativo",
      "Plan de acción coordinado para la culminación de redes de servicios básicos",
    ],
    marcoNormativo: [
      "Convenio 169 de la OIT",
      "Sentencia SU-123 de 2018",
      "Ley 70 de 1993",
      "Decreto 1320 de 1998",
    ],
  },

  // ── MESAS POBLACIONALES ─────────────────────────────────────────────
  "mp-001": {
    proposito:
      "Concertar la Política Pública Distrital de Envejecimiento y Vejez, garantizando un ingreso digno, subsidios alimentarios, atención integral en salud gerontológica y centros de vida dignos en Cartagena.",
    ordenDelDia: [
      "Instalación con la Mesa Distrital del Adulto Mayor y Secretaría de Participación",
      "Presentación de estadísticas de desnutrición, soledad y desprotección en personas mayores",
      "Taller con papelógrafos analizando causas y efectos de la exclusión gerontológica",
      "Puesta en común de soluciones e inversión social",
      "Firma del pliego de exigibilidad de derechos de las personas mayores",
    ],
    preguntasOrientadoras: [
      "¿Cuáles son las mayores trabas para acceder de forma oportuna a citas con especialistas médicos y medicamentos del POS?",
      "¿Cuál es la cobertura real y calidad de los Centros de Vida y Centros de Bienestar en las tres localidades?",
      "¿Qué programas de subsidio económico o renta ciudadana deben implementarse para adultos mayores sin pensión?",
      "¿Qué acciones combaten el abandono, el maltrato intrafamiliar y la discriminación por edad?",
    ],
    submesasSugeridas: [
      {
        nombre: "Salud gerontológica y atención integral",
        tema: "Atención domiciliaria, salud mental y entrega oportuna de medicamentos",
        participantes: 16,
      },
      {
        nombre: "Centros de Vida y nutrición digna",
        tema: "Infraestructura de comedores comunitarios y raciones calóricas de calidad",
        participantes: 16,
      },
      {
        nombre: "Seguridad económica y subsidios",
        tema: "Ampliación de subsidios distritales y empleo protegido para mayores",
        participantes: 14,
      },
      {
        nombre: "Prevención de violencias y protección jurídica",
        tema: "Rutas de denuncia de maltrato, amparo de derechos y acompañamiento legal",
        participantes: 12,
      },
    ],
    resultadosEsperados: [
      "Plan Decenal Distrital de Envejecimiento y Vejez actualizado",
      "Diagnóstico y plan de mejora de la infraestructura de los Centros de Vida",
      "Ruta prioritaria de atención en salud gerontológica con la red hospitalaria pública",
    ],
    marcoNormativo: [
      "Ley 1251 de 2008 (Protección a personas adultas mayores)",
      "Ley 1850 de 2017 (Medidas contra el maltrato al adulto mayor)",
      "Convención Interamericana sobre Derechos Humanos de las Personas Mayores (Ley 2055 de 2020)",
    ],
  },

  "mp-002": {
    proposito:
      "Construir la agenda distrital para la garantía integral de derechos de niños, niñas y adolescentes, erradicando el trabajo infantil, la desnutrición y la vulneración sexual en Cartagena.",
    ordenDelDia: [
      "Apertura con el ICBF, Secretaría de Educación y voceros de mesas de participación de NNA",
      "Presentación del diagnóstico situacional de la niñez cartagenera",
      "Ejercicio en papelógrafo con enfoque de derechos y desarrollo infantil",
      "Socialización de soluciones propuestas por profesionales, padres y cuidadores",
      "Acuerdos vinculantes para el Sistema Distrital de Cuidado y Protección",
    ],
    preguntasOrientadoras: [
      "¿Cuáles son las zonas con mayores índices de desnutrición infantil aguda y moderada en el Distrito?",
      "¿Qué fallas operativas presenta el Programa de Alimentación Escolar (PAE) y cómo garantizar su continuidad ininterrumpida?",
      "¿Cómo desmantelar las redes de explotación infantil, mendicidad y trabajo infantil en semáforos y plazas?",
      "¿Qué espacios de juego, ludotecas y parques seguros hacen falta en los barrios más vulnerables?",
    ],
    submesasSugeridas: [
      {
        nombre: "Nutrición y desarrollo en primera infancia",
        tema: "CDIs, vigilancia nutricional y atención materno-infantil",
        participantes: 16,
      },
      {
        nombre: "Educación de calidad y permanencia escolar",
        tema: "Cobertura PAE, transporte escolar y prevención de la deserción",
        participantes: 16,
      },
      {
        nombre: "Prevención de violencias y erradicación del trabajo infantil",
        tema: "Rutas de protección ICBF-Policía de Infancia y entornos protectores",
        participantes: 15,
      },
      {
        nombre: "Juego, cultura y recreación comunitaria",
        tema: "Parques inclusivos, ludotecas móviles y escuelas formativas de arte",
        participantes: 14,
      },
    ],
    resultadosEsperados: [
      "Plan de acción interinstitucional contra la desnutrición infantil y mortalidad evitable",
      "Compromisos vinculantes de veeduría social al PAE distrital",
      "Estrategia territorial de rescate frente al trabajo infantil y la mendicidad",
    ],
    marcoNormativo: [
      "Ley 1098 de 2006 (Código de la Infancia y la Adolescencia)",
      "Ley 1804 de 2016 (Política de Estado de Cero a Siempre)",
      "CONPES 3887 de 2017",
    ],
  },

  "mp-003": {
    proposito:
      "Formular políticas efectivas de no discriminación, acceso a la salud libre de estigmas, inclusión laboral y protección a la vida de personas con orientaciones sexuales e identidades de género diversas.",
    ordenDelDia: [
      "Bienvenida e instalación institucional por líderes de la Mesa LGBTIQ+ de Cartagena",
      "Balance de crímenes de odio, agresiones policiales y barreras de acceso a derechos",
      "Trabajo grupal en papelógrafos formulando árboles causales",
      "Exposición de iniciativas de inclusión económica y salud afirmativa",
      "Adopción de compromisos para la Política Pública LGBTIQ+ Distrital",
    ],
    preguntasOrientadoras: [
      "¿Cuáles son los sectores de la ciudad donde se concentran las mayores amenazas y agresiones físicas hacia personas trans y diversas?",
      "¿Qué barreras institucionales impiden a las personas trans acceder a empleo formal y estabilidad laboral?",
      "¿Cómo erradicar la discriminación y la violencia obstétrica o psicológica en centros de salud hacia personas de la comunidad?",
      "¿Qué protocolos deben implementarse en la Policía Nacional para evitar la violencia institucional y abusos de poder?",
    ],
    submesasSugeridas: [
      {
        nombre: "Seguridad personal y justicia libre de estigma",
        tema: "Prevención de crímenes de odio, protocolo policial y casas de acogida",
        participantes: 15,
      },
      {
        nombre: "Inclusión laboral y autonomía económica",
        tema: "Bolsa de empleo inclusiva, incentivos a empresas y apoyo a emprendimientos",
        participantes: 15,
      },
      {
        nombre: "Salud afirmativa y bienestar integral",
        tema: "Terapia de afirmación de género, salud sexual y salud mental comunitaria",
        participantes: 14,
      },
      {
        nombre: "Educación libre de acoso y cultura ciudadana",
        tema: "Prevención del bullying homofóbico/transfóbico en colegios y pedagogía ciudadana",
        participantes: 12,
      },
    ],
    resultadosEsperados: [
      "Ruta de atención inmediata y protección ante violencia por prejuicio hacia personas LGBTIQ+",
      "Programa distrital de fomento al empleo y emprendimiento con enfoque de diversidad",
      "Manual de buenas prácticas y lenguaje inclusivo para servidores públicos de Cartagena",
    ],
    marcoNormativo: [
      "Sentencia T-099 de 2015 y jurisprudencia de derechos LGBTIQ+",
      "Decreto 762 de 2018 (Política Pública Nacional LGBTI)",
      "Acuerdo Distrital de Cartagena sobre no discriminación",
    ],
  },

  "mp-004": {
    proposito:
      "Consolidar la accesibilidad universal en el transporte público, la inclusión laboral formal, la educación inclusiva sin barreras y el fortalecimiento de redes de cuidado en el Distrito.",
    ordenDelDia: [
      "Instalación con el Comité Distrital de Discapacidad y organizaciones sociales",
      "Diagnóstico de barreras físicas, comunicativas y actitudinales en la ciudad",
      "Trabajo en papelógrafos con personas con discapacidad física, sensorial, cognitiva y cuidadores",
      "Presentación de soluciones y priorización presupuestal",
      "Firma del pacto por una Cartagena accesible e inclusiva",
    ],
    preguntasOrientadoras: [
      "¿Qué barreras impiden la accesibilidad en estaciones, buses de Transcaribe y andenes de la ciudad?",
      "¿Cómo garantizar que los colegios oficiales cuenten con docentes de apoyo, intérpretes de LSC y modelos pedagógicos adaptados?",
      "¿Qué porcentaje de contratación pública y privada está cumpliendo la cuota laboral de personas con discapacidad?",
      "¿Qué respaldo económico y psicosocial reciben las mujeres y familias que ejercen labores de cuidado no remunerado?",
    ],
    submesasSugeridas: [
      {
        nombre: "Movilidad accesible y espacio público",
        tema: "Infraestructura universal en Transcaribe, andenes rebajados y semaforización sonora",
        participantes: 15,
      },
      {
        nombre: "Educación inclusiva y accesibilidad comunicativa",
        tema: "Intérpretes de señas, tiflotecnología y formación docente inclusiva",
        participantes: 14,
      },
      {
        nombre: "Inclusión laboral y productiva",
        tema: "Cumplimiento de cuotas laborales, teletrabajo y capital semilla",
        participantes: 14,
      },
      {
        nombre: "Sistema distrital de cuidado y cuidadores",
        tema: "Remuneración al cuidado, relevo domiciliario y salud mental para cuidadores",
        participantes: 12,
      },
    ],
    resultadosEsperados: [
      "Plan maestro de accesibilidad física y señalización sensorial para Cartagena",
      "Convenio distrital para la dotación de intérpretes y mediadores en el 100% de colegios oficiales",
      "Creación del registro distrital de personas cuidadoras con acceso a programas de respiro y formación",
    ],
    marcoNormativo: [
      "Ley Estatutaria 1618 de 2013 (Garantía de derechos de personas con discapacidad)",
      "Ley 1346 de 2009 (Convención sobre los Derechos de las Personas con Discapacidad)",
      "CONPES 166 de 2013",
    ],
  },

  "mp-005": {
    proposito:
      "Definir políticas audaces para la generación de empleo juvenil, acceso universal a la educación superior pública, fomento de la cultura y el arte, y prevención del homicidio juvenil en barrios populares.",
    ordenDelDia: [
      "Apertura con consejeros distritales y municipales de juventud (CMJ) y colectivos juveniles",
      "Diagnóstico de desempleo juvenil, informalidad y deserción académica",
      "Deliberación en submesas de papelógrafo orientadas a medios y fines de solución",
      "Pitch de propuestas formuladas por jóvenes líderes",
      "Adopción de la agenda juvenil distrital 2026-2036",
    ],
    preguntasOrientadoras: [
      "¿Cuáles son las principales causas del desempleo entre jóvenes egresados de bachillerato y universidades?",
      "¿Qué factores alimentan la vinculación de adolescentes a dinámicas delictivas o de pandillas y cómo desactivarlos?",
      "¿Qué trabas existen para ingresar a la Universidad de Cartagena, Mayor de Bolívar o el SENA?",
      "¿Qué apoyos reales necesitan los jóvenes que crean música, danza urbana, arte callejero o emprendimientos digitales?",
    ],
    submesasSugeridas: [
      {
        nombre: "Educación superior y gratuidad",
        tema: "Ampliación de cupos universitarios públicos, sedes satélites y residencias",
        participantes: 16,
      },
      {
        nombre: "Primer empleo y emprendimiento juvenil",
        tema: "Incentivos a la contratación juvenil, capital semilla y habilidades digitales",
        participantes: 16,
      },
      {
        nombre: "Convivencia pacífica y desarme juvenil",
        tema: "Mediación comunitaria, ligas deportivas y desarme voluntario",
        participantes: 15,
      },
      {
        nombre: "Industrias creativas, cultura y tecnología",
        tema: "Estudios de grabación comunitarios, festivales barriales y hubs de innovación",
        participantes: 14,
      },
    ],
    resultadosEsperados: [
      "Pacto distrital por el primer empleo y la capacitación tecnológica juvenil",
      "Plan de choque para la prevención del homicidio juvenil en las localidades 2 y 3",
      "Bolsa de estímulos para colectivos culturales y artísticos comunitarios",
    ],
    marcoNormativo: [
      "Ley Estatutaria 1622 de 2013 (Estatuto de Ciudadanía Juvenil)",
      "Ley 1885 de 2018 (Modificatoria del Estatuto Juvenil)",
      "CONPES 4040 de 2021",
    ],
  },

  "mp-006": {
    proposito:
      "Diseñar estrategias contundentes contra el feminicidio y la violencia basada en género (VBG), implementar el Sistema Distrital de Cuidado, cerrar brechas salariales y combatir la explotación sexual (ESCNNA) en Cartagena.",
    ordenDelDia: [
      "Instalación con el Consejo Consultivo de Mujeres de Cartagena",
      "Presentación de cifras de feminicidios, denuncias archivadas y violencia intrafamiliar",
      "Trabajo en papelógrafos abordando las raíces estructurales del machismo y la impunidad",
      "Formulación de árboles de soluciones por delegadas de base",
      "Firma del pacto de cero tolerancia a la violencia contra las mujeres",
    ],
    preguntasOrientadoras: [
      "¿Por qué fallan las medidas de protección a mujeres víctimas de violencia y qué hace falta en Comisarías de Familia?",
      "¿Cómo articular a la comunidad y al gremio hotelero para denunciar y castigar con severidad las redes de ESCNNA?",
      "¿Qué servicios de cuidado para niños y personas dependientes permitirían a las mujeres trabajar y estudiar?",
      "¿Qué líneas de crédito sin fiador o capital semilla pueden fortalecer la autonomía económica de las mujeres populares?",
    ],
    submesasSugeridas: [
      {
        nombre: "Rutas de justicia y protección frente a VBG",
        tema: "Fortalecimiento de comisarías 24/7, casas refugio y sanción judicial efectiva",
        participantes: 16,
      },
      {
        nombre: "Lucha contra la ESCNNA y turismo protector",
        tema: "Cero tolerancia institucional, judicialización de proxenetas y rescate de víctimas",
        participantes: 16,
      },
      {
        nombre: "Sistema distrital del cuidado y tiempo propio",
        tema: "Manzanas del cuidado, lavanderías comunitarias y centros infantiles",
        participantes: 15,
      },
      {
        nombre: "Autonomía económica y emprendimiento femenino",
        tema: "Banca comunitaria, formación en oficios no tradicionales y ferias productivas",
        participantes: 14,
      },
    ],
    resultadosEsperados: [
      "Plan de acción urgente para el fortalecimiento de comisarías de familia y casas refugio",
      "Estrategia interinstitucional de erradicación de la ESCNNA en zonas turísticas",
      "Modelo piloto de Manzana del Cuidado en la Localidad De La Virgen y Turística",
    ],
    marcoNormativo: [
      "Ley 1257 de 2008 (No violencia contra las mujeres)",
      "Ley 1761 de 2015 (Ley Rosa Elvira Cely - Feminicidio)",
      "CONPES 4080 de 2022 (Equidad de Género para las Mujeres)",
      "Decreto 2734 de 2012",
    ],
  },

  "mp-007": {
    proposito:
      "Acelerar la reparación integral individual y colectiva, la titulación de vivienda digna, la memoria histórica y la no estigmatización de las más de 120.000 víctimas residentes en el Distrito de Cartagena.",
    ordenDelDia: [
      "Instalación con la Mesa Distrital de Participación Efectiva de Víctimas y la UARIV",
      "Balance de indemnizaciones administrativas pendientes y restitución de tierras",
      "Mesas de trabajo en papelógrafos con líderes de población desplazada",
      "Concertación de proyectos productivos sostenibles y vivienda",
      "Firma del pliego de acuerdos con el Gobierno Distrital y Nacional",
    ],
    preguntasOrientadoras: [
      "¿Cuáles son las mayores trabas burocráticas para recibir la indemnización administrativa de la Unidad de Víctimas?",
      "¿Qué condiciones de precariedad habitacional enfrentan las familias desplazadas en barrios como Bicentenario o Nelson Mandela?",
      "¿Qué garantías de seguridad y esquemas de protección requieren los líderes sociales y reclamantes de tierras amenazados?",
      "¿Cómo fortalecer los lugares de memoria y homenaje a las víctimas del conflicto en la ciudad?",
    ],
    submesasSugeridas: [
      {
        nombre: "Indemnización, verdad y reparación integral",
        tema: "Agilización de pagos, acompañamiento psicosocial y asesoría legal gratuita",
        participantes: 15,
      },
      {
        nombre: "Vivienda digna, hábitat y retorno",
        tema: "Subsidios de vivienda prioritarios, mejoramiento y legalización de predios",
        participantes: 15,
      },
      {
        nombre: "Protección a líderes y garantías de no repetición",
        tema: "Rutas de alerta temprana, medidas de la UNP y alertas de la Defensoría",
        participantes: 14,
      },
      {
        nombre: "Proyectos productivos y empleabilidad",
        tema: "Capital de trabajo para emprendimientos de víctimas y cuotas laborales distritales",
        participantes: 14,
      },
    ],
    resultadosEsperados: [
      "Plan de choque para la entrega efectiva de cartas de indemnización administrativa en Cartagena",
      "Programa de titulación prioritaria de vivienda para población desplazada en Bicentenario",
      "Mesa técnica de seguimiento a alertas tempranas de la Defensoría del Pueblo",
    ],
    marcoNormativo: [
      "Ley 1448 de 2011 (Ley de Víctimas y Restitución de Tierras)",
      "Decreto Ley 4633 de 2011 (Víctimas indígenas)",
      "Decreto Ley 4635 de 2011 (Víctimas comunidades negras y afrocolombianas)",
      "Sentencia T-025 de 2004 y autos de seguimiento",
    ],
  },

  "mp-008": {
    proposito:
      "Proteger los derechos territoriales, la consulta previa, la identidad cultural y la autonomía de las comunidades negras, afrocolombianas, raizales, palenqueras (NARP) e indígenas asentadas en Cartagena.",
    ordenDelDia: [
      "Apertura ritual y palabras de mayores de los Consejos Comunitarios y Cabildos Indígenas",
      "Diagnóstico de amenazas a la autonomía territorial y etnoeducación",
      "Taller con papelógrafos analizando las causas de la discriminación racial estructural",
      "Formulación de políticas de desarrollo propio (planes de etnodesarrollo)",
      "Suscripción del pacto étnico distrital",
    ],
    preguntasOrientadoras: [
      "¿Cuáles son las mayores vulneraciones al derecho fundamental a la Consulta Previa en megaproyectos y obras urbanas?",
      "¿Cómo garantizar que la cátedra de estudios afrocolombianos e indígenas se enseñe efectivamente en todas las escuelas?",
      "¿Qué avances y demoras persisten en la titulación colectiva de los territorios ancestrales?",
      "¿Cómo combatir el racismo institucional y las expresiones de discriminación en el acceso al empleo y los espacios públicos?",
    ],
    submesasSugeridas: [
      {
        nombre: "Territorio, titulación colectiva y consulta previa",
        tema: "Seguridad jurídica de la tierra, Convenio 169 OIT y protocolos propios",
        participantes: 16,
      },
      {
        nombre: "Etnoeducación y preservación cultural",
        tema: "Cátedra afrocolombiana, lenguas nativas y rescate de la memoria viva",
        participantes: 14,
      },
      {
        nombre: "Etnodesarrollo y economía propia",
        tema: "Financiación de planes de vida comunitarios y soberanía alimentaria",
        participantes: 14,
      },
      {
        nombre: "Lucha contra el racismo y justicia étnica",
        tema: "Observatorio contra la discriminación racial y acceso a cargos de decisión",
        participantes: 12,
      },
    ],
    resultadosEsperados: [
      "Protocolo unificado distrital para la realización obligatoria de la Consulta Previa (SU-123/18)",
      "Plan de fortalecimiento institucional para Consejos Comunitarios y Cabildos",
      "Creación del fondo distrital de estímulos para la etnoeducación y la cultura afro e indígena",
    ],
    marcoNormativo: [
      "Ley 70 de 1993",
      "Convenio 169 de la OIT (Aprobado por Ley 21 de 1991)",
      "Sentencia SU-123 de 2018 (Corte Constitucional)",
      "Decreto 1745 de 1995",
    ],
  },

  // ── MESAS SECTORIALES ───────────────────────────────────────────────
  "ms-001": {
    proposito:
      "Fortalecer el ecosistema cultural distrital, descentralizar los recursos hacia los barrios y corregimientos, proteger el patrimonio inmaterial y dignificar el ejercicio de los artistas y gestores culturales.",
    ordenDelDia: [
      "Saludo e instalación por el IPCC y el Consejo Distrital de Cultura",
      "Diagnóstico de la inversión cultural y brechas entre el centro amurallado y la periferia",
      "Deliberación en submesas con papelógrafos comunitarios",
      "Presentación de iniciativas de fomento cultural y protección patrimonial",
      "Acuerdos sobre asignación transparente de estímulos y becas",
    ],
    preguntasOrientadoras: [
      "¿Por qué la mayor parte del presupuesto cultural se concentra en el Centro Histórico y no en las comunas populares?",
      "¿Qué mecanismos transparentes deben crearse para la asignación de estímulos, becas y contratación artística?",
      "¿Cómo proteger tradiciones vivas como las Fiestas de Independencia, el champeta sound system y la gastronomía raizal?",
      "¿Qué estados presentan las casas de cultura comunitaria y bibliotecas públicas barriales?",
    ],
    submesasSugeridas: [
      {
        nombre: "Descentralización cultural e infraestructura",
        tema: "Casas de cultura barriales, bibliotecas comunitarias y dotación",
        participantes: 14,
      },
      {
        nombre: "Estímulos, profesionalización y seguridad social",
        tema: "Seguridad social para artistas (BEPS), convocatorias abiertas y tarifas justas",
        participantes: 15,
      },
      {
        nombre: "Patrimonio inmaterial y fiestas de independencia",
        tema: "Champeta urbana, festividades del 11 de noviembre y memoria histórica",
        participantes: 14,
      },
      {
        nombre: "Conservación del patrimonio arquitectónico y monumental",
        tema: "Cuidado de murallas, baluartes y patrimonio de barrios tradicionales",
        participantes: 12,
      },
    ],
    resultadosEsperados: [
      "Estatuto distrital de fomento y estímulos a las artes y la cultura",
      "Plan de rescate y dotación de las Casas de Cultura en las tres localidades",
      "Estrategia de salvaguarda de la Champeta como manifestación del patrimonio cultural inmaterial",
    ],
    marcoNormativo: [
      "Ley 397 de 1997 (Ley General de Cultura)",
      "Ley 1185 de 2008 (Modificatoria del Patrimonio)",
      "Decreto 2012 de 2017 (BEPS para creadores y gestores culturales)",
    ],
  },

  "ms-002": {
    proposito:
      "Garantizar el derecho al deporte, modernizar la infraestructura deportiva barrial, fortalecer las escuelas de formación para alejar a la juventud del delito y apoyar a los deportistas de alto rendimiento.",
    ordenDelDia: [
      "Instalación por el IDER y ligas deportivas de Cartagena",
      "Estado y censo de escenarios deportivos en el Distrito",
      "Construcción de árboles de problemas sobre papelógrafo con entrenadores y atletas",
      "Propuestas de mantenimiento comunitario y fomento al talento",
      "Firma del pliego de acuerdos deportivos",
    ],
    preguntasOrientadoras: [
      "¿Cuántas canchas y parques deportivos de barrio están abandonados o bajo cobro indebido por particulares?",
      "¿Qué apoyos reales reciben los niños y jóvenes cartageneros con talento para competir a nivel nacional e internacional?",
      "¿Cómo articular el deporte barrial como herramienta directa de prevención de pandillismo y consumo de drogas?",
      "¿Qué programas de actividad física y salud existen para personas con discapacidad y adultos mayores?",
    ],
    submesasSugeridas: [
      {
        nombre: "Infraestructura y mantenimiento de escenarios",
        tema: "Recuperación de canchas múltiples, iluminación LED y administración comunitaria",
        participantes: 15,
      },
      {
        nombre: "Escuelas de formación deportiva y deporte social",
        tema: "Acceso gratuito, dotación de uniformes/balones e instructores calificados",
        participantes: 15,
      },
      {
        nombre: "Deporte de alto rendimiento y apoyo al atleta",
        tema: "Becas de alimentación, transporte a campeonatos y medicina deportiva",
        participantes: 12,
      },
      {
        nombre: "Deporte inclusivo, recreación y tercera edad",
        tema: "Juegos paralímpicos locales, aeróbicos barriales y ciclovías dominicales",
        participantes: 12,
      },
    ],
    resultadosEsperados: [
      "Plan maestro de recuperación y mantenimiento de escenarios deportivos barriales",
      "Creación del programa distrital de becas y acompañamiento para deportistas destacados",
      "Red comunitaria de torneos interbarriales por la paz y la convivencia",
    ],
    marcoNormativo: [
      "Ley 181 de 1995 (Ley del Deporte)",
      "Ley 1967 de 2019 (Ministerio del Deporte)",
      "Decreto 1085 de 2015",
    ],
  },

  "ms-003": {
    proposito:
      "Transformar el modelo de salud hacia la prevención comunitaria, descongestionar los centros de urgencias, garantizar medicamentos esenciales y fortalecer la red pública hospitalaria del DADIS y la ESE Cartagena de Indias.",
    ordenDelDia: [
      "Instalación con el DADIS, gerencia de la ESE y sindicatos de la salud",
      "Presentación del perfil epidemiológico distrital (dengue, hipertensión, salud mental)",
      "Deliberación en submesas de papelógrafos analizando fallas en la red primaria",
      "Formulación de soluciones para la atención digna y oportuna",
      "Firma de compromisos de modernización hospitalaria",
    ],
    preguntasOrientadoras: [
      "¿Cuáles son los mayores cuellos de botella en la asignación de citas médicas con especialistas y entrega de fórmulas completas?",
      "¿Qué plan existe para culminar los CAP y hospitales inconclusos (como Nelson Mandela, Pozón o Canapote)?",
      "¿Cómo combatir el aumento de casos de dengue, leptospirosis y enfermedades transmitidas por agua insalubre?",
      "¿Qué servicios de salud mental y prevención del suicidio están disponibles en los barrios populares?",
    ],
    submesasSugeridas: [
      {
        nombre: "Red hospitalaria pública y centros de salud (CAP)",
        tema: "Culminación de elefantes blancos, dotación de equipos médicos e insumos",
        participantes: 16,
      },
      {
        nombre: "Prevención epidemiológica y salud ambiental",
        tema: "Control de vectores (dengue), calidad del agua potable y vacunación universal",
        participantes: 14,
      },
      {
        nombre: "Salud mental y adicciones",
        tema: "Equipos psicosociales comunitarios, líneas de crisis y centros de rehabilitación públicos",
        participantes: 14,
      },
      {
        nombre: "Salud materno-perinatal y nutricional",
        tema: "Atención al parto humanizado, controles prenatales y erradicación de desnutrición",
        participantes: 12,
      },
    ],
    resultadosEsperados: [
      "Cronograma público y perentorio para la entrega y dotación de los centros de salud inconclusos",
      "Estrategia distrital de Equipos Básicos de Salud Domiciliaria en zonas críticas",
      "Plan de contingencia permanente para el control del dengue y enfermedades tropicales",
    ],
    marcoNormativo: [
      "Ley 1751 de 2015 (Ley Estatutaria de Salud)",
      "Ley 715 de 2001",
      "Ley 1438 de 2011 (Atención Primaria en Salud)",
    ],
  },

  "ms-004": {
    proposito:
      "Elevar la calidad educativa en las instituciones públicas, garantizar infraestructura digna, jornada única con comedores escolares, conectividad digital y bienestar docente en Cartagena.",
    ordenDelDia: [
      "Saludo e instalación por la Secretaría de Educación Distrital y sindicato de maestros (SUDIPEB)",
      "Diagnóstico de infraestructura escolar, hacinamiento y resultados Pruebas Saber 11",
      "Taller en papelógrafos con rectores, docentes, padres y personeros estudiantiles",
      "Formulación de árboles de soluciones en calidad y cobertura",
      "Adopción de acuerdos para el Plan Decenal de Educación",
    ],
    preguntasOrientadoras: [
      "¿Cuántas sedes educativas presentan techos caídos, baños insalubres o falta de ventilación frente a las olas de calor?",
      "¿Cómo garantizar que el PAE funcione desde el primer día de clases hasta el último sin suspensiones?",
      "¿Qué programas de bilingüismo, robótica y ciencia deben implementarse en los colegios públicos?",
      "¿Qué medidas reducen el bullying escolar y atienden la salud mental de estudiantes y profesores?",
    ],
    submesasSugeridas: [
      {
        nombre: "Infraestructura escolar digna y climatización",
        tema: "Reparación de aulas, baterías sanitarias, abanicos/aire y energía solar",
        participantes: 16,
      },
      {
        nombre: "Alimentación escolar (PAE) y transporte escolar",
        tema: "Operación oportuna, raciones calientes preparadas en sitio y cobertura rural",
        participantes: 15,
      },
      {
        nombre: "Calidad pedagógica, ciencia y bilingüismo",
        tema: "Capacitación docente, laboratorios de tecnología y currículo pertinente",
        participantes: 15,
      },
      {
        nombre: "Convivencia escolar, salud mental e inclusión",
        tema: "Psicorientadores por colegio, mediación de conflictos y cero deserción",
        participantes: 14,
      },
    ],
    resultadosEsperados: [
      "Plan maestro de intervención integral a la infraestructura física de los colegios oficiales",
      "Modelo de veeduría ciudadana y comunitaria al PAE y transporte escolar",
      "Incorporación de un profesional en psicorientación por cada 250 estudiantes en la red pública",
    ],
    marcoNormativo: [
      "Ley 115 de 1994 (Ley General de Educación)",
      "Ley 715 de 2001",
      "Ley 2167 de 2021 (Garantía de continuidad del PAE)",
    ],
  },

  "ms-005": {
    proposito:
      "Resolver la crisis del transporte público, optimizar las rutas y estaciones de Transcaribe, ordenar el mototaxismo de forma concertada y dignificar el espacio público peatonal.",
    ordenDelDia: [
      "Instalación con el DATT, Gerencia de Transcaribe y Gerencia de Espacio Público",
      "Diagnóstico de congestión, siniestralidad vial y oferta de transporte público",
      "Taller con papelógrafos analizando causas estructurales de la mala movilidad",
      "Presentación de propuestas para la convivencia vial y modos sostenibles",
      "Acuerdos sobre infraestructura peatonal y transporte masivo",
    ],
    preguntasOrientadoras: [
      "¿Cuáles son las principales quejas sobre las frecuencias, cobertura y estado de la flota de Transcaribe?",
      "¿Qué alternativas viables de reconversión laboral o formalización se proponen para el gremio de mototaxistas?",
      "¿Cómo recuperar andenes y espacios caminables sin vulnerar el sustento de los vendedores informales?",
      "¿Qué puntos críticos de tráfico (como La Bomba del Amparo o Ceballos) requieren soluciones de ingeniería urgente?",
    ],
    submesasSugeridas: [
      {
        nombre: "Transcaribe y sistema integrado de transporte",
        tema: "Expansión de rutas alimentadoras a barrios periféricos y subsidio estudiantil",
        participantes: 15,
      },
      {
        nombre: "Espacio público, andenes y peatonalización",
        tema: "Zonas de transición para ventas informales y corredores peatonales sombreados",
        participantes: 15,
      },
      {
        nombre: "Convivencia vial, mototaxismo y seguridad",
        tema: "Cultura vial, zonas de ascenso y descenso y reducción de siniestros",
        participantes: 14,
      },
      {
        nombre: "Movilidad activa, ciclorrutas y transporte acuático",
        tema: "Red de ciclorrutas seguras y proyecto del sistema acuático por la bahía",
        participantes: 12,
      },
    ],
    resultadosEsperados: [
      "Plan de reestructuración y ampliación de cobertura de rutas de Transcaribe",
      "Pacto de convivencia y ordenamiento concertado del mototaxismo",
      "Priorización de corredores peatonales bioclimáticos en las tres localidades",
    ],
    marcoNormativo: [
      "Ley 105 de 1993 y Ley 336 de 1996 (Estatuto Nacional de Transporte)",
      "Ley 1801 de 2016",
      "Ley 1811 de 2016 (Incentivos a la Bici-movilidad)",
    ],
  },

  "ms-006": {
    proposito:
      "Exigir calidad y tarifas justas en energía eléctrica y gas, avanzar en la cobertura universal de agua y alcantarillado, y reducir el déficit cuantitativo y cualitativo de vivienda en Cartagena.",
    ordenDelDia: [
      "Instalación con la Secretaría de Infraestructura, Corvivienda y voceros de usuarios de servicios",
      "Diagnóstico de altas tarifas de energía (Afinia), apagones y falta de alcantarillado",
      "Trabajo grupal en papelógrafos con asociaciones comunitarias y veedurías",
      "Formulación de soluciones para el mejoramiento integral de barrios",
      "Suscripción del pliego de peticiones y compromisos de inversión",
    ],
    preguntasOrientadoras: [
      "¿Por qué persisten cobros excesivos en las facturas de energía eléctrica y qué subsidios deben aplicarse?",
      "¿Cuántos barrios y asentamientos populares carecen de redes formales de acueducto y alcantarillado sanitario?",
      "¿Qué programas de mejoramiento de vivienda (pisos, techos, baños) deben priorizarse para familias en pobreza extrema?",
      "¿Qué obras de pavimentación barrial y drenaje pluvial son las más urgentes para acabar con el lodo?",
    ],
    submesasSugeridas: [
      {
        nombre: "Energía eléctrica, tarifas justas y energías limpias",
        tema: "Vigilancia a Afinia, reclamos tarifarios y paneles solares comunitarios",
        participantes: 16,
      },
      {
        nombre: "Agua potable, alcantarillado y drenajes pluviales",
        tema: "Ampliación de cobertura de Aguas de Cartagena y desazolve de canales",
        participantes: 16,
      },
      {
        nombre: "Vivienda de interés prioritario y mejoramiento de hábitat",
        tema: "Subsidios de Corvivienda, titulación predial y saneamiento básico habitacional",
        participantes: 15,
      },
      {
        nombre: "Vías barriales e infraestructura comunitaria",
        tema: "Pavimentación de calles en tierra, puentes peatonales y centros comunitarios",
        participantes: 14,
      },
    ],
    resultadosEsperados: [
      "Mesa permanente distrital de vigilancia tarifaria de servicios públicos domiciliarios",
      "Plan plurianual de legalización predial y mejoramiento de vivienda para 15.000 familias",
      "Priorización del Plan Maestro de Drenajes Pluviales en cuencas críticas",
    ],
    marcoNormativo: [
      "Ley 142 de 1994 (Servicios Públicos Domiciliarios)",
      "Ley 388 de 1997 (Desarrollo Territorial)",
      "Ley 2079 de 2021 (Política de Hábitat y Vivienda)",
    ],
  },

  "ms-007": {
    proposito:
      "Articular la acción policial, la justicia restaurativa y la prevención social para frenar el sicariato, el hurto, la extorsión a comerciantes y la conflictividad comunitaria en el Distrito.",
    ordenDelDia: [
      "Apertura por la Secretaría del Interior, Policía Metropolitana y Fiscalía Seccional",
      "Análisis criminológico del homicidio, extorsión y delitos de alto impacto",
      "Ejercicio en papelógrafos con líderes de juntas de acción comunal y frentes de seguridad",
      "Concertación de planes barriales de prevención del delito y justicia cercana",
      "Firma del Pacto Distrital por la Seguridad y Convivencia",
    ],
    preguntasOrientadoras: [
      "¿Cuáles son los factores que facilitan la presencia de bandas criminales y el sicariato en los barrios periféricos?",
      "¿Cómo proteger a tenderos, transportadores y microempresarios frente a las redes de extorsión y 'gota a gota'?",
      "¿Qué deficiencias presentan las cámaras de videovigilancia y los tiempos de respuesta de los cuadrantes de policía?",
      "¿Cómo fortalecer las Casas de Justicia y la mediación comunitaria para resolver riñas y conflictos entre vecinos?",
    ],
    submesasSugeridas: [
      {
        nombre: "Desarticulación del crimen organizado y sicariato",
        tema: "Investigación judicial, control de armas ilegales y patrullaje focalizado",
        participantes: 16,
      },
      {
        nombre: "Prevención comunitaria y frentes de seguridad",
        tema: "Cámaras conectadas, alarmas vecinales e iluminación de puntos oscuros",
        participantes: 15,
      },
      {
        nombre: "Lucha contra la extorsión y economía criminal",
        tema: "Protección al comercio de barrio, líneas seguras GAULA y crédito popular",
        participantes: 14,
      },
      {
        nombre: "Justicia cercana y convivencia ciudadana",
        tema: "Casas de Justicia, comisarías, jueces de paz y resolución pacífica de conflictos",
        participantes: 14,
      },
    ],
    resultadosEsperados: [
      "Plan integral de seguridad con enfoque de derechos humanos y tecnología aplicada",
      "Estrategia interinstitucional GAULA contra la extorsión en zonas comerciales barriales",
      "Red distrital de mediadores comunitarios de paz y reconciliación barrial",
    ],
    marcoNormativo: [
      "Ley 62 de 1993 (Policía Nacional)",
      "Ley 1801 de 2016 (Código Nacional de Seguridad y Convivencia)",
      "Ley 2272 de 2022 (Ley de Paz Total y Seguridad Humana)",
    ],
  },

  "ms-008": {
    proposito:
      "Proteger los cuerpos de agua, caños, lagunas y la Ciénaga de la Virgen, adaptando a Cartagena ante el cambio climático, el aumento del nivel del mar y los desastres naturales.",
    ordenDelDia: [
      "Instalación con el EPA Cartagena, Cardique, Secretaría de Planeación y OAGRD",
      "Diagnóstico ambiental del cambio climático, vertimientos ilegales y riesgos geomorfológicos",
      "Deliberación en submesas de papelógrafos analizando causas del deterioro ecológico",
      "Propuestas de restauración ecológica y ordenamiento alrededor del agua",
      "Conclusiones y adopción de la matriz de sostenibilidad ambiental",
    ],
    preguntasOrientadoras: [
      "¿Qué acciones frenarán el relleno ilegal y la invasión de la Ciénaga de la Virgen y caños internos?",
      "¿Cuál es la vulnerabilidad real de la ciudad frente al aumento del nivel del mar para las próximas décadas?",
      "¿Qué planes de contingencia existen para evitar deslizamientos en La Popa y sectores de alto riesgo?",
      "¿Cómo transformar la recolección de basuras para que el plástico no termine asfixiando la bahía y playas?",
    ],
    submesasSugeridas: [
      {
        nombre: "Saneamiento de caños, lagunas y Ciénaga de la Virgen",
        tema: "Erradicación de vertimientos, dragado ecológico y reforestación de manglar",
        participantes: 16,
      },
      {
        nombre: "Adaptación al cambio climático y erosión costera",
        tema: "Plan 4C actualizado, obras de protección y drenaje pluvial verde",
        participantes: 15,
      },
      {
        nombre: "Gestión del riesgo de desastres y laderas",
        tema: "Monitoreo de fallas geológicas, reubicación concertada y alertas tempranas",
        participantes: 14,
      },
      {
        nombre: "Economía circular y gestión de residuos sólidos",
        tema: "Recicladores de oficio, erradicación de botaderos y cero plásticos en fuentes hídricas",
        participantes: 14,
      },
    ],
    resultadosEsperados: [
      "Hoja de ruta para la descontaminación y dragado ambiental del sistema de caños y lagunas",
      "Actualización del Plan 4C (Cartagena Competitiva y Compatible con el Clima)",
      "Protocolo distrital de reasentamiento digno y concertado de familias en zonas de alto riesgo no mitigable",
    ],
    marcoNormativo: [
      "Ley 99 de 1993",
      "Ley 1523 de 2012 (Gestión del Riesgo de Desastres)",
      "Ley 1931 de 2018 (Directrices para la Gestión del Cambio Climático)",
      "Sentencia T-080 de 2017",
    ],
  },

  "ms-009": {
    proposito:
      "Impulsar un modelo económico diversificado, empleo formal, apoyo decidido a la economía popular, desarrollo de ciencia y tecnología, y un turismo responsable que beneficie a las mayorías.",
    ordenDelDia: [
      "Apertura con la Secretaría de Hacienda, Secretaría de Turismo y Cámara de Comercio",
      "Diagnóstico de informalidad laboral, estacionalidad del turismo y brecha de competitividad",
      "Trabajo grupal en papelógrafos con emprendedores, gremios y comerciantes informales",
      "Socialización de soluciones para la reactivación económica incluyente",
      "Firma del acuerdo por la competitividad y el trabajo decente",
    ],
    preguntasOrientadoras: [
      "¿Cómo apoyar a los más de 100.000 trabajadores de la economía informal para acceder a crédito sin caer en el agio?",
      "¿Qué incentivos tributarios y de simplificación de trámites facilitan la creación y supervivencia de mipymes?",
      "¿Cómo diversificar la economía cartagenera hacia la industria del software, logística portuaria y bioeconomía?",
      "¿Qué reglas deben regir para que el turismo genere empleo de calidad, salarios justos y no gentrifique los barrios?",
    ],
    submesasSugeridas: [
      {
        nombre: "Economía popular, crédito y formalización",
        tema: "Banca comunitaria contra el gota a gota, simplificación de RUT y ferias barriales",
        participantes: 16,
      },
      {
        nombre: "Turismo sostenible, descentralizado y comunitario",
        tema: "Rutas turísticas en localidades 2 y 3, regulación de tarifas y hotelería ética",
        participantes: 16,
      },
      {
        nombre: "Ciencia, tecnología, innovación y software",
        tema: "Centros de formación digital, incubadoras de base tecnológica y nómadas digitales",
        participantes: 14,
      },
      {
        nombre: "Encadenamientos portuarios e industria verde",
        tema: "Compras locales a proveedores cartageneros y transición hacia industrias limpias",
        participantes: 14,
      },
    ],
    resultadosEsperados: [
      "Fondo distrital de financiamiento y capital semilla para la economía popular",
      "Estrategia de descentralización de la oferta turística hacia los corregimientos y barrios históricos no tradicionales",
      "Plan de formación en habilidades tecnológicas y bilingüismo para 10.000 jóvenes cartageneros",
    ],
    marcoNormativo: [
      "Ley 2068 de 2020 (Ley General de Turismo)",
      "Ley 905 de 2004 (Fomento a las Mipymes)",
      "CONPES 3956 de 2019 (Formalización Empresarial)",
    ],
  },

  "ms-010": {
    proposito:
      "Erradicar la corrupción administrativa, implementar presupuestos participativos vinculantes, garantizar datos abiertos y fomentar la cultura de corresponsabilidad y cuidado de lo público.",
    ordenDelDia: [
      "Instalación con veedurías ciudadanas, Personería Distrital y Contraloría",
      "Presentación de índices de percepción de corrupción y ejecución presupuestal",
      "Ejercicio en papelógrafos con líderes cívicos analizando fallas en la rendición de cuentas",
      "Construcción de propuestas para el control social y la pedagogía ciudadana",
      "Firma del pacto por la transparencia y la probidad pública",
    ],
    preguntasOrientadoras: [
      "¿Cuáles son las áreas de la contratación pública más opacas o susceptibles a direccionamiento de pliegos?",
      "¿Cómo garantizar que la ciudadanía decida de manera directa sobre una porción vinculante del presupuesto distrital?",
      "¿Qué garantías reales de protección y acceso a la información tienen los veedores ciudadanos comunitarios?",
      "¿Qué campañas de cultura ciudadana transformarán la relación de los cartageneros con el espacio público y las normas de convivencia?",
    ],
    submesasSugeridas: [
      {
        nombre: "Contratación transparente y datos abiertos",
        tema: "Pliegos tipo, seguimiento en tiempo real a obras públicas y datos abiertos accesibles",
        participantes: 15,
      },
      {
        nombre: "Presupuestos participativos vinculantes",
        tema: "Cabildos barriales de priorización presupuestal y votación ciudadana directa",
        participantes: 15,
      },
      {
        nombre: "Veedurías ciudadanas y control social",
        tema: "Capacitación en control social, protección a denunciantes y audiencias públicas descentralizadas",
        participantes: 14,
      },
      {
        nombre: "Cultura ciudadana, civismo y pertenencia",
        tema: "Cuidado de parques, respeto por normas de tránsito y orgullo cartagenero",
        participantes: 14,
      },
    ],
    resultadosEsperados: [
      "Plataforma distrital de auditoría social y seguimiento georreferenciado a cada contrato público",
      "Reglamento para la implementación obligatoria de presupuestos participativos en las tres localidades",
      "Estrategia permanente de cultura ciudadana en colegios, transporte público y medios comunitarios",
    ],
    marcoNormativo: [
      "Ley 1712 de 2014 (Transparencia y Acceso a la Información Pública)",
      "Ley 1757 de 2015 (Estatuto de la Participación Ciudadana)",
      "Ley 2195 de 2022 (Transparencia y Lucha contra la Corrupción)",
    ],
  },

  "ms-011": {
    proposito:
      "Consolidar a Cartagena como territorio de paz, implementando los acuerdos de paz, garantizando la reincorporación comunitaria integral, desarticulando violencias urbanas y promoviendo la memoria histórica.",
    ordenDelDia: [
      "Instalación institucional con la ARN, Jurisdicción Especial para la Paz (JEP) y Mesa de Paz",
      "Análisis de riesgos para firmantes de paz, comunidades receptoras y defensores de DDHH",
      "Taller con papelógrafos analizando causas de estigmatización y violencia armada",
      "Socialización de propuestas de reconciliación y convivencia comunitaria",
      "Firma del pacto distrital por la Paz Total y la Reconciliación",
    ],
    preguntasOrientadoras: [
      "¿Qué iniciativas productivas y de vivienda sostenible facilitan la reincorporación de firmantes de paz en Cartagena?",
      "¿Cómo evitar que grupos armados ilegales y bandas criminales sigan reclutando a jóvenes en barrios vulnerables?",
      "¿Qué garantías de seguridad física y jurídica requieren los defensores de derechos humanos y líderes sociales?",
      "¿Cómo convertir los espacios comunitarios en escenarios permanentes de diálogo, verdad y perdón social?",
    ],
    submesasSugeridas: [
      {
        nombre: "Reincorporación social y proyectos productivos",
        tema: "Cooperativas de firmantes, acceso a tierras y comercialización solidaria",
        participantes: 15,
      },
      {
        nombre: "Protección a líderes sociales y defensores de DDHH",
        tema: "Mesas territoriales de garantías, alertas tempranas y protección colectiva",
        participantes: 15,
      },
      {
        nombre: "Prevención del reclutamiento forzado y violencia urbana",
        tema: "Zonas de paz comunitarias, oferta educativa integral y justicia restaurativa",
        participantes: 14,
      },
      {
        nombre: "Memoria histórica, verdad y reconciliación",
        tema: "Museo de la memoria distrital, cátedra de paz y pedagogía del perdón",
        participantes: 14,
      },
    ],
    resultadosEsperados: [
      "Plan distrital de acción para la implementación territorial del Acuerdo de Paz",
      "Protocolo interinstitucional de protección colectiva a comunidades amenazadas",
      "Centro distrital de memoria histórica, reconciliación y pedagogía de paz",
    ],
    marcoNormativo: [
      "Ley 2272 de 2022 (Ley de Paz Total)",
      "Decreto Ley 893 de 2017 (Programas de Desarrollo con Enfoque Territorial)",
      "Acto Legislativo 02 de 2017 (Blindaje Jurídico del Acuerdo de Paz)",
      "Sentencia C-150 de 2015",
    ],
  },

  // ── PLENARIA DE CIERRE ──────────────────────────────────────────────
  "pc-001": {
    proposito:
      "Consolidar y validar los resultados de las 35 mesas previas de consulta ciudadana, entregando la devolución motivada exigida por la Sentencia C-150/15 y suscribiendo el Acta de Compromisos 2026-2036.",
    ordenDelDia: [
      "Instalación solemne por el Alcalde Mayor de Cartagena y el Consejo Distrital de Planeación",
      "Presentación del informe general de aportes, árboles de problemas y soluciones sistematizados",
      "Audiencia formal de Devolución Ciudadana Motivada (Sentencia C-150/15) por ejes temáticos",
      "Intervención de delegados y voceros comunitarios de las 3 localidades y corregimientos",
      "Firma solemne del Acta Distrital de Compromisos y Hoja de Ruta 2026-2036",
    ],
    preguntasOrientadoras: [
      "¿De qué manera el proyecto de política pública responde directamente a las prioridades expresadas en cada territorio?",
      "¿Cuáles fueron las causales técnicas, jurídicas o presupuestales por las cuales ciertos aportes no pudieron ser acogidos?",
      "¿Qué metas e indicadores verificarán anualmente el cumplimiento de los compromisos adquiridos?",
      "¿Cómo participarán los ciudadanos en el Comité de Seguimiento y Veeduría Ciudadana a la política pública?",
    ],
    submesasSugeridas: [
      {
        nombre: "Seguimiento a compromisos de seguridad personal y justicia",
        tema: "Indicadores de homicidios, comisarías y protección comunitaria",
        participantes: 20,
      },
      {
        nombre: "Seguimiento a seguridad económica y hábitat",
        tema: "Metas de empleo, vivienda digna y servicios públicos",
        participantes: 20,
      },
      {
        nombre: "Seguimiento a seguridad ambiental y alimentaria",
        tema: "Restauración de cuerpos de agua, nutrición infantil y gestión del riesgo",
        participantes: 20,
      },
      {
        nombre: "Veeduría ciudadana y gobernanza democrática",
        tema: "Comité permanente de veeduría y rendición de cuentas anual",
        participantes: 20,
      },
    ],
    resultadosEsperados: [
      "Documento oficial de Devolución Ciudadana Motivada conforme a la Sentencia C-150/15",
      "Acta solemne de Compromisos Distritales 2026-2036 suscrita por autoridades y delegados",
      "Conformación del Comité Ciudadano de Veeduría y Monitoreo a la Política Pública",
    ],
    marcoNormativo: [
      "Sentencia C-150 de 2015 (Corte Constitucional - Devolución Motivada Obligatoria)",
      "Ley 1757 de 2015 (Estatuto de Participación Ciudadana)",
      "Ley 152 de 1994 (Ley Orgánica del Plan de Desarrollo)",
      "Ley 1617 de 2013 (Régimen Distrital)",
    ],
  },
};
