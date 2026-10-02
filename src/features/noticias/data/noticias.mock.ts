import type { Noticia } from "../models/noticia";

export const NOTICIAS_MOCK: Noticia[] = [
  {
    id: "noticia-1",
    slug: "cartagena-inicia-seguridad-humana-33-mesas",
    titulo: "Cartagena inicia su proceso de Seguridad Humana Integral con 33 mesas de trabajo",
    resumen:
      "La Alcaldía Mayor de Cartagena, en coordinación con las comunidades y la academia, despliega la agenda territorial para construir la política pública 2026–2036.",
    imagenPortada:
      "https://images.unsplash.com/photo-1583531352515-8884af319dc1?auto=format&fit=crop&w=1200&q=80",
    categoria: "avance_politica",
    autor: "Secretaría de Planeación Distrital",
    publicadaEn: "2026-03-15T08:00:00Z",
    destacada: true,
    ordenPrioridad: 1,
    estado: "publicada",
    videoUrl: "https://www.youtube.com/watch?v=ScMzIvxBSi4",
    galeria: [
      "https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80",
    ],
    etiquetas: ["politica-publica", "mesas-de-trabajo", "cartagena-2026", "participacion"],
    contenido: `## Un nuevo paradigma de seguridad para el Distrito

El Distrito Turístico y Cultural de Cartagena de Indias dio inicio formal al ciclo de deliberación participativa para la formulación de la **Política Pública de Seguridad Humana Integral 2026–2036**. 

A través de un despliegue sin precedentes en las tres localidades urbanas y la zona rural-insular, se llevarán a cabo **33 mesas de trabajo sectoriales, territoriales y poblacionales**, garantizando la vinculación directa de líderes comunitarios, gremios, academia, jóvenes y organizaciones sociales.

### Principales ejes del proceso

1. **Territorialización de las 7 Dimensiones ONU:** Seguridad económica, alimentaria, en salud, ambiental, personal, comunitaria y política.
2. **Cumplimiento estricto de la Sentencia C-150 de 2015:** Cada propuesta ciudadana registrada recibirá devolución motivada y trazabilidad pública.
3. **Metodología DNP & CONPES:** Los árboles de problemas y de soluciones construidos en las submesas alimentarán directamente la matriz de proyectos distritales.

> *"La seguridad de Cartagena no se construye con medidas aisladas; requiere atender las raíces del hambre, la exclusión y el riesgo climático de la mano con la gente."* — Equipo de Facilitación POLIS.

Las conclusiones de cada sesión se certificarán mediante actas digitales abiertas para consulta pública a través de esta plataforma.`,
  },
  {
    id: "noticia-2",
    slug: "primera-mesa-centro-historico",
    titulo: "Primera Mesa Territorial en el Centro Histórico — 120 participantes",
    resumen:
      "Vecinos de Getsemaní, San Diego y San Pedro articularon prioridades sobre turismo sostenible, convivencia y control del espacio público.",
    imagenPortada:
      "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80",
    categoria: "mesa_realizada",
    autor: "Equipo de Facilitación POLIS",
    publicadaEn: "2026-03-18T14:30:00Z",
    destacada: false,
    ordenPrioridad: 2,
    estado: "publicada",
    galeria: [
      "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80",
    ],
    etiquetas: ["localidad-1", "centro-historico", "participacion", "seguridad-ciudadana"],
    contenido: `## Convivencia barrial y protección del patrimonio residencial

En el Claustro de la Merced se reunieron más de 120 habitantes de la Localidad 1 (Histórica y del Caribe Norte). La sesión plenaria y sus cuatro submesas temáticas abordaron los desafíos derivados de la gentrificación, el ruido descontrolado y la seguridad nocturna.

### Acuerdos iniciales alcanzados

- **Submesa 1 (Convivencia y Ruido):** Propuesta de zonificación acústica concertada con comerciantes gastronómicos y bares.
- **Submesa 2 (Protección del Residente):** Medidas fiscales para aliviar la presión del impuesto predial sobre familias tradicionales de Getsemaní y San Diego.
- **Submesa 3 (Espacio Público):** Corredores seguros iluminados y patrullaje preventivo de proximidad comunitaria.

Los árboles de problemas y soluciones de esta sesión ya están disponibles en el módulo de Mesas de Trabajo para revisión de todos los ciudadanos.`,
  },
  {
    id: "noticia-3",
    slug: "decreto-037-2026-seguridad-humana",
    titulo: "Decreto 037 de 2026: Cartagena formaliza su hoja de ruta de Seguridad Humana",
    resumen:
      "El acto administrativo vincula las metas del Plan de Desarrollo Distrital con los estándares de derechos humanos y sostenibilidad del sistema de Naciones Unidas.",
    imagenPortada:
      "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80",
    categoria: "acuerdo_distrital",
    autor: "Alcaldía Mayor de Cartagena",
    publicadaEn: "2026-03-20T10:00:00Z",
    destacada: false,
    ordenPrioridad: 3,
    estado: "publicada",
    etiquetas: ["decreto", "marco-juridico", "c-150-2015", "planeacion-distrital"],
    contenido: `## Respaldo jurídico e institucional a 10 años

Con la expedición del **Decreto Distrital 037 de 2026**, la administración distrital garantiza que la Política Pública de Seguridad Humana Integral trascienda los periodos de gobierno y se convierta en una política de Estado para Cartagena.

### Aspectos jurídicos destacados

- **Financiación garantizada:** Se establece la afectación preferente de recursos del Fondo de Seguridad Territorial (FONSET) y el Sistema General de Participaciones (SGP).
- **Instancia de veeduría mixta:** Conformación del Consejo Distrital de Seguimiento a la Seguridad Humana, integrado en un 50% por delegados electos en las mesas comunitarias.
- **Inmutabilidad y datos abiertos:** Obligatoriedad de archivar en la plataforma POLIS todas las actas, firmas y modificaciones del documento técnico soporte.`,
  },
  {
    id: "noticia-4",
    slug: "convocatoria-mesas-rurales-insulares",
    titulo: "Convocatoria: Participa en las Mesas de Trabajo Rurales e Insulares",
    resumen:
      "Se abre el cronograma para corregimientos del norte, Bahía de Cartagena e islas del Rosario, con acompañamiento del Ministerio del Interior.",
    imagenPortada:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
    categoria: "convocatoria",
    autor: "Dirección de Asuntos Étnicos y Rurales",
    publicadaEn: "2026-03-22T09:00:00Z",
    destacada: false,
    ordenPrioridad: 4,
    estado: "publicada",
    etiquetas: ["rural-insular", "tierrabomba", "baru", "la-boquilla", "etnico"],
    contenido: `## Las voces del territorio insular son protagonistas

Invitamos a los Consejos Comunitarios de Comunidades Negras, Asociaciones de Pescadores Artesanales, Juntas de Acción Comunal y colectivos de mujeres de la zona corregimental e insular a sumarse al calendario de mesas:

- **La Boquilla:** Jueves 16 de Abril, 8:30 AM — Centro Cultural Comunitario.
- **Tierrabomba (Punta Arenas, Bocachica, Caño del Oro):** Sábado 18 de Abril, 9:00 AM — I.E. Técnica de Bocachica.
- **Barú (Poblado y Ararca):** Miércoles 22 de Abril, 8:30 AM — Casa del Consejo Comunitario.
- **Pasacaballos y Zona Industrial:** Viernes 24 de Abril, 2:00 PM — Polideportivo Central.

Para registrar delegaciones o solicitar transporte comunitario, contactar al equipo en territorio a través de las oficinas de enlace comunal o directamente en esta plataforma.`,
  },
  {
    id: "noticia-5",
    slug: "informe-avance-8-mesas-completadas",
    titulo: "Informe de avance: 8 mesas poblacionales completadas con 640 participantes",
    resumen:
      "El balance preliminar de la fase de diagnóstico participativo evidencia alta movilización de juventudes, mujeres cuidadoras y población con discapacidad.",
    imagenPortada:
      "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80",
    categoria: "informe",
    autor: "Secretaría de Planeación Distrital",
    publicadaEn: "2026-03-25T16:00:00Z",
    destacada: false,
    ordenPrioridad: 5,
    estado: "publicada",
    etiquetas: ["diagnostico", "balance-participacion", "indicadores", "dnp"],
    contenido: `## Consolidación de datos y diagnósticos sectoriales

La Secretaría de Planeación Distrital presentó el primer informe de balance de las mesas poblacionales llevadas a cabo durante las últimas tres semanas.

### Cifras representativas

- **Total de ciudadanos movilizados:** 640 personas registradas en libros y firmas electrónicas.
- **Aportes formulados:** 284 problemas identificados y 192 alternativas de solución registradas en los papelógrafos interactivos.
- **Paridad de género:** 58% de participación femenina, con especial liderazgo en las submesas de seguridad alimentaria y cuidado comunitario.

Este consolidado servirá de insumo para la redacción del primer borrador del diagnóstico PAS (Plan de Acción Sectorial) que se someterá a consulta pública durante mayo de 2026.`,
  },
  {
    id: "noticia-6",
    slug: "baru-tierrabomba-comunidades-etnicas",
    titulo: "Barú y Tierrabomba: comunidades étnicas lideran su propio diagnóstico",
    resumen:
      "Consejos Comunitarios y organizaciones raizales culminaron sus matrices de amenazas ecológicas y seguridad alimentaria insular.",
    imagenPortada:
      "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80",
    categoria: "logro",
    autor: "Consejos Comunitarios de la Bahía e Islas",
    publicadaEn: "2026-03-28T11:00:00Z",
    destacada: true,
    ordenPrioridad: 6,
    estado: "publicada",
    videoUrl: "https://www.youtube.com/watch?v=ScMzIvxBSi4",
    etiquetas: ["comunidades-negras", "consulta-previa", "seguridad-alimentaria", "autogestion"],
    contenido: `## Autonomía territorial y salvaguarda cultural

Las comunidades insulares de la Península de Barú y la Isla de Tierrabomba completaron de forma autónoma el levantamiento de sus árboles de problemas y soluciones, ejerciendo las garantías consagradas en el Convenio 169 de la OIT y la jurisprudencia de la Corte Constitucional (Sentencia SU-123 de 2018).

### Temas priorizados por las asambleas comunitarias

1. **Soberanía y agua potable:** Redes definitivas de acueducto y desalinización para Bocachica, Caño del Oro y Punta Arenas.
2. **Defensa del borde costero:** Control estricto a megaproyectos hoteleros que bloquean el libre acceso a playas y caladeros tradicionales de pesca.
3. **Educación con pertinencia ancestral:** Bachillerato técnico pesquero y marino enfocado en restauración de arrecifes y manglares.

Las autoridades tradicionales entregaron formalmente este pliego al Distrito para su inclusión vinculante en el articulado final de la política pública.`,
  },
];
