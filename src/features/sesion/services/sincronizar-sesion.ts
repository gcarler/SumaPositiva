import { ApiError, setBearerToken } from "@/core/http/api-client";
import { useSesionStore } from "../state/session-store";
import { identidadApi } from "./identidad-api";

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
      });
  }
}
