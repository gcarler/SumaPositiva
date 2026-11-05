import {
  ShieldCheck,
  HeartHandshake,
  TrendingUp,
  Leaf,
  UtensilsCrossed,
  Activity,
  Vote,
  type LucideIcon,
} from "lucide-react";

export interface DimensionInfo {
  id: string;
  codigo: string;
  nombre: string;
  nombreCorto: string;
  pilarOnu: "miedo" | "necesidad" | "dignidad";
  icono: LucideIcon;
  lema: string;
  colorVar: string;
  descripcion: string;
  desafioCartagena: string;
  ejemploTerritorial: string;
  entidadLider: string;
  marcoNormativo: string;
}

export interface PilarOnu {
  id: string;
  nombre: string;
  titulo: string;
  subtitulo: string;
  onuRef: string;
  descripcion: string;
  dimensiones: string[];
  colorToken: string;
}

export interface ComparativaParadigma {
  aspecto: string;
  seguridadTradicional: string;
  seguridadHumana: string;
  noEs: string;
  siEs: string;
}

export interface DocumentoDescargable {
  id: string;
  titulo: string;
  subtitulo: string;
  descripcion: string;
  badge: string;
  archivoUrl: string;
  nombreDescarga: string;
  formato: string;
  tamanoAprox: string;
  destinatario: string;
}

export interface PreguntaFrecuente {
  id: string;
  numero: string;
  categoria: "doctrina" | "participacion" | "garantias" | "territorio";
  categoriaLabel: string;
  pregunta: string;
  respuesta: string;
  destacado?: string;
  etiquetas?: string[];
  enlaceSugerido?: { texto: string; href: string };
}

export const PILARES_ONU: PilarOnu[] = [
  {
    id: "miedo",
    nombre: "Libertad frente al miedo",
    titulo: "1. Libertad frente al miedo",
    subtitulo: "Protección contra la violencia y el delito",
    onuRef: "Resolución ONU 66/290",
    descripcion:
      "Garantiza que ninguna persona ni comunidad viva amenazada por la violencia física, el homicidio, el sicariato, el reclutamiento ilícito, la extorsión o las armas. Sitúa el desarme social y la convivencia en el centro.",
    dimensiones: ["D1: Personal", "D2: Comunitaria"],
    colorToken: "var(--danger)",
  },
  {
    id: "necesidad",
    nombre: "Libertad frente a la necesidad",
    titulo: "2. Libertad frente a la necesidad",
    subtitulo: "Garantía de condiciones materiales de vida",
    onuRef: "Resolución ONU 66/290",
    descripcion:
      "Asegura que los ciudadanos no sufran por carencias básicas estructurales: hambre, enfermedad sin atención médica, desempleo precario, inundaciones recurrentes o falta de hábitat seguro.",
    dimensiones: ["D3: Económica", "D4: Ambiental", "D5: Alimentaria", "D6: Salud"],
    colorToken: "var(--ember)",
  },
  {
    id: "dignidad",
    nombre: "Libertad para vivir con dignidad",
    titulo: "3. Libertad para vivir con dignidad",
    subtitulo: "Derechos humanos, voz y fe pública",
    onuRef: "Resolución ONU 66/290",
    descripcion:
      "Reconoce el derecho inalienable de las personas a ser escuchadas sin discriminación, a exigir rendición de cuentas, a gozar de justicia expedita y a participar con efectos vinculantes en las decisiones que las afectan.",
    dimensiones: ["D7: Política e Institucional"],
    colorToken: "var(--primary)",
  },
];

