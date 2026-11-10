import type { Sesion } from "@/features/sesion/models/sesion";
import type { PanelType } from "@/core/panels/panel-store";

export type SeccionSidebarId =
  | "conduccion"
  | "deliberacion_formulacion"
  | "ejecucion_comunicacion"
  | "administracion";

export interface SeccionSidebarInfo {
  id: SeccionSidebarId;
  titulo: string;
  descripcion: string;
}

export const SECCIONES_SIDEBAR: readonly SeccionSidebarInfo[] = [
  {
    id: "conduccion",
    titulo: "Conducción Estratégica",
    descripcion: "Dirección, arquitectura, seguimiento e instrumentos rectores.",
  },
  {
    id: "deliberacion_formulacion",
    titulo: "Deliberación y Formulación",
    descripcion: "Mesas comunitarias, diagnóstico, alternativas e iniciativas.",
  },
  {
    id: "ejecucion_comunicacion",
    titulo: "Ejecución y Comunicación",
    descripcion: "Proyectos, cartografía territorial, difusión y agenda.",
  },
  {
    id: "administracion",
    titulo: "Administración y Gobernanza",
    descripcion: "Directorio de funcionarios, seguridad y configuración del sistema.",
  },
] as const;

export type AccionSubmodulo =
  | { tipo: "subvista"; moduloId: string; valor: string }
  | { tipo: "coleccion"; scope: "proyectos" | "comunicaciones"; vista: "cards" | "table" }
  | { tipo: "ancla"; hash: string }
  | { tipo: "panel"; panelId: PanelType; requiereEdicion?: boolean };

export interface SubmoduloPlataforma {
  id: string;
  etiqueta: string;
  descripcion?: string;
  icono: string;
  accion: AccionSubmodulo;
}

