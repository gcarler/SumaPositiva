"use client";

import { useState, useMemo } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Slider } from "@/shared/ui/slider";
import { Badge } from "@/shared/ui/badge";
import { Textarea } from "@/shared/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  Calendar,
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Trash2,
  Search,
  Filter,
  FileCheck2,
  UserCheck,
  Send,
} from "lucide-react";
import {
  ESTADOS_COMPROMISO_META,
  TIPOS_COMPROMISO_META,
  type CompromisoMesa,
  type EstadoCompromiso,
  type MesaDeTrabajo,
  type TipoCompromiso,
} from "@/features/mesas/models/mesas";
import { useMesasStore } from "@/features/mesas/state/mesas-store";
import { useSesionStore } from "@/features/sesion/state/session-store";
import { toast } from "sonner";
import { Notice } from "@/shared/ui/notice";
import { ingestarEventoSM } from "@/features/sm/api/sm-api";

interface MesaCompromisosTablaProps {
  mesa: MesaDeTrabajo;
  soloLectura?: boolean;
}

export function MesaCompromisosTabla({ mesa, soloLectura = false }: MesaCompromisosTablaProps) {
  const compromisos = useMemo(() => mesa.compromisos ?? [], [mesa.compromisos]);

  const agregarCompromiso = useMesasStore((s) => s.agregarCompromiso);
  const actualizarCompromiso = useMesasStore((s) => s.actualizarCompromiso);
  const eliminarCompromiso = useMesasStore((s) => s.eliminarCompromiso);

  // El destinatario es la cuenta autenticada, nunca un correo deducido del nombre.
  const sesionCliente = useSesionStore((s) => s.sesion);
  const sesion = typeof window === "undefined" ? useSesionStore.getState().sesion : sesionCliente;
  const usuarioId = sesion?.usuarioId ?? null;
  const correoOperador = sesion?.usuario?.correo ?? null;
  const puedeNotificar = Boolean(usuarioId && correoOperador && !soloLectura);

  // Filtros
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [busqueda, setBusqueda] = useState("");

  // Formulario nuevo compromiso
  const [mostrarForm, setMostrarForm] = useState(false);
  const [descripcion, setDescripcion] = useState("");
  const [entidad, setEntidad] = useState(mesa.entidad || "Alcaldía Mayor de Cartagena");
  const [persona, setPersona] = useState("");
  const [fechaLimite, setFechaLimite] = useState("");
  const [tipo, setTipo] = useState<TipoCompromiso>("acuerdo_comunitario");
  const [avance, setAvance] = useState<number>(0);
  const [observaciones, setObservaciones] = useState("");

  const handleCrearCompromiso = (e: React.FormEvent) => {
    e.preventDefault();
    if (!descripcion.trim()) {
      toast.error("Ingresa la descripción del acuerdo o compromiso");
      return;
    }
    if (!entidad.trim()) {
      toast.error("Indica la entidad u organización responsable");
      return;
    }

    agregarCompromiso(mesa.id, {
      codigo: "",
      descripcion: descripcion.trim(),
      entidadResponsable: entidad.trim(),
      personaResponsable: persona.trim() || undefined,
      fechaLimite: fechaLimite || undefined,
      tipo,
      estado: "pendiente",
      avancePorcentaje: avance,
      observaciones: observaciones.trim() || undefined,
    });

    setDescripcion("");
    setPersona("");
    setFechaLimite("");
    setAvance(0);
    setObservaciones("");
    setMostrarForm(false);
    toast.success("Compromiso registrado con trazabilidad de cumplimiento");
  };

  const handleCambiarEstado = (compId: string, nuevoEstado: EstadoCompromiso) => {
    if (soloLectura) return;
    const nuevoAvance = nuevoEstado === "cumplido" ? 100 : undefined;
    actualizarCompromiso(mesa.id, compId, {
      estado: nuevoEstado,
      ...(nuevoAvance !== undefined ? { avancePorcentaje: nuevoAvance } : {}),
    });
    toast.success("Estado del compromiso actualizado");
  };

  const _handleCambiarAvance = (compId: string, nuevoAvance: number) => {
    if (soloLectura) return;
    const estadoSugerido: EstadoCompromiso =
      nuevoAvance === 100 ? "cumplido" : nuevoAvance > 0 ? "en_ejecucion" : "pendiente";
    actualizarCompromiso(mesa.id, compId, {
      avancePorcentaje: nuevoAvance,
      estado: estadoSugerido,
    });
  };

  const [notificandoCompId, setNotificandoCompId] = useState<string | null>(null);
  const [notificacionCompExito, setNotificacionCompExito] = useState<{
    id: string;
    codigo: string;
    outboxId: string;
    hash: string;
  } | null>(null);

  const handleNotificarAsignacion = async (comp: CompromisoMesa) => {
    if (!puedeNotificar || !usuarioId || !correoOperador) return;
    setNotificandoCompId(comp.id);
    try {
      const resultado = await ingestarEventoSM({
        tipo_evento: "mesa.compromiso.asignado",
        actor: usuarioId,
        canal: "correo",
        contacto: correoOperador,
        idempotencia: `mesa-${mesa.id}-comp-${comp.id}-notif-${usuarioId}`,
        entidad: "compromiso",
        entidad_id: comp.id,
        asunto: `Asignación de Compromiso Territorial ${comp.codigo} — POLIS`,
        cuerpo: `Se le ha asignado el compromiso ${comp.codigo} en la mesa "${mesa.nombre}": "${comp.descripcion}". Plazo acordado: ${comp.fechaLimite || "A concertar"}.`,
        payload: {
          mesa_id: mesa.id,
          compromiso_id: comp.id,
          codigo: comp.codigo,
          entidad: comp.entidadResponsable,
        },
      });

      setNotificacionCompExito({
        id: comp.id,
        codigo: comp.codigo,
        outboxId: resultado.id,
        hash: resultado.contacto_hash,
      });
      toast.success(`Notificación encolada en SM Core para ${comp.codigo}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al despachar evento a SM Core";
      toast.error(`No fue posible encolar notificación: ${msg}`);
    } finally {
      setNotificandoCompId(null);
    }
  };

  const compromisosFiltrados = useMemo(() => {
    return compromisos.filter((c) => {
      const matchEstado = filtroEstado === "todos" || c.estado === filtroEstado;
      const term = busqueda.toLowerCase().trim();
      const matchTerm =
        !term ||
        c.codigo.toLowerCase().includes(term) ||
        c.descripcion.toLowerCase().includes(term) ||
        c.entidadResponsable.toLowerCase().includes(term) ||
        (c.personaResponsable && c.personaResponsable.toLowerCase().includes(term));
      return matchEstado && matchTerm;
    });
  }, [compromisos, filtroEstado, busqueda]);

  // Contadores
  const total = compromisos.length;
  const cumplidos = compromisos.filter((c) => c.estado === "cumplido").length;
  const enEjecucion = compromisos.filter((c) => c.estado === "en_ejecucion").length;
  const enRiesgo = compromisos.filter((c) => c.estado === "en_riesgo").length;

  return (
    <div className="space-y-6" data-testid="mesa-compromisos-tabla">
      {/* Encabezado y Resumen de Compromisos */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold tracking-wider text-[var(--text-tertiary)]">
              Fase 3: Acuerdos y Compromisos
            </span>
            <span className="text-xs text-[var(--text-tertiary)]">•</span>
            <span className="text-xs font-semibold text-[var(--ember)]">
              Fe Pública y Control Social
            </span>
          </div>
          <h3 className="text-base font-bold text-[var(--text-primary)] mt-0.5">
            Matriz de Acuerdos Territoriales con Trazabilidad
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Pactos suscritos entre la comunidad y el Distrito con entidad responsable y fecha de seguimiento
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!soloLectura && (
            <Button
              variant="ember"
              size="sm"
              onClick={() => setMostrarForm(!mostrarForm)}
              className="text-xs"
            >
              <Plus className="size-3.5 mr-1" aria-hidden="true" />
              {mostrarForm ? "Cerrar Formulario" : "Nuevo Compromiso"}
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards de Estados */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)]">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-tertiary)]">
            Total Acuerdos
          </span>
          <p className="text-xl font-bold font-mono text-[var(--text-primary)] mt-0.5">
            {total}
          </p>
        </div>
        <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)]">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--success)] flex items-center gap-1">
            <CheckCircle2 className="size-3" aria-hidden="true" />
            Cumplidos
          </span>
          <p className="text-xl font-bold font-mono text-[var(--success)] mt-0.5">
            {cumplidos}
          </p>
        </div>
        <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)]">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--info)] flex items-center gap-1">
            <Clock className="size-3" aria-hidden="true" />
            En Ejecución
          </span>
          <p className="text-xl font-bold font-mono text-[var(--info)] mt-0.5">
            {enEjecucion}
          </p>
        </div>
        <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)]">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--danger)] flex items-center gap-1">
            <AlertTriangle className="size-3" aria-hidden="true" />
            En Riesgo
          </span>
          <p className="text-xl font-bold font-mono text-[var(--danger)] mt-0.5">
            {enRiesgo}
          </p>
        </div>
      </div>

      {/* Formulario Nuevo Compromiso */}
      {mostrarForm && !soloLectura && (
        <form
          onSubmit={handleCrearCompromiso}
          className="p-4 sm:p-5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] space-y-4"
          data-testid="form-nuevo-compromiso"
        >
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
              <FileCheck2 className="size-4 text-[var(--ember)]" aria-hidden="true" />
              Registrar Nuevo Compromiso Comunitario / Distrital
            </h4>
            <span className="text-[11px] text-[var(--text-tertiary)]">
              Código sugerido: COMP-{(total + 1).toString().padStart(2, "0")}
            </span>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-[var(--text-secondary)] font-medium">
              Descripción del acuerdo o meta pactada *
            </Label>
            <Textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej. La Secretaría de Infraestructura se compromete al bacheo y pavimentación de la vía principal de acceso..."
              className="text-xs min-h-[70px]"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-[var(--text-secondary)] font-medium">
                Entidad u Organización Responsable *
              </Label>
              <Input
                value={entidad}
                onChange={(e) => setEntidad(e.target.value)}
                placeholder="Ej. Secretaría de Infraestructura"
                className="text-xs"
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-[var(--text-secondary)] font-medium">
                Funcionario o Enlace Encargado
              </Label>
              <Input
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
                placeholder="Ej. Ing. Roberto Mendoza"
                className="text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-[var(--text-secondary)] font-medium">
                Fecha Límite / Plazo Acordado
              </Label>
              <Input
                type="date"
                value={fechaLimite}
                onChange={(e) => setFechaLimite(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-[var(--text-secondary)] font-medium">
                Tipo de Compromiso
              </Label>
              <Select
                value={tipo}
                onValueChange={(val) => setTipo(val as TipoCompromiso)}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TIPOS_COMPROMISO_META) as TipoCompromiso[]).map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">
                      {TIPOS_COMPROMISO_META[t].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-[var(--text-secondary)] font-medium">
                Porcentaje de Avance Inicial ({avance}%)
              </Label>
              <div className="pt-2">
                <Slider
                  min={0}
                  max={100}
                  step={5}
                  value={[avance]}
                  onValueChange={(vals) => setAvance(vals[0] ?? 0)}
                  aria-label="Porcentaje de avance"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-[var(--text-secondary)] font-medium">
              Observaciones o condiciones de verificación
            </Label>
            <Input
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Ej. Sujeto a la aprobación presupuestal en sesión del Concejo..."
              className="text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setMostrarForm(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button type="submit" variant="ember" size="sm" className="text-xs">
              Guardar Acuerdo
            </Button>
          </div>
        </form>
      )}

      {/* Barra de Búsqueda y Filtros */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 size-3.5 text-[var(--text-tertiary)]" aria-hidden="true" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por código, tema o entidad..."
            className="pl-8 text-xs h-8"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="size-3.5 text-[var(--text-tertiary)]" aria-hidden="true" />
          <Select value={filtroEstado} onValueChange={setFiltroEstado}>
            <SelectTrigger className="text-xs h-8 w-44">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos" className="text-xs">
                Todos los estados ({total})
              </SelectItem>
              {(Object.keys(ESTADOS_COMPROMISO_META) as EstadoCompromiso[]).map((est) => (
                <SelectItem key={est} value={est} className="text-xs">
                  {ESTADOS_COMPROMISO_META[est].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Lista de Tarjetas de Compromisos */}
      {compromisosFiltrados.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-xs text-[var(--text-tertiary)] space-y-1">
          <FileCheck2 className="size-8 mx-auto text-[var(--text-tertiary)]/50" aria-hidden="true" />
          <p className="font-semibold text-[var(--text-primary)]">
            No hay compromisos registrados en esta vista
          </p>
          <p>
            {total === 0
              ? "Usa el botón superior para agregar los acuerdos concertados durante la plenaria de cierre."
              : "Prueba cambiando los criterios de filtro o búsqueda."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {compromisosFiltrados.map((comp) => {
            const estadoMeta = ESTADOS_COMPROMISO_META[comp.estado];
            const tipoMeta = TIPOS_COMPROMISO_META[comp.tipo];
            const porcentaje = comp.avancePorcentaje ?? (comp.estado === "cumplido" ? 100 : 0);

            return (
              <article
                key={comp.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-xs space-y-3 transition-colors hover:border-[var(--border-strong)]"
                data-testid={`compromiso-${comp.codigo}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border)] pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[var(--ember)] bg-[var(--surface-2)] px-2 py-0.5 rounded">
                      {comp.codigo}
                    </span>
                    <Badge variant={tipoMeta?.badgeVariant ?? "outline"} className="text-[10px]">
                      {tipoMeta?.label ?? comp.tipo}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Selector de Estado rápido */}
                    {!soloLectura ? (
                      <Select
                        value={comp.estado}
                        onValueChange={(val) => handleCambiarEstado(comp.id, val as EstadoCompromiso)}
                      >
                        <SelectTrigger className="text-xs h-7 w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(ESTADOS_COMPROMISO_META) as EstadoCompromiso[]).map((est) => (
                            <SelectItem key={est} value={est} className="text-xs">
                              {ESTADOS_COMPROMISO_META[est].label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant={estadoMeta?.badgeVariant ?? "outline"} className="text-[10px]">
                        {estadoMeta?.label ?? comp.estado}
                      </Badge>
                    )}

                    {!soloLectura && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => eliminarCompromiso(mesa.id, comp.id)}
                        aria-label={`Eliminar compromiso ${comp.codigo}`}
                        className="text-[var(--text-tertiary)] hover:text-[var(--danger)]"
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-[var(--text-primary)] leading-relaxed font-medium">
                  {comp.descripcion}
                </p>

                {/* Metadatos y Barra de Avance */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs text-[var(--text-secondary)] pt-1">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="size-3.5 text-[var(--text-tertiary)] shrink-0" aria-hidden="true" />
                    <span className="truncate">
                      <strong>Entidad:</strong> {comp.entidadResponsable}
                    </span>
                  </div>

                  {comp.personaResponsable && (
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="size-3.5 text-[var(--text-tertiary)] shrink-0" aria-hidden="true" />
                      <span className="truncate">
                        <strong>Enlace:</strong> {comp.personaResponsable}
                      </span>
                    </div>
                  )}

                  {comp.fechaLimite && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="size-3.5 text-[var(--text-tertiary)] shrink-0" aria-hidden="true" />
                      <span>
                        <strong>Plazo:</strong> {comp.fechaLimite}
                      </span>
                    </div>
                  )}
                </div>

                {/* Barra de Avance Interactivo */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[var(--text-tertiary)]">Avance de ejecución:</span>
                    <span className="font-mono font-bold text-[var(--text-primary)]">
                      {porcentaje}%
                    </span>
                  </div>
                  <div
                    className="w-full h-1.5 rounded-full bg-[var(--surface-3)] overflow-hidden"
                    role="progressbar"
                    aria-valuenow={porcentaje}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Avance de ${comp.codigo}`}
                  >
                    <div
                      className={`h-full transition-all duration-300 ${
                        comp.estado === "cumplido"
                          ? "bg-[var(--success)]"
                          : comp.estado === "en_riesgo"
                          ? "bg-[var(--danger)]"
                          : "bg-[var(--ember)]"
                      }`}
                      style={{ width: `${porcentaje}%` }}
                    />
                  </div>
                </div>

                {comp.observaciones && (
                  <p className="text-[11px] text-[var(--text-tertiary)] italic pt-1 border-t border-[var(--border)]">
                    Nota: {comp.observaciones}
                  </p>
                )}

                {/* Acción de Notificación Institucional SM Core */}
                {!soloLectura && (
                  <div className="pt-2 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-col items-start gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleNotificarAsignacion(comp)}
                        disabled={!puedeNotificar || notificandoCompId === comp.id}
                        className="text-xs h-7"
                        aria-label={`Notificar asignación de compromiso ${comp.codigo} a responsable`}
                      >
                        <Send className="size-3 mr-1 text-[var(--ember)]" aria-hidden="true" />
                        {notificandoCompId === comp.id
                          ? "Encolando en SM..."
                          : "Notificar asignación a responsable"}
                      </Button>
                      <span className="text-[10px] text-[var(--text-tertiary)]">
                        {puedeNotificar
                          ? "Se envía a tu correo registrado con consentimiento SM."
                          : "Requiere sesión institucional con correo registrado."}
                      </span>
                    </div>
                    <span className="text-[10px] text-[var(--text-tertiary)]">
                      Trazabilidad SM Core • Ley 1581/2012
                    </span>
                  </div>
                )}

                {notificacionCompExito?.id === comp.id && (
                  <Notice
                    tone="success"
                    title={`Notificación encolada en SM Core para ${comp.codigo}`}
                    className="text-xs mt-2"
                  >
                    <div className="space-y-1 text-[11px]">
                      <p>
                        El evento institucional fue registrado con ID{" "}
                        <span className="font-mono font-bold">{notificacionCompExito.outboxId}</span>.
                      </p>
                      <p className="font-mono text-[10px] text-[var(--text-tertiary)] break-all">
                        Seudónimo de contacto (Ley 1581/2012): {notificacionCompExito.hash}
                      </p>
                    </div>
                  </Notice>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
