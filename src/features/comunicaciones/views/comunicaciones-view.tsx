"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  CalendarRange,
  CheckCircle2,
  Clock,
  Edit3,
  Filter,
  Megaphone,
  Plus,
  Search,
  Sparkles,
  MapPin,
  Package,
  Building2,
  ListChecks,
  LayoutDashboard,
  LayoutGrid,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Notice } from "@/shared/ui/notice";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { usePanelStore } from "@/core/panels/panel-store";
import { GanttCronograma } from "./gantt-cronograma";
import { CollectionLayout } from "@/shared/ui/collection-view";
import { useCollectionView } from "@/core/preferences/collection-view-store";
import {
  ETAPAS_CRONOGRAMA,
  ESTADOS_TAREA,
  ESTATES_ORDER,
  type EstadoTarea,
  type TareaComunicacion,
} from "../models/tarea-comunicacion";
import {
  actualizarTareaComunicacion,
  listarTareasComunicacion,
} from "../services/comunicaciones-api";

export function ComunicacionesView() {
  const { openPanel } = usePanelStore();
  const [tareas, setTareas] = useState<TareaComunicacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Gestión tipo proyectos: pestañas de vista cronograma / tablero
  const [vistaColeccion, setVistaColeccion] = useCollectionView("comunicaciones", "lista");
  const [vistaEspecial, setVistaEspecial] = useState<"kanban" | "gantt" | null>(null);
  const vista = vistaEspecial ?? (vistaColeccion === "lista" ? "cronograma" : "tarjetas");
  const cambiarVista = (next: string) => {
    if (next === "cronograma" || next === "tarjetas") {
      setVistaColeccion(next === "cronograma" ? "lista" : "tarjetas");
      setVistaEspecial(null);
    } else if (next === "kanban" || next === "gantt") {
      setVistaEspecial(next);
    }
  };

  // Filtros
  const [etapaSeleccionada, setEtapaSeleccionada] = useState<string>("todas");
  const [estadoSeleccionado, setEstadoSeleccionado] = useState<string>("todos");
  const [busqueda, setBusqueda] = useState<string>("");

  // Guarda en vuelo del cambio rápido de estado por tarjeta
  const [estadoEnCambio, setEstadoEnCambio] = useState<string | null>(null);

  const cargarTareas = async () => {
    setCargando(true);
    setError(null);
    try {
      const datos = await listarTareasComunicacion();
      setTareas(datos);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Error al cargar las tareas de comunicación.";
      setError(msg);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarTareas();
  }, []);

  const abrirEdicion = (tarea: TareaComunicacion) => {
    openPanel("tarea-comunicacion-editor", {
      tarea,
      ordenSugerido: tarea.orden,
      onGuardada: (guardada) => {
        setTareas((prev) => {
          const idx = prev.findIndex((t) => t.id === guardada.id);
          if (idx >= 0) {
            const copia = [...prev];
            copia[idx] = guardada;
            return copia;
          }
          return [...prev, guardada].sort(
            (a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio) || a.orden - b.orden,
          );
        });
      },
    });
  };

  const abrirCreacion = () => {
    openPanel("tarea-comunicacion-editor", {
      tarea: null,
      ordenSugerido: tareas.length + 1,
      onGuardada: (guardada) => {
        setTareas((prev) => {
          const yaExiste = prev.some((t) => t.id === guardada.id);
          if (yaExiste) return prev.map((t) => (t.id === guardada.id ? guardada : t));
          return [...prev, guardada].sort(
            (a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio) || a.orden - b.orden,
          );
        });
      },
    });
  };

  const cambiarEstadoRapido = async (tarea: TareaComunicacion, nuevoEstado: EstadoTarea) => {
    setEstadoEnCambio(tarea.id);
    try {
      const actualizada = await actualizarTareaComunicacion(tarea.id, { estado: nuevoEstado });
      setTareas((prev) => prev.map((t) => (t.id === actualizada.id ? actualizada : t)));
      toast.success(`${actualizada.codigo} ahora está en estado «${ESTADOS_TAREA[nuevoEstado].label}».`);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "No se pudo actualizar el estado de la tarea.";
      toast.error(msg);
    } finally {
      setEstadoEnCambio(null);
    }
  };

  const tareasFiltradas = useMemo(() => {
    return tareas.filter((t) => {
      if (etapaSeleccionada !== "todas" && t.etapa !== etapaSeleccionada) {
        return false;
      }
      if (estadoSeleccionado !== "todos" && t.estado !== estadoSeleccionado) {
        return false;
      }
      if (busqueda.trim()) {
        const query = busqueda.toLowerCase();
        const coincide =
          t.codigo.toLowerCase().includes(query) ||
          t.titulo.toLowerCase().includes(query) ||
          t.territorio.toLowerCase().includes(query) ||
          t.responsable.toLowerCase().includes(query) ||
          t.descripcion.toLowerCase().includes(query);
        if (!coincide) return false;
      }
      return true;
    });
  }, [tareas, etapaSeleccionada, estadoSeleccionado, busqueda]);

  // Métricas ejecutivas de avance del plan
  const total = tareas.length;
  const enProgreso = tareas.filter((t) => t.estado === "en_progreso").length;
  const completadas = tareas.filter((t) => t.estado === "completada").length;
  const pendientes = tareas.filter((t) => t.estado === "pendiente").length;
  const reprogramadas = tareas.filter((t) => t.estado === "reprogramada").length;
  const avanceGlobal = total > 0 ? Math.round((completadas / total) * 100) : 0;

  // Barras de progreso por etapa (% de tareas completadas)
  const avancePorEtapa = useMemo(() => {
    const porEtapa = new Map<string, { total: number; completadas: number }>();
    for (const tarea of tareas) {
      const registro = porEtapa.get(tarea.etapa) ?? { total: 0, completadas: 0 };
      registro.total += 1;
      if (tarea.estado === "completada") registro.completadas += 1;
      porEtapa.set(tarea.etapa, registro);
    }
    const ordenadas = [
      ...ETAPAS_CRONOGRAMA.filter((etapa) => porEtapa.has(etapa)),
      ...[...porEtapa.keys()].filter(
        (etapa) => !(ETAPAS_CRONOGRAMA as readonly string[]).includes(etapa),
      ),
    ];
    return ordenadas.map((etapa) => {
      const registro = porEtapa.get(etapa)!;
      return {
        etapa,
        ...registro,
        pct: Math.round((registro.completadas / registro.total) * 100),
      };
    });
  }, [tareas]);

  // El Gantt respeta también el filtro de estado (AZA: su proyección por barras)
  const mostrarFiltroEstado = vista !== "kanban";
  const listaPorEtapa = useMemo(() => {
    const grupos = new Map<string, TareaComunicacion[]>();
    for (const tarea of tareasFiltradas) {
      const grupo = grupos.get(tarea.etapa) ?? [];
      grupo.push(tarea);
      grupos.set(tarea.etapa, grupo);
    }
    const ordenadas = [
      ...ETAPAS_CRONOGRAMA.filter((etapa) => grupos.has(etapa)),
      ...[...grupos.keys()].filter(
        (etapa) => !(ETAPAS_CRONOGRAMA as readonly string[]).includes(etapa),
      ),
    ];
    return ordenadas.map((etapa) => ({
      etapa,
      tareas: grupos.get(etapa)!,
    }));
  }, [tareasFiltradas]);

  return (
    <div className="space-y-6">
      {/* Encabezado y Acción Principal */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Megaphone className="size-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              Plan de Trabajo y Comunicaciones
            </h1>
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            Cronograma operativo de campo, coberturas y banco de evidencias para la Fase de Diagnóstico (Octubre – Diciembre 2026).
          </p>
        </div>

        <Button onClick={abrirCreacion} className="shrink-0 gap-2">
          <Plus className="size-4" />
          Nueva Tarea
        </Button>
      </div>

      {/* Tarjetas de Métricas */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-lg border border-border bg-surface-1 p-3 shadow-xs">
          <p className="text-xs font-medium text-text-secondary">Total Actividades</p>
          <p className="mt-1 text-2xl font-bold text-text-primary">{total}</p>
        </div>

        <div className="rounded-lg border border-border bg-surface-1 p-3 shadow-xs">
          <p className="text-xs font-medium text-info">En Progreso</p>
          <p className="mt-1 text-2xl font-bold text-info">{enProgreso}</p>
        </div>

        <div className="rounded-lg border border-border bg-surface-1 p-3 shadow-xs">
          <p className="text-xs font-medium text-text-secondary">Pendientes</p>
          <p className="mt-1 text-2xl font-bold text-text-primary">{pendientes}</p>
        </div>

        <div className="rounded-lg border border-border bg-surface-1 p-3 shadow-xs">
          <p className="text-xs font-medium text-success">Completadas</p>
          <p className="mt-1 text-2xl font-bold text-success">{completadas}</p>
        </div>

        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 shadow-xs">
          <div className="flex items-center gap-1 text-xs font-semibold text-primary">
            <Sparkles className="size-3.5" />
            Inicio Diagnóstico
          </div>
          <p className="mt-1 text-sm font-bold text-primary">27 Octubre</p>
          <p className="text-2xs text-text-secondary">(Ayer)</p>
        </div>

        <div className="rounded-lg border border-border bg-surface-1 p-3 shadow-xs">
          <div className="flex items-center gap-1 text-xs font-medium text-text-secondary">
            <CheckCircle2 className="size-3.5" />
            Cierre Diagnóstico
          </div>
          <p className="mt-1 text-sm font-bold text-text-primary">31 Diciembre</p>
          <p className="text-2xs text-text-secondary">Entrega Oficial</p>
        </div>
      </div>

      {/* Gestión tipo proyectos: avance global y por etapa */}
      <div className="rounded-lg border border-border bg-surface-1 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-text-primary">Avance del plan</h2>
          <p className="text-2xs text-text-secondary">
            {reprogramadas > 0 ? `${reprogramadas} tarea(s) reprogramada(s)` : "Sin reprogramaciones activas"}
          </p>
        </div>
        <div
          role="progressbar"
          aria-label="Avance global del plan de comunicaciones"
          aria-valuenow={avanceGlobal}
          aria-valuemin={0}
          aria-valuemax={100}
          className="mt-3"
        >
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-success transition-all duration-500"
              style={{ width: `${avanceGlobal}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs font-semibold text-success">
            {completadas} de {total} actividades completadas ({avanceGlobal}%)
          </p>
        </div>

        {avancePorEtapa.length > 0 && (
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {avancePorEtapa.map(({ etapa, total: totalEtapa, completadas: completadasEtapa, pct }) => (
              <li key={etapa} className="rounded-md border border-border bg-surface-2 p-3">
                <div className="flex items-center gap-1.5">
                  <Building2 className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                  <span className="line-clamp-2 text-2xs font-medium text-text-primary" title={etapa}>
                    {etapa}
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-label={`Avance de ${etapa}`}
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-0"
                >
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="mt-1 text-2xs text-text-secondary">
                  {completadasEtapa}/{totalEtapa} completadas · {pct}%
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pestañas de vista: Cronograma (lista por etapas) vs Tablero Kanban */}
      <Tabs value={vista} onValueChange={cambiarVista}>
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          {/* Pestañas desplazables en pantallas estrechas: el scroll queda contenido
              aquí y no desborda la página (Regla 6). */}
          <div className="max-w-full overflow-x-auto pb-1">
            <TabsList aria-label="Vista del plan de comunicaciones" className="w-max max-w-none">
              <TabsTrigger value="cronograma" className="gap-1.5">
                <ListChecks className="size-4" />
                Lista por etapas
              </TabsTrigger>
              <TabsTrigger value="tarjetas" className="gap-1.5">
                <LayoutGrid className="size-4" aria-hidden="true" />Tarjetas
              </TabsTrigger>
              <TabsTrigger value="kanban" className="gap-1.5">
                <LayoutDashboard className="size-4" />
                Tablero Kanban
              </TabsTrigger>
              <TabsTrigger value="gantt" className="gap-1.5">
                <CalendarRange className="size-4" />
                Diagrama de Gantt
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Barra de Filtros y Búsqueda */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-2.5 top-2.5 size-4 text-text-secondary" />
              <Input
                type="text"
                placeholder="Buscar por código, barrio o título..."
                className="pl-8 text-sm"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                aria-label="Buscar tareas"
              />
            </div>

            <div className="flex items-center gap-1.5 min-w-[170px]">
              <Filter className="size-4 shrink-0 text-text-secondary" />
              <Select
                value={etapaSeleccionada}
                onValueChange={(val) => setEtapaSeleccionada(val)}
              >
                <SelectTrigger aria-label="Filtrar por etapa" className="h-9 text-xs">
                  <SelectValue placeholder="Todas las Etapas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las Etapas</SelectItem>
                  {ETAPAS_CRONOGRAMA.map((et) => (
                    <SelectItem key={et} value={et}>
                      {et}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {mostrarFiltroEstado && (
              <div className="min-w-[140px]">
                <Select
                  value={estadoSeleccionado}
                  onValueChange={(val) => setEstadoSeleccionado(val)}
                >
                  <SelectTrigger aria-label="Filtrar por estado" className="h-9 text-xs">
                    <SelectValue placeholder="Todos los Estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los Estados</SelectItem>
                    {Object.entries(ESTADOS_TAREA).map(([key, val]) => (
                      <SelectItem key={key} value={key}>
                        {val.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        {/* Mensaje de Error si ocurre */}
        {error && (
          <div className="mt-4">
            <Notice tone="danger" title="No se pudieron cargar las tareas">
              {error}
              <div className="mt-2">
                <Button size="sm" variant="outline" onClick={cargarTareas}>
                  Reintentar
                </Button>
              </div>
            </Notice>
          </div>
        )}

        {cargando ? (
          <div className="rounded-lg border border-border bg-surface-1 p-12 text-center text-sm text-text-secondary">
            Cargando cronograma de comunicaciones de la política pública...
          </div>
        ) : tareas.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-surface-1 p-12 text-center">
            <p className="text-sm font-medium text-text-primary">
              No hay tareas registradas todavía.
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              Crea la primera tarea del plan de comunicaciones.
            </p>
          </div>
        ) : (
          <>
            <TabsContent value="cronograma" className="outline-none">
              {tareasFiltradas.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-surface-1 p-12 text-center">
                  <p className="text-sm font-medium text-text-primary">
                    No se encontraron tareas con los filtros actuales.
                  </p>
                  <p className="mt-1 text-xs text-text-secondary">
                    Intenta cambiar los filtros de etapa o búsqueda, o crea una nueva tarea.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {listaPorEtapa.map(({ etapa, tareas: tareasEtapa }) => (
                    <section
                      key={etapa}
                      aria-label={`Etapa ${etapa}`}
                      className="rounded-lg border border-border bg-surface-1 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-bold text-text-primary">{etapa}</h3>
                        <span className="text-2xs text-text-secondary">
                          {tareasEtapa.length} tarea(s)
                        </span>
                      </div>
                      <div className="mt-3 space-y-4">
                        {tareasEtapa.map((tarea) => (
                          <TarjetaTarea
                            key={tarea.id}
                            tarea={tarea}
                            estadoEnCambio={estadoEnCambio === tarea.id}
                            onEditar={abrirEdicion}
                            onCambiarEstado={cambiarEstadoRapido}
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="tarjetas" className="outline-none">
              {tareasFiltradas.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-text-secondary">No se encontraron tareas con los filtros actuales.</p>
              ) : (
                <CollectionLayout view="tarjetas" className="xl:grid-cols-2" aria-label="Tarjetas de tareas de comunicación">
                  {tareasFiltradas.map((tarea) => (
                    <TarjetaTarea key={tarea.id} tarea={tarea} tarjeta estadoEnCambio={estadoEnCambio === tarea.id} onEditar={abrirEdicion} onCambiarEstado={cambiarEstadoRapido} />
                  ))}
                </CollectionLayout>
              )}
            </TabsContent>

            <TabsContent value="kanban" className="outline-none">
              {tareasFiltradas.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-surface-1 p-12 text-center">
                  <p className="text-sm font-medium text-text-primary">
                    No se encontraron tareas con los filtros actuales.
                  </p>
                  <p className="mt-1 text-xs text-text-secondary">
                    Intenta cambiar los filtros de etapa o búsqueda, o crea una nueva tarea.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {ESTATES_ORDER.map((estado) => {
                    const cfg = ESTADOS_TAREA[estado];
                    const columnas = tareasFiltradas.filter((t) => t.estado === estado);
                    return (
                      <div
                        key={estado}
                        aria-label={`Columna ${cfg.label}`}
                        className="flex flex-col rounded-lg border border-border bg-surface-1 p-3"
                      >
                        <div className="flex items-center justify-between">
                          <Badge variant={cfg.tone}>{cfg.label}</Badge>
                          <span className="text-2xs font-semibold text-text-secondary">
                            {columnas.length}
                          </span>
                        </div>
                        <div className="mt-3 space-y-3">
                          {columnas.length === 0 ? (
                            <p className="rounded-md border border-dashed border-border bg-surface-2 p-3 text-center text-2xs text-text-secondary">
                              Sin tareas en este estado
                            </p>
                          ) : (
                            columnas.map((tarea) => (
                              <div
                                key={tarea.id}
                                className="rounded-md border border-border bg-surface-2 p-3 shadow-2xs"
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-mono text-2xs font-bold text-primary">
                                    {tarea.codigo}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => abrirEdicion(tarea)}
                                    aria-label={`Editar tarea ${tarea.codigo}`}
                                  >
                                    <Edit3 className="size-3.5" />
                                  </Button>
                                </div>
                                <p className="mt-1 line-clamp-2 text-xs font-semibold text-text-primary" title={tarea.titulo}>
                                  {tarea.titulo}
                                </p>
                                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-2xs text-text-secondary">
                                  <span title={tarea.etapa}>{etapaCorta(tarea.etapa)}</span>
                                  <Calendar className="size-3 text-primary" aria-hidden="true" />
                                  <span>{tarea.fecha_inicio}</span>
                                </div>
                                <p className="mt-1 truncate text-2xs text-text-secondary" title={tarea.responsable}>
                                  Resp: {tarea.responsable}
                                </p>
                                <div className="mt-2">
                                  <Select
                                    value={tarea.estado}
                                    disabled={estadoEnCambio === tarea.id}
                                    onValueChange={(val) => cambiarEstadoRapido(tarea, val as EstadoTarea)}
                                  >
                                    <SelectTrigger
                                      aria-label={`Cambiar estado de ${tarea.codigo}`}
                                      className="h-7 text-2xs"
                                    >
                                      <SelectValue placeholder={cfg.label} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {ESTATES_ORDER.map((op) => (
                                        <SelectItem key={op} value={op}>
                                          {ESTADOS_TAREA[op].label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
            <TabsContent value="gantt" className="outline-none">
              {tareasFiltradas.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-surface-1 p-12 text-center">
                  <p className="text-sm font-medium text-text-primary">
                    No se encontraron tareas con los filtros actuales.
                  </p>
                  <p className="mt-1 text-xs text-text-secondary">
                    Intenta cambiar los filtros de etapa o búsqueda, o crea una nueva tarea.
                  </p>
                </div>
              ) : (
                <GanttCronograma tareas={tareasFiltradas} onAbrir={abrirEdicion} />
              )}
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}

/** Resumen corto de la etapa para el tablero: "Etapa 3: Despliegue..." → "Etapa 3". */
function etapaCorta(etapa: string): string {
  const match = etapa.match(/Etapa\s+(\d+)/);
  return match ? `Etapa ${match[1]}` : etapa;
}

interface PropsTarjeta {
  tarjeta?: boolean;
  tarea: TareaComunicacion;
  estadoEnCambio: boolean;
  onEditar: (tarea: TareaComunicacion) => void;
  onCambiarEstado: (tarea: TareaComunicacion, estado: EstadoTarea) => void;
}

function TarjetaTarea({ tarea, tarjeta = false, estadoEnCambio, onEditar, onCambiarEstado }: PropsTarjeta) {
  const estadoCfg = ESTADOS_TAREA[tarea.estado] || ESTADOS_TAREA.pendiente;
  const esMismoDia = tarea.fecha_inicio === tarea.fecha_fin;

  return (
    <div className={`group relative flex flex-col justify-between gap-4 rounded-lg border border-border bg-surface-0 p-4 shadow-2xs transition hover:border-primary/40 hover:shadow-xs ${tarjeta ? "" : "md:flex-row md:items-start"}`}>
      <div className="flex-1 min-w-0 space-y-2">
        {/* Encabezado: Código, Etapa, Estado */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs font-bold text-primary">{tarea.codigo}</span>
          <Badge variant={estadoCfg.tone}>{estadoCfg.label}</Badge>
          <span className="text-xs text-text-secondary">·</span>
          <span className="text-xs font-medium text-text-secondary">{tarea.etapa}</span>
        </div>

        {/* Título */}
        <h3 className="text-base font-semibold text-text-primary">{tarea.titulo}</h3>

        {/* Metadatos: Fechas, Territorio, Responsable */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary">
          <div className="flex items-center gap-1 font-medium text-text-primary">
            <Calendar className="size-3.5 text-primary" />
            <span>
              {esMismoDia ? tarea.fecha_inicio : `${tarea.fecha_inicio} al ${tarea.fecha_fin}`}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <MapPin className="size-3.5 text-text-secondary" />
            <span>{tarea.territorio}</span>
          </div>

          <div className="flex items-center gap-1">
            <Clock className="size-3.5 text-text-secondary" />
            <span>Resp: {tarea.responsable}</span>
          </div>
        </div>

        {/* Descripción */}
        {tarea.descripcion && (
          <p className="text-xs text-text-secondary leading-relaxed">{tarea.descripcion}</p>
        )}

        {/* Entregables */}
        {tarea.entregables && (
          <div className="flex items-start gap-1.5 rounded-md bg-surface-2 p-2.5 text-xs text-text-primary">
            <Package className="size-4 shrink-0 text-primary mt-0.5" />
            <div>
              <strong className="font-medium text-text-primary">Entregables: </strong>
              <span>{tarea.entregables}</span>
            </div>
          </div>
        )}
      </div>

      {/* Acciones de la Tarea */}
      <div className={`flex shrink-0 flex-wrap items-center gap-2 ${tarjeta ? "mt-auto" : "self-end md:flex-col md:items-end md:self-start"}`}>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => onEditar(tarea)}
        >
          <Edit3 className="size-3.5" />
          Editar Tarea y Fechas
        </Button>

        {/* Conmutador Rápido de Estado (tipo proyectos) */}
        <div className="flex flex-wrap items-center gap-1">
          <Select
            value={tarea.estado}
            disabled={estadoEnCambio}
            onValueChange={(val) => onCambiarEstado(tarea, val as EstadoTarea)}
          >
            <SelectTrigger
              aria-label={`Cambiar estado de ${tarea.codigo}`}
              className="h-9 text-xs"
            >
              <SelectValue placeholder={estadoCfg.label} />
            </SelectTrigger>
            <SelectContent>
              {ESTATES_ORDER.map((op) => (
                <SelectItem key={op} value={op}>
                  {ESTADOS_TAREA[op].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {tarea.estado !== "completada" ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={estadoEnCambio}
              onClick={() => onCambiarEstado(tarea, "completada")}
              className="text-2xs text-success hover:bg-success/10"
              title="Marcar como completada"
            >
              ✓ Marcar lista
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={estadoEnCambio}
              onClick={() => onCambiarEstado(tarea, "en_progreso")}
              className="text-2xs text-info hover:bg-info/10"
              title="Reabrir a en progreso"
            >
              Reabrir
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
