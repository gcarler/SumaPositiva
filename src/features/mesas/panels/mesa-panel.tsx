"use client";

import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { Input } from "@/shared/ui/input";
import { FormField } from "@/shared/ui/form-field";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  Landmark,
  MapPin,
  Pencil,
  Plus,
  Users,
  X,
} from "lucide-react";
import { PanelShell } from "@/core/panels/panel-shell";
import { usePanels } from "@/core/panels/panel-store";
import { useMesaQuery, useActualizarAcuerdos, useCrearSubMesa } from "@/features/mesas/services/use-mesas-queries";
import { type SubMesaInput } from "@/features/mesas/state/mesas-store";
import {
  estadoDiligenciamiento,
  resumenProblemas,
  resumenSoluciones,
} from "@/features/mesas/models/mesas";
import { SectionLabel } from "@/shared/components/participation-ui";

/**
 * Panel de mesa de trabajo — el "acta viva" del área de trabajo.
 * Muestra los datos administrativos, los acuerdos de la plenaria y
 * las submesas; desde cada submesa se abre el papelografo.
 */

const TONOS_ESTADO = {
  vacio: "text-[var(--text-tertiary)]",
  parcial: "text-[var(--warning)]",
  completo: "text-[var(--success)]",
} as const;

export function MesaPanel({
  entryKey,
  props,
}: {
  entryKey: string;
  props: { mesaId: string };
}) {
  const { openPanel, closeTop } = usePanels();
  const { data: mesa, isLoading } = useMesaQuery(props.mesaId);
  const mutarAcuerdos = useActualizarAcuerdos();
  const mutarCrearSubMesa = useCrearSubMesa();

  /* acuerdos: borrador local, se confirma al salir del campo */
  const [acuerdosBorrador, setAcuerdosBorrador] = useState<string | null>(null);
  const acuerdosValor = acuerdosBorrador ?? mesa?.plenaria.acuerdos ?? "";

  /* formulario inline de submesa */
  const [formSubAbierto, setFormSubAbierto] = useState(false);
  const [nombreSub, setNombreSub] = useState("");
  const [temaSub, setTemaSub] = useState("");
  const [participantesSub, setParticipantesSub] = useState("");

  if (!mesa) {
    return (
      <PanelShell
        entryKey={entryKey}
        crumbs={[{ label: "Mesas de trabajo" }]}
        title="Mesa no encontrada"
        onClose={closeTop}
        onCloseToKey={closeTop}
      >
        <p className="p-6 text-sm text-[var(--text-secondary)]">
          Esta mesa ya no está disponible.
        </p>
      </PanelShell>
    );
  }

  const confirmarAcuerdos = () => {
    mutarAcuerdos.mutate({ mesaId: mesa.id, acuerdos: acuerdosValor });
    toast.success("Acuerdos de plenaria guardados");
  };

  const guardarSubMesa = async () => {
    const nombre = nombreSub.trim();
    if (nombre.length < 3) {
      toast.error("Nombra la submesa (mínimo 3 caracteres)");
      return;
    }
    const participantes = participantesSub.trim()
      ? Math.max(0, Math.floor(Number(participantesSub)))
      : null;
    const input: SubMesaInput = {
      nombre,
      tema: temaSub.trim(),
      participantes: participantes && participantes > 0 ? participantes : null,
    };
    
    try {
      await mutarCrearSubMesa.mutateAsync({ mesaId: mesa.id, datos: input });
      toast.success("Submesa creada", {
        description: "Ábrela para diligenciar su papelografo.",
      });
      setNombreSub("");
      setTemaSub("");
      setParticipantesSub("");
      setFormSubAbierto(false);
    } catch {
      toast.error("No fue posible crear la submesa");
    }
  };

  const conSoluciones = mesa.submesas.filter((sm) =>
    estadoDiligenciamiento(sm).tono === "completo"
  ).length;

  return (
    <PanelShell
      entryKey={entryKey}
      crumbs={[{ label: "Mesas de trabajo" }]}
      kicker="Mesa de trabajo"
      title={mesa.nombre}
      subtitle={`${mesa.lugar} · ${mesa.entidad}`}
      onClose={closeTop}
      onCloseToKey={closeTop}
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs leading-relaxed text-[var(--text-tertiary)]">
            {mesa.submesas.length > 0
              ? `${mesa.submesas.length} ${mesa.submesas.length === 1 ? "submesa" : "submesas"} · ${conSoluciones} con árbol completo`
              : "Sin submesas todavía"}
          </p>
          <Button variant="outline" size="sm"
            type="button"
            onClick={() => openPanel("mesa-editor", { mesaId: mesa.id })}
            className="shrink-0"
          >
            <Pencil className="size-3.5" strokeWidth={1.5} />
            Editar información
          </Button>
        </div>
      }
    >
      <div className="mx-auto w-full max-w-4xl space-y-8 px-5 py-6 sm:px-6 lg:px-8 2xl:px-10">
        {/* ---------- Datos administrativos ---------- */}
        <section className="space-y-3">
          <SectionLabel>Acta de la mesa</SectionLabel>
          <dl className="grid grid-cols-2 gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-4 sm:grid-cols-3 lg:grid-cols-5">
            <div className="space-y-1">
              <dt className="label-micro text-[var(--text-tertiary)]">Fecha</dt>
              <dd className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-primary)] tabular">
                <CalendarDays className="size-3.5 shrink-0 text-[var(--text-tertiary)]" strokeWidth={1.5} />
                {format(new Date(mesa.fecha), "d MMM yyyy", { locale: es })}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="label-micro text-[var(--text-tertiary)]">Asistentes</dt>
              <dd className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-primary)] tabular">
                <Users className="size-3.5 shrink-0 text-[var(--text-tertiary)]" strokeWidth={1.5} />
                {mesa.totalAsistentes.toLocaleString("es-CO")}
              </dd>
            </div>
            <div className="col-span-2 space-y-1 sm:col-span-1">
              <dt className="label-micro text-[var(--text-tertiary)]">Facilitador</dt>
              <dd className="truncate text-sm font-medium text-[var(--text-primary)]">
                {mesa.facilitador}
              </dd>
            </div>
            <div className="col-span-2 space-y-1">
              <dt className="label-micro text-[var(--text-tertiary)]">Lugar</dt>
              <dd className="inline-flex items-start gap-1.5 text-sm font-medium text-[var(--text-primary)]">
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-[var(--text-tertiary)]" strokeWidth={1.5} />
                {mesa.lugar}
              </dd>
            </div>
            <div className="col-span-2 space-y-1">
              <dt className="label-micro text-[var(--text-tertiary)]">Entidad</dt>
              <dd className="inline-flex items-start gap-1.5 text-sm font-medium text-[var(--text-primary)]">
                <Landmark className="mt-0.5 size-3.5 shrink-0 text-[var(--text-tertiary)]" strokeWidth={1.5} />
                {mesa.entidad}
              </dd>
            </div>
          </dl>
        </section>

        {/* ---------- Plenaria ---------- */}
        <section className="space-y-3">
          <SectionLabel
            right={
              <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
                Se guarda al salir del campo
              </span>
            }
          >
            Plenaria de apertura — acuerdos
          </SectionLabel>
          <Textarea
            value={acuerdosValor}
            onChange={(e) => setAcuerdosBorrador(e.target.value)}
            onBlur={(e) => {
              if (e.target.value !== mesa.plenaria.acuerdos) confirmarAcuerdos();
            }}
            rows={4}
            aria-label="Acuerdos de la plenaria de apertura"
            placeholder="Registra los acuerdos de la plenaria: qué problema se priorizó, cómo se repartieron los temas entre submesas y cuándo será la plenaria de cierre…"
            className="min-h-[110px] w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3 text-sm leading-relaxed text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-colors focus:border-[var(--ember)] "
          />
          <p className="flex items-start gap-2 text-[11px] leading-relaxed text-[var(--text-tertiary)]">
            <ClipboardList className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.5} />
            Los acuerdos de la plenaria orientan el trabajo de cada submesa: en ellas se
            desarrolla el papelografo (árbol de problemas y de soluciones).
          </p>
        </section>

        {/* ---------- Submesas ---------- */}
        <section className="space-y-3">
          <SectionLabel
            right={
              <Button variant="default" size="default"
                type="button"
                onClick={() => setFormSubAbierto((v) => !v)}
                aria-expanded={formSubAbierto}

              >
                <Plus className="size-3.5" strokeWidth={1.5} />
                Submesa
              </Button>
            }
          >
            Submesas ({mesa.submesas.length})
          </SectionLabel>

          {/* Formulario inline de submesa */}
          <AnimatePresence initial={false}>
            {formSubAbierto && (
              <motion.div
                key="form-submesa"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <div className="grid gap-3 sm:grid-cols-[1.4fr_1.4fr_0.7fr]">
                    <FormField id="sub-nombre" label="Nombre" required>
                      {(field) => (
                        <Input
                          {...field}
                          value={nombreSub}
                          onChange={(e) => setNombreSub(e.target.value)}
                          type="text"
                          placeholder="Ej.: Entornos escolares seguros"
                        />
                      )}
                    </FormField>
                    <FormField id="sub-tema" label="Tema asignado">
                      {(field) => (
                        <Input
                          {...field}
                          value={temaSub}
                          onChange={(e) => setTemaSub(e.target.value)}
                          type="text"
                          placeholder="Ej.: Rutas escolares y velocidad"
                        />
                      )}
                    </FormField>
                    <FormField id="sub-participantes" label="Participantes">
                      {(field) => (
                        <Input
                          {...field}
                          value={participantesSub}
                          onChange={(e) => setParticipantesSub(e.target.value)}
                          type="number"
                          min={0}
                          placeholder="0"
                          className="tabular"
                        />
                      )}
                    </FormField>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="outline" size="sm"
                      type="button"
                      onClick={() => setFormSubAbierto(false)}

                    >
                      <X className="size-3.5" strokeWidth={1.5} />
                      Cancelar
                    </Button>
                    <Button variant="default" size="default"
                      type="button"
                      onClick={guardarSubMesa}

                    >
                      <Plus className="size-3.5" strokeWidth={1.5} />
                      Añadir submesa
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tarjetas de submesas */}
          {mesa.submesas.length === 0 && !formSubAbierto ? (
            <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-[var(--border-strong)] px-5 py-8">
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Esta mesa aún no tiene submesas
              </p>
              <p className="max-w-md text-xs leading-relaxed text-[var(--text-secondary)]">
                En la plenaria se acuerdan los temas y luego cada submesa desarrolla su
                papelografo. Si la mesa trabaja como un solo grupo, crea una única submesa
                llamada «Plenaria».
              </p>
              <Button variant="outline" size="sm"
                type="button"
                onClick={() => setFormSubAbierto(true)}
                className="mt-1"
              >
                <Plus className="size-3.5" strokeWidth={1.5} />
                Crear la primera submesa
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {mesa.submesas.map((sm) => {
                const estado = estadoDiligenciamiento(sm);
                const p = resumenProblemas(sm);
                const s = resumenSoluciones(sm);
                return (
                  <Button variant="unstyled" size="unstyled"
                    key={sm.id}
                    type="button"
                    onClick={() =>
                      openPanel("papelografo", {
                        mesaId: mesa.id,
                        submesaId: sm.id,
                        arbol: "problemas",
                        fromKey: entryKey,
                      })
                    }
                    className="group flex flex-col gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 text-left transition-all hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                          {sm.nombre}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">
                          {sm.tema || "Sin tema asignado"}
                        </p>
                      </div>
                      <ArrowRight
                        className="mt-0.5 size-4 shrink-0 text-[var(--text-tertiary)] transition-all group-hover:translate-x-0.5 group-hover:text-[var(--ember)]"
                        strokeWidth={1.5}
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-[var(--text-tertiary)] tabular">
                      {sm.participantes !== null && (
                        <span className="inline-flex items-center gap-1">
                          <Users className="size-3" strokeWidth={1.5} />
                          {sm.participantes}
                        </span>
                      )}
                      <span>{p.ramaA} causas</span>
                      <span>{p.ramaB} efectos</span>
                      <span
                        className={
                          s.total > 0
                            ? "text-[var(--success)]"
                            : "text-[var(--text-tertiary)]"
                        }
                      >
                        {s.total > 0 ? `${s.total} soluciones` : "sin soluciones"}
                      </span>
                    </div>

                    <span className={`label-micro ${TONOS_ESTADO[estado.tono]}`}>
                      {estado.label}
                    </span>
                  </Button>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </PanelShell>
  );
}
