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
  DEPENDENCIAS_CARTAGENA_2026,
  type DependenciaDistrital,
} from "./entidades-cartagena.data";

export interface CorresponsableRol {
  dependenciaId: string;
  rolEspecifico: string;
  proyectoClave: string;
}

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
  colorToken: string; // var(--ember), etc.
  metasClave: string[];
  corresponsables: CorresponsableRol[];
}

export const GABINETE_TITULARES: Record<string, string> = {
  "dep-sicc": "Bruno Hernández Ramos — Secretario del Interior y Convivencia",
  "dep-participacion": "Cielo Blanco Flórez — Secretaria de Participación y Desarrollo Social",
  "dep-planeacion": "Camilo Rey Sabogal — Secretario de Planeación Distrital",
  "dep-educacion": "Alberto Martínez Monterrosa — Secretario de Educación Distrital",
  "dep-turismo": "Teremar Londoño Zurek — Secretaria de Turismo",
  "dep-hacienda": "María Camila Salas — Secretaria de Hacienda Distrital",
  "dep-infraestructura": "Wílmer Iriarte Restrepo — Secretario de Infraestructura",
  "dep-general": "María Patricia Porras — Secretaria General",
  "dep-dadis": "Álex Tejada Núñez — Director General DADIS",
  "dep-epa": "Mauricio Rodríguez Gómez — Director General EPA Cartagena",
  "dep-datt": "José Ricaurte Gómez — Director General DATT",
  "dep-pes": "Jorge Redondo — Director Plan de Emergencia Social Pedro Romero",
  "dep-corvivienda": "Gissela Román — Gerente General Corvivienda",
  "dep-ider": "Campo Elías Therán Humanez — Director General IDER",
  "dep-idaccc": "Geovany Blanco — Director General IDACCC",
  "dep-ipcc": "Lucy Espinosa Díaz — Directora General IPCC",
  "dep-etcar": "Sandra Schmalbach — Directora General ETCAR",
  "dep-distriseguridad": "Jaime Hernández Amín — Director Distriseguridad",
  "dep-transcaribe": "Ercilia Barrios Flórez — Gerente General Transcaribe S.A.",
  "dep-colmayor": "Juan Arraut Camargo — Rector Institución Universitaria Mayor",
  "dep-oagrd": "Daniel Vargas — Director Asesor OAGRD",
  "dep-bomberos": "Jhony Pérez Sayas — Comandante Oficial del Cuerpo de Bomberos",
  "dep-gepm": "Tannis Puello — Gerente de Espacio Público y Movilidad",
  "dep-gerencia-centro": "Raquel Garavito Chapaval — Gerente de Centro Histórico",
  "dep-escuela-gob": "Robinson Casarrubia — Director Escuela de Gobierno y Liderazgo",
  "dep-tic": "Manuel Guardo — Jefe de la Oficina Asesora de TIC",
  "dep-loc-1": "Frank Ricaurte — Alcalde Local 1 (Histórica y del Caribe Norte)",
  "dep-loc-2": "Alexis Valerio — Alcaldesa Local 2 (De la Virgen y Turística)",
  "dep-loc-3": "Yucelis Garrido — Alcaldesa Local 3 (Industrial y de la Bahía)",
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
      "Decreto 037 de 2026 Art. 4.1 • Ley Estatutaria 1801 de 2016 • Sentencia T-025 de 2004",
    entidadLiderId: "dep-sicc",
    presupuestoTotalCop: "$68.400 Millones COP",
    colorToken: "var(--danger)",
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
        proyectoClave: "Mantenimiento y expansión de 1.200 cámaras inteligentes de videovigilancia y alarmas comunitarias.",
      },
      {
        dependenciaId: "dep-datt",
        rolEspecifico: "Movilidad Segura",
        proyectoClave: "Operativos de control vial nocturno y restricción focalizada en corredores de alta incidencia.",
      },
      {
        dependenciaId: "dep-turismo",
        rolEspecifico: "Protección Turística",
        proyectoClave: "Blindaje institucional de playas, muelles y baluartes contra ESCNNA y cobros extorsivos.",
      },
      {
        dependenciaId: "dep-educacion",
        rolEspecifico: "Entornos Protectores",
        proyectoClave: "Estrategia 'Colegios Territorios de Paz' y erradicación de expendios de drogas perimetrales.",
      },
      {
        dependenciaId: "dep-gepm",
        rolEspecifico: "Recuperación de Espacio",
        proyectoClave: "Despeje de andenes e iluminación de puntos oscuros propensos al hurto y acoso.",
      },
      {
        dependenciaId: "dep-gerencia-centro",
        rolEspecifico: "Convivencia Patrimonial",
        proyectoClave: "Plan Integral de Seguridad y Convivencia Nocturna en el Centro Histórico y San Diego.",
      },
      {
        dependenciaId: "dep-loc-1",
        rolEspecifico: "Territorio Local 1",
        proyectoClave: "Coordinación de inspecciones de policía y comisarías de familia en barrios del norte.",
      },
      {
        dependenciaId: "dep-loc-2",
        rolEspecifico: "Territorio Local 2",
        proyectoClave: "Puntos de control barrial y mediación de conflictos en Olaya Herrera y El Pozón.",
      },
      {
        dependenciaId: "dep-loc-3",
        rolEspecifico: "Territorio Local 3",
        proyectoClave: "Plan de choque contra la extorsión y el microtráfico en Nelson Mandela y Pasacaballos.",
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
      "Decreto 037 de 2026 Art. 4.2 • Ley 70 de 1993 • Convenio 169 OIT • Ley 2166 de 2021 (JAC)",
    entidadLiderId: "dep-participacion",
    presupuestoTotalCop: "$42.800 Millones COP",
    colorToken: "var(--ember)",
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
        proyectoClave: "Dotación tecnológica y fortalecimiento organizativo de las organizaciones comunales y de base.",
      },
      {
        dependenciaId: "dep-ider",
        rolEspecifico: "Deporte y Recreación",
        proyectoClave: "Programa 'Deporte para la Esperanza': torneos interbarriales nocturnos y adecuación de 40 canchas.",
      },
      {
        dependenciaId: "dep-ipcc",
        rolEspecifico: "Cultura y Memoria",
        proyectoClave: "Circuitos de cultura comunitaria, memoria afrodescendiente y festivales en barrios populares.",
      },
      {
        dependenciaId: "dep-escuela-gob",
        rolEspecifico: "Formación Democrática",
        proyectoClave: "Escuela de Liderazgo Democrático para ediles, voceros de JAC y líderes juveniles.",
      },
      {
        dependenciaId: "dep-colmayor",
        rolEspecifico: "Extensión Universitaria",
        proyectoClave: "Proyectos de extensión universitaria e investigación participativa en sectores vulnerables.",
      },
      {
        dependenciaId: "dep-etcar",
        rolEspecifico: "Patrimonio Compartido",
        proyectoClave: "Apropiación social de las fortificaciones como espacios de encuentro comunitario y convivencia.",
      },
      {
        dependenciaId: "dep-loc-1",
        rolEspecifico: "Concertación Local 1",
        proyectoClave: "Mesas de concertación comunitaria en barrios populares de las faldas de La Popa.",
      },
      {
        dependenciaId: "dep-loc-2",
        rolEspecifico: "Concertación Local 2",
        proyectoClave: "Centros de vida y atención para adultos mayores en la cuenca de la Ciénaga de la Virgen.",
      },
      {
        dependenciaId: "dep-loc-3",
        rolEspecifico: "Concertación Local 3",
        proyectoClave: "Promoción de iniciativas de reconciliación y convivencia en Nelson Mandela y San José.",
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
      "Decreto 037 de 2026 Art. 4.3 • Ley 1454 de 2011 • PDD 2024–2027 Eje Productivo",
    entidadLiderId: "dep-pes",
    presupuestoTotalCop: "$54.600 Millones COP",
    colorToken: "var(--warning)",
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
        proyectoClave: "Alivios tributarios e incentivos fiscales para empresas que contraten jóvenes cartageneros.",
      },
      {
        dependenciaId: "dep-corvivienda",
        rolEspecifico: "Hábitat Productivo",
        proyectoClave: "Subsidios distritales de mejoramiento de vivienda con espacios para talleres productivos.",
      },
      {
        dependenciaId: "dep-colmayor",
        rolEspecifico: "Educación Superior",
        proyectoClave: "Becas de matrícula cero para carreras técnicas laborales y tecnológicas de alta demanda.",
      },
      {
        dependenciaId: "dep-turismo",
        rolEspecifico: "Turismo Comunitario",
        proyectoClave: "Programa 'Turismo Comunitario Sostenible': encadenamiento de guías y artesanos locales.",
      },
      {
        dependenciaId: "dep-gepm",
        rolEspecifico: "Comercio Informal",
        proyectoClave: "Zonas comerciales especiales concertadas para vendedores informales con carnetización.",
      },
      {
        dependenciaId: "dep-etcar",
        rolEspecifico: "Oficios Tradicionales",
        proyectoClave: "Talleres de formación técnica en carpintería patrimonial, forja, albañilería y jardinería.",
      },
      {
        dependenciaId: "dep-planeacion",
        rolEspecifico: "Focalización Social",
        proyectoClave: "Focalización del SISBÉN IV para acceso transparente y prioritario a subsidios sociales.",
      },
      {
        dependenciaId: "dep-loc-3",
        rolEspecifico: "Corredor Industrial",
        proyectoClave: "Conexión de mano de obra local calificada con las industrias de Mamonal y la bahía.",
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
      "Decreto 037 de 2026 Art. 4.4 • Ley 99 de 1993 • Sentencia T-622 (Derechos de la Naturaleza)",
    entidadLiderId: "dep-epa",
    presupuestoTotalCop: "$89.200 Millones COP",
    colorToken: "var(--success)",
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
        proyectoClave: "Construcción y mantenimiento del sistema de canales maestros y colectores pluviales.",
      },
      {
        dependenciaId: "dep-oagrd",
        rolEspecifico: "Estabilización de Riesgos",
        proyectoClave: "Obras de bioingeniería para estabilización de taludes en las faldas de La Popa y Albornoz.",
      },
      {
        dependenciaId: "dep-corvivienda",
        rolEspecifico: "Reasentamiento Preventivo",
        proyectoClave: "Reasentamiento digno de hogares ubicados en zonas de inundación recurrente y alto riesgo.",
      },
      {
        dependenciaId: "dep-transcaribe",
        rolEspecifico: "Movilidad Limpia",
        proyectoClave: "Plan de descarbonización de la flota de transporte masivo y corredores verdes troncales.",
      },
      {
        dependenciaId: "dep-datt",
        rolEspecifico: "Control de Emisiones",
        proyectoClave: "Monitoreo de emisiones vehiculares y operativos de control contra fuentes móviles contaminantes.",
      },
      {
        dependenciaId: "dep-loc-2",
        rolEspecifico: "Custodia de Ciénaga",
        proyectoClave: "Vigilancia comunitaria permanente para frenar rellenos ilegales en la Ciénaga de la Virgen.",
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
      "Decreto 037 de 2026 Art. 4.5 • Ley 2294 de 2023 • CONPES 113 de Seguridad Alimentaria",
    entidadLiderId: "dep-pes",
    presupuestoTotalCop: "$38.500 Millones COP",
    colorToken: "var(--warning)",
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
        proyectoClave: "Asistencia técnica agropecuaria (UMATA) y entrega de insumos a pequeños campesinos.",
      },
      {
        dependenciaId: "dep-dadis",
        rolEspecifico: "Vigilancia Nutricional",
        proyectoClave: "Tamizaje nutricional masivo en primera infancia y entrega de micronutrientes esenciales.",
      },
      {
        dependenciaId: "dep-educacion",
        rolEspecifico: "Alimentación Escolar (PAE)",
        proyectoClave: "Supervisión rigurosa de calidad e inocuidad del Programa de Alimentación Escolar (PAE).",
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
      "Decreto 037 de 2026 Art. 4.6 • Ley Estatutaria 1751 de 2015 • Ley 715 de 2001",
    entidadLiderId: "dep-dadis",
    presupuestoTotalCop: "$76.200 Millones COP",
    colorToken: "var(--danger)",
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
        proyectoClave: "Jornadas integrales de salud extramural en comunidades sin cobertura médica directa.",
      },
      {
        dependenciaId: "dep-epa",
        rolEspecifico: "Control de Vectores",
        proyectoClave: "Fumigación y control biológico de larvas en reservorios y canales de agua estancada.",
      },
      {
        dependenciaId: "dep-datt",
        rolEspecifico: "Respuesta a Siniestros",
        proyectoClave: "Sistema de ambulancias y atención prehospitalaria de emergencias por siniestros viales.",
      },
      {
        dependenciaId: "dep-bomberos",
        rolEspecifico: "Gestión de Materiales Peligrosos",
        proyectoClave: "Respuesta ante emergencias con sustancias químicas y contingencias de bioseguridad.",
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
      "Decreto 037 de 2026 Art. 4.7 • Ley Estatutaria 1757 de 2015 • Ley 1712 de 2014 (Transparencia)",
    entidadLiderId: "dep-planeacion",
    presupuestoTotalCop: "$28.300 Millones COP",
    colorToken: "var(--info)",
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
        proyectoClave: "Atención transparente de PQRSD con tiempos de respuesta menores a 10 días hábiles.",
      },
      {
        dependenciaId: "dep-tic",
        rolEspecifico: "Gobierno Digital",
        proyectoClave: "Plataforma POLIS con trazabilidad criptográfica, datos abiertos y soberanía tecnológica.",
      },
      {
        dependenciaId: "dep-hacienda",
        rolEspecifico: "Transparencia Fiscal",
        proyectoClave: "Visualizador público de ejecución presupuestal y contratación pública en tiempo real.",
      },
      {
        dependenciaId: "dep-idaccc",
        rolEspecifico: "Veedurías Ciudadanas",
        proyectoClave: "Acompañamiento jurídico y formación a comités de veeduría ciudadana comunitaria.",
      },
      {
        dependenciaId: "dep-escuela-gob",
        rolEspecifico: "Ética Pública",
        proyectoClave: "Cátedra ciudadana de ética pública, prevención de la corrupción y gobierno transparente.",
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
      "Decreto 037 de 2026 Art. 5 • Ley 1523 de 2012 (Gestión del Riesgo) • Sentencia C-150/15",
    entidadLiderId: "dep-oagrd",
    presupuestoTotalCop: "$32.100 Millones COP",
    colorToken: "var(--danger)",
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
        proyectoClave: "Operatividad total de las 4 estaciones de bomberos y brigadas especializadas de rescate.",
      },
      {
        dependenciaId: "dep-sicc",
        rolEspecifico: "Comité de Alertas (CIPRAT)",
        proyectoClave: "Comité Interinstitucional para la Respuesta Rápida a Alertas Tempranas (CIPRAT).",
      },
      {
        dependenciaId: "dep-distriseguridad",
        rolEspecifico: "Radiocomunicaciones",
        proyectoClave: "Red de telecomunicaciones tácticas y enlace radial con organismos de primera respuesta.",
      },
    ],
  },
];

export function obtenerDimensionPorId(id: string): DimensionDetalle | undefined {
  const norm = id.toLowerCase();
  return DIMENSIONES_DETALLE_2026.find(
    (d) => d.id === norm || d.codigo.toLowerCase() === norm || d.nombreCorto.toLowerCase() === norm
  );
}

export function obtenerEntidadConTitular(dependencia: DependenciaDistrital) {
  const titular = GABINETE_TITULARES[dependencia.id] ?? "Dirección de Despacho Institucional";
  const esLiderEn = DIMENSIONES_DETALLE_2026.filter((dim) => dim.entidadLiderId === dependencia.id).map((dim) => dim.id);
  const esCorresponsableEn = dependencia.dimensionesPrincipales.filter((dimId) => !esLiderEn.includes(dimId));

  return {
    ...dependencia,
    titular,
    esLiderEn,
    esCorresponsableEn,
  };
}
