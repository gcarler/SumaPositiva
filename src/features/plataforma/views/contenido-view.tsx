"use client";

import {ArquitecturaPolitica} from "@/features/politicas/components/arquitectura-politica";

import Link from "next/link";
import Image from "next/image";
import {useQuery} from "@tanstack/react-query";
import {toast} from "sonner";
import {
  Newspaper,
  Plus,
  Edit3,
  Trash2,
  Eye,
  Play,
  Layers,
  Sparkles,
  Image as ImageIcon,
} from "lucide-react";
import {PageHeader} from "@/shared/ui/page-header";
import {Button} from "@/shared/ui/button";
import {Badge} from "@/shared/ui/badge";
import {StatusBadge, type StatusTone} from "@/shared/ui/status-badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from "@/shared/ui/tabs";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from "@/shared/ui/table";
import {useSesionStore} from "@/features/sesion/state/session-store";
import {usePanels} from "@/core/panels/panel-store";
import type {Noticia, EstadoNoticia} from "@/features/noticias/models/noticia";
import {useEliminarNoticia, useGuardarNoticia, useNoticiasGestion} from "@/features/noticias/services/use-noticias-queries";
import {plataformaApi} from "../services/plataforma-api";
import {EstadoConsulta} from "../components/estado-consulta";
import {puedeEditar} from "../models/acceso";
import { CollectionLayout, CollectionViewToggle } from "@/shared/ui/collection-view";
import { useCollectionView } from "@/core/preferences/collection-view-store";