export const DIMENSIONES: DimensionInfo[] = [
  {
    id: "personal",
    codigo: "D1",
    nombre: "Seguridad Personal y Ciudadana",
    nombreCorto: "Personal",
    pilarOnu: "miedo",
    icono: ShieldCheck,
    lema: "Libertad frente al miedo, desarme barrial y protección de la vida",
    colorVar: "var(--danger)",
    descripcion:
      "Protección integral de los ciudadanos frente a la violencia física, homicidios, contención del sicariato, microtráfico y extorsión barrial, con salvaguarda prioritaria para niñas, niños y adolescentes.",
    desafioCartagena:
      "Violencia letal y disputas por rentas ilícitas, con riesgo de reclutamiento de adolescentes y de explotación sexual comercial (ESCNNA). El dato público solo permite medirlas a escala municipal, no por barrio.",
    ejemploTerritorial:
      "Alarmas comunitarias barriales, patrullaje preventivo coordinado con la Policía y entornos escolares protegidos frente a la instrumentalización de menores.",
    entidadLider: "Secretaría del Interior y Convivencia Ciudadana • Policía Metropolitana de Cartagena (MECAR)",
    marcoNormativo: "Ley Estatutaria 1801 de 2016 • Sentencia T-025 de 2004 • Ley 2197 de 2022",
  },
  {
    id: "comunitaria",
    codigo: "D2",
    nombre: "Seguridad Comunitaria y Convivencia",
    nombreCorto: "Comunitaria",
    pilarOnu: "miedo",
    icono: HeartHandshake,
    lema: "Tejido social, resolución pacífica y erradicación de violencias basadas en género",
    colorVar: "var(--warning)",
    descripcion:
      "Fortalecimiento de la cohesión vecinal, resolución pacífica de conflictos barriales, prevención de riñas y erradicación radical de las violencias basadas en género en el entorno doméstico y comunitario.",
    desafioCartagena:
      "Rutas de justicia lejanas y saturadas en corregimientos insulares (Barú, Islas del Rosario, Tierrabomba) y altos índices de intolerancia vecinal en fines de semana y festividades.",
    ejemploTerritorial:
      "Mediación comunitaria barrial, fortalecimiento de las Juntas de Acción Comunal (JAC) y rutas de justicia cercana con atención psicosocial.",
    entidadLider: "Secretaría de Desarrollo Social • Casas de Justicia Distritales • Comisarías de Familia",
    marcoNormativo: "Ley 294 de 1996 • Ley 1257 de 2008 • Plan Decenal de Seguridad y Convivencia",
  },
  {
    id: "economica",
    codigo: "D3",
    nombre: "Seguridad Económica y Medios de Vida",
    nombreCorto: "Económica",
    pilarOnu: "necesidad",
    icono: TrendingUp,
    lema: "Empleabilidad digna, microcrédito barrial y sustitución del gota a gota",
    colorVar: "var(--ember)",
    descripcion:
      "Garantía de un ingreso mínimo vital, formalización laboral progresiva, acceso a crédito productivo popular y rescate financiero familiar de las redes usureras extorsivas.",
    desafioCartagena:
      "Informalidad laboral de 50,2 % en la cabecera (GEIH-DANE, oct–dic 2025) y endeudamiento asfixiante de familias populares con cobradores 'gota a gota' vinculados a estructuras armadas.",
    ejemploTerritorial:
      "Acceso a microcrédito productivo como alternativa al 'gota a gota', formalización de cooperativas de recicladores y formación técnica para jóvenes.",
    entidadLider: "Secretaría de Hacienda • Secretaría de Desarrollo Económico • Fondo Emprender Distrital",
    marcoNormativo: "Ley 1429 de 2010 • CONPES 3956 de Inclusión Productiva • Acuerdo Distrital de Fomento",
  },
  {
    id: "ambiental",
    codigo: "D4",
    nombre: "Seguridad Ambiental y Resiliencia Climática",
    nombreCorto: "Ambiental",
    pilarOnu: "necesidad",
    icono: Leaf,
    lema: "Adaptación costera, drenajes pluviales y protección del recurso hídrico",
    colorVar: "var(--success)",
    descripcion:
      "Protección de los asentamientos humanos frente al ascenso del nivel del mar, marejadas, erosión costera, inundaciones invernales y degradación de ciénagas y caños.",
    desafioCartagena:
      "Vulnerabilidad extrema ante el cambio climático en caños del sistema de la Ciénaga de la Virgen, cerros tutelar de La Popa y zonas de bajamar no mitigables.",
    ejemploTerritorial:
      "Plan de drenajes pluviales, reasentamiento digno de familias en alto riesgo no mitigable y recuperación comunitaria de caños.",
    entidadLider: "EPA Cartagena (Establecimiento Público Ambiental) • OAGRD (Gestión del Riesgo) • Cardique",
    marcoNormativo: "Ley 1523 de 2012 de Gestión del Riesgo • Plan 4C Cartagena Competitiva y Sostenible",
  },
  {
    id: "alimentaria",
    codigo: "D5",
    nombre: "Seguridad Alimentaria y Nutrición",
    nombreCorto: "Alimentaria",
    pilarOnu: "necesidad",
    icono: UtensilsCrossed,
    lema: "Cero hambre infantil, comedores populares y soberanía alimentaria local",
    colorVar: "var(--secondary)",
    descripcion:
      "Acceso físico, económico y continuo de todos los hogares a alimentos nutritivos e inocuos, priorizando la primera infancia, madres gestantes y adultos mayores.",
    desafioCartagena:
      "Inseguridad alimentaria moderada o grave en el 28,1 % de la población (2024, DANE SAE, estimación experimental) y dependencia de cadenas de suministro sensibles a los precios.",
    ejemploTerritorial:
      "Comedores comunitarios con seguimiento nutricional, huertas urbanas agroecológicas en colegios oficiales y compras públicas directas a campesinos de los corregimientos.",
    entidadLider: "Plan de Emergencia Social (PES - Pedro Romero) • Secretaría de Participación y Desarrollo",
    marcoNormativo: "CONPES 113 de Seguridad Alimentaria • Ley 1355 de 2009 • ODS 2 Hambre Cero",
  },
  {
    id: "salud",
    codigo: "D6",
    nombre: "Seguridad en Salud y Cuidado Comunitario",
    nombreCorto: "Salud",
    pilarOnu: "necesidad",
    icono: Activity,
    lema: "Atención primaria resolutiva, salud mental barrial y prevención epidemiológica",
    colorVar: "var(--info)",
    descripcion:
      "Sistema de salud pública preventivo, oportuno y territorializado que garantiza atención digna en centros de salud barriales y cuidado intensivo de la salud mental comunitaria.",
    desafioCartagena:
      "Barreras de acceso a la atención en salud y en salud mental; pendiente una línea base verificada con DADIS y estadísticas vitales del DANE.",
    ejemploTerritorial:
      "Equipos básicos de salud puerta a puerta, rutas de atención frente a violencias de género y centros de escucha comunitarios para prevención del suicidio y consumos problemáticos.",
    entidadLider: "DADIS (Departamento Administrativo Distrital de Salud) • ESE Cartagena de Indias",
    marcoNormativo: "Ley Estatutaria 1751 de 2015 de Salud • Modelo de Salud Preventivo y Predictivo",
  },
  {
    id: "politica",
    codigo: "D7",
    nombre: "Seguridad Política, Institucional y Fe Pública",
    nombreCorto: "Política",
    pilarOnu: "dignidad",
    icono: Vote,
    lema: "Democracia vinculante, transparencia pública y trazabilidad inmutable del dato",
    colorVar: "var(--primary)",
    descripcion:
      "Garantía del ejercicio pleno de la participación ciudadana vinculante, protección rigurosa de veedores comunitarios y fe pública digital en la trazabilidad del gasto y las obras.",
    desafioCartagena:
      "Desconfianza ciudadana por promesas incumplidas en administraciones pasadas, cooptación clientelar de espacios comunales y falta de devolución motivada a las propuestas barriales.",
    ejemploTerritorial:
      "Plataforma POLIS con emisión de radicados inviolables (POL-2026-XXXX), devolución motivada obligatoria bajo Sentencia C-150 de 2015 y actas de plenaria con código QR de verificación.",
    entidadLider: "Despacho del Alcalde Mayor • Oficina Asesora de Control Interno • POLIS Herald",
    marcoNormativo: "Constitución Política de 1991 (Arts. 1, 2, 40) • Ley 1757 de 2015 • Sentencia C-150 de 2015",
  },
];

