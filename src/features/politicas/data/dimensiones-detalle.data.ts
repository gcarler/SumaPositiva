import {
  ShieldCheck,
  Users,
  Briefcase,
  Leaf,
  Wheat,
  HeartPulse,
  Scale,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import {
  type DependenciaDistrital,
} from "./entidades-cartagena.data";

export interface CorresponsableRol {
  dependenciaId: string;
  rolEspecifico: string;
  proyectoClave: string;
}

export interface AmenazaCritica {
  titulo: string;
  descripcion: string;
}

export interface IndicadorTrazador {
  indicador: string;
  lineaBase: string;
  meta2036: string;
}

export type PilarOnu =
  | "Libertad frente al miedo"
  | "Libertad frente a la necesidad"
  | "Libertad frente a la indignidad";

export interface DimensionDetalle {
  id: string; // "personal" | "comunitaria" | "economica" | "ambiental" | "alimentaria" | "salud" | "politica" | "crisis"
  codigo: string; // "D1" .. "D8"
  numero: string; // "01" .. "08"
  nombre: string;
  nombreCorto: string;
  icono: LucideIcon;
  lema: string;
  descripcion: string;
  marcoLegal: string;
  entidadLiderId: string;
  presupuestoTotalCop: string;
  colorToken: string; // var(--danger), var(--ember), etc.
  metasClave: string[];
  corresponsables: CorresponsableRol[];

  // Campos pedagógicos y territoriales [DIM-ONU-01]:
  pilarOnu: PilarOnu;
  queEsExplicacionPedagogica: string[];
  contextoCartagena: string;
  amenazasCriticas: AmenazaCritica[];
  enfoqueDiferencial: string;
  comoParticipar: string;
  indicadoresTrazadores: IndicadorTrazador[];
}

export const GABINETE_TITULARES: Record<string, string> = {
  "dep-sicc": "Despacho de la Secretaría del Interior y Convivencia Ciudadana",
  "dep-participacion": "Despacho de la Secretaría de Participación y Desarrollo Social",
  "dep-planeacion": "Despacho de la Secretaría de Planeación Distrital",
  "dep-educacion": "Despacho de la Secretaría de Educación Distrital",
  "dep-turismo": "Despacho de la Secretaría de Turismo",
  "dep-hacienda": "Despacho de la Secretaría de Hacienda Distrital",
  "dep-infraestructura": "Despacho de la Secretaría de Infraestructura",
  "dep-general": "Despacho de la Secretaría General",
  "dep-dadis": "Dirección General del DADIS",
  "dep-epa": "Dirección General del EPA Cartagena",
  "dep-datt": "Dirección General del DATT",
  "dep-pes": "Dirección del Plan de Emergencia Social Pedro Romero",
  "dep-corvivienda": "Gerencia General de Corvivienda",
  "dep-ider": "Dirección General del IDER",
  "dep-idaccc": "Dirección General del IDACCC",
  "dep-ipcc": "Dirección General del IPCC",
  "dep-etcar": "Dirección General de la ETCAR",
  "dep-distriseguridad": "Dirección General de Distriseguridad",
  "dep-transcaribe": "Gerencia General de Transcaribe S.A.",
  "dep-colmayor": "Rectoría de la Institución Universitaria Mayor",
  "dep-oagrd": "Dirección de la OAGRD",
  "dep-bomberos": "Comandancia Oficial del Cuerpo de Bomberos",
  "dep-gepm": "Gerencia de Espacio Público y Movilidad",
  "dep-gerencia-centro": "Gerencia del Centro Histórico",
  "dep-escuela-gob": "Dirección de la Escuela de Gobierno y Liderazgo",
  "dep-tic": "Jefatura de la Oficina Asesora de TIC",
  "dep-loc-1": "Alcaldía de la Localidad 1 (Histórica y del Caribe Norte)",
  "dep-loc-2": "Alcaldía de la Localidad 2 (De la Virgen y Turística)",
  "dep-loc-3": "Alcaldía de la Localidad 3 (Industrial y de la Bahía)",
};

export const DIMENSIONES_DETALLE_2026: DimensionDetalle[] = [
  {
    id: "personal",
    codigo: "D1",
    numero: "01",
    nombre: "Seguridad Personal y Ciudadana",
    nombreCorto: "Personal",
    icono: ShieldCheck,
    lema: "Libertad frente al miedo, desarme barrial y protección de la vida",
    descripcion:
      "Protección integral de los ciudadanos frente a la delincuencia, homicidios, extorsión, violencia de género y erradicación del delito de ESCNNA en entornos turísticos y escolares.",
    marcoLegal:
      "Ley Estatutaria 1757 de 2015 • Ley Estatutaria 1801 de 2016 • Sentencia T-025 de 2004",
    entidadLiderId: "dep-sicc",
    presupuestoTotalCop: "$68.400 Millones COP",
    colorToken: "var(--danger)",
    pilarOnu: "Libertad frente al miedo",
    queEsExplicacionPedagogica: [
      "El paradigma de la Seguridad Personal bajo el enfoque de las Naciones Unidas (Informe PNUD 1994 y Resolución 66/290 de la Asamblea General) trasciende la visión tradicional centrada en la fuerza policial o la defensa del Estado, situando en el centro la protección integral y cotidiana de las personas frente a cualquier forma de violencia física, coerción o amenaza a su integridad vital.",
      "Implica que ninguna niña, niño, joven o habitante deba vivir con miedo constante en su propio barrio, escuela o trayecto diario. Exige políticas preventivas de desarme, contención del sicariato, prevención de pandillas y erradicación radical de las redes de trata y explotación sexual comercial de niñas, niños y adolescentes (ESCNNA).",
      "La seguridad personal no se mide por el número de armas incautadas o patrullas desplegadas, sino por la tranquilidad con la que las familias caminan por las calles, la apertura segura de negocios barriales y la capacidad ciudadana de construir proyectos de vida dignos libres de temor.",
    ],
    contextoCartagena:
      "En Cartagena de Indias, la seguridad personal enfrenta una fuerte segmentación socioespacial: mientras las áreas turísticas de Bocagrande y el Centro Histórico concentran alta presencia policial, los sectores periurbanos de las Localidades 2 y 3 (como Olaya Herrera, El Pozón y Nelson Mandela) sufren la disputa violenta de rentas criminales ligadas al microtráfico y sicariato. Simultáneamente, el Centro Histórico y los muelles insulares demandan un blindaje institucional pericial contra la explotación sexual infantil (ESCNNA) y el turismo abusivo.",
    amenazasCriticas: [
      {
        titulo: "Sicariato y homicidio juvenil",
        descripcion:
          "Disputas territoriales entre bandas multicrimen que cobran la vida de jóvenes en sectores populares de las Localidades 2 y 3.",
      },
      {
        titulo: "Explotación sexual comercial (ESCNNA)",
        descripcion:
          "Redes transnacionales y locales de trata que victimizan a menores de edad en el Centro Histórico, playas e islas.",
      },
      {
        titulo: "Extorsión al comercio barrial",
        descripcion:
          "Cobros extorsivos ('gota a gota' y 'vacunas') que asfixian a tenderos y microempresarios en Nelson Mandela y Pasacaballos.",
      },
      {
        titulo: "Violencia de género e intrafamiliar",
        descripcion:
          "Altos índices de agresión contra mujeres y niñas en el ámbito doméstico sin respuesta judicial oportuna ni casas refugio suficientes.",
      },
    ],
    enfoqueDiferencial:
      "Prioridad absoluta para la niñez y juventud en riesgo de reclutamiento o instrumentalización por pandillas; medidas de protección reforzada con enfoque de género para lideresas y mujeres cabezas de hogar; y protocolos de mediación comunitaria culturalmente adaptados en los consejos comunitarios negros e insulares.",
    comoParticipar:
      "A través de POLIS, la ciudadanía puede cartografiar puntos oscuros e inseguros en el Geovisor Territorial, registrar alertas tempranas de convivencia, priorizar inversiones en frentes de seguridad en las Mesas de Trabajo y auditar los compromisos de patrullaje de la Secretaría del Interior.",
    indicadoresTrazadores: [
      {
        indicador: "Tasa de homicidios por 100.000 habitantes",
        lineaBase: "36.4 (2024)",
        meta2036: "12.0 (2036)",
      },
      {
        indicador: "Tasa de denuncia efectiva y desarticulación ESCNNA",
        lineaBase: "38% casos atendidos",
        meta2036: "95% casos con sanción penal y restitución",
      },
      {
        indicador: "Percepción de seguridad en el barrio (Cartagena Cómo Vamos)",
        lineaBase: "31% se siente seguro (2024)",
        meta2036: "75% se siente seguro (2036)",
      },
    ],
    metasClave: [
      "Reducción del 25% en la tasa de homicidios por 100.000 habitantes en sectores priorizados.",
      "100% de entornos escolares críticos con patrullaje preventivo de policía y cuadrantes comunitarios.",
      "Desarticulación total de redes de trata de personas y explotación sexual comercial de NNA (ESCNNA).",
      "30 frentes de seguridad barrial y alarmas comunitarias operativas en articulación con las JAC.",
    ],
    corresponsables: [
      {
        dependenciaId: "dep-distriseguridad",
        rolEspecifico: "Tecnología de Seguridad",
        proyectoClave:
          "Mantenimiento y expansión de 1.200 cámaras inteligentes de videovigilancia y alarmas comunitarias.",
      },
      {
        dependenciaId: "dep-datt",
        rolEspecifico: "Movilidad Segura",
        proyectoClave:
          "Operativos de control vial nocturno y restricción focalizada en corredores de alta incidencia.",
      },
      {
        dependenciaId: "dep-turismo",
        rolEspecifico: "Protección Turística",
        proyectoClave:
          "Blindaje institucional de playas, muelles y baluartes contra ESCNNA y cobros extorsivos.",
      },
      {
        dependenciaId: "dep-educacion",
        rolEspecifico: "Entornos Protectores",
        proyectoClave:
          "Estrategia 'Colegios Territorios de Paz' y erradicación de expendios de drogas perimetrales.",
      },
      {
        dependenciaId: "dep-gepm",
        rolEspecifico: "Recuperación de Espacio",
        proyectoClave:
          "Despeje de andenes e iluminación de puntos oscuros propensos al hurto y acoso.",
      },
      {
        dependenciaId: "dep-gerencia-centro",
        rolEspecifico: "Convivencia Patrimonial",
        proyectoClave:
          "Plan Integral de Seguridad y Convivencia Nocturna en el Centro Histórico y San Diego.",
      },
      {
        dependenciaId: "dep-loc-1",
        rolEspecifico: "Territorio Local 1",
        proyectoClave:
          "Coordinación de inspecciones de policía y comisarías de familia en barrios del norte.",
      },
      {
        dependenciaId: "dep-loc-2",
        rolEspecifico: "Territorio Local 2",
        proyectoClave:
          "Puntos de control barrial y mediación de conflictos en Olaya Herrera y El Pozón.",
      },
      {
        dependenciaId: "dep-loc-3",
        rolEspecifico: "Territorio Local 3",
        proyectoClave:
          "Plan de choque contra la extorsión y el microtráfico en Nelson Mandela y Pasacaballos.",
      },
    ],
  },
  {
    id: "comunitaria",
    codigo: "D2",
    numero: "02",
    nombre: "Seguridad y Convivencia Comunitaria",
    nombreCorto: "Comunitaria",
    icono: Users,
    lema: "Tejido social, identidad barrial, salvaguardas étnicas y resolución pacífica",
    descripcion:
      "Fortalecimiento de la cohesión comunitaria, prevención de estigmatización barrial, apoyo a las JAC y protección de las comunidades negras, palenqueras e indígenas de Cartagena.",
    marcoLegal:
      "Ley Estatutaria 1757 de 2015 • Ley 70 de 1993 • Convenio 169 OIT • Ley 2166 de 2021 (JAC)",
    entidadLiderId: "dep-participacion",
    presupuestoTotalCop: "$42.800 Millones COP",
    colorToken: "var(--ember)",
    pilarOnu: "Libertad frente a la indignidad",
    queEsExplicacionPedagogica: [
      "La Seguridad Comunitaria protege el tejido social, la identidad colectiva y la convivencia pacífica entre vecinos, garantizando que pertenecer a un grupo cultural, étnico o barrial no sea motivo de discriminación, exclusión o violencia.",
      "Fomenta la cohesión comunitaria a través de las Juntas de Acción Comunal (JAC), los comités vecinales y las organizaciones de base, sustituyendo la justicia por mano propia y la intolerancia por mecanismos comunitarios de mediación y diálogo restaurativo.",
      "Reconoce y blinda de manera especial los derechos colectivos de los pueblos étnicos a su territorio ancestral, sus saberes tradicionales y su autonomía organizativa consagrada en la Ley 70 de 1993 y el Convenio 169 de la OIT.",
    ],
    contextoCartagena:
      "Cartagena es el distrito con mayor población afrodescendiente de Colombia, con 17 Consejos Comunitarios de Comunidades Negras y comunidades indígenas reconocidas en su área rural e insular (Barú, Tierrabomba, Bocachica, La Boquilla, Pasacaballos). Sin embargo, la estigmatización barrial en sectores como Olaya Herrera y los conflictos territoriales en las islas amenazan la identidad y pervivencia del tejido social ancestral.",
    amenazasCriticas: [
      {
        titulo: "Ruptura del tejido barrial e intolerancia",
        descripcion:
          "Conflictos vecinales no resueltos que escalan a agresiones físicas y homicidios por riñas cotidianas.",
      },
      {
        titulo: "Presión territorial sobre comunidades negras",
        descripcion:
          "Desplazamiento forzado o económico de comunidades afro e insulares frente al desarrollo inmobiliario sin consulta previa.",
      },
      {
        titulo: "Estigmatización de juventudes populares",
        descripcion:
          "Perfilamiento discriminatorio hacia jóvenes de barrios populares que les cierra oportunidades laborales y formativas.",
      },
      {
        titulo: "Debilidad organizativa comunal",
        descripcion:
          "Juntas de Acción Comunal desarticuladas, cooptadas o sin capacidad técnica para incidir en las decisiones distritales.",
      },
    ],
    enfoqueDiferencial:
      "Salvaguarda de los planes de etnodesarrollo de los 17 Consejos Comunitarios de Comunidades Negras bajo la Ley 70 de 1993; inclusión activa de los cabildos indígenas urbanos; y programas de liderazgo barrial liderados por mujeres comunitarias y parteras tradicionales.",
    comoParticipar:
      "Participa postulando y deliberando en las Mesas de Trabajo Comunitarias de tu localidad, postulando alternativas de mediación vecinal y fortaleciendo el papelógrafo de problemas y soluciones barriales en la plataforma POLIS.",
    indicadoresTrazadores: [
      {
        indicador: "Porcentaje de JAC con planes de acción comunitaria concertados",
        lineaBase: "42% (2024)",
        meta2036: "95% (2036)",
      },
      {
        indicador: "Consejos Comunitarios con consulta previa reglamentada y planes vigentes",
        lineaBase: "6 de 17 (2024)",
        meta2036: "17 de 17 (2036)",
      },
      {
        indicador: "Tasa de resolución pacífica de conflictos vecinales mediante mediación",
        lineaBase: "22% (2024)",
        meta2036: "70% (2036)",
      },
    ],
    metasClave: [
      "80% de las 250 Juntas de Acción Comunal (JAC) con personería jurídica actualizada y proyectos concertados.",
      "17 Consejos Comunitarios de Comunidades Negras con protocolos de consulta previa y desarrollo propio.",
      "50.000 jóvenes y niños vinculados a ligas deportivas, escuelas de arte y campamentos de paz.",
      "Ruta distrital integral para la atención de mujeres víctimas de violencia intrafamiliar y de género.",
    ],
    corresponsables: [
      {
        dependenciaId: "dep-idaccc",
        rolEspecifico: "Fortalecimiento Comunal",
        proyectoClave:
          "Dotación tecnológica y fortalecimiento organizativo de las organizaciones comunales y de base.",
      },
      {
        dependenciaId: "dep-ider",
        rolEspecifico: "Deporte y Recreación",
        proyectoClave:
          "Programa 'Deporte para la Esperanza': torneos interbarriales nocturnos y adecuación de 40 canchas.",
      },
      {
        dependenciaId: "dep-ipcc",
        rolEspecifico: "Cultura y Memoria",
        proyectoClave:
          "Circuitos de cultura comunitaria, memoria afrodescendiente y festivales en barrios populares.",
      },
      {
        dependenciaId: "dep-escuela-gob",
        rolEspecifico: "Formación Democrática",
        proyectoClave:
          "Escuela de Liderazgo Democrático para ediles, voceros de JAC y líderes juveniles.",
      },
      {
        dependenciaId: "dep-colmayor",
        rolEspecifico: "Extensión Universitaria",
        proyectoClave:
          "Proyectos de extensión universitaria e investigación participativa en sectores vulnerables.",
      },
      {
        dependenciaId: "dep-etcar",
        rolEspecifico: "Patrimonio Compartido",
        proyectoClave:
          "Apropiación social de las fortificaciones como espacios de encuentro comunitario y convivencia.",
      },
      {
        dependenciaId: "dep-loc-1",
        rolEspecifico: "Concertación Local 1",
        proyectoClave:
          "Mesas de concertación comunitaria en barrios populares de las faldas de La Popa.",
      },
      {
        dependenciaId: "dep-loc-2",
        rolEspecifico: "Concertación Local 2",
        proyectoClave:
          "Centros de vida y atención para adultos mayores en la cuenca de la Ciénaga de la Virgen.",
      },
      {
        dependenciaId: "dep-loc-3",
        rolEspecifico: "Concertación Local 3",
        proyectoClave:
          "Promoción de iniciativas de reconciliación y convivencia en Nelson Mandela y San José.",
      },
    ],
  },
  {
    id: "economica",
    codigo: "D3",
    numero: "03",
    nombre: "Seguridad Económica y Medios de Vida",
    nombreCorto: "Económica",
    icono: Briefcase,
    lema: "Superación de la pobreza extrema, empleo juvenil y formalización productiva",
    descripcion:
      "Garantía de ingresos dignos, capital semilla para la economía popular, titulación de predios y formación técnica de jóvenes para cerrar las brechas de desigualdad en Cartagena.",
    marcoLegal:
      "Ley Estatutaria 1757 de 2015 • Ley 1454 de 2011 • PDD 2024–2027 Eje Productivo",
    entidadLiderId: "dep-pes",
    presupuestoTotalCop: "$54.600 Millones COP",
    colorToken: "var(--warning)",
    pilarOnu: "Libertad frente a la necesidad",
    queEsExplicacionPedagogica: [
      "La Seguridad Económica, según el mandato de la ONU, exige garantizar que cada persona cuente con un ingreso básico asegurado y medios de vida sostenibles, derivados de un trabajo productivo y remunerado o de redes públicas de seguridad social confiables.",
      "Combate la vulnerabilidad estructural que empuja a los hogares hacia la miseria, el endeudamiento usurero o economías ilícitas, promoviendo la inclusión financiera popular, la capacitación técnica para el trabajo y la formalización progresiva.",
      "Enfatiza el derecho a la ciudad productiva, permitiendo que la riqueza generada por los grandes motores económicos (puertos, petroquímica, turismo) se redistribuya en oportunidades reales para las familias de los barrios más segregados.",
    ],
    contextoCartagena:
      "Cartagena padece una paradoja económica crítica: alberga el principal puerto marítimo y la zona industrial petroquímica más potente de la región (Mamonal), junto a una industria turística multimillonaria, pero más del 60% de su fuerza laboral sobrevive en la informalidad y un tercio de la población vive en pobreza monetaria, concentrada en las laderas de La Popa y la franja suroriental.",
    amenazasCriticas: [
      {
        titulo: "Trampas de pobreza extrema e informalidad",
        descripcion:
          "Hogares que subsisten con ingresos diarios inestables sin acceso a seguridad social, pensión o cesantías.",
      },
      {
        titulo: "Usura del 'gota a gota'",
        descripcion:
          "Mecanismos extorsivos de crédito informal que despojan del patrimonio a comerciantes informales y familias vulnerables.",
      },
      {
        titulo: "Brecha de empleabilidad juvenil y 'NiNis'",
        descripcion:
          "Miles de jóvenes egresados de secundaria sin acceso a educación superior ni formación técnica demandada por la industria.",
      },
      {
        titulo: "Inseguridad en la tenencia de la tierra y vivienda",
        descripcion:
          "Falta de titulación de predios en asentamientos históricos que impide el acceso a créditos formales y mejoramiento del hábitat.",
      },
    ],
    enfoqueDiferencial:
      "Créditos semilla preferenciales para mujeres cabeza de familia y vendedoras de la economía popular; becas tecnológicas específicas para jóvenes de estratos 1 y 2; y formalización laboral de pescadores tradicionales y artesanas afrodescendientes.",
    comoParticipar:
      "Postula alternativas de desarrollo económico local y bancos comunales en el Banco Distrital de Alternativas de POLIS; consulta y audita los subsidios productivos del PES-PR y monitorea la ejecución del presupuesto de empleo juvenil.",
    indicadoresTrazadores: [
      {
        indicador: "Tasa de pobreza monetaria extrema (DANE)",
        lineaBase: "12.7% (2024)",
        meta2036: "3.5% (2036)",
      },
      {
        indicador: "Tasa de informalidad laboral distrital",
        lineaBase: "59.8% (2024)",
        meta2036: "38.0% (2036)",
      },
      {
        indicador: "Jóvenes entre 18 y 28 años con empleo formal o educación superior",
        lineaBase: "44.2% (2024)",
        meta2036: "78.0% (2036)",
      },
    ],
    metasClave: [
      "10.000 familias graduadas de los programas de erradicación de pobreza extrema del PES-PR.",
      "5.000 micronegocios y unidades de economía popular capitalizadas con microcréditos sin usura.",
      "3.000 títulos de propiedad entregados y 2.500 mejoramientos de vivienda productiva.",
      "Reducción de 6 puntos porcentuales en la tasa de informalidad juvenil del Distrito.",
    ],
    corresponsables: [
      {
        dependenciaId: "dep-hacienda",
        rolEspecifico: "Incentivos Tributarios",
        proyectoClave:
          "Alivios tributarios e incentivos fiscales para empresas que contraten jóvenes cartageneros.",
      },
      {
        dependenciaId: "dep-corvivienda",
        rolEspecifico: "Hábitat Productivo",
        proyectoClave:
          "Subsidios distritales de mejoramiento de vivienda con espacios para talleres productivos.",
      },
      {
        dependenciaId: "dep-colmayor",
        rolEspecifico: "Educación Superior",
        proyectoClave:
          "Becas de matrícula cero para carreras técnicas laborales y tecnológicas de alta demanda.",
      },
      {
        dependenciaId: "dep-turismo",
        rolEspecifico: "Turismo Comunitario",
        proyectoClave:
          "Programa 'Turismo Comunitario Sostenible': encadenamiento de guías y artesanos locales.",
      },
      {
        dependenciaId: "dep-gepm",
        rolEspecifico: "Comercio Informal",
        proyectoClave:
          "Zonas comerciales especiales concertadas para vendedores informales con carnetización.",
      },
      {
        dependenciaId: "dep-etcar",
        rolEspecifico: "Oficios Tradicionales",
        proyectoClave:
          "Talleres de formación técnica en carpintería patrimonial, forja, albañilería y jardinería.",
      },
      {
        dependenciaId: "dep-planeacion",
        rolEspecifico: "Focalización Social",
        proyectoClave:
          "Focalización del SISBÉN IV para acceso transparente y prioritario a subsidios sociales.",
      },
      {
        dependenciaId: "dep-loc-3",
        rolEspecifico: "Corredor Industrial",
        proyectoClave:
          "Conexión de mano de obra local calificada con las industrias de Mamonal y la bahía.",
      },
    ],
  },
  {
    id: "ambiental",
    codigo: "D4",
    numero: "04",
    nombre: "Seguridad Ambiental y del Entorno",
    nombreCorto: "Ambiental",
    icono: Leaf,
    lema: "Resiliencia climática, saneamiento de cuerpos de agua y preservación ecosistémica",
    descripcion:
      "Restauración integral de la Ciénaga de la Virgen y caños distritales, mitigación de la erosión costera, drenaje pluvial contra inundaciones y control estricto de la contaminación.",
    marcoLegal:
      "Ley Estatutaria 1757 de 2015 • Ley 99 de 1993 • Sentencia T-622 (Derechos de la Naturaleza)",
    entidadLiderId: "dep-epa",
    presupuestoTotalCop: "$89.200 Millones COP",
    colorToken: "var(--success)",
    pilarOnu: "Libertad frente a la necesidad",
    queEsExplicacionPedagogica: [
      "La Seguridad Ambiental protege a las comunidades frente a la degradación ecológica, la escasez de recursos naturales vitales (agua potable, aire limpio, suelo productivo) y las catástrofes climáticas originadas por la intervención humana no planificada.",
      "Promueve una relación armónica entre el crecimiento urbano y la conservación de la biodiversidad, defendiendo los derechos de la naturaleza (Sentencia T-622) y asegurando que las futuras generaciones hereden un hábitat habitable y resiliente.",
      "Garantiza que los costos ecológicos del desarrollo no recaigan de forma desproporcionada sobre las poblaciones más pobres que habitan las zonas de mayor riesgo por inundaciones, deslizamientos o contaminación.",
    ],
    contextoCartagena:
      "Cartagena es una ciudad anfibia amenazada frontalmente por el cambio climático: el aumento del nivel del mar, la erosión costera en Tierrabomba y Marbella, el deterioro hídrico de la Ciénaga de la Virgen por rellenos ilegales y la ausencia de un Plan Maestro de Drenajes Pluviales hacen que cada lluvia fuerte colapse barrios enteros en la Localidad 2 y 3.",
    amenazasCriticas: [
      {
        titulo: "Inundaciones pluviales y marea alta",
        descripcion:
          "Desbordamiento sistemático de caños y canales que anega viviendas, escuelas y calles en sectores de la Ciénaga.",
      },
      {
        titulo: "Rellenos ilegales en cuerpos de agua",
        descripcion:
          "Invasión y taponamiento de manglares y caños por asentamientos no planificados y mafias de tierras.",
      },
      {
        titulo: "Contaminación de la Bahía y Caño de Juan Angola",
        descripcion:
          "Descarga de aguas residuales sin tratar y residuos industriales que destruyen la pesca artesanal y la salud ambiental.",
      },
      {
        titulo: "Erosión costera y pérdida insular",
        descripcion:
          "Retroceso acelerado de la línea de costa que destruye playas públicas y viviendas en Barú, Tierra Bomba e islas.",
      },
    ],
    enfoqueDiferencial:
      "Especial atención y co-manejo ambiental con los pescadores artesanales y comunidades de manglar de la Ciénaga de la Virgen; programas de reasentamiento concertado sin desarraigo cultural para familias isleñas; e involucramiento de la niñez como guardianes del ecosistema.",
    comoParticipar:
      "Registra denuncias de vertimientos y rellenos ilegales en el Geovisor Territorial, haz seguimiento a las obras de drenaje pluvial en el módulo de seguimiento de POLIS y participa en las jornadas de reforestación comunitaria.",
    indicadoresTrazadores: [
      {
        indicador: "Porcentaje de cuencas críticas con drenaje pluvial operativo",
        lineaBase: "28% (2024)",
        meta2036: "85% (2036)",
      },
      {
        indicador: "Índice de Calidad del Agua (ICA) en Ciénaga de la Virgen y Bahía",
        lineaBase: "Malo / Regular (2024)",
        meta2036: "Aceptable / Bueno (2036)",
      },
      {
        indicador: "Hectáreas de manglar y bosque seco tropical restauradas y protegidas",
        lineaBase: "180 ha (2024)",
        meta2036: "1.200 ha (2036)",
      },
    ],
    metasClave: [
      "Recuperación hídrica y saneamiento ambiental de 15 caños y lagos de la zona urbana e insular.",
      "100.000 árboles nativos sembrados y protegidos en corredores de sombra e islas de calor.",
      "Obras de drenaje pluvial ejecutadas en las cuencas más vulnerables a inundaciones repentinas.",
      "Cero vertimientos industriales no autorizados en la Bahía de Cartagena y Caño de Juan Angola.",
    ],
    corresponsables: [
      {
        dependenciaId: "dep-infraestructura",
        rolEspecifico: "Drenajes Pluviales",
        proyectoClave:
          "Construcción y mantenimiento del sistema de canales maestros y colectores pluviales.",
      },
      {
        dependenciaId: "dep-oagrd",
        rolEspecifico: "Estabilización de Riesgos",
        proyectoClave:
          "Obras de bioingeniería para estabilización de taludes en las faldas de La Popa y Albornoz.",
      },
      {
        dependenciaId: "dep-corvivienda",
        rolEspecifico: "Reasentamiento Preventivo",
        proyectoClave:
          "Reasentamiento digno de hogares ubicados en zonas de inundación recurrente y alto riesgo.",
      },
      {
        dependenciaId: "dep-transcaribe",
        rolEspecifico: "Movilidad Limpia",
        proyectoClave:
          "Plan de descarbonización de la flota de transporte masivo y corredores verdes troncales.",
      },
      {
        dependenciaId: "dep-datt",
        rolEspecifico: "Control de Emisiones",
        proyectoClave:
          "Monitoreo de emisiones vehiculares y operativos de control contra fuentes móviles contaminantes.",
      },
      {
        dependenciaId: "dep-loc-2",
        rolEspecifico: "Custodia de Ciénaga",
        proyectoClave:
          "Vigilancia comunitaria permanente para frenar rellenos ilegales en la Ciénaga de la Virgen.",
      },
    ],
  },
  {
    id: "alimentaria",
    codigo: "D5",
    numero: "05",
    nombre: "Seguridad Alimentaria y Nutricional",
    nombreCorto: "Alimentaria",
    icono: Wheat,
    lema: "Soberanía nutricional, erradicación del hambre infantil y apoyo a la ruralidad",
    descripcion:
      "Garantía del derecho humano a la alimentación adecuada, comedores comunitarios dignos, nutrición escolar con calidad y circuitos cortos de comercialización con los campesinos corregimentales.",
    marcoLegal:
      "Ley Estatutaria 1757 de 2015 • Ley 2294 de 2023 • CONPES 113 de Seguridad Alimentaria",
    entidadLiderId: "dep-pes",
    presupuestoTotalCop: "$38.500 Millones COP",
    colorToken: "var(--warning)",
    pilarOnu: "Libertad frente a la necesidad",
    queEsExplicacionPedagogica: [
      "La Seguridad Alimentaria existe cuando todas las personas tienen, en todo momento, acceso físico, social y económico a alimentos suficientes, inocuos y nutritivos que satisfacen sus necesidades energéticas para llevar una vida activa y sana.",
      "Supera el asistencialismo pasivo para reivindicar el Derecho Humano a la Alimentación, conectando la producción campesina local con la nutrición escolar, la lactancia materna y la canasta básica a precios justos.",
      "Busca la soberanía alimentaria del territorio reduciendo la dependencia extrema de suministros externos y combatiendo el desperdicio en las cadenas de comercialización y abasto mayorista.",
    ],
    contextoCartagena:
      "A pesar de ser puerto de entrada internacional, más de 200.000 cartageneros consumen menos de tres comidas al día. El 45% de los hogares en sectores vulnerables sufre inseguridad alimentaria moderada o severa. Mientras tanto, los corregimientos rurales agrícolas del norte (Bayunca, Pontezuela, Arroyo Grande, Pasacaballos) carecen de vías terciarias y centros de acopio para vender sus cosechas sin intermediarios abusivos.",
    amenazasCriticas: [
      {
        titulo: "Desnutrición crónica y aguda en primera infancia",
        descripcion:
          "Carencia de micronutrientes y peso bajo en menores de 5 años en barrios de invasión y corregimientos.",
      },
      {
        titulo: "Hambre oculta y reducción de raciones",
        descripcion:
          "Hogares vulnerables que sacrifican calidad y frecuencia de comidas para cubrir servicios públicos o arriendo.",
      },
      {
        titulo: "Intermediación abusiva a campesinos locales",
        descripcion:
          "Pérdida de cosechas y precios ruinosos para los productores rurales por falta de centros de acopio distritales.",
      },
      {
        titulo: "Interrupciones y fallas de calidad en el PAE",
        descripcion:
          "Irregularidades o demoras en la entrega de alimentos calientes en colegios públicos oficiales.",
      },
    ],
    enfoqueDiferencial:
      "Atención prioritaria y vigilancia antropométrica en niños y niñas afro e indígenas; programas de huertas comunitarias y soberanía alimentaria guiados por sabedoras del campo; y abastecimiento local del PAE con productos de la agricultura familiar corregimental.",
    comoParticipar:
      "Reporta incidencias en el suministro de alimentación escolar en tu colegio a través de POLIS, apoya las ferias de Mercados Campesinos barriales y co-diseña alternativas de comedores comunitarios autogestionados.",
    indicadoresTrazadores: [
      {
        indicador: "Prevalencia de inseguridad alimentaria moderada o severa (FIES)",
        lineaBase: "42.8% de hogares (2024)",
        meta2036: "10.0% de hogares (2036)",
      },
      {
        indicador: "Tasa de mortalidad por desnutrición en menores de 5 años por 100.000",
        lineaBase: "4.8 (2024)",
        meta2036: "0.0 (Cero muertes prevenibles, 2036)",
      },
      {
        indicador: "Porcentaje de alimentos del PAE y comedores provenientes de productores locales",
        lineaBase: "8.5% (2024)",
        meta2036: "50.0% (2036)",
      },
    ],
    metasClave: [
      "45 comedores comunitarios instalados y abastecidos en barrios con mayor índice de desnutrición.",
      "100% de estudiantes de colegios oficiales beneficiados con raciones calientes del PAE.",
      "Tasa de desnutrición aguda infantil reducida a menos del 1.2% en todo el Distrito.",
      "Mercados campesinos semanales conectando productores de Bayunca, Pontezuela y Barú.",
    ],
    corresponsables: [
      {
        dependenciaId: "dep-participacion",
        rolEspecifico: "Desarrollo Agropecuario",
        proyectoClave:
          "Asistencia técnica agropecuaria (UMATA) y entrega de insumos a pequeños campesinos.",
      },
      {
        dependenciaId: "dep-dadis",
        rolEspecifico: "Vigilancia Nutricional",
        proyectoClave:
          "Tamizaje nutricional masivo en primera infancia y entrega de micronutrientes esenciales.",
      },
      {
        dependenciaId: "dep-educacion",
        rolEspecifico: "Alimentación Escolar (PAE)",
        proyectoClave:
          "Supervisión rigurosa de calidad e inocuidad del Programa de Alimentación Escolar (PAE).",
      },
    ],
  },
  {
    id: "salud",
    codigo: "D6",
    numero: "06",
    nombre: "Seguridad en Salud y Sanitaria",
    nombreCorto: "Salud",
    icono: HeartPulse,
    lema: "Atención primaria resolutiva, salud mental barrial y control epidemiológico",
    descripcion:
      "Acceso oportuno y humanizado a servicios de salud, apertura de nuevos centros de salud (CAP), prevención comunitaria del dengue y creación de una red distrital para el cuidado de la salud mental.",
    marcoLegal:
      "Ley Estatutaria 1757 de 2015 • Ley Estatutaria 1751 de 2015 • Ley 715 de 2001",
    entidadLiderId: "dep-dadis",
    presupuestoTotalCop: "$76.200 Millones COP",
    colorToken: "var(--danger)",
    pilarOnu: "Libertad frente a la necesidad",
    queEsExplicacionPedagogica: [
      "La Seguridad en Salud garantiza el derecho inalienable a disfrutar del más alto nivel posible de salud física, mental y comunitaria, protegiendo a las poblaciones frente a epidemias, enfermedades prevenibles y barreras de acceso a la atención médica.",
      "Prioriza la Atención Primaria en Salud (APS) con enfoque preventivo en el territorio, llevando médicos, enfermeras y psicólogos directamente a las casas y centros comunitarios antes de que las dolencias requieran hospitalización costosa.",
      "Reconoce que la salud mental, el bienestar psicosocial y la prevención comunitaria del consumo problemático de sustancias son componentes indispensables de la paz y la seguridad barrial.",
    ],
    contextoCartagena:
      "La red pública hospitalaria del Distrito (ESE Cartagena de Indias) arrastra un déficit histórico de infraestructura, con Centros de Atención Permanente (CAP) inconclusos en barrios como El Pozón, Nelson Mandela y Barú. A esto se suman brotes estacionales recurrentes de dengue grave y una crisis silenciosa de salud mental juvenil agudizada por la falta de psicólogos clínicos en el sistema público.",
    amenazasCriticas: [
      {
        titulo: "Barreras de acceso y CAP inconclusos",
        descripcion:
          "Tiempos de espera inhumanos y falta de puestos de salud abiertos 24/7 en los corregimientos e islas.",
      },
      {
        titulo: "Enfermedades tropicales desatendidas (Dengue)",
        descripcion:
          "Transmisión comunitaria de dengue, chikungunya y zika en sectores sin alcantarillado con agua almacenada.",
      },
      {
        titulo: "Crisis de salud mental y suicidio juvenil",
        descripcion:
          "Aumento de trastornos de ansiedad, depresión y conductas suicidas en jóvenes sin red de apoyo psicosocial.",
      },
      {
        titulo: "Mortalidad materna y neonatal evitable",
        descripcion:
          "Complicaciones en el parto y puerperio en madres gestantes de zonas periféricas sin controles prenatales oportunos.",
      },
    ],
    enfoqueDiferencial:
      "Integración de la medicina tradicional ancestral y partería afrodescendiente con el sistema médico oficial; unidades móviles acuáticas de salud para la zona insular; y equipos multidisciplinarios para la prevención integral de adicciones en jóvenes.",
    comoParticipar:
      "Audita el estado de avance de las obras de los CAP de tu barrio en POLIS, reporta focos de reproducción de dengue en tu manzana territorial y participa en las veedurías ciudadanas de salud pública.",
    indicadoresTrazadores: [
      {
        indicador: "Cobertura de Centros de Atención Permanente (CAP) modernizados y en servicio",
        lineaBase: "52% de la red (2024)",
        meta2036: "100% de la red (2036)",
      },
      {
        indicador: "Razón de mortalidad materna por 100.000 nacidos vivos",
        lineaBase: "58.2 (2024)",
        meta2036: "20.0 (2036)",
      },
      {
        indicador: "Tiempo promedio de asignación de cita médica en atención primaria (días)",
        lineaBase: "14 días (2024)",
        meta2036: "2 días (2036)",
      },
    ],
    metasClave: [
      "Apertura y modernización de 6 Centros de Atención Permanente (CAP) en barrios populares e islas.",
      "95% de cobertura distrital en el esquema regular de vacunación infantil y del adulto mayor.",
      "Red Distrital de Salud Mental y Prevención de Adicciones activa en los 3 territorios locales.",
      "Control focal y reducción del 40% en casos graves de dengue y enfermedades transmitidas por vectores.",
    ],
    corresponsables: [
      {
        dependenciaId: "dep-pes",
        rolEspecifico: "Salud Extramural",
        proyectoClave:
          "Jornadas integrales de salud extramural en comunidades sin cobertura médica directa.",
      },
      {
        dependenciaId: "dep-epa",
        rolEspecifico: "Control de Vectores",
        proyectoClave:
          "Fumigación y control biológico de larvas en reservorios y canales de agua estancada.",
      },
      {
        dependenciaId: "dep-datt",
        rolEspecifico: "Respuesta a Siniestros",
        proyectoClave:
          "Sistema de ambulancias y atención prehospitalaria de emergencias por siniestros viales.",
      },
      {
        dependenciaId: "dep-bomberos",
        rolEspecifico: "Gestión de Materiales Peligrosos",
        proyectoClave:
          "Respuesta ante emergencias con sustancias químicas y contingencias de bioseguridad.",
      },
    ],
  },
  {
    id: "politica",
    codigo: "D7",
    numero: "07",
    nombre: "Seguridad Política e Institucional",
    nombreCorto: "Política",
    icono: Scale,
    lema: "Democracia participativa, gobierno abierto, probidad y protección de liderazgos",
    descripcion:
      "Garantía plena para el ejercicio del control social, protección a veedores y defensores de DD.HH., presupuesto participativo transparente y digitalización de trámites públicos en POLIS.",
    marcoLegal:
      "Ley Estatutaria 1757 de 2015 • Sentencia C-150 de 2015 • Ley 1712 de 2014 (Transparencia)",
    entidadLiderId: "dep-planeacion",
    presupuestoTotalCop: "$28.300 Millones COP",
    colorToken: "var(--info)",
    pilarOnu: "Libertad frente a la indignidad",
    queEsExplicacionPedagogica: [
      "La Seguridad Política protege a las personas y colectivos para que puedan ejercer libremente sus derechos civiles y políticos, participar en el gobierno de su territorio y expresar opiniones disidentes sin temor a persecución, violencia o censura.",
      "Exige instituciones transparentes, probas y que rindan cuentas, desterrando la corrupción, el clientelismo y la captura de las decisiones públicas por intereses particulares.",
      "Garantiza que la planeación de la ciudad se construya desde abajo hacia arriba (Ley Estatutaria 1757 de 2015), otorgando a la ciudadanía poder vinculante sobre el presupuesto y las políticas públicas distritales.",
    ],
    contextoCartagena:
      "Cartagena vivió décadas de profunda inestabilidad institucional, con más de 12 alcaldes en una década, altos índices de desconfianza ciudadana y amenazas recurrentes contra veedores ciudadanos, ambientalistas y líderes comunitarios que denuncian irregularidades en la contratación o despojos de tierras en la zona insular y de la Ciénaga.",
    amenazasCriticas: [
      {
        titulo: "Amenazas a liderazgos sociales y veedurías",
        descripcion:
          "Intimidaciones armadas y persecución judicial contra líderes de JAC, ambientalistas y defensores de DD.HH.",
      },
      {
        titulo: "Captura clientelar de recursos públicos",
        descripcion:
          "Desvío de presupuestos de inversión comunitaria hacia redes de favores políticos que anulan el desarrollo.",
      },
      {
        titulo: "Opacidad y desinformación institucional",
        descripcion:
          "Dificultad ciudadana para acceder a contratos, actas, gastos públicos y estados de ejecución de obras.",
      },
      {
        titulo: "Baja incidencia del voto y de la deliberación",
        descripcion:
          "Sensación de impotencia ciudadana que alimenta la abstención y la desafección democrática.",
      },
    ],
    enfoqueDiferencial:
      "Garantías reforzadas de seguridad y protección colectiva para lideresas comunitarias y defensoras de derechos humanos; fortalecimiento de los mecanismos de autogobierno de las comunidades étnicas; y accesibilidad universal digital para personas con discapacidad.",
    comoParticipar:
      "Ejerce veeduría en tiempo real sobre las metas y presupuestos de la política en POLIS, firma y valida actas oficiales con trazabilidad SHA-256, postula alternativas de solución en el Banco Distrital y haz preguntas en las audiencias de rendición de cuentas.",
    indicadoresTrazadores: [
      {
        indicador: "Índice de Transparencia y Acceso a la Información (ITA - Procuraduría)",
        lineaBase: "68.5 / 100 (2024)",
        meta2036: "95.0 / 100 (2036)",
      },
      {
        indicador: "Porcentaje de presupuesto distrital de inversión concertado con comunidades",
        lineaBase: "4.2% (2024)",
        meta2036: "25.0% (2036)",
      },
      {
        indicador: "Índice de efectividad en la protección a líderes sociales en riesgo (CIPRAT)",
        lineaBase: "48% (2024)",
        meta2036: "100% de alertas con respuesta inmediata (2036)",
      },
    ],
    metasClave: [
      "100% de las 36 mesas territoriales de participación ciudadana sistematizadas en POLIS.",
      "Puntaje superior a 85 en el Índice de Desempeño Institucional (IDI) del DAFP.",
      "Mesa Permanente de Garantías para Lideresas, Líderes Sociales y Defensores de DD.HH.",
      "Presupuesto participativo territorial con asignación vinculante en las tres localidades.",
    ],
    corresponsables: [
      {
        dependenciaId: "dep-general",
        rolEspecifico: "Atención al Ciudadano",
        proyectoClave:
          "Atención transparente de PQRSD con tiempos de respuesta menores a 10 días hábiles.",
      },
      {
        dependenciaId: "dep-tic",
        rolEspecifico: "Gobierno Digital",
        proyectoClave:
          "Plataforma POLIS con trazabilidad criptográfica, datos abiertos y soberanía tecnológica.",
      },
      {
        dependenciaId: "dep-hacienda",
        rolEspecifico: "Transparencia Fiscal",
        proyectoClave:
          "Visualizador público de ejecución presupuestal y contratación pública en tiempo real.",
      },
      {
        dependenciaId: "dep-idaccc",
        rolEspecifico: "Veedurías Ciudadanas",
        proyectoClave:
          "Acompañamiento jurídico y formación a comités de veeduría ciudadana comunitaria.",
      },
      {
        dependenciaId: "dep-escuela-gob",
        rolEspecifico: "Ética Pública",
        proyectoClave:
          "Cátedra ciudadana de ética pública, prevención de la corrupción y gobierno transparente.",
      },
    ],
  },
  {
    id: "crisis",
    codigo: "D8",
    numero: "08",
    nombre: "Alertas Tempranas y Gestión del Riesgo (Crisis)",
    nombreCorto: "Crisis",
    icono: AlertTriangle,
    lema: "Capacidad de respuesta inmediata 24/7 frente a desastres y amenazas graves",
    descripcion:
      "Eje transversal para la atención expedita de emergencias climáticas (vendavales, mar de leva, huracanes), incendios estructurales, colapsos de infraestructura y alertas tempranas del CIPRAT.",
    marcoLegal:
      "Ley Estatutaria 1757 de 2015 • Ley 1523 de 2012 (Gestión del Riesgo) • Sentencia C-150/15",
    entidadLiderId: "dep-oagrd",
    presupuestoTotalCop: "$32.100 Millones COP",
    colorToken: "var(--danger)",
    pilarOnu: "Libertad frente al miedo",
    queEsExplicacionPedagogica: [
      "La Gestión Integral del Riesgo y Alertas Tempranas actúa como el eje transversal que protege la vida frente a desastres naturales, contingencias climáticas extremas o emergencias humanitarias repentinas.",
      "Asegura que el Distrito cuente con capacidad de anticipación científica, monitoreo 24/7 y respuesta coordinada inmediata en los primeros minutos críticos de una catástrofe.",
      "Promueve una cultura ciudadana de prevención y simulacros comunitarios, entendiendo que los desastres no son naturales sino producto de vulnerabilidades sociales y territoriales no gestionadas a tiempo.",
    ],
    contextoCartagena:
      "La topografía costera de Cartagena y su alta vulnerabilidad frente a vendavales, mar de leva, huracanes del Caribe y deslizamientos en las faldas de La Popa y cerro de Albornoz exigen un Sistema de Alerta Temprana robusto, conectado en tiempo real con las comunidades insulares y barrios de ladera.",
    amenazasCriticas: [
      {
        titulo: "Huracanes, vendavales y mar de leva",
        descripcion:
          "Impacto destructivo de eventos hidrometeorológicos sobre viviendas precarias y muelles costeros.",
      },
      {
        titulo: "Deslizamientos en laderas urbanas",
        descripcion:
          "Movimientos en masa que amenazan con sepultar viviendas en las faldas de La Popa y San Bernardo.",
      },
      {
        titulo: "Incendios estructurales en asentamientos",
        descripcion:
          "Conflagraciones rápidas en sectores con viviendas de madera y redes eléctricas improvisadas sin hidrantes.",
      },
      {
        titulo: "Accidentes tecnológicos en zona industrial",
        descripcion:
          "Riesgo de fugas químicas, explosiones o derrames de hidrocarburos en el corredor industrial de Mamonal.",
      },
    ],
    enfoqueDiferencial:
      "Comités comunitarios de gestión del riesgo liderados por la propia comunidad en barrios vulnerables e islas; protocolos accesibles de evacuación para personas con movilidad reducida y adultos mayores; y albergues temporales seguros que protejan la intimidad de mujeres y niños.",
    comoParticipar:
      "Reporta emergencias y riesgos inminentes en el mapa interactivo de POLIS, consulta las rutas de evacuación de tu localidad y vinculate a las brigadas de socorro y primeros auxilios de tu Junta de Acción Comunal.",
    indicadoresTrazadores: [
      {
        indicador: "Tiempo promedio de respuesta de primera ayuda en emergencias",
        lineaBase: "24 minutos (2024)",
        meta2036: "8 minutos (2036)",
      },
      {
        indicador: "Puntos críticos de riesgo con Sistema de Alerta Temprana Comunitario (SAT)",
        lineaBase: "4 puntos (2024)",
        meta2036: "36 puntos (100% de zonas críticas, 2036)",
      },
      {
        indicador: "Hogares en alto riesgo mitigable con obras de estabilización concluidas",
        lineaBase: "21% (2024)",
        meta2036: "85% (2036)",
      },
    ],
    metasClave: [
      "Sistema de Alerta Temprana Comunitario (SAT) activo en 12 puntos críticos de inundación y remoción en masa.",
      "Tiempo promedio de respuesta de socorro reducido a menos de 12 minutos en todo el perímetro urbano.",
      "Fondo Distrital de Gestión del Riesgo con disponibilidad presupuestal inmediata ante emergencias.",
      "Red de albergues temporales dignos y banco de ayudas humanitarias preposicionado.",
    ],
    corresponsables: [
      {
        dependenciaId: "dep-bomberos",
        rolEspecifico: "Rescate y Socorro",
        proyectoClave:
          "Operatividad total de las 4 estaciones de bomberos y brigadas especializadas de rescate.",
      },
      {
        dependenciaId: "dep-sicc",
        rolEspecifico: "Comité de Alertas (CIPRAT)",
        proyectoClave:
          "Comité Interinstitucional para la Respuesta Rápida a Alertas Tempranas (CIPRAT).",
      },
      {
        dependenciaId: "dep-distriseguridad",
        rolEspecifico: "Radiocomunicaciones",
        proyectoClave:
          "Red de telecomunicaciones tácticas y enlace radial con organismos de primera respuesta.",
      },
    ],
  },
];

export function obtenerDimensionPorId(id: string): DimensionDetalle | undefined {
  const norm = id.toLowerCase();
  return DIMENSIONES_DETALLE_2026.find(
    (d) =>
      d.id === norm ||
      d.codigo.toLowerCase() === norm ||
      d.nombreCorto.toLowerCase() === norm
  );
}

export function obtenerEntidadConTitular(dependencia: DependenciaDistrital) {
  const titular =
    GABINETE_TITULARES[dependencia.id] ?? "Dirección de Despacho Institucional";
  const esLiderEn = DIMENSIONES_DETALLE_2026.filter(
    (dim) => dim.entidadLiderId === dependencia.id
  ).map((dim) => dim.id);
  const esCorresponsableEn = dependencia.dimensionesPrincipales.filter(
    (dimId) => !esLiderEn.includes(dimId)
  );

  return {
    ...dependencia,
    titular,
    esLiderEn,
    esCorresponsableEn,
  };
}
