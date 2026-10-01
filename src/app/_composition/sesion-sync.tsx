"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError, setBearerToken, setUnauthorizedHandler } from "@/core/http/api-client";
import { usePanelStore } from "@/core/panels/panel-store";
import { useSesionStore } from "@/features/sesion/state/session-store";
import { identidadApi } from "@/features/sesion/services/identidad-api";

export function SesionSync() {
  const cache = useQueryClient();
  useEffect(() => {
    // Retirar datos de la demostración anterior; nunca restaurar privilegios simulados.
    localStorage.removeItem("polis-sesion-v1"); localStorage.removeItem("polis_sesion_token");
    const fragmento = new URLSearchParams(window.location.hash.slice(1));
    const accion = fragmento.get("accion"); const token = fragmento.get("token");
    if ((accion === "recuperar" || accion === "verificar") && token) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      usePanelStore.getState().openPanel("sesion", {accion, token});
    }
    const limpiar = () => {useSesionStore.getState().limpiarSesion(); cache.clear();};
    setUnauthorizedHandler(limpiar);
    const revisar = async () => {
      const sesion = useSesionStore.getState().sesion;
      if (!sesion?.token) return;
      if (!sesion.expiraEn || Date.parse(sesion.expiraEn) <= Date.now()) {limpiar(); return;}
      setBearerToken(sesion.token);
      if (sesion.usuarioId) {
        const tokenInicial = sesion.token;
        try {
          const perfil = await identidadApi.perfil();
          if (useSesionStore.getState().sesion?.token === tokenInicial)
            useSesionStore.getState().actualizarPerfil(perfil);
        } catch (e) {if (e instanceof ApiError && e.status === 401
            && useSesionStore.getState().sesion?.token === tokenInicial) limpiar();}
      }
    };
    void revisar();
    const reloj = setInterval(() => void revisar(), 60_000);
    window.addEventListener("focus", revisar);
    return () => {clearInterval(reloj); window.removeEventListener("focus", revisar); setUnauthorizedHandler(null);};
  }, [cache]);
  return null;
}