export const COMPARATIVA_PARADIGMA: ComparativaParadigma[] = [
  {
    aspecto: "Enfoque de Seguridad",
    seguridadTradicional: "El Estado, las fronteras físicas y el mantenimiento del orden coercitivo.",
    seguridadHumana: "La persona, las familias y las comunidades vivas en el territorio.",
    noEs: "No es seguridad entendida únicamente en términos policiales o represivos, ni la creencia de que la tranquilidad barrial se resuelve solo con más armas, patrullas o cárceles.",
    siEs: "Es un ejercicio práctico y cotidiano que conecta con el día a día de las personas: caminar tranquilos por el barrio, tener comida en la mesa, agua potable, salud oportuna y trabajo digno.",
  },
  {
    aspecto: "Naturaleza de la Política",
    seguridadTradicional: "Planes burocráticos archivados tras cumplir un requisito formal o legal.",
    seguridadHumana: "Transformación territorial viva, práctica y con impacto medible en las comunidades.",
    noEs: "No es un documento aislado de escritorio, ni una política de papel archivada para dar cumplimiento formal a un trámite o requisito legal.",
    siEs: "Es un pacto territorial vivo y práctico que ataca las causas cotidianas de la inseguridad y asegura compromisos reales de inversión en cada sector de Cartagena.",
  },
  {
    aspecto: "Tratamiento de las Causas",
    seguridadTradicional: "Reactiva: actúa cuando el delito, la riña o la tragedia ya ocurrieron.",
    seguridadHumana: "Preventiva y estructural: ataca el hambre, la falta de oportunidades y la exclusión.",
    noEs: "No es una intervención punitiva que estigmatiza o criminaliza a los jóvenes, a las comunidades populares o a quienes viven del rebusque.",
    siEs: "Es prevención social integral: oportunidades reales de formación y empleo juvenil, salud mental comunitaria, desarme concertado y espacios seguros para convivir.",
  },
  {
    aspecto: "Toma de Decisiones",
    seguridadTradicional: "Vertical y jerárquica: decidida a puerta cerrada en consejos de seguridad.",
    seguridadHumana: "Deliberativa y comunitaria: concertada en Mesas Barriales con fe pública vinculante.",
    noEs: "No es una decisión lejana tomada a puerta cerrada entre cuatro paredes a espaldas de las comunidades y líderes barriales.",
    siEs: "Es deliberación comunitaria vinculante en mesas de trabajo con fe pública, donde la voz de los vecinos orienta las acciones del Distrito.",
  },
  {
    aspecto: "Corresponsabilidad Pública",
    seguridadTradicional: "Delegada casi exclusivamente en la Fuerza Pública y la Policía Nacional.",
    seguridadHumana: "Corresponsabilidad articulada de todas las dependencias de la Alcaldía Mayor.",
    noEs: "No es delegarle toda la responsabilidad del orden y la convivencia a la Policía Nacional, evadiendo el deber social de la administración.",
    siEs: "Es corresponsabilidad articulada y obligatoria de todas las dependencias del Distrito para llevar agua, vías, salud, cultura y justicia cercana a los barrios.",
  },
  {
    aspecto: "Garantías y Derechos",
    seguridadTradicional: "Riesgo de criminalización de la protesta o estigmatización barrial.",
    seguridadHumana: "Enfoque diferencial de derechos humanos, salvaguarda de género e inclusión étnico-racial.",
    noEs: "No es una política reactiva que olvida la dignidad de las comunidades ni la reparación de las víctimas.",
    siEs: "Es la garantía plena de los derechos humanos, la no revictimización y el derecho inalienable de cada habitante de Cartagena a vivir sin miedo.",
  },
];

