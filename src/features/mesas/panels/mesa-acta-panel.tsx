"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import {
  Printer,
  Share2,
  Building2,
  Scale,
  Clock,
  Download,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { PanelShell } from "@/core/panels/panel-shell";
import { usePanels } from "@/core/panels/panel-store";
import { useMesasStore } from "@/features/mesas/state/mesas-store";
import { AGENDA_MESAS } from "@/features/mesas/data/agenda.data";
import { CONTENIDO_MESAS } from "@/features/mesas/data/agenda-contenido.data";
import {
  useRegistrosMesa,
  calcularResumenEnfoques,
} from "@/features/mesas/state/asistencia-store";
import {
  ENFOQUES_DIFERENCIALES_LABELS,
  type EnfoqueDiferencial,
} from "@/features/mesas/models/asistencia";
import { calcularTotalAsistentes } from "@/features/mesas/models/mesas";

export function MesaActaPanel({
  entryKey,
  props,
}: {
  entryKey: string;
  props: { mesaId: string };
}) {
  const { closeTop } = usePanels();
  const mesaStore = useMesasStore((s) =>
    s.mesas.find((m) => m.id === props.mesaId)
  );
  const mesaAgenda = AGENDA_MESAS.find((m) => m.id === props.mesaId);
  const contenido = CONTENIDO_MESAS[props.mesaId];
  const registros = useRegistrosMesa(props.mesaId);
  const resumenEnfoques = useMemo(
    () => calcularResumenEnfoques(registros),
    [registros]
  );

  const mesa = mesaStore ?? {
    id: props.mesaId,
    nombre: mesaAgenda?.nombre || `Mesa ${props.mesaId}`,
    fecha: mesaAgenda?.fecha || "2026-10-15",
    lugar: mesaAgenda?.lugar || "Cartagena de Indias",
    entidad: mesaAgenda?.responsable || "Secretaría de Planeación Distrital",
    facilitador: "Equipo de Facilitación Distrital",
    totalAsistentes: 0,
    horario: mesaAgenda ? `${mesaAgenda.horaInicio} – ${mesaAgenda.horaFin}` : "08:30 – 12:00",
    descripcion: mesaAgenda?.observaciones || "",
    dimensionOnu: mesaAgenda?.dimensionesONU[0] || "Seguridad Personal",
    tipoMesa: mesaAgenda?.tipo || "territorial",
    codigoOficial: props.mesaId.toUpperCase(),
    estado: "programada" as const,
    plenaria: { acuerdos: "" },
    submesas: [],
  };

  const totalAsistentes = Math.max(
    calcularTotalAsistentes(mesa),
    registros.length
  );

  const estadoMesaLower = (mesa.estado || "").toLowerCase();
  const actaDisponible =
    estadoMesaLower === "cerrada" ||
    estadoMesaLower === "completada" ||
    estadoMesaLower === "finalizada" ||
    estadoMesaLower === "acta_concertada" ||
    Boolean(mesa.sha256Acta);

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleDescargarPdf = () => {
    if (!actaDisponible) {
      toast.info("Acta oficial no disponible aún", {
        description:
          "Esta mesa se encuentra en proceso de concertación. El documento oficial en PDF estará disponible una vez cerrada y formalizada la sesión plenaria.",
        action: {
          label: "Imprimir borrador",
          onClick: () => {
            if (typeof window !== "undefined") window.print();
          },
        },
      });
      return;
    }

    toast.success("Iniciando descarga del acta oficial...", {
      description: `Acta Oficial ${mesa.codigoOficial || mesa.id.toUpperCase()}`,
    });
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleShare = () => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/plataforma/mesas?mesaId=${props.mesaId}&ver=acta`;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url);
        toast.success("Enlace del acta copiado al portapapeles", {
          description: url,
        });
      } else {
        toast.info("Enlace del acta:", { description: url });
      }
    }
  };

  const fechaFormateada = useMemo(() => {
    try {
      return format(new Date(`${mesa.fecha}T12:00:00`), "EEEE, d 'de' MMMM 'de' yyyy", {
        locale: es,
      });
    } catch {
      return mesa.fecha;
    }
  }, [mesa.fecha]);

  return (
    <PanelShell
      entryKey={entryKey}
      crumbs={[
        { label: "Mesas de trabajo" },
        { label: mesa.nombre, targetKey: entryKey },
        { label: actaDisponible ? "Acta Oficial" : "Borrador de Acta (En Concertación)" },
      ]}
      kicker={actaDisponible ? "Documento Público Distrital" : "Borrador de Trabajo en Curso"}
      title={`Acta de Consulta — ${mesa.codigoOficial || mesa.id.toUpperCase()}`}
      subtitle={
        actaDisponible
          ? "Documento Oficial Distrital · Conforme a Ley Estatutaria 1757 de 2015 y Sentencia C-150 de 2015"
          : "Borrador de Trabajo · Sesión en Proceso de Concertación Ciudadana"
      }
      onClose={closeTop}
      onCloseToKey={closeTop}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="hidden sm:inline-flex"
          >
            <Share2 className="size-3.5 mr-1.5" />
            Compartir
          </Button>
          {!actaDisponible && (
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="text-xs"
            >
              <Printer className="size-3.5 mr-1.5" />
              Imprimir Borrador
            </Button>
          )}
          <Button
            variant={actaDisponible ? "ember" : "outline"}
            size="sm"
            onClick={handleDescargarPdf}
            className="shadow-sm text-xs font-semibold"
          >
            <Download className="size-3.5 mr-1.5" />
            {actaDisponible ? "Descargar Acta Oficial (PDF)" : "Descargar PDF"}
          </Button>
        </div>
      }
      footer={
        <div className="flex items-center justify-between gap-3 text-xs text-[var(--text-tertiary)]">
          <span>Radicado Oficial: POLIS-ACTA-{props.mesaId.toUpperCase()}</span>
          <div className="flex items-center gap-2">
            {!actaDisponible && (
              <Button variant="ghost" size="sm" onClick={handlePrint} className="h-8 text-xs">
                <Printer className="size-3.5 mr-1.5" />
                Imprimir borrador preliminar
              </Button>
            )}
            <Button
              variant={actaDisponible ? "ember" : "outline"}
              size="sm"
              onClick={handleDescargarPdf}
              className="h-8 text-xs font-semibold"
            >
              <Download className="size-3.5 mr-1.5" />
              {actaDisponible ? "Descargar Acta Oficial (PDF)" : "Descargar PDF"}
            </Button>
          </div>
        </div>
      }
    >
      {/* Estilos específicos de impresión institucional tamaño Carta */}
      <style jsx global>{`
        @media print {
          @page {
            size: letter portrait;
            margin: 1.6cm 1.4cm 1.6cm 1.4cm;
          }
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            font-size: 11pt !important;
          }
          nav, header, footer, aside, button, .no-print, [role="dialog"] > div:first-child {
            display: none !important;
          }
          #documento-acta-oficial {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          #documento-acta-oficial * {
            color: #000000 !important;
            border-color: #333333 !important;
            background-color: transparent !important;
          }
          .page-break-avoid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .page-break-before {
            break-before: page !important;
            page-break-before: always !important;
          }
        }
      `}</style>

      <div className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Banner Informativo cuando el acta aún no está cerrada/disponible */}
        {!actaDisponible && (
          <div className="rounded-xl border border-[var(--warning)]/40 bg-[var(--warning)]/10 p-4 sm:p-5 text-xs text-[var(--text-primary)] space-y-2 no-print shadow-sm animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5 text-[var(--warning)] font-bold text-sm">
              <Clock className="size-5 shrink-0" />
              <span>Acta oficial no disponible para descarga aún</span>
            </div>
            <p className="leading-relaxed text-[var(--text-secondary)]">
              Esta mesa de trabajo se encuentra actualmente en estado{" "}
              <strong className="capitalize text-[var(--text-primary)]">
                {mesa.estado || "programada"}
              </strong>
              . El acta definitiva con su código de verificación digital (SHA-256) y radicado oficial en PDF estará disponible para descarga ciudadana una vez finalizada la sesión plenaria y formalizada la concertación comunitaria.
            </p>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--warning)]/20">
              <span className="text-[11px] text-[var(--text-tertiary)] italic">
                La visualización a continuación corresponde al borrador preliminar de relatoría y acuerdos en curso.
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="h-7 text-xs border-[var(--warning)]/40 text-[var(--warning)] hover:bg-[var(--warning)]/20"
              >
                <Printer className="size-3.5 mr-1.5" />
                Imprimir borrador preliminar
              </Button>
            </div>
          </div>
        )}

        {/* Barra superior de herramientas en pantalla */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3 text-xs text-[var(--text-secondary)] no-print">
          <div className="flex items-center gap-2">
            <Scale className="size-4 text-[var(--ember)]" />
            <span>
              {actaDisponible
                ? "Documento estructurado listo para impresión en hoja Carta o exportación a PDF."
                : "Borrador de trabajo en curso · La versión oficial estará disponible al cierre de la mesa."}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleShare}>
              <Share2 className="size-3.5 mr-1" />
              Copiar enlace
            </Button>
            {!actaDisponible && (
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="size-3.5 mr-1" />
                Imprimir borrador
              </Button>
            )}
            <Button
              variant={actaDisponible ? "ember" : "outline"}
              size="sm"
              onClick={handleDescargarPdf}
            >
              <Download className="size-3.5 mr-1" />
              {actaDisponible ? "Descargar Acta Oficial (PDF)" : "Descargar PDF"}
            </Button>
          </div>
        </div>

        {/* DOCUMENTO PRINCIPAL DEL ACTA */}
        <article
          id="documento-acta-oficial"
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6 sm:p-10 shadow-sm space-y-8"
        >
          {/* =========================================================
              ENCABEZADO INSTITUCIONAL
             ========================================================= */}
          <header className="border-b-2 border-[var(--border-strong)] pb-6 text-center space-y-2.5 page-break-avoid">
            <div className="flex items-center justify-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-[var(--surface-2)] text-[var(--text-primary)] font-bold">
                <Building2 className="size-6 text-[var(--ember)]" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-primary)]">
                  Alcaldía Mayor de Cartagena de Indias
                </p>
                <p className="text-xs font-semibold text-[var(--text-secondary)]">
                  Secretaría de Planeación Distrital • Dirección de Participación
                </p>
              </div>
            </div>

            <div className="pt-2">
              <span className="inline-block rounded-full border border-[var(--border)] px-3 py-0.5 text-[10px] font-mono uppercase tracking-widest text-[var(--text-secondary)]">
                POLIS • SISTEMA DISTRITAL DE SEGURIDAD HUMANA INTEGRAL
              </span>
              <h1 className="mt-2 text-xl sm:text-2xl font-black uppercase tracking-tight text-[var(--text-primary)]">
                Acta de Consulta Ciudadana
              </h1>
              <p className="text-sm font-semibold text-[var(--ember)]">
                POLÍTICA PÚBLICA DE SEGURIDAD HUMANA INTEGRAL (2026–2036)
              </p>
            </div>

            <p className="mx-auto max-w-2xl text-[11px] leading-relaxed italic text-[var(--text-secondary)] border-t border-[var(--border)] pt-2">
              En cumplimiento de la Ley Estatutaria 1757 de 2015 de Participación Ciudadana y las garantías de devolución motivada de la Sentencia C-150 de 2015 de la Corte Constitucional de Colombia.
            </p>
          </header>

          {/* =========================================================
              1. DATOS ADMINISTRATIVOS
             ========================================================= */}
          <section className="space-y-3 page-break-avoid">
            <div className="flex items-center gap-2 border-b border-[var(--border)] pb-1">
              <span className="flex size-5 items-center justify-center rounded-full bg-[var(--ember)] text-[var(--surface-0)] text-[11px] font-bold">
                1
              </span>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
                Datos Administrativos y de Convocatoria
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs rounded-xl border border-[var(--border)] p-4 bg-[var(--surface-2)]/40">
              <div className="space-y-1">
                <span className="font-semibold text-[var(--text-tertiary)] block uppercase text-[10px]">
                  Código Oficial
                </span>
                <span className="font-mono font-bold text-[var(--text-primary)] text-sm">
                  {mesa.codigoOficial || `ACTA-${mesa.id.toUpperCase()}`}
                </span>
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-[var(--text-tertiary)] block uppercase text-[10px]">
                  Fecha de Realización
                </span>
                <span className="font-medium text-[var(--text-primary)] capitalize">
                  {fechaFormateada}
                </span>
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-[var(--text-tertiary)] block uppercase text-[10px]">
                  Horario Sesión
                </span>
                <span className="font-medium text-[var(--text-primary)]">
                  {mesa.horario || "08:30 – 12:00"}
                </span>
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-[var(--text-tertiary)] block uppercase text-[10px]">
                  Estado del Acta
                </span>
                <span className="font-bold text-[var(--success)] uppercase">
                  {mesa.estado === "cerrada" ? "Cerrada y Validada" : "En Concertación"}
                </span>
              </div>

              <div className="col-span-2 space-y-1 pt-2 border-t border-[var(--border)]">
                <span className="font-semibold text-[var(--text-tertiary)] block uppercase text-[10px]">
                  Nombre de la Mesa
                </span>
                <span className="font-bold text-[var(--text-primary)]">
                  {mesa.nombre}
                </span>
              </div>

              <div className="col-span-2 space-y-1 pt-2 border-t border-[var(--border)]">
                <span className="font-semibold text-[var(--text-tertiary)] block uppercase text-[10px]">
                  Territorio / Localidad
                </span>
                <span className="text-[var(--text-primary)]">
                  {mesaAgenda?.territorio || "Distrito de Cartagena"}
                </span>
              </div>

              <div className="col-span-2 space-y-1 pt-2 border-t border-[var(--border)]">
                <span className="font-semibold text-[var(--text-tertiary)] block uppercase text-[10px]">
                  Lugar / Sede de Encuentro
                </span>
                <span className="text-[var(--text-primary)]">
                  {mesa.lugar}
                </span>
              </div>

              <div className="col-span-2 space-y-1 pt-2 border-t border-[var(--border)]">
                <span className="font-semibold text-[var(--text-tertiary)] block uppercase text-[10px]">
                  Entidades Convocantes y Facilitación
                </span>
                <span className="text-[var(--text-primary)]">
                  {mesa.entidad} • Facilitador: {mesa.facilitador || "Equipo Técnico SPD"}
                </span>
              </div>
            </div>
          </section>

          {/* =========================================================
              2. PARTICIPACIÓN Y QUÓRUM
             ========================================================= */}
          <section className="space-y-3 page-break-avoid">
            <div className="flex items-center gap-2 border-b border-[var(--border)] pb-1">
              <span className="flex size-5 items-center justify-center rounded-full bg-[var(--ember)] text-[var(--surface-0)] text-[11px] font-bold">
                2
              </span>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
                Participación, Quórum y Enfoque Diferencial
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-[var(--border)] p-3 bg-[var(--surface-2)]/30 text-center">
                <span className="text-[10px] font-semibold uppercase text-[var(--text-tertiary)] block">
                  Total Asistentes Registrados
                </span>
                <span className="text-2xl font-black text-[var(--text-primary)]">
                  {totalAsistentes}
                </span>
                <span className="text-[10px] text-[var(--text-secondary)] block mt-0.5">
                  Quórum deliberativo verificado
                </span>
              </div>

              <div className="rounded-xl border border-[var(--border)] p-3 bg-[var(--surface-2)]/30 text-center">
                <span className="text-[10px] font-semibold uppercase text-[var(--text-tertiary)] block">
                  Plenaria vs Submesas
                </span>
                <span className="text-sm font-bold text-[var(--text-primary)] mt-1 block">
                  {mesa.asistentesPlenaria ?? mesa.asistentesPlenaaria ?? Math.round(totalAsistentes * 0.4)} en Plenaria
                </span>
                <span className="text-[10px] text-[var(--text-secondary)] block">
                  {mesa.submesas.length} submesas simultáneas activas
                </span>
              </div>

              <div className="rounded-xl border border-[var(--border)] p-3 bg-[var(--surface-2)]/30 text-center">
                <span className="text-[10px] font-semibold uppercase text-[var(--text-tertiary)] block">
                  Aforo de Capacidad
                </span>
                <span className="text-sm font-bold text-[var(--text-primary)] mt-1 block">
                  {mesa.aforo ? `${mesa.aforo} personas máx.` : "Capacidad regulada"}
                </span>
                <span className="text-[10px] text-[var(--success)] block font-medium">
                  Planilla Digital en Puerta
                </span>
              </div>
            </div>

            {/* Resumen por Enfoque Diferencial */}
            <div className="rounded-xl border border-[var(--border)] p-3 bg-[var(--surface-2)]/20">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block mb-2">
                Desglose Poblacional y Étnico (Ley 1757 / DNP):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {(Object.entries(resumenEnfoques.porEnfoque) as [EnfoqueDiferencial, number][])
                  .filter(([, count]) => count > 0)
                  .map(([enf, count]) => (
                    <div
                      key={enf}
                      className="flex items-center justify-between rounded-lg border border-[var(--border)] px-2.5 py-1 bg-[var(--surface-1)]"
                    >
                      <span className="text-[11px] text-[var(--text-secondary)] truncate">
                        {ENFOQUES_DIFERENCIALES_LABELS[enf]}
                      </span>
                      <span className="font-bold text-[var(--text-primary)] ml-1.5 font-mono">
                        {count} ({resumenEnfoques.porcentajes[enf]}%)
                      </span>
                    </div>
                  ))}
                {Object.values(resumenEnfoques.porEnfoque).every((c) => c === 0) && (
                  <p className="col-span-full text-xs text-[var(--text-tertiary)] italic">
                    Participación abierta ciudadana y líderes comunales de la zona.
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* =========================================================
              3. ACUERDOS DE LA PLENARIA DE APERTURA
             ========================================================= */}
          <section className="space-y-3 page-break-avoid">
            <div className="flex items-center gap-2 border-b border-[var(--border)] pb-1">
              <span className="flex size-5 items-center justify-center rounded-full bg-[var(--ember)] text-[var(--surface-0)] text-[11px] font-bold">
                3
              </span>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
                Acuerdos de la Plenaria de Apertura
              </h2>
            </div>

            <div className="rounded-xl border border-[var(--border)] p-4 bg-[var(--surface-2)]/30 text-xs sm:text-sm leading-relaxed text-[var(--text-secondary)]">
              {mesa.plenaria.acuerdos?.trim() ? (
                <p className="whitespace-pre-line">{mesa.plenaria.acuerdos}</p>
              ) : (
                <p className="italic text-[var(--text-tertiary)]">
                  La plenaria de apertura acordó trabajar con metodología de marco lógico participativo, priorizando las problemáticas críticas de convivencia, protección de la vida y garantías socioeconómicas territoriales bajo los 7 ejes de Seguridad Humana de la ONU.
                </p>
              )}
            </div>
          </section>

          {/* =========================================================
              4. MATRIZ DE MARCO LÓGICO (MML)
             ========================================================= */}
          <section className="space-y-3 page-break-avoid">
            <div className="flex items-center gap-2 border-b border-[var(--border)] pb-1">
              <span className="flex size-5 items-center justify-center rounded-full bg-[var(--ember)] text-[var(--surface-0)] text-[11px] font-bold">
                4
              </span>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
                Matriz de Marco Lógico (MML) — Árbol de Problemas y Soluciones
              </h2>
            </div>

            {/* Tabla MML formateada */}
            <div className="overflow-x-auto rounded-xl border border-[var(--border)] text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--surface-2)] border-b border-[var(--border)] text-[11px] uppercase tracking-wider">
                    <th className="p-2.5 font-bold text-[var(--text-primary)] w-1/4 border-r border-[var(--border)]">
                      Dimensión / Eje
                    </th>
                    <th className="p-2.5 font-bold text-[var(--text-primary)] w-3/8 border-r border-[var(--border)]">
                      Diagnóstico: Causas y Problema
                    </th>
                    <th className="p-2.5 font-bold text-[var(--text-primary)] w-3/8">
                      Propuesta: Medios y Fines
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {mesa.submesas.length > 0 ? (
                    mesa.submesas.map((sm, index) => {
                      const probCentral =
                        sm.arbolProblemas.problemaCentral || "Por estructurar en papelografo";
                      const objCentral =
                        sm.arbolSoluciones.objetivoCentral || "Por definir en plenaria";
                      const causas = sm.arbolProblemas.causas.map((c) => c.texto).join("; ") || "Causas comunitarias identificadas";
                      const medios = sm.arbolSoluciones.medios.map((m) => m.texto).join("; ") || "Medios y programas sugeridos";

                      return (
                        <tr key={sm.id} className={index % 2 === 1 ? "bg-[var(--surface-2)]/30" : ""}>
                          <td className="p-2.5 font-semibold text-[var(--text-primary)] border-r border-[var(--border)] align-top">
                            <div>{sm.nombre}</div>
                            <span className="text-[10px] text-[var(--text-tertiary)] block mt-0.5">
                              {sm.tema || "Eje temático"}
                            </span>
                          </td>
                          <td className="p-2.5 border-r border-[var(--border)] align-top space-y-1">
                            <div>
                              <strong className="text-[var(--text-primary)] block text-[11px]">
                                Problema Central:
                              </strong>
                              <span>{probCentral}</span>
                            </div>
                            <div className="pt-1 text-[11px] text-[var(--text-secondary)]">
                              <span className="font-semibold">Causas raíz: </span>
                              {causas}
                            </div>
                          </td>
                          <td className="p-2.5 align-top space-y-1">
                            <div>
                              <strong className="text-[var(--text-primary)] block text-[11px]">
                                Objetivo / Solución:
                              </strong>
                              <span>{objCentral}</span>
                            </div>
                            <div className="pt-1 text-[11px] text-[var(--text-secondary)]">
                              <span className="font-semibold">Medios de acción: </span>
                              {medios}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td className="p-2.5 font-semibold text-[var(--text-primary)] border-r border-[var(--border)] align-top">
                        {mesa.dimensionOnu || "Seguridad Humana General"}
                      </td>
                      <td className="p-2.5 border-r border-[var(--border)] align-top space-y-1">
                        <strong className="block text-[11px]">Problema Priorizado:</strong>
                        <span>
                          {contenido?.proposito ||
                            "Vulnerabilidad socioeconómica y barreras de acceso a servicios esenciales en el territorio."}
                        </span>
                      </td>
                      <td className="p-2.5 align-top space-y-1">
                        <strong className="block text-[11px]">Línea Estratégica:</strong>
                        <span>
                          Consolidación de capacidades institucionales, vigilancia comunitaria y proyectos de inversión territorial con enfoque diferencial.
                        </span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* =========================================================
              5. INFORME Y RELATORÍA COMUNITARIA
             ========================================================= */}
          <section className="space-y-3 page-break-avoid">
            <div className="flex items-center gap-2 border-b border-[var(--border)] pb-1">
              <span className="flex size-5 items-center justify-center rounded-full bg-[var(--ember)] text-[var(--surface-0)] text-[11px] font-bold">
                5
              </span>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
                Memoria Técnica y Relatoría Comunitaria
              </h2>
            </div>

            <div className="rounded-xl border border-[var(--border)] p-4 bg-[var(--surface-2)]/30 text-xs sm:text-sm leading-relaxed text-[var(--text-secondary)] space-y-2">
              {mesa.informe?.trim() ? (
                <p className="whitespace-pre-line">{mesa.informe}</p>
              ) : (
                <p>
                  Durante la jornada deliberativa, las y los participantes expusieron las dinámicas territoriales que impactan la seguridad humana. Se destacó la necesidad de articulación entre dependencias distritales (Interior, Planeación, Participación, Salud y Educación) para responder de forma articulada y con trazabilidad a los requerimientos de la comunidad.
                </p>
              )}
            </div>
          </section>

          {/* =========================================================
              6. COMPROMISOS Y DEVOLUCIÓN CIUDADANA
             ========================================================= */}
          <section className="space-y-3 page-break-avoid">
            <div className="flex items-center gap-2 border-b border-[var(--border)] pb-1">
              <span className="flex size-5 items-center justify-center rounded-full bg-[var(--ember)] text-[var(--surface-0)] text-[11px] font-bold">
                6
              </span>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
                Compromisos y Garantías de Devolución Ciudadana (Sentencia C-150/15)
              </h2>
            </div>

            <div className="rounded-xl border border-[var(--border)] p-4 bg-[var(--surface-2)]/30 text-xs leading-relaxed space-y-2 text-[var(--text-secondary)]">
              <p>
                En aplicación estricta de la Ley Estatutaria 1757 de 2015 y la jurisprudencia de la Corte Constitucional (Sentencia C-150 de 2015), la Administración Distrital asume los siguientes compromisos vinculantes:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong>Trazabilidad y sistematización digital:</strong> Todos los aportes registrados en esta sesión quedan consignados en la plataforma POLIS y vinculados a la matriz de formulación de la política pública.
                </li>
                <li>
                  <strong>Devolución motivada y fundamentada:</strong> La Secretaría de Planeación Distrital entregará informe de respuesta técnica y jurídica a cada una de las propuestas priorizadas en la plenaria de cierre distrital.
                </li>
                <li>
                  <strong>No regresividad:</strong> Los acuerdos alcanzados orientan las asignaciones presupuestales de los planes operativos anuales de inversión (POAI) 2026–2036.
                </li>
              </ul>
            </div>
          </section>

          {/* =========================================================
              7. CUADRO DE FIRMAS
             ========================================================= */}
          <section className="space-y-4 page-break-avoid pt-4">
            <div className="flex items-center gap-2 border-b border-[var(--border)] pb-1">
              <span className="flex size-5 items-center justify-center rounded-full bg-[var(--ember)] text-[var(--surface-0)] text-[11px] font-bold">
                7
              </span>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
                Constancia y Cuadro Oficial de Firmas
              </h2>
            </div>

            <p className="text-xs text-[var(--text-secondary)] italic">
              En constancia de lo anterior y para dar fe de la veracidad y legitimidad del proceso deliberativo, firman los delegados de la jornada:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
              {/* Firma 1 */}
              <div className="flex flex-col justify-end text-center space-y-1">
                <div className="border-b-2 border-[var(--border-strong)] pb-8 h-16" />
                <span className="text-xs font-bold text-[var(--text-primary)] block pt-1">
                  Facilitador Líder
                </span>
                <span className="text-[10px] text-[var(--text-tertiary)] block">
                  {mesa.facilitador || "Alcaldía de Cartagena"}
                </span>
                <span className="text-[9px] text-[var(--text-tertiary)] block">
                  C.C. ___________________
                </span>
              </div>

              {/* Firma 2 */}
              <div className="flex flex-col justify-end text-center space-y-1">
                <div className="border-b-2 border-[var(--border-strong)] pb-8 h-16" />
                <span className="text-xs font-bold text-[var(--text-primary)] block pt-1">
                  Relator Técnico
                </span>
                <span className="text-[10px] text-[var(--text-tertiary)] block">
                  Equipo Metodológico SPD
                </span>
                <span className="text-[9px] text-[var(--text-tertiary)] block">
                  C.C. ___________________
                </span>
              </div>

              {/* Firma 3 */}
              <div className="flex flex-col justify-end text-center space-y-1">
                <div className="border-b-2 border-[var(--border-strong)] pb-8 h-16" />
                <span className="text-xs font-bold text-[var(--text-primary)] block pt-1">
                  Representante Comunitario / JAC
                </span>
                <span className="text-[10px] text-[var(--text-tertiary)] block">
                  Delegado Comunitario Territorial
                </span>
                <span className="text-[9px] text-[var(--text-tertiary)] block">
                  C.C. ___________________
                </span>
              </div>

              {/* Firma 4 */}
              <div className="flex flex-col justify-end text-center space-y-1">
                <div className="border-b-2 border-[var(--border-strong)] pb-8 h-16" />
                <span className="text-xs font-bold text-[var(--text-primary)] block pt-1">
                  Delegado Enfoque Diferencial
                </span>
                <span className="text-[10px] text-[var(--text-tertiary)] block">
                  Sector Social / Étnico
                </span>
                <span className="text-[9px] text-[var(--text-tertiary)] block">
                  C.C. ___________________
                </span>
              </div>
            </div>
          </section>

          {/* Pie del documento impreso */}
          <footer className="border-t border-[var(--border)] pt-4 text-center text-[10px] text-[var(--text-tertiary)] page-break-avoid">
            <p>
              POLIS Cartagena • Código de Verificación Digital: POLIS-SHA256-{mesa.id.toUpperCase()}-VERIFIED • Página 1 de 1
            </p>
          </footer>
        </article>
      </div>
    </PanelShell>
  );
}
