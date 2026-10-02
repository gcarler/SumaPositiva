"use client";

import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { Input } from "@/shared/ui/input";
import { FormField } from "@/shared/ui/form-field";
import { Badge } from "@/shared/ui/badge";
import { Switch } from "@/shared/ui/switch";
import { Label } from "@/shared/ui/label";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  FileText,
  FolderSync,
  Landmark,
  Layers,
  MapPin,
  Pencil,
  Plus,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { PanelShell } from "@/core/panels/panel-shell";
import { usePanels } from "@/core/panels/panel-store";
import {
  useMesaQuery,
  useActualizarAcuerdos,
  useActualizarInforme,
  useCrearSubMesa,
  useActualizarAsistentesPlenaria,
} from "@/features/mesas/services/use-mesas-queries";
import { useMesasStore, type SubMesaInput } from "@/features/mesas/state/mesas-store";
import { useSesionStore } from "@/features/sesion/state/session-store";
import {
  calcularTotalAsistentes,
  estadoDiligenciamiento,
  resumenProblemas,
  resumenSoluciones,
  type ArbolProblemas,
  type ArbolSoluciones,
} from "@/features/mesas/models/mesas";
import { CONTENIDO_MESAS } from "@/features/mesas/data/agenda-contenido.data";
import { SectionLabel } from "@/shared/components/participation-ui";
import { AdjuntosZona } from "@/features/mesas/components/adjuntos-zona";
import { MatrizArbolRelatoria } from "@/features/mesas/components/matriz-arbol-relatoria";

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
  props: { mesaId: string; soloLectura?: boolean };
}) {
  const { openPanel, closeTop } = usePanels();
  const sesion = useSesionStore((s) => s.sesion);
  const soloLectura =
    sesion?.rol === "auditor_forense" ||
    (props.soloLectura === true && sesion?.rol === "ciudadano");

  const { data: mesaRemota } = useMesaQuery(props.mesaId);
  const mesaStore = useMesasStore((s) =>
    s.mesas.find((m) => m.id === props.mesaId)
  );
  const mesa = mesaStore ?? mesaRemota;

  const mutarAcuerdos = useActualizarAcuerdos();
  const mutarInforme = useActualizarInforme();
  const mutarCrearSubMesa = useCrearSubMesa();
  const mutarAsistentesPlenaria = useActualizarAsistentesPlenaria();

  /* acuerdos: borrador local, se confirma al salir del campo o con botón */
  const [acuerdosBorrador, setAcuerdosBorrador] = useState<string | null>(null);
  const acuerdosValor = acuerdosBorrador ?? mesa?.plenaria.acuerdos ?? "";

  /* informe: borrador local, se confirma al salir del campo o con botón */
  const [informeBorrador, setInformeBorrador] = useState<string | null>(null);
  const informeValor = informeBorrador ?? mesa?.informe ?? "";

  /* asistentes plenaria borrador local */
  const [asistentesPlenariaBorrador, setAsistentesPlenariaBorrador] = useState<number | null | undefined>(undefined);
  /* total asistentes manual borrador local (para conteoIndependiente = false) */
  const [totalAsistentesBorrador, setTotalAsistentesBorrador] = useState<number | null | undefined>(undefined);

  /* modo de relatoría (narrativo | matriz | hibrido) */
  const [modoRelatoriaLocal, setModoRelatoriaLocal] = useState<"narrativo" | "matriz" | "hibrido">(
    mesa?.modoRelatoria ?? "hibrido"
  );

  const [prevMesaId, setPrevMesaId] = useState(props.mesaId);
  if (prevMesaId !== props.mesaId) {
    setPrevMesaId(props.mesaId);
    setAcuerdosBorrador(null);
    setInformeBorrador(null);
    setAsistentesPlenariaBorrador(undefined);
    setTotalAsistentesBorrador(undefined);
    setModoRelatoriaLocal(mesa?.modoRelatoria ?? "hibrido");
  }

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
    useMesasStore.getState().setAcuerdosPlenaria(mesa.id, acuerdosValor);
    mutarAcuerdos.mutate({ mesaId: mesa.id, acuerdos: acuerdosValor });
    toast.success("Acuerdos de plenaria guardados");
  };

  const confirmarInforme = () => {
    useMesasStore.getState().setInformeMesa(mesa.id, informeValor);
    mutarInforme.mutate({ mesaId: mesa.id, informe: informeValor });
    toast.success("Informe y relatoría de la mesa guardado");
  };

  const handleConsolidarSubmesas = () => {
    const res = useMesasStore.getState().consolidarArbolesSubmesas(mesa.id);
    if (
      res.causasCopiadas === 0 &&
      res.efectosCopiados === 0 &&
      res.mediosCopiados === 0 &&
      res.finesCopiados === 0
    ) {
      toast.info("No se encontraron nuevos nodos en las submesas para consolidar.");
    } else {
      toast.success(
        `Árboles consolidados: +${res.causasCopiadas} causas, +${res.efectosCopiados} efectos, +${res.mediosCopiados} medios y +${res.finesCopiados} fines.`
      );
    }
  };

  const handleGenerarBorradorTecnico = () => {
    const borrador = useMesasStore.getState().generarBorradorRelatoriaDesdeMatriz(mesa.id);
    setInformeBorrador(borrador);
    mutarInforme.mutate({ mesaId: mesa.id, informe: borrador });
    toast.success("Borrador técnico de relatoría generado conforme a lineamientos DNP.");
  };

  const handleActualizarProblemasMesa = (arbol: ArbolProblemas) => {
    useMesasStore.getState().setArbolProblemasMesa(mesa.id, arbol);
  };

  const handleActualizarSolucionesMesa = (arbol: ArbolSoluciones) => {
    useMesasStore.getState().setArbolSolucionesMesa(mesa.id, arbol);
  };

  const handleCambiarModoRelatoria = (nuevoModo: "narrativo" | "matriz" | "hibrido") => {
    setModoRelatoriaLocal(nuevoModo);
    useMesasStore.getState().setModoRelatoriaMesa(mesa.id, nuevoModo);
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

  const conSoluciones = mesa.submesas.filter(
    (sm) => estadoDiligenciamiento(sm).tono === "completo",
  ).length;

  const contenido = CONTENIDO_MESAS[mesa.id];

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
          {!soloLectura && (
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => openPanel("mesa-editor", { mesaId: mesa.id })}
              className="shrink-0"
            >
              <Pencil className="size-3.5" strokeWidth={1.5} />
              Editar información
            </Button>
          )}
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
                <CalendarDays
                  className="size-3.5 shrink-0 text-[var(--text-tertiary)]"
                  strokeWidth={1.5}
                />
                {format(new Date(mesa.fecha), "d MMM yyyy", { locale: es })}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="label-micro text-[var(--text-tertiary)]">
                Asistentes
              </dt>
              <dd className="text-sm font-medium text-[var(--text-primary)]">
                {mesa.submesas.length > 0 ? (
                  <div className="space-y-0.5">
                    {(mesa.asistentesPlenaaria != null || mesa.asistentesPlenaria != null) &&
                      ((mesa.asistentesPlenaaria ?? mesa.asistentesPlenaria) ?? 0) > 0 && (
                      <div className="flex gap-2 text-xs text-[var(--text-secondary)]">
                        <span>Plenaria:</span>
                        <span className="font-medium tabular">
                          {mesa.asistentesPlenaaria ?? mesa.asistentesPlenaria}
                        </span>
                      </div>
                    )}
                    {mesa.submesas.map(
                      (sm) =>
                        sm.participantes != null && (
                          <div
                            key={sm.id}
                            className="flex gap-2 text-xs text-[var(--text-secondary)]"
                          >
                            <span className="truncate max-w-[120px]">{sm.nombre}:</span>
                            <span className="font-medium tabular">{sm.participantes}</span>
                          </div>
                        )
                    )}
                    <div className="flex gap-2 text-sm font-semibold text-[var(--text-primary)] border-t border-[var(--border)] pt-1 tabular">
                      <span>Total:</span>
                      <span>{calcularTotalAsistentes(mesa)}</span>
                    </div>
                    <div className="text-[10px] text-[var(--text-tertiary)] italic">
                      {mesa.conteoIndependiente ? "Suma independiente" : "Mismo grupo (no duplicado)"}
                    </div>
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1.5 tabular">
                    <Users
                      className="size-3.5 shrink-0 text-[var(--text-tertiary)]"
                      strokeWidth={1.5}
                    />
                    {calcularTotalAsistentes(mesa).toLocaleString("es-CO")}
                  </span>
                )}
              </dd>
            </div>
            {mesa.aforo ? (
              <div className="space-y-1">
                <dt className="label-micro text-[var(--text-tertiary)]">Aforo</dt>
                <dd className="text-sm font-medium text-[var(--text-primary)] tabular">
                  {mesa.aforo.toLocaleString("es-CO")} personas
                </dd>
              </div>
            ) : null}
            <div className="col-span-2 space-y-1 sm:col-span-1">
              <dt className="label-micro text-[var(--text-tertiary)]">
                Facilitador
              </dt>
              <dd className="truncate text-sm font-medium text-[var(--text-primary)]">
                {mesa.facilitador || "Por asignar"}
              </dd>
            </div>
            <div className="col-span-2 space-y-1">
              <dt className="label-micro text-[var(--text-tertiary)]">Lugar</dt>
              <dd className="flex flex-col items-start gap-1 text-sm font-medium text-[var(--text-primary)]">
                <span className="inline-flex items-start gap-1.5">
                  <MapPin
                    className="mt-0.5 size-3.5 shrink-0 text-[var(--text-tertiary)]"
                    strokeWidth={1.5}
                  />
                  <span>{mesa.lugar}</span>
                </span>
                {mesa.urlMapa && (
                  <a
                    href={mesa.urlMapa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[var(--ember)] hover:underline font-medium"
                  >
                    📍 Ver en el mapa →
                  </a>
                )}
              </dd>
            </div>
            <div className="col-span-2 space-y-1">
              <dt className="label-micro text-[var(--text-tertiary)]">
                Entidad
              </dt>
              <dd className="inline-flex items-start gap-1.5 text-sm font-medium text-[var(--text-primary)]">
                <Landmark
                  className="mt-0.5 size-3.5 shrink-0 text-[var(--text-tertiary)]"
                  strokeWidth={1.5}
                />
                <span>{mesa.entidad || "Distrito de Cartagena"}</span>
              </dd>
            </div>

            {/* Múltiples entidades responsables */}
            {mesa.entidades && mesa.entidades.length > 0 && (
              <div className="col-span-full border-t border-[var(--border)] pt-3">
                <dt className="label-micro text-[var(--text-tertiary)] mb-2">
                  Entidades convocantes y aliadas ({mesa.entidades.length})
                </dt>
                <dd className="flex flex-wrap gap-2">
                  {mesa.entidades.map((ent) => (
                    <span
                      key={ent.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-xs text-[var(--text-primary)]"
                    >
                      <Landmark className="size-3 text-[var(--text-tertiary)]" />
                      <span className="font-medium">{ent.nombre}</span>
                      <Badge
                        variant="outline"
                        className="text-[10px] py-0 px-1.5 font-normal text-[var(--text-secondary)]"
                      >
                        {ent.rol}
                      </Badge>
                    </span>
                  ))}
                </dd>
              </div>
            )}

            {/* Múltiples personas responsables */}
            {mesa.responsables && mesa.responsables.length > 0 && (
              <div className="col-span-full border-t border-[var(--border)] pt-3">
                <dt className="label-micro text-[var(--text-tertiary)] mb-2">
                  Equipo responsable ({mesa.responsables.length})
                </dt>
                <dd className="flex flex-wrap gap-2">
                  {mesa.responsables.map((resp) => (
                    <span
                      key={resp.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-xs text-[var(--text-primary)]"
                    >
                      <Users className="size-3 text-[var(--text-tertiary)]" />
                      <span className="font-medium">{resp.nombre}</span>
                      {resp.cargo && (
                        <span className="text-[var(--text-tertiary)]">
                          ({resp.cargo})
                        </span>
                      )}
                      {resp.esFacilitador && (
                        <Badge
                          variant="ember"
                          className="text-[10px] py-0 px-1.5 font-medium"
                        >
                          Facilitador
                        </Badge>
                      )}
                    </span>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        </section>

        {/* ---------- Contenido de la mesa ---------- */}
        {contenido && (
          <section className="space-y-6">
            {/* Propósito */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
              <SectionLabel>Propósito de la mesa</SectionLabel>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                {contenido.proposito}
              </p>
            </div>

            {/* Orden del día */}
            <div>
              <SectionLabel>Agenda del día</SectionLabel>
              <ol className="mt-2 space-y-1.5 text-sm text-[var(--text-secondary)]">
                {contenido.ordenDelDia.map((item, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="font-bold tabular-nums text-[var(--ember)]">
                      {i + 1}.
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Preguntas orientadoras */}
            <div>
              <SectionLabel>Preguntas orientadoras</SectionLabel>
              <ul className="mt-2 space-y-2">
                {contenido.preguntasOrientadoras.map((p, i) => (
                  <li
                    key={i}
                    className="rounded-lg bg-[var(--surface-2)] px-4 py-2.5 text-sm italic text-[var(--text-primary)]"
                  >
                    &ldquo;{p}&rdquo;
                  </li>
                ))}
              </ul>
            </div>

            {/* Resultados esperados */}
            <div>
              <SectionLabel>Resultados esperados</SectionLabel>
              <ul className="mt-2 space-y-1">
                {contenido.resultadosEsperados.map((r, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-[var(--text-secondary)]"
                  >
                    <span className="mt-0.5 text-[var(--ember)]">→</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Marco normativo */}
            {contenido.marcoNormativo && contenido.marcoNormativo.length > 0 && (
              <div>
                <SectionLabel>Marco normativo</SectionLabel>
                <div className="mt-2 flex flex-wrap gap-2">
                  {contenido.marcoNormativo.map((n) => (
                    <span
                      key={n}
                      className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-xs text-[var(--text-tertiary)]"
                    >
                      {n}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ---------- Plenaria ---------- */}
        <section className="space-y-3">
          <SectionLabel
            right={
              <div className="flex items-center gap-3">
                <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
                  {soloLectura ? "Solo lectura" : "Se guarda al salir del campo"}
                </span>
                {!soloLectura && (
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={confirmarAcuerdos}
                    className="h-7 text-xs"
                  >
                    <ClipboardList className="size-3.5" strokeWidth={1.5} />
                    Guardar acuerdos
                  </Button>
                )}
              </div>
            }
          >
            Plenaria de apertura — acuerdos
          </SectionLabel>
          <Textarea
            readOnly={soloLectura}
            value={acuerdosValor}
            onChange={(e) => setAcuerdosBorrador(e.target.value)}
            onBlur={(e) => {
              if (!soloLectura && e.target.value !== mesa.plenaria.acuerdos)
                confirmarAcuerdos();
            }}
            rows={4}
            aria-label="Acuerdos de la plenaria de apertura"
            placeholder="Registra los acuerdos de la plenaria: qué problema se priorizó, cómo se repartieron los temas entre submesas y cuándo será la plenaria de cierre…"
            className="min-h-[110px] w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3 text-sm leading-relaxed text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-colors focus:border-[var(--ember)]"
          />
          <p className="flex items-start gap-2 text-[11px] leading-relaxed text-[var(--text-tertiary)]">
            <ClipboardList
              className="mt-0.5 size-3.5 shrink-0"
              strokeWidth={1.5}
            />
            Los acuerdos de la plenaria orientan el trabajo de cada submesa: en
            ellas se desarrolla el papelografo (árbol de problemas y de
            soluciones).
          </p>
        </section>

        {/* ---------- Contabilización y registro de asistentes ---------- */}
        <section className="space-y-3">
          <SectionLabel>Contabilización de asistentes</SectionLabel>
          <div className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                  Modo de contabilización de asistentes
                </h4>
                <p className="text-xs text-[var(--text-secondary)]">
                  Define si las personas de plenaria y submesas son el mismo grupo o grupos independientes.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Label htmlFor="switch-conteo-independiente" className="text-xs font-medium text-[var(--text-secondary)]">
                  {mesa.conteoIndependiente ? "Sumar por separado" : "Mismo grupo"}
                </Label>
                <Switch
                  id="switch-conteo-independiente"
                  disabled={soloLectura}
                  checked={!!mesa.conteoIndependiente}
                  onCheckedChange={(checked) => {
                    useMesasStore.getState().setConteoIndependiente(mesa.id, checked);
                    toast.success(
                      checked
                        ? "Modo activado: Sumar plenaria y submesas por separado"
                        : "Modo activado: Mismo grupo en plenaria y submesas"
                    );
                  }}
                />
              </div>
            </div>

            {/* Opciones con radio/toggle visual */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Button
                variant="unstyled"
                size="unstyled"
                type="button"
                disabled={soloLectura}
                onClick={() => {
                  if (mesa.conteoIndependiente) {
                    useMesasStore.getState().setConteoIndependiente(mesa.id, false);
                    toast.success("Modo activado: Mismo grupo en plenaria y submesas");
                  }
                }}
                className={`flex flex-col items-start gap-1.5 rounded-lg border p-3 text-left transition-colors ${
                  !mesa.conteoIndependiente
                    ? "border-[var(--ember)] bg-[var(--surface-2)]"
                    : "border-[var(--border)] bg-[var(--surface-0)] hover:bg-[var(--surface-1)] opacity-75"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${
                      !mesa.conteoIndependiente
                        ? "border-[var(--ember)] bg-[var(--ember)] text-[var(--surface-0)]"
                        : "border-[var(--border-strong)] bg-transparent"
                    }`}
                  >
                    {!mesa.conteoIndependiente && <span className="size-1.5 rounded-full bg-[var(--surface-0)]" />}
                  </span>
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    Mismo grupo de personas en plenaria y submesas (no duplicar)
                  </span>
                </div>
                <p className="pl-6 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                  Las mismas personas van a plenaria y a las submesas. Total = el valor que el facilitador defina (o el mayor grupo).
                </p>
              </Button>

              <Button
                variant="unstyled"
                size="unstyled"
                type="button"
                disabled={soloLectura}
                onClick={() => {
                  if (!mesa.conteoIndependiente) {
                    useMesasStore.getState().setConteoIndependiente(mesa.id, true);
                    toast.success("Modo activado: Sumar plenaria y submesas por separado");
                  }
                }}
                className={`flex flex-col items-start gap-1.5 rounded-lg border p-3 text-left transition-colors ${
                  mesa.conteoIndependiente
                    ? "border-[var(--ember)] bg-[var(--surface-2)]"
                    : "border-[var(--border)] bg-[var(--surface-0)] hover:bg-[var(--surface-1)] opacity-75"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${
                      mesa.conteoIndependiente
                        ? "border-[var(--ember)] bg-[var(--ember)] text-[var(--surface-0)]"
                        : "border-[var(--border-strong)] bg-transparent"
                    }`}
                  >
                    {mesa.conteoIndependiente && <span className="size-1.5 rounded-full bg-[var(--surface-0)]" />}
                  </span>
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    Sumar plenaria y submesas por separado (son grupos distintos)
                  </span>
                </div>
                <p className="pl-6 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                  Los asistentes de plenaria y submesas son personas distintas. Total = Asistentes plenaria + Σ Asistentes submesas.
                </p>
              </Button>
            </div>

            {/* Campos de captura de asistentes */}
            <div className="grid grid-cols-1 gap-4 border-t border-[var(--border)] pt-3 sm:grid-cols-2">
              <FormField
                id="asistentes-plenaria-input"
                label={
                  mesa.conteoIndependiente
                    ? "Personas en plenaria (sin contar submesas)"
                    : "Asistentes en plenaria de apertura"
                }
                description={
                  mesa.conteoIndependiente
                    ? "Se sumará al conteo de submesas."
                    : "Asistencia registrada durante la apertura comunitaria."
                }
              >
                {(controlProps) => (
                  <Input
                    {...controlProps}
                    type="number"
                    min={0}
                    readOnly={soloLectura}
                    placeholder="0"
                    value={
                      asistentesPlenariaBorrador !== undefined
                        ? (asistentesPlenariaBorrador ?? "")
                        : (mesa.asistentesPlenaaria ?? mesa.asistentesPlenaria ?? "")
                    }
                    onChange={(e) => {
                      const val = e.target.value === "" ? null : Math.max(0, Math.floor(Number(e.target.value)));
                      setAsistentesPlenariaBorrador(val);
                    }}
                    onBlur={() => {
                      if (asistentesPlenariaBorrador !== undefined && !soloLectura) {
                        useMesasStore.getState().setAsistentesPlenaria(mesa.id, asistentesPlenariaBorrador);
                        mutarAsistentesPlenaria.mutate({ mesaId: mesa.id, cantidad: asistentesPlenariaBorrador });
                        toast.success("Asistentes en plenaria actualizados");
                      }
                    }}
                    className="w-full tabular bg-[var(--surface-0)]"
                  />
                )}
              </FormField>

              {!mesa.conteoIndependiente ? (
                <FormField
                  id="total-asistentes-manual-input"
                  label="Total de asistentes definido por facilitador"
                  description="Total de participantes únicos de la jornada completa."
                >
                  {(controlProps) => (
                    <Input
                      {...controlProps}
                      type="number"
                      min={0}
                      readOnly={soloLectura}
                      placeholder={String(calcularTotalAsistentes(mesa))}
                      value={
                        totalAsistentesBorrador !== undefined
                          ? (totalAsistentesBorrador ?? "")
                          : (mesa.totalAsistentes ?? "")
                      }
                      onChange={(e) => {
                        const val = e.target.value === "" ? null : Math.max(0, Math.floor(Number(e.target.value)));
                        setTotalAsistentesBorrador(val);
                      }}
                      onBlur={() => {
                        if (totalAsistentesBorrador !== undefined && !soloLectura) {
                          const nuevoTotal = totalAsistentesBorrador ?? 0;
                          useMesasStore.getState().actualizarMesa(mesa.id, { totalAsistentes: nuevoTotal });
                          toast.success("Total de asistentes actualizado");
                        }
                      }}
                      className="w-full tabular bg-[var(--surface-0)]"
                    />
                  )}
                </FormField>
              ) : (
                <div className="flex flex-col justify-center rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-0)] p-3">
                  <span className="text-xs font-medium text-[var(--text-secondary)]">
                    Total calculado automáticamente:
                  </span>
                  <span className="text-xl font-bold text-[var(--text-primary)] tabular">
                    {calcularTotalAsistentes(mesa)} personas
                  </span>
                  <span className="text-[11px] text-[var(--text-tertiary)]">
                    {(mesa.asistentesPlenaaria ?? mesa.asistentesPlenaria ?? 0) === 0
                      ? `Sumatoria de submesas (${mesa.submesas.reduce((acc, sm) => acc + (sm.participantes ?? 0), 0)})`
                      : mesa.submesas.reduce((acc, sm) => acc + (sm.participantes ?? 0), 0) === 0
                      ? `Asistentes en plenaria (${mesa.asistentesPlenaaria ?? mesa.asistentesPlenaria})`
                      : `Plenaria (${mesa.asistentesPlenaaria ?? mesa.asistentesPlenaria}) + Submesas (${mesa.submesas.reduce((acc, sm) => acc + (sm.participantes ?? 0), 0)})`}
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ---------- Informe y relatoría final de la mesa ---------- */}
        <section className="space-y-4">
          <SectionLabel
            right={
              <div className="flex flex-wrap items-center gap-2">
                {/* Selector segmentado de modo de relatoría */}
                <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-0.5 text-xs">
                  <Button
                    variant="unstyled"
                    size="unstyled"
                    type="button"
                    onClick={() => handleCambiarModoRelatoria("narrativo")}
                    className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                      modoRelatoriaLocal === "narrativo"
                        ? "bg-[var(--surface-0)] text-[var(--text-primary)] shadow-xs"
                        : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    📝 Relatoría narrativa
                  </Button>
                  <Button
                    variant="unstyled"
                    size="unstyled"
                    type="button"
                    onClick={() => handleCambiarModoRelatoria("matriz")}
                    className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                      modoRelatoriaLocal === "matriz"
                        ? "bg-[var(--surface-0)] text-[var(--text-primary)] shadow-xs"
                        : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    🌳 Matriz de Diagnóstico y Soluciones
                  </Button>
                  <Button
                    variant="unstyled"
                    size="unstyled"
                    type="button"
                    onClick={() => handleCambiarModoRelatoria("hibrido")}
                    className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                      modoRelatoriaLocal === "hibrido"
                        ? "bg-[var(--surface-0)] text-[var(--text-primary)] shadow-xs"
                        : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    Híbrido
                  </Button>
                </div>

                {!soloLectura && (
                  <>
                    {mesa.submesas && mesa.submesas.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        onClick={handleConsolidarSubmesas}
                        className="h-7 gap-1 text-xs text-[var(--ember)]"
                        title="Importar y unificar causas, efectos, medios y fines de todas las submesas"
                      >
                        <FolderSync className="size-3.5" strokeWidth={1.5} />
                        Importar y consolidar desde submesas
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={handleGenerarBorradorTecnico}
                      className="h-7 gap-1 text-xs text-[var(--success)]"
                      title="Generar borrador técnico de relatoría conforme a lineamientos DNP / CONPES desde la matriz"
                    >
                      <Sparkles className="size-3.5" strokeWidth={1.5} />
                      Generar borrador DNP
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={confirmarInforme}
                      className="h-7 text-xs"
                    >
                      <FileText className="size-3.5" strokeWidth={1.5} />
                      Guardar informe
                    </Button>
                  </>
                )}
              </div>
            }
          >
            Informe y relatoría de la mesa
          </SectionLabel>

          {/* Si el modo es matriz o híbrido, renderizar la matriz de árbol */}
          {(modoRelatoriaLocal === "matriz" || modoRelatoriaLocal === "hibrido") && (
            <MatrizArbolRelatoria
              mesaId={mesa.id}
              mesaNombre={mesa.nombre}
              localidad={mesa.lugar || "Cartagena de Indias"}
              onGenerarSintesisNarrativa={handleGenerarBorradorTecnico}
              arbolProblemas={
                mesa.arbolProblemas ?? {
                  problemaCentral: mesa.nombre,
                  causas: [],
                  efectos: [],
                }
              }
              arbolSoluciones={
                mesa.arbolSoluciones ?? {
                  objetivoCentral: "",
                  medios: [],
                  fines: [],
                }
              }
              onActualizarProblemas={handleActualizarProblemasMesa}
              onActualizarSoluciones={handleActualizarSolucionesMesa}
              readOnly={soloLectura}
              submesasDisponibles={(mesa.submesas ?? []).map((sm) => ({
                id: sm.id,
                nombre: sm.nombre,
              }))}
              onConsolidarSubmesas={
                mesa.submesas && mesa.submesas.length > 0 ? handleConsolidarSubmesas : undefined
              }
            />
          )}

          {/* Si el modo es narrativo o híbrido, renderizar el editor narrativo */}
          {(modoRelatoriaLocal === "narrativo" || modoRelatoriaLocal === "hibrido") && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-secondary)]">
                  Memoria técnica y relatoría narrativa (Redacción formal DNP / CONPES)
                </span>
                <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
                  {soloLectura ? "Solo lectura" : "Se guarda al salir del campo"}
                </span>
              </div>
              <Textarea
                readOnly={soloLectura}
                value={informeValor}
                onChange={(e) => setInformeBorrador(e.target.value)}
                onBlur={(e) => {
                  if (!soloLectura && e.target.value !== (mesa.informe ?? ""))
                    confirmarInforme();
                }}
                rows={6}
                aria-label="Informe y relatoría de la mesa"
                placeholder="Registra aquí el informe o relatoría final de la mesa: síntesis de discusiones, hallazgos comunitarios, compromisos adquiridos y recomendaciones para el CONPES distrital…"
                className="min-h-[140px] w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3 font-mono text-xs leading-relaxed text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-colors focus:border-[var(--ember)]"
              />
              <p className="flex items-start gap-2 text-[11px] leading-relaxed text-[var(--text-tertiary)]">
                <FileText
                  className="mt-0.5 size-3.5 shrink-0"
                  strokeWidth={1.5}
                />
                El informe consolida el acta comunitaria y la memoria técnica de la mesa para la formulación de la política pública.
              </p>
            </div>
          )}
        </section>

        {/* ---------- Submesas ---------- */}
        <section className="space-y-3">
          <SectionLabel
            right={
              !soloLectura && (
                <Button
                  variant="default"
                  size="default"
                  type="button"
                  onClick={() => setFormSubAbierto((v) => !v)}
                  aria-expanded={formSubAbierto}
                >
                  <Plus className="size-3.5" strokeWidth={1.5} />
                  Submesa
                </Button>
              )
            }
          >
            Submesas ({mesa.submesas.length})
          </SectionLabel>

          {/* Formulario inline de submesa */}
          <AnimatePresence initial={false}>
            {formSubAbierto && !soloLectura && (
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
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() => setFormSubAbierto(false)}
                    >
                      <X className="size-3.5" strokeWidth={1.5} />
                      Cancelar
                    </Button>
                    <Button
                      variant="default"
                      size="default"
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
                En la plenaria se acuerdan los temas y luego cada submesa
                desarrolla su papelografo. Si la mesa trabaja como un solo
                grupo, crea una única submesa llamada «Plenaria».
              </p>
              {!soloLectura && (
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setFormSubAbierto(true)}
                  className="mt-1"
                >
                  <Plus className="size-3.5" strokeWidth={1.5} />
                  Crear la primera submesa
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {mesa.submesas.map((sm) => {
                const estado = estadoDiligenciamiento(sm);
                const p = resumenProblemas(sm);
                const s = resumenSoluciones(sm);
                return (
                  <Button
                    variant="unstyled"
                    size="unstyled"
                    key={sm.id}
                    disabled={soloLectura}
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
                        {s.total > 0
                          ? `${s.total} soluciones`
                          : "sin soluciones"}
                      </span>
                    </div>

                    <span
                      className={`label-micro ${TONOS_ESTADO[estado.tono]}`}
                    >
                      {estado.label}
                    </span>
                  </Button>
                );
              })}
            </div>
          )}
        </section>

        {/* ---------- Adjuntos de la mesa ---------- */}
        <section className="space-y-3">
          <SectionLabel>Adjuntos de la mesa</SectionLabel>
          <AdjuntosZona
            adjuntos={mesa.adjuntos ?? []}
            onAgregar={(adj) => useMesasStore.getState().agregarAdjuntoMesa(mesa.id, adj)}
            onEliminar={(adjId) => useMesasStore.getState().eliminarAdjuntoMesa(mesa.id, adjId)}
            soloLectura={soloLectura}
          />
        </section>
      </div>
    </PanelShell>
  );
}
