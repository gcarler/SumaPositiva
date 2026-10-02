"use client";

import { useMemo, useState } from "react";
import { Search, UserPlus, Users, UserRoundCheck, ShieldCheck, KeyRound, Pencil, ChevronRight } from "lucide-react";
import { PageHeader } from "@/shared/ui/page-header";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Notice } from "@/shared/ui/notice";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { usePanels } from "@/core/panels/panel-store";
import { useSesionStore, tienePermiso } from "@/features/sesion/state/session-store";
import { useUsuariosStore, type RolPlataforma, type UsuarioPlatafoma } from "@/features/usuarios/state/usuarios-store";

const ROLES: { id: RolPlataforma | "todos"; label: string }[] = [
  { id: "todos", label: "Todos los roles" },
  { id: "administrador_identidades", label: "Administrador de identidades" },
  { id: "facilitador_mesa", label: "Facilitador de mesa" },
  { id: "auditor_forense", label: "Auditor forense" },
  { id: "autoridad_distrital", label: "Autoridad distrital" },
];

const rolMeta: Record<RolPlataforma, { label: string; style: string; token?: "authority" }> = {
  administrador_identidades: { label: "Administrador", style: "border-ember/30 bg-ember-soft text-ember" },
  facilitador_mesa: { label: "Facilitador", style: "border-success/30 bg-success-soft text-success" },
  auditor_forense: { label: "Auditor", style: "border-info/30 bg-info-soft text-info" },
  autoridad_distrital: { label: "Autoridad", style: "border", token: "authority" },
};

