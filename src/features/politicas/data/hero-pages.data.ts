/**
 * Catálogo Temático Centralizado de Heros Territoriales Públicos
 * POLIS — Política Pública de Seguridad Humana Integral (Cartagena de Indias, 2026–2036)
 *
 * Tarea: [HERO-PAGES-01]
 * Define la configuración visual, narrativa, procedencia territorial y altura
 * para los espacios públicos del sistema (Home, Modo Barrio, Geovisor, Fases, Rendición).
 */

export type HeroAltura = "fullscreen" | "compact" | "ultracompact";

export interface HeroPageAction {
  label: string;
  href?: string;
  onClickAction?: string;
}

export interface HeroPageConfig {
  id: string;
  titulo: string;
  subtitulo: string;
  enfoque: string;
  imagenFondo: string;
  ubicacionReal: string;
  altura: HeroAltura;
  badgeTexto: string;
  accionPrimaria?: HeroPageAction;
}

/**
 * 5 Diapositivas Territoriales Inmersivas para el Carrusel de la Portada Principal (/)
 * Cada diapositiva representa un pilar cívico y un hito geográfico real de Cartagena.
 */
export const HERO_HOME_SLIDES: HeroPageConfig[] = [
  {
    id: "asamblea-claustro",
    titulo: "Cabildo Abierto y Foro Ciudadano",
    subtitulo:
      "Deliberación comunitaria vinculante y construcción colectiva de la seguridad humana en Cartagena de Indias.",
    enfoque: "Cabildo Masivo Territorial",
    imagenFondo: "/images/hero/hero-asamblea-claustro.webp",
    ubicacionReal: "Claustro de la Merced — Centro Histórico",
    altura: "fullscreen",
    badgeTexto: "Participación Ciudadana Masiva",
    accionPrimaria: {
      label: "Explorar Diagnóstico",
      href: "/fases",
    },
  },
  {
    id: "dialogo-comunitario",
    titulo: "Diálogo Social y Escucha Barrial",
    subtitulo:
      "Encuentros cara a cara en los sectores populares para concertar compromisos de bienestar y seguridad integral.",
    enfoque: "Diálogo Barrial Comunitario",
    imagenFondo: "/images/hero/hero-dialogo-comunitario.webp",
    ubicacionReal: "Sector El Pozón — Localidad 2 (De la Virgen y Turística)",
    altura: "fullscreen",
    badgeTexto: "Presencia Barrial Directa",
    accionPrimaria: {
      label: "Modo Barrio",
      href: "/barrio",
    },
  },
  {
    id: "enfoque-diferencial",
    titulo: "Enfoque Diferencial, Género y Juventud",
    subtitulo:
      "Garantía de derechos, equidad de género sustantiva y liderazgo transformador de las nuevas generaciones cartageneras.",
    enfoque: "Mujeres, Jóvenes y Diversidad",
    imagenFondo: "/images/hero/hero-enfoque-diferencial.webp",
    ubicacionReal: "Casa de Justicia Chiquinquirá — Localidad 2",
    altura: "fullscreen",
    badgeTexto: "Enfoque Diferencial e Inclusivo",
    accionPrimaria: {
      label: "Ver Compromisos",
      href: "/alternativas",
    },
  },
  {
    id: "marco-logico",
    titulo: "Metodología y Proyectos Comunitarios",
    subtitulo:
      "Formulación técnica rigurosa con marco lógico, banco de iniciativas e impacto territorial verificable.",
    enfoque: "Proyectos Comunitarios y Marco Lógico",
    imagenFondo: "/images/hero/hero-marco-logico.webp",
    ubicacionReal: "Centro Comunitario Nelson Mandela — Localidad 3 (Industrial y de la Bahía)",
    altura: "fullscreen",
    badgeTexto: "Formulación Técnica Participativa",
    accionPrimaria: {
      label: "Consultar Banco",
      href: "/fases",
    },
  },
  {
    id: "mesa-deliberativa",
    titulo: "Mesa de Concertación y Transparencia",
    subtitulo:
      "Veeduría ciudadana activa, rendición de cuentas pública y trazabilidad institucional inalterable.",
    enfoque: "Transparencia y Control Social",
    imagenFondo: "/images/hero/hero-mesa-deliberativa.webp",
    ubicacionReal: "Palacio de la Proclamación — Plaza de Bolívar",
    altura: "fullscreen",
    badgeTexto: "Transparencia y Fe Pública",
    accionPrimaria: {
      label: "Rendición de Cuentas",
      href: "/plataforma/rendicion",
    },
  },
];

/**
 * Catálogo de Heros por Página Pública del Sistema
 */