export const MODULOS = [
  {
    id: "dashboard",
    ruta: "/plataforma",
    titulo: "Dashboard",
    descripcion: "Actividad y accesos de tu equipo.",
    seccion: "conduccion" as SeccionSidebarId,
    submodulos: [
      {
        id: "resumen_ejecutivo",
        etiqueta: "Resumen operativo",
        descripcion: "Consolidado de metas y actividad reciente.",
        icono: "BarChart3",
        accion: { tipo: "subvista", moduloId: "dashboard", valor: "resumen_ejecutivo" },
      },
      {
        id: "panel_indicadores",
        etiqueta: "Tablero de indicadores",
        descripcion: "Métricas y cumplimiento de metas distritales.",
        icono: "TrendingUp",
        accion: { tipo: "panel", panelId: "indicador-detalle" as PanelType },
      },
      {
        id: "panel_alertas",
        etiqueta: "Ficha territorial",
        descripcion: "Localización y datos territoriales.",
        icono: "MapPin",
        accion: { tipo: "panel", panelId: "ficha-territorial" as PanelType },
      },
      {
        id: "panel_validacion",
        etiqueta: "Validación MGA",
        descripcion: "Revisión metodológica DNP.",
        icono: "CheckCircle2",
        accion: { tipo: "panel", panelId: "validacion-mga" as PanelType },
      },
    ] as readonly SubmoduloPlataforma[],
  },
  {
    id: "formularios",
    ruta: "/plataforma/formularios",
    titulo: "Formularios",
    descripcion: "Instrumentos, respuestas y resultados.",
    seccion: "deliberacion_formulacion" as SeccionSidebarId,
    submodulos: [
      {
        id: "catalogo_instrumentos",
        etiqueta: "Catálogo de instrumentos",
        descripcion: "Formularios de recolección activos.",
        icono: "ClipboardList",
        accion: { tipo: "subvista", moduloId: "formularios", valor: "catalogo" },
      },
      {
        id: "panel_nuevo_formulario",
        etiqueta: "Constructor FormBuilder",
        descripcion: "Crear nuevo instrumento de captura.",
        icono: "PlusCircle",
        accion: { tipo: "panel", panelId: "formulario-editor" as PanelType, requiereEdicion: true },
      },
      {
        id: "panel_analitica_formularios",
        etiqueta: "Analítica de respuestas",
        descripcion: "Métricas de participación ciudadana.",
        icono: "BarChart",
        accion: { tipo: "panel", panelId: "formulario-analitica" as PanelType },
      },
    ] as readonly SubmoduloPlataforma[],
  },
  {
    id: "geovisor",
    ruta: "/plataforma/geovisor",
    titulo: "Datos",
    descripcion: "Estadísticas, fuentes, análisis y mapas de los territorios.",
    seccion: "ejecucion_comunicacion" as SeccionSidebarId,
    submodulos: [
      {
        id: "consola_cartografica",
        etiqueta: "Cartografía y resumen",
        descripcion: "Visualización geoespacial y resumen analítico.",
        icono: "Map",
        accion: { tipo: "subvista", moduloId: "geovisor", valor: "mapa" },
      },
      {
        id: "explorador_siedco",
        etiqueta: "Explorador y pivot SIEDCO",
        descripcion: "Exploración tabular y pivot analítico.",
        icono: "Table",
        accion: { tipo: "subvista", moduloId: "geovisor", valor: "procesador" },
      },
      {
        id: "gestor_geojson",
        etiqueta: "Gestor de capas GeoJSON",
        descripcion: "Carga y gestión de capas vectoriales.",
        icono: "Layers",
        accion: { tipo: "subvista", moduloId: "geovisor", valor: "gestor" },
      },
      {
        id: "panel_territorio",
        etiqueta: "Ficha territorial",
        descripcion: "Detalle de comunas y corregimientos.",
        icono: "Compass",
        accion: { tipo: "panel", panelId: "territorio" as PanelType },
      },
    ] as readonly SubmoduloPlataforma[],
  },
  {
    id: "mesas",
    ruta: "/plataforma/mesas",
    titulo: "Mesas",
    descripcion: "Agenda, acuerdos y trabajo comunitario.",
    seccion: "deliberacion_formulacion" as SeccionSidebarId,
    submodulos: [
      {
        id: "mesas_todas",
        etiqueta: "Todas las mesas",
        descripcion: "Catálogo general y matriz RevoGrid.",
        icono: "Users2",
        accion: { tipo: "subvista", moduloId: "mesas", valor: "TODAS" },
      },
      {
        id: "mesas_en_curso",
        etiqueta: "Mesas en curso",
        descripcion: "Mesas deliberativas activas hoy.",
        icono: "Clock",
        accion: { tipo: "subvista", moduloId: "mesas", valor: "EN_CURSO" },
      },
      {
        id: "mesas_programadas",
        etiqueta: "Mesas programadas",
        descripcion: "Convocatorias territoriales futuras.",
        icono: "Calendar",
        accion: { tipo: "subvista", moduloId: "mesas", valor: "PROGRAMADA" },
      },
      {
        id: "mesas_cerradas",
        etiqueta: "Mesas cerradas y relatorías",
        descripcion: "Actas y compromisos suscritos.",
        icono: "FileCheck",
        accion: { tipo: "subvista", moduloId: "mesas", valor: "CERRADA" },
      },
      {
        id: "panel_nueva_mesa",
        etiqueta: "Programar nueva mesa",
        descripcion: "Crear convocatoria territorial.",
        icono: "PlusCircle",
        accion: { tipo: "panel", panelId: "mesa-editor" as PanelType, requiereEdicion: true },
      },
      {
        id: "panel_papelografo",
        etiqueta: "Papelógrafo digital",
        descripcion: "Árboles de problemas y soluciones.",
        icono: "Edit3",
        accion: { tipo: "panel", panelId: "papelografo" as PanelType, requiereEdicion: true },
      },
      {
        id: "panel_acta",
        etiqueta: "Relatoría y actas C-150",
        descripcion: "Documentos oficiales con fe pública.",
        icono: "FileText",
        accion: { tipo: "panel", panelId: "mesa-acta" as PanelType },
      },
    ] as readonly SubmoduloPlataforma[],
  },
  {
    id: "usuarios",
    ruta: "/plataforma/usuarios",
    titulo: "Usuarios y Roles",
    descripcion: "Cuentas, roles y permisos del sistema.",
    seccion: "administracion" as SeccionSidebarId,
    submodulos: [
      {
        id: "directorio_cuentas",
        etiqueta: "Directorio de cuentas",
        descripcion: "Gestión de funcionarios y permisos RBAC.",
        icono: "Users",
        accion: { tipo: "subvista", moduloId: "usuarios", valor: "directorio" },
      },
      {
        id: "panel_invitar_usuario",
        etiqueta: "Invitar funcionario",
        descripcion: "Alta administrativa de personal.",
        icono: "UserPlus",
        accion: { tipo: "panel", panelId: "usuario-invitar" as PanelType, requiereEdicion: true },
      },
      {
        id: "panel_auditoria_consola",
        etiqueta: "Consola de auditoría forense",
        descripcion: "Bitácora de eventos y trazabilidad.",
        icono: "ShieldAlert",
        accion: { tipo: "panel", panelId: "auditoria-consola" as PanelType },
      },
    ] as readonly SubmoduloPlataforma[],
  },
  {
    id: "contenido",
    ruta: "/plataforma/contenido",
    titulo: "Contenido",
    descripcion: "Fases, líneas y participación en la política.",
    seccion: "conduccion" as SeccionSidebarId,
    submodulos: [
      {
        id: "arquitectura_7d",
        etiqueta: "Dimensiones y líneas",
        descripcion: "Estructura temática de la política.",
        icono: "Layers",
        accion: { tipo: "subvista", moduloId: "contenido", valor: "arquitectura" },
      },
      {
        id: "fases_metodologia",
        etiqueta: "Fases y metodología",
        descripcion: "Ciclo metodológico Decreto 1070/2021.",
        icono: "Workflow",
        accion: { tipo: "subvista", moduloId: "contenido", valor: "metodologia" },
      },
      {
        id: "control_fases",
        etiqueta: "Control de fases",
        descripcion: "Habilitar etapas de formulación.",
        icono: "Sliders",
        accion: { tipo: "panel", panelId: "fases-control" as PanelType, requiereEdicion: true },
      },
    ] as readonly SubmoduloPlataforma[],
  },
  {
    id: "noticias",
    ruta: "/plataforma/noticias",
    titulo: "Noticias",
    descripcion: "Edición, publicación y organización de noticias institucionales.",
    seccion: "ejecucion_comunicacion" as SeccionSidebarId,
    submodulos: [
      {
        id: "boletines_oficiales",
        etiqueta: "Boletines institucionales",
        descripcion: "Listado de noticias y comunicados.",
        icono: "Newspaper",
        accion: { tipo: "subvista", moduloId: "noticias", valor: "boletines" },
      },
      {
        id: "panel_noticia_editor",
        etiqueta: "Redactar noticia",
        descripcion: "Crear comunicado oficial.",
        icono: "PlusCircle",
        accion: { tipo: "panel", panelId: "noticia-editor" as PanelType, requiereEdicion: true },
      },
    ] as readonly SubmoduloPlataforma[],
  },
  {
    id: "testimonios",
    ruta: "/plataforma/testimonios",
    titulo: "Testimonios",
    descripcion: "Curaduría y moderación de relatos comunitarios.",
    seccion: "deliberacion_formulacion" as SeccionSidebarId,
    submodulos: [
      {
        id: "curaduria_moderacion",
        etiqueta: "Curaduría y moderación",
        descripcion: "Revisión ética y verificación.",
        icono: "MessageSquare",
        accion: { tipo: "subvista", moduloId: "testimonios", valor: "moderacion" },
      },
      {
        id: "panel_galeria_testimonios",
        etiqueta: "Galería de relatos",
        descripcion: "Testimonios aprobados en territorio.",
        icono: "Image",
        accion: { tipo: "panel", panelId: "testimonios-galeria" as PanelType },
      },
      {
        id: "panel_nuevo_testimonio",
        etiqueta: "Registrar relato",
        descripcion: "Captura directa de testimonio.",
        icono: "PlusCircle",
        accion: { tipo: "panel", panelId: "testimonio-editor" as PanelType, requiereEdicion: true },
      },
    ] as readonly SubmoduloPlataforma[],
  },
  {
    id: "fuentes",
    ruta: "/plataforma/fuentes",
    titulo: "Fuentes",
    descripcion: "Monitoreo, radicación y cumplimiento de fuentes primarias y secundarias.",
    seccion: "conduccion" as SeccionSidebarId,
    submodulos: [
      {
        id: "monitoreo_radicacion",
        etiqueta: "Monitoreo y catálogo",
        descripcion: "Catálogo de fuentes oficiales requeridas.",
        icono: "Database",
        accion: { tipo: "subvista", moduloId: "fuentes", valor: "monitoreo" },
      },
      {
        id: "fuentes_validadas",
        etiqueta: "Fuentes radicadas",
        descripcion: "Fuentes recibidas y entregadas formalmente.",
        icono: "FileCheck",
        accion: { tipo: "subvista", moduloId: "fuentes", valor: "radicadas" },
      },
      {
        id: "panel_fuente_nueva",
        etiqueta: "Registrar fuente oficial",
        descripcion: "Ingreso de nueva fuente de información.",
        icono: "PlusCircle",
        accion: { tipo: "panel", panelId: "fuente-editor" as PanelType, requiereEdicion: true },
      },
    ] as readonly SubmoduloPlataforma[],
  },
  {
    id: "actores",
    ruta: "/plataforma/actores",
    titulo: "Actores",
    descripcion: "Mapeo, caracterización socio-territorial y matriz de involucramiento de actores clave.",
    seccion: "deliberacion_formulacion" as SeccionSidebarId,
    submodulos: [
      {
        id: "mapa_involucramiento",
        etiqueta: "Directorio de actores",
        descripcion: "Listado tabular y caracterización socio-territorial.",
        icono: "Users",
        accion: { tipo: "subvista", moduloId: "actores", valor: "mapa" },
      },
      {
        id: "matriz_poder_interes",
        etiqueta: "Matriz 2x2 Poder e Interés",
        descripcion: "Matriz relacional de poder vs interés.",
        icono: "Network",
        accion: { tipo: "subvista", moduloId: "actores", valor: "matriz" },
      },
      {
        id: "panel_nuevo_actor",
        etiqueta: "Registrar actor clave",
        descripcion: "Identificación de líderes y entidades.",
        icono: "UserCheck",
        accion: { tipo: "panel", panelId: "actor-editor" as PanelType, requiereEdicion: true },
      },
    ] as readonly SubmoduloPlataforma[],
  },
  {
    id: "diagnostico",
    ruta: "/plataforma/diagnostico",
    titulo: "Diagnóstico",
    descripcion: "Línea base cuantitativa, brechas por dimensión e indicadores oficiales distritales.",
    seccion: "deliberacion_formulacion" as SeccionSidebarId,
    submodulos: [
      {
        id: "linea_base",
        etiqueta: "Línea base e indicadores",
        descripcion: "Datos cuantitativos y brechas.",
        icono: "BarChart3",
        accion: { tipo: "subvista", moduloId: "diagnostico", valor: "linea_base" },
      },
      {
        id: "arbol_mga",
        etiqueta: "Árbol de problemas MGA",
        descripcion: "Causas, efectos y problemas centrales.",
        icono: "GitFork",
        accion: { tipo: "subvista", moduloId: "diagnostico", valor: "arbol_mga" },
      },
      {
        id: "geodiagnostico",
        etiqueta: "Geodiagnóstico territorial",
        descripcion: "Análisis espacial de necesidades.",
        icono: "MapPin",
        accion: { tipo: "subvista", moduloId: "diagnostico", valor: "geodiagnostico" },
      },
      {
        id: "panel_ficha_nueva",
        etiqueta: "Nueva ficha de indicador",
        descripcion: "Estructurar ficha técnica.",
        icono: "PlusCircle",
        accion: { tipo: "panel", panelId: "ficha-editor" as PanelType, requiereEdicion: true },
      },
    ] as readonly SubmoduloPlataforma[],
  },
  {
    id: "alternativas",
    ruta: "/plataforma/alternativas",
    titulo: "Alternativas",
    descripcion: "Banco de proyectos e iniciativas de solución técnica estructuradas para el Distrito.",
    seccion: "deliberacion_formulacion" as SeccionSidebarId,
    submodulos: [
      {
        id: "banco_mga",
        etiqueta: "Banco de proyectos MGA",
        descripcion: "Alternativas de solución técnica.",
        icono: "FolderGit2",
        accion: { tipo: "subvista", moduloId: "alternativas", valor: "banco_mga" },
      },
      {
        id: "costeo_presupuesto",
        etiqueta: "Costeo y presupuesto",
        descripcion: "Estimación financiera preliminar.",
        icono: "DollarSign",
        accion: { tipo: "subvista", moduloId: "alternativas", valor: "costeo_presupuesto" },
      },
      {
        id: "panel_asignacion_presupuestal",
        etiqueta: "Asignación FONSET",
        descripcion: "Distribución presupuestal.",
        icono: "CreditCard",
        accion: { tipo: "panel", panelId: "asignacion-presupuestal" as PanelType },
      },
      {
        id: "panel_nueva_alternativa",
        etiqueta: "Nueva alternativa técnica",
        descripcion: "Crear iniciativa de solución.",
        icono: "PlusCircle",
        accion: { tipo: "panel", panelId: "alternativa-editor" as PanelType, requiereEdicion: true },
      },
    ] as readonly SubmoduloPlataforma[],
  },
  {
    id: "seguimiento",
    ruta: "/plataforma/seguimiento",
    titulo: "Seguimiento PAS",
    descripcion: "Plan de Acción y Seguimiento de compromisos institucionales y metas cuatrienales.",
    seccion: "conduccion" as SeccionSidebarId,
    submodulos: [
      {
        id: "triada_motores",
        etiqueta: "Tríada de Motores PDD · PA",
        descripcion: "Articulación de planes y compromisos.",
        icono: "Target",
        accion: { tipo: "subvista", moduloId: "seguimiento", valor: "triada_motores" },
      },
      {
        id: "motor_plan_accion",
        etiqueta: "Motor Plan de Acción DNP",
        descripcion: "Seguimiento a metas operativas.",
        icono: "CheckSquare",
        accion: { tipo: "subvista", moduloId: "seguimiento", valor: "motor_plan_accion" },
      },
      {
        id: "banco_conocimiento_dnp",
        etiqueta: "Banco de Conocimiento DNP",
        descripcion: "Orientaciones metodológicas nacionales.",
        icono: "BookOpen",
        accion: { tipo: "subvista", moduloId: "seguimiento", valor: "banco_conocimiento_dnp" },
      },
      {
        id: "matriz_compromisos",
        etiqueta: "Matriz de Compromisos PAS",
        descripcion: "Compromisos suscritos en territorio.",
        icono: "ListChecks",
        accion: { tipo: "subvista", moduloId: "seguimiento", valor: "matriz_compromisos" },
      },
      {
        id: "cadena_valor",
        etiqueta: "Cadena de Valor MGA",
        descripcion: "Insumos, actividades, productos e impactos.",
        icono: "Link2",
        accion: { tipo: "subvista", moduloId: "seguimiento", valor: "cadena_valor" },
      },
      {
        id: "rendicion_cuentas",
        etiqueta: "Rendición de Cuentas C-150",
        descripcion: "Informes públicos de trazabilidad.",
        icono: "Award",
        accion: { tipo: "subvista", moduloId: "seguimiento", valor: "rendicion_cuentas" },
      },
    ] as readonly SubmoduloPlataforma[],
  },
  {
    id: "proyectos",
    ruta: "/plataforma/proyectos",
    titulo: "Proyectos",
    descripcion: "Gestión agregada read-only de comunicaciones, mesas, formularios y Plan de Acción.",
    seccion: "ejecucion_comunicacion" as SeccionSidebarId,
    submodulos: [
      {
        id: "proyectos_tarjetas",
        etiqueta: "Portafolio en tarjetas",
        descripcion: "Vista de mosaico de proyectos.",
        icono: "LayoutGrid",
        accion: { tipo: "coleccion", scope: "proyectos", vista: "cards" },
      },
      {
        id: "proyectos_tabla",
        etiqueta: "Matriz tabular BPIN",
        descripcion: "Vista de tabla con indicadores BPIN.",
        icono: "Table",
        accion: { tipo: "coleccion", scope: "proyectos", vista: "table" },
      },
    ] as readonly SubmoduloPlataforma[],
  },
  {
    id: "comunicaciones",
    ruta: "/plataforma/comunicaciones",
    titulo: "Comunicaciones",
    descripcion: "Plan de acción, cronograma de campo y tareas de la fase de diagnóstico.",
    seccion: "ejecucion_comunicacion" as SeccionSidebarId,
    submodulos: [
      {
        id: "comunicaciones_tarjetas",
        etiqueta: "Tablero de campañas",
        descripcion: "Visualización en tarjetas de difusión.",
        icono: "Radio",
        accion: { tipo: "coleccion", scope: "comunicaciones", vista: "cards" },
      },
      {
        id: "comunicaciones_tabla",
        etiqueta: "Cronograma de campo",
        descripcion: "Planificación temporal de despliegue.",
        icono: "CalendarDays",
        accion: { tipo: "coleccion", scope: "comunicaciones", vista: "table" },
      },
      {
        id: "panel_nueva_tarea_com",
        etiqueta: "Nueva tarea de difusión",
        descripcion: "Programar actividad comunicativa.",
        icono: "PlusCircle",
        accion: { tipo: "panel", panelId: "tarea-comunicacion-editor" as PanelType, requiereEdicion: true },
      },
    ] as readonly SubmoduloPlataforma[],
  },
  {
    id: "configuracion",
    ruta: "/plataforma/configuracion",
    titulo: "Configuración",
    descripcion: "Parámetros y preferencias de trabajo.",
    seccion: "administracion" as SeccionSidebarId,
    submodulos: [
      {
        id: "config_heros",
        etiqueta: "Banners e imagen Hero",
        descripcion: "Gestor visual de portadas públicas.",
        icono: "Image",
        accion: { tipo: "ancla", hash: "#heros" },
      },
      {
        id: "config_geovisor",
        etiqueta: "Parámetros del Geovisor",
        descripcion: "Coordenadas por defecto y zoom inicial.",
        icono: "Compass",
        accion: { tipo: "ancla", hash: "#geovisor-config" },
      },
      {
        id: "config_salud",
        etiqueta: "Salud del sistema y BD",
        descripcion: "Monitoreo de estado operativo y base de datos.",
        icono: "Activity",
        accion: { tipo: "ancla", hash: "#salud" },
      },
    ] as readonly SubmoduloPlataforma[],
  },
] as const;
export type ModuloPlataforma = (typeof MODULOS)[number]["id"];
export const ROLES: Record<string, string> = {
  autoridad_distrital: "Autoridad distrital",
  facilitador_mesa: "Facilitador de mesa",
  gestor_mesas: "Gestor de mesas",
  administrador_mesas: "Administrador de mesas",
  auditor_forense: "Auditor forense",
  administrador_identidades: "Administrador de identidades",
};
const ACCESO: Record<string, readonly ModuloPlataforma[]> = {
  autoridad_distrital: [
    "dashboard",
    "proyectos",
    "formularios",
    "geovisor",
    "mesas",
    "contenido",
    "noticias",
    "comunicaciones",
    "testimonios",
    "fuentes",
    "actores",
    "diagnostico",
    "alternativas",
    "seguimiento",
  ],
  administrador_mesas: [
    "dashboard",
    "mesas",
    "contenido",
    "noticias",
    "comunicaciones",
    "testimonios",
    "actores",
    "diagnostico",
  ],
  facilitador_mesa: [
    "dashboard",
    "proyectos",
    "formularios",
    "mesas",
    "testimonios",
    "actores",
    "comunicaciones",
  ],
  gestor_mesas: [
    "dashboard",
    "mesas",
    "testimonios",
    "actores",
    "comunicaciones",
  ],
  auditor_forense: [
    "dashboard",
    "proyectos",
    "formularios",
    "geovisor",
    "mesas",
    "contenido",
    "noticias",
    "comunicaciones",
    "configuracion",
    "fuentes",
    "actores",
    "diagnostico",
    "alternativas",
    "seguimiento",
  ],
  administrador_identidades: MODULOS.map((m) => m.id),
};