export const DOCUMENTOS_DESCARGABLES: DocumentoDescargable[] = [
  {
    id: "abc-seguridad-humana",
    titulo: "El ABC de la Seguridad Humana Integral",
    subtitulo: "Cartilla Pedagógica Ciudadana",
    descripcion:
      "Guía oficial explicativa con conceptos clave, los 3 pilares ONU, las 7 dimensiones distritales y cómo incidir en el Plan Decenal de Cartagena 2026–2036.",
    badge: "Documento Maestro",
    archivoUrl: "/docs/ABC_SEGURIDAD_HUMANA_INTEGRAL_CARTAGENA.pdf",
    nombreDescarga: "ABC_SEGURIDAD_HUMANA_INTEGRAL_CARTAGENA.pdf",
    formato: "PDF",
    tamanoAprox: "24 KB (8 Páginas)",
    destinatario: "Ciudadanía general, veedurías y líderes comunitarios",
  },
  {
    id: "presentacion-diagnostico",
    titulo: "Presentación de Diagnóstico Barrial",
    subtitulo: "10 Diapositivas Ejecutivas",
    descripcion:
      "Láminas visuales de alto impacto para talleres comunitarios, presidentes de JAC y asambleas con cifras oficiales verificadas, tarjetas y flujos de proceso.",
    badge: "Taller Comunitario",
    archivoUrl: "/docs/PRESENTACION_DIAGNOSTICO_SEGURIDAD_HUMANA_CARTAGENA.pdf",
    nombreDescarga: "PRESENTACION_DIAGNOSTICO_SEGURIDAD_HUMANA_CARTAGENA.pdf",
    formato: "PDF",
    tamanoAprox: "25 KB (10 Diapositivas)",
    destinatario: "Facilitadores de mesas comunitarias y coordinadores",
  },
  {
    id: "matriz-metas-indicadores",
    titulo: "Matriz de Metas e Indicadores PDD",
    subtitulo: "Ficha de Seguimiento y Auditoría",
    descripcion:
      "Herramienta técnica para auditoría ciudadana, indicadores distritales de seguimiento y verificación de compromisos de inversión territorial.",
    badge: "Técnico y Distrital",
    archivoUrl: "/docs/MATRIZ_METAS_E_INDICADORES_SEGURIDAD_HUMANA_2026.pdf",
    nombreDescarga: "MATRIZ_METAS_E_INDICADORES_SEGURIDAD_HUMANA_2026.pdf",
    formato: "PDF",
    tamanoAprox: "2.9 KB",
    destinatario: "Funcionarios distritales, concejales y veedores",
  },
  {
    id: "guia-facilitadores",
    titulo: "Guía Metodológica para Facilitadores",
    subtitulo: "Manual de Dinámicas Participativas",
    descripcion:
      "Protocolo paso a paso para liderar deliberaciones sin revictimización, sistematizar aportes en papelógrafo y registrar actas oficiales.",
    badge: "Metodología",
    archivoUrl: "/docs/GUIA_FACILITADORES_MESAS_COMUNITARIAS.pdf",
    nombreDescarga: "GUIA_FACILITADORES_MESAS_COMUNITARIAS.pdf",
    formato: "PDF",
    tamanoAprox: "2.9 KB",
    destinatario: "Equipos facilitadores distritales y moderadores de mesa",
  },
];

