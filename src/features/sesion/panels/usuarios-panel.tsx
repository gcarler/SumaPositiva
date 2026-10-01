"use client";

import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PanelShell } from "@/core/panels/panel-shell";
import { usePanels } from "@/core/panels/panel-store";
import { Button } from "@/shared/ui/button";
import { Notice } from "@/shared/ui/notice";
import { Checkbox } from "@/shared/ui/checkbox";
import { Label } from "@/shared/ui/label";
import { FormField } from "@/shared/ui/form-field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { tienePermiso, useSesionStore } from "@/features/sesion/state/session-store";
import { identidadApi, type Rol, type Usuario } from "@/features/sesion/services/identidad-api";
import { CampoIdentidad, textoFormulario, comprobarContrasena } from "@/features/sesion/components/campo-identidad";

type Seccion = "usuarios" | "roles" | "eventos";
export function UsuariosPanel({entryKey}: {entryKey: string}) {
  const {closeTop} = usePanels();
  const cache = useQueryClient();
  const sesion = useSesionStore((s) => s.sesion);
  const [seccion, setSeccion] = useState<Seccion>("usuarios");
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(0);
  const [usuario, setUsuario] = useState<Usuario | null | undefined>(undefined);
  const [rol, setRol] = useState<Rol | null | undefined>(undefined);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const puedeLeer = tienePermiso(sesion, "usuarios:leer");
  const puedeUsuarios = tienePermiso(sesion, "usuarios:gestionar");
  const puedeRoles = tienePermiso(sesion, "roles:gestionar");
  const puedeAuditar = tienePermiso(sesion, "identidad:auditar");
  const usuarios = useQuery({queryKey: ["identidad", "usuarios", busqueda, pagina],
    queryFn: () => identidadApi.usuarios(busqueda, pagina * 20), enabled: puedeLeer && seccion === "usuarios"});
  const roles = useQuery({queryKey: ["identidad", "roles"], queryFn: identidadApi.roles, enabled: puedeLeer});
  const permisos = useQuery({queryKey: ["identidad", "permisos"], queryFn: identidadApi.permisos, enabled: puedeLeer});
  const eventos = useQuery({queryKey: ["identidad", "eventos", pagina],
    queryFn: () => identidadApi.eventos(pagina * 20), enabled: puedeAuditar && seccion === "eventos"});
  async function ejecutar(accion: () => Promise<unknown>) {
    setOcupado(true); setError(""); setMensaje("");
    try {await accion(); setUsuario(undefined); setRol(undefined); setMensaje("Cambios guardados");
      await cache.invalidateQueries({queryKey: ["identidad"]});}
    catch (e) {setError(e instanceof Error ? e.message : "No se pudo guardar");}
    finally {setOcupado(false);}
  }
  const consulta = seccion === "usuarios" ? usuarios : seccion === "roles" ? roles : eventos;
  const total = seccion === "usuarios" ? usuarios.data?.total ?? 0 : undefined;
  return <PanelShell entryKey={entryKey} crumbs={[{label: "Administración"}]} kicker="Identidades"
    title="Usuarios y permisos" subtitle="Administra cuentas, roles y accesos con trazabilidad."
    onClose={closeTop} onCloseToKey={closeTop}>
    <div className="space-y-5 p-5 sm:p-6" aria-busy={ocupado}>
      {!puedeLeer ? <Notice tone="warning" title="Acceso restringido">No tienes permiso para consultar usuarios.</Notice> : <>
        <nav aria-label="Secciones de administración" className="flex flex-wrap gap-2">
          {(["usuarios", "roles", "eventos"] as const).filter((s) => s !== "eventos" || puedeAuditar).map((s) =>
            <Button key={s} variant={seccion === s ? "default" : "outline"} onClick={() => {
              setSeccion(s); setPagina(0); setUsuario(undefined); setRol(undefined); setError(""); setMensaje("");
            }}>{s === "usuarios" ? "Usuarios" : s === "roles" ? "Roles y permisos" : "Historial de cambios"}</Button>)}
        </nav>
        {error && <Notice tone="danger" title="No se pudo guardar">{error}</Notice>}
        {mensaje && <Notice tone="success" title={mensaje} />}
        {consulta.isPending && <p role="status">Cargando…</p>}
        {(consulta.error || roles.error || permisos.error) && <Notice tone="danger" title="No se pudieron cargar los datos">
          <Button variant="outline" onClick={() => {
            void consulta.refetch(); void roles.refetch(); void permisos.refetch();
          }}>Reintentar</Button></Notice>}
        {seccion === "usuarios" && <>
          <form className="flex flex-wrap items-end gap-3" onSubmit={(event) => {
            event.preventDefault(); setBusqueda(textoFormulario(new FormData(event.currentTarget), "busqueda")); setPagina(0);
          }}><CampoIdentidad name="busqueda" label="Buscar por correo" required={false} />
            <Button type="submit" variant="outline">Buscar</Button>
          </form>
          {puedeUsuarios && <Button disabled={ocupado} onClick={() => setUsuario(null)}>Crear usuario</Button>}
          {usuario !== undefined && roles.data && <EditorUsuario key={usuario?.id ?? "nuevo"} usuario={usuario}
            roles={roles.data} ocupado={ocupado} guardar={(datos) => ejecutar(async () => {
              if (usuario) {
                await identidadApi.editarUsuario(usuario.id, {nombres: textoFormulario(datos, "nombres"),
                  apellidos: textoFormulario(datos, "apellidos"), codigo_rol: textoFormulario(datos, "codigo_rol"),
                  activo: datos.get("activo") === "on", motivo: textoFormulario(datos, "motivo")});
              } else {
                await identidadApi.crearUsuario({correo: textoFormulario(datos, "correo"), contrasena: comprobarContrasena(datos),
                  nombres: textoFormulario(datos, "nombres"), apellidos: textoFormulario(datos, "apellidos"),
                  codigo_rol: textoFormulario(datos, "codigo_rol"), motivo: textoFormulario(datos, "motivo")});
              }
            })} cancelar={() => setUsuario(undefined)} />}
          {usuarios.data?.elementos.length === 0 && <Notice title="No hay usuarios para esta búsqueda" />}
          <ul className="space-y-3">{usuarios.data?.elementos.map((u) => <li key={u.id} className="space-y-2 rounded-xl border border-border p-4">
            <p className="break-words font-medium text-text-primary">{u.nombres} {u.apellidos}</p>
            <p className="break-words text-sm text-text-secondary">{u.correo} · {u.codigo_rol} · {u.activo ? "Activo" : "Inactivo"}</p>
            <p className="text-sm text-text-secondary">{u.correo_verificado_en ? "Correo verificado" : "Correo sin verificar"}</p>
            {puedeUsuarios && <div className="flex flex-wrap gap-2">
              <Button variant="outline" disabled={ocupado} onClick={() => setUsuario(u)}>Editar {u.nombres}</Button>
              <Button variant="outline" disabled={ocupado} onClick={() => void ejecutar(() => identidadApi.revocarUsuario(u.id))}>Revocar sesiones de {u.nombres}</Button>
            </div>}
          </li>)}</ul>
        </>}
        {seccion === "roles" && <>
          {puedeRoles && <Button disabled={ocupado} onClick={() => setRol(null)}>Crear rol</Button>}
          {rol !== undefined && permisos.data && <EditorRol key={rol?.codigo ?? "nuevo"} rol={rol}
            catalogo={permisos.data} ocupado={ocupado} cancelar={() => setRol(undefined)} guardar={(datos, seleccionados) =>
              ejecutar(() => rol ? identidadApi.editarRol(rol.codigo, {nombre: textoFormulario(datos, "nombre"),
                permisos: seleccionados, motivo: textoFormulario(datos, "motivo")}) : identidadApi.crearRol({
                codigo: textoFormulario(datos, "codigo"), nombre: textoFormulario(datos, "nombre"),
                permisos: seleccionados, motivo: textoFormulario(datos, "motivo")}))}
            eliminar={(motivo) => rol ? ejecutar(() => identidadApi.eliminarRol(rol.codigo, motivo)) : Promise.resolve()} />}
          <ul className="space-y-3">{roles.data?.map((r) => <li key={r.id} className="space-y-2 rounded-xl border border-border p-4">
            <p className="font-medium text-text-primary">{r.nombre}</p>
            <p className="break-words text-sm text-text-secondary">{r.codigo} · {r.sistema ? "Rol del sistema" : "Rol personalizado"}</p>
            <ul className="space-y-1 break-words text-sm text-text-secondary">{r.permisos.map((p) => <li key={p}>{permisos.data?.[p] ?? p} ({p})</li>)}</ul>
            {puedeRoles && !r.sistema && <Button variant="outline" disabled={ocupado} onClick={() => setRol(r)}>Editar {r.nombre}</Button>}
          </li>)}</ul>
        </>}
        {seccion === "eventos" && <>
          {eventos.data?.length === 0 && <Notice title="No hay eventos en esta página" />}
          <ol className="space-y-3">{eventos.data?.map((e) => <li key={e.id} className="space-y-2 rounded-xl border border-border p-4">
            <p className="font-medium text-text-primary">{e.accion}</p>
            <p className="break-words text-sm text-text-secondary">{new Date(e.creado_en).toLocaleString("es")} · Actor: {e.actor_id ?? "Canal público u operativo"}</p>
            <p className="break-words text-sm text-text-secondary">Objetivo: {e.objetivo_id ?? "Sin objetivo"}</p>
            <pre className="whitespace-pre-wrap break-all text-xs text-text-secondary">{JSON.stringify(e.detalle, null, 2)}</pre>
          </li>)}</ol>
        </>}
        {seccion !== "roles" && <nav aria-label="Páginas de resultados" className="flex flex-wrap items-center gap-3">
          <Button variant="outline" disabled={pagina === 0 || consulta.isFetching} onClick={() => setPagina((p) => p - 1)}>Anterior</Button>
          <span className="text-sm text-text-secondary">Página {pagina + 1}{total !== undefined ? ` · ${total} usuarios` : ""}</span>
          <Button variant="outline" disabled={consulta.isFetching || (total !== undefined ? (pagina + 1) * 20 >= total : (eventos.data?.length ?? 0) < 20)}
            onClick={() => setPagina((p) => p + 1)}>Siguiente</Button>
        </nav>}
      </>}
    </div>
  </PanelShell>;
}

