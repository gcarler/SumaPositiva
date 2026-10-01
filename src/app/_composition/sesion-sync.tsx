"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { setUnauthorizedHandler } from "@/core/http/api-client";
import { usePanelStore } from "@/core/panels/panel-store";
import { useSesionStore } from "@/features/sesion/state/session-store";
import { sincronizarSesion } from "@/features/sesion/services/sincronizar-sesion";

export function SesionSync() {
  const cache = useQueryClient();
  const ruta = usePathname();
  useEffect(() => {
    // Retirar datos de la demostración anterior; nunca restaurar privilegios simulados.
    localStorage.removeItem("polis-sesion-v1");
    localStorage.removeItem("polis_sesion_token");
    const fragmento = new URLSearchParams(window.location.hash.slice(1));
    const accion = fragmento.get("accion");
    const token = fragmento.get("token");
    if ((accion === "recuperar" || accion === "verificar") && token) {
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
      usePanelStore.getState().openPanel("sesion", { accion, token });
    }
    const limpiar = () => {
      useSesionStore.getState().limpiarSesion();
      cache.clear();
    };
    setUnauthorizedHandler(limpiar);
    const revisar = () => sincronizarSesion();
    void (async () => {
      await useSesionStore.persist.rehydrate();
      await revisar();
    })();
    const unsubscribe = useSesionStore.subscribe((actual, anterior) => {
      if (
        actual.sesion?.usuarioId !== anterior.sesion?.usuarioId ||
        actual.sesion?.rol !== anterior.sesion?.rol ||
        [...(actual.sesion?.permisos ?? [])].sort().join() !==
          [...(anterior.sesion?.permisos ?? [])].sort().join()
      )
        cache.clear();
    });
    const reloj = setInterval(() => void revisar(), 60_000);
    const expirar = setInterval(() => {
      const actual = useSesionStore.getState().sesion;
      if (actual?.expiraEn && !(Date.parse(actual.expiraEn) > Date.now()))
        limpiar();
    }, 1000);
    window.addEventListener("focus", revisar);
    return () => {
      unsubscribe();
      clearInterval(reloj);
      clearInterval(expirar);
      window.removeEventListener("focus", revisar);
      setUnauthorizedHandler(null);
    };
  }, [cache]);
  useEffect(() => {
    const accion = new URLSearchParams(window.location.hash.slice(1)).get(
      "accion",
    );
    const parametros = new URLSearchParams(window.location.search);
    if (
      window.location.pathname === "/" &&
      parametros.get("login") === "1" &&
      !accion
    ) {
      if (!usePanelStore.getState().entries.some((e) => e.type === "sesion"))
        usePanelStore.getState().openPanel("sesion", {});
      parametros.delete("login");
      const consulta = parametros.toString();
      window.history.replaceState(
        window.history.state,
        "",
        "/" + (consulta ? "?" + consulta : "") + window.location.hash,
      );
    }
  }, [ruta]);
  return null;
}
