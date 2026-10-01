"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, MapPinned, Search, Users } from "lucide-react";
import { usePanels } from "@/core/panels/panel-store";
import { useNavigationStore } from "@/core/navigation/navigation-store";
import { PanelShell } from "@/core/panels/panel-shell";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Notice } from "@/shared/ui/notice";
import { Progress } from "@/shared/ui/progress";
import { StatusBadge } from "@/shared/ui/status-badge";
import { BARRIOS_POR_LOCALIDAD } from "../data/barrios.data";
import { ESTADISTICAS_SEGURIDAD_2025 } from "../data/estadisticas.data";
import { obtenerTerritorio } from "../data/territorios.data";

interface TerritorioPanelProps {
  entryKey: string;
  props: { territorioId: string };
}

const numeros = new Intl.NumberFormat("es-CO");

function normalizarBusqueda(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .trim();
}

export function TerritorioPanel({ entryKey, props }: TerritorioPanelProps) {
  const { closeTop, closeToKey } = usePanels();
  const setVista = useNavigationStore((state) => state.setVista);
  const [busquedaBarrio, setBusquedaBarrio] = useState("");
  const [barrioSeleccionado, setBarrioSeleccionado] = useState<string | null>(null);
  const territorio = obtenerTerritorio(props.territorioId);
  const barrios = territorio ? BARRIOS_POR_LOCALIDAD[territorio.localidadId] : [];
  const localidades = ESTADISTICAS_SEGURIDAD_2025.por_localidad;
  const cifrasLocalidad = territorio ? localidades[territorio.localidadId as keyof typeof localidades] : undefined;
  const barriosFiltrados = useMemo(() => {
    const term = normalizarBusqueda(busquedaBarrio);
    if (!term) return barrios;
    return barrios.filter((barrio) => normalizarBusqueda(barrio.barrio).includes(term));
  }, [barrios, busquedaBarrio]);
  const barrioDetalle = barrios.find((barrio) => barrio.barrio === barrioSeleccionado);

  if (!territorio) {
    return (
      <PanelShell
        entryKey={entryKey}
        title="Territorio no encontrado"
        crumbs={[{ label: "Geovisor" }]}
        onClose={closeTop}
        onCloseToKey={closeToKey}
      >
        <div className="p-6 text-sm text-text-secondary" role="status">
          No encontramos ese territorio en los datos disponibles.
        </div>
      </PanelShell>
    );
  }

  const indicadorTone =
    territorio.indicadorSeguridad < 50
      ? "danger"
      : territorio.indicadorSeguridad < 70
        ? "warning"
        : "success";
  const tipoLabel =
    territorio.tipo === "localidad"
      ? "Localidad"
      : territorio.tipo === "isla"
        ? "Isla"
        : "Corregimiento";
  const nombreLocalidad =
    territorio.tipo === "localidad"
      ? territorio.nombre.split(" — ")[0]
      : `Localidad ${territorio.localidadId.slice(-1)}`;

  return (
    <PanelShell
      entryKey={entryKey}
      title={territorio.nombre}
      crumbs={[{ label: "Geovisor" }, { label: tipoLabel }]}
      onClose={closeTop}
      onCloseToKey={closeToKey}
      footer={
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <a href="https://cartagenacomovamos.org" target="_blank" rel="noreferrer">
              Fuente: Cartagena Cómo Vamos
              <ArrowUpRight aria-hidden="true" />
            </a>
          </Button>
          <Button
            variant="ember"
            onClick={() => {
              setVista("explorar");
              closeTop();
            }}            >
              Explorar aportes
            </Button>
        </div>
      }
    >
      <div className="space-y-6 p-5 sm:p-6">
        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone="info">{tipoLabel}</StatusBadge>
            <StatusBadge>{territorio.codigo}</StatusBadge>
          </div>
          <p className="text-sm leading-relaxed text-text-secondary">
            {territorio.descripcion}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Población de referencia" value={`${numeros.format(territorio.poblacion)} hab.`} />
            <Metric label="Aportes ciudadanos" value={numeros.format(territorio.aportesCiudadanos)} />
            <Metric label="Mesas realizadas" value={numeros.format(territorio.mesasRealizadas)} />
            <Metric label="Alertas activas" value={numeros.format(territorio.alertasActivas)} />
          </div>
        </section>

        <section className="space-y-3 rounded-xl border border-border bg-surface-1 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">
                Indicador compuesto de referencia
              </h3>
              <p className="mt-1 text-xs text-text-secondary">
                Escala interna 0–100; no es una estadística oficial publicada.
              </p>
            </div>
            <span className="text-lg font-semibold tabular text-text-primary">
              {territorio.indicadorSeguridad}/100
            </span>
          </div>
          <Progress
            value={territorio.indicadorSeguridad}
            aria-label={`Indicador compuesto de referencia: ${territorio.indicadorSeguridad} de 100`}
            className="h-2.5"
            indicatorClassName={
              indicadorTone === "danger"
                ? "bg-danger"
                : indicadorTone === "warning"
                  ? "bg-warning"
                  : "bg-success"
            }
          />
          <p className="text-xs text-text-secondary">
            {territorio.indicadorSeguridad < 50
              ? "Nivel de referencia bajo"
              : territorio.indicadorSeguridad < 70
                ? "Nivel de referencia intermedio"
                : "Nivel de referencia alto"}
          </p>
        </section>

        <section className="space-y-3">
          <div>
            <h3 className="text-base font-semibold text-text-primary">
              Datos de Criminalidad 2025
            </h3>
            <p className="mt-1 text-xs text-text-secondary">
              {ESTADISTICAS_SEGURIDAD_2025.periodo} · agregado para {nombreLocalidad}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Metric
              label="Homicidios · Cartagena"
              value={numeros.format(ESTADISTICAS_SEGURIDAD_2025.homicidios_total)}
            />
            <Metric
              label="Hurtos a personas · Cartagena"
              value={numeros.format(ESTADISTICAS_SEGURIDAD_2025.hurtos_personas)}
            />
          </div>
          {cifrasLocalidad && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-text-primary">Agregado de {nombreLocalidad}</h4>
              <div className="grid grid-cols-2 gap-3">
                <Metric label="Homicidios registrados" value={numeros.format(cifrasLocalidad.homicidios)} />
                <Metric label="Hurtos a personas" value={numeros.format(cifrasLocalidad.hurtos)} />
              </div>
            </div>
          )}
          <p className="text-xs text-text-secondary">
            Fuente: {ESTADISTICAS_SEGURIDAD_2025.fuente}. Datos actualizados a septiembre de 2025.
          </p>
          <Notice tone="warning" title="Alcance de las cifras">
            Datos estáticos preprocesados para el período indicado; el reparto local no es una geocodificación por barrio ni representa cifras en tiempo real.
          </Notice>
          <Notice tone="info" title="Percepción ciudadana de seguridad">
            No se incluye una cifra de percepción: el insumo disponible no aporta una serie y metodología verificables.
          </Notice>
        </section>

        <section className="space-y-3 border-t border-border pt-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-text-primary">Barrios de {nombreLocalidad}</h3>
              <p className="mt-1 text-xs text-text-secondary">
                Catálogo oficial: {barrios.length} barrios · {territorio.localidadId === "loc-1" ? "LH" : territorio.localidadId === "loc-2" ? "LV" : "LI"}
              </p>
            </div>
            <Users aria-hidden="true" className="size-5 text-text-tertiary" />
          </div>
          <Label htmlFor={`buscar-barrio-panel-${territorio.id}`} className="sr-only">
            Filtrar barrios de {nombreLocalidad}
          </Label>
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-tertiary" />
            <Input
              id={`buscar-barrio-panel-${territorio.id}`}
              value={busquedaBarrio}
              onChange={(event) => setBusquedaBarrio(event.target.value)}
              placeholder="Filtrar barrios"
              className="pl-9"
            />
          </div>
          <ul className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-border p-1">
            {barriosFiltrados.map((barrio) => (
              <li key={`${barrio.localidadId}-${barrio.barrio}`}>
                <Button
                  variant="unstyled"
                  size="unstyled"
                  aria-pressed={barrioSeleccionado === barrio.barrio}
                  onClick={() => setBarrioSeleccionado(barrio.barrio)}
                  className="flex min-h-10 w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm text-text-primary hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <span>{barrio.barrio}</span>
                  <span className="shrink-0 text-xs text-text-tertiary">
                    UCG {barrio.ucg ?? "—"} · Estrato {barrio.estrato}
                  </span>
                </Button>
              </li>
            ))}
            {barriosFiltrados.length === 0 && (
              <li className="p-3 text-sm text-text-secondary">No hay barrios que coincidan con la búsqueda.</li>
            )}
          </ul>
          {barrioDetalle && (
            <div className="rounded-lg border border-border bg-surface-2 p-3 text-sm" role="status">
              <p className="font-medium text-text-primary">{barrioDetalle.barrio}</p>
              <p className="mt-1 text-text-secondary">
                UCG {barrioDetalle.ucg ?? "No especificada"} · Estrato {barrioDetalle.estrato}
              </p>
              <p className="mt-1 text-xs text-text-tertiary">
                El catálogo no incluye coordenadas ni polígono para ubicar este barrio en el mapa.
              </p>
            </div>
          )}
        </section>

        <p className="flex items-center gap-2 text-xs text-text-tertiary">
          <MapPinned aria-hidden="true" className="size-4" />
          La localización en el mapa identifica el territorio de referencia; los barrios se consultan en el catálogo oficial.
        </p>
      </div>
    </PanelShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-surface-1 p-3">
      <span className="block text-xs leading-relaxed text-text-secondary">{label}</span>
      <span className="mt-1 block break-words font-medium tabular text-text-primary">{value}</span>
    </div>
  );
}
