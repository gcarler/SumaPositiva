import type { PoliticaPublica } from "@/features/politicas/models/politicas";

/**
 * Dataset canónico contextualizado al Distrito de Cartagena de Indias.
 * Purga pericial completada (Hito D-0): 100% articulado a las problemáticas
 * territoriales de las 3 Localidades y la Zona Corregimental e Insular.
 */

export const POLITICAS_MOCK: PoliticaPublica[] = [
  {
    id: "pol-001",
    slug: "seguridad-humana-cartagena",
    titulo: "Política Pública de Seguridad Humana Integral de Cartagena 2026–2036",
    resumen:
      "Construcción participativa de la Política Pública de Seguridad Humana Integral del Distrito de Cartagena de Indias (Ley Estatutaria 1757 de 2015), articulando las 7 Dimensiones ONU y la planeación distrital con anclaje territorial.",
    descripcion:
      "La Política Pública de Seguridad Humana Integral de Cartagena de Indias (2026–2036) adopta el paradigma multidimensional de la ONU, protegiendo las libertades fundamentales frente al miedo, la necesidad y la indignidad. Integra las 3 localidades urbanas y la zona corregimental e insular (La Boquilla, Pasacaballos, Tierrabomba, Barú, Bayunca) para transformar las causas estructurales de la violencia, la exclusión y la degradación ambiental.",
    problema:
      "Cartagena enfrenta brechas históricas de inequidad socioeconómica, altos índices de homicidio y violencia interpersonal, amenazas de explotación sexual comercial de niñas, niños y adolescentes (ESCNNA) en zonas turísticas, conflictividades y fronteras invisibles entre jóvenes en barrios populares, informalidad laboral extrema y alta vulnerabilidad climática en la Ciénaga de la Virgen y zonas de bajamar.",
    sector: "seguridad",
    estado: "consulta_publica",
    cobertura: "Distrito de Cartagena: 3 Localidades urbanas, 11 corregimientos y zonas insulares",
    fechaInicio: "2026-02-01",
    fechaCierre: "2026-12-31",
    participantes: 0,
    fases: [
      {
        id: "fase-001-1",
        politicaId: "pol-001",
        orden: 1,
        nombre: "Fase 1: Diagnóstico Participativo y Territorial",
        tipo: "diagnostico",
        descripcion:
          "Levantamiento de línea base de diagnóstico cuantitativo, geovisor de conflictividad, alertas tempranas SAT de la Defensoría y mesas territoriales en las 3 localidades y zona corregimental e insular de Cartagena.",
        estado: "activa",
        progreso: 15,
        lineas: [
          {
            id: "lin-001-1-1",
            faseId: "fase-001-1",
            codigo: "LE-01",
            titulo: "Prevención de ESCNNA y Protección Integral de Niñez",
            descripcion:
              "Diagnóstico y caracterización de riesgos frente a la explotación sexual comercial de niñas, niños y adolescentes en corredores turísticos, playas y entornos escolares.",
            aportes: [
              {
                id: "apo-001-1-1-1",
                lineaId: "lin-001-1-1",
                tipo: "anotacion",
                titulo: "Focos críticos nocturnos en Torre del Reloj y muelles de La Bodeguita",
                contenido:
                  "El diagnóstico debe visibilizar que entre las 11:00 p.m. y las 4:00 a.m. se evidencia captación de menores en las inmediaciones de la Torre del Reloj, el Parque del Centenario y los muelles de embarque turístico hacia las islas. Es imperativo medir tiempos de reacción institucional entre la Policía de Turismo, Comisarías de Familia y el ICBF durante fines de semana.",
                autor: "Rosaura Consuegra Puello",
                fecha: "2026-03-04",
                votos: 342,
                apoyado: true,
              },
              {
                id: "apo-001-1-1-2",
                lineaId: "lin-001-1-1",
                tipo: "propuesta",
                titulo: "Células móviles de respuesta inmediata y certificación The Code en hoteles",
                contenido:
                  "Propongo que el diagnóstico evalúe la capacidad instalada de 3 unidades móviles interdisciplinarias (psicología, trabajo social y policía de infancia) ubicadas en Bocagrande, Centro Histórico y Playa Blanca (Barú), junto con un censo de prestadores turísticos que implementan el código de conducta vinculante contra la ESCNNA.",
                autor: "Carlos Monroy Luján (ASOTELCA)",
                fecha: "2026-03-12",
                votos: 289,
                apoyado: false,
              },
              {
                id: "apo-001-1-1-3",
                lineaId: "lin-001-1-1",
                tipo: "pregunta",
                titulo: "¿El diagnóstico cruzará denuncias anónimas con registros del SIVIGILA y Medicina Legal?",
                contenido:
                  "Muchos casos de violencia sexual y ESCNNA no se denuncian penalmente ante Fiscalía por amenazas de redes criminales, pero sí llegan a urgencias hospitalarias del DADIS o a Medicina Legal. ¿El diagnóstico distrital integrará estas fuentes de salud pública para calcular la cifra negra del fenómeno?",
                autor: "Sebastián Gómez Alarcón",
                fecha: "2026-03-19",
                votos: 195,
                apoyado: false,
              },
            ],
          },
          {
            id: "lin-001-1-2",
            faseId: "fase-001-1",
            codigo: "LE-02",
            titulo: "Convivencia Comunitaria y Transformación de Fronteras Invisibles",
            descripcion:
              "Identificación de conflictividades armadas, enfrentamientos entre jóvenes de sectores rivales y barreras invisibles en barrios de las Localidades 2 y 3.",
            aportes: [
              {
                id: "apo-001-1-2-1",
                lineaId: "lin-001-1-2",
                tipo: "propuesta",
                titulo: "Corredores seguros comunitarios entre Olaya Herrera, Boston y El Pozón",
                contenido:
                  "Las fronteras invisibles sobre la vía Perimetral y el canal de Chiquinquirá impiden a los estudiantes cruzar al colegio o a los puestos de salud. Propongo un pacto barrial de no agresión respaldado por gestores de convivencia de los mismos sectores de Olaya (Zarzuela, Progreso, Playa Blanca y Central), acompañados de luminarias LED y alarmas vecinales conectadas al CAD 123.",
                autor: "Dairo José Cabarcas (JAC Olaya Herrera)",
                fecha: "2026-03-08",
                votos: 415,
                apoyado: true,
              },
              {
                id: "apo-001-1-2-2",
                lineaId: "lin-001-1-2",
                tipo: "anotacion",
                titulo: "Desarmes voluntarios articulados a oportunidades laborales y culturales",
                contenido:
                  "En Nelson Mandela (sector Las Colinas y Villa Hermosa) los jóvenes en riesgo no entregan armas artesanales ('changones') si no hay un incentivo verificable de formación técnica en el SENA y capital semilla para microemprendimientos de sonido, confección o barbería. El diagnóstico policial debe complementarse con diagnóstico social de expectativas juveniles.",
                autor: "Brayan Andrés Paternina (Líder Juvenil Mandela)",
                fecha: "2026-03-15",
                votos: 378,
                apoyado: false,
              },
              {
                id: "apo-001-1-2-3",
                lineaId: "lin-001-1-2",
                tipo: "pregunta",
                titulo: "¿Cómo se medirá la efectividad de las Casas de Justicia Móviles?",
                contenido:
                  "En la Localidad 2 la Casa de Justicia de Chiquinquirá está distante para los sectores ribereños. ¿El diagnóstico incluye la demanda insatisfecha de mediación comunitaria y conciliación en equidad en barrios como La Esperanza y San Francisco?",
                autor: "Jorge Eliecer Montes (ASOJAC Localidad 2)",
                fecha: "2026-03-22",
                votos: 164,
                apoyado: false,
              },
            ],
          },
          {
            id: "lin-001-1-3",
            faseId: "fase-001-1",
            codigo: "LE-03",
            titulo: "Seguridad Ambiental y Resiliencia en la Ciénaga de la Virgen",
            descripcion:
              "Evaluación del impacto del relleno de manglares, vertimientos ilegales de aguas residuales y vulnerabilidad ante inundaciones pluviales y de marea.",
            aportes: [
              {
                id: "apo-001-1-3-1",
                lineaId: "lin-001-1-3",
                tipo: "anotacion",
                titulo: "Rellenos ilegales en la cota de bajamar de La Boquilla y Marlinda",
                contenido:
                  "La tala de mangle y el relleno con escombros para venta ilegal de lotes en la orilla de la Ciénaga de la Virgen están destruyendo la barrera natural contra marejadas y provocando inundaciones crónicas en más de 800 familias de pescadores tradicionales. El diagnóstico debe delimitar satelitalmente la línea de costa con el EPA y Cardique.",
                autor: "Teresa Paternina Blanquicet (Consejo Comunitario La Boquilla)",
                fecha: "2026-03-10",
                votos: 489,
                apoyado: true,
              },
              {
                id: "apo-001-1-3-2",
                lineaId: "lin-001-1-3",
                tipo: "propuesta",
                titulo: "Red comunitaria de sensores hidrológicos y dragado de caños internos",
                contenido:
                  "Propongo instalar sensores telemétricos de bajo costo en el Caño Juan Angola, Caño Bazurto y Ciénaga de la Virgen para alimentar el Geovisor POLIS en tiempo real, combinándolo con cuadrillas comunitarias de limpieza y recuperación de canales de drenaje antes del pico invernal de mayo y octubre.",
                autor: "Dr. Daniel Toro González (UTB)",
                fecha: "2026-03-17",
                votos: 312,
                apoyado: false,
              },
              {
                id: "apo-001-1-3-3",
                lineaId: "lin-001-1-3",
                tipo: "pregunta",
                titulo: "¿Se incluirá el inventario pericial de microbasurales y vertimientos?",
                contenido:
                  "La sedimentación provocada por residuos sólidos asfixia la fauna marina en Tierrabomba y Caño del Oro. ¿El diagnóstico contempla mapear los puntos críticos de vertimiento que contaminan la bahía de Cartagena y las fuentes de subsistencia pesquera?",
                autor: "Marcos Morales Polo (Consejo Comunitario Tierrabomba)",
                fecha: "2026-03-25",
                votos: 218,
                apoyado: false,
              },
            ],
          },
          {
            id: "lin-001-1-4",
            faseId: "fase-001-1",
            codigo: "LE-04",
            titulo: "Seguridad Económica, Inclusión Productiva e Informalidad",
            descripcion:
              "Caracterización del empleo informal, extorsión ('gota a gota') en el Mercado de Bazurto y alternativas económicas sostenibles para comunidades vulnerables.",
            aportes: [
              {
                id: "apo-001-1-4-1",
                lineaId: "lin-001-1-4",
                tipo: "propuesta",
                titulo: "Censo de economía popular y fondo de microcrédito contra el 'gota a gota'",
                contenido:
                  "En el Mercado de Bazurto y los corredores comerciales de La Esperanza y El Carmelo, más del 70% de los comerciantes dependen de prestamistas ilegales que cobran 20% mensual bajo amenaza armada. La política debe diagnosticar el volumen de deuda informal y estructurar un fondo rotatorio distrital con tasas subsidiadas administrado con la Cámara de Comercio.",
                autor: "Juan Carlos Gómez (Cámara de Comercio de Cartagena)",
                fecha: "2026-03-11",
                votos: 521,
                apoyado: true,
              },
              {
                id: "apo-001-1-4-2",
                lineaId: "lin-001-1-4",
                tipo: "anotacion",
                titulo: "Inseguridad en el sector El Cobertizo y falta de baños públicos en Bazurto",
                contenido:
                  "Las condiciones sanitarias y de seguridad en el sector del pescado y verduras de Bazurto degradan la actividad comercial y facilitan la actuación de bandas de 'jaladores' y reducidores. Sin dignificación de la infraestructura del mercado, ninguna estrategia de seguridad policial será sostenible.",
                autor: "Carmen Julia Valiente (Asociación Comerciantes Bazurto)",
                fecha: "2026-03-18",
                votos: 276,
                apoyado: false,
              },
              {
                id: "apo-001-1-4-3",
                lineaId: "lin-001-1-4",
                tipo: "pregunta",
                titulo: "¿Habrá líneas de empleo verde y reconversión para mototaxistas?",
                contenido:
                  "Cartagena cuenta con más de 45.000 mototaxistas según Cartagena Cómo Vamos, la mayoría jóvenes sin acceso a pensión o ARL. ¿El diagnóstico incluye la viabilidad de reconvertir laboralmente a este grupo hacia logística portuaria, turismo bilingüe y energías limpias?",
                autor: "Dra. Eliana Salas Barón (Cartagena Cómo Vamos)",
                fecha: "2026-03-26",
                votos: 388,
                apoyado: false,
              },
            ],
          },
        ],
      },
      {
        id: "fase-001-2",
        politicaId: "pol-001",
        orden: 2,
        nombre: "Fase 2: Formulación de Líneas Estratégicas y Metas",
        tipo: "formulacion",
        descripcion:
          "Cocreación de las 4 líneas estratégicas, definición de metas cuatrienales cuantificables y programas de inversión con cargo al FONSET y fuentes distritales.",
        estado: "proxima",
        progreso: 0,
        lineas: [
          {
            id: "lin-001-2-1",
            faseId: "fase-001-2",
            codigo: "LE-01",
            titulo: "Blindaje Institucional y Comunitario frente a la ESCNNA",
            descripcion:
              "Protocolos vinculantes para prestadores turísticos, corredores escolares protegidos y centros distritales de atención integral a la infancia y adolescencia.",
            aportes: [
              {
                id: "apo-001-2-1-1",
                lineaId: "lin-001-2-1",
                tipo: "propuesta",
                titulo: "Casa Refugio Distrital y Centro de Recepción Inmediata en el Centro Histórico",
                contenido:
                  "Establecer una Casa Refugio de funcionamiento ininterrumpido (24/7) en el cordón amurallado, con capacidad de acogida de emergencia para niñas, niños y adolescentes rescatados de redes de trata, garantizando atención psicosocial, jurídica y médica sin revictimización.",
                autor: "Yenis Pacheco Mercado (Mesa Distrital de Víctimas)",
                fecha: "2026-03-27",
                votos: 432,
                apoyado: true,
              },
              {
                id: "apo-001-2-1-2",
                lineaId: "lin-001-2-1",
                tipo: "anotacion",
                titulo: "Sanciones rigurosas a inmuebles turísticos y plataformas de alquiler",
                contenido:
                  "La línea estratégica debe articular facultades de extinción de dominio y suspensión inmediata del Registro Nacional de Turismo (RNT) para hostales, apartamentos turísticos y chivas que faciliten el ingreso de menores para fines de explotación sexual.",
                autor: "Dr. Kairen Gutiérrez Tejada (Universidad de Cartagena)",
                fecha: "2026-03-29",
                votos: 367,
                apoyado: false,
              },
              {
                id: "apo-001-2-1-3",
                lineaId: "lin-001-2-1",
                tipo: "pregunta",
                titulo: "¿Qué metas presupuestales concretas se asignarán del FONSET a esta línea?",
                contenido:
                  "Históricamente los recursos de seguridad se han concentrado en compra de patrullas y gasolina. ¿Qué porcentaje exacto del FONSET se blindará por decreto para los programas de prevención y protección a la niñez?",
                autor: "Dra. Valérie Delplanque (ACNUR)",
                fecha: "2026-03-31",
                votos: 290,
                apoyado: true,
              },
            ],
          },
          {
            id: "lin-001-2-2",
            faseId: "fase-001-2",
            codigo: "LE-02",
            titulo: "Desarme Comunitario, Mediación de Conflictos y Territorios de Paz",
            descripcion:
              "Intervención integral en sectores priorizados de Olaya Herrera, El Pozón, Nelson Mandela y Boston para desarticular fronteras invisibles y fortalecer la justicia comunitaria.",
            aportes: [
              {
                id: "apo-001-2-2-1",
                lineaId: "lin-001-2-2",
                tipo: "propuesta",
                titulo: "Programa distrital 'Jóvenes Constructores de Paz' con transferencias condicionadas",
                contenido:
                  "Vincular a 2.500 jóvenes de sectores con fronteras invisibles en Olaya y Mandela a procesos formativos de 12 meses en habilidades digitales, bilingüismo y artes escénicas, condicionado a la entrega de armas y permanencia comunitaria verificable por juntas de acción comunal.",
                autor: "Brayan Andrés Paternina (Gestor de Paz Mandela)",
                fecha: "2026-03-28",
                votos: 512,
                apoyado: true,
              },
              {
                id: "apo-001-2-2-2",
                lineaId: "lin-001-2-2",
                tipo: "anotacion",
                titulo: "Iluminación LED prioritaria en los puentes de madera y callejones oscuros",
                contenido:
                  "El mapa de calor de homicidios en la Localidad 2 coincide con puntos ciegos sin alumbrado público en los pasos peatonales sobre los caños. La infraestructura de seguridad física debe priorizar estas zonas antes de instalar más cámaras pasivas.",
                autor: "Dairo José Cabarcas (JAC Olaya Herrera)",
                fecha: "2026-03-30",
                votos: 341,
                apoyado: false,
              },
              {
                id: "apo-001-2-2-3",
                lineaId: "lin-001-2-2",
                tipo: "pregunta",
                titulo: "¿Cómo se garantizará la seguridad de los líderes comunales mediadores?",
                contenido:
                  "Los conciliadores en equidad y presidentes de JAC que median entre combos juveniles quedan expuestos a represalias. ¿La política contempla medidas colectivas de protección preventiva en coordinación con la UNP y la Personería?",
                autor: "Jorge Eliecer Montes (ASOJAC Localidad 2)",
                fecha: "2026-04-01",
                votos: 215,
                apoyado: false,
              },
            ],
          },
          {
            id: "lin-001-2-3",
            faseId: "fase-001-2",
            codigo: "LE-03",
            titulo: "Regeneración Ecoterritorial y Adaptación Climática en Zonas de Bajamar",
            descripcion:
              "Protección del anillo ambiental de la Ciénaga de la Virgen, relocalización concertada en zonas de alto riesgo no mitigable y ecoturismo comunitario.",
            aportes: [
              {
                id: "apo-001-2-3-1",
                lineaId: "lin-001-2-3",
                tipo: "propuesta",
                titulo: "Parque Lineal de Borde y Cinturón Verde de Mangle en la Vía Perimetral",
                contenido:
                  "Consolidar un cordón de protección ambiental de 7 kilómetros sobre la ribera de la Ciénaga de la Virgen mediante reforestación de mangle rojo y senderos palafíticos ecoturísticos operados por familias pescadoras de La Candelaria y Boston, frenando definitivamente los rellenos ilegales.",
                autor: "Teresa Paternina Blanquicet (Consejo Comunitario La Boquilla)",
                fecha: "2026-03-29",
                votos: 476,
                apoyado: true,
              },
              {
                id: "apo-001-2-3-2",
                lineaId: "lin-001-2-3",
                tipo: "anotacion",
                titulo: "Integración obligatoria del Plan de Gestión del Riesgo en el Geovisor POLIS",
                contenido:
                  "Las alertas de marea alta y lluvias torrenciales deben activar alertas tempranas directas a celulares de comités barriales de emergencia (COMBAS) integrados en la plataforma distrital.",
                autor: "Dr. Daniel Toro González (Observatorio del Caribe - UTB)",
                fecha: "2026-03-31",
                votos: 310,
                apoyado: false,
              },
              {
                id: "apo-001-2-3-3",
                lineaId: "lin-001-2-3",
                tipo: "pregunta",
                titulo: "¿Qué soluciones habitacionales se darán a quienes viven sobre aguas contaminadas?",
                contenido:
                  "El reasentamiento no puede significar expulsar a las familias hacia las periferias desprovistas de transporte. ¿El plan contempla vivienda de interés prioritario (VIP) dentro del mismo entorno urbano de la Localidad 2?",
                autor: "Rosaura Consuegra Puello (Red de Mujeres)",
                fecha: "2026-04-02",
                votos: 288,
                apoyado: false,
              },
            ],
          },
          {
            id: "lin-001-2-4",
            faseId: "fase-001-2",
            codigo: "LE-04",
            titulo: "Economía Popular, Dignificación de Bazurto e Inclusión Juvenil",
            descripcion:
              "Formalización progresiva, créditos productivos distritales, modernización del Mercado de Bazurto y empleabilidad técnica en sectores estratégicos.",
            aportes: [
              {
                id: "apo-001-2-4-1",
                lineaId: "lin-001-2-4",
                tipo: "propuesta",
                titulo: "Banco Comunitario de Microcréditos y Estaciones de Carga Segura en Bazurto",
                contenido:
                  "Implementar líneas de crédito desde $500.000 hasta $3.000.000 para vendedores estacionarios de alimentos y perecederos con tasa de interés inferior al 1.5% mensual, acompañado de un centro de pesaje y refrigeración pública comunitaria en Bazurto.",
                autor: "Juan Carlos Gómez (Cámara de Comercio de Cartagena)",
                fecha: "2026-03-30",
                votos: 598,
                apoyado: true,
              },
              {
                id: "apo-001-2-4-2",
                lineaId: "lin-001-2-4",
                tipo: "anotacion",
                titulo: "Rutas circulares de transporte seguro para trabajadoras del mercado",
                contenido:
                  "Las vendedoras que ingresan a Bazurto a las 3:30 a.m. son víctimas reiteradas de atracos en los paraderos de la Av. Pedro de Heredia. Se requiere un circuito de transporte alimentador matutino custodiado entre los barrios del suroriente y el mercado.",
                autor: "Carmen Julia Valiente (Asociación Comerciantes Bazurto)",
                fecha: "2026-04-01",
                votos: 354,
                apoyado: true,
              },
              {
                id: "apo-001-2-4-3",
                lineaId: "lin-001-2-4",
                tipo: "pregunta",
                titulo: "¿Qué incentivos tributarios se ofrecerán a empresas de Mamonal que contraten jóvenes de Nelson Mandela?",
                contenido:
                  "El corredor industrial de Mamonal linda con barrios sumidos en pobreza extrema. ¿La formulación de la política incluye incentivos en ICA o Predial para empresas que certifiquen primer empleo formal para jóvenes de la Localidad 3?",
                autor: "Dr. Jean-Marc Fournier (PNUD Colombia)",
                fecha: "2026-04-02",
                votos: 395,
                apoyado: false,
              },
            ],
          },
        ],
      },
      {
        id: "fase-001-3",
        politicaId: "pol-001",
        orden: 3,
        nombre: "Fase 3: Deliberación y Concertación Territorial",
        tipo: "deliberacion",
        descripcion:
          "Mesas de concertación en las Localidades 1, 2 y 3, asambleas étnico-comunitarias en corregimientos e islas y deliberación digital para priorizar metas e inversiones FONSET.",
        estado: "proxima",
        progreso: 0,
        lineas: [],
      },
      {
        id: "fase-001-4",
        politicaId: "pol-001",
        orden: 4,
        nombre: "Fase 4: Validación y Adopción del Documento de Política Pública Distrital",
        tipo: "validacion",
        descripcion:
          "Audiencia pública distrital de rendición pericial y consulta final sobre el documento de política pública articulado a la formulación metodológica distrital y Sentencia C-150 de 2015.",
        estado: "proxima",
        progreso: 0,
        lineas: [],
      },
    ],
  },
];
