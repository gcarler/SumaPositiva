"use client";

import "ol/ol.css";
import {useCallback, useMemo, useState, useImperativeHandle, forwardRef} from "react";
import {MapPin, Search, Plus, Minus, Compass, Loader2, ShieldAlert} from "lucide-react";
import {Button} from "@/shared/ui/button";
import {Input} from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/shared/ui/select";
import {Label} from "@/shared/ui/label";
import {BARRIOS_CARTAGENA, BARRIOS_POR_LOCALIDAD} from "../data/barrios.data";
import type {Barrio} from "../data/barrios.data";
import {
  TERRITORIOS_CARTAGENA
} from "../data/territorios.data";

import {useMapa, type HoverInfo} from "../hooks/use-mapa";
import type {VariableMapa} from "../data/estadisticas.data";
import {ESTADISTICAS_TERRITORIOS} from "../data/estadisticas.data";
import type {CapasConfig} from "./geovisor-controles";
import type {MesaGeovisor} from "../services/mesas-geovisor-api";
import {usePanels} from "@/core/panels/panel-store";
import {useGeovisorLayoutStore} from "../state/geovisor-layout-store";

export interface MapaCartagenaHandle {
  exportarPng: () => void;
  volarACoordenadas?: (lon: number, lat: number, zoom?: number) => void;
  centrarCartagena?: () => void;
}

interface MapaCartagenaProps {
  onSelectTerritorio: (territorioId: string) => void;
  selectedTerritorioId?: string;
  barrioSeleccionado?: string | null;
  onSelectBarrio?: (barrio: string) => void;
  variableMapa?: VariableMapa;
  capasVisibles?: CapasConfig;
  mesas?: MesaGeovisor[];
  mesaSeleccionadaId?: string | null;
  onSelectMesa?: (mesaId: string) => void;
  anioHurto?: number | null;
  delitoHurto?: string | null;
  onSelectHurto?: (poligonoId: number) => void;
  capaPersonalizada?: { geojson: unknown; nombre?: string; color?: string } | null;
}

const LOCALIDADES = [
  { id: "loc-1", nombre: "Localidad 1" },
  { id: "loc-2", nombre: "Localidad 2" },
  { id: "loc-3", nombre: "Localidad 3" },
] as const;

function normalizarBusqueda(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .trim();
}

