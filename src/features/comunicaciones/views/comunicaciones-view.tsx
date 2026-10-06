"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
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
  X,
  Save,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Label } from "@/shared/ui/label";
import { Badge } from "@/shared/ui/badge";
import { Notice } from "@/shared/ui/notice";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  ETAPAS_CRONOGRAMA,
  ESTADOS_TAREA,
  type EstadoTarea,
  type TareaComunicacion,
  type TareaComunicacionPayload,
} from "../models/tarea-comunicacion";
import {
  actualizarTareaComunicacion,
  crearTareaComunicacion,
  listarTareasComunicacion,
} from "../services/comunicaciones-api";

export function ComunicacionesView() {
  const [tareas, setTareas] = useState<TareaComunicacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [etapaSeleccionada, setEtapaSeleccionada] = useState<string>("todas");
  const [estadoSeleccionado, setEstadoSeleccionado] = useState<string>("todos");
  const [busqueda, setBusqueda] = useState<string>("");

  // Editor activo (inline)
  const [editorAbierto, setEditorAbierto] = useState(false);
  const [tareaSeleccionada, setTareaSeleccionada] = useState<TareaComunicacion | null>(null);

  // Campos del editor
  const [formCodigo, setFormCodigo] = useState("");
  const [formTitulo, setFormTitulo] = useState("");
  const [formEtapa, setFormEtapa] = useState<string>(ETAPAS_CRONOGRAMA[0]);
  const [formTerritorio, setFormTerritorio] = useState("");
  const [formFechaInicio, setFormFechaInicio] = useState("");
  const [formFechaFin, setFormFechaFin] = useState("");
  const [formEstado, setFormEstado] = useState<EstadoTarea>("pendiente");
  const [formResponsable, setFormResponsable] = useState("Equipo de Comunicaciones");
  const [formDescripcion, setFormDescripcion] = useState("");
  const [formEntregables, setFormEntregables] = useState("");
  const [formOrden, setFormOrden] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

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
    setTareaSeleccionada(tarea);
    setFormCodigo(tarea.codigo);
    setFormTitulo(tarea.titulo);
    setFormEtapa(tarea.etapa);
    setFormTerritorio(tarea.territorio);
    setFormFechaInicio(tarea.fecha_inicio);
    setFormFechaFin(tarea.fecha_fin);
    setFormEstado(tarea.estado);
    setFormResponsable(tarea.responsable);
    setFormDescripcion(tarea.descripcion);
    setFormEntregables(tarea.entregables);
    setFormOrden(tarea.orden);
    setErrorForm(null);
    setMensajeExito(null);
    setEditorAbierto(true);
  };

  const abrirCreacion = () => {
    setTareaSeleccionada(null);
    setFormCodigo("");
    setFormTitulo("");
    setFormEtapa(ETAPAS_CRONOGRAMA[0]);
    setFormTerritorio("");
    setFormFechaInicio("2026-10-06");
    setFormFechaFin("2026-10-06");
    setFormEstado("pendiente");
    setFormResponsable("Equipo de Comunicaciones");
    setFormDescripcion("");
    setFormEntregables("");
    setFormOrden(tareas.length + 1);
    setErrorForm(null);
    setMensajeExito(null);
    setEditorAbierto(true);
  };

  const cerrarEditor = () => {
    setEditorAbierto(false);
    setTareaSeleccionada(null);
    setErrorForm(null);
  };

  const handleGuardarForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorForm(null);

    if (!formCodigo.trim()) {
      setErrorForm("El código de la tarea es obligatorio (ej. TC-01).");
      return;
    }
    if (!formTitulo.trim()) {
      setErrorForm("El título de la tarea es obligatorio.");
      return;
    }
    if (!formFechaInicio || !formFechaFin) {
      setErrorForm("Las fechas de inicio y culminación son obligatorias.");
      return;
    }
    if (formFechaFin < formFechaInicio) {
      setErrorForm("La fecha de culminación no puede ser anterior a la fecha de inicio.");
      return;
    }

    setGuardando(true);
    try {
      const payload: TareaComunicacionPayload = {
        codigo: formCodigo.trim(),
        titulo: formTitulo.trim(),
        etapa: formEtapa,
        territorio: formTerritorio.trim() || "Distrito de Cartagena",
        fecha_inicio: formFechaInicio,
        fecha_fin: formFechaFin,
        estado: formEstado,
        responsable: formResponsable.trim() || "Equipo de Comunicaciones",
        descripcion: formDescripcion.trim(),
        entregables: formEntregables.trim(),
        orden: formOrden,
      };

      let guardada: TareaComunicacion;
      if (tareaSeleccionada) {
        guardada = await actualizarTareaComunicacion(tareaSeleccionada.id, payload);
      } else {
        guardada = await crearTareaComunicacion(payload);
      }

      setTareas((prev) => {
        const idx = prev.findIndex((t) => t.id === guardada.id);
        if (idx >= 0) {
          const copia = [...prev];
          copia[idx] = guardada;
          return copia;
        }
        return [...prev, guardada].sort(
          (a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio) || a.orden - b.orden
        );
      });

      setMensajeExito(
        `Tarea ${guardada.codigo} guardada correctamente con fechas del ${guardada.fecha_inicio} al ${guardada.fecha_fin}.`
      );
      setEditorAbierto(false);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Error al guardar la tarea de comunicación.";
      setErrorForm(msg);
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstadoRapido = async (
    tarea: TareaComunicacion,
    nuevoEstado: EstadoTarea
  ) => {
    try {
      const actualizada = await actualizarTareaComunicacion(tarea.id, {
        estado: nuevoEstado,
      });
      setTareas((prev) =>
        prev.map((t) => (t.id === actualizada.id ? actualizada : t))
      );
    } catch (err: unknown) {
      alert(
        err instanceof Error
          ? err.message
          : "No se pudo actualizar el estado de la tarea."
      );
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

  // Métricas
  const total = tareas.length;
  const enProgreso = tareas.filter((t) => t.estado === "en_progreso").length;
  const completadas = tareas.filter((t) => t.estado === "completada").length;
  const pendientes = tareas.filter((t) => t.estado === "pendiente").length;

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

      {/* Notificación de Éxito al Guardar */}
      {mensajeExito && (
        <Notice tone="success" title="Operación exitosa">
          {mensajeExito}
        </Notice>
      )}

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
            Primera Mesa
          </div>
          <p className="mt-1 text-sm font-bold text-primary">15 Octubre</p>
          <p className="text-2xs text-text-secondary">Hito Inaugural</p>
        </div>

        <div className="rounded-lg border border-border bg-surface-1 p-3 shadow-xs">
          <div className="flex items-center gap-1 text-xs font-medium text-text-secondary">
            <CheckCircle2 className="size-3.5" />
            Cierre Diagnóstico
          </div>
          <p className="mt-1 text-sm font-bold text-text-primary">15 Diciembre</p>
          <p className="text-2xs text-text-secondary">Entrega Oficial</p>
        </div>
      </div>

      {/* Editor Integrado (Zero-Modals: Panel Inline) */}
      {editorAbierto && (
        <section
          aria-label="Editor de Tarea y Fechas"
          className="rounded-xl border-2 border-primary/40 bg-surface-1 p-5 shadow-md"
        >
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h2 className="text-base font-bold text-text-primary">
                {tareaSeleccionada
                  ? `Editar Tarea y Fechas: ${tareaSeleccionada.codigo}`
                  : "Nueva Tarea de Comunicación"}
              </h2>
              <p className="text-xs text-text-secondary">
                Ajusta las fechas de inicio/fin, territorio, estado y entregables operativos.
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={cerrarEditor}
              aria-label="Cerrar editor"
            >
              <X className="size-4" />
            </Button>
          </div>

          {errorForm && (
            <div className="mt-3">
              <Notice tone="danger" title="Error en la tarea">
                {errorForm}
              </Notice>
            </div>
          )}

          <form onSubmit={handleGuardarForm} className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="tc-form-codigo">Código identificador *</Label>
                <Input
                  id="tc-form-codigo"
                  value={formCodigo}
                  onChange={(e) => setFormCodigo(e.target.value)}
                  placeholder="Ej. TC-01"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="tc-form-estado">Estado de avance</Label>
                <Select
                  value={formEstado}
                  onValueChange={(val) => setFormEstado(val as EstadoTarea)}
                >
                  <SelectTrigger id="tc-form-estado" aria-label="Estado de avance">
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ESTADOS_TAREA).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="tc-form-titulo">Título de la actividad *</Label>
              <Input
                id="tc-form-titulo"
                value={formTitulo}
                onChange={(e) => setFormTitulo(e.target.value)}
                placeholder="Ej. Jornada de Campo 1: Entorno Urbano y Convivencia"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="tc-form-etapa">Etapa del cronograma</Label>
                <Select
                  value={formEtapa}
                  onValueChange={(val) => setFormEtapa(val)}
                >
                  <SelectTrigger id="tc-form-etapa" aria-label="Etapa del cronograma">
                    <SelectValue placeholder="Seleccionar etapa" />
                  </SelectTrigger>
                  <SelectContent>
                    {ETAPAS_CRONOGRAMA.map((et) => (
                      <SelectItem key={et} value={et}>
                        {et}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="tc-form-territorio">Territorio / Barrios</Label>
                <Input
                  id="tc-form-territorio"
                  value={formTerritorio}
                  onChange={(e) => setFormTerritorio(e.target.value)}
                  placeholder="Ej. Localidad 1: San Francisco y Canapote"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="tc-form-ini">Fecha de inicio (YYYY-MM-DD) *</Label>
                <Input
                  id="tc-form-ini"
                  type="date"
                  value={formFechaInicio}
                  onChange={(e) => setFormFechaInicio(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="tc-form-fin">Fecha de culminación (YYYY-MM-DD) *</Label>
                <Input
                  id="tc-form-fin"
                  type="date"
                  value={formFechaFin}
                  onChange={(e) => setFormFechaFin(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="tc-form-resp">Responsable de entrega</Label>
                <Input
                  id="tc-form-resp"
                  value={formResponsable}
                  onChange={(e) => setFormResponsable(e.target.value)}
                  placeholder="Ej. Equipo Audiovisual y Reportería Social"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="tc-form-orden">Orden numérico</Label>
                <Input
                  id="tc-form-orden"
                  type="number"
                  value={formOrden}
                  onChange={(e) => setFormOrden(parseInt(e.target.value, 10) || 0)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="tc-form-desc">Descripción operativa de la actividad</Label>
              <Textarea
                id="tc-form-desc"
                rows={3}
                value={formDescripcion}
                onChange={(e) => setFormDescripcion(e.target.value)}
                placeholder="Detalla qué se hará en campo, temas de entrevistas, reuniones o cobertura..."
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="tc-form-entregables">Entregables verificables</Label>
              <Textarea
                id="tc-form-entregables"
                rows={2}
                value={formEntregables}
                onChange={(e) => setFormEntregables(e.target.value)}
                placeholder="Ej. 15 fotos de alta resolución + 3 cápsulas de video con testimonios..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={cerrarEditor}
                disabled={guardando}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={guardando} className="gap-2">
                <Save className="size-4" />
                {guardando ? "Guardando..." : "Guardar Tarea y Fechas"}
              </Button>
            </div>
          </form>
        </section>
      )}

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-1 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
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
            <Filter className="size-4 text-text-secondary shrink-0" />
            <Select
              value={etapaSeleccionada}
              onValueChange={(val) => setEtapaSeleccionada(val)}
            >
              <SelectTrigger aria-label="Filtrar por etapa" className="text-xs h-9">
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

          <div className="min-w-[140px]">
            <Select
              value={estadoSeleccionado}
              onValueChange={(val) => setEstadoSeleccionado(val)}
            >
              <SelectTrigger aria-label="Filtrar por estado" className="text-xs h-9">
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
        </div>

        <div className="text-xs text-text-secondary">
          Mostrando <strong>{tareasFiltradas.length}</strong> de {total} tareas
        </div>
      </div>

      {/* Mensaje de Error si ocurre */}
      {error && (
        <Notice tone="danger" title="No se pudieron cargar las tareas">
          {error}
          <div className="mt-2">
            <Button size="sm" variant="outline" onClick={cargarTareas}>
              Reintentar
            </Button>
          </div>
        </Notice>
      )}

      {/* Lista de Tareas */}
      {cargando ? (
        <div className="rounded-lg border border-border bg-surface-1 p-12 text-center text-sm text-text-secondary">
          Cargando cronograma de comunicaciones de la política pública...
        </div>
      ) : tareasFiltradas.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface-1 p-12 text-center">
          <p className="text-sm font-medium text-text-primary">
            No se encontraron tareas con los filtros actuales.
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            Intenta cambiar los filtros de etapa o búsqueda, o crea una nueva tarea.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {tareasFiltradas.map((tarea) => {
            const estadoCfg = ESTADOS_TAREA[tarea.estado] || ESTADOS_TAREA.pendiente;
            const esMismoDia = tarea.fecha_inicio === tarea.fecha_fin;

            return (
              <div
                key={tarea.id}
                className="group relative flex flex-col justify-between gap-4 rounded-lg border border-border bg-surface-1 p-4 shadow-2xs transition hover:border-primary/40 hover:shadow-xs md:flex-row md:items-start"
              >
                <div className="space-y-2 flex-1 min-w-0">
                  {/* Encabezado: Código, Etapa, Estado */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-primary">
                      {tarea.codigo}
                    </span>
                    <Badge variant={estadoCfg.tone}>{estadoCfg.label}</Badge>
                    <span className="text-xs text-text-secondary">·</span>
                    <span className="text-xs font-medium text-text-secondary">
                      {tarea.etapa}
                    </span>
                  </div>

                  {/* Título */}
                  <h3 className="text-base font-semibold text-text-primary">
                    {tarea.titulo}
                  </h3>

                  {/* Metadatos: Fechas, Territorio, Responsable */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary">
                    <div className="flex items-center gap-1 font-medium text-text-primary">
                      <Calendar className="size-3.5 text-primary" />
                      <span>
                        {esMismoDia
                          ? tarea.fecha_inicio
                          : `${tarea.fecha_inicio} al ${tarea.fecha_fin}`}
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
                    <p className="text-xs text-text-secondary leading-relaxed">
                      {tarea.descripcion}
                    </p>
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
                <div className="flex shrink-0 flex-row items-center gap-2 self-end md:flex-col md:items-end md:self-start">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => abrirEdicion(tarea)}
                  >
                    <Edit3 className="size-3.5" />
                    Editar Tarea y Fechas
                  </Button>

                  {/* Conmutador Rápido de Estado */}
                  <div className="flex items-center gap-1">
                    {tarea.estado !== "completada" ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => cambiarEstadoRapido(tarea, "completada")}
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
                        onClick={() => cambiarEstadoRapido(tarea, "en_progreso")}
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
          })}
        </div>
      )}
    </div>
  );
}
