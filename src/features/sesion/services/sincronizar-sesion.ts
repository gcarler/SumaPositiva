import { ApiError, setBearerToken } from "@/core/http/api-client";
import { useSesionStore } from "../state/session-store";
import type { Usuario } from "./identidad-api";
import { identidadApi } from "./identidad-api";

/* Deriva la restricción MFA del store a partir del perfil real (212/220):
 * la usan la sincronización de restauración y la cuenta tras activar o
 * desactivar el factor. Resiste el reemplazo de sesión: si un login más
 * nuevo sustituyó el token durante la consulta, abandona sin escribir. */
export async function sincronizarRestriccionMfa(
  perfil: Usuario,
  tokenInicial: string,
) {
  if (useSesionStore.getState().sesion?.token !== tokenInicial) return;
  if (perfil.permisos.length === 0) {
    try {
      const estadoMfa = await identidadApi.mfaEstado();
      if (useSesionStore.getState().sesion?.token !== tokenInicial) return;
      useSesionStore.getState().definirEstadoMfa(estadoMfa);
    } catch (error) {
      if (useSesionStore.getState().sesion?.token !== tokenInicial) return;
      if (error instanceof ApiError && error.status === 401) {
        /* Token revocado mientras se consultaba: nada que acreditar. */
        useSesionStore.getState().limpiarSesion();
        return;
      }
      /* Lectura no disponible (hallazgo 2 de EAF-ID-06): no se transforma
       * en acceso por rol nominal ni se inventa un estado. */
      useSesionStore.getState().definirEstadoMfa("nodisponible");
    }
  } else {
    useSesionStore.getState().definirEstadoMfa(null);
  }
}

/** Validar el perfil remoto antes de habilitar una sesión restaurada. */
export async function sincronizarSesion() {
  const estado = useSesionStore.getState();
  const sesion = estado.sesion;
  if (
    !sesion?.token ||
    !sesion.expiraEn ||
    !(Date.parse(sesion.expiraEn) > Date.now())
  ) {
    estado.limpiarSesion();
    return;
  }
  if (estado.errorSesion)
    useSesionStore.setState({ cargando: true, errorSesion: null });
  setBearerToken(sesion.token);
  if (!sesion.usuarioId) {
    useSesionStore.setState({ cargando: false });
    return;
  }
  const tokenInicial = sesion.token;
  try {
    const perfil = await identidadApi.perfil();
    if (useSesionStore.getState().sesion?.token !== tokenInicial) return;
    if (!perfil.activo) {
      useSesionStore.getState().limpiarSesion();
      return;
    }
    useSesionStore.getState().actualizarPerfil(perfil);
    /* El estado del token de login no basta (recordatorio 186): al restaurar
     * la sesión o tras un cambio de rol el perfil puede traer permisos vacíos
     * conservando el rol interno. Se consulta el estado MFA real para
     * representar la restricción de la sesión limitada (perfil, estado,
     * iniciar/activar MFA y logout). */
    await sincronizarRestriccionMfa(perfil, tokenInicial);
    if (useSesionStore.getState().sesion?.token !== tokenInicial) return;
    useSesionStore.setState({ cargando: false, errorSesion: null });
  } catch (error) {
    if (useSesionStore.getState().sesion?.token !== tokenInicial) return;
    if (error instanceof ApiError && error.status === 401)
      useSesionStore.getState().limpiarSesion();
    else
      useSesionStore.setState({
        cargando: false,
        errorSesion:
          error instanceof Error
            ? error.message
            : "Servicio de identidad no disponible.",
        estadoMfa: null,
      });
  }
}