/** Las sesiones de roles personalizados reciben acceso a partir del catálogo API. */
const PERMISOS_POR_MODULO: Record<ModuloPlataforma, readonly string[]> = {
  dashboard: [
    "formularios:leer", "formularios:gestionar", "geovisor:leer",
    "mesas:leer", "mesas:deliberar", "mesas:abrir", "mesas:acuerdos",
    "mesas:fotos:subir", "asistencia:verificar", "usuarios:leer",
    "usuarios:gestionar", "roles:gestionar", "identidad:auditar",
    "contenido:leer", "politicas:gestionar",
    "testimonios:moderar", "configuracion:leer", "configuracion:gestionar",
    "fuentes:leer", "fuentes:gestionar",
    "actores:leer", "actores:gestionar",
    "diagnostico:leer", "diagnostico:gestionar",
    "alternativas:leer", "alternativas:gestionar",
    "seguimiento:leer", "seguimiento:gestionar",
  ],
  formularios: [
    "formularios:leer",
    "formularios:gestionar",
    "instrumentos:gestionar",
  ],
  geovisor: ["geovisor:leer"],
  mesas: [
    "mesas:leer", "mesas:deliberar", "mesas:abrir", "mesas:acuerdos",
    "mesas:fotos:subir", "asistencia:verificar",
  ],
  usuarios: ["usuarios:leer", "usuarios:gestionar", "roles:gestionar", "identidad:auditar"],
  contenido: ["contenido:leer", "politicas:gestionar"],
  noticias: ["contenido:leer", "politicas:gestionar"],
  testimonios: ["testimonios:moderar"],
  fuentes: ["fuentes:leer", "fuentes:gestionar"],
  actores: ["politicas:gestionar"],
  diagnostico: ["diagnostico:leer", "diagnostico:gestionar"],
  alternativas: ["alternativas:leer", "alternativas:gestionar"],
  seguimiento: ["seguimiento:leer", "seguimiento:gestionar"],
  comunicaciones: ["comunicaciones:leer", "comunicaciones:gestionar"],
  proyectos: ["proyectos:leer"],
  configuracion: ["configuracion:leer", "configuracion:gestionar"],
};

