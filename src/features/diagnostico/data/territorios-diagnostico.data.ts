/**
 * POLIS — Catálogo Oficial de Territorios y Fichas de Vulnerabilidad
 * Distrito Turístico y Cultural de Cartagena de Indias.
 * Fundamentado en DANE, Sisbén IV, Secretaría de Planeación y CONPES 4040.
 */

import type { FichaTerritorialDiagnostico } from "../models/territorio-diagnostico";

export const TERRITORIOS_DIAGNOSTICO_CANONICOS: FichaTerritorialDiagnostico[] = [
  {
    id: "terr-loc-1",
    codigo: "LOC-01",
    nombre: "Localidad 1 — Histórica y del Caribe Norte",
    localidad: "LOCALIDAD_1",
    localidadNombre: "Localidad 1: Histórica y del Caribe Norte",
    tipoZona: "URBANA",
    esEtnicoLey70: false,
    ucgsAbarcadas: ["UCG 1", "UCG 2", "UCG 3", "UCG 8", "UCG 9"],
    barriosPrincipales: [
      "Centro Histórico",
      "San Diego",
      "Getsemaní",
      "Cabrera",
      "Torices",
      "Manga",
      "Pie de la Popa",
      "Bocagrande",
      "Castillogrande",
      "El Laguito",
      "Marbella",
      "Crespo",
    ],
    poblacionEstimada: 345000,
    poblacionVulnerable: 98000,
    porcentajeNbi: 22.4,
    nivelRiesgo: "MEDIO",
    tasaHomicidiosPorCienMil: 18.2,
    alertasTempranasSat: 3,
    problematicasPriorizadas: [
      {
        titulo: "Redes de ESCNNA y microtráfico en corredores turísticos",
        descripcion:
          "Vulnerabilidad de niños y adolescentes frente a redes de explotación en Centro Histórico, La Bodeguita y zonas nocturnas.",
        dimension: "Protección Integral de Niñez y Seguridad Humana",
        severidad: "ALTO",
      },
      {
        titulo: "Presión inmobiliaria y gentrificación en barrios tradicionales",
        descripcion:
          "Desplazamiento de comunidades originarias en Getsemaní, San Diego y Torices por auge de rentas cortas.",
        dimension: "Seguridad Territorial y Hábitat",
        severidad: "MEDIO",
      },
      {
        titulo: "Inundaciones por marea alta y drenajes pluviales colmatados",
        descripcion:
          "Afectación periódica en vías de Bocagrande, Castillogrande y sectores de Marbella por cambio climático.",
        dimension: "Seguridad Ambiental y Resiliencia",
        severidad: "MEDIO",
      },
    ],
    equipamientos: {
      caisOEstaciones: 8,
      centrosSalud: 6,
      colegiosOficiales: 18,
      comedoresComunitarios: 5,
      deficitDetectado:
        "Déficit en comisarías de familia especializadas en niñez y centros de acogida 24/7.",
    },
    participacion: {
      mesasRealizadas: 0,
      propuestasRadicadas: 0,
      testimoniosRegistrados: 0,
    },
  },
  {
    id: "terr-loc-2",
    codigo: "LOC-02",
    nombre: "Localidad 2 — De la Virgen y Turística",
    localidad: "LOCALIDAD_2",
    localidadNombre: "Localidad 2: De la Virgen y Turística",
    tipoZona: "URBANA",
    esEtnicoLey70: false,
    ucgsAbarcadas: ["UCG 4", "UCG 5", "UCG 6", "UCG 7"],
    barriosPrincipales: [
      "Olaya Herrera",
      "El Pozón",
      "Fredonia",
      "Boston",
      "La Esperanza",
      "La María",
      "San Francisco",
      "7 de Agosto",
      "Nuevo Paraíso",
    ],
    poblacionEstimada: 410000,
    poblacionVulnerable: 265000,
    porcentajeNbi: 44.8,
    nivelRiesgo: "ALTO",
    tasaHomicidiosPorCienMil: 48.6,
    alertasTempranasSat: 7,
    problematicasPriorizadas: [
      {
        titulo: "Fronteras invisibles y homicidios de jóvenes por pandillismo",
        descripcion:
          "Confrontaciones entre grupos de jóvenes en riesgo que bloquean el tránsito interbarrial en Olaya Herrera y Boston.",
        dimension: "Convivencia Ciudadana y Desarme",
        severidad: "ALTO",
      },
      {
        titulo: "Riesgo extremo de inundación y sedimentación en la Ciénaga",
        descripcion:
          "Casas en zonas de bajamar vulnerables a lluvias y mareas con vertimiento directo de aguas residuales.",
        dimension: "Seguridad Ambiental y Hábitat",
        severidad: "ALTO",
      },
      {
        titulo: "Economía informal y extorsión por préstamos 'gota a gota'",
        descripcion:
          "Comercio barrial asfixiado por estructuras extorsivas y falta de inclusión financiera para micronegocios.",
        dimension: "Seguridad Económica y Alimentaria",
        severidad: "MEDIO",
      },
    ],
    equipamientos: {
      caisOEstaciones: 5,
      centrosSalud: 9,
      colegiosOficiales: 24,
      comedoresComunitarios: 14,
      deficitDetectado:
        "Grave carencia de centros juveniles de formación tecnológica, escenarios deportivos iluminados y alcantarillado pluvial.",
    },
    participacion: {
      mesasRealizadas: 0,
      propuestasRadicadas: 0,
      testimoniosRegistrados: 0,
    },
  },
  {
    id: "terr-loc-3",
    codigo: "LOC-03",
    nombre: "Localidad 3 — Industrial y de la Bahía",
    localidad: "LOCALIDAD_3",
    localidadNombre: "Localidad 3: Industrial y de la Bahía",
    tipoZona: "URBANA",
    esEtnicoLey70: false,
    ucgsAbarcadas: ["UCG 10", "UCG 11", "UCG 12", "UCG 13", "UCG 14", "UCG 15"],
    barriosPrincipales: [
      "Nelson Mandela",
      "San José de los Campanos",
      "Ceballos",
      "Albornoz",
      "Arroz Barato",
      "Policarpa",
      "Puerta de Hierro",
      "El Carmelo",
      "El Socorro",
    ],
    poblacionEstimada: 320000,
    poblacionVulnerable: 190000,
    porcentajeNbi: 38.2,
    nivelRiesgo: "ALTO",
    tasaHomicidiosPorCienMil: 36.1,
    alertasTempranasSat: 5,
    problematicasPriorizadas: [
      {
        titulo: "Contaminación ambiental industrial e inmisiones en la Bahía",
        descripcion:
          "Cercanía a la zona petroquímica y portuaria de Mamonal con afecciones respiratorias en comunidades ribereñas.",
        dimension: "Seguridad Ambiental e Industrial",
        severidad: "ALTO",
      },
      {
        titulo: "Brecha laboral juvenil y desempleo en sectores populares",
        descripcion:
          "Paradoja entre gran enclave industrial de Mamonal y bajo empleo formal de jóvenes de Nelson Mandela y Ceballos.",
        dimension: "Seguridad Económica y Trabajo Decente",
        severidad: "ALTO",
      },
      {
        titulo: "Déficit de titulación de predios y legalización barrial",
        descripcion:
          "Sectores consolidados sin escrituras públicas, lo que impide acceder a subsidios de mejoramiento de vivienda.",
        dimension: "Seguridad Jurídica y Hábitat",
        severidad: "MEDIO",
      },
    ],
    equipamientos: {
      caisOEstaciones: 6,
      centrosSalud: 8,
      colegiosOficiales: 22,
      comedoresComunitarios: 11,
      deficitDetectado:
        "Déficit en puestos de salud de segundo nivel y redes de transporte masivo Transcaribe al interior de Nelson Mandela.",
    },
    participacion: {
      mesasRealizadas: 0,
      propuestasRadicadas: 0,
      testimoniosRegistrados: 0,
    },
  },
  {
    id: "terr-boquilla",
    codigo: "ETN-BOQ",
    nombre: "La Boquilla (Consejo Comunitario Ley 70/93)",
    localidad: "CORREGIMENTAL_INSULAR",
    localidadNombre: "Zona Corregimental Norte",
    tipoZona: "ETNICA_LEY_70",
    esEtnicoLey70: true,
    nombreComunidadNegra: "Consejo Comunitario de la Comunidad Negra de La Boquilla",
    ucgsAbarcadas: ["Corregimiento Norte"],
    barriosPrincipales: [
      "La Boquilla centro",
      "Marlinda",
      "Villa Gloria",
      "Manzanillo del Mar",
    ],
    poblacionEstimada: 18500,
    poblacionVulnerable: 13200,
    porcentajeNbi: 52.1,
    nivelRiesgo: "ALTO",
    tasaHomicidiosPorCienMil: 27.5,
    alertasTempranasSat: 4,
    problematicasPriorizadas: [
      {
        titulo: "Tensión sobre el territorio colectivo y mega-desarrollos",
        descripcion:
          "Conflictos de linderos entre títulos de propiedad colectiva afrodescendiente y megaproyectos turísticos e inmobiliarios.",
        dimension: "Gobernanza Territorial Étnica (Convenio 169 OIT)",
        severidad: "ALTO",
      },
      {
        titulo: "Crisis en la pesca artesanal por sedimentación de la Ciénaga",
        descripcion:
          "Cierre paulatino de bocanas y contaminación que reduce las capturas de lisa, sábalo y jaiba para sustento.",
        dimension: "Seguridad Alimentaria y Ambiental",
        severidad: "ALTO",
      },
      {
        titulo: "Carencia de alcantarillado sanitario integral",
        descripcion:
          "Vertimiento de pozas sépticas hacia canales de manglar afectando salud pública y ecosistemas marino-costeros.",
        dimension: "Salud Pública y Servicios Básicos",
        severidad: "ALTO",
      },
    ],
    equipamientos: {
      caisOEstaciones: 1,
      centrosSalud: 1,
      colegiosOficiales: 2,
      comedoresComunitarios: 2,
      deficitDetectado:
        "Urgencia de planta de tratamiento de aguas residuales propia y centro de etnoeducación bilingüe.",
    },
    participacion: {
      mesasRealizadas: 0,
      propuestasRadicadas: 0,
      testimoniosRegistrados: 0,
    },
  },
  {
    id: "terr-tierrabomba",
    codigo: "INS-TIE",
    nombre: "Tierrabomba (Caño del Oro, Punta Arenas, Bocachica)",
    localidad: "CORREGIMENTAL_INSULAR",
    localidadNombre: "Zona Insular Bahía de Cartagena",
    tipoZona: "INSULAR",
    esEtnicoLey70: true,
    nombreComunidadNegra: "Consejos Comunitarios de Bocachica, Caño del Oro y Tierrabomba",
    ucgsAbarcadas: ["Zona Insular Bahía"],
    barriosPrincipales: [
      "Tierrabomba poblado",
      "Punta Arenas",
      "Caño del Oro",
      "Bocachica",
    ],
    poblacionEstimada: 14200,
    poblacionVulnerable: 11800,
    porcentajeNbi: 64.3,
    nivelRiesgo: "ALTO",
    tasaHomicidiosPorCienMil: 19.8,
    alertasTempranasSat: 3,
    problematicasPriorizadas: [
      {
        titulo: "Inexistencia de agua potable por tubería submarina continua",
        descripcion:
          "Dependencia de carrotanques y barcazas privadas que encarecen el recurso vital hasta un 500% respecto a la zona urbana.",
        dimension: "Derecho Fundamental al Agua y Servicios Esenciales",
        severidad: "ALTO",
      },
      {
        titulo: "Erosión costera acelerada y pérdida del patrimonio histórico",
        descripcion:
          "Oleaje y paso de buques de gran calado desgastando las murallas de los Fuertes de San Fernando y San José.",
        dimension: "Patrimonio Cultural y Gestión del Riesgo",
        severidad: "ALTO",
      },
      {
        titulo: "Aislamiento en emergencias médicas nocturnas",
        descripcion:
          "Carencia de ambulancia marítima permanente disponible las 24 horas hacia hospitales de Cartagena.",
        dimension: "Seguridad en Salud y Atención de Emergencias",
        severidad: "ALTO",
      },
    ],
    equipamientos: {
      caisOEstaciones: 2,
      centrosSalud: 2,
      colegiosOficiales: 3,
      comedoresComunitarios: 2,
      deficitDetectado:
        "Cero acueducto por red fija, sin ambulancia marítima de emergencias medicalizada.",
    },
    participacion: {
      mesasRealizadas: 0,
      propuestasRadicadas: 0,
      testimoniosRegistrados: 0,
    },
  },
  {
    id: "terr-baru",
    codigo: "INS-BAR",
    nombre: "Barú (Ararca, Santa Ana, Barú centro)",
    localidad: "CORREGIMENTAL_INSULAR",
    localidadNombre: "Península e Islas de Barú",
    tipoZona: "INSULAR",
    esEtnicoLey70: true,
    nombreComunidadNegra: "Consejos Comunitarios de Barú, Santa Ana y Ararca",
    ucgsAbarcadas: ["Península de Barú"],
    barriosPrincipales: [
      "Barú centro",
      "Santa Ana",
      "Ararca",
      "Playa Blanca",
    ],
    poblacionEstimada: 12800,
    poblacionVulnerable: 9900,
    porcentajeNbi: 58.7,
    nivelRiesgo: "ALTO",
    tasaHomicidiosPorCienMil: 22.0,
    alertasTempranasSat: 4,
    problematicasPriorizadas: [
      {
        titulo: "Sobrecarga turística y desorden en Playa Blanca",
        descripcion:
          "Impacto ambiental en corales y manglares por embarcaciones a motor y abusos tarifarios que perjudican a nativos.",
        dimension: "Turismo Sostenible y Protección Ambiental",
        severidad: "ALTO",
      },
      {
        titulo: "Déficit de saneamiento básico y gestión de residuos sólidos",
        descripcion:
          "Falta de alcantarillado y retrasos en recolección de basura durante temporada alta de visitantes.",
        dimension: "Servicios Públicos y Salud Ambiental",
        severidad: "ALTO",
      },
      {
        titulo: "Vialidad deteriorada entre Ararca y Santa Ana",
        descripcion:
          "Vía principal destapada con baches severos que dificultan el tránsito de escolares y suministros.",
        dimension: "Infraestructura Vial y Conectividad",
        severidad: "MEDIO",
      },
    ],
    equipamientos: {
      caisOEstaciones: 2,
      centrosSalud: 2,
      colegiosOficiales: 3,
      comedoresComunitarios: 2,
      deficitDetectado:
        "Sin hospital de primer nivel, carencia de muelle público comunitario seguro.",
    },
    participacion: {
      mesasRealizadas: 0,
      propuestasRadicadas: 0,
      testimoniosRegistrados: 0,
    },
  },
  {
    id: "terr-pasacaballos",
    codigo: "ETN-PAS",
    nombre: "Pasacaballos",
    localidad: "CORREGIMENTAL_INSULAR",
    localidadNombre: "Zona Industrial Suroriental",
    tipoZona: "ETNICA_LEY_70",
    esEtnicoLey70: true,
    nombreComunidadNegra: "Consejo Comunitario de Comunidades Negras de Pasacaballos",
    ucgsAbarcadas: ["Corregimiento Pasacaballos"],
    barriosPrincipales: [
      "Pasacaballos centro",
      "Bajo del Tigre",
      "Las Delicias",
      "La Alborada",
    ],
    poblacionEstimada: 23000,
    poblacionVulnerable: 16500,
    porcentajeNbi: 49.6,
    nivelRiesgo: "ALTO",
    tasaHomicidiosPorCienMil: 34.2,
    alertasTempranasSat: 4,
    problematicasPriorizadas: [
      {
        titulo: "Impacto del tráfico pesado de tractomulas hacia Mamonal",
        descripcion:
          "Vibraciones que agrietan viviendas patrimoniales y accidentalidad vial en el casco urbano.",
        dimension: "Seguridad Vial y Hábitat",
        severidad: "ALTO",
      },
      {
        titulo: "Inseguridad y presencia de bandas asociadas a rutas fluviales",
        descripcion:
          "Uso del Canal del Dique como corredor ilícito y microtráfico barrial.",
        dimension: "Seguridad Fluvial y Convivencia",
        severidad: "ALTO",
      },
      {
        titulo: "Contaminación del agua del Canal del Dique",
        descripcion:
          "Sedimentación masiva y turbiedad que encarece la potabilización y perjudica la pesca de sustento.",
        dimension: "Seguridad Hídrica",
        severidad: "MEDIO",
      },
    ],
    equipamientos: {
      caisOEstaciones: 1,
      centrosSalud: 1,
      colegiosOficiales: 3,
      comedoresComunitarios: 3,
      deficitDetectado:
        "Falta variante de carga pesada que desvíe tractomulas del centro poblado.",
    },
    participacion: {
      mesasRealizadas: 0,
      propuestasRadicadas: 0,
      testimoniosRegistrados: 0,
    },
  },
  {
    id: "terr-bayunca",
    codigo: "RUR-BAY",
    nombre: "Bayunca y Pontezuela",
    localidad: "CORREGIMENTAL_INSULAR",
    localidadNombre: "Zona Norte Rural",
    tipoZona: "RURAL",
    esEtnicoLey70: true,
    nombreComunidadNegra: "Consejos Comunitarios de Bayunca y Pontezuela",
    ucgsAbarcadas: ["Corregimientos Vía al Mar"],
    barriosPrincipales: [
      "Bayunca poblado",
      "Pontezuela",
      "San Rafael",
      "Las Latas",
    ],
    poblacionEstimada: 19500,
    poblacionVulnerable: 14200,
    porcentajeNbi: 47.3,
    nivelRiesgo: "MEDIO",
    tasaHomicidiosPorCienMil: 24.1,
    alertasTempranasSat: 2,
    problematicasPriorizadas: [
      {
        titulo: "Retrasos en la ejecución del macroacueducto y alcantarillado",
        descripcion:
          "Obras contratadas con dilaciones que obligan a recurrir a aljibes artesanales de dudosa calidad sanitaria.",
        dimension: "Servicios Públicos y Salud",
        severidad: "ALTO",
      },
      {
        titulo: "Conflictos de tierras y predios agropecuarios",
        descripcion:
          "Litigios por compra de hectáreas de vocación campesina para condominios suburbanos privados.",
        dimension: "Soberanía Agroalimentaria y Suelo Rural",
        severidad: "MEDIO",
      },
      {
        titulo: "Vías terciarias veredales intransitables en invierno",
        descripcion:
          "Imposibilidad de sacar cosechas de yuca, plátano y hortalizas hacia los mercados de Cartagena.",
        dimension: "Desarrollo Económico Rural",
        severidad: "MEDIO",
      },
    ],
    equipamientos: {
      caisOEstaciones: 1,
      centrosSalud: 2,
      colegiosOficiales: 2,
      comedoresComunitarios: 2,
      deficitDetectado:
        "Conclusión del alcantarillado y puesto de bomberos rural.",
    },
    participacion: {
      mesasRealizadas: 0,
      propuestasRadicadas: 0,
      testimoniosRegistrados: 0,
    },
  },
  {
    id: "terr-arroyo-piedra",
    codigo: "RUR-ARR",
    nombre: "Arroyo de Piedra y Arroyo de las Canoas",
    localidad: "CORREGIMENTAL_INSULAR",
    localidadNombre: "Corregimientos Norte Costero",
    tipoZona: "RURAL",
    esEtnicoLey70: true,
    nombreComunidadNegra: "Consejo Comunitario de Arroyo de Piedra",
    ucgsAbarcadas: ["Corregimientos Límite Atlántico"],
    barriosPrincipales: [
      "Arroyo de Piedra",
      "Arroyo de las Canoas",
      "Punta Canoa",
    ],
    poblacionEstimada: 9800,
    poblacionVulnerable: 7300,
    porcentajeNbi: 55.4,
    nivelRiesgo: "MEDIO",
    tasaHomicidiosPorCienMil: 14.2,
    alertasTempranasSat: 2,
    problematicasPriorizadas: [
      {
        titulo: "Erosión marina y avance del oleaje sobre vías comunitarias",
        descripcion:
          "Destrucción del espolón artesanal en Punta Canoa que pone en riesgo casas de primera línea de playa.",
        dimension: "Gestión del Riesgo y Cambio Climático",
        severidad: "ALTO",
      },
      {
        titulo: "Baja cobertura de bachillerato y deserción escolar juvenil",
        descripcion:
          "Jóvenes deben trasladarse a otras veredas para culminar grado 11 o desisten por falta de transporte.",
        dimension: "Educación y Permanencia Escolar",
        severidad: "MEDIO",
      },
      {
        titulo: "Precariedad del centro de salud veredal",
        descripcion:
          "Atención médica médica limitada a ciertos días de la semana sin ambulancia permanente.",
        dimension: "Salud Primaria",
        severidad: "MEDIO",
      },
    ],
    equipamientos: {
      caisOEstaciones: 1,
      centrosSalud: 1,
      colegiosOficiales: 1,
      comedoresComunitarios: 1,
      deficitDetectado:
        "Obras de defensa costera y colegio técnico agropecuario con dotación.",
    },
    participacion: {
      mesasRealizadas: 0,
      propuestasRadicadas: 0,
      testimoniosRegistrados: 0,
    },
  },
  {
    id: "terr-ucg-1",
    codigo: "UCG-01",
    nombre: "UCG 1 — Centro Histórico, San Diego, Getsemaní, Manga",
    localidad: "LOCALIDAD_1",
    localidadNombre: "Localidad 1: Histórica y del Caribe Norte",
    tipoZona: "URBANA",
    esEtnicoLey70: false,
    ucgsAbarcadas: ["UCG 1"],
    barriosPrincipales: [
      "Centro",
      "San Diego",
      "Getsemaní",
      "Manga",
      "Chambacú",
    ],
    poblacionEstimada: 62000,
    poblacionVulnerable: 14500,
    porcentajeNbi: 16.8,
    nivelRiesgo: "ALTO",
    tasaHomicidiosPorCienMil: 15.4,
    alertasTempranasSat: 3,
    problematicasPriorizadas: [
      {
        titulo: "Explotación sexual comercial de menores (ESCNNA)",
        descripcion:
          "Presencia de redes criminales en plazas (Plaza de los Coches, Plaza de la Paz) y plataformas clandestinas de alojamiento.",
        dimension: "Seguridad y Protección Integral de NNA",
        severidad: "ALTO",
      },
      {
        titulo: "Trastornos de convivencia por ruido excesivo de bares y chivas",
        descripcion:
          "Vulneración sistemática a los límites de decibeles afectando a residentes del Centro y Manga.",
        dimension: "Convivencia Ciudadana y Tranquilidad",
        severidad: "MEDIO",
      },
      {
        titulo: "Ocupación indebida del espacio público y venta informal",
        descripcion:
          "Invasión de andenes y plazas con acoso al peatón y cobros excesivos al turista.",
        dimension: "Espacio Público y Convivencia",
        severidad: "MEDIO",
      },
    ],
    equipamientos: {
      caisOEstaciones: 3,
      centrosSalud: 2,
      colegiosOficiales: 4,
      comedoresComunitarios: 1,
      deficitDetectado:
        "Falta sistema integrado de videovigilancia con analítica facial en Centro Amurallado.",
    },
    participacion: {
      mesasRealizadas: 0,
      propuestasRadicadas: 0,
      testimoniosRegistrados: 0,
    },
  },
  {
    id: "terr-ucg-4-5",
    codigo: "UCG-04-05",
    nombre: "UCG 4 y 5 — Torices, Santa María, Canapote, San Francisco",
    localidad: "LOCALIDAD_2",
    localidadNombre: "Localidad 2: De la Virgen y Turística",
    tipoZona: "URBANA",
    esEtnicoLey70: false,
    ucgsAbarcadas: ["UCG 4", "UCG 5"],
    barriosPrincipales: [
      "Torices",
      "Santa María",
      "Canapote",
      "San Francisco",
      "7 de Agosto",
      "Daniel Lemaitre",
    ],
    poblacionEstimada: 98000,
    poblacionVulnerable: 56000,
    porcentajeNbi: 34.5,
    nivelRiesgo: "ALTO",
    tasaHomicidiosPorCienMil: 32.8,
    alertasTempranasSat: 4,
    problematicasPriorizadas: [
      {
        titulo: "Líneas de falla geológica en San Francisco",
        descripcion:
          "Casas con agrietamientos por la falla de San Francisco y riesgo de deslizamiento de tierras en época invernal.",
        dimension: "Gestión del Riesgo y Hábitat Seguro",
        severidad: "ALTO",
      },
      {
        titulo: "Hurtos a mano armada en corredores de Daniel Lemaitre y Canapote",
        descripcion:
          "Asaltos continuos en moto a estudiantes y trabajadores en paraderos de transporte público.",
        dimension: "Seguridad Ciudadana",
        severidad: "ALTO",
      },
      {
        titulo: "Taponamiento del Caño Juan Angola por vertimiento de basuras",
        descripcion:
          "Colmatación del caño que genera proliferación de vectores de dengue e inundaciones.",
        dimension: "Salud y Seguridad Ambiental",
        severidad: "MEDIO",
      },
    ],
    equipamientos: {
      caisOEstaciones: 2,
      centrosSalud: 3,
      colegiosOficiales: 6,
      comedoresComunitarios: 4,
      deficitDetectado:
        "Obras de canalización y recuperación ambiental del Caño Juan Angola.",
    },
    participacion: {
      mesasRealizadas: 0,
      propuestasRadicadas: 0,
      testimoniosRegistrados: 0,
    },
  },
  {
    id: "terr-ucg-6",
    codigo: "UCG-06",
    nombre: "UCG 6 — Olaya Herrera (Central, Boston, La Candelaria)",
    localidad: "LOCALIDAD_2",
    localidadNombre: "Localidad 2: De la Virgen y Turística",
    tipoZona: "URBANA",
    esEtnicoLey70: false,
    ucgsAbarcadas: ["UCG 6"],
    barriosPrincipales: [
      "Olaya Central",
      "Olaya Zarabanda",
      "Olaya Rafael Núñez",
      "Boston",
      "La Candelaria",
      "La Esperanza",
    ],
    poblacionEstimada: 145000,
    poblacionVulnerable: 108000,
    porcentajeNbi: 51.2,
    nivelRiesgo: "ALTO",
    tasaHomicidiosPorCienMil: 54.3,
    alertasTempranasSat: 6,
    problematicasPriorizadas: [
      {
        titulo: "Fronteras invisibles entre sectores y muertes de adolescentes",
        descripcion:
          "Confrontaciones entre Zarabanda y Boston; jóvenes no pueden cruzar calles para asistir al colegio o centros de salud.",
        dimension: "Protección a la Vida y Desarme",
        severidad: "ALTO",
      },
      {
        titulo: "Inundaciones crónicas de aguas negras en épocas de lluvia",
        descripcion:
          "Sectores bajos de Olaya se inundan con aguas combinadas por rebosamiento de la Ciénaga de la Virgen.",
        dimension: "Saneamiento Básico y Resiliencia",
        severidad: "ALTO",
      },
      {
        titulo: "Falta de oportunidades de empleo y formación técnica",
        descripcion:
          "Altas tasas de desescolarización juvenil que facilitan el reclutamiento por redes de microtráfico.",
        dimension: "Educación e Inclusión Productiva",
        severidad: "ALTO",
      },
    ],
    equipamientos: {
      caisOEstaciones: 2,
      centrosSalud: 3,
      colegiosOficiales: 8,
      comedoresComunitarios: 6,
      deficitDetectado:
        "Urgencia de un Centro de Oportunidades Juveniles y Casas de Justicia integrales.",
    },
    participacion: {
      mesasRealizadas: 0,
      propuestasRadicadas: 0,
      testimoniosRegistrados: 0,
    },
  },
  {
    id: "terr-ucg-7",
    codigo: "UCG-07",
    nombre: "UCG 7 — El Pozón, Fredonia, Villa Estrella",
    localidad: "LOCALIDAD_2",
    localidadNombre: "Localidad 2: De la Virgen y Turística",
    tipoZona: "URBANA",
    esEtnicoLey70: false,
    ucgsAbarcadas: ["UCG 7"],
    barriosPrincipales: [
      "El Pozón",
      "Fredonia",
      "Villa Estrella",
      "Nuevo Paraíso",
      "Villas de la Candelaria",
    ],
    poblacionEstimada: 135000,
    poblacionVulnerable: 95000,
    porcentajeNbi: 46.7,
    nivelRiesgo: "ALTO",
    tasaHomicidiosPorCienMil: 49.2,
    alertasTempranasSat: 5,
    problematicasPriorizadas: [
      {
        titulo: "Disputas territoriales de bandas en sectores de El Pozón",
        descripcion:
          "Violencia interpersonal y homicidios focalizados en sectores como 1 de Mayo, Central y Los Olivos.",
        dimension: "Seguridad y Convivencia",
        severidad: "ALTO",
      },
      {
        titulo: "Vías internas en barro y sin pavimentación",
        descripcion:
          "Calles intransitables que impiden el ingreso de ambulancias, patrullas y camiones de aseo.",
        dimension: "Movilidad e Infraestructura",
        severidad: "MEDIO",
      },
      {
        titulo: "Casos de violencia intrafamiliar y contra la mujer",
        descripcion:
          "Altos índices de violencia de género reportados en Comisarías con baja capacidad de respuesta pericial.",
        dimension: "Seguridad de Género y Familias",
        severidad: "ALTO",
      },
    ],
    equipamientos: {
      caisOEstaciones: 2,
      centrosSalud: 3,
      colegiosOficiales: 7,
      comedoresComunitarios: 5,
      deficitDetectado:
        "Pavimentación de vías colectoras principales y Casa de la Mujer para atención integral.",
    },
    participacion: {
      mesasRealizadas: 0,
      propuestasRadicadas: 0,
      testimoniosRegistrados: 0,
    },
  },
  {
    id: "terr-ucg-8-9",
    codigo: "UCG-08-09",
    nombre: "UCG 8 y 9 — Nelson Mandela, San José de los Campanos",
    localidad: "LOCALIDAD_3",
    localidadNombre: "Localidad 3: Industrial y de la Bahía",
    tipoZona: "URBANA",
    esEtnicoLey70: false,
    ucgsAbarcadas: ["UCG 8", "UCG 9"],
    barriosPrincipales: [
      "Nelson Mandela (todos los sectores)",
      "San José de los Campanos",
      "Villa Corelca",
      "El Edén",
    ],
    poblacionEstimada: 125000,
    poblacionVulnerable: 88000,
    porcentajeNbi: 43.1,
    nivelRiesgo: "ALTO",
    tasaHomicidiosPorCienMil: 39.5,
    alertasTempranasSat: 4,
    problematicasPriorizadas: [
      {
        titulo: "Concentración de población desplazada por el conflicto armado",
        descripcion:
          "Sujetos de especial protección constitucional con deudas históricas de indemnización integral y retorno.",
        dimension: "Víctimas del Conflicto y Reparación Integral",
        severidad: "ALTO",
      },
      {
        titulo: "Microtráfico en entornos escolares y parques comunitarios",
        descripcion:
          "Uso de espacios recreativos como puntos de expendio afectando la seguridad de niños y jóvenes.",
        dimension: "Seguridad y Espacios Protectores",
        severidad: "ALTO",
      },
      {
        titulo: "Déficit de alcantarillado pluvial y aguas estancadas",
        descripcion:
          "Canales sin revestimiento que causan erosión en laderas y brotes de enfermedades infecciosas.",
        dimension: "Saneamiento y Salud",
        severidad: "MEDIO",
      },
    ],
    equipamientos: {
      caisOEstaciones: 2,
      centrosSalud: 3,
      colegiosOficiales: 6,
      comedoresComunitarios: 5,
      deficitDetectado:
        "Comisaría de Familia con sede propia permanente y estación de policía con cobertura completa.",
    },
    participacion: {
      mesasRealizadas: 0,
      propuestasRadicadas: 0,
      testimoniosRegistrados: 0,
    },
  },
  {
    id: "terr-ucg-11-12",
    codigo: "UCG-11-12",
    nombre: "UCG 11 y 12 — Albornoz, Ceballos, Arroz Barato, Mamonal",
    localidad: "LOCALIDAD_3",
    localidadNombre: "Localidad 3: Industrial y de la Bahía",
    tipoZona: "URBANA",
    esEtnicoLey70: false,
    ucgsAbarcadas: ["UCG 11", "UCG 12"],
    barriosPrincipales: [
      "Albornoz",
      "Ceballos",
      "Arroz Barato",
      "Puerta de Hierro",
      "Mamonal corredor",
    ],
    poblacionEstimada: 58000,
    poblacionVulnerable: 39000,
    porcentajeNbi: 41.6,
    nivelRiesgo: "MEDIO",
    tasaHomicidiosPorCienMil: 28.7,
    alertasTempranasSat: 3,
    problematicasPriorizadas: [
      {
        titulo: "Emisiones de partículas y vertimientos a la Bahía de Cartagena",
        descripcion:
          "Cercanía a plantas químicas que generan malos olores y afectación a pescadores tradicionales.",
        dimension: "Seguridad Ambiental y Salud Pública",
        severidad: "ALTO",
      },
      {
        titulo: "Alta accidentalidad por tránsito constante de carga pesada",
        descripcion:
          "Paso de camiones cisterna en vías residenciales sin bermas seguras ni puentes peatonales adecuados.",
        dimension: "Seguridad Vial y Movilidad",
        severidad: "MEDIO",
      },
      {
        titulo: "Inseguridad en horas de cambio de turno industrial",
        descripcion:
          "Atracos a trabajadores en paraderos de buses sobre el corredor industrial de Mamonal.",
        dimension: "Seguridad Ciudadana",
        severidad: "MEDIO",
      },
    ],
    equipamientos: {
      caisOEstaciones: 2,
      centrosSalud: 2,
      colegiosOficiales: 4,
      comedoresComunitarios: 2,
      deficitDetectado:
        "Puentes peatonales elevados y monitores de calidad del aire en tiempo real.",
    },
    participacion: {
      mesasRealizadas: 0,
      propuestasRadicadas: 0,
      testimoniosRegistrados: 0,
    },
  },
];
