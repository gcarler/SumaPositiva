"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { KeyRound, ShieldCheck, UserRoundX, LogOut, CheckCircle2, AlertCircle, Pencil } from "lucide-react";
import { PanelShell } from "@/core/panels/panel-shell";
import { usePanels } from "@/core/panels/panel-store";
import type { PanelComponentProps } from "@/app/_composition/panel-registry";
import { identidadApi } from "@/features/sesion/services/identidad-api";
import { tienePermiso, useSesionStore } from "@/features/sesion/state/session-store";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";

const rolMeta: Record<string, { label: string; style: string; token?: "authority" }> = {
  administrador_identidades: { label: "Administrador de identidades", style: "border-ember/30 bg-ember-soft text-ember" },
  facilitador_mesa: { label: "Facilitador de mesa", style: "border-success/30 bg-success-soft text-success" },
  auditor_forense: { label: "Auditor forense", style: "border-info/30 bg-info-soft text-info" },
  autoridad_distrital: { label: "Autoridad distrital", style: "border", token: "authority" },
  ciudadano: { label: "Ciudadano", style: "border-border bg-surface-2 text-text-secondary" },
};

export function UsuarioDetallePanel({ entryKey, props }: PanelComponentProps) {
  const usuarioId = "usuarioId" in props ? (props.usuarioId as string) : "";
  const { closeTop, openPanel } = usePanels();
  const cache = useQueryClient();
  const sesion = useSesionStore((state) => state.sesion);
  const puedeGestionar = tienePermiso(sesion, "usuarios:gestionar");
  const [ejecutando, setEjecutando] = useState(false);

  const usuariosQuery = useQuery({
    queryKey: ["identidad", "usuarios", "todos"],
    queryFn: () => identidadApi.usuarios("", 0, 100),
    enabled: Boolean(usuarioId),
  });

  const usuario = useMemo(
    () => (usuarioId ? usuariosQuery.data?.elementos.find((u) => u.id === usuarioId) : undefined),
    [usuarioId, usuariosQuery.data],
  );

  const nombreCompleto = usuario ? `${usuario.nombres} ${usuario.apellidos}`.trim() : "Usuario";
  const iniciales = useMemo(() => {
    if (!usuario) return "US";
    return (
      (usuario.nombres[0] ?? "") + (usuario.apellidos[0] ?? (usuario.correo[0] ?? ""))
    ).toLocaleUpperCase("es");
  }, [usuario]);

  async function cambiarEstadoActivo() {
    if (!usuario) return;
    setEjecutando(true);
    try {
      await identidadApi.editarUsuario(usuario.id, {
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
        codigo_rol: usuario.codigo_rol,
        activo: !usuario.activo,
        motivo: usuario.activo
          ? "Desactivación administrativa de cuenta institucional"
          : "Activación administrativa de cuenta institucional",
      });
      await cache.invalidateQueries({ queryKey: ["identidad"] });
      toast.success(usuario.activo ? "Cuenta desactivada exitosamente" : "Cuenta activada exitosamente");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al cambiar estado de cuenta");
    } finally {
      setEjecutando(false);
    }
  }

  async function revocarSesiones() {
    if (!usuario) return;
    setEjecutando(true);
    try {
      await identidadApi.revocarUsuario(usuario.id);
      await cache.invalidateQueries({ queryKey: ["identidad"] });
      toast.success(`Sesiones activas de ${nombreCompleto} revocadas exitosamente`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al revocar sesiones");
    } finally {
      setEjecutando(false);
    }
  }

  async function restablecerAcceso() {
    if (!usuario) return;
    setEjecutando(true);
    try {
      await identidadApi.solicitarRecuperacion(usuario.correo);
      toast.success(`Enlace de restablecimiento enviado a ${usuario.correo}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al solicitar restablecimiento");
    } finally {
      setEjecutando(false);
    }
  }

  if (usuariosQuery.isLoading) {
    return (
      <PanelShell
        entryKey={entryKey}
        crumbs={[{ label: "Usuarios y roles" }]}
        kicker="Gestión de identidades · Seguridad Humana"
        title="Cargando perfil…"
        onClose={closeTop}
        onCloseToKey={closeTop}
      >
        <div className="p-6 text-center text-sm text-text-secondary">
          Consultando datos del usuario en PostgreSQL…
        </div>
      </PanelShell>
    );
  }

  if (!usuario) {
    return (
      <PanelShell
        entryKey={entryKey}
        crumbs={[{ label: "Usuarios y roles" }]}
        kicker="Gestión de identidades · Seguridad Humana"
        title="Usuario no encontrado"
        onClose={closeTop}
        onCloseToKey={closeTop}
      >
        <div className="p-6">
          <p className="text-sm text-text-secondary">
            No se encontró el registro del usuario solicitado en la base de datos institucional.
          </p>
        </div>
      </PanelShell>
    );
  }

  const meta = rolMeta[usuario.codigo_rol] ?? {
    label: usuario.codigo_rol,
    style: "border-border bg-surface-2 text-text-secondary",
  };

  return (
    <PanelShell
      entryKey={entryKey}
      crumbs={[{ label: "Usuarios y roles" }]}
      kicker="Ficha de usuario · Gestión institucional"
      title="Perfil y accesos"
      subtitle="Resumen de cuenta institucional, permisos y trazabilidad en PostgreSQL."
      onClose={closeTop}
      onCloseToKey={closeTop}
    >
      <div className="space-y-6 p-5 sm:p-6" aria-busy={ejecutando}>
        <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface-1 p-5 sm:flex-row sm:items-center">
          <div
            aria-label={`Iniciales de ${nombreCompleto}`}
            className="flex size-16 shrink-0 items-center justify-center rounded-full bg-ember-soft text-xl font-semibold text-ember"
          >
            {iniciales}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-semibold text-text-primary">{nombreCompleto}</h3>
              <Badge variant={usuario.activo ? "success" : "destructive"}>
                {usuario.activo ? "Activo" : "Inactivo"}
              </Badge>
            </div>
            <p className="mt-1 break-all text-sm text-text-secondary">{usuario.correo}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge
                className={meta.style}
                style={
                  meta.token
                    ? {
                        color: "var(--role-authority)",
                        backgroundColor: "var(--role-authority-soft)",
                        borderColor: "var(--role-authority)",
                      }
                    : undefined
                }
              >
                {meta.label}
              </Badge>
              <Badge variant="outline">Nivel: {usuario.nivel_identidad}</Badge>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border p-4 space-y-2">
          <h4 className="text-sm font-semibold text-text-primary">Detalles de la cuenta</h4>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <span className="text-text-tertiary">Identificador único (UUID):</span>
              <p className="font-mono text-xs text-text-secondary break-all">{usuario.id}</p>
            </div>
            <div>
              <span className="text-text-tertiary">Estado de verificación:</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                {usuario.correo_verificado_en ? (
                  <>
                    <CheckCircle2 className="size-4 text-success" aria-hidden="true" />
                    <span className="text-text-secondary">Verificado</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="size-4 text-warning" aria-hidden="true" />
                    <span className="text-text-secondary">Sin verificar por correo</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-ember" aria-hidden="true" />
            <h4 className="font-semibold text-text-primary">
              Permisos RBAC asignados ({usuario.permisos.length})
            </h4>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-3 rounded-xl border border-border bg-surface-0">
            {usuario.permisos.length > 0 ? (
              usuario.permisos.map((permiso) => (
                <Badge key={permiso} variant="outline" className="font-mono text-xs">
                  {permiso}
                </Badge>
              ))
            ) : (
              <p className="text-sm text-text-secondary">Sin permisos asignados explícitamente.</p>
            )}
          </div>
        </section>

        {puedeGestionar && (
          <section className="flex flex-col gap-2 border-t border-border pt-5 sm:flex-row sm:flex-wrap">
            <Button
              variant="ember"
              disabled={ejecutando}
              onClick={() => openPanel("usuario-editor", { usuarioId: usuario.id })}
              className="gap-1.5"
            >
              <Pencil className="size-4" aria-hidden="true" />
              Editar rol y datos
            </Button>
            <Button
              variant="outline"
              disabled={ejecutando}
              onClick={cambiarEstadoActivo}
              className="gap-1.5"
            >
              <UserRoundX className="size-4" aria-hidden="true" />
              {usuario.activo ? "Suspender cuenta" : "Reactivar cuenta"}
            </Button>
            <Button
              variant="outline"
              disabled={ejecutando}
              onClick={revocarSesiones}
              className="gap-1.5"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Revocar sesiones
            </Button>
            <Button
              variant="outline"
              disabled={ejecutando}
              onClick={restablecerAcceso}
              className="gap-1.5"
            >
              <KeyRound className="size-4" aria-hidden="true" />
              Restablecer acceso
            </Button>
          </section>
        )}
      </div>
    </PanelShell>
  );
}
