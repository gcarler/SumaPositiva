"use client";

import "ol/ol.css";
import { useCallback, useMemo, useState } from "react";
import { MapPin, Search } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Label } from "@/shared/ui/label";
import { BARRIOS_CARTAGENA, BARRIOS_POR_LOCALIDAD } from "../data/barrios.data";
import type { Barrio } from "../data/barrios.data";
import {
  LEYENDA_TERRITORIAL,
  TERRITORIOS_CARTAGENA,
} from "../data/territorios.data";
import type { Territorio } from "../data/territorios.data";
import { useMapa } from "../hooks/use-mapa";

interface MapaCartagenaProps {
  onSelectTerritorio: (territorioId: string) => void;
  selectedTerritorioId?: string;
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

export default function MapaCartagena({
  onSelectTerritorio,
  selectedTerritorioId,
}: MapaCartagenaProps) {
  const [contenedor, setContenedor] = useState<HTMLDivElement | null>(null);
  const establecerContenedor = useCallback((node: HTMLDivElement | null) => {
    setContenedor(node);
  }, []);
  const [busqueda, setBusqueda] = useState("");
  const [localidadId, setLocalidadId] = useState<string>("todas");
  const [territorioHover, setTerritorioHover] = useState<string | null>(null);

  const [mostrarLocalidades, setMostrarLocalidades] = useState(true);
  const [mostrarCorregimientos, setMostrarCorregimientos] = useState(true);
  const [mostrarBarrios, setMostrarBarrios] = useState(true);
  const [barrioEnfocado, setBarrioEnfocado] = useState<string | null>(null);

  const seleccionar = useCallback(
    (territorioId: string) => onSelectTerritorio(territorioId),
    [onSelectTerritorio],
  );
  const actualizarHover = useCallback((territorioId: string | null) => {
    setTerritorioHover(territorioId);
  }, []);
  useMapa({
    target: contenedor,
    onSelectTerritorio: seleccionar,
    onHoverTerritorio: actualizarHover,
    localidadId,
    mostrarLocalidades,
    mostrarCorregimientos,
    mostrarBarrios,
    barrioSeleccionado: barrioEnfocado,
  });

  const termBusqueda = normalizarBusqueda(busqueda);
  const barriosFiltrados = useMemo(() => {
    if (termBusqueda.length < 2) return [];
    return BARRIOS_CARTAGENA.filter((barrio) => {
      const coincideLocalidad = localidadId === "todas" || barrio.localidadId === localidadId;
      return coincideLocalidad && normalizarBusqueda(barrio.barrio).includes(termBusqueda);
    }).slice(0, 8);
  }, [termBusqueda, localidadId]);
  const territoriosCoincidentes = useMemo(() => {
    if (termBusqueda.length < 2) return [];
    return TERRITORIOS_CARTAGENA.filter((territorio) => {
      const coincideLocalidad = localidadId === "todas" || territorio.localidadId === localidadId;
      return coincideLocalidad && normalizarBusqueda(territorio.nombre).includes(termBusqueda);
    }).slice(0, 5);
  }, [termBusqueda, localidadId]);

  const territoriosVisibles = TERRITORIOS_CARTAGENA.filter(
    (territorio) => localidadId === "todas" || territorio.localidadId === localidadId,
  );
  const focoTerritorio = TERRITORIOS_CARTAGENA.find(
    (territorio) => territorio.id === (territorioHover ?? selectedTerritorioId),
  );

  const seleccionarBarrio = (barrio: Barrio) => {
    const territorio = TERRITORIOS_CARTAGENA.find(
      (item) => item.tipo === "localidad" && item.localidadId === barrio.localidadId,
    );
    setBarrioEnfocado(barrio.barrio);
    if (!territorio) return;
    setLocalidadId(barrio.localidadId);
    setBusqueda(barrio.barrio);
    onSelectTerritorio(territorio.id);
  };

  return (
    <div className="relative flex h-full min-h-[32rem] w-full flex-col overflow-hidden rounded-2xl border border-border bg-surface-1">
      <div
        role="search"
        aria-label="Buscar territorio o barrio"
        className="absolute left-3 right-3 top-3 z-10 grid gap-3 rounded-xl border border-border bg-surface-1/95 p-3 shadow-raised backdrop-blur sm:left-4 sm:right-auto sm:w-[min(28rem,calc(100%-2rem))]"
      >
        <div className="relative">
          <Label htmlFor="buscar-barrio-geovisor" className="sr-only">
            Buscar territorio o barrio
          </Label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-tertiary"
          />
          <Input
            id="buscar-barrio-geovisor"
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            placeholder="Busca un territorio o barrio"
            autoComplete="off"
            className="pl-9"
          />
          {termBusqueda.length >= 2 && (
            <ul
              aria-label="Resultados de búsqueda"
              className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-auto rounded-lg border border-border bg-surface-1 p-1 shadow-raised"
            >
              {territoriosCoincidentes.map((territorio) => (
                <li key={territorio.id}>
                  <Button
                    variant="unstyled"
                    size="unstyled"
                    className="flex w-full items-start rounded-md px-3 py-2 text-left hover:bg-surface-2"
                    onClick={() => {
                      setBusqueda(territorio.nombre);
                      onSelectTerritorio(territorio.id);
                    }}
                  >
                    <span className="text-sm font-medium text-text-primary">{territorio.nombre}</span>
                  </Button>
                </li>
              ))}
              {barriosFiltrados.map((barrio) => (
                <li key={`${barrio.localidadId}-${barrio.barrio}`}>
                  <Button
                    variant="unstyled"
                    size="unstyled"
                    className="flex w-full items-start justify-between gap-3 rounded-md px-3 py-2 text-left hover:bg-surface-2"
                    onClick={() => seleccionarBarrio(barrio)}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-text-primary">
                        {barrio.barrio}
                      </span>
                      <span className="block text-xs text-text-secondary">
                        {LOCALIDADES.find((localidad) => localidad.id === barrio.localidadId)?.nombre}
                        {barrio.ucg ? ` · UCG ${barrio.ucg}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-text-tertiary">
                      Estrato {barrio.estrato}
                    </span>
                  </Button>
                </li>
              ))}
              {barriosFiltrados.length === 0 && territoriosCoincidentes.length === 0 && (
                <li className="p-3 text-sm text-text-secondary">
                  No hay coincidencias en el catálogo de barrios o territorios.
                </li>
              )}
            </ul>
          )}
        </div>

        <div>
          <Label htmlFor="filtro-localidad-geovisor" className="mb-1.5 block text-xs">
            Filtrar por localidad
          </Label>
          <Select value={localidadId} onValueChange={setLocalidadId}>
            <SelectTrigger id="filtro-localidad-geovisor" className="w-full" aria-label="Filtrar por localidad">
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

        <div aria-label="Control de capas vectoriales" className="flex flex-col gap-1.5 border-t border-border pt-2">
          <span className="text-xs font-medium text-text-secondary">Capas cartográficas oficiales:</span>
          <div className="flex flex-wrap gap-1.5">
            <Button
              variant={mostrarLocalidades ? "ember" : "outline"}
              size="sm"
              type="button"
              className="h-7 px-2.5 text-xs"
              onClick={() => setMostrarLocalidades(!mostrarLocalidades)}
            >
              Localidades (3)
            </Button>
            <Button
              variant={mostrarBarrios ? "ember" : "outline"}
              size="sm"
              type="button"
              className="h-7 px-2.5 text-xs"
              onClick={() => setMostrarBarrios(!mostrarBarrios)}
            >
              Barrios (217)
            </Button>
            <Button
              variant={mostrarCorregimientos ? "ember" : "outline"}
              size="sm"
              type="button"
              className="h-7 px-2.5 text-xs"
              onClick={() => setMostrarCorregimientos(!mostrarCorregimientos)}
            >
              Corregimientos (17)
            </Button>
          </div>
        </div>

        <div aria-label="Leyenda territorial" className="flex flex-wrap gap-x-3 gap-y-1">
          {LEYENDA_TERRITORIAL.map((item) => (
            <span key={item.id} className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
              <span
                aria-hidden="true"
                className="size-2.5 rounded-full"
                style={{ backgroundColor: `var(${item.token})` }}
              />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      <div
        ref={establecerContenedor}
        className="min-h-[32rem] flex-1"
        role="application"
        aria-label="Mapa interactivo de Cartagena de Indias; busca territorios o usa la lista accesible de puntos"
      />

      {focoTerritorio && (
        <div className="absolute bottom-20 left-3 z-10 max-w-[calc(100%-1.5rem)] rounded-lg border border-border bg-surface-1/95 px-3 py-2 text-sm text-text-primary shadow-raised sm:left-4">
          {focoTerritorio.nombre}
        </div>
      )}

      <div className="flex max-h-40 shrink-0 flex-wrap gap-2 overflow-y-auto border-t border-border bg-surface-1 p-3">
        {territoriosVisibles.map((territorio) => (
          <Button
            key={territorio.id}
            variant={selectedTerritorioId === territorio.id ? "ember" : "outline"}
            size="sm"
            aria-pressed={selectedTerritorioId === territorio.id}
            aria-label={`Abrir ficha territorial: ${territorio.nombre}`}
            onFocus={() => setTerritorioHover(territorio.id)}
            onBlur={() => setTerritorioHover(null)}
            onClick={() => onSelectTerritorio(territorio.id)}
          >
            <MapPin aria-hidden="true" />
            {territorio.nombre}
          </Button>
        ))}
        <p className="basis-full text-xs text-text-tertiary">
          Puntos de referencia territorial; el catálogo de barrios informa localidad, UCG y estrato, no coordenadas ni polígonos barriales.
        </p>
      </div>
    </div>
  );
}