const PERMISOS_EDICION: Record<ModuloPlataforma, readonly string[]> = {
  dashboard: [],
  formularios: ["formularios:gestionar", "instrumentos:gestionar"],
  geovisor: [],
  mesas: ["mesas:abrir", "mesas:acuerdos", "mesas:fotos:subir", "asistencia:verificar"],
  usuarios: ["usuarios:gestionar", "roles:gestionar"],
  contenido: ["politicas:gestionar"],
  noticias: ["politicas:gestionar"],
  comunicaciones: ["comunicaciones:gestionar"],
  proyectos: [],
  testimonios: ["testimonios:moderar"],
  fuentes: ["fuentes:gestionar"],
  actores: ["politicas:gestionar"],
  diagnostico: ["diagnostico:gestionar"],
  alternativas: ["alternativas:gestionar"],
  seguimiento: ["seguimiento:gestionar"],
  configuracion: ["configuracion:gestionar"],
};

const PERMISOS_PLATAFORMA = new Set(Object.values(PERMISOS_POR_MODULO).flat());
export function sesionActiva(
  sesion: Sesion | null,
  ahora = Date.now(),
): boolean {
  return (
    !!sesion?.usuarioId &&
    !!sesion.token &&
    sesion.modo !== "anonimo" &&
    !!sesion.expiraEn &&
    Date.parse(sesion.expiraEn) > ahora &&
    sesion.usuario?.activo !== false
  );
}
export function puedeEntrar(sesion: Sesion | null): boolean {
  if (!sesionActiva(sesion)) return false;
  if (sesion?.rol === "ciudadano") return false;
  if (ACCESO[sesion?.rol ?? ""]) return true;
  return (sesion?.permisos ?? []).some((permiso) => PERMISOS_PLATAFORMA.has(permiso));
}
export function modulosPermitidos(sesion: Sesion | null) {
  return puedeEntrar(sesion)
    ? MODULOS.filter((modulo) => puedeVer(sesion, modulo.id))
    : [];
}
export function puedeVer(
  sesion: Sesion | null,
  modulo: ModuloPlataforma,
): boolean {
  if (!puedeEntrar(sesion)) return false;
  const accesosPorRol = ACCESO[sesion?.rol ?? ""];
  if (accesosPorRol) return accesosPorRol.includes(modulo);
  const permisos = new Set(sesion?.permisos ?? []);
  return PERMISOS_POR_MODULO[modulo].some((permiso) => permisos.has(permiso));
}
export function moduloDeRuta(ruta: string): ModuloPlataforma | undefined {
  return MODULOS.find((m) => m.ruta === ruta.replace(/\/$/, ""))?.id;
}
export function puedeEditar(
  sesion: Sesion | null,
  modulo: ModuloPlataforma,
): boolean {
  if (!puedeVer(sesion, modulo)) return false;
  const accesosPorRol = ACCESO[sesion?.rol ?? ""];
  if (accesosPorRol) {
    if (sesion?.rol === "auditor_forense") return false;
    if (modulo === "formularios" && sesion?.rol === "facilitador_mesa") return false;
    if (modulo === "configuracion" || modulo === "usuarios")
      return sesion?.rol === "administrador_identidades";
    const rolesPorModulo: Partial<Record<ModuloPlataforma, string[]>> = {
      mesas: [
        "autoridad_distrital",
        "facilitador_mesa",
        "gestor_mesas",
        "administrador_mesas",
        "administrador_identidades",
      ],
      formularios: ["autoridad_distrital", "administrador_identidades"],
      contenido: ["autoridad_distrital", "administrador_identidades"],
      noticias: ["autoridad_distrital", "administrador_identidades"],
      comunicaciones: ["autoridad_distrital", "administrador_identidades"],
      testimonios: ["autoridad_distrital", "facilitador_mesa", "administrador_identidades"],
      fuentes: ["autoridad_distrital", "administrador_identidades"],
      actores: ["autoridad_distrital", "administrador_identidades"],
      diagnostico: ["autoridad_distrital", "administrador_identidades"],
      alternativas: ["autoridad_distrital", "administrador_identidades"],
      seguimiento: ["autoridad_distrital", "administrador_identidades"],
    };
    return !!rolesPorModulo[modulo]?.includes(sesion?.rol ?? "");
  }
  const permisos = new Set(sesion?.permisos ?? []);
  return PERMISOS_EDICION[modulo].some((permiso) => permisos.has(permiso));
}
export function panelPermitido(
  sesion: Sesion | null,
  panel: PanelType,
): boolean {
  if (panel === "sesion") return true;
  if (!puedeEntrar(sesion)) return false;
  switch (panel) {
    case "formularios":
    case "formulario-analitica":
    case "formulario-preview":
      return puedeVer(sesion, "formularios");
    case "formulario-editor":
      return puedeEditar(sesion, "formularios");
    case "formulario-respuesta":
      return puedeEditar(sesion, "formularios");
    case "mesa":
    case "mesa-acta":
      return puedeVer(sesion, "mesas");
    case "mesa-editor":
    case "agenda-editor":
      return puedeEditar(sesion, "mesas");
    case "papelografo":
      return puedeEditar(sesion, "mesas");
    case "usuarios":
      return puedeVer(sesion, "usuarios");
    case "usuario-invitar":
    case "usuario-editor":
      return puedeEditar(sesion, "usuarios");
    case "usuario-detalle":
      return puedeVer(sesion, "usuarios");
    case "territorio":
      return puedeVer(sesion, "geovisor");
    case "linea-editor":
      return !!sesion?.permisos?.includes("politicas:gestionar") && sesion.rol !== "auditor_forense";
    case "fases-control":
      return puedeEditar(sesion, "contenido");
    case "noticia":
      return puedeVer(sesion, "noticias");
    case "noticia-editor":
      return puedeEditar(sesion, "noticias");
    case "testimonios-galeria":
      return puedeVer(sesion, "testimonios");
    case "testimonio-editor":
    case "testimonio-nuevo":
    case "testimonios-moderacion":
      return puedeEditar(sesion, "testimonios");
    case "auditoria-consola":
      return (
        puedeEntrar(sesion) &&
        !!sesion?.permisos?.includes("auditoria:leer")
      );
    case "fuente-editor":
      return puedeEditar(sesion, "fuentes");
    case "actor-editor":
      return puedeEditar(sesion, "actores");
    case "medicion-editor":
    case "ficha-editor":
      return puedeEditar(sesion, "diagnostico");
    case "ficha-territorial":
    case "validacion-mga":
      // Proyecciones read-only del diagnóstico: lectura de la línea base
      return puedeVer(sesion, "diagnostico");
    case "alternativa-editor":
      return puedeEditar(sesion, "alternativas");
    case "evaluacion-viabilidad":
    case "asignacion-presupuestal":
      return puedeVer(sesion, "alternativas");
    case "compromiso-editor":
    case "indicador-detalle":
    case "devolucion-detalle":
      return puedeVer(sesion, "seguimiento");
    case "tarea-comunicacion-editor":
      return puedeEditar(sesion, "comunicaciones");
    case "ficha-actividad-proyecto":
      // La ficha es una proyección read-only del agregado: basta con el
      // permiso de lectura de proyectos ((editar lo decide el módulo dueño).
      return puedeVer(sesion, "proyectos");
    default:
      return false;
  }
}

export function submodulosPermitidos(
  sesion: Sesion | null,
  modulo: (typeof MODULOS)[number],
): readonly SubmoduloPlataforma[] {
  if (!puedeVer(sesion, modulo.id)) return [];
  return modulo.submodulos.filter((sub) => {
    if (sub.accion.tipo === "panel") {
      if (!panelPermitido(sesion, sub.accion.panelId)) return false;
      if (sub.accion.requiereEdicion && !puedeEditar(sesion, modulo.id)) return false;
    }
    return true;
  });
}
