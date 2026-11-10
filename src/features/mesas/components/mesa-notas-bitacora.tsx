"use client";

import { useState, useId } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Badge } from "@/shared/ui/badge";
import { Switch } from "@/shared/ui/switch";
import { Textarea } from "@/shared/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  BookOpen,
  Plus,
  Trash2,
  Lock,
  Globe2,
  Clock,
  User,
  Filter,
  CheckCircle2,
  MessageSquare,
} from "lucide-react";
import {
  MOMENTOS_NOTA_META,
  type MomentoNotaMesa,
  type NotaMesa,
  type MesaDeTrabajo,
} from "@/features/mesas/models/mesas";
import { useMesasStore } from "@/features/mesas/state/mesas-store";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface MesaNotasBitacoraProps {
  mesa: MesaDeTrabajo;
  soloLectura?: boolean;
}

export function MesaNotasBitacora({
  mesa,
  soloLectura = false,
}: MesaNotasBitacoraProps) {
  const agregarNotaMesa = useMesasStore((s) => s.agregarNotaMesa);
  const eliminarNotaMesa = useMesasStore((s) => s.eliminarNotaMesa);

  const notas = mesa.notas ?? [];

  // Filter state
  const [momentoFiltro, setMomentoFiltro] = useState<string>("todos");
  const [filtroPrivacidad, setFiltroPrivacidad] = useState<"todas" | "publicas" | "privadas">("todas");
  const [busqueda, setBusqueda] = useState<string>("");

  // New note form state
  const [mostrarFormNuevo, setMostrarFormNuevo] = useState(false);
  const [autor, setAutor] = useState(mesa.facilitador || "");
  const [rolAutor, setRolAutor] = useState("Facilitador Principal");
  const [momento, setMomento] = useState<MomentoNotaMesa>("submesas");
  const [contenido, setContenido] = useState("");
  const [esPrivada, setEsPrivada] = useState(false);

  const autorInputId = useId();
  const rolInputId = useId();
  const contenidoInputId = useId();
  const switchPrivadaId = useId();

  // Filtered notes
  const notasFiltradas = notas.filter((n) => {
    if (momentoFiltro !== "todos" && n.momento !== momentoFiltro) return false;
    if (filtroPrivacidad === "publicas" && n.esPrivada) return false;
    if (filtroPrivacidad === "privadas" && !n.esPrivada) return false;
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      const matchContenido = n.contenido.toLowerCase().includes(q);
      const matchAutor = n.autor.toLowerCase().includes(q);
      const matchRol = n.rolAutor.toLowerCase().includes(q);
      if (!matchContenido && !matchAutor && !matchRol) return false;
    }
    return true;
  });

  const handleAgregarNota = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contenido.trim()) {
      toast.error("El contenido de la observación es obligatorio.");
      return;
    }

    const nuevaNota: NotaMesa = {
      id: `nota-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      autor: autor.trim() || "Facilitador POLIS",
      rolAutor: rolAutor.trim() || "Facilitador",
      momento,
      contenido: contenido.trim(),
      creadoEn: new Date().toISOString(),
      esPrivada,
    };

    agregarNotaMesa(mesa.id, nuevaNota);
    toast.success("Nota de campo registrada en la bitácora.");

    // Reset form
    setContenido("");
    setMostrarFormNuevo(false);
  };

  return (
    <section
      className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 sm:p-5"
      aria-label="Bitácora y notas de campo del facilitador"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BookOpen className="size-4 text-[var(--ember)]" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Bitácora y Notas de Campo del Facilitador
            </h3>
            <Badge variant="outline" className="text-[11px] font-mono tabular">
              {notas.length} {notas.length === 1 ? "nota" : "notas"}
            </Badge>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            Registro cronológico de observaciones metodológicas, tensiones territoriales, dinámica comunitaria y acuerdos tácitos.
          </p>
        </div>

        {!soloLectura && (
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => setMostrarFormNuevo(!mostrarFormNuevo)}
            className="shrink-0"
            aria-expanded={mostrarFormNuevo}
          >
            <Plus className="size-3.5 mr-1" aria-hidden="true" />
            {mostrarFormNuevo ? "Cerrar formulario" : "Nueva nota de campo"}
          </Button>
        )}
      </div>

      {/* Formulario de Nueva Nota */}
      {mostrarFormNuevo && !soloLectura && (
        <form
          onSubmit={handleAgregarNota}
          className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] space-y-3.5"
          data-testid="form-nueva-nota-bitacora"
        >
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
              <MessageSquare className="size-4 text-[var(--ember)]" aria-hidden="true" />
              Registrar Observación / Nota de Campo
            </h4>
            <span className="text-[11px] text-[var(--text-tertiary)]">
              Memoria cualitativa del facilitador
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor={autorInputId} className="text-xs text-[var(--text-secondary)] font-medium">
                Nombre del autor / relator *
              </Label>
              <Input
                id={autorInputId}
                value={autor}
                onChange={(e) => setAutor(e.target.value)}
                placeholder="Ej. Carlos Pérez"
                className="text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor={rolInputId} className="text-xs text-[var(--text-secondary)] font-medium">
                Rol o función en la mesa
              </Label>
              <Input
                id={rolInputId}
                value={rolAutor}
                onChange={(e) => setRolAutor(e.target.value)}
                placeholder="Ej. Facilitador Principal"
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-[var(--text-secondary)] font-medium">
                Momento metodológico
              </Label>
              <Select
                value={momento}
                onValueChange={(val) => setMomento(val as MomentoNotaMesa)}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(MOMENTOS_NOTA_META) as MomentoNotaMesa[]).map((mom) => (
                    <SelectItem key={mom} value={mom} className="text-xs">
                      {MOMENTOS_NOTA_META[mom].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor={contenidoInputId} className="text-xs text-[var(--text-secondary)] font-medium">
              Contenido de la observación o hallazgo territorial *
            </Label>
            <Textarea
              id={contenidoInputId}
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
              placeholder="Describe lo observado: dinámica de participación, liderazgos emergentes, consensos alcanzados o tensiones que requirieron mediación..."
              className="text-xs min-h-[90px]"
              required
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[var(--border)]">
            <div className="flex items-center gap-2">
              <Switch
                id={switchPrivadaId}
                checked={esPrivada}
                onCheckedChange={setEsPrivada}
              />
              <Label
                htmlFor={switchPrivadaId}
                className="text-xs text-[var(--text-secondary)] cursor-pointer flex items-center gap-1.5"
              >
                {esPrivada ? (
                  <>
                    <Lock className="size-3 text-[var(--warning)]" aria-hidden="true" />
                    <span className="font-semibold text-[var(--text-primary)]">Nota Interna de Facilitación:</span> Solo visible para el equipo facilitador
                  </>
                ) : (
                  <>
                    <Globe2 className="size-3 text-[var(--success)]" aria-hidden="true" />
                    <span className="font-semibold text-[var(--text-primary)]">Nota Pública:</span> Visible en la relatoría y el informe territorial
                  </>
                )}
              </Label>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMostrarFormNuevo(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="default" size="sm">
                <CheckCircle2 className="size-3.5 mr-1" aria-hidden="true" />
                Guardar Nota
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
          <Button
            type="button"
            variant={momentoFiltro === "todos" ? "default" : "outline"}
            size="sm"
            onClick={() => setMomentoFiltro("todos")}
            className="text-xs h-7 px-2.5 shrink-0"
          >
            Todos ({notas.length})
          </Button>
          {(Object.keys(MOMENTOS_NOTA_META) as MomentoNotaMesa[]).map((mom) => {
            const count = notas.filter((n) => n.momento === mom).length;
            if (count === 0 && momentoFiltro !== mom) return null;
            return (
              <Button
                key={mom}
                type="button"
                variant={momentoFiltro === mom ? "default" : "outline"}
                size="sm"
                onClick={() => setMomentoFiltro(mom)}
                className="text-xs h-7 px-2.5 shrink-0"
              >
                {MOMENTOS_NOTA_META[mom].label} ({count})
              </Button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={filtroPrivacidad}
            onValueChange={(val) => setFiltroPrivacidad(val as "todas" | "publicas" | "privadas")}
          >
            <SelectTrigger className="text-xs h-8 w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas" className="text-xs">Todas las notas</SelectItem>
              <SelectItem value="publicas" className="text-xs">Públicas</SelectItem>
              <SelectItem value="privadas" className="text-xs">Solo internas</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative w-full sm:w-44">
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar nota..."
              className="text-xs h-8 pl-8"
            />
            <Filter className="absolute left-2.5 top-2 size-3.5 text-[var(--text-tertiary)]" aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* Lista cronológica de notas */}
      {notasFiltradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-2)]/40 space-y-2.5">
          <MessageSquare className="size-9 text-[var(--text-tertiary)]" aria-hidden="true" />
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            No hay notas u observaciones registradas
          </p>
          <p className="text-xs text-[var(--text-secondary)] max-w-sm">
            {momentoFiltro !== "todos" || busqueda || filtroPrivacidad !== "todas"
              ? "No se encontraron notas que coincidan con los filtros aplicados."
              : "Las notas de campo documentan los hallazgos en caliente del facilitador para nutrir el informe de relatoría."}
          </p>
          {!soloLectura && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMostrarFormNuevo(true)}
              className="mt-1"
            >
              <Plus className="size-3.5 mr-1" aria-hidden="true" />
              Crear primera nota
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3" role="list">
          {notasFiltradas.map((nota) => (
            <article
              key={nota.id}
              role="listitem"
              className={`p-4 rounded-xl border transition-all bg-[var(--surface-1)] space-y-2.5 ${
                nota.esPrivada
                  ? "border-[var(--warning)]/40 bg-[var(--warning)]/5"
                  : "border-[var(--border)] hover:border-[var(--border-strong)]"
              }`}
              data-testid={`nota-bitacora-${nota.id}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border)] pb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">
                    {MOMENTOS_NOTA_META[nota.momento]?.label ?? nota.momento}
                  </Badge>

                  {nota.esPrivada ? (
                    <Badge variant="outline" className="text-[10px] text-[var(--warning)] border-[var(--warning)]/40 flex items-center gap-1">
                      <Lock className="size-2.5" aria-hidden="true" />
                      Interna facilitador
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-[var(--success)] border-[var(--success)]/40 flex items-center gap-1">
                      <Globe2 className="size-2.5" aria-hidden="true" />
                      Pública
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-3 text-[11px] text-[var(--text-tertiary)] tabular">
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" aria-hidden="true" />
                    {nota.creadoEn && !isNaN(new Date(nota.creadoEn).getTime())
                      ? format(new Date(nota.creadoEn), "d MMM yyyy, HH:mm", { locale: es })
                      : "Fecha no disponible"}
                  </span>
                  {!soloLectura && (
                    <Button
                      type="button"
                      variant="unstyled"
                      size="unstyled"
                      onClick={() => {
                        if (confirm("¿Eliminar esta nota de la bitácora?")) {
                          eliminarNotaMesa(mesa.id, nota.id);
                          toast.success("Nota eliminada.");
                        }
                      }}
                      className="text-[var(--text-tertiary)] hover:text-[var(--destructive)] transition-colors p-1"
                      title="Eliminar nota"
                      data-testid={`btn-eliminar-nota-${nota.id}`}
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </Button>
                  )}
                </div>
              </div>

              <p className="text-xs leading-relaxed text-[var(--text-primary)] whitespace-pre-wrap">
                {nota.contenido}
              </p>

              <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)] pt-1">
                <User className="size-3 text-[var(--text-tertiary)]" aria-hidden="true" />
                <span className="font-medium text-[var(--text-primary)]">{nota.autor}</span>
                {nota.rolAutor && (
                  <span className="text-[var(--text-tertiary)]">({nota.rolAutor})</span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