export const HERO_PAGES_CONFIG: Record<string, HeroPageConfig> = {
  home: HERO_HOME_SLIDES[0],
  barrio: {
    id: "barrio",
    titulo: "Modo Barrio Popular y Participativo",
    subtitulo:
      "Registro directo en calle, reporte de necesidades y acuerdos prioritarios desde el corazón de las comunidades cartageneras.",
    enfoque: "Seguridad Humana Territorial en Comunidades",
    imagenFondo: "/images/hero/hero-dialogo-comunitario.webp",
    ubicacionReal: "Sector El Pozón — Localidad 2 (De la Virgen y Turística)",
    altura: "compact",
    badgeTexto: "Participación Comunitaria en Calle",
    accionPrimaria: {
      label: "Registrar Aporte Barrial",
      onClickAction: "abrir-formulario-barrio",
    },
  },
  geovisor: {
    id: "geovisor",
    titulo: "Geovisor Cartográfico y Cobertura Territorial",
    subtitulo:
      "Capas geoespaciales, isócronas de accesibilidad y focalización de seguridad humana por sectores y manzanas censales.",
    enfoque: "Inteligencia Geográfica y Cobertura Distrital",
    imagenFondo: "/images/hero/hero-asamblea-claustro.webp",
    ubicacionReal: "Distrito de Cartagena de Indias — Cobertura Total",
    altura: "ultracompact",
    badgeTexto: "Georreferenciación SIG y Ruteo",
    accionPrimaria: {
      label: "Ver Capas Críticas",
      onClickAction: "activar-capas-criticas",
    },
  },
  fases: {
    id: "fases",
    titulo: "Diagnóstico y Formulación Participativa",
    subtitulo:
      "Ruta metodológica de 5 etapas para la consolidación participativa de la política pública distrital 2026-2036.",
    enfoque: "Ruta Metodológica y Fases POLIS",
    imagenFondo: "/images/hero/hero-marco-logico.webp",
    ubicacionReal: "Claustro de la Merced — Centro Histórico",
    altura: "compact",
    badgeTexto: "Metodología de 5 Fases Oficiales",
    accionPrimaria: {
      label: "Explorar Etapa Actual",
      href: "#etapa-activa",
    },
  },
  rendicion: {
    id: "rendicion",
    titulo: "Veeduría y Control Social Ciudadano",
    subtitulo:
      "Mecanismo de fiscalización cívica, trazabilidad de compromisos e informes periciales con fe pública.",
    enfoque: "Auditoría Social y Fe Pública",
    imagenFondo: "/images/hero/hero-mesa-deliberativa.webp",
    ubicacionReal: "Palacio de la Proclamación — Plaza de Bolívar",
    altura: "compact",
    badgeTexto: "Transparencia y Control Cívico",
    accionPrimaria: {
      label: "Descargar Acta Formal",
      href: "/plataforma/fe-publica",
    },
  },
  explorar: {
    id: "explorar",
    titulo: "Líneas Estratégicas y Gobernanza Distrital",
    subtitulo:
      "Explora las fases y líneas de la Política Pública de Cartagena, o visualiza cómo las 27 dependencias y sus presupuestos atienden las 7 dimensiones de seguridad humana.",
    enfoque: "Arquitectura Estratégica y Gobernanza Distrital",
    imagenFondo: "/images/hero/hero-marco-logico.webp",
    ubicacionReal: "Centro Comunitario Nelson Mandela — Localidad 3 (Industrial y de la Bahía)",
    altura: "compact",
    badgeTexto: "Líneas Estratégicas POLIS",
    accionPrimaria: {
      label: "Consultar Líneas",
      href: "#lineas",
    },
  },
  mesas: {
    id: "mesas",
    titulo: "Mesas de Diálogo y Concertación Territorial",
    subtitulo:
      "Espacios de concertación y deliberación comunitaria para construir acuerdos y documentar árboles de problemas y soluciones (Ley Estatutaria 1757 de 2015).",
    enfoque: "33 Mesas de Diálogo Territorial",
    imagenFondo: "/images/hero/hero-asamblea-claustro.webp",
    ubicacionReal: "Claustro de la Merced — Centro Histórico",
    altura: "compact",
    badgeTexto: "33 Mesas Distritales",
    accionPrimaria: {
      label: "Ver en Geovisor",
      href: "/geovisor",
    },
  },
  noticias: {
    id: "noticias",
    titulo: "Noticias y Comunicados Oficiales",
    subtitulo:
      "Actualidad institucional, avances de formulación, memorias de asambleas y convocatorias distritales de seguridad humana integral.",
    enfoque: "Actualidad Institucional y Convocatorias",
    imagenFondo: "/images/hero/hero-mesa-deliberativa.webp",
    ubicacionReal: "Palacio de la Proclamación — Plaza de Bolívar",
    altura: "ultracompact",
    badgeTexto: "Actualidad Institucional",
  },
  testimonios: {
    id: "testimonios",
    titulo: "Voces Ciudadanas y Memoria Social",
    subtitulo:
      "Relatos vivos de quienes participan en la construcción colectiva de la seguridad humana desde las tres localidades y la zona insular.",
    enfoque: "Memoria Social y Testimonios de Barrio",
    imagenFondo: "/images/hero/hero-dialogo-comunitario.webp",
    ubicacionReal: "Sector El Pozón — Localidad 2 (De la Virgen y Turística)",
    altura: "compact",
    badgeTexto: "Voces Ciudadanas",
  },
};

/**
 * Obtiene la configuración de Hero correspondiente a una clave de página.
 * Si no coincide, retorna la configuración por defecto (Home).
 */
export function obtenerHeroPageConfig(pageKey: string): HeroPageConfig {
  const normalizado = pageKey.replace(/^\//, "").toLowerCase().split("/")[0] || "home";
  return HERO_PAGES_CONFIG[normalizado] ?? HERO_PAGES_CONFIG[pageKey] ?? HERO_PAGES_CONFIG.home;
}

export const obtenerHeroConfig = obtenerHeroPageConfig;

/**
 * Retorna la lista completa de diapositivas para el carrusel de Home.
 */
export function obtenerHeroHomeSlides(): HeroPageConfig[] {
  return HERO_HOME_SLIDES;
}

/**
 * Obtiene una diapositiva específica por índice o ID.
 */
export function obtenerHeroSlide(idOrIndex: string | number): HeroPageConfig {
  if (typeof idOrIndex === "number") {
    const idx = Math.abs(idOrIndex) % HERO_HOME_SLIDES.length;
    return HERO_HOME_SLIDES[idx];
  }
  return HERO_HOME_SLIDES.find((s) => s.id === idOrIndex) ?? HERO_HOME_SLIDES[0];
}
