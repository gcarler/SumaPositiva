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
    "mesas",
    "geovisor",
    "contenido",
  ],
  facilitador_mesa: ["dashboard", "mesas", "formularios"],
  auditor_forense: [
    "dashboard",
    "formularios",
    "mesas",
    "geovisor",
    "contenido",
    "configuracion",
  ],
  administrador_identidades: MODULOS.map((m) => m.id),
};
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
  return sesionActiva(sesion) && !!ACCESO[sesion?.rol ?? ""];
}
export function modulosPermitidos(sesion: Sesion | null) {
  return puedeEntrar(sesion)
    ? MODULOS.filter((m) => ACCESO[sesion?.rol ?? ""].includes(m.id))
    : [];
}
export function puedeVer(
  sesion: Sesion | null,
  modulo: ModuloPlataforma,
): boolean {
  return modulosPermitidos(sesion).some((m) => m.id === modulo);
}
export function moduloDeRuta(ruta: string): ModuloPlataforma | undefined {
  return MODULOS.find((m) => m.ruta === ruta.replace(/\/$/, ""))?.id;
}
export function puedeEditar(
  sesion: Sesion | null,
  modulo: ModuloPlataforma,
): boolean {
  if (!puedeVer(sesion, modulo) || sesion?.rol === "auditor_forense") return false;
  if (modulo === "formularios" && sesion?.rol === "facilitador_mesa") return false;
  if (modulo === "configuracion") return sesion?.rol === "administrador_identidades";
  if (modulo === "usuarios") return sesion?.rol === "administrador_identidades";
  // Para mesas, formularios y contenido: basar en rol, no en permisos del backend
  const rolesPorModulo: Partial<Record<ModuloPlataforma, string[]>> = {
    mesas: ["autoridad_distrital", "facilitador_mesa", "administrador_identidades"],
    formularios: ["autoridad_distrital", "administrador_identidades"],
    contenido: ["autoridad_distrital", "administrador_identidades"],
  };
  return !!rolesPorModulo[modulo]?.includes(sesion?.rol ?? "");
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
    case "territorio":
      return puedeVer(sesion, "geovisor");
    case "fases-control":
      return (
        puedeEditar(sesion, "contenido") || puedeEditar(sesion, "configuracion")
      );
    case "auditoria-consola":
      return (
        puedeEntrar(sesion) &&
        !!sesion?.permisos?.includes("auditoria:leer") &&
        sesion.rol !== "auditor_forense"
      );
    default:
      return false;
  }
}
