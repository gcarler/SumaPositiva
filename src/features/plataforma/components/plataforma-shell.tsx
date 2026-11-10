"use client";
import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useSesionStore } from "@/features/sesion/state/session-store";
import { usePanelStore, type PanelType } from "@/core/panels/panel-store";
import { sincronizarSesion } from "@/features/sesion/services/sincronizar-sesion";
import { Notice } from "@/shared/ui/notice";
import { Button } from "@/shared/ui/button";
import { IsotipoPolis } from "@/shared/branding/logo-polis";
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
import { useConfiguracionPlataformaStore } from "../state/configuracion-store";
import { abrirPanelSeguro } from "../services/panel-dispatcher";
/* Cambios de rol y restauración no elevan acceso: la restricción se deriva del
 * estado MFA real consultado en la sincronización (186), no de un flag de login. */
export function PlataformaShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const ruta = usePathname();
  const clientSesion = useSesionStore((s) => s.sesion);
  const clientCargando = useSesionStore((s) => s.cargando);
  const clientError = useSesionStore((s) => s.errorSesion);
  const clientEstadoMfa = useSesionStore((s) => s.estadoMfa);

  const sesion = typeof window === "undefined" ? useSesionStore.getState().sesion : clientSesion;
  const cargando = typeof window === "undefined" ? useSesionStore.getState().cargando : clientCargando;
  const error = typeof window === "undefined" ? useSesionStore.getState().errorSesion : clientError;
  const estadoMfa = typeof window === "undefined" ? useSesionStore.getState().estadoMfa : clientEstadoMfa;
  /* Restricción derivada del estado MFA real (186 y hallazgos de EAF-ID-06):
   * sesión limitada al enrolamiento o sin acreditar; con lectura no
   * disponible y rol nominal que daría acceso, también queda restringida. */
  const limitadaMfa = sesionLimitadaPorMfa(sesion, estadoMfa);
  const modulo = moduloDeRuta(ruta);
  const acceso = !!modulo && puedeVer(sesion, modulo);
  useEffect(() => {
    usePanelStore.getState().closeAll();
    const pendiente = useConfiguracionPlataformaStore.getState().panelPendiente;
    if (pendiente) {
      useConfiguracionPlataformaStore.getState().setPanelPendiente(null);
      queueMicrotask(() => {
        abrirPanelSeguro(pendiente.id as PanelType, pendiente.props);
      });
    }
  }, [ruta]);
  useEffect(() => {
    if (cargando || error) return;
    if (!sesionActiva(sesion)) {
      usePanelStore.getState().closeAll();
      router.replace("/?login=1");
    } else if (sesion?.rol === "ciudadano") {
      // Usuario con rol ciudadano: no rebotar silenciosamente; presentar el aviso pedagógico accesible
      usePanelStore.getState().closeAll();
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

  /* Si un usuario con rol ciudadano navega a /plataforma, mostrar aviso pedagógico accesible
   * explicando que el área técnica está reservada a equipos formuladores y facilitadores acreditados */
  if (sesionActiva(sesion) && sesion?.rol === "ciudadano") {
    return (
      <main id="polis-application" className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[var(--background)]">
        <div className="w-full max-w-lg space-y-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6 sm:p-8 shadow-xs">
          <div className="flex items-center gap-3 border-b border-[var(--border)] pb-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-2)] border border-[var(--border-strong)] p-1.5 shadow-2xs">
              <IsotipoPolis className="size-full" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand-polis-blue)] dark:text-[var(--brand-polis-sky)]">
                POLIS · Delimitación de Espacios
              </span>
              <h1 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                Área de Trabajo Técnica Institucional
              </h1>
            </div>
          </div>

          <Notice
            tone="info"
            title="Espacio de trabajo reservado al equipo formulador"
            className="border-[var(--brand-polis-cyan)]/30"
          >
            <div className="space-y-2 text-xs text-[var(--text-secondary)] leading-relaxed">
              <p>
                Hola, <strong>{sesion?.identidad?.nombre ?? "Ciudadano"}</strong>. Has iniciado sesión con tu identidad ciudadana verificada en POLIS.
              </p>
              <p>
                El área de trabajo técnica (<strong>/plataforma</strong>) es el entorno reservado exclusivamente para los equipos formuladores de la política pública, facilitadores acreditados y dependencias distritales (donde se estructuran mesas, actas, metas y compromisos).
              </p>
              <p className="text-[11px] text-[var(--text-tertiary)]">
                Tu participación como ciudadano tiene lugar en el portal público participativo, donde puedes proponer iniciativas, deliberar en las mesas territoriales y consultar el catálogo de indicadores.
              </p>
            </div>
          </Notice>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-[var(--border)]">
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <Button
                asChild
                variant="default"
                className="w-full sm:w-auto bg-[var(--brand-polis-blue)] hover:bg-[var(--brand-polis-cyan)] text-[var(--text-inverse)] hover:text-[var(--text-primary)] border-0"
              >
                <Link href="/">
                  ← Volver al Portal Ciudadano
                </Link>
              </Button>
              {ruta === "/plataforma/mesas" && (
                <Button
                  asChild
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  <Link href="/?vista=mesas">
                    Ver Mesas Comunitarias Públicas →
                  </Link>
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => usePanelStore.getState().openPanel("sesion", {})}
              >
                Mi cuenta
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void useSesionStore.getState().cerrarSesion().finally(() => {
                  usePanelStore.getState().closeAll();
                  router.replace("/");
                })}
              >
                Cerrar sesión
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }
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