export function UsuariosGestionView() {
  const sesion = useSesionStore((state) => state.sesion);
  const usuarios = useUsuariosStore((state) => state.usuarios);
  const { openPanel } = usePanels();
  const [busqueda, setBusqueda] = useState("");
  const [rolFiltro, setRolFiltro] = useState<RolPlataforma | "todos">("todos");
  const permitido = sesion?.rol === "administrador_identidades" && tienePermiso(sesion, "usuarios:leer");
  const filtrados = useMemo(() => {
    const query = busqueda.trim().toLocaleLowerCase("es");
    return usuarios.filter((usuario) => {
      const coincideTexto = !query || `${usuario.nombre} ${usuario.correo}`.toLocaleLowerCase("es").includes(query);
      return coincideTexto && (rolFiltro === "todos" || usuario.rol === rolFiltro);
    });
  }, [busqueda, rolFiltro, usuarios]);

  const kpis = [
    { label: "Cuentas de demo", value: usuarios.length, icon: Users, note: `${usuarios.filter((usuario) => usuario.activo).length} activas` },
    { label: "Facilitadores", value: usuarios.filter((usuario) => usuario.rol === "facilitador_mesa").length, icon: UserRoundCheck, note: "Gestión de mesas" },
    { label: "Auditores", value: usuarios.filter((usuario) => usuario.rol === "auditor_forense").length, icon: ShieldCheck, note: "Acceso de lectura" },
    { label: "Administradores", value: usuarios.filter((usuario) => usuario.rol === "administrador_identidades").length, icon: KeyRound, note: "Gestión de identidades" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Usuarios y roles" description="Administra accesos, responsabilidades y cuentas institucionales." action={permitido ? <Button onClick={() => openPanel("usuario-invitar", {})}><UserPlus className="size-4" aria-hidden="true" />Invitar usuario</Button> : undefined} />
      {!permitido ? (
        <Notice tone="warning" title="Permiso requerido">Se requiere una sesión administradora con permiso de lectura de usuarios.</Notice>
      ) : (
        <>
          <Notice tone="info" title="Vista de demostración">Estos ocho perfiles y las acciones de esta pantalla son datos locales de ejemplo. La gestión institucional conectada a la API está disponible en el panel de usuarios.</Notice>

          <section aria-label="Resumen de usuarios" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map(({ label, value, icon: Icon, note }) => (
              <article key={label} className="rounded-2xl border border-border bg-surface-1 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-sm text-text-secondary">{label}</p><p className="mt-2 text-3xl font-semibold tracking-tight text-text-primary">{value}</p></div>
                  <span className="rounded-xl bg-ember-soft p-2.5 text-ember"><Icon className="size-5" aria-hidden="true" /></span>
                </div>
                <p className="mt-3 text-xs text-text-tertiary">{note}</p>
              </article>
            ))}
          </section>

          <section className="space-y-4 rounded-2xl border border-border bg-surface-1 p-4 sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-tertiary" aria-hidden="true" />
                <Input type="search" aria-label="Buscar por nombre o correo" placeholder="Buscar nombre o correo…" className="pl-9" value={busqueda} onChange={(event) => setBusqueda(event.target.value)} />
              </div>
              <div className="w-full lg:w-72">
                <Select value={rolFiltro} onValueChange={(value) => setRolFiltro(value as RolPlataforma | "todos")}>
                  <SelectTrigger aria-label="Filtrar por rol"><SelectValue /></SelectTrigger>
                  <SelectContent>{ROLES.map((rol) => <SelectItem key={rol.id} value={rol.id}>{rol.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="hidden grid-cols-[minmax(200px,1.4fr)_minmax(220px,1.5fr)_minmax(140px,1fr)_minmax(135px,.8fr)_auto] gap-4 border-b border-border px-3 pb-3 text-xs font-medium uppercase tracking-wide text-text-tertiary md:grid">
              <span>Usuario</span><span>Correo electrónico</span><span>Rol</span><span>Último acceso</span><span className="sr-only">Acciones</span>
            </div>
            <div className="space-y-3 md:space-y-0">
              {filtrados.map((usuario) => <FilaUsuario key={usuario.id} usuario={usuario} abrirDetalle={() => openPanel("usuario-detalle", { usuarioId: usuario.id })} editar={() => openPanel("usuario-editor", { usuarioId: usuario.id })} />)}
              {filtrados.length === 0 && <div className="rounded-xl border border-dashed border-border p-8 text-center"><p className="font-medium">No hay coincidencias</p><p className="mt-1 text-sm text-text-secondary">Prueba con otro nombre, correo o rol.</p></div>}
            </div>
            <div className="flex items-center justify-between border-t border-border pt-4 text-sm text-text-secondary"><span>Mostrando {filtrados.length} de {usuarios.length} cuentas de demo</span><span>Actualizado ahora</span></div>
          </section>

          <Button variant="outline" onClick={() => openPanel("usuarios", {})}>Abrir administración institucional</Button>
        </>
      )}
    </div>
  );
}

function FilaUsuario({ usuario, abrirDetalle, editar }: { usuario: UsuarioPlatafoma; abrirDetalle: () => void; editar: () => void }) {
  const rol = rolMeta[usuario.rol];
  const iniciales = usuario.nombre.split(/\s+/).slice(0, 2).map((parte) => parte[0]).join("").toLocaleUpperCase("es");
  return (
    <article className="grid gap-3 rounded-xl border border-border bg-surface-0 p-4 md:grid-cols-[minmax(200px,1.4fr)_minmax(220px,1.5fr)_minmax(140px,1fr)_minmax(135px,.8fr)_auto] md:items-center md:gap-4 md:rounded-none md:border-0 md:border-b md:bg-transparent md:px-3 md:py-3">
      <Button type="button" variant="unstyled" onClick={abrirDetalle} className="group flex min-w-0 items-center gap-3 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        <span aria-hidden="true" className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-ember-soft text-sm font-semibold text-ember">
          {usuario.foto ? <img src={usuario.foto} alt="" className="size-10 rounded-full object-cover" /> : iniciales}
          <span className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-surface-0 ${usuario.activo ? "bg-success" : "bg-text-tertiary"}`} />
        </span>
        <span className="min-w-0"><span className="block truncate font-medium text-text-primary group-hover:text-ember">{usuario.nombre}</span><span className="mt-0.5 block truncate text-xs text-text-tertiary md:hidden">{usuario.correo}</span></span>
        <span className="sr-only">Ver detalle</span>
      </Button>
      <p className="hidden min-w-0 truncate text-sm text-text-secondary md:block">{usuario.correo}</p>
      <div className="flex items-center justify-between gap-2 md:justify-start"><Badge className={rol.style} style={rol.token ? { color: "var(--role-authority)", backgroundColor: "var(--role-authority-soft)", borderColor: "var(--role-authority)" } : undefined}>{rol.label}</Badge><span className="text-xs text-text-tertiary md:hidden">{usuario.activo ? "Activa" : "Inactiva"}</span></div>
      <div><p className="text-xs text-text-tertiary md:hidden">Último acceso</p><p className="text-sm text-text-secondary">{usuario.ultimoAcceso ? haceCuanto(usuario.ultimoAcceso) : "Nunca"}</p></div>
      <div className="flex justify-end gap-2 border-t border-border pt-3 md:border-0 md:pt-0">
        <Button variant="outline" size="sm" className="md:hidden" onClick={abrirDetalle}>Ver perfil<ChevronRight className="size-4" aria-hidden="true" /></Button>
        <Button variant="ghost" size="icon-sm" onClick={editar} aria-label={`Editar ${usuario.nombre}`}><Pencil className="size-4" aria-hidden="true" /></Button>
      </div>
    </article>
  );
}

function haceCuanto(value: string): string {
  const minutos = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 60_000));
  if (minutos < 60) return `Hace ${Math.max(1, minutos)} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `Hace ${horas} ${horas === 1 ? "hora" : "h"}`;
  const dias = Math.floor(horas / 24);
  return `Hace ${dias} ${dias === 1 ? "día" : "d"}`;
}