const MapaCartagena = forwardRef<MapaCartagenaHandle, MapaCartagenaProps>(function MapaCartagena(
  {
    onSelectTerritorio,
    selectedTerritorioId = "todas",
    barrioSeleccionado = null,
    onSelectBarrio,
    variableMapa = "ish",
    capasVisibles = {
      localidades: true,
      corregimientos: true,
      barrios: true,
      puntos: true,
      etiquetas: true,
    },
    mesas = [],
    mesaSeleccionadaId = null,
    onSelectMesa,
    anioHurto = null,
    delitoHurto = null,
    onSelectHurto,
    capaPersonalizada = null,
  },
  ref,
) {
  const { openPanel } = usePanels();
  const [contenedor, setContenedor] = useState<HTMLDivElement | null>(null);
  const establecerContenedor = useCallback((node: HTMLDivElement | null) => {
    setContenedor(node);
  }, []);

  const [busqueda, setBusqueda] = useState("");
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const [localidadInterna, setLocalidadInterna] = useState<string>(selectedTerritorioId || "todas");

  const localidadActiva =
    selectedTerritorioId && selectedTerritorioId !== "todas"
      ? selectedTerritorioId
      : localidadInterna;

  const handleCambioLocalidad = (val: string) => {
    setLocalidadInterna(val);
    onSelectTerritorio(val);
  };

  const { cargando, zoomIn, zoomOut, centrarCartagena, exportarPng, volarACoordenadas } = useMapa({
    target: contenedor,
    onSelectTerritorio,
    onSelectBarrio,
    onHoverInfo: setHoverInfo,
    localidadId: localidadActiva,
    barrioSeleccionado,
    variableMapa,
    capasVisibles,
    mesas,
    mesaSeleccionadaId,
    onSelectMesa,
    anioHurto,
    delitoHurto,
    onSelectHurto,
    capaPersonalizada,
  });

  useImperativeHandle(ref, () => ({
    exportarPng,
    volarACoordenadas,
    centrarCartagena,
  }), [exportarPng, volarACoordenadas, centrarCartagena]);

  const termBusqueda = normalizarBusqueda(busqueda);
  const barriosFiltrados = useMemo(() => {
    if (termBusqueda.length < 2) return [];
    return BARRIOS_CARTAGENA.filter((barrio) => {
      const coincideLocalidad =
        localidadActiva === "todas" || barrio.localidadId === localidadActiva;
      return coincideLocalidad && normalizarBusqueda(barrio.barrio).includes(termBusqueda);
    }).slice(0, 8);
  }, [termBusqueda, localidadActiva]);

  const territoriosCoincidentes = useMemo(() => {
    if (termBusqueda.length < 2) return [];
    return TERRITORIOS_CARTAGENA.filter((territorio) => {
      const coincideLocalidad =
        localidadActiva === "todas" || territorio.localidadId === localidadActiva;
      return coincideLocalidad && normalizarBusqueda(territorio.nombre).includes(termBusqueda);
    }).slice(0, 5);
  }, [termBusqueda, localidadActiva]);

  const territoriosVisibles = TERRITORIOS_CARTAGENA.filter(
    (territorio) => localidadActiva === "todas" || territorio.localidadId === localidadActiva,
  );

  const seleccionarBarrio = (barrio: Barrio) => {
    const territorio = TERRITORIOS_CARTAGENA.find(
      (item) => item.tipo === "localidad" && item.localidadId === barrio.localidadId,
    );
    setBusqueda(barrio.barrio);
    setLocalidadInterna(barrio.localidadId);
    if (onSelectBarrio) onSelectBarrio(barrio.barrio);
    if (!territorio) return;
    onSelectTerritorio(territorio.id);
  };

  return (
    <div className="relative flex h-full min-h-[36rem] w-full flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] shadow-sm">
      {/* Panel Flotante de Búsqueda y Filtro Rápido */}
      <div
        role="search"
        aria-label="Buscar territorio o barrio"
        className="absolute left-3 right-3 top-3 z-10 grid gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)]/95 p-3 shadow-raised backdrop-blur sm:left-4 sm:right-auto sm:w-[min(26rem,calc(100%-2rem))]"
      >
        <div className="relative">
          <Label htmlFor="buscar-barrio-geovisor" className="sr-only">
            Buscar territorio o barrio
          </Label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-tertiary)]"
          />
          <Input
            id="buscar-barrio-geovisor"
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            placeholder="Busca un territorio o barrio (ej. Boquilla)"
            autoComplete="off"
            className="pl-9 h-9 text-xs"
          />
          {termBusqueda.length >= 2 && (
            <ul
              aria-label="Resultados de búsqueda"
              className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-1 shadow-raised"
            >
              {territoriosCoincidentes.map((territorio) => (
                <li key={territorio.id}>
                  <Button
                    variant="unstyled"
                    size="unstyled"
                    className="flex w-full items-start rounded-md px-3 py-2 text-left hover:bg-[var(--surface-2)]"
                    onClick={() => {
                      setBusqueda(territorio.nombre);
                      onSelectTerritorio(territorio.id);
                    }}
                  >
                    <span className="text-xs font-medium text-[var(--text-primary)]">
                      {territorio.nombre}
                    </span>
                  </Button>
                </li>
              ))}
              {barriosFiltrados.map((barrio) => (
                <li key={`${barrio.localidadId}-${barrio.barrio}`}>
                  <Button
                    variant="unstyled"
                    size="unstyled"
                    className="flex w-full items-start justify-between gap-3 rounded-md px-3 py-2 text-left hover:bg-[var(--surface-2)]"
                    onClick={() => seleccionarBarrio(barrio)}
                  >
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-[var(--text-primary)]">
                        {barrio.barrio}
                      </span>
                      <span className="block text-[11px] text-[var(--text-secondary)]">
                        {LOCALIDADES.find((l) => l.id === barrio.localidadId)?.nombre}
                        {barrio.ucg ? ` · UCG ${barrio.ucg}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--text-tertiary)]">
                      {barrio.estratoNum ? `Estrato ${barrio.estratoNum}` : barrio.estrato}
                    </span>
                  </Button>
                </li>
              ))}
              {barriosFiltrados.length === 0 && territoriosCoincidentes.length === 0 && (
                <li className="p-3 text-xs text-[var(--text-secondary)]">
                  No hay coincidencias en el catálogo de barrios o territorios.
                </li>
              )}
            </ul>
          )}
        </div>

        <div>
          <Label htmlFor="filtro-localidad-geovisor" className="mb-1 block text-[11px] font-medium text-[var(--text-secondary)]">
            Filtrar por localidad
          </Label>
          <Select value={localidadActiva} onValueChange={handleCambioLocalidad}>
            <SelectTrigger id="filtro-localidad-geovisor" className="w-full h-8 text-xs" aria-label="Filtrar por localidad">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las localidades (205 barrios)</SelectItem>
              {LOCALIDADES.map((localidad) => (
                <SelectItem key={localidad.id} value={localidad.id}>
                  {localidad.nombre} ({BARRIOS_POR_LOCALIDAD[localidad.id].length} barrios)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Badge Estado SIG en Esquina Superior Derecha */}
      <div className="absolute right-4 top-4 z-20 flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)]/90 px-3 py-1.5 shadow-sm backdrop-blur">
        {cargando ? (
          <>
            <Loader2 className="size-3.5 animate-spin text-[var(--ember)]" />
            <span className="text-[11px] font-medium text-[var(--text-secondary)]">
              Cargando SIG…
            </span>
          </>
        ) : (
          <>
            <span className="size-2 rounded-full bg-[var(--success)]" />
            <span className="text-[11px] font-medium text-[var(--text-secondary)]">
              Choropleth Activo
            </span>
          </>
        )}
      </div>

      {/* Botonera de Control de Navegación del Mapa */}
      <div className="absolute bottom-28 right-4 z-20 flex flex-col gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)]/95 p-1 shadow-raised backdrop-blur">
        <Button
          variant="unstyled"
          size="unstyled"
          onClick={zoomIn}
          className="flex size-8 items-center justify-center rounded-lg text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
          aria-label="Acercar mapa"
        >
          <Plus className="size-4" />
        </Button>
        <Button
          variant="unstyled"
          size="unstyled"
          onClick={zoomOut}
          className="flex size-8 items-center justify-center rounded-lg text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
          aria-label="Alejar mapa"
        >
          <Minus className="size-4" />
        </Button>
        <div className="my-0.5 h-px bg-[var(--border)]" />
        <Button
          variant="unstyled"
          size="unstyled"
          onClick={centrarCartagena}
          className="flex size-8 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--ember)] transition-colors"
          aria-label="Centrar vista en Cartagena"
        >
          <Compass className="size-4" />
        </Button>
      </div>

      {/* Lienzo OpenLayers */}
      <div
        ref={establecerContenedor}
        className="min-h-[32rem] flex-1 w-full"
        role="application"
        aria-label="Mapa interactivo de Cartagena de Indias; busca territorios o usa la lista accesible de puntos"
      />

      {/* T2: Tarjeta Flotante Interactiva de Detalle en Hover (Tableau Tooltip) */}
      {hoverInfo && (
        <div
          style={{
            left: Math.min(Math.max(hoverInfo.pixel[0] + 16, 16), (contenedor?.clientWidth ?? 600) - 300),
            top: Math.min(Math.max(hoverInfo.pixel[1] - 120, 16), (contenedor?.clientHeight ?? 500) - 230),
          }}
          className="pointer-events-auto absolute z-30 w-72 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-1)]/95 p-3.5 shadow-panel backdrop-blur transition-all duration-75 animate-in fade-in zoom-in-95"
        >
          {hoverInfo.tipo === "mesa" ? (
            <div className="space-y-2 text-xs">
              {/* Semáforo badge */}
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Mesa de Trabajo
                </span>
                {(() => {
                  const est = hoverInfo.mesaDetalle?.estado?.toUpperCase();
                  const realizada =
                    hoverInfo.mesaDetalle?.realizada === true ||
                    est === "FINALIZADA" ||
                    est === "ACTA_CONCERTADA" ||
                    est === "REALIZADA";
                  const enCurso = est === "EN_DELIBERACION" || est === "EN_CURSO";

                  if (realizada) {
                    return (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--success)]/15 px-2 py-0.5 text-[10px] font-bold text-[var(--success)]">
                        🟢 Realizada / Cerrada
                      </span>
                    );
                  }
                  if (enCurso) {
                    return (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--info)]/15 px-2 py-0.5 text-[10px] font-bold text-[var(--info)]">
                        🔵 En curso
                      </span>
                    );
                  }
                  return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ember)]/15 px-2 py-0.5 text-[10px] font-bold text-[var(--ember)]">
                      🟡 Programada
                    </span>
                  );
                })()}
              </div>

              {/* Nombre de la mesa */}
              <p className="font-bold text-xs text-[var(--text-primary)] leading-snug">
                {hoverInfo.nombre}
              </p>

              {/* Territorio */}
              {hoverInfo.mesaDetalle?.territorio && (
                <p className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1">
                  <MapPin className="size-3 text-[var(--text-tertiary)] shrink-0" />
                  <span className="truncate">{hoverInfo.mesaDetalle.territorio}</span>
                </p>
              )}

              {/* Fecha y horario */}
              <div className="flex items-center justify-between text-[11px] border-t border-[var(--border)] pt-1.5 text-[var(--text-secondary)]">
                <span>{hoverInfo.mesaDetalle?.fecha || "2026-10-15"}</span>
                <span className="font-medium text-[var(--text-primary)]">
                  {hoverInfo.mesaDetalle?.horario || "08:30 – 12:00"}
                </span>
              </div>

              {/* Asistentes y aforo */}
              <div className="flex items-center justify-between text-[11px] border-t border-[var(--border)] pt-1.5">
                <span>
                  Asistentes:{" "}
                  <strong className="text-[var(--text-primary)] font-mono">
                    {hoverInfo.mesaDetalle?.asistentes ?? 0}
                  </strong>
                </span>
                <span>
                  Aforo:{" "}
                  <strong className="text-[var(--text-secondary)] font-mono">
                    {hoverInfo.mesaDetalle?.aforo ?? 80}
                  </strong>
                </span>
              </div>

              {/* Botón Ver Detalle / Acta */}
              <div className="border-t border-[var(--border)] pt-2">
                <Button
                  variant="ember"
                  size="sm"
                  className="w-full text-xs font-semibold h-7 shadow-sm"
                  onClick={() => openPanel("mesa", { mesaId: hoverInfo.id })}
                >
                  Ver Detalle / Acta →
                </Button>
              </div>
            </div>
          ) : hoverInfo.tipo === "hurto" ? (
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--danger)] flex items-center gap-1">
                  <ShieldAlert className="size-3" />
                  Hurtos SIEDCO
                </span>
                <span className="rounded-full bg-[var(--danger)]/15 px-2 py-0.5 text-[10px] font-bold text-[var(--danger)]">
                  {hoverInfo.hurtoDetalle?.zona}
                </span>
              </div>

              <div>
                <p className="font-bold text-xs text-[var(--text-primary)]">
                  {hoverInfo.nombre}
                </p>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  {hoverInfo.hurtoDetalle?.delito_etiqueta} • {hoverInfo.hurtoDetalle?.anio_etiqueta}
                </p>
              </div>

              <div className="rounded-lg bg-[var(--surface-2)] p-2 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-[var(--text-tertiary)]">Total Casos:</span>
                  <strong className="text-[var(--text-primary)] font-mono">
                    {(hoverInfo.hurtoDetalle?.total_casos ?? 0).toLocaleString("es-CO")} ({hoverInfo.hurtoDetalle?.porcentaje_total}%)
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-tertiary)]">Densidad Espacial:</span>
                  <strong className="text-[var(--text-primary)] font-mono">
                    {hoverInfo.hurtoDetalle?.densidad_casos_km2.toFixed(1)} casos/km²
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-tertiary)]">Área Polígono:</span>
                  <span className="text-[var(--text-secondary)]">
                    {hoverInfo.hurtoDetalle?.area_km2.toFixed(1)} km²
                  </span>
                </div>
              </div>

              {hoverInfo.hurtoDetalle?.top_armas && hoverInfo.hurtoDetalle.top_armas.length > 0 && (
                <div className="border-t border-[var(--border)] pt-1.5 text-[11px]">
                  <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase">Top Modalidad / Arma:</span>
                  <p className="truncate font-medium text-[var(--text-primary)]">
                    1. {hoverInfo.hurtoDetalle.top_armas[0].arma} ({hoverInfo.hurtoDetalle.top_armas[0].porcentaje}%)
                  </p>
                </div>
              )}

              {hoverInfo.hurtoDetalle?.top_sitios && hoverInfo.hurtoDetalle.top_sitios.length > 0 && (
                <div className="text-[11px]">
                  <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase">Top Clase de Sitio:</span>
                  <p className="truncate font-medium text-[var(--text-primary)]">
                    1. {hoverInfo.hurtoDetalle.top_sitios[0].sitio} ({hoverInfo.hurtoDetalle.top_sitios[0].porcentaje}%)
                  </p>
                </div>
              )}

              <div className="border-t border-[var(--border)] pt-2">
                <Button
                  variant="ember"
                  size="sm"
                  className="w-full text-xs font-semibold h-7 shadow-sm"
                  onClick={() => {
                    useGeovisorLayoutStore.getState().openView("hurtos");
                  }}
                >
                  Ver Tablero de Hurtos →
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5 border-b border-[var(--border)] pb-2 mb-2">
                <span className="text-xs">📍</span>
                <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                  {hoverInfo.nombre}
                </span>
              </div>

              {hoverInfo.ish !== undefined ? (
                <div className="space-y-1.5 text-xs text-[var(--text-secondary)]">
                  {/* ISH con barra de progreso */}
                  <div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-[11px] text-[var(--text-tertiary)]">ISH:</span>
                      <span className="font-bold tabular text-[var(--text-primary)]">
                        {hoverInfo.ish}/100{" "}
                        <span
                          className={`text-[10px] font-semibold ${
                            hoverInfo.ish >= 70
                              ? "text-[var(--success)]"
                              : hoverInfo.ish >= 50
                                ? "text-[var(--warning)]"
                                : "text-[var(--danger)]"
                          }`}
                        >
                          {hoverInfo.ish >= 70
                            ? "Favorable"
                            : hoverInfo.ish >= 50
                              ? "Moderado"
                              : "Crítico"}
                        </span>
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-[var(--surface-2)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--ember)]"
                        style={{ width: `${hoverInfo.ish}%` }}
                      />
                    </div>
                  </div>

                  {/* Aportes y Alertas */}
                  <div className="flex justify-between text-[11px] pt-1">
                    <span>
                      Aportes:{" "}
                      <strong className="text-[var(--text-primary)]">
                        {hoverInfo.aportes?.toLocaleString("es-CO")}
                      </strong>
                    </span>
                    <span>
                      Alertas:{" "}
                      <strong className="text-[var(--warning)]">{hoverInfo.alertas}</strong>
                    </span>
                  </div>

                  {/* Homicidios */}
                  {hoverInfo.homicidios !== undefined && (
                    <div className="flex justify-between text-[11px]">
                      <span>Homicidios (2025):</span>
                      <strong className="text-[var(--text-primary)]">
                        {hoverInfo.homicidios}
                      </strong>
                    </div>
                  )}

                  <p className="border-t border-[var(--border)] pt-1.5 text-[10px] font-medium text-[var(--ember)]">
                    Clic para detalle →
                  </p>
                </div>
              ) : (
                <p className="text-xs text-[var(--text-tertiary)]">
                  Barrio de Cartagena de Indias.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Lista Accesible de Botones Territoriales para Navegación por Teclado */}
      <div className="flex max-h-36 shrink-0 flex-wrap gap-2 overflow-y-auto border-t border-[var(--border)] bg-[var(--surface-1)] p-3">
        {territoriosVisibles.map((territorio) => (
          <Button
            key={territorio.id}
            variant={selectedTerritorioId === territorio.id ? "ember" : "outline"}
            size="sm"
            aria-pressed={selectedTerritorioId === territorio.id}
            aria-label={`Abrir ficha territorial: ${territorio.nombre}`}
            onClick={() => onSelectTerritorio(territorio.id)}
          >
            <MapPin aria-hidden="true" />
            {territorio.nombre}
          </Button>
        ))}
        <p className="basis-full text-xs text-[var(--text-tertiary)]">
          Puntos de referencia territorial; el catálogo de barrios informa localidad, UCG y estrato, no coordenadas ni polígonos barriales.
        </p>
      </div>

      {/* T7: Tabla oculta de datos para lectores de pantalla (Accesibilidad A11y) */}
      <table className="sr-only">
        <caption>Resumen estadístico territorial de Cartagena de Indias</caption>
        <thead>
          <tr>
            <th scope="col">Territorio</th>
            <th scope="col">ISH</th>
            <th scope="col">Población</th>
            <th scope="col">Aportes Ciudadanos</th>
            <th scope="col">Alertas SAT</th>
          </tr>
        </thead>
        <tbody>
          {ESTADISTICAS_TERRITORIOS.map((t) => (
            <tr key={t.id}>
              <td>{t.nombre}</td>
              <td>{t.ish}</td>
              <td>{t.poblacion}</td>
              <td>{t.aportesCiudadanos}</td>
              <td>{t.alertas}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

export default MapaCartagena;