export function ContenidoView({ soloNoticias = false }: { soloNoticias?: boolean } = {}) {
  const [vista, setVista] = useCollectionView(soloNoticias ? "noticias" : "contenido", "lista");
  const sesion = useSesionStore((s) => s.sesion);
  const { openPanel } = usePanels();
  const esEditor = puedeEditar(sesion, "contenido");

  const noticiasQuery = useNoticiasGestion();
  const noticias = noticiasQuery.data ?? [];
  const guardarNoticia = useGuardarNoticia();
  const eliminarNoticia = useEliminarNoticia();

  // Consultas metodológicas históricas
  const fases = useQuery({
    queryKey: ["plataforma", "fases"],
    queryFn: plataformaApi.fases,
    enabled: !soloNoticias,
  });
  const lineas = useQuery({
    queryKey: ["plataforma", "lineas"],
    queryFn: plataformaApi.lineas,
    enabled: !soloNoticias,
  });
  const aportes = useQuery({
    queryKey: ["plataforma", "aportes"],
    queryFn: () => plataformaApi.aportes(),
    enabled: !soloNoticias,
  });

  const totalNoticias = noticias.length;
  const publicadas = noticias.filter((n) => n.estado === "publicada").length;
  const borradores = noticias.filter((n) => n.estado === "borrador").length;
  const multimediaCount = noticias.filter(
    (n) => n.videoUrl || (n.galeria && n.galeria.length > 0)
  ).length;

  const handleEliminar = (id: string, titulo: string) => {
    if (!esEditor) return;
    if (confirm(`¿Eliminar la noticia "${titulo}"?`)) {
      void eliminarNoticia.mutateAsync(id)
        .then(() => toast.success("Noticia eliminada correctamente"))
        .catch(() => toast.error("No se pudo eliminar la noticia."));
    }
  };

  const handleAlternarEstado = (noticia: Noticia) => {
    if (!esEditor) return;
    const nuevo: EstadoNoticia =
      noticia.estado === "publicada" ? "borrador" : "publicada";
    const { id, slug: _slug, publicadaEn: _publicadaEn, ...datos } = noticia;
    void guardarNoticia.mutateAsync({ id, datos: { ...datos, estado: nuevo } })
      .then(() => toast.success(`Noticia ahora marcada como ${nuevo === "publicada" ? "PUBLICADA" : "BORRADOR"}`))
      .catch(() => toast.error("No se pudo cambiar el estado de la noticia."));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={soloNoticias ? "Gestión de Noticias" : "Gestión de Contenido y Comunicación"}
        description={soloNoticias
          ? "Crea, revisa, publica y organiza las noticias y comunicados institucionales."
          : "Administración editorial de noticias, comunicados institucionales y fases metodológicas de la política pública."}
        action={
          esEditor && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                asChild
                className="gap-1.5"
              >
                <Link href="/plataforma/configuracion#heros">
                  <ImageIcon className="size-4 text-[var(--ember)]" />
                  <span>Gestionar Heros e Imágenes</span>
                </Link>
              </Button>
              {!soloNoticias && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openPanel("fases-control", {})}
                >
                  Control de Fases de Política
                </Button>
              )}
              <Button
                variant="default"
                size="sm"
                onClick={() => openPanel("noticia-editor", {})}
                className="gap-1.5"
              >
                <Plus className="size-4" />
                <span>Nueva Noticia</span>
              </Button>
            </div>
          )
        }
      />

      <CollectionViewToggle value={vista} onValueChange={setVista} label={soloNoticias ? "Vista de las noticias" : "Vista de los contenidos"} />
      <Tabs defaultValue={soloNoticias ? "noticias" : "arquitectura"} className="space-y-6">
        {!soloNoticias && (
          <TabsList className="h-auto flex-wrap">
            <TabsTrigger value="arquitectura">Dimensiones, Líneas y Sublíneas</TabsTrigger>
            <TabsTrigger value="noticias" className="gap-2">
              <Newspaper className="size-4" />
              <span>Noticias y Comunicados ({totalNoticias})</span>
            </TabsTrigger>
            <TabsTrigger value="metodologia" className="gap-2">
              <Layers className="size-4" />
              <span>Estructura Metodológica</span>
            </TabsTrigger>
          </TabsList>
        )}

        {/* ================= PESTAÑA: NOTICIAS Y COMUNICADOS ================= */}
        {!soloNoticias && <TabsContent value="arquitectura"><ArquitecturaPolitica vista={vista} /></TabsContent>}
        <TabsContent value="noticias" className="space-y-6">
          {noticiasQuery.isError && <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-danger/30 bg-danger-soft p-4 text-sm"><span>No se pudieron cargar las noticias desde el servidor.</span><Button variant="outline" size="sm" onClick={() => void noticiasQuery.refetch()}>Reintentar</Button></div>}
          {/* Métricas editoriales */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
              <span className="text-xs text-[var(--text-secondary)]">Total Artículos</span>
              <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
                {totalNoticias}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
              <span className="text-xs text-[var(--text-secondary)]">Publicadas Activas</span>
              <p className="mt-1 text-2xl font-bold text-[var(--success)]">
                {publicadas}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
              <span className="text-xs text-[var(--text-secondary)]">Borradores / En Revisión</span>
              <p className="mt-1 text-2xl font-bold text-[var(--warning)]">
                {borradores}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
              <span className="text-xs text-[var(--text-secondary)]">Con Video o Galería</span>
              <p className="mt-1 text-2xl font-bold text-[var(--ember)]">
                {multimediaCount}
              </p>
            </div>
          </div>

          {/* Tabla de Noticias */}
          {vista === "tarjetas" && !noticiasQuery.isPending && noticias.length > 0 ? (
            <CollectionLayout view={vista} aria-label="Tarjetas de noticias y comunicados">
              {noticias.slice().sort((a, b) => (a.ordenPrioridad ?? 999) - (b.ordenPrioridad ?? 999)).map((n) => (
                <article key={n.id} className="flex flex-col gap-4 overflow-hidden rounded-xl border border-border bg-surface-1 p-5">
                  {n.imagenPortada && <Image unoptimized src={n.imagenPortada} alt={n.titulo} width={640} height={360} className="aspect-video w-full rounded-lg object-cover" />}
                  <div className="flex flex-wrap gap-2"><Badge variant="outline">#{n.ordenPrioridad ?? 1}</Badge><Badge variant="secondary">{n.categoria.replaceAll("_", " ")}</Badge>{n.destacada && <Badge variant="ember">Destacada</Badge>}</div>
                  <h2 className="break-words font-semibold">{n.titulo}</h2>
                  <p className="text-xs text-text-secondary">{n.autor} · {new Date(n.publicadaEn).toLocaleDateString("es-CO", {day: "numeric", month: "short", year: "numeric"})}</p>
                  <div className="flex flex-wrap gap-2"><StatusBadge tone={n.estado === "publicada" ? "success" : n.estado === "borrador" ? "warning" : "neutral"}>{n.estado.toUpperCase()}</StatusBadge>{n.videoUrl && <Badge variant="secondary">Video</Badge>}{!!n.galeria?.length && <Badge variant="secondary">Galería: {n.galeria.length}</Badge>}</div>
                  <div className="mt-auto flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => openPanel("noticia", { noticiaId: n.id })} aria-label={`Vista previa de ${n.titulo}`}>Vista previa</Button>
                    {esEditor && <>
                      <Button variant="outline" size="sm" onClick={() => openPanel("noticia-editor", { noticiaId: n.id })} aria-label={`Editar ${n.titulo}`}>Editar</Button>
                      <Button variant="outline" size="sm" onClick={() => handleAlternarEstado(n)} aria-label={`Cambiar estado de ${n.titulo}`}>{n.estado === "publicada" ? "Pasar a borrador" : "Publicar"}</Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEliminar(n.id, n.titulo)} aria-label={`Eliminar ${n.titulo}`} className="text-danger">Eliminar</Button>
                    </>}
                  </div>
                </article>
              ))}
            </CollectionLayout>
          ) : <div className="min-w-0 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface-1)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Prioridad</TableHead>
                  <TableHead>Artículo / Título</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Multimedia</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {noticiasQuery.isPending ? <TableRow><TableCell colSpan={7} className="py-8 text-center text-[var(--text-secondary)]">Cargando noticias…</TableCell></TableRow> : noticias.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-[var(--text-secondary)]">
                      No hay noticias creadas. Pulsa &quot;Nueva Noticia&quot; para registrar la primera.
                    </TableCell>
                  </TableRow>
                ) : (
                  noticias
                    .slice()
                    .sort((a, b) => (a.ordenPrioridad ?? 999) - (b.ordenPrioridad ?? 999))
                    .map((n) => {
                      const toneEstado: StatusTone =
                        n.estado === "publicada"
                          ? "success"
                          : n.estado === "borrador"
                          ? "warning"
                          : "neutral";

                      return (
                        <TableRow key={n.id}>
                          {/* Prioridad */}
                          <TableCell className="font-mono text-xs font-semibold">
                            <div className="flex items-center gap-1">
                              <Badge variant="outline" className="text-xs">
                                #{n.ordenPrioridad ?? 1}
                              </Badge>
                              {n.destacada && (
                                <Sparkles className="size-3 text-[var(--ember)]" />
                              )}
                            </div>
                          </TableCell>

                          {/* Título y portada */}
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {n.imagenPortada ? (
                                <img
                                  src={n.imagenPortada}
                                  alt={n.titulo}
                                  className="size-10 rounded-md object-cover border border-[var(--border)] shrink-0"
                                />
                              ) : (
                                <div className="size-10 rounded-md bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center shrink-0 text-[var(--text-tertiary)]">
                                  <Newspaper className="size-4" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-medium text-xs sm:text-sm text-[var(--text-primary)] line-clamp-1">
                                  {n.titulo}
                                </p>
                                <p className="text-[11px] text-[var(--text-secondary)] truncate">
                                  {n.autor}
                                </p>
                              </div>
                            </div>
                          </TableCell>

                          {/* Categoría */}
                          <TableCell>
                            <Badge variant="secondary" className="text-[10px]">
                              {n.categoria.replace("_", " ")}
                            </Badge>
                          </TableCell>

                          {/* Estado */}
                          <TableCell>
                              {esEditor ? <Button
                                variant="unstyled"
                                size="unstyled"
                                type="button"
                                onClick={() => handleAlternarEstado(n)}
                                title="Haz clic para alternar estado"
                                className="cursor-pointer"
                              >
                                <StatusBadge tone={toneEstado}>
                                  {n.estado.toUpperCase()}
                                </StatusBadge>
                              </Button> : <StatusBadge tone={toneEstado}>{n.estado.toUpperCase()}</StatusBadge>}
                          </TableCell>

                          {/* Multimedia */}
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {n.videoUrl && (
                                <Badge variant="secondary" className="text-[10px] gap-1">
                                  <Play className="size-2.5 fill-current" />
                                  Video
                                </Badge>
                              )}
                              {n.galeria && n.galeria.length > 0 && (
                                <Badge variant="secondary" className="text-[10px] gap-1">
                                  <Layers className="size-2.5" />
                                  {n.galeria.length}
                                </Badge>
                              )}
                              {!n.videoUrl && (!n.galeria || n.galeria.length === 0) && (
                                <span className="text-[11px] text-[var(--text-tertiary)]">—</span>
                              )}
                            </div>
                          </TableCell>

                          {/* Fecha */}
                          <TableCell className="text-xs text-[var(--text-secondary)] whitespace-nowrap">
                            {new Date(n.publicadaEn).toLocaleDateString("es-CO", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </TableCell>

                          {/* Acciones */}
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openPanel("noticia", { noticiaId: n.id })}
                                className="size-8 p-0"
                                title="Ver vista previa pública"
                                aria-label={`Vista previa de ${n.titulo}`}
                              >
                                <Eye className="size-4" />
                              </Button>
                              {esEditor && <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openPanel("noticia-editor", { noticiaId: n.id })}
                                  className="size-8 p-0 text-[var(--ember)]"
                                  title="Editar noticia"
                                  aria-label={`Editar ${n.titulo}`}
                                >
                                  <Edit3 className="size-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEliminar(n.id, n.titulo)}
                                  className="size-8 p-0 text-[var(--danger)]"
                                  title="Eliminar noticia"
                                  aria-label={`Eliminar ${n.titulo}`}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </>}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                )}
              </TableBody>
            </Table>
          </div>}
        </TabsContent>

        {/* ================= PESTAÑA: ESTRUCTURA METODOLÓGICA ================= */}
        {!soloNoticias && <TabsContent value="metodologia" className="space-y-6">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Fases Metodológicas</h2>
            <EstadoConsulta
              cargando={fases.isPending}
              error={fases.error}
              reintentar={fases.refetch}
            />
            <ul className={vista === "tarjetas" ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3" : "space-y-3"}>
              {fases.data?.map((f) => (
                <li key={f.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
                  <h3 className="font-medium text-[var(--text-primary)]">{f.nombre}</h3>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {f.estado} · {f.progreso_porcentaje}% de avance
                  </p>
                </li>
              ))}
            </ul>
            {fases.data?.length === 0 && <p className="text-sm text-[var(--text-secondary)]">No hay fases configuradas.</p>}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Líneas estratégicas</h2>
            <EstadoConsulta
              cargando={lineas.isPending}
              error={lineas.error}
              reintentar={lineas.refetch}
            />
            <ul className={vista === "tarjetas" ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3" : "space-y-3"}>
              {lineas.data?.map((l) => (
                <li key={l.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
                  <h3 className="font-medium text-[var(--text-primary)]">{l.titulo}</h3>
                  <p className="text-sm text-[var(--text-secondary)]">{l.descripcion}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">{l.entidad_lider}</p>
                </li>
              ))}
            </ul>
            {lineas.data?.length === 0 && <p className="text-sm text-[var(--text-secondary)]">No hay líneas registradas.</p>}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Aportes ciudadanos</h2>
            <EstadoConsulta
              cargando={aportes.isPending}
              error={aportes.error}
              reintentar={aportes.refetch}
            />
            <ul className={vista === "tarjetas" ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3" : "space-y-3"}>
              {aportes.data?.elementos.map((a) => (
                <li key={a.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
                  <h3 className="font-medium text-[var(--text-primary)]">{a.titulo}</h3>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {a.tipo_aporte} · {a.estado}
                  </p>
                </li>
              ))}
            </ul>
            {aportes.data?.total === 0 && <p className="text-sm text-[var(--text-secondary)]">No hay aportes registrados.</p>}
          </section>
        </TabsContent>}
      </Tabs>
    </div>
  );
}
