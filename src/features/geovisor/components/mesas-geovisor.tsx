"use client";

import {useMemo, useState} from "react";
import {
  CalendarClock,
  MapPin,
  Upload,
  Users,
  ExternalLink,
  Sparkles
} from "lucide-react";
import {useQueryClient} from "@tanstack/react-query";
import {Button} from "@/shared/ui/button";
import {Checkbox} from "@/shared/ui/checkbox";
import {Input} from "@/shared/ui/input";
import {Label} from "@/shared/ui/label";
import {StatusBadge} from "@/shared/ui/status-badge";
import {usePanels} from "@/core/panels/panel-store";
import {useSesionStore, tienePermiso} from "@/features/sesion/state/session-store";
import {useMesasStore} from "@/features/mesas/state/mesas-store";
import {calcularTotalAsistentes} from "@/features/mesas/models/mesas";
import {TERRITORIOS_CARTAGENA} from "../data/territorios.data";
import {subirFotoMesa, type MesaGeovisor, type EstadoMesaGeovisor} from "../services/mesas-geovisor-api";
import {MesasDataGrid} from "./mesas-datagrid/mesas-datagrid";
import {MesasCardsView} from "./mesas-cards-view";
import type {ModoVistaMesas} from "./mesas-datagrid/datagrid-toolbar";

function fechaLocal(fecha: string | null): string {
  if (!fecha) return "Fecha no registrada";
  try {
    return new Intl.DateTimeFormat("es-CO", { dateStyle: "long" }).format(
      new Date(`${fecha}T12:00:00`)
    );
  } catch {
    return fecha;
  }
}

function estadoMesa(mesa: MesaGeovisor): { etiqueta: string; tono: "success" | "warning" } {
  return mesa.realizada
    ? { etiqueta: "Realizada", tono: "success" }
    : { etiqueta: "Programada", tono: "warning" };
}

function FormularioFotoMesa({ mesa }: { mesa: MesaGeovisor }) {
  const sesion = useSesionStore((state) => state.sesion);
  const queryClient = useQueryClient();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [autorizada, setAutorizada] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  if (!tienePermiso(sesion, "mesas:fotos:subir")) return null;

  async function enviar() {
    if (!archivo || !autorizada) return;
    setEnviando(true);
    setMensaje(null);
    try {
      await subirFotoMesa(mesa.id, archivo, autorizada);
      setArchivo(null);
      setAutorizada(false);
      setMensaje("Foto enviada; se mostrará cuando tenga aprobación institucional.");
      void queryClient.invalidateQueries({ queryKey: ["geovisor", "mesas"] });
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : "No se pudo enviar la foto.");
    } finally {
      setEnviando(false);
    }
  }

  const idArchivo = `foto-mesa-${mesa.id}`;
  const idAutorizacion = `autorizacion-foto-mesa-${mesa.id}`;

  return (
    <div className="mt-4 space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 p-3">
      <Label htmlFor={idArchivo}>Subir fotografía (JPEG, PNG o WebP)</Label>
      <Input
        id={idArchivo}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) => setArchivo(event.target.files?.[0] ?? null)}
      />
      <div className="flex items-start gap-2 text-xs leading-relaxed text-[var(--text-secondary)]">
        <Checkbox
          id={idAutorizacion}
          checked={autorizada}
          onCheckedChange={(checked) => setAutorizada(checked === true)}
        />
        <Label htmlFor={idAutorizacion} className="font-normal">
          Confirmo que tengo autorización para compartir esta imagen. Entiendo que la publicación
          requiere aprobación institucional.
        </Label>
      </div>
      <Button
        type="button"
        size="sm"
        disabled={!archivo || !autorizada || enviando}
        onClick={enviar}
      >
        <Upload aria-hidden="true" className="size-3.5" />
        {enviando ? "Enviando…" : "Enviar para revisión"}
      </Button>
      {mensaje && (
        <p role="status" className="text-xs text-[var(--text-secondary)]">
          {mensaje}
        </p>
      )}
    </div>
  );
}

