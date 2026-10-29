"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  KeyRound,
  ShieldCheck,
  UserRoundX,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Pencil,
  MapPin,
  Plus,
  Trash2,
  Globe,
} from "lucide-react";
import { PanelShell } from "@/core/panels/panel-shell";
import { usePanels } from "@/core/panels/panel-store";
import type { PanelComponentProps } from "@/core/panels/panel-store";
import { identidadApi } from "@/features/sesion/services/identidad-api";
import { tienePermiso, useSesionStore } from "@/features/sesion/state/session-store";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

const rolMeta: Record<string, { label: string; style: string; token?: "authority" }> = {
  administrador_identidades: { label: "Administrador de identidades", style: "border-ember/30 bg-ember-soft text-ember" },
  facilitador_mesa: { label: "Facilitador de mesa", style: "border-success/30 bg-success-soft text-success" },
  auditor_forense: { label: "Auditor forense", style: "border-info/30 bg-info-soft text-info" },
  autoridad_distrital: { label: "Autoridad distrital", style: "border", token: "authority" },
  ciudadano: { label: "Ciudadano", style: "border-border bg-surface-2 text-text-secondary" },
};

export function UsuarioDetallePanel({ entryKey, props }: PanelComponentProps<"usuario-detalle">) {
  const usuarioId = "usuarioId" in props ? (props.usuarioId as string) : "";
  const { closeTop, openPanel } = usePanels();
  const cache = useQueryClient();
  const sesion = useSesionStore((state) => state.sesion);
  const puedeGestionar = tienePermiso(sesion, "usuarios:gestionar");
  const [ejecutando, setEjecutando] = useState(false);
  const [mostrarFormAmbito, setMostrarFormAmbito] = useState(false);
  const [tipoAmbito, setTipoAmbito] = useState<"distrital" | "localidad" | "mesa">("localidad");
  const [identificadorTerritorial, setIdentificadorTerritorial] = useState("LOC-1");
  const [motivoAmbito, setMotivoAmbito] = useState("");
  const [guardandoAmbito, setGuardandoAmbito] = useState(false);

  const usuariosQuery = useQuery({
    queryKey: ["identidad", "usuarios", "todos"],
    queryFn: () => identidadApi.usuarios("", 0, 100),
    enabled: Boolean(usuarioId),
  });

  const ambitosQuery = useQuery({
    queryKey: ["identidad", "usuarios", usuarioId, "ambitos"],
    queryFn: () => identidadApi.ambitosUsuario(usuarioId),
    enabled: Boolean(usuarioId) && puedeGestionar,
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

  async function asignarAmbito(e: React.FormEvent) {
    e.preventDefault();
    if (!usuario || !motivoAmbito.trim()) {
      toast.error("El motivo de asignación es obligatorio");
      return;
    }
    const idTerritorial = tipoAmbito === "distrital" ? "DISTRITO" : identificadorTerritorial.trim();
    if (!idTerritorial) {
      toast.error("Debe especificar el identificador territorial");
      return;
    }
    setGuardandoAmbito(true);
    try {
      await identidadApi.asignarAmbitoUsuario(usuario.id, {
        tipo_ambito: tipoAmbito,
        identificador_territorial: idTerritorial,
        motivo: motivoAmbito.trim(),
      });
      await cache.invalidateQueries({ queryKey: ["identidad", "usuarios", usuarioId, "ambitos"] });
      toast.success("Ámbito territorial asignado exitosamente");
      setMotivoAmbito("");
      setMostrarFormAmbito(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al asignar ámbito territorial");
    } finally {
      setGuardandoAmbito(false);
    }
  }

  async function revocarAmbito(ambitoId: string) {
    if (!usuario) return;
    const motivo = window.prompt("Ingrese el motivo de revocación del ámbito territorial (obligatorio):");
    if (!motivo || !motivo.trim()) return;
    setEjecutando(true);
    try {
      await identidadApi.revocarAmbitoUsuario(usuario.id, ambitoId, motivo.trim());
      await cache.invalidateQueries({ queryKey: ["identidad", "usuarios", usuarioId, "ambitos"] });
      toast.success("Ámbito territorial revocado exitosamente");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al revocar ámbito");
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

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="size-4 text-ember" aria-hidden="true" />
              <h4 className="font-semibold text-text-primary">
                Ámbitos territoriales PBAC ({ambitosQuery.data?.length ?? 0})
              </h4>
            </div>
            {puedeGestionar && !mostrarFormAmbito && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMostrarFormAmbito(true)}
                className="gap-1 text-xs"
              >
                <Plus className="size-3.5" aria-hidden="true" />
                Asignar ámbito
              </Button>
            )}
          </div>

          {ambitosQuery.isLoading ? (
            <p className="text-xs text-text-tertiary">Cargando ámbitos territoriales...</p>
          ) : ambitosQuery.data && ambitosQuery.data.length > 0 ? (
            <div className="space-y-2">
              {ambitosQuery.data.map((ambito) => (
                <div
                  key={ambito.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-surface-0 p-3"
                >
                  <div className="flex items-center gap-2.5">
                    {ambito.tipo_ambito === "distrital" ? (
                      <Globe className="size-4 text-info" aria-hidden="true" />
                    ) : (
                      <MapPin className="size-4 text-ember" aria-hidden="true" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs uppercase">
                          {ambito.tipo_ambito}
                        </Badge>
                        <span className="font-semibold text-text-primary text-sm">
                          {ambito.identificador_territorial}
                        </span>
                      </div>
                      <span className="text-xs text-text-tertiary">
                        Asignado el {new Date(ambito.creado_en).toLocaleDateString("es-CO")}
                      </span>
                    </div>
                  </div>
                  {puedeGestionar && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={ejecutando}
                      onClick={() => revocarAmbito(ambito.id)}
                      className="size-8 p-0 text-text-tertiary hover:text-destructive"
                      aria-label={`Revocar ámbito ${ambito.identificador_territorial}`}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-surface-0 p-3.5 text-xs text-text-secondary">
              <p className="font-medium text-text-primary">Sin ámbito específico asignado</p>
              <p className="mt-0.5 text-text-tertiary">
                El usuario opera con jurisdicción distrital global plena (comportamiento retrocompatible por defecto).
              </p>
            </div>
          )}

          {puedeGestionar && mostrarFormAmbito && (
            <form
              onSubmit={asignarAmbito}
              className="space-y-3 rounded-xl border border-border bg-surface-1 p-3.5"
            >
              <h5 className="text-xs font-semibold text-text-primary">Asignar nuevo ámbito territorial</h5>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <Label htmlFor="tipo-ambito-select" className="text-xs text-text-tertiary block mb-1">
                    Tipo de ámbito:
                  </Label>
                  <Select
                    value={tipoAmbito}
                    onValueChange={(val) => {
                      const t = val as "distrital" | "localidad" | "mesa";
                      setTipoAmbito(t);
                      if (t === "localidad") setIdentificadorTerritorial("LOC-1");
                      else if (t === "distrital") setIdentificadorTerritorial("DISTRITO");
                      else setIdentificadorTerritorial("");
                    }}
                  >
                    <SelectTrigger id="tipo-ambito-select" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="distrital">Distrital (Todo el distrito)</SelectItem>
                      <SelectItem value="localidad">Localidad</SelectItem>
                      <SelectItem value="mesa">Mesa específica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="id-territorial-input" className="text-xs text-text-tertiary block mb-1">
                    Identificador territorial:
                  </Label>
                  {tipoAmbito === "localidad" ? (
                    <Select
                      value={identificadorTerritorial}
                      onValueChange={setIdentificadorTerritorial}
                    >
                      <SelectTrigger id="id-territorial-input" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOC-1">Localidad 1 (Histórica y del Caribe Norte)</SelectItem>
                        <SelectItem value="LOC-2">Localidad 2 (De la Virgen y Turística)</SelectItem>
                        <SelectItem value="LOC-3">Localidad 3 (Industrial y de la Bahía)</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="id-territorial-input"
                      value={identificadorTerritorial}
                      disabled={tipoAmbito === "distrital"}
                      onChange={(e) => setIdentificadorTerritorial(e.target.value)}
                      placeholder={tipoAmbito === "distrital" ? "DISTRITO" : "Código o UUID de mesa"}
                      className="text-sm"
                    />
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="motivo-ambito-input" className="text-xs text-text-tertiary block mb-1">
                  Motivo pericial obligatorio:
                </Label>
                <Input
                  id="motivo-ambito-input"
                  value={motivoAmbito}
                  onChange={(e) => setMotivoAmbito(e.target.value)}
                  placeholder="Ej. Asignación operativa de liderazgo en Localidad 1"
                  className="text-sm"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setMostrarFormAmbito(false)}
                  disabled={guardandoAmbito}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="ember"
                  size="sm"
                  disabled={guardandoAmbito}
                >
                  {guardandoAmbito ? "Guardando..." : "Asignar"}
                </Button>
              </div>
            </form>
          )}
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
