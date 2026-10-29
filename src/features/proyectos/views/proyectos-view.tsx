"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  CalendarRange,
  Columns3,
  Filter,
  LayoutList,
  LayoutGrid,
  Paperclip,
  Search,
} from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Notice } from "@/shared/ui/notice";
import { Skeleton } from "@/shared/ui/skeleton";
import { EmptyState } from "@/shared/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { usePanels } from "@/core/panels/panel-store";
import { tienePermiso, useSesionStore } from "@/features/sesion/state/session-store";
import { useFases } from "@/features/politicas/services/use-politicas-queries";
import type { TareaComunicacion, EstadoTarea } from "@/features/comunicaciones/models/tarea-comunicacion";
import { GanttProyectos } from "@/features/proyectos/components/gantt-proyectos";
import { KanbanProyectos } from "@/features/proyectos/components/kanban-proyectos";
import { CalendarioProyectos } from "@/features/proyectos/components/calendario-proyectos";
import {
  ESTADOS_CANONICOS,
  MODULOS_PROYECTOS,
  MODULOS_PROYECTOS_ORDER,
  type ActividadProyecto,
  type EstadoCanonico,
  type ModuloDueno,
  esModuloProyectos,
} from "../models/actividad-proyecto";
import { listarActividadesProyectos } from "../services/proyectos-api";
import { CollectionLayout } from "@/shared/ui/collection-view";
import { useCollectionView } from "@/core/preferences/collection-view-store";

type VistaEspecial = "gantt" | "kanban" | "calendario";

/** Traducción defensiva al EstadoTarea del módulo comunicaciones. */
function estadoTareaDe(nativo: string): EstadoTarea {
  switch (nativo) {
    case "en_progreso":
      return "en_progreso";
    case "completada":
      return "completada";
    case "reprogramada":
      return "reprogramada";
    default:
      return "pendiente";
  }
}

