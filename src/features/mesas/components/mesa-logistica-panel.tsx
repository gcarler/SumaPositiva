"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Badge } from "@/shared/ui/badge";
import { Checkbox } from "@/shared/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  CheckSquare,
  Plus,
  Trash2,
  Users,
  Phone,
  Building2,
  MapPin,
  Volume2,
  Layers,
  Package,
  ShieldAlert,
  Send,
  BellRing,
} from "lucide-react";
import {
  CATEGORIAS_LOGISTICA_META,
  ROLES_LOGISTICOS_META,
  crearLogisticaPorDefecto,
  type CategoriaItemLogistico,
  type LogisticaMesa,
  type MesaDeTrabajo,
  type RolLogistico,
} from "@/features/mesas/models/mesas";
import { useMesasStore } from "@/features/mesas/state/mesas-store";
import { useSesionStore } from "@/features/sesion/state/session-store";
import { toast } from "sonner";
import { Notice } from "@/shared/ui/notice";
import { ingestarEventoSM } from "@/features/sm/api/sm-api";

interface MesaLogisticaPanelProps {
  mesa: MesaDeTrabajo;
  soloLectura?: boolean;
}

const CATEGORIA_ICONS: Record<
  CategoriaItemLogistico,
  React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>
> = {
  espacio: MapPin,
  audiovisual: Volume2,
  materiales: Layers,
  refrigerios: Package,
  seguridad_accesibilidad: ShieldAlert,
};