function MesaDetalle({
  mesa,
  onCerrar,
  onAbrirPanelMesa,
}: {
  mesa: MesaGeovisor;
  onCerrar: () => void;
  onAbrirPanelMesa?: (mesaId: string) => void;
}) {
  const estado = estadoMesa(mesa);

  return (
    <article
      className="relative rounded-xl border border-[var(--ember)]/60 bg-[var(--surface-1)] p-5 shadow-sm"
      aria-label={`Detalle inspeccionado de ${mesa.nombre}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              Cód. {mesa.id.toUpperCase()}
            </span>
            <StatusBadge tone={estado.tono}>{estado.etiqueta}</StatusBadge>
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            {mesa.nombre}
          </h3>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-secondary)]">
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5 text-[var(--text-tertiary)]" />
              {mesa.territorio_nombre ?? "Territorio no registrado"}
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="size-3.5 text-[var(--text-tertiary)]" />
              {fechaLocal(mesa.fecha)}
              {mesa.horario ? ` (${mesa.horario})` : ""}
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <Users className="size-3.5 text-[var(--text-tertiary)]" />
              Asistencia: <strong>{mesa.total_asistentes.toLocaleString("es-CO")}</strong>
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onAbrirPanelMesa && (
            <Button
              variant="default"
              size="sm"
              type="button"
              onClick={() => onAbrirPanelMesa(mesa.id)}
              className="h-8 text-xs"
            >
              <ExternalLink className="size-3.5" />
              Ver acta viva y papelografo
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={onCerrar}
            className="h-8 text-xs text-[var(--text-secondary)]"
          >
            Cerrar ficha
          </Button>
        </div>
      </div>

      {mesa.tipo_ubicacion && (
        <p className="mt-3 text-xs text-[var(--text-tertiary)]">
          La marca cartográfica en el Geovisor corresponde al centroide territorial de referencia; no representa la ubicación física exacta del salón de reunión.
        </p>
      )}

      {mesa.fotos.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {mesa.fotos.map((foto) => (
            <figure key={foto.id} className="overflow-hidden rounded-lg border border-[var(--border)]">
              <img
                src={foto.archivo_url}
                alt={foto.descripcion}
                loading="lazy"
                className="aspect-[4/3] w-full object-cover"
              />
              <figcaption className="bg-[var(--surface-2)] p-1 text-center text-[10px] text-[var(--text-tertiary)]">
                {foto.descripcion || "Foto aprobada"}
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-xs italic text-[var(--text-tertiary)]">
          Esta mesa no tiene fotos aprobadas para publicación institucional todavía.
        </p>
      )}

      <FormularioFotoMesa mesa={mesa} />
    </article>
  );
}

export function MesasGeovisor({
  mesas,
  isLoading,
  isError,
  error,
  seleccionada,
  onSeleccionar,
  onLocalizarEnMapa,
}: {
  mesas: MesaGeovisor[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  seleccionada: string | null;
  onSeleccionar: (mesaId: string | null) => void;
  onLocalizarEnMapa?: (mesa: MesaGeovisor) => void;
}) {
  const { openPanel } = usePanels();
  const mesasStore = useMesasStore((s) => s.mesas);
  const [modoVista, setModoVista] = useState<ModoVistaMesas>("tabla");

  // Si el backend no tiene mesas persistidas, enriquecer con las 35 mesas de la agenda oficial
  const mesasEfectivas: MesaGeovisor[] = useMemo(() => {
    if (mesas && mesas.length > 0) return mesas;

    // Respaldo inteligente con las 35 mesas oficiales de POLIS
    return mesasStore.map((m) => {
      // Buscar coordenadas de referencia por territorio
      const t = TERRITORIOS_CARTAGENA.find(
        (ter) =>
          m.lugar.toLowerCase().includes(ter.nombre.toLowerCase()) ||
          m.nombre.toLowerCase().includes(ter.nombre.toLowerCase()) ||
          (m.tipoMesa === "territorial" && ter.id === "loc-1")
      ) ?? TERRITORIOS_CARTAGENA[0];

      const lat = m.coordenadas?.lat ?? t?.lat ?? 10.3997;
      const lng = m.coordenadas?.lng ?? t?.lon ?? -75.5144;
      const estadoGeovisor: EstadoMesaGeovisor =
        m.estado === "cerrada"
          ? "FINALIZADA"
          : m.estado === "en_curso"
          ? "EN_DELIBERACION"
          : "PROGRAMADA";

      return {
        id: m.id,
        nombre: m.nombre,
        fecha: m.fecha ?? null,
        horario: m.horario ?? "Por definir",
        estado: estadoGeovisor,
        realizada: m.estado === "cerrada" || m.estado === "en_curso",
        total_asistentes: calcularTotalAsistentes(m),
        territorio_id: t?.id ?? "loc-1",
        territorio_nombre: m.entidad || t?.nombre || "Cartagena de Indias",
        territorio_codigo: t?.codigo ?? "LOC-1",
        longitud_referencia: lng,
        latitud_referencia: lat,
        tipo_ubicacion: "centroide_territorial_referencia",
        fotos: [],
      };
    });
  }, [mesas, mesasStore]);

  const actual = useMemo(
    () => mesasEfectivas.find((mesa) => mesa.id === seleccionada) ?? null,
    [mesasEfectivas, seleccionada]
  );

  const handleAbrirPanelMesa = (mesaId: string) => {
    openPanel("mesa", { mesaId });
  };

  return (
    <section
      aria-labelledby="mesas-geovisor-heading"
      className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-sm md:p-5"
    >
      {/* Encabezado de la sección con métricas rápidas */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
              Participación deliberativa · Analítica Territorial
            </p>
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-medium text-[var(--ember)]">
              <Sparkles className="size-2.5" /> DataGrid Pro
            </span>
          </div>
          <h2
            id="mesas-geovisor-heading"
            className="text-lg font-semibold text-[var(--text-primary)]"
          >
            Mesas de Trabajo Territorial ({mesasEfectivas.length})
          </h2>
          <p className="mt-1 max-w-3xl text-xs text-[var(--text-secondary)]">
            Explora las mesas de concertación ciudadana con ordenamiento multi-columna, búsqueda en tiempo real, filtros facetados, exportación a CSV y visualización en mapa SIG.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone="success">
            {mesasEfectivas.filter((m) => m.realizada).length} Realizadas
          </StatusBadge>
          <StatusBadge tone="warning">
            {mesasEfectivas.filter((m) => !m.realizada).length} Programadas
          </StatusBadge>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 py-6 text-sm text-[var(--text-secondary)]">
          <div className="size-4 animate-spin rounded-full border-2 border-[var(--ember)] border-t-transparent" />
          <span>Cargando mesas del geovisor…</span>
        </div>
      )}

      {isError && (
        <p role="alert" className="text-sm text-[var(--danger)]">
          No se pudieron cargar las mesas desde el backend. Mostrando datos de respaldo de la agenda. {error instanceof Error ? error.message : ""}
        </p>
      )}

      {/* Renderizado de la vista seleccionada (DataGrid o Tarjetas) */}
      {modoVista === "tabla" ? (
        <MesasDataGrid
          mesas={mesasEfectivas}
          seleccionada={seleccionada}
          onSeleccionar={onSeleccionar}
          onAbrirPanelMesa={handleAbrirPanelMesa}
          onLocalizarEnMapa={onLocalizarEnMapa}
          modoVista={modoVista}
          onModoVistaChange={setModoVista}
        />
      ) : (
        <MesasCardsView
          mesas={mesasEfectivas}
          seleccionada={seleccionada}
          onSeleccionar={onSeleccionar}
          onAbrirPanelMesa={handleAbrirPanelMesa}
          onLocalizarEnMapa={onLocalizarEnMapa}
          modoVista={modoVista}
          onModoVistaChange={setModoVista}
        />
      )}

      {/* Ficha inspeccionada de la mesa seleccionada */}
      {actual && (
        <MesaDetalle
          mesa={actual}
          onCerrar={() => onSeleccionar(null)}
          onAbrirPanelMesa={handleAbrirPanelMesa}
        />
      )}
    </section>
  );
}
