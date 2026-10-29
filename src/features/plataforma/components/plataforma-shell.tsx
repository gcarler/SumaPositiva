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
import {
  sesionLimitadaPorMfa,
} from "@/features/sesion/state/session-store";
/* Cambios de rol y restauración no elevan acceso: la restricción se deriva del
 * estado MFA real consultado en la sincronización (186), no de un flag de login. */
export function PlataformaShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const ruta = usePathname();
  const sesion = useSesionStore((s) => s.sesion);
  const cargando = useSesionStore((s) => s.cargando);
  const error = useSesionStore((s) => s.errorSesion);
  const estadoMfa = useSesionStore((s) => s.estadoMfa);
  /* Restricción derivada del estado MFA real (186 y hallazgos de EAF-ID-06):
   * sesión limitada al enrolamiento o sin acreditar; con lectura no
   * disponible y rol nominal que daría acceso, también queda restringida. */
  const limitadaMfa = sesionLimitadaPorMfa(sesion, estadoMfa);
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
    } else if (!limitadaMfa && !puedeEntrar(sesion)) {
      usePanelStore.getState().closeAll();
      router.replace("/");
    } else if (!acceso) {
      usePanelStore.getState().closeAll();
      router.replace("/plataforma");
    }
  }, [sesion, cargando, error, acceso, limitadaMfa, router]);
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
  /* La restricción de sesión limitada prevalece aunque el rol nominal diera
   * acceso: sin ella el área institucional quedaría muerta (recordatorio 186). */
  if (limitadaMfa && sesionActiva(sesion)) {
    if (estadoMfa === "nodisponible") {
      /* Lectura de /mfa/estado no disponible (hallazgo 2 de EAF-ID-06): nada
       * de cabecera ni menú institucional; salida y reintento comprensibles. */
      return (
        <main id="polis-application" className="space-y-4 p-6">
          <h1 className="sr-only">Verificación en dos pasos no disponible</h1>
          <Notice
            tone="danger"
            title="No se pudo confirmar el estado de la verificación en dos pasos"
          >
            Mientras no se confirme, el acceso institucional queda restringido.
            Tu sesión y tu cuenta se conservan; puedes reintentar o cerrar
            sesión.
          </Notice>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void sincronizarSesion()}>
              Revisar acceso
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                usePanelStore.getState().openPanel("sesion", {})
              }
            >
              Mi cuenta
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                void useSesionStore.getState().cerrarSesion().finally(() => {
                  usePanelStore.getState().closeAll();
                })
              }
            >
              Cerrar sesión
            </Button>
          </div>
        </main>
      );
    }
    const pendienteEnrolar =
      estadoMfa!.exigido_por_rol && !estadoMfa!.activo;
      return (
        <main id="polis-application" className="space-y-4 p-6">
          <h1 className="sr-only">Acceso restringido</h1>
          <Notice
            tone="warning"
            title={
              pendienteEnrolar
                ? "Acceso restringido hasta activar la verificación en dos pasos"
                : "Sesión sin verificar"
            }
          >
            {pendienteEnrolar
              ? "Tu rol exige la verificación en dos pasos. Esta sesión solo permite configurar MFA, ver tu perfil y cerrar sesión; el acceso institucional se habilita al activarla."
              : "Ya cuentas con la verificación en dos pasos, pero esta sesión se inició antes y no está acreditada. Cierra sesión y vuelve a entrar para completar el desafío."}
          </Notice>
          <div className="flex flex-wrap gap-2">
            {pendienteEnrolar && (
              <Button
                onClick={() =>
                  usePanelStore.getState().openPanel("sesion", {})
                }
              >
                Configurar verificación en dos pasos
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() =>
                void useSesionStore.getState().cerrarSesion().finally(() => {
                  usePanelStore.getState().closeAll();
                })
              }
            >
              Cerrar sesión
            </Button>
            <Button
              variant="ghost"
              onClick={() => void sincronizarSesion()}
            >
              Revisar acceso
            </Button>
          </div>
        </main>
      );
  }
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
