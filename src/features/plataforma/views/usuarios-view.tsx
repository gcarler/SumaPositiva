"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  UserPlus,
  Users,
  UserRoundCheck,
  ShieldCheck,
  KeyRound,
  Pencil,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { CollectionLayout, CollectionViewToggle, type CollectionViewMode } from "@/shared/ui/collection-view";
import { useCollectionView } from "@/core/preferences/collection-view-store";
import { PageHeader } from "@/shared/ui/page-header";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Notice } from "@/shared/ui/notice";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { usePanels } from "@/core/panels/panel-store";
import { useSesionStore, tienePermiso } from "@/features/sesion/state/session-store";
import { identidadApi, type Usuario } from "@/features/sesion/services/identidad-api";

const ROLES_PREDEFINIDOS = [
  { id: "todos", label: "Todos los roles" },
  { id: "administrador_identidades", label: "Administrador de identidades" },
  { id: "autoridad_distrital", label: "Autoridad distrital" },
  { id: "facilitador_mesa", label: "Facilitador de mesa" },
  { id: "auditor_forense", label: "Auditor forense" },
  { id: "ciudadano", label: "Ciudadano" },
];

const rolMeta: Record<string, { label: string; style: string; token?: "authority" }> = {
  administrador_identidades: { label: "Administrador", style: "border-ember/30 bg-ember-soft text-ember" },
  facilitador_mesa: { label: "Facilitador", style: "border-success/30 bg-success-soft text-success" },
  auditor_forense: { label: "Auditor", style: "border-info/30 bg-info-soft text-info" },
  autoridad_distrital: { label: "Autoridad", style: "border", token: "authority" },
  ciudadano: { label: "Ciudadano", style: "border-border bg-surface-2 text-text-secondary" },
};

const LIMITE_POR_PAGINA = 20;