export function ProyectosView() {
  const { openPanel } = usePanels();
  const router = useRouter();
  const sesion = useSesionStore((s) => s.sesion);
  // Rotulación de alcance: la vista solo agrega instrumentos de formulación;
  // la fase activa se lee del motor de políticas (encargo 2026-10-28).
  const faseActiva = useFases().data?.find((f) => f.estado === "activa");

  const [actividades, setActividades] = useState<ActividadProyecto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Vista por defecto: Lista (encargo del 2026-10-28; Gantt/Kanban/Calendario
    // quedan a un clic). En móvil la lista es la lectura más estable.
  const [vistaColeccion, setVistaColeccion] = useCollectionView("proyectos", "lista");
  const [vistaEspecial, setVistaEspecial] = useState<VistaEspecial | null>(null);
  const vista = vistaEspecial ?? vistaColeccion;
  const cambiarVista = (next: string) => {
    if (next === "lista" || next === "tarjetas") {
      setVistaColeccion(next);
      setVistaEspecial(null);
    } else if (next === "gantt" || next === "kanban" || next === "calendario") {
      setVistaEspecial(next);
    }
  };
  const [moduloSeleccionado, setModuloSeleccionado] = useState<string>("todos");
  const [estadoSeleccionado, setEstadoSeleccionado] = useState<string>("todos");
  const [busqueda, setBusqueda] = useState("");

  const cargar = async () => {
    setCargando(true);
    setError(null);
    try {
      const datos = await listarActividadesProyectos();
      // Sanitización: una fuente no catalogada (respuesta del backend con el
      // catálogo desincronizado) no debe derribar la vista completa.
      setActividades(datos.filter((a) => esModuloProyectos(a.modulo_dueno)));
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error al cargar las actividades de los proyectos.",
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    void cargar();
  }, []);

  const filtradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return actividades.filter((a) => {
      if (moduloSeleccionado !== "todos" && a.modulo_dueno !== moduloSeleccionado) return false;
      if (estadoSeleccionado !== "todos" && a.estado_canonico !== estadoSeleccionado) return false;
      if (texto) {
        const textoBlob = `${a.codigo} ${a.titulo} ${a.descripcion} ${a.territorio} ${a.etapa ?? ""}`.toLowerCase();
        if (!textoBlob.includes(texto)) return false;
      }
      return true;
    });
  }, [actividades, moduloSeleccionado, estadoSeleccionado, busqueda]);

  const conteoPorModulo = useMemo(() => {
    const conteo = new Map<ModuloDueno, number>();
    for (const a of actividades) {
      conteo.set(a.modulo_dueno, (conteo.get(a.modulo_dueno) ?? 0) + 1);
    }
    return conteo;
  }, [actividades]);

  const totalEnProgreso = useMemo(
    () => filtradas.filter((a) => a.estado_canonico === "en_progreso").length,
    [filtradas],
  );
  const totalCompletadas = useMemo(
    () => filtradas.filter((a) => a.estado_canonico === "completada").length,
    [filtradas],
  );

  /** La edición vive en el panel nativo del módulo dueño (o en su ruta si el rol
   *  no tiene el permiso del módulo): lo ejecuta la vista, la ficha solo delega. */
  const abrirEdicion = (a: ActividadProyecto) => {
    const puedeEditar = tienePermiso(sesion, a.permiso_editar);
    switch (a.modulo_dueno) {
      case "comunicaciones": {
        if (!puedeEditar) {
          router.push(MODULOS_PROYECTOS.comunicaciones.rutaPlataforma);
          return;
        }
        const tareaAdaptada: TareaComunicacion = {
          id: a.recurso_id,
          codigo: a.codigo,
          etapa: a.etapa ?? "",
          territorio: a.territorio,
          titulo: a.titulo,
          descripcion: a.descripcion,
          entregables: "",
          fecha_inicio: a.fecha_inicio,
          fecha_fin: a.fecha_fin ?? a.fecha_inicio,
          estado: estadoTareaDe(a.estado_nativo),
          responsable: a.responsable,
          orden: 0,
        };
        openPanel("tarea-comunicacion-editor", {
          tarea: tareaAdaptada,
          ordenSugerido: 0,
          onGuardada: () => void cargar(),
        });
        return;
      }
      case "mesas": {
        if (!puedeEditar || !a.recurso_id) {
          router.push(MODULOS_PROYECTOS.mesas.rutaPlataforma);
          return;
        }
        openPanel("agenda-editor", { agendaId: a.recurso_id });
        return;
      }
      case "formularios": {
        if (!puedeEditar || !a.recurso_id) {
          router.push(MODULOS_PROYECTOS.formularios.rutaPlataforma);
          return;
        }
        openPanel("formulario-editor", { formularioId: a.recurso_id });
        return;
      }
      default:
        // Los Planes de Desarrollo no son fuente de esta vista: su gestión
        // vive en el módulo de Seguimiento PAS.
        router.push(MODULOS_PROYECTOS.mesas.rutaPlataforma);
    }
  };

  /** Acción principal: abre la ficha de detalle; el botón Editar vive dentro. */
  const abrirActividad = (a: ActividadProyecto, seccionInicial?: "anexos") => {
    openPanel("ficha-actividad-proyecto", {
      actividad: a,
      seccionInicial,
      onEditar: () => abrirEdicion(a),
    });
  };

  return (
    // Ancho completo del área de contenido (mismo criterio que las demás
    // vistas de plataforma); el límite max-w-7xl centrado desaprovechaba la pantalla.
    <div className="flex w-full flex-col gap-4">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <CalendarRange className="size-5 text-primary" aria-hidden="true" />
          <h1 className="text-lg font-bold text-text-primary">Proyectos</h1>
          <Badge variant="secondary" className="text-[10px]">
            Formulación de la política pública
            {faseActiva ? ` · Fase: ${faseActiva.nombre}` : ""}
          </Badge>
        </div>
        <p className="text-xs text-text-secondary">
          Consulta tareas de comunicaciones, agendas de mesas y formularios de
          consulta. Abre una actividad para ver su ficha o utiliza Adjuntos para
          cargar y descargar documentos según tus permisos. Los datos de la
          actividad se editan desde su módulo de origen.
        </p>
      </header>

      {error && (
        <Notice tone="danger" title="No se pudieron cargar las actividades">
          {error}
        </Notice>
      )}

      {/* KPIs de la selección */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-surface-1 p-3">
          <p className="text-2xs font-medium text-text-secondary">Total actividades</p>
          <p className="text-xl font-bold tabular-nums text-text-primary">{filtradas.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface-1 p-3">
          <p className="text-2xs font-medium text-text-secondary">Completadas</p>
          <p className="text-xl font-bold tabular-nums text-success">{totalCompletadas}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface-1 p-3">
          <p className="text-2xs font-medium text-text-secondary">En progreso</p>
          <p className="text-xl font-bold tabular-nums text-info">{totalEnProgreso}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface-1 p-3">
          <p className="text-2xs font-medium text-text-secondary">Módulos fuente</p>
          <p className="text-xl font-bold tabular-nums text-text-primary">{conteoPorModulo.size}</p>
        </div>
      </div>

      {/* Filtros (fila con envoltura para≤768: lección del hallazgo visual 259) */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-52 flex-1 items-center gap-2">
          <Search className="size-4 shrink-0 text-text-secondary" aria-hidden="true" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por código, título, territorio o etapa…"
            aria-label="Buscar actividades"
            className="h-8 w-full"
          />
        </div>
        <Select value={moduloSeleccionado} onValueChange={setModuloSeleccionado}>
          <SelectTrigger aria-label="Filtrar por módulo" className="h-8 w-40">
            <span className="flex items-center gap-1.5 truncate">
              <Filter className="size-3.5 shrink-0" aria-hidden="true" />
              <SelectValue placeholder="Módulo" />
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los módulos</SelectItem>
            {MODULOS_PROYECTOS_ORDER.map((m) => (
              <SelectItem key={m} value={m}>
                {MODULOS_PROYECTOS[m].label} ({conteoPorModulo.get(m) ?? 0})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={estadoSeleccionado} onValueChange={setEstadoSeleccionado}>
          <SelectTrigger aria-label="Filtrar por estado" className="h-8 w-40">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            {(Object.keys(ESTADOS_CANONICOS) as EstadoCanonico[]).map((e) => (
              <SelectItem key={e} value={e}>
                {ESTADOS_CANONICOS[e].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Conmutador de vistas (pestañas desplazables: hallazgo 259) */}
      <Tabs value={vista} onValueChange={cambiarVista}>
        <div className="overflow-x-auto">
          <TabsList aria-label="Tipo de vista de proyectos" className="w-max">
            <TabsTrigger value="lista">
              <LayoutList className="size-3.5" aria-hidden="true" />Lista
            </TabsTrigger>
            <TabsTrigger value="tarjetas">
              <LayoutGrid className="size-3.5" aria-hidden="true" />Tarjetas
            </TabsTrigger>
            <TabsTrigger value="gantt">
              <CalendarRange className="size-3.5" aria-hidden="true" />
              Gantt
            </TabsTrigger>
            <TabsTrigger value="kanban">
              <Columns3 className="size-3.5" aria-hidden="true" />
              Kanban
            </TabsTrigger>
            <TabsTrigger value="calendario">
              <Calendar className="size-3.5" aria-hidden="true" />
              Calendario
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="gantt" className="mt-4">
          {cargando ? (
            <Skeleton className="h-44 w-full" />
          ) : (
            <GanttProyectos actividades={filtradas} onAbrir={abrirActividad} />
          )}
        </TabsContent>

        <TabsContent value="kanban" className="mt-4">
          {cargando ? (
            <Skeleton className="h-44 w-full" />
          ) : (
            <KanbanProyectos actividades={filtradas} onAbrir={abrirActividad} />
          )}
        </TabsContent>

        <TabsContent value="calendario" className="mt-4">
          {cargando ? (
            <Skeleton className="h-72 w-full" />
          ) : (
            <CalendarioProyectos actividades={filtradas} onAbrir={abrirActividad} />
          )}
        </TabsContent>

        <TabsContent value="tarjetas" className="mt-4">
          {cargando ? <Skeleton className="h-72 w-full" /> : filtradas.length === 0 ? (
            <EmptyState icon={<LayoutGrid />} title="Sin actividades con los filtros actuales" description="Ajusta la búsqueda, el módulo o el estado para ver más resultados." />
          ) : (
            <CollectionLayout view="tarjetas" aria-label="Tarjetas de actividades de proyectos">
              {filtradas.map((a) => (
                <article key={a.id} className="flex flex-col gap-4 rounded-xl border border-border bg-surface-1 p-5">
                  <div className="space-y-2"><p className="font-mono text-xs text-text-tertiary">{a.codigo} · {MODULOS_PROYECTOS[a.modulo_dueno].label}</p><h2 className="break-words font-semibold">{a.titulo}</h2><p className="text-sm text-text-secondary">{a.descripcion}</p></div>
                  <Badge variant={ESTADOS_CANONICOS[a.estado_canonico].tone} className="self-start">{ESTADOS_CANONICOS[a.estado_canonico].label}</Badge>
                  <dl className="space-y-3 text-sm">
                    <div><dt className="text-xs text-text-tertiary">Fechas</dt><dd>{a.fecha_inicio} — {a.fecha_fin ?? "ventana abierta"}</dd></div>
                    <div><dt className="text-xs text-text-tertiary">Avance</dt><dd>{Math.round(a.avance_pct)}%</dd></div>
                    <div><dt className="text-xs text-text-tertiary">Responsable / Territorio</dt><dd>{a.responsable || "Sin asignar"} · {a.territorio}</dd></div>
                    {a.etapa && <div><dt className="text-xs text-text-tertiary">Etapa</dt><dd>{a.etapa}</dd></div>}
                  </dl>
                  <div className="mt-auto flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => abrirActividad(a)} aria-label={`Abrir actividad ${a.titulo}`}>Abrir actividad</Button>
                    <Button variant="outline" size="sm" onClick={() => abrirActividad(a, "anexos")} aria-label={`Ver adjuntos de ${a.titulo}`}>
                      <Paperclip className="size-3.5" aria-hidden="true" />Adjuntos
                    </Button>
                  </div>
                </article>
              ))}
            </CollectionLayout>
          )}
        </TabsContent>

        <TabsContent value="lista" className="mt-4">
          {cargando ? (
            <Skeleton className="h-72 w-full" />
          ) : filtradas.length === 0 ? (
            <EmptyState
              icon={<LayoutList />}
              title="Sin actividades con los filtros actuales"
              description="Ajusta la búsqueda, el módulo o el estado para ver más resultados."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border bg-surface-1">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-2 text-2xs uppercase tracking-wider text-text-secondary">
                    <th scope="col" className="px-3 py-2">Módulo</th>
                    <th scope="col" className="px-3 py-2">Actividad</th>
                    <th scope="col" className="px-3 py-2">Fechas</th>
                    <th scope="col" className="px-3 py-2">Estado</th>
                    <th scope="col" className="px-3 py-2">Avance</th>
                    <th scope="col" className="px-3 py-2">Responsable</th>
                    <th scope="col" className="px-3 py-2">Adjuntos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtradas.map((a) => (
                    <tr key={a.id} className="transition-colors hover:bg-surface-2">
                      <td className="px-3 py-2">
                        <span className="font-mono text-[10px] font-bold text-primary">
                          {MODULOS_PROYECTOS[a.modulo_dueno].label}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <Button
                          type="button"
                          variant="unstyled"
                          onClick={() => abrirActividad(a)}
                          className="whitespace-normal break-words text-left font-semibold text-text-primary hover:underline"
                          title={`Abrir en el módulo ${MODULOS_PROYECTOS[a.modulo_dueno].label}`}
                        >
                          {a.titulo}
                        </Button>
                        <p className="whitespace-normal break-words text-[10px] text-text-tertiary">
                          {a.etapa ?? a.descripcion}
                        </p>
                      </td>
                      <td className="px-3 py-2 text-xs tabular-nums text-text-secondary">
                        {a.fecha_inicio}
                        <br />
                        {a.fecha_fin ?? "ventana abierta"}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={ESTADOS_CANONICOS[a.estado_canonico].tone} className="text-[9px]">
                          {ESTADOS_CANONICOS[a.estado_canonico].label}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-xs tabular-nums text-text-secondary">
                        {a.avance_pct > 0 ? `${Math.round(a.avance_pct)}%` : "—"}
                      </td>
                      <td className="px-3 py-2 text-xs text-text-secondary">
                        {a.responsable || "—"}
                      </td>
                      <td className="px-3 py-2">
                        <Button variant="outline" size="sm" onClick={() => abrirActividad(a, "anexos")} aria-label={`Ver adjuntos de ${a.titulo}`}>
                          <Paperclip className="size-3.5" aria-hidden="true" />Adjuntos
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <p className="text-2xs text-text-tertiary">
        Fuentes de formulación: comunicaciones · agendas de mesas ·
        formularios de consulta (read-only). Botón de creación dentro de cada
        módulo nativo.
      </p>
    </div>
  );
}
