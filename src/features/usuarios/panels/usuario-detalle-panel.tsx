"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { Clock3, KeyRound, ShieldCheck, UserRoundX } from "lucide-react";
import { PanelShell } from "@/core/panels/panel-shell";
import { usePanels } from "@/core/panels/panel-store";
import type { PanelComponentProps } from "@/app/_composition/panel-registry";
import { useUsuariosStore, type RolPlataforma } from "@/features/usuarios/state/usuarios-store";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";

const rolMeta: Record<RolPlataforma, { label: string; style: string; token?: "authority" }> = {
  administrador_identidades: { label: "Administrador de identidades", style: "border-ember/30 bg-ember-soft text-ember" },
  facilitador_mesa: { label: "Facilitador de mesa", style: "border-success/30 bg-success-soft text-success" },
  auditor_forense: { label: "Auditor forense", style: "border-info/30 bg-info-soft text-info" },
  autoridad_distrital: { label: "Autoridad distrital", style: "border", token: "authority" },
};

const nombresModulos: Record<string, string> = {
  mesas: "Mesas",
  formularios: "Formularios",
  geovisor: "Geovisor",
  noticias: "Noticias",
  testimonios: "Testimonios",
  usuarios: "Usuarios",
  contenido: "Contenido",
  configuracion: "Configuración",
};

interface Actividad {
  accion: string;
  detalle: string;
  hace: string;
}

const actividadDemo: Actividad[] = [
  { accion: "Inicio de sesión", detalle: "Acceso a la plataforma POLIS", hace: "Hoy · 7:45 a. m." },
  { accion: "Consultó el módulo", detalle: "Gestión de mesas", hace: "Ayer · 3:20 p. m." },
  { accion: "Actualizó su perfil", detalle: "Datos de contacto", hace: "Hace 3 días" },
  { accion: "Inicio de sesión", detalle: "Acceso desde Cartagena", hace: "Hace 5 días" },
  { accion: "Cuenta creada", detalle: "Invitación institucional", hace: "Hace 8 meses" },
];

