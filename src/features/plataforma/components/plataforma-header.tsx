"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, UserRound } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Notice } from "@/shared/ui/notice";
import { useSesionStore } from "@/features/sesion/state/session-store";
import { usePanelStore } from "@/core/panels/panel-store";
import { ROLES } from "../models/acceso";
export function PlataformaHeader() {
  const sesion = useSesionStore((s) => s.sesion);
  const router = useRouter();
  const cache = useQueryClient();
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");
  async function salir() {
    setOcupado(true);
    setError("");
    try {
      await useSesionStore.getState().cerrarSesion();
      cache.clear();
      usePanelStore.getState().closeAll();
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cerrar la sesión.");
    } finally {
      setOcupado(false);
    }
  }
  const abrirCuenta = () => usePanelStore.getState().openPanel("sesion", {});
  return (
    <header className="space-y-3 border-b border-border bg-surface-1 p-4 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words font-medium text-text-primary">
            {sesion?.identidad?.nombre ?? "Usuario"}
          </p>
          <p className="text-sm text-text-secondary">
            {ROLES[sesion?.rol ?? ""] ?? "Sin rol interno"}
            {sesion?.rol === "auditor_forense" ? " · Solo lectura" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={abrirCuenta}>
            <UserRound aria-hidden="true" className="size-4" />
            Mi cuenta
          </Button>
          <Button
            variant="outline"
            loading={ocupado}
            loadingLabel="Cerrando sesión…"
            onClick={() => void salir()}
          >
            <LogOut aria-hidden="true" className="size-4" />
            Cerrar sesión
          </Button>
        </div>
      </div>
      {error && (
        <Notice tone="danger" title="No se pudo cerrar sesión">
          {error}
        </Notice>
      )}
    </header>
  );
}
