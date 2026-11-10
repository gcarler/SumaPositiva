"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, UserRound, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Notice } from "@/shared/ui/notice";
import { IsotipoPolis } from "@/shared/branding/logo-polis";
import { useSesionStore } from "@/features/sesion/state/session-store";
import { usePanelStore } from "@/core/panels/panel-store";
import { useConfiguracionPlataformaStore } from "../state/configuracion-store";
import { modulosPermitidos, puedeEditar, ROLES } from "../models/acceso";
export function PlataformaHeader() {
  const clientSesion = useSesionStore((s) => s.sesion);
  const sesion = typeof window === "undefined" ? useSesionStore.getState().sesion : clientSesion;
  const router = useRouter();
  const cache = useQueryClient();
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");
  const clientSidebarColapsado = useConfiguracionPlataformaStore((s) => s.sidebarColapsado);
  const sidebarColapsado =
    typeof window === "undefined"
      ? useConfiguracionPlataformaStore.getState().sidebarColapsado
      : clientSidebarColapsado;
  const toggleSidebarColapsado = useConfiguracionPlataformaStore((s) => s.toggleSidebarColapsado);
  const modulos = modulosPermitidos(sesion);
  const soloLectura = modulos.length > 0 && modulos.every((modulo) => !puedeEditar(sesion, modulo.id));
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
    <header className="space-y-3 border-b border-[var(--border)] bg-[var(--surface-1)] p-4 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleSidebarColapsado}
            className="hidden lg:flex text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)]"
            title={sidebarColapsado ? "Expandir barra lateral" : "Reducir barra lateral a iconos (pantalla completa)"}
            aria-label={sidebarColapsado ? "Expandir barra lateral" : "Reducir barra lateral a iconos"}
          >
            {sidebarColapsado ? (
              <ChevronRight className="size-4" />
            ) : (
              <ChevronLeft className="size-4" />
            )}
          </Button>
          <Link
            href="/"
            aria-label="Ir al portal público de POLIS"
            className="group flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)] border border-[var(--border-strong)] p-1 shadow-2xs transition-all hover:border-[var(--brand-polis-cyan)] hover:scale-105"
            title="Volver al portal público de POLIS"
          >
            <IsotipoPolis className="size-full" />
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="break-words font-semibold text-xs sm:text-sm text-[var(--text-primary)]">
                {sesion?.identidad?.nombre ?? "Usuario"}
              </p>
              <Badge
                variant="outline"
                className="text-[10px] font-semibold border-[var(--brand-polis-cyan)]/40 text-[var(--brand-polis-blue)] dark:text-[var(--brand-polis-sky)] bg-[var(--surface-2)]"
              >
                {ROLES[sesion?.rol ?? ""] ?? sesion?.rol?.replaceAll("_", " ") ?? "Sin rol interno"}
              </Badge>
              {soloLectura && (
                <Badge variant="outline" className="text-[10px] text-[var(--text-tertiary)] border-[var(--border)]">
                  Solo lectura
                </Badge>
              )}
              <span
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[var(--brand-polis-cyan)]/30 bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-medium text-[var(--brand-polis-blue)] dark:text-[var(--brand-polis-sky)]"
                title="Sesión institucional autenticada con Google Workspace para la recepción oficial de notificaciones"
              >
                <span className="size-1.5 rounded-full bg-[var(--success)]" aria-hidden="true" />
                Google Workspace Oficial
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5 truncate">
              Espacio Técnico de Formulación y Seguimiento · Cartagena 2026–2036
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={abrirCuenta} className="text-xs gap-1.5 border-[var(--border)] hover:border-[var(--border-strong)]">
            <UserRound aria-hidden="true" className="size-3.5 text-[var(--brand-polis-blue)] dark:text-[var(--brand-polis-sky)]" />
            Mi cuenta
          </Button>
          <Button
            variant="outline"
            size="sm"
            loading={ocupado}
            loadingLabel="Cerrando sesión…"
            onClick={() => void salir()}
            className="text-xs gap-1.5 border-[var(--border)] hover:border-[var(--border-strong)] text-[var(--text-secondary)] hover:text-[var(--danger)]"
          >
            <LogOut aria-hidden="true" className="size-3.5" />
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
