/**
 * POLIS Herald — Funciones auxiliares puras y formateo para observabilidad
 * Cumple con accesibilidad y representación en español institucional.
 */

const NOMBRES_TIPO_EVENTO: Record<string, string> = {
  radicacion: "Constancia de radicación",
  perfil_actualizado: "Actualización de perfil",
  contrasena_cambiada: "Modificación de contraseña",
  gestion_institucional: "Gestión institucional",
  alerta_pendientes: "Alerta de compromisos pendientes",
  respaldo: "Respaldo popular ciudadano",
  cambio_estado: "Cambio de estado de propuesta",
  bienvenida: "Bienvenida y activación de cuenta",
  recuperacion: "Recuperación de credenciales",
  actividad_apoyo: "Respaldo cívico a actividad",
};

/**
 * Retorna el nombre institucional en español de un tipo de evento Herald.
 * Si el tipo es desconocido, aplica un formateo legible sin romper la interfaz.
 */
export function obtenerNombreTipoEvento(tipo: string): string {
  if (!tipo) return "Evento no especificado";
  const normalizado = tipo.trim().toLowerCase();
  if (NOMBRES_TIPO_EVENTO[normalizado]) {
    return NOMBRES_TIPO_EVENTO[normalizado];
  }
  // Fallback seguro: reemplaza guiones bajos y capitaliza palabras
  return normalizado
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Formatea una duración en segundos a una representación humana legible ("hace 12 min").
 */
export function formatearSegundos(segundos: number | null | undefined): string {
  if (segundos === null || segundos === undefined || isNaN(segundos)) {
    return "Sin espera";
  }
  if (segundos <= 0) {
    return "0 s";
  }
  if (segundos < 60) {
    return `hace ${Math.round(segundos)} s`;
  }
  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) {
    return `hace ${minutos} min`;
  }
  const horas = Math.floor(minutos / 60);
  const minRestantes = minutos % 60;
  if (horas < 24) {
    return minRestantes > 0 ? `hace ${horas} h ${minRestantes} min` : `hace ${horas} h`;
  }
  const dias = Math.floor(horas / 24);
  return `hace ${dias} d`;
}

/**
 * Formatea el tiempo transcurrido desde el último latido del ejecutor en base a timestamp ISO.
 */
export function formatearLatido(
  fechaIso: string | null | undefined,
  ahoraMs = Date.now()
): string {
  if (!fechaIso) return "Sin registro de actividad";
  const fechaMs = Date.parse(fechaIso);
  if (isNaN(fechaMs)) return "Fecha inválida";
  const diffSegundos = Math.max(0, Math.floor((ahoraMs - fechaMs) / 1000));
  if (diffSegundos < 10) return "hace unos instantes";
  return formatearSegundos(diffSegundos);
}

/**
 * Determina si una notificación se encuentra en estado agotado (lista para reintento manual).
 */
export function esNotificacionAgotada(notificacion: {
  estado_envio: string;
  intentos?: number;
}): boolean {
  if (!notificacion) return false;
  const estado = notificacion.estado_envio?.trim().toLowerCase();
  return estado === "fallido" || estado === "error";
}
