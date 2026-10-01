"use client";
import { useEffect, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSesionStore } from "@/features/sesion/state/session-store";
import { usePanelStore } from "@/core/panels/panel-store";
import { sincronizarSesion } from "@/features/sesion/services/sincronizar-sesion";
import { Notice } from "@/shared/ui/notice";
import { Button } from "@/shared/ui/button";
import { PlataformaSidebar } from "./plataforma-sidebar";
import { PlataformaHeader } from "./plataforma-header";
import {
  sesionActiva,
  puedeEntrar,
  puedeVer,
  moduloDeRuta,
} from "../models/acceso";
export function PlataformaShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const ruta = usePathname();
  const sesion = useSesionStore((s) => s.sesion);
  const cargando = useSesionStore((s) => s.cargando);
  const error = useSesionStore((s) => s.errorSesion);
  const modulo = moduloDeRuta(ruta);
  const acceso = !!modulo && puedeVer(sesion, modulo);
  useEffect(() => {
    usePanelStore.getState().closeAll();
  }, [ruta]);
  useEffect(() => {
    if (cargando || error) return;
    if (!sesionActiva(sesion)) {
      usePanelStore.getState().closeAll();
      router.replace("/?login=1");
    } else if (!puedeEntrar(sesion)) {
      usePanelStore.getState().closeAll();
      router.replace("/");
    } else if (!acceso) {
      usePanelStore.getState().closeAll();
      router.replace("/plataforma");
    }
  }, [sesion, cargando, error, acceso, router]);
  if (cargando)
    return (
      <main id="polis-application" className="p-6">
        <h1 className="sr-only">Acceso a plataforma</h1>
        <p role="status">Verificando sesión…</p>
      </main>
    );
  if (error)
    return (
      <main id="polis-application" className="space-y-4 p-6">
        <h1 className="sr-only">Verificación de sesión</h1>
        <Notice tone="danger" title="No se pudo verificar la sesión">
          {error}
        </Notice>
        <Button onClick={() => void sincronizarSesion()}>
          Reintentar verificación
        </Button>
      </main>
    );
  if (!acceso) return null;
  return (
    <div
      id="polis-application"
      className="min-h-screen min-w-0 bg-background lg:flex"
    >
      <a className="ui-skip-link" href="#contenido-plataforma">
        Saltar al contenido
      </a>
      <PlataformaSidebar />
      <div className="min-w-0 flex-1">
        <PlataformaHeader />
        <main
          id="contenido-plataforma"
          tabIndex={-1}
          className="min-w-0 space-y-6 p-4 sm:p-6 lg:p-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