export function UsuarioDetallePanel({ entryKey, props }: PanelComponentProps) {
  const usuarioId = "usuarioId" in props ? props.usuarioId : "";
  const usuario = useUsuariosStore((state) => state.getById(usuarioId));
  const cambiarActivo = useUsuariosStore((state) => state.cambiarActivo);
  const { closeTop, openPanel } = usePanels();
  const iniciales = useMemo(() => usuario?.nombre.split(/\s+/).slice(0, 2).map((parte) => parte[0]).join("").toLocaleUpperCase("es") ?? "US", [usuario?.nombre]);

  if (!usuario) {
    return (
      <PanelShell entryKey={entryKey} crumbs={[{ label: "Usuarios y roles" }]} kicker="Gestión de identidades" title="Usuario no encontrado" onClose={closeTop} onCloseToKey={closeTop}>
        <div className="p-6"><p className="text-sm text-text-secondary">La cuenta de demostración ya no está disponible.</p></div>
      </PanelShell>
    );
  }

  const rol = rolMeta[usuario.rol];
  return (
    <PanelShell
      entryKey={entryKey}
      crumbs={[{ label: "Usuarios y roles" }]}
      kicker="Ficha de usuario · Demo"
      title="Perfil y accesos"
      subtitle="Resumen de cuenta, permisos y actividad reciente."
      onClose={closeTop}
      onCloseToKey={closeTop}
    >
      <div className="space-y-6 p-5 sm:p-6">
        <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface-1 p-5 sm:flex-row sm:items-center">
          {usuario.foto ? (
            // La foto opcional proviene del mock local; las iniciales cubren el estado sin imagen.
            <img src={usuario.foto} alt={`Foto de ${usuario.nombre}`} className="size-16 rounded-full object-cover" />
          ) : (
            <div aria-label={`Iniciales de ${usuario.nombre}`} className="flex size-16 shrink-0 items-center justify-center rounded-full bg-ember-soft text-xl font-semibold text-ember">{iniciales}</div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-semibold text-text-primary">{usuario.nombre}</h3>
              <Badge variant={usuario.activo ? "success" : "destructive"}>{usuario.activo ? "Activo" : "Inactivo"}</Badge>
            </div>
            <p className="mt-1 break-all text-sm text-text-secondary">{usuario.correo}</p>
            <Badge className={`mt-3 ${rol.style}`} style={rol.token ? { color: "var(--role-authority)", backgroundColor: "var(--role-authority-soft)", borderColor: "var(--role-authority)" } : undefined}>{rol.label}</Badge>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2"><ShieldCheck className="size-4 text-ember" aria-hidden="true" /><h3 className="font-semibold">Módulos asignados</h3></div>
          <div className="flex flex-wrap gap-2">
            {usuario.modulos.length > 0
              ? usuario.modulos.map((modulo) => <Badge key={modulo} variant="outline">{nombresModulos[modulo] ?? modulo}</Badge>)
              : <p className="text-sm text-text-secondary">Sin módulos asignados.</p>}
          </div>
        </section>

        <section className="rounded-xl border border-border p-4">
          <div className="flex items-center gap-2"><Clock3 className="size-4 text-text-secondary" aria-hidden="true" /><h3 className="font-semibold">Último acceso</h3></div>
          <p className="mt-2 text-sm text-text-secondary">{usuario.ultimoAcceso ? fechaRelativa(usuario.ultimoAcceso) : "Nunca ha iniciado sesión"}</p>
          <p className="mt-1 text-xs text-text-tertiary">Cuenta creada el {new Date(usuario.creadoEn).toLocaleDateString("es-CO", { dateStyle: "long" })}</p>
        </section>

        <section className="space-y-3">
          <h3 className="font-semibold">Actividad reciente</h3>
          <ol className="space-y-0">
            {actividadDemo.map((evento, index) => (
              <li key={`${evento.accion}-${evento.hace}`} className="relative flex gap-3 pb-4 last:pb-0">
                {index < actividadDemo.length - 1 && <span aria-hidden="true" className="absolute left-[5px] top-3 h-full w-px bg-border" />}
                <span className="relative mt-1.5 size-3 shrink-0 rounded-full border-2 border-ember bg-surface-1" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-1"><p className="text-sm font-medium">{evento.accion}</p><span className="text-xs text-text-tertiary">{evento.hace}</span></div>
                  <p className="mt-0.5 text-sm text-text-secondary">{evento.detalle}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="text-xs text-text-tertiary">Actividad de ejemplo para esta vista demostrativa.</p>
        </section>

        <section className="flex flex-col gap-2 border-t border-border pt-5 sm:flex-row sm:flex-wrap">
          <Button onClick={() => openPanel("usuario-editor", { usuarioId: usuario.id })}>Editar rol y módulos</Button>
          <Button variant="outline" onClick={() => {
            cambiarActivo(usuario.id, !usuario.activo);
            toast.success(usuario.activo ? "Cuenta desactivada" : "Cuenta activada");
          }}><UserRoundX className="size-4" aria-hidden="true" />{usuario.activo ? "Desactivar cuenta" : "Activar cuenta"}</Button>
          <Button variant="outline" onClick={() => toast.success("Solicitud de restablecimiento registrada (demo)")}><KeyRound className="size-4" aria-hidden="true" />Restablecer acceso</Button>
        </section>
      </div>
    </PanelShell>
  );
}

function fechaRelativa(value: string): string {
  const horas = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 3_600_000));
  if (horas < 1) return "Hace menos de una hora";
  if (horas < 24) return `Hace ${horas} ${horas === 1 ? "hora" : "horas"}`;
  const dias = Math.floor(horas / 24);
  return `Hace ${dias} ${dias === 1 ? "día" : "días"}`;
}
