"use client";

import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { Input } from "@/shared/ui/input";
import { FormField } from "@/shared/ui/form-field";
import { Badge } from "@/shared/ui/badge";
import { Switch } from "@/shared/ui/switch";
import { Label } from "@/shared/ui/label";

import { useState, useMemo, useEffect } from "react";
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
  QrCode,
  Download,
  UserPlus,
  Trash2,
  Search,
  ExternalLink,
  Printer,
  Maximize2,
  Share2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  useAsistenciaStore,
  useRegistrosMesa,
  calcularResumenEnfoques,
} from "@/features/mesas/state/asistencia-store";
import {
  ENFOQUES_DIFERENCIALES_LABELS,
  ENFOQUES_DIFERENCIALES_BADGES,
  TIPOS_DOCUMENTO_LABELS,
  GENEROS_LABELS,
  type EnfoqueDiferencial,
  type TipoDocumento,
  type Genero,
  type RegistroAsistencia,
} from "@/features/mesas/models/asistencia";
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
  const mesa = mesaRemota ?? mesaStore;

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

  /* Registro de Asistencia Digital con QR en Puerta */
  const registrosMesa = useRegistrosMesa(props.mesaId);
  const registrarAsistente = useAsistenciaStore((s) => s.registrarAsistente);
  const eliminarRegistro = useAsistenciaStore((s) => s.eliminarRegistro);
  const exportarPlanillaCSV = useAsistenciaStore((s) => s.exportarPlanillaCSV);

  const [filtroEnfoque, setFiltroEnfoque] = useState<string>("todos");
  const [busquedaAsistente, setBusquedaAsistente] = useState("");
  const [cartelModalAbierto, setCartelModalAbierto] = useState(false);
  const [formManualAbierto, setFormManualAbierto] = useState(false);

  const [prevMesaId, setPrevMesaId] = useState(props.mesaId);
  if (props.mesaId !== prevMesaId) {
    setPrevMesaId(props.mesaId);
    setAcuerdosBorrador(null);
    setInformeBorrador(null);
    setAsistentesPlenariaBorrador(undefined);
    setTotalAsistentesBorrador(undefined);
    setModoRelatoriaLocal(mesa?.modoRelatoria ?? "hibrido");
    setFiltroEnfoque("todos");
    setBusquedaAsistente("");
    setCartelModalAbierto(false);
    setFormManualAbierto(false);
  }

  // Formulario manual rápido
  const [manualNombre, setManualNombre] = useState("");
  const [manualTipoDoc, setManualTipoDoc] = useState<TipoDocumento>("CC");
  const [manualNumDoc, setManualNumDoc] = useState("");
  const [manualGenero, setManualGenero] = useState<Genero>("mujer");
  const [manualEnfoque, setManualEnfoque] = useState<EnfoqueDiferencial>("ninguno");
  const [manualBarrio, setManualBarrio] = useState("");
  const [manualTel, setManualTel] = useState("");
  const [manualSubmesa, setManualSubmesa] = useState("Plenaria General");

  /* formulario inline de submesa */
  const [formSubAbierto, setFormSubAbierto] = useState(false);
  const [nombreSub, setNombreSub] = useState("");
  const [temaSub, setTemaSub] = useState("");
  const [participantesSub, setParticipantesSub] = useState("");

  const registrosFiltrados = useMemo(() => {
    return registrosMesa.filter((r) => {
      const matchEnfoque = filtroEnfoque === "todos" || r.enfoqueDiferencial === filtroEnfoque;
      const term = busquedaAsistente.toLowerCase().trim();
      const matchBusqueda =
        !term ||
        r.nombreCompleto.toLowerCase().includes(term) ||
        r.numeroDocumento.toLowerCase().includes(term) ||
        r.organizacionOBarrio.toLowerCase().includes(term);
      return matchEnfoque && matchBusqueda;
    });
  }, [registrosMesa, filtroEnfoque, busquedaAsistente]);

  const resumenEnfoques = useMemo(
    () => calcularResumenEnfoques(registrosMesa),
    [registrosMesa]
  );

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

  const handleGuardarManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualNombre.trim() || !manualNumDoc.trim() || !manualBarrio.trim()) {
      toast.error("Completa nombres, documento y barrio/organización");
      return;
    }
    registrarAsistente({
      mesaId: mesa.id,
      nombreCompleto: manualNombre.trim(),
      tipoDocumento: manualTipoDoc,
      numeroDocumento: manualNumDoc.trim(),
      genero: manualGenero,
      enfoqueDiferencial: manualEnfoque,
      organizacionOBarrio: manualBarrio.trim(),
      telefonoWhatsApp: manualTel.trim() || undefined,
      subMesaAsignada: manualSubmesa === "Plenaria General" ? undefined : manualSubmesa,
    });
    toast.success("Asistente registrado en planilla");
    setManualNombre("");
    setManualNumDoc("");
    setManualBarrio("");
    setManualTel("");
    setFormManualAbierto(false);
  };

  const handleCopiarEnlaceAsistencia = () => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/asistencia/${mesa.id}`;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url);
        toast.success("Enlace de registro copiado al portapapeles", { description: url });
      } else {
        toast.info("Enlace de registro:", { description: url });
      }
    }
  };

  const urlAsistencia = typeof window !== "undefined"
    ? `${window.location.origin}/asistencia/${mesa.id}`
    : `/asistencia/${mesa.id}`;
  const urlQrImg = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(urlAsistencia)}`;

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
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => openPanel("mesa-acta", { mesaId: mesa.id })}
            className="shrink-0 font-medium"
          >
            <FileText className="size-3.5 text-[var(--ember)] mr-1.5" />
            📄 Ver Acta Oficial en PDF
          </Button>
        </div>
      }
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs leading-relaxed text-[var(--text-tertiary)]">
            {mesa.submesas.length > 0
              ? `${mesa.submesas.length} ${mesa.submesas.length === 1 ? "submesa" : "submesas"} · ${conSoluciones} con árbol completo`
              : "Sin submesas todavía"}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => openPanel("mesa-acta", { mesaId: mesa.id })}
              className="shrink-0"
            >
              <FileText className="size-3.5 mr-1.5" />
              📄 Ver Acta Oficial en PDF
            </Button>
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
        </div>
      }
    >
      <div className="w-full space-y-8 px-5 py-6 sm:px-6 lg:px-8 2xl:px-10">
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
                      <span>{Math.max(calcularTotalAsistentes(mesa), registrosMesa.length)}</span>
                    </div>
                    {registrosMesa.length > 0 && (
                      <div className="text-[10px] text-[var(--success)] font-medium">
                        {registrosMesa.length} registrados con QR en puerta
                      </div>
                    )}
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
                    {Math.max(calcularTotalAsistentes(mesa), registrosMesa.length).toLocaleString("es-CO")}
                    {registrosMesa.length > 0 && (
                      <span className="text-[10px] text-[var(--success)] font-medium">
                        ({registrosMesa.length} QR)
                      </span>
                    )}
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

        {/* ---------- Registro de Asistencia Digital con QR en Puerta ---------- */}
        <section className="space-y-4">
          <SectionLabel
            right={
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setCartelModalAbierto(true)}
                  className="h-7 text-xs"
                >
                  <QrCode className="size-3.5 mr-1 text-[var(--ember)]" />
                  📱 Proyectar QR / Cartel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => exportarPlanillaCSV(mesa.id, mesa.nombre)}
                  className="h-7 text-xs"
                  disabled={registrosMesa.length === 0}
                >
                  <Download className="size-3.5 mr-1" />
                  📥 Descargar Planilla (CSV)
                </Button>
              </div>
            }
          >
            Registro de Asistencia y QR en Puerta
          </SectionLabel>

          {/* Tarjeta dual: QR en puerta + Métricas demográficas en vivo */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 sm:p-5">
            {/* Columna QR */}
            <div className="md:col-span-5 flex flex-col items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40 p-4 text-center">
              <div className="relative rounded-xl border-2 border-[var(--border)] bg-[var(--surface-0)] p-2.5 shadow-md">
                <img
                  src={urlQrImg}
                  alt={`QR Asistencia ${mesa.nombre}`}
                  className="size-44 sm:size-48 object-contain"
                />
              </div>
              <p className="mt-3 text-xs font-semibold text-[var(--text-primary)]">
                Escaneo en puerta para ciudadanos
              </p>
              <p className="mt-0.5 text-[11px] text-[var(--text-tertiary)] max-w-[220px] truncate font-mono">
                {urlAsistencia}
              </p>

              <div className="mt-3 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopiarEnlaceAsistencia}
                  className="h-7 text-xs"
                >
                  <Share2 className="size-3 mr-1" />
                  Copiar link
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="h-7 text-xs text-[var(--ember)]"
                >
                  <a href={urlAsistencia} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-3 mr-1" />
                    Abrir móvil
                  </a>
                </Button>
              </div>
            </div>

            {/* Columna Métricas de Quórum y Enfoque Diferencial */}
            <div className="md:col-span-7 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                      Control de Quórum Digital
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-[var(--text-primary)]">
                        {registrosMesa.length}
                      </span>
                      <span className="text-xs text-[var(--text-secondary)]">
                        asistentes registrados en puerta
                      </span>
                    </div>
                  </div>
                  {mesa.aforo ? (
                    <Badge variant="outline" className="text-xs tabular font-medium">
                      Aforo: {Math.round((registrosMesa.length / mesa.aforo) * 100)}% ({mesa.aforo} cupos)
                    </Badge>
                  ) : null}
                </div>

                {/* Desglose por Enfoques Diferenciales */}
                <div className="space-y-2 border-t border-[var(--border)] pt-3">
                  <span className="text-[11px] font-medium text-[var(--text-secondary)] block">
                    Participación por Enfoque Diferencial (Ley 1757 / DNP):
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                    {(Object.entries(resumenEnfoques.porEnfoque) as [EnfoqueDiferencial, number][])
                      .filter(([, cnt]) => cnt > 0)
                      .map(([enf, cnt]) => {
                        const meta = ENFOQUES_DIFERENCIALES_BADGES[enf];
                        return (
                          <Badge
                            key={enf}
                            variant="outline"
                            className="text-[11px] py-0.5 px-2 bg-[var(--surface-2)] font-normal"
                          >
                            <span
                              className="size-2 rounded-full mr-1.5 shrink-0"
                              style={{ backgroundColor: meta.color }}
                            />
                            <span>{meta.etiqueta}: </span>
                            <strong className="ml-1 font-mono font-bold text-[var(--text-primary)]">
                              {cnt}
                            </strong>
                          </Badge>
                        );
                      })}
                    {Object.values(resumenEnfoques.porEnfoque).every((c) => c === 0) && (
                      <span className="text-xs text-[var(--text-tertiary)] italic">
                        Esperando primeros registros con el código QR.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Botón para habilitar formulario manual para facilitadores */}
              {!soloLectura && (
                <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between">
                  <span className="text-xs text-[var(--text-tertiary)]">
                    ¿Asistente sin dispositivo móvil?
                  </span>
                  <Button
                    variant={formManualAbierto ? "outline" : "ember"}
                    size="sm"
                    type="button"
                    onClick={() => setFormManualAbierto(!formManualAbierto)}
                    className="h-8 text-xs font-medium"
                  >
                    <UserPlus className="size-3.5 mr-1.5" />
                    {formManualAbierto ? "Cancelar Registro" : "➕ Registrar Asistente Manual"}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Formulario manual inline (para facilitadores) */}
          <AnimatePresence>
            {formManualAbierto && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleGuardarManual}
                className="overflow-hidden rounded-xl border border-[var(--ember)]/40 bg-[var(--surface-1)] p-4 sm:p-5 space-y-4 shadow-sm"
              >
                <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
                  <div className="flex items-center gap-2">
                    <UserPlus className="size-4 text-[var(--ember)]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                      Registro Manual en Puerta (Facilitación)
                    </h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => setFormManualAbierto(false)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div className="col-span-1 sm:col-span-2 space-y-1">
                    <Label htmlFor="manNombre">Nombres y Apellidos *</Label>
                    <Input
                      id="manNombre"
                      type="text"
                      placeholder="Nombre completo"
                      value={manualNombre}
                      onChange={(e) => setManualNombre(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="manTipoDoc">Tipo Documento</Label>
                    <Select
                      value={manualTipoDoc}
                      onValueChange={(val) => setManualTipoDoc(val as TipoDocumento)}
                    >
                      <SelectTrigger id="manTipoDoc">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(TIPOS_DOCUMENTO_LABELS) as TipoDocumento[]).map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="manNumDoc">Número Documento *</Label>
                    <Input
                      id="manNumDoc"
                      type="text"
                      placeholder="Número de cédula"
                      value={manualNumDoc}
                      onChange={(e) => setManualNumDoc(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="manGenero">Género</Label>
                    <Select
                      value={manualGenero}
                      onValueChange={(val) => setManualGenero(val as Genero)}
                    >
                      <SelectTrigger id="manGenero">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(GENEROS_LABELS) as Genero[]).map((g) => (
                          <SelectItem key={g} value={g}>
                            {GENEROS_LABELS[g]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="manEnfoque">Enfoque Diferencial</Label>
                    <Select
                      value={manualEnfoque}
                      onValueChange={(val) => setManualEnfoque(val as EnfoqueDiferencial)}
                    >
                      <SelectTrigger id="manEnfoque">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-56">
                        {(Object.keys(ENFOQUES_DIFERENCIALES_LABELS) as EnfoqueDiferencial[]).map((ef) => (
                          <SelectItem key={ef} value={ef}>
                            {ENFOQUES_DIFERENCIALES_LABELS[ef]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-1 sm:col-span-2 space-y-1">
                    <Label htmlFor="manBarrio">Barrio / Organización / JAC *</Label>
                    <Input
                      id="manBarrio"
                      type="text"
                      placeholder="Ej. Getsemaní, Olaya, JAC Central..."
                      value={manualBarrio}
                      onChange={(e) => setManualBarrio(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="manTel">Teléfono / WhatsApp</Label>
                    <Input
                      id="manTel"
                      type="tel"
                      placeholder="300 000 0000"
                      value={manualTel}
                      onChange={(e) => setManualTel(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="manSubmesa">Submesa Asignada</Label>
                    <Select
                      value={manualSubmesa}
                      onValueChange={setManualSubmesa}
                    >
                      <SelectTrigger id="manSubmesa">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Plenaria General">Plenaria General</SelectItem>
                        {mesa.submesas.map((sm) => (
                          <SelectItem key={sm.id} value={sm.nombre}>
                            {sm.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormManualAbierto(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" variant="ember" size="sm">
                    Guardar en Planilla Oficial
                  </Button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Tabla en vivo de Asistentes Registrados con Búsqueda y Filtro */}
          <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[var(--text-tertiary)]" />
                <Input
                  type="text"
                  placeholder="Buscar asistente por nombre, documento o barrio…"
                  value={busquedaAsistente}
                  onChange={(e) => setBusquedaAsistente(e.target.value)}
                  className="pl-9 h-8 text-xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <Select value={filtroEnfoque} onValueChange={setFiltroEnfoque}>
                  <SelectTrigger className="h-8 text-xs w-[180px]">
                    <SelectValue placeholder="Enfoque diferencial" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    <SelectItem value="todos">Todos los enfoques</SelectItem>
                    {(Object.keys(ENFOQUES_DIFERENCIALES_LABELS) as EnfoqueDiferencial[]).map((ef) => (
                      <SelectItem key={ef} value={ef}>
                        {ENFOQUES_DIFERENCIALES_LABELS[ef]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Listado en tabla */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
                    <th className="py-2 px-2.5">No.</th>
                    <th className="py-2 px-2.5">Asistente</th>
                    <th className="py-2 px-2.5">Documento</th>
                    <th className="py-2 px-2.5">Enfoque Diferencial</th>
                    <th className="py-2 px-2.5">Barrio / JAC</th>
                    <th className="py-2 px-2.5">Submesa</th>
                    <th className="py-2 px-2.5">Hora Ingreso</th>
                    {!soloLectura && <th className="py-2 px-2.5 text-right">Acción</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {registrosFiltrados.length > 0 ? (
                    registrosFiltrados.map((reg, idx) => {
                      const badgeMeta = ENFOQUES_DIFERENCIALES_BADGES[reg.enfoqueDiferencial];
                      const hora = new Date(reg.horaRegistro).toLocaleTimeString("es-CO", {
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      return (
                        <tr key={reg.id} className="hover:bg-[var(--surface-2)]/40 transition-colors">
                          <td className="py-2 px-2.5 font-mono text-[var(--text-tertiary)]">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-2.5 font-medium text-[var(--text-primary)]">
                            {reg.nombreCompleto}
                          </td>
                          <td className="py-2 px-2.5 font-mono text-[var(--text-secondary)]">
                            {reg.tipoDocumento} {reg.numeroDocumento}
                          </td>
                          <td className="py-2 px-2.5">
                            <span
                              className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium"
                              style={{
                                backgroundColor: `${badgeMeta.color}18`,
                                color: badgeMeta.color,
                                border: `1px solid ${badgeMeta.color}40`,
                              }}
                            >
                              {badgeMeta.etiqueta}
                            </span>
                          </td>
                          <td className="py-2 px-2.5 text-[var(--text-secondary)] max-w-[140px] truncate">
                            {reg.organizacionOBarrio}
                          </td>
                          <td className="py-2 px-2.5 text-[var(--text-secondary)] max-w-[130px] truncate">
                            {reg.subMesaAsignada || "Plenaria General"}
                          </td>
                          <td className="py-2 px-2.5 text-[var(--text-tertiary)] font-mono">
                            {hora}
                          </td>
                          {!soloLectura && (
                            <td className="py-2 px-2.5 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (confirm(`¿Eliminar registro de ${reg.nombreCompleto}?`)) {
                                    eliminarRegistro(mesa.id, reg.id);
                                    toast.info("Registro eliminado");
                                  }
                                }}
                                className="h-6 w-6 p-0 text-[var(--text-tertiary)] hover:text-[var(--danger)]"
                              >
                                <Trash2 className="size-3" />
                              </Button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={soloLectura ? 7 : 8} className="py-6 text-center text-xs text-[var(--text-tertiary)] italic">
                        {busquedaAsistente || filtroEnfoque !== "todos"
                          ? "No se encontraron asistentes con los filtros aplicados."
                          : "No hay asistentes registrados todavía. Escanea el QR para registrar el primer ingreso."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] text-[11px] text-[var(--text-tertiary)]">
              <span>
                Mostrando {registrosFiltrados.length} de {registrosMesa.length} asistentes registrados
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => exportarPlanillaCSV(mesa.id, mesa.nombre)}
                disabled={registrosMesa.length === 0}
                className="h-6 text-xs text-[var(--ember)]"
              >
                <Download className="size-3 mr-1" />
                Descargar CSV
              </Button>
            </div>
          </div>
        </section>

        {/* Modal / Cartel de Proyección para Puerta y Videobeam */}
        <AnimatePresence>
          {cartelModalAbierto && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--surface-0)]/80 p-4 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-8 text-[var(--text-primary)] shadow-2xl space-y-6 text-center"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCartelModalAbierto(false)}
                  className="absolute right-4 top-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  <X className="size-5" />
                </Button>

                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
                    Alcaldía Mayor de Cartagena de Indias
                  </p>
                  <h2 className="text-lg font-black text-[var(--text-primary)]">
                    POLÍTICA PÚBLICA DE SEGURIDAD HUMANA INTEGRAL
                  </h2>
                  <Badge variant="outline" className="mt-1">
                    Registro Oficial de Asistencia en Puerta
                  </Badge>
                </div>

                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-3 space-y-1">
                  <p className="font-bold text-sm text-[var(--text-primary)]">{mesa.nombre}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{mesa.lugar}</p>
                </div>

                {/* Gran código QR */}
                <div className="mx-auto flex size-64 items-center justify-center rounded-2xl border-4 border-[var(--border-strong)] bg-[var(--surface-0)] p-3 shadow-lg">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(urlAsistencia)}`}
                    alt="QR Cartel Asistencia"
                    className="size-full object-contain"
                  />
                </div>

                <div className="space-y-1 text-xs text-[var(--text-secondary)]">
                  <p className="font-bold text-sm text-[var(--text-primary)]">
                    Apunta con la cámara de tu celular para registrarte
                  </p>
                  <p className="font-mono text-[11px] text-[var(--text-tertiary)] truncate max-w-sm mx-auto">
                    {urlAsistencia}
                  </p>
                </div>

                <div className="flex gap-2 pt-2 border-t border-[var(--border)]">
                  <Button
                    variant="outline"
                    className="w-1/2"
                    onClick={() => setCartelModalAbierto(false)}
                  >
                    Cerrar
                  </Button>
                  <Button
                    variant="ember"
                    className="w-1/2"
                    onClick={() => {
                      if (typeof window !== "undefined") window.print();
                    }}
                  >
                    <Printer className="size-4 mr-1.5" />
                    Imprimir Cartel
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

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