export function MesaLogisticaPanel({ mesa, soloLectura = false }: MesaLogisticaPanelProps) {
  const logistica: LogisticaMesa = mesa.logistica ?? crearLogisticaPorDefecto();

  const toggleChecklistLogistico = useMesasStore((s) => s.toggleChecklistLogistico);
  const agregarItemChecklist = useMesasStore((s) => s.agregarItemChecklist);
  const eliminarItemChecklist = useMesasStore((s) => s.eliminarItemChecklist);
  const agregarResponsableLogistico = useMesasStore((s) => s.agregarResponsableLogistico);
  const eliminarResponsableLogistico = useMesasStore((s) => s.eliminarResponsableLogistico);

  // Formulario agregar tarea
  const [mostrarFormTarea, setMostrarFormTarea] = useState(false);
  const [nuevaTarea, setNuevaTarea] = useState("");
  const [nuevaCategoria, setNuevaCategoria] = useState<CategoriaItemLogistico>("materiales");
  const [nuevoResponsableTarea, setNuevoResponsableTarea] = useState("");

  // Formulario agregar responsable logístico
  const [mostrarFormResp, setMostrarFormResp] = useState(false);
  const [nombreResp, setNombreResp] = useState("");
  const [rolResp, setRolResp] = useState<RolLogistico>("coordinador_general");
  const [telResp, setTelResp] = useState("");
  const [entidadResp, setEntidadResp] = useState("");

  // Despacho de Convocatoria SM Core: solo con la cuenta autenticada y su correo
  // registrado. Nunca se inventa un destinatario ni se usa un nombre como actor.
  const sesionCliente = useSesionStore((s) => s.sesion);
  const sesion = typeof window === "undefined" ? useSesionStore.getState().sesion : sesionCliente;
  const usuarioId = sesion?.usuarioId ?? null;
  const correoOperador = sesion?.usuario?.correo ?? null;
  const puedeNotificar = Boolean(usuarioId && correoOperador && !soloLectura);
  const [enviandoConvocatoria, setEnviandoConvocatoria] = useState(false);
  const [convocatoriaExito, setConvocatoriaExito] = useState<{
    outboxId: string;
    hash: string;
  } | null>(null);

  const handleNotificarConvocatoria = async () => {
    if (!puedeNotificar || !usuarioId || !correoOperador) return;
    setEnviandoConvocatoria(true);
    try {
      const resultado = await ingestarEventoSM({
        tipo_evento: "mesa.convocatoria",
        actor: usuarioId,
        canal: "correo",
        contacto: correoOperador,
        idempotencia: `mesa-${mesa.id}-convocatoria-${usuarioId}`,
        entidad: "mesa",
        entidad_id: mesa.id,
        asunto: `Convocatoria Oficial: ${mesa.nombre} — POLIS`,
        cuerpo: `Se convoca a la ciudadanía y delegados institucionales a la mesa "${mesa.nombre}" a realizarse en ${mesa.lugar || "Sede Comunal"} el ${mesa.fecha || "próximamente"}.`,
        payload: {
          mesa_id: mesa.id,
          nombre: mesa.nombre,
          lugar: mesa.lugar || "",
          fecha: mesa.fecha || "",
          tipoMesa: mesa.tipoMesa || "",
        },
      });

      setConvocatoriaExito({
        outboxId: resultado.id,
        hash: resultado.contacto_hash,
      });
      toast.success("Convocatoria encolada exitosamente en el subsistema SM Core");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al notificar convocatoria";
      toast.error(`No fue posible encolar convocatoria: ${msg}`);
    } finally {
      setEnviandoConvocatoria(false);
    }
  };

  // Estadísticas
  const totalItems = logistica.checklist.length;
  const completados = logistica.checklist.filter((i) => i.completado).length;
  const porcentaje = totalItems > 0 ? Math.round((completados / totalItems) * 100) : 0;

  const handleToggle = (itemId: string) => {
    if (soloLectura) return;
    toggleChecklistLogistico(mesa.id, itemId);
  };

  const handleAgregarTarea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaTarea.trim()) {
      toast.error("Ingresa la descripción de la tarea");
      return;
    }
    agregarItemChecklist(mesa.id, {
      categoria: nuevaCategoria,
      tarea: nuevaTarea.trim(),
      completado: false,
      responsable: nuevoResponsableTarea.trim() || undefined,
    });
    setNuevaTarea("");
    setNuevoResponsableTarea("");
    setMostrarFormTarea(false);
    toast.success("Tarea logística añadida al checklist");
  };

  const handleAgregarResponsable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreResp.trim()) {
      toast.error("Ingresa el nombre del responsable");
      return;
    }
    agregarResponsableLogistico(mesa.id, {
      nombre: nombreResp.trim(),
      rolLogistico: rolResp,
      telefono: telResp.trim() || undefined,
      entidad: entidadResp.trim() || undefined,
    });
    setNombreResp("");
    setTelResp("");
    setEntidadResp("");
    setMostrarFormResp(false);
    toast.success("Responsable logístico asignado");
  };

  const categorias = (Object.keys(CATEGORIAS_LOGISTICA_META) as CategoriaItemLogistico[]);

  return (
    <div className="space-y-6" data-testid="mesa-logistica-panel">
      {/* Barra Superior de Estado y Progreso */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold tracking-wider text-[var(--text-tertiary)]">
              Fase 1: Preparación Logística
            </span>
            <Badge
              variant={
                logistica.estadoPreparacion === "listo"
                  ? "success"
                  : logistica.estadoPreparacion === "en_progreso"
                  ? "info"
                  : "outline"
              }
              className="text-[10px] uppercase font-bold"
            >
              {logistica.estadoPreparacion === "listo"
                ? "Listo para Operar"
                : logistica.estadoPreparacion === "en_progreso"
                ? "En Preparación"
                : "Pendiente"}
            </Badge>
          </div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Alistamiento de Insumos, Espacio y Equipo Técnico
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs font-mono font-bold text-[var(--text-primary)]">
              {completados}/{totalItems} completados
            </span>
            <span className="block text-[11px] text-[var(--text-tertiary)]">
              {porcentaje}% del checklist
            </span>
          </div>
          <div
            className="w-16 h-2 rounded-full bg-[var(--surface-3)] overflow-hidden"
            role="progressbar"
            aria-valuenow={porcentaje}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progreso del checklist logístico"
          >
            <div
              className="h-full bg-[var(--ember)] transition-all duration-300"
              style={{ width: `${porcentaje}%` }}
            />
          </div>
        </div>
      </div>

      {/* Despacho de Convocatoria SM Core */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[var(--surface-3)] text-[var(--ember)] shrink-0">
            <BellRing className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[var(--text-primary)]">
              Convocatoria Oficial a Participantes
            </h4>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Despacha la invitación a la mesa territorial a tu correo registrado mediante SM Core, con seudónimo de contacto (Ley 1581/2012).
            </p>
          </div>
        </div>

        {!soloLectura && (
          <div className="flex flex-col items-end gap-1">
            <Button
              variant="ember"
              size="sm"
              onClick={handleNotificarConvocatoria}
              disabled={!puedeNotificar || enviandoConvocatoria}
              className="text-xs h-8 whitespace-nowrap shrink-0"
              aria-label="Notificar convocatoria a participantes"
            >
              <Send className="size-3.5 mr-1" aria-hidden="true" />
              {enviandoConvocatoria ? "Encolando en SM..." : "Notificar Convocatoria"}
            </Button>
            <span className="text-[10px] text-[var(--text-tertiary)] text-right max-w-[240px]">
              {puedeNotificar
                ? "Se envía a tu correo registrado con consentimiento SM."
                : "Requiere sesión institucional con correo registrado."}
            </span>
          </div>
        )}
      </div>

      {convocatoriaExito && (
        <Notice
          tone="success"
          title="Convocatoria encolada en SM Core con Hash Forense"
          className="text-xs"
        >
          <div className="space-y-1 text-[11px]">
            <p>
              Notificación de convocatoria encolada exitosamente para la mesa <strong>{mesa.nombre}</strong>.
              ID Outbox: <span className="font-mono font-bold">{convocatoriaExito.outboxId}</span>.
            </p>
            <p className="font-mono text-[10px] text-[var(--text-tertiary)] break-all">
              Seudónimo de contacto (Ley 1581/2012): {convocatoriaExito.hash}
            </p>
          </div>
        </Notice>
      )}

      {/* Lista de Chequeo por Categorías */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
            <CheckSquare className="size-4 text-[var(--ember)]" aria-hidden="true" />
            Checklist de Alistamiento Territorial
          </h3>
          {!soloLectura && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMostrarFormTarea(!mostrarFormTarea)}
              className="text-xs"
            >
              <Plus className="size-3.5 mr-1" aria-hidden="true" />
              {mostrarFormTarea ? "Cancelar" : "Agregar Tarea"}
            </Button>
          )}
        </div>

        {/* Formulario rápido para nueva tarea */}
        {mostrarFormTarea && !soloLectura && (
          <form
            onSubmit={handleAgregarTarea}
            className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] space-y-3"
            data-testid="form-agregar-tarea-logistica"
          >
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
              Nueva Tarea de Checklist
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs text-[var(--text-secondary)] font-medium">
                  Descripción de la tarea *
                </Label>
                <Input
                  value={nuevaTarea}
                  onChange={(e) => setNuevaTarea(e.target.value)}
                  placeholder="Ej. Probar conexión a internet para quórum en vivo..."
                  className="text-xs"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[var(--text-secondary)] font-medium">
                  Categoría
                </Label>
                <Select
                  value={nuevaCategoria}
                  onValueChange={(val) => setNuevaCategoria(val as CategoriaItemLogistico)}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((cat) => (
                      <SelectItem key={cat} value={cat} className="text-xs">
                        {CATEGORIAS_LOGISTICA_META[cat].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <Input
                value={nuevoResponsableTarea}
                onChange={(e) => setNuevoResponsableTarea(e.target.value)}
                placeholder="Responsable asignado (opcional)..."
                className="text-xs max-w-xs"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setMostrarFormTarea(false)}
                  className="text-xs"
                >
                  Cancelar
                </Button>
                <Button type="submit" variant="ember" size="sm" className="text-xs">
                  Guardar Tarea
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* Acordeón o Tarjetas de Categorías */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categorias.map((cat) => {
            const Icono = CATEGORIA_ICONS[cat];
            const meta = CATEGORIAS_LOGISTICA_META[cat];
            const itemsCat = logistica.checklist.filter((i) => i.categoria === cat);
            const completadosCat = itemsCat.filter((i) => i.completado).length;

            return (
              <div
                key={cat}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2 border-b border-[var(--border)] pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--ember)]">
                      <Icono className="size-4" aria-hidden="true" />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-[var(--text-primary)]">
                        {meta.label}
                      </h4>
                      <p className="text-[11px] text-[var(--text-tertiary)]">
                        {meta.descripcion}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[var(--surface-2)] text-[var(--text-secondary)]">
                    {completadosCat}/{itemsCat.length}
                  </span>
                </div>

                {itemsCat.length === 0 ? (
                  <p className="text-xs text-[var(--text-tertiary)] italic py-2">
                    Sin tareas en esta categoría.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {itemsCat.map((item) => (
                      <li
                        key={item.id}
                        className={`flex items-start justify-between gap-2 p-2 rounded-lg transition-colors ${
                          item.completado
                            ? "bg-[var(--surface-2)]/60 text-[var(--text-tertiary)]"
                            : "hover:bg-[var(--surface-2)] text-[var(--text-primary)]"
                        }`}
                      >
                        <div className="flex items-start gap-2.5 cursor-pointer select-none flex-1">
                          <Checkbox
                            id={`check-${item.id}`}
                            checked={item.completado}
                            onCheckedChange={() => handleToggle(item.id)}
                            disabled={soloLectura}
                            className="mt-0.5"
                            aria-label={`Completar tarea: ${item.tarea}`}
                          />
                          <Label
                            htmlFor={`check-${item.id}`}
                            className={`text-xs leading-snug cursor-pointer ${
                              item.completado ? "line-through opacity-70" : "font-medium"
                            }`}
                          >
                            {item.tarea}
                            {item.responsable && (
                              <span className="block text-[10px] text-[var(--text-tertiary)] font-normal mt-0.5">
                                Encargado: {item.responsable}
                              </span>
                            )}
                          </Label>
                        </div>
                        {!soloLectura && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => eliminarItemChecklist(mesa.id, item.id)}
                            aria-label={`Eliminar tarea ${item.tarea}`}
                            className="opacity-50 hover:opacity-100 text-[var(--text-tertiary)] hover:text-[var(--danger)]"
                          >
                            <Trash2 className="size-3.5" aria-hidden="true" />
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Equipo Logístico Dedicado */}
      <div className="space-y-4 border-t border-[var(--border)] pt-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Users className="size-4 text-[var(--ember)]" aria-hidden="true" />
              Equipo y Roles de Soporte en Terreno
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Personal asignado para garantizar la fluidez técnica, registro en puerta e hidratación
            </p>
          </div>
          {!soloLectura && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMostrarFormResp(!mostrarFormResp)}
              className="text-xs"
            >
              <Plus className="size-3.5 mr-1" aria-hidden="true" />
              {mostrarFormResp ? "Cancelar" : "Asignar Rol"}
            </Button>
          )}
        </div>

        {/* Formulario nuevo responsable */}
        {mostrarFormResp && !soloLectura && (
          <form
            onSubmit={handleAgregarResponsable}
            className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] space-y-3"
            data-testid="form-agregar-responsable-logistico"
          >
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
              Asignar Responsable Logístico
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-[var(--text-secondary)] font-medium">
                  Nombre completo *
                </Label>
                <Input
                  value={nombreResp}
                  onChange={(e) => setNombreResp(e.target.value)}
                  placeholder="Ej. Ana Lucía Gómez"
                  className="text-xs"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[var(--text-secondary)] font-medium">
                  Rol de Campo
                </Label>
                <Select
                  value={rolResp}
                  onValueChange={(val) => setRolResp(val as RolLogistico)}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ROLES_LOGISTICOS_META) as RolLogistico[]).map((rol) => (
                      <SelectItem key={rol} value={rol} className="text-xs">
                        {ROLES_LOGISTICOS_META[rol].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[var(--text-secondary)] font-medium">
                  Teléfono / Celular
                </Label>
                <Input
                  value={telResp}
                  onChange={(e) => setTelResp(e.target.value)}
                  placeholder="300 123 4567"
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[var(--text-secondary)] font-medium">
                  Entidad u Organización
                </Label>
                <Input
                  value={entidadResp}
                  onChange={(e) => setEntidadResp(e.target.value)}
                  placeholder="Ej. Secretaría de Participación"
                  className="text-xs"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setMostrarFormResp(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button type="submit" variant="ember" size="sm" className="text-xs">
                Asignar Miembro
              </Button>
            </div>
          </form>
        )}

        {logistica.equipoLogistico.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-xs text-[var(--text-tertiary)]">
            Aún no se han asignado roles logísticos específicos para esta jornada.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {logistica.equipoLogistico.map((resp) => (
              <div
                key={resp.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3.5 space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      {resp.nombre}
                    </span>
                    {!soloLectura && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => eliminarResponsableLogistico(mesa.id, resp.id)}
                        aria-label={`Eliminar responsable ${resp.nombre}`}
                        className="text-[var(--text-tertiary)] hover:text-[var(--danger)]"
                      >
                        <Trash2 className="size-3" aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                  <Badge variant="outline" className="text-[10px] mt-1">
                    {ROLES_LOGISTICOS_META[resp.rolLogistico]?.label ?? resp.rolLogistico}
                  </Badge>
                </div>

                <div className="text-[11px] text-[var(--text-secondary)] space-y-1 pt-2 border-t border-[var(--border)]">
                  {resp.telefono && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="size-3 text-[var(--text-tertiary)]" aria-hidden="true" />
                      <span>{resp.telefono}</span>
                    </div>
                  )}
                  {resp.entidad && (
                    <div className="flex items-center gap-1.5">
                      <Building2 className="size-3 text-[var(--text-tertiary)]" aria-hidden="true" />
                      <span className="truncate">{resp.entidad}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