export function UsuariosGestionView() {
  const [vista, setVista] = useCollectionView("usuarios", "lista");
  const sesion = useSesionStore((state) => state.sesion);
  const { openPanel } = usePanels();
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(0);
  const [rolFiltro, setRolFiltro] = useState<string>("todos");

  const permitido = tienePermiso(sesion, "usuarios:leer");
  const puedeGestionar = tienePermiso(sesion, "usuarios:gestionar");

  // Consulta paginada principal contra PostgreSQL
  const usuariosQuery = useQuery({
    queryKey: ["identidad", "usuarios", busqueda, pagina],
    queryFn: () => identidadApi.usuarios(busqueda, pagina * LIMITE_POR_PAGINA, LIMITE_POR_PAGINA),
    enabled: permitido,
  });

  // Consulta global para métricas y KPIs consolidados
  const kpisQuery = useQuery({
    queryKey: ["identidad", "usuarios", "kpis-resumen"],
    queryFn: () => identidadApi.usuarios("", 0, 100),
    enabled: permitido,
  });

  // Roles dinámicos registrados en PostgreSQL
  const rolesQuery = useQuery({
    queryKey: ["identidad", "roles"],
    queryFn: () => identidadApi.roles(),
    enabled: permitido,
  });

  const rolesOpciones = useMemo(() => {
    if (!rolesQuery.data || rolesQuery.data.length === 0) {
      return ROLES_PREDEFINIDOS;
    }
    const dinamicos = rolesQuery.data.map((r) => ({ id: r.codigo, label: r.nombre }));
    const existen = new Set(dinamicos.map((d) => d.id));
    const extra = ROLES_PREDEFINIDOS.filter((p) => p.id !== "todos" && !existen.has(p.id));
    return [{ id: "todos", label: "Todos los roles" }, ...dinamicos, ...extra];
  }, [rolesQuery.data]);

  const listaUsuarios = usuariosQuery.data?.elementos ?? [];

  const filtrados = useMemo(() => {
    if (rolFiltro === "todos") return listaUsuarios;
    return listaUsuarios.filter((u) => u.codigo_rol === rolFiltro);
  }, [listaUsuarios, rolFiltro]);

  const totalCuentas = usuariosQuery.data?.total ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(totalCuentas / LIMITE_POR_PAGINA));

  // KPIs reales sobre el catálogo institucional
  const todosUsuarios = kpisQuery.data?.elementos ?? listaUsuarios;
  const totalGeneral = kpisQuery.data?.total ?? totalCuentas;
  const activas = todosUsuarios.filter((u) => u.activo).length;
  const facilitadores = todosUsuarios.filter((u) => u.codigo_rol === "facilitador_mesa").length;
  const auditores = todosUsuarios.filter((u) => u.codigo_rol === "auditor_forense").length;
  const administradores = todosUsuarios.filter((u) => u.codigo_rol === "administrador_identidades").length;

  const kpis = [
    {
      label: "Total usuarios",
      value: kpisQuery.isLoading ? "..." : totalGeneral,
      icon: Users,
      note: `${activas} cuentas activas en PostgreSQL`,
    },
    {
      label: "Facilitadores",
      value: kpisQuery.isLoading ? "..." : facilitadores,
      icon: UserRoundCheck,
      note: "Gestión territorial y mesas",
    },
    {
      label: "Auditores",
      value: kpisQuery.isLoading ? "..." : auditores,
      icon: ShieldCheck,
      note: "Acceso forense e inmutabilidad",
    },
    {
      label: "Administradores",
      value: kpisQuery.isLoading ? "..." : administradores,
      icon: KeyRound,
      note: "Gestión de identidades",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Seguridad Humana Integral"
        title="Usuarios y roles"
        description="Administra accesos, responsabilidades y cuentas institucionales en PostgreSQL."
        action={
          puedeGestionar ? (
            <Button
              variant="ember"
              onClick={() => openPanel("usuario-invitar", {})}
              className="gap-1.5"
            >
              <UserPlus className="size-4" aria-hidden="true" />
              Invitar usuario
            </Button>
          ) : undefined
        }
      />

      {!permitido ? (
        <Notice tone="warning" title="Permiso requerido">
          Se requiere una sesión institucional con permiso de lectura de usuarios (<code>usuarios:leer</code>).
        </Notice>
      ) : (
        <>
          <section aria-label="Resumen de usuarios" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map(({ label, value, icon: Icon, note }) => (
              <article key={label} className="rounded-2xl border border-border bg-surface-1 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-text-secondary">{label}</p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight text-text-primary">{value}</p>
                  </div>
                  <span className="rounded-xl bg-ember-soft p-2.5 text-ember">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                </div>
                <p className="mt-3 text-xs text-text-tertiary">{note}</p>
              </article>
            ))}
          </section>

          <section className="space-y-4 rounded-2xl border border-border bg-surface-1 p-4 sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
              <div className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-tertiary"
                  aria-hidden="true"
                />
                <Input
                  type="search"
                  aria-label="Buscar por correo o identificador"
                  placeholder="Buscar usuario por correo…"
                  className="pl-9"
                  value={busqueda}
                  onChange={(event) => {
                    setBusqueda(event.target.value);
                    setPagina(0);
                  }}
                />
              </div>
              <div className="w-full lg:w-72">
                <Select
                  value={rolFiltro}
                  onValueChange={(value) => {
                    setRolFiltro(value);
                    setPagina(0);
                  }}
                >
                  <SelectTrigger aria-label="Filtrar por rol">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {rolesOpciones.map((rol) => (
                      <SelectItem key={rol.id} value={rol.id}>
                        {rol.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void usuariosQuery.refetch();
                  void kpisQuery.refetch();
                }}
                disabled={usuariosQuery.isFetching}
                className="gap-1.5"
              >
                <RefreshCw
                  className={`size-3.5 ${usuariosQuery.isFetching ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
                Actualizar
              </Button>
            </div>

            {usuariosQuery.error && (
              <Notice tone="danger" title="Error al consultar usuarios">
                Ocurrió un error al cargar la lista desde el servidor.{" "}
                <Button
                  variant="unstyled"
                  className="underline font-medium ml-1"
                  onClick={() => void usuariosQuery.refetch()}
                >
                  Reintentar
                </Button>
              </Notice>
            )}

            <CollectionViewToggle value={vista} onValueChange={setVista} label="Vista del directorio de usuarios" />
            {vista === "lista" && <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,.8fr)_auto] gap-4 border-b border-border px-3 pb-3 text-xs font-medium uppercase tracking-wide text-text-tertiary md:grid">
              <span>Usuario</span>
              <span>Correo electrónico</span>
              <span>Rol</span>
              <span>Verificación</span>
              <span className="sr-only">Acciones</span>
            </div>}

            <CollectionLayout view={vista} className={vista === "lista" ? "md:gap-0" : undefined}>
              {usuariosQuery.isLoading ? (
                <div className="p-8 text-center text-sm text-text-secondary" role="status">
                  Cargando directorio de usuarios desde PostgreSQL…
                </div>
              ) : filtrados.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center">
                  <p className="font-medium text-text-primary">No hay coincidencias</p>
                  <p className="mt-1 text-sm text-text-secondary">
                    No se encontraron usuarios para el criterio de búsqueda o filtro seleccionado.
                  </p>
                </div>
              ) : (
                filtrados.map((usuario) => (
                  <FilaUsuario
                    key={usuario.id}
                    usuario={usuario}
                    vista={vista}
                    abrirDetalle={() => openPanel("usuario-detalle", { usuarioId: usuario.id })}
                    editar={puedeGestionar ? () => openPanel("usuario-editor", { usuarioId: usuario.id }) : undefined}
                  />
                ))
              )}
            </CollectionLayout>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border pt-4 text-sm text-text-secondary">
              <span>
                Mostrando {filtrados.length} de {totalCuentas} cuentas registradas
              </span>
              {totalPaginas > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagina === 0 || usuariosQuery.isFetching}
                    onClick={() => setPagina((p) => Math.max(0, p - 1))}
                  >
                    Anterior
                  </Button>
                  <span className="text-xs text-text-tertiary">
                    Página {pagina + 1} de {totalPaginas}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagina >= totalPaginas - 1 || usuariosQuery.isFetching}
                    onClick={() => setPagina((p) => p + 1)}
                  >
                    Siguiente
                  </Button>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function FilaUsuario({
  vista,
  usuario,
  abrirDetalle,
  editar,
}: {
  vista: CollectionViewMode;
  usuario: Usuario;
  abrirDetalle: () => void;
  editar?: () => void;
}) {
  const meta = rolMeta[usuario.codigo_rol] ?? {
    label: usuario.codigo_rol,
    style: "border-border bg-surface-2 text-text-secondary",
  };
  const nombreCompleto = `${usuario.nombres} ${usuario.apellidos}`.trim() || usuario.correo;
  const iniciales = (
    (usuario.nombres[0] ?? "") + (usuario.apellidos[0] ?? (usuario.correo[0] ?? ""))
  ).toLocaleUpperCase("es");

  return (
    <article className={vista === "tarjetas" ? "flex flex-col gap-4 rounded-xl border border-border bg-surface-0 p-5" : "grid gap-3 rounded-xl border border-border bg-surface-0 p-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,.8fr)_auto] md:items-center md:gap-4 md:rounded-none md:border-0 md:border-b md:bg-transparent md:px-3 md:py-3"}>
      <Button
        type="button"
        variant="unstyled"
        onClick={abrirDetalle}
        className="group flex min-w-0 items-center gap-3 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span
          aria-hidden="true"
          className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-ember-soft text-sm font-semibold text-ember"
        >
          {iniciales}
          <span
            className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-surface-0 ${
              usuario.activo ? "bg-success" : "bg-text-tertiary"
            }`}
          />
        </span>
        <span className="min-w-0">
          <span className="block truncate font-medium text-text-primary group-hover:text-ember">
            {nombreCompleto}
          </span>
          <span className="mt-0.5 block truncate text-xs text-text-tertiary md:hidden">
            {usuario.correo}
          </span>
        </span>
        <span className="sr-only">Ver detalle de {nombreCompleto}</span>
      </Button>

      <p className={vista === "tarjetas" ? "break-all text-sm text-text-secondary" : "hidden min-w-0 truncate text-sm text-text-secondary md:block"}>{usuario.correo}</p>

      <div className="flex items-center justify-between gap-2 md:justify-start">
        <Badge
          className={`${meta.style} max-w-full whitespace-normal`}
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
        <span className={vista === "tarjetas" ? "text-xs text-text-tertiary" : "text-xs text-text-tertiary md:hidden"}>
          {usuario.activo ? "Activa" : "Inactiva"}
        </span>
      </div>

      <div>
        <p className={vista === "tarjetas" ? "text-xs text-text-tertiary" : "text-xs text-text-tertiary md:hidden"}>Estado de verificación</p>
        <p className="text-sm text-text-secondary">
          {usuario.correo_verificado_en ? "Verificado" : "Sin verificar"}
        </p>
      </div>

      <div className={vista === "tarjetas" ? "mt-auto flex flex-wrap justify-end gap-2 border-t border-border pt-3" : "flex justify-end gap-2 border-t border-border pt-3 md:border-0 md:pt-0"}>
        <Button variant="outline" size="sm" className={vista === "lista" ? "md:hidden" : undefined} onClick={abrirDetalle}>
          Ver perfil
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
        {editar && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={editar}
            aria-label={`Editar ${nombreCompleto}`}
          >
            <Pencil className="size-4" aria-hidden="true" />
          </Button>
        )}
      </div>
    </article>
  );
}