export const PREGUNTAS_ABC: PreguntaFrecuente[] = [
  {
    id: "faq-1",
    numero: "01",
    categoria: "doctrina",
    categoriaLabel: "Doctrina y Fundamentos",
    pregunta: "1. ¿Qué es exactamente la Seguridad Humana Integral?",
    respuesta:
      "Es el paradigma de desarrollo y gobernanza adoptado por las Naciones Unidas (Resolución 66/290 y PNUD 1994) que trasciende el concepto militar tradicional. Pone a la persona y a su comunidad en el centro, asegurando que la verdadera seguridad se alcanza cuando las familias viven libres de violencia, con acceso a salud, alimentos, empleo digno, ambiente sano y participación vinculante.",
    destacado: "Pone la vida y la dignidad en el centro: seguridad no es solo patrullaje, sino vivir sin hambre, sin miedo y con salud.",
    etiquetas: ["Resolución ONU 66/290", "Derechos Humanos", "Desarrollo Integral"],
    enlaceSugerido: { texto: "Descargar ABC en PDF", href: "/docs/ABC_SEGURIDAD_HUMANA_INTEGRAL_CARTAGENA.pdf" },
  },
  {
    id: "faq-2",
    numero: "02",
    categoria: "doctrina",
    categoriaLabel: "Doctrina y Fundamentos",
    pregunta: "2. ¿En qué se diferencia de la seguridad ciudadana tradicional?",
    respuesta:
      "La seguridad tradicional se enfoca de manera casi exclusiva en el control de orden público, patrullaje policial y castigo del delito. La Seguridad Humana Integral reconoce que patrullar no basta si persiste el hambre, la falta de alcantarillado, la deserción escolar o el crédito usurero 'gota a gota'. Integra 7 dimensiones que actúan de manera preventiva y simultánea.",
    destacado: "Ataca las causas estructurales del delito antes de que la violencia ocurra.",
    etiquetas: ["Prevención Temprana", "Orden Público", "Causas Estructurales"],
  },
  {
    id: "faq-3",
    numero: "03",
    categoria: "territorio",
    categoriaLabel: "Territorio y Datos",
    pregunta: "3. ¿Por qué es crucial para Cartagena de Indias?",
    respuesta:
      "Cartagena presenta profundas paradojas: junto al auge turístico e industrial conviven cinturones de extrema pobreza, riesgo de inundaciones por cambio climático e inequidad histórica. La Seguridad Humana permite que el presupuesto distrital llegue a los barrios más necesitados con metas medibles e inversión que salva vidas.",
    destacado: "Supera la brecha histórica entre el centro turístico amurallado y las 3 localidades populares.",
    etiquetas: ["Cartagena de Indias", "Localidades 1, 2 y 3", "Equidad Territorial"],
    enlaceSugerido: { texto: "Explorar Geovisor Barrial", href: "/geovisor" },
  },
  {
    id: "faq-4",
    numero: "04",
    categoria: "doctrina",
    categoriaLabel: "Doctrina y Fundamentos",
    pregunta: "4. ¿Cuáles son los 3 pilares que fundamentan este enfoque?",
    respuesta:
      "Los tres pilares universales proclamados por la ONU son: 1) Libertad frente al miedo (erradicación de la violencia, el delito y las armas); 2) Libertad frente a la necesidad (garantía de salud, nutrición, trabajo e ingresos dignos); y 3) Libertad para vivir en dignidad (respeto pleno a los derechos humanos, justicia pronta y voz ciudadana).",
    destacado: "Miedo, Necesidad y Dignidad: tres libertades inseparables reconocidas por la ONU.",
    etiquetas: ["3 Pilares ONU", "Libertad de Temor", "Libertad de Necesidad", "Dignidad"],
  },
  {
    id: "faq-5",
    numero: "05",
    categoria: "doctrina",
    categoriaLabel: "Doctrina y Fundamentos",
    pregunta: "5. ¿Cómo se relacionan las 7 dimensiones entre sí?",
    respuesta:
      "Son interdependientes. Una familia sin seguridad económica recurre al gota a gota (comprometiendo su seguridad personal); un barrio sin drenajes pluviales sufre inundaciones (seguridad ambiental) que colapsan la salud comunitaria (seguridad en salud). No puede garantizarse una dimensión descuidando las demás.",
    destacado: "Ninguna dimensión se sostiene sola: la precariedad de un canal pluvial afecta la salud y la convivencia del barrio.",
    etiquetas: ["7 Dimensiones", "Interdependencia", "Acción Integral"],
  },
  {
    id: "faq-6",
    numero: "06",
    categoria: "participacion",
    categoriaLabel: "Participación y JAC",
    pregunta: "6. ¿Cómo puede una persona o Junta de Acción Comunal participar activamente?",
    respuesta:
      "Cualquier ciudadano, JAC, colectivo juvenil o gremio puede ingresar a POLIS (vía web o Modo Barrio de bajo consumo de datos), ubicar su sector geográfico y radicar propuestas con código único de radicado. También puede acudir a las Mesas de Trabajo territoriales donde se construyen las prioridades de inversión distrital.",
    destacado: "Acceso abierto para todos los 205 barrios y corregimientos del POT, sin intermediarios políticos.",
    etiquetas: ["JAC", "Modo Barrio", "Radicación Ciudadana", "POT"],
    enlaceSugerido: { texto: "Radicar en Modo Barrio", href: "/barrio" },
  },
  {
    id: "faq-7",
    numero: "07",
    categoria: "garantias",
    categoriaLabel: "Garantías y Presupuesto",
    pregunta: "7. ¿Qué garantía existe de que las propuestas no queden en promesas vacías?",
    respuesta:
      "POLIS opera bajo el amparo de la Ley 1757 de 2015 y la Sentencia C-150 de 2015 de la Corte Constitucional. Cada aporte recibe fe pública mediante un radicado inmutable (POL-2026-XXXX) con código QR y notificación obligatoria a la administración para emisión de concepto técnico vinculante.",
    destacado: "Blindaje constitucional C-150/15: la Alcaldía está obligada por ley a responder con concepto motivado.",
    etiquetas: ["Sentencia C-150/2015", "Fe Pública", "Respuesta Vinculante"],
    enlaceSugerido: { texto: "Conocer Marco Legal C-150", href: "/marco-legal" },
  },
  {
    id: "faq-8",
    numero: "08",
    categoria: "participacion",
    categoriaLabel: "Participación y JAC",
    pregunta: "8. ¿Qué es POLIS Herald y cómo certifica la fe pública?",
    respuesta:
      "POLIS Herald es el componente de notificaciones oficiales, fe pública y auditoría de POLIS. Envía constancias formales al ciudadano y a las secretarías distritales, genera códigos QR de verificación pública instantánea y registra los eventos en una bitácora auditable inviolable.",
    destacado: "Trazabilidad forense digital: constancias firmadas con QR que impiden el extravío burocrático.",
    etiquetas: ["POLIS Herald", "Código QR", "Trazabilidad Forense", "Fe Pública"],
    enlaceSugerido: { texto: "Consultar Trazabilidad", href: "/trazabilidad" },
  },
  {
    id: "faq-9",
    numero: "09",
    categoria: "garantias",
    categoriaLabel: "Garantías y Presupuesto",
    pregunta: "9. ¿Cómo se financian las iniciativas de Seguridad Humana en el Distrito?",
    respuesta:
      "Mediante una articulación de fuentes públicas: recursos propios distritales, Sistema General de Participaciones (SGP), Fondo Territorial de Seguridad (FONSET), regalías y convenios con el Gobierno Nacional y cooperación internacional, todo registrado en el Banco Distrital de Alternativas.",
    destacado: "Recursos asegurados en FONSET, SGP y regalías, no partidas improvisadas.",
    etiquetas: ["FONSET", "SGP", "Regalías", "Presupuesto Distrital"],
  },
  {
    id: "faq-10",
    numero: "10",
    categoria: "territorio",
    categoriaLabel: "Territorio y Datos",
    pregunta: "10. ¿Dónde puedo consultar los datos abiertos e indicadores de avance?",
    respuesta:
      "En el Geovisor POLIS (/geovisor) y en la sección de Trazabilidad (/trazabilidad), donde se visualizan en tiempo real los mapas de calor territorial, los compromisos de las 35 mesas comunitarias y la ejecución física de las metas del Plan Decenal 2026–2036.",
    destacado: "Transparencia absoluta en mapas de calor y semáforos de metas de las 35 mesas comunitarias.",
    etiquetas: ["Datos Abiertos", "Geovisor", "Tablero de Control", "Rendición de Cuentas"],
    enlaceSugerido: { texto: "Ver Alertas en Geovisor", href: "/geovisor" },
  },
];
