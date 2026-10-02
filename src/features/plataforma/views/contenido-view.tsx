"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Newspaper,
  Plus,
  Edit3,
  Trash2,
  Eye,
  Play,
  Layers,
  Sparkles,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  Archive,
  Layers as DnpIcon,
} from "lucide-react";
import { PageHeader } from "@/shared/ui/page-header";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { StatusBadge, type StatusTone } from "@/shared/ui/status-badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/shared/ui/tabs";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/shared/ui/table";
import { useSesionStore } from "@/features/sesion/state/session-store";
import { usePanels } from "@/core/panels/panel-store";
import { useNoticiasStore } from "@/features/noticias/state/noticias-store";
import type { Noticia, EstadoNoticia } from "@/features/noticias/models/noticia";
import { plataformaApi } from "../services/plataforma-api";
import { EstadoConsulta } from "../components/estado-consulta";
import { puedeEditar } from "../models/acceso";

export function ContenidoView() {
  const sesion = useSesionStore((s) => s.sesion);
  const { openPanel } = usePanels();
  const esEditor = puedeEditar(sesion, "contenido");

  // Noticias Store
  const noticias = useNoticiasStore((s) => s.noticias);
  const cambiarEstado = useNoticiasStore((s) => s.cambiarEstado);
  const reordenarPrioridad = useNoticiasStore((s) => s.reordenarPrioridad);
  const eliminarNoticia = useNoticiasStore((s) => s.eliminarNoticia);

  // Consultas DNP históricas
  const fases = useQuery({
    queryKey: ["plataforma", "fases"],
    queryFn: plataformaApi.fases,
  });
  const lineas = useQuery({
    queryKey: ["plataforma", "lineas"],
    queryFn: plataformaApi.lineas,
  });
  const aportes = useQuery({
    queryKey: ["plataforma", "aportes"],
    queryFn: () => plataformaApi.aportes(),
  });

  const totalNoticias = noticias.length;
  const publicadas = noticias.filter((n) => n.estado === "publicada").length;
  const borradores = noticias.filter((n) => n.estado === "borrador").length;
  const multimediaCount = noticias.filter(
    (n) => n.videoUrl || (n.galeria && n.galeria.length > 0)
  ).length;

  const handleEliminar = (id: string, titulo: string) => {
    if (confirm(`¿Eliminar la noticia "${titulo}"?`)) {
      eliminarNoticia(id);
      toast.success("Noticia eliminada correctamente");
    }
  };

  const handleAlternarEstado = (noticia: Noticia) => {
    const nuevo: EstadoNoticia =
      noticia.estado === "publicada" ? "borrador" : "publicada";
    cambiarEstado(noticia.id, nuevo);
    toast.success(
      `Noticia ahora marcada como ${nuevo === "publicada" ? "PUBLICADA" : "BORRADOR"}`
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestión de Contenido y Comunicación"
        description="Administración editorial de noticias, comunicados institucionales y fases metodológicas de la política pública."
        action={
          esEditor && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openPanel("fases-control", {})}
              >
                Control de Fases DNP
              </Button>
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

      <Tabs defaultValue="noticias" className="space-y-6">
        <TabsList>
          <TabsTrigger value="noticias" className="gap-2">
            <Newspaper className="size-4" />
            <span>Noticias y Comunicados ({totalNoticias})</span>
          </TabsTrigger>
          <TabsTrigger value="dnp" className="gap-2">
            <DnpIcon className="size-4" />
            <span>Estructura DNP & Metodología</span>
          </TabsTrigger>
        </TabsList>

        {/* ================= PESTAÑA: NOTICIAS Y COMUNICADOS ================= */}
        <TabsContent value="noticias" className="space-y-6">
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
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] overflow-hidden">
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
                {noticias.length === 0 ? (
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
                            <Button
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
                            </Button>
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
                              >
                                <Eye className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openPanel("noticia-editor", { noticiaId: n.id })}
                                className="size-8 p-0 text-[var(--ember)]"
                                title="Editar noticia"
                              >
                                <Edit3 className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEliminar(n.id, n.titulo)}
                                className="size-8 p-0 text-[var(--danger)]"
                                title="Eliminar noticia"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ================= PESTAÑA: ESTRUCTURA DNP ================= */}
        <TabsContent value="dnp" className="space-y-6">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Fases Metodológicas</h2>
            <EstadoConsulta
              cargando={fases.isPending}
              error={fases.error}
              reintentar={fases.refetch}
            />
            <ul className="space-y-3">
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
            <ul className="space-y-3">
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
            <ul className="space-y-3">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
