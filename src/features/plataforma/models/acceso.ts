import type { Sesion } from "@/features/sesion/models/sesion";
import type { PanelType } from "@/core/panels/panel-store";

export const MODULOS = [
  {
    id: "dashboard",
    ruta: "/plataforma",
    titulo: "Dashboard",
    descripcion: "Actividad y accesos de tu equipo.",
  },
  {
    id: "formularios",
    ruta: "/plataforma/formularios",
    titulo: "Formularios",
    descripcion: "Instrumentos, respuestas y resultados.",
  },
  {
    id: "geovisor",
    ruta: "/plataforma/geovisor",
    titulo: "Geovisor",
    descripcion: "Mapa y datos de los territorios.",
  },
  {
    id: "mesas",
    ruta: "/plataforma/mesas",
    titulo: "Mesas",
    descripcion: "Agenda, acuerdos y trabajo comunitario.",
  },
  {
    id: "usuarios",
    ruta: "/plataforma/usuarios",
    titulo: "Usuarios y Roles",
    descripcion: "Cuentas, roles y permisos del sistema.",
  },
  {
    id: "contenido",
    ruta: "/plataforma/contenido",
    titulo: "Contenido",
    descripcion: "Fases, líneas y participación en la política.",
  },
  {
    id: "noticias",
    ruta: "/plataforma/noticias",
    titulo: "Noticias",
    descripcion: "Edición, publicación y organización de noticias institucionales.",
  },
  {
    id: "testimonios",
    ruta: "/plataforma/testimonios",
    titulo: "Testimonios",
    descripcion: "Curaduría y moderación de relatos comunitarios.",
  },
  {
    id: "fuentes",
    ruta: "/plataforma/fuentes",
    titulo: "Fuentes",
    descripcion: "Monitoreo, radicación y cumplimiento de fuentes primarias y secundarias.",
  },
  {
    id: "actores",
    ruta: "/plataforma/actores",
    titulo: "Actores",
    descripcion: "Mapeo, caracterización socio-territorial y matriz de involucramiento de actores clave.",
  },
  {
    id: "diagnostico",
    ruta: "/plataforma/diagnostico",
    titulo: "Diagnóstico",
    descripcion: "Línea base cuantitativa, brechas por dimensión e indicadores oficiales DNP.",
  },
  {
    id: "alternativas",
    ruta: "/plataforma/alternativas",
    titulo: "Alternativas MGA",
    descripcion: "Banco de proyectos y alternativas de solución formuladas bajo metodología MGA/DNP.",
  },
  {
    id: "seguimiento",
    ruta: "/plataforma/seguimiento",
    titulo: "Seguimiento PAS",
    descripcion: "Plan de Acción y Seguimiento de compromisos institucionales y metas cuatrienales.",
  },
  {
    id: "comunicaciones",
    ruta: "/plataforma/comunicaciones",
    titulo: "Comunicaciones",
    descripcion: "Plan de acción, cronograma de campo y tareas de la fase de diagnóstico.",
  },
  {
    id: "configuracion",
    ruta: "/plataforma/configuracion",
    titulo: "Configuración",
    descripcion: "Parámetros y preferencias de trabajo.",
  },
] as const;
export type ModuloPlataforma = (typeof MODULOS)[number]["id"];
export const ROLES: Record<string, string> = {
  autoridad_distrital: "Autoridad distrital",
  facilitador_mesa: "Facilitador de mesa",
  auditor_forense: "Auditor forense",
  administrador_identidades: "Administrador de identidades",
};
const ACCESO: Record<string, readonly ModuloPlataforma[]> = {
  autoridad_distrital: [
    "dashboard",
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
  facilitador_mesa: [
    "dashboard",
    "formularios",
    "mesas",
    "testimonios",
    "actores",
    "comunicaciones",
  ],
  auditor_forense: [
    "dashboard",
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
  actores: ["actores:leer", "actores:gestionar"],
  diagnostico: ["diagnostico:leer", "diagnostico:gestionar"],
  alternativas: ["alternativas:leer", "alternativas:gestionar"],
  seguimiento: ["seguimiento:leer", "seguimiento:gestionar"],
  comunicaciones: ["comunicaciones:leer", "comunicaciones:gestionar"],
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
  testimonios: ["testimonios:moderar"],
  fuentes: ["fuentes:gestionar"],
  actores: ["actores:gestionar"],
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
      mesas: ["autoridad_distrital", "facilitador_mesa", "administrador_identidades"],
      formularios: ["autoridad_distrital", "administrador_identidades"],
      contenido: ["autoridad_distrital", "administrador_identidades"],
      noticias: ["autoridad_distrital", "administrador_identidades"],
      comunicaciones: ["autoridad_distrital", "administrador_identidades"],
      testimonios: ["autoridad_distrital", "facilitador_mesa", "administrador_identidades"],
      fuentes: ["autoridad_distrital", "administrador_identidades"],
      actores: ["autoridad_distrital", "facilitador_mesa", "administrador_identidades"],
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
      return puedeVer(sesion, "mesas");
    case "mesa-editor":
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
    case "testimonios-moderacion":
      return puedeEditar(sesion, "testimonios");
    case "auditoria-consola":
      return (
        puedeEntrar(sesion) &&
        !!sesion?.permisos?.includes("auditoria:leer") &&
        sesion.rol !== "auditor_forense"
      );
    case "fuente-editor":
      return puedeEditar(sesion, "fuentes");
    case "actor-editor":
      return puedeEditar(sesion, "actores");
    case "medicion-editor":
      return puedeEditar(sesion, "diagnostico");
    case "alternativa-editor":
      return puedeEditar(sesion, "alternativas");
    case "evaluacion-viabilidad":
    case "asignacion-presupuestal":
      return puedeVer(sesion, "alternativas");
    case "compromiso-editor":
    case "indicador-detalle":
    case "devolucion-detalle":
      return puedeVer(sesion, "seguimiento");
    default:
      return false;
  }
}