function EditorUsuario({usuario, roles, ocupado, guardar, cancelar}: {usuario: Usuario | null; roles: Rol[];
  ocupado: boolean; guardar: (datos: FormData) => Promise<void>; cancelar: () => void}) {
  function submit(event: FormEvent<HTMLFormElement>) {event.preventDefault(); void guardar(new FormData(event.currentTarget));}
  return <form onSubmit={submit} className="space-y-3 rounded-xl border border-border p-4">
    <h3 className="font-semibold text-text-primary">{usuario ? "Editar usuario" : "Nuevo usuario"}</h3>
    <CampoIdentidad name="nombres" label="Nombres" defaultValue={usuario?.nombres} />
    <CampoIdentidad name="apellidos" label="Apellidos" defaultValue={usuario?.apellidos} />
    {!usuario && <>
      <CampoIdentidad name="correo" label="Correo electrónico" type="email" maxLength={255} autoComplete="off" />
      <CampoIdentidad name="contrasena" label="Contraseña inicial" type="password" maxLength={72} minLength={8} autoComplete="new-password" />
      <CampoIdentidad name="confirmacion" label="Confirmar contraseña" type="password" maxLength={72} autoComplete="new-password" />
    </>}
    <FormField label="Rol" required>{(field) => <Select name="codigo_rol" defaultValue={usuario?.codigo_rol ?? "ciudadano"} required>
      <SelectTrigger {...field}><SelectValue /></SelectTrigger>
      <SelectContent>{roles.map((r) => <SelectItem key={r.id} value={r.codigo}>{r.nombre}</SelectItem>)}</SelectContent>
    </Select>}</FormField>
    {usuario && <FormField label="Cuenta activa">{(field) => <Checkbox {...field} name="activo" defaultChecked={usuario.activo} />}</FormField>}
    <CampoIdentidad name="motivo" label="Motivo del cambio" minLength={10} maxLength={500} />
    <div className="flex flex-wrap gap-2"><Button type="submit" disabled={ocupado}>Guardar usuario</Button>
      <Button type="button" variant="outline" disabled={ocupado} onClick={cancelar}>Cancelar</Button></div>
  </form>;
}
function EditorRol({rol, catalogo, ocupado, guardar, eliminar, cancelar}: {rol: Rol | null;
  catalogo: Record<string, string>; ocupado: boolean; guardar: (datos: FormData, permisos: string[]) => Promise<void>;
  eliminar: (motivo: string) => Promise<void>; cancelar: () => void}) {
  const [seleccionados, setSeleccionados] = useState(rol?.permisos ?? []);
  const [accion, setAccion] = useState<"guardar" | "eliminar">("guardar");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const datos = new FormData(event.currentTarget);
    if (accion === "eliminar") void eliminar(textoFormulario(datos, "motivo"));
    else void guardar(datos, seleccionados);
  }
  return <form onSubmit={submit} className="space-y-3 rounded-xl border border-border p-4">
    <h3 className="font-semibold text-text-primary">{rol ? "Editar rol" : "Nuevo rol"}</h3>
    {!rol && <CampoIdentidad name="codigo" label="Código del rol" minLength={3} maxLength={50} />}
    <CampoIdentidad name="nombre" label="Nombre del rol" defaultValue={rol?.nombre} minLength={3} />
    <fieldset className="space-y-2"><legend className="mb-2 font-medium text-text-primary">Permisos concedidos</legend>
      {Object.entries(catalogo).map(([codigo, nombre]) => <div key={codigo} className="flex items-start gap-3">
        <Checkbox id={`permiso-${codigo}`} checked={seleccionados.includes(codigo)} onCheckedChange={(checked) =>
          setSeleccionados((p) => checked === true ? [...p, codigo] : p.filter((v) => v !== codigo))} />
        <Label htmlFor={`permiso-${codigo}`} className="break-words text-sm text-text-secondary">{nombre} ({codigo})</Label>
      </div>)}
    </fieldset>
    <CampoIdentidad name="motivo" label="Motivo del cambio" minLength={10} maxLength={500} />
    <div className="flex flex-wrap gap-2"><Button type="submit" disabled={ocupado} onClick={() => setAccion("guardar")}>Guardar rol</Button>
      {rol && <Button type="submit" variant="destructive" disabled={ocupado} onClick={() => setAccion("eliminar")}>Eliminar rol sin usuarios</Button>}
      <Button type="button" variant="outline" disabled={ocupado} onClick={cancelar}>Cancelar</Button></div>
  </form>;
}
