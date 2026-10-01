"use client";

import { useState, useMemo, useEffect } from "react";
import { PageHeader } from "@/shared/ui/page-header";
import { Button } from "@/shared/ui/button";
import { SearchField } from "@/shared/ui/search-field";
import { EmptyState } from "@/shared/ui/empty-state";
import { StatusBadge, type StatusTone } from "@/shared/ui/status-badge";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Notice } from "@/shared/ui/notice";
import { useMesasStore } from "@/features/mesas/state/mesas-store";
import { useSesionStore } from "@/features/sesion/state/session-store";
import { usePanels } from "@/core/panels/panel-store";
import { useMesas } from "@/features/mesas/services/use-mesas-queries";
import { puedeEditar } from "../models/acceso";
import type { EstadoMesa, MesaDeTrabajo } from "@/features/mesas/models/mesas";
import {
  CalendarDays,
  Clock,
  Landmark,
  Layers,
  MapPin,
  Pencil,
  Plus,
  Search,
  Users,
  X,
} from "lucide-react";

type FiltroEstado = "TODAS" | "EN_CURSO" | "PROGRAMADA" | "CERRADA";

function mapearToneEstado(estado: EstadoMesa | string): {
  tone: StatusTone;
  label: string;
} {
  const e = (estado || "").toLowerCase();
  if (e === "en_curso" || e === "activa" || e === "en_deliberacion") {
    return { tone: "ember", label: "En curso" };
  }
  if (e === "cerrada" || e === "completada" || e === "finalizada") {
    return { tone: "success", label: "Completada" };
  }
  if (e === "cancelada") {
    return { tone: "neutral", label: "Cancelada" };
  }
  return { tone: "info", label: "Programada" };
}

function formatearFecha(fechaStr: string): string {
  try {
    const f = new Date(fechaStr);
    if (isNaN(f.getTime())) return fechaStr;
    return f.toLocaleDateString("es-CO", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return fechaStr;
  }
}

export function MesasGestionView() {
  const mesas = useMesasStore((s) => s.mesas);
  const sesion = useSesionStore((s) => s.sesion);
  const { openPanel } = usePanels();
  const { data: mesasRemotas } = useMesas();

  // Sincronizar mesas remotas de backend en el store si no existen
  useEffect(() => {
    if (mesasRemotas && mesasRemotas.length > 0) {
      const state = useMesasStore.getState();
      const idsExistentes = new Set(state.mesas.map((m) => m.id));
      const nuevas = mesasRemotas.filter((m) => !idsExistentes.has(m.id));
      if (nuevas.length > 0) {
        useMesasStore.setState({ mesas: [...nuevas, ...state.mesas] });
      }
    }
  }, [mesasRemotas]);

  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("TODAS");
  const [filtroFecha, setFiltroFecha] = useState("");

  const editar = puedeEditar(sesion, "mesas");

  // Contadores por estado
  const conteo = useMemo(() => {
    let activas = 0;
    let programadas = 0;
    let completadas = 0;
    let totalAsistentes = 0;

    for (const m of mesas) {
      const e = (m.estado || "").toLowerCase();
      if (e === "en_curso" || e === "activa" || e === "en_deliberacion") {
        activas++;
      } else if (e === "cerrada" || e === "completada" || e === "finalizada") {
        completadas++;
      } else {
        programadas++;
      }
      totalAsistentes += Number(m.totalAsistentes) || 0;
    }

    return {
      total: mesas.length,
      activas,
      programadas,
      completadas,
      totalAsistentes,
    };
  }, [mesas]);

  // Filtrado reactivo
  const mesasFiltradas = useMemo(() => {
    return mesas.filter((m) => {
      // Filtro por búsqueda
      if (busqueda.trim()) {
        const q = busqueda.toLocaleLowerCase("es");
        const match =
          m.nombre.toLocaleLowerCase("es").includes(q) ||
          m.entidad.toLocaleLowerCase("es").includes(q) ||
          m.lugar.toLocaleLowerCase("es").includes(q) ||
          (m.facilitador && m.facilitador.toLocaleLowerCase("es").includes(q)) ||
          (m.codigoOficial && m.codigoOficial.toLocaleLowerCase("es").includes(q)) ||
          (m.shortcodeCiudadano &&
            m.shortcodeCiudadano.toLocaleLowerCase("es").includes(q));
        if (!match) return false;
      }

      // Filtro por estado
      if (filtroEstado !== "TODAS") {
        const e = (m.estado || "").toLowerCase();
        if (filtroEstado === "EN_CURSO" && e !== "en_curso" && e !== "activa") {
          return false;
        }
        if (filtroEstado === "PROGRAMADA" && e !== "programada") {
          return false;
        }
        if (
          filtroEstado === "CERRADA" &&
          e !== "cerrada" &&
          e !== "completada" &&
          e !== "finalizada"
        ) {
          return false;
        }
      }

      // Filtro por fecha
      if (filtroFecha) {
        if (!m.fecha.startsWith(filtroFecha)) {
          return false;
        }
      }

      return true;
    });
  }, [mesas, busqueda, filtroEstado, filtroFecha]);

  const limpiarFiltros = () => {
    setBusqueda("");
    setFiltroEstado("TODAS");
    setFiltroFecha("");
  };

  const hayFiltrosActivos =
    busqueda.trim().length > 0 ||
    filtroEstado !== "TODAS" ||
    filtroFecha.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mesas comunitarias"
        description="Gestiona la agenda territorial, las submesas temáticas y la concertación de acuerdos ciudadanos."
        action={
          editar ? (
            <Button onClick={() => openPanel("mesa-editor", {})}>
              <Plus className="size-4" />
              Crear mesa
            </Button>
          ) : undefined
        }
      />

      {!editar && (
        <Notice title="Modo consulta">
          Tu rol tiene permisos de lectura para consultar la agenda y los acuerdos
          de las mesas comunitarias.
        </Notice>
      )}

      {/* Ribbon de KPIs / Contadores por estado */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Button
          variant="unstyled"
          size="unstyled"
          type="button"
          onClick={() => setFiltroEstado("TODAS")}
          className={`group flex flex-col rounded-xl border p-4 text-left transition-all ${
            filtroEstado === "TODAS"
              ? "border-ember bg-surface-2 ring-1 ring-ember"
              : "border-border bg-surface-1 hover:border-border-strong hover:bg-surface-2"
          }`}
        >
          <span className="text-xs font-medium text-text-secondary">
            Total mesas
          </span>
          <span className="mt-1 text-2xl font-bold tracking-tight text-text-primary">
            {conteo.total}
          </span>
          <span className="mt-1 text-xs text-text-tertiary">
            {conteo.totalAsistentes.toLocaleString("es-CO")} participantes
          </span>
        </Button>

        <Button
          variant="unstyled"
          size="unstyled"
          type="button"
          onClick={() => setFiltroEstado("EN_CURSO")}
          className={`group flex flex-col rounded-xl border p-4 text-left transition-all ${
            filtroEstado === "EN_CURSO"
              ? "border-ember bg-surface-2 ring-1 ring-ember"
              : "border-border bg-surface-1 hover:border-border-strong hover:bg-surface-2"
          }`}
        >
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ember">
            <span className="size-2 rounded-full bg-ember" />
            Activas / En curso
          </span>
          <span className="mt-1 text-2xl font-bold tracking-tight text-text-primary">
            {conteo.activas}
          </span>
          <span className="mt-1 text-xs text-text-tertiary">
            Deliberación en marcha
          </span>
        </Button>

        <Button
          variant="unstyled"
          size="unstyled"
          type="button"
          onClick={() => setFiltroEstado("PROGRAMADA")}
          className={`group flex flex-col rounded-xl border p-4 text-left transition-all ${
            filtroEstado === "PROGRAMADA"
              ? "border-info bg-surface-2 ring-1 ring-info"
              : "border-border bg-surface-1 hover:border-border-strong hover:bg-surface-2"
          }`}
        >
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-info">
            <span className="size-2 rounded-full bg-info" />
            Programadas
          </span>
          <span className="mt-1 text-2xl font-bold tracking-tight text-text-primary">
            {conteo.programadas}
          </span>
          <span className="mt-1 text-xs text-text-tertiary">
            Convocatorias próximas
          </span>
        </Button>

        <Button
          variant="unstyled"
          size="unstyled"
          type="button"
          onClick={() => setFiltroEstado("CERRADA")}
          className={`group flex flex-col rounded-xl border p-4 text-left transition-all ${
            filtroEstado === "CERRADA"
              ? "border-success bg-surface-2 ring-1 ring-success"
              : "border-border bg-surface-1 hover:border-border-strong hover:bg-surface-2"
          }`}
        >
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
            <span className="size-2 rounded-full bg-success" />
            Completadas
          </span>
          <span className="mt-1 text-2xl font-bold tracking-tight text-text-primary">
            {conteo.completadas}
          </span>
          <span className="mt-1 text-xs text-text-tertiary">
            Con acta concertada
          </span>
        </Button>
      </div>

      {/* Barra de filtros */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-1 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex-1">
          <SearchField
            label="Buscar mesas"
            placeholder="Buscar por nombre, entidad, lugar o facilitador…"
            value={busqueda}
            onValueChange={setBusqueda}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de estado */}
          <div className="flex rounded-lg border border-border bg-surface-2 p-0.5 text-xs">
            <Button
              variant="unstyled"
              size="unstyled"
              type="button"
              onClick={() => setFiltroEstado("TODAS")}
              className={`rounded-md px-2.5 py-1.5 font-medium transition-colors ${
                filtroEstado === "TODAS"
                  ? "bg-surface-1 text-text-primary shadow-xs"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Todas
            </Button>
            <Button
              variant="unstyled"
              size="unstyled"
              type="button"
              onClick={() => setFiltroEstado("EN_CURSO")}
              className={`rounded-md px-2.5 py-1.5 font-medium transition-colors ${
                filtroEstado === "EN_CURSO"
                  ? "bg-surface-1 text-ember shadow-xs"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              En curso
            </Button>
            <Button
              variant="unstyled"
              size="unstyled"
              type="button"
              onClick={() => setFiltroEstado("PROGRAMADA")}
              className={`rounded-md px-2.5 py-1.5 font-medium transition-colors ${
                filtroEstado === "PROGRAMADA"
                  ? "bg-surface-1 text-info shadow-xs"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Programadas
            </Button>
            <Button
              variant="unstyled"
              size="unstyled"
              type="button"
              onClick={() => setFiltroEstado("CERRADA")}
              className={`rounded-md px-2.5 py-1.5 font-medium transition-colors ${
                filtroEstado === "CERRADA"
                  ? "bg-surface-1 text-success shadow-xs"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Completadas
            </Button>
          </div>

          {/* Filtro por fecha */}
          <div className="flex items-center gap-1.5">
            <Input
              type="date"
              aria-label="Filtrar por fecha"
              value={filtroFecha}
              onChange={(e) => setFiltroFecha(e.target.value)}
              className="h-9 w-auto text-xs"
            />
          </div>

          {hayFiltrosActivos && (
            <Button
              variant="ghost"
              size="sm"
              onClick={limpiarFiltros}
              className="h-9 text-xs text-text-secondary hover:text-text-primary"
            >
              <X className="size-3.5" />
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* Conteo de resultados */}
      <div className="flex items-center justify-between text-xs text-text-secondary">
        <span>
          Mostrando {mesasFiltradas.length} de {mesas.length} mesas
        </span>
      </div>

      {/* Listado de tarjetas de mesas */}
      {mesasFiltradas.length === 0 ? (
        mesas.length === 0 ? (
          <EmptyState
            icon={<Users className="size-6 text-text-tertiary" />}
            title="Aún no hay mesas comunitarias"
            description="Comienza creando la primera mesa comunitaria para concertar los acuerdos de seguridad humana."
            action={
              editar ? (
                <Button onClick={() => openPanel("mesa-editor", {})}>
                  <Plus className="size-4" />
                  Crear mesa
                </Button>
              ) : undefined
            }
          />
        ) : (
          <EmptyState
            icon={<Search className="size-6 text-text-tertiary" />}
            title="No se encontraron mesas"
            description="No hay mesas de trabajo que coincidan con los criterios de búsqueda o fecha seleccionados."
            action={
              <Button variant="outline" onClick={limpiarFiltros}>
                Restablecer filtros
              </Button>
            }
          />
        )
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {mesasFiltradas.map((m: MesaDeTrabajo) => {
            const estadoInfo = mapearToneEstado(m.estado);
            return (
              <section
                key={m.id}
                className="group flex flex-col justify-between rounded-xl border border-border bg-surface-1 p-5 transition-all hover:border-border-strong hover:bg-surface-2"
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <StatusBadge tone={estadoInfo.tone}>
                      {estadoInfo.label}
                    </StatusBadge>

                    <div className="flex items-center gap-1.5">
                      {m.codigoOficial && (
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {m.codigoOficial}
                        </Badge>
                      )}
                      {m.shortcodeCiudadano && (
                        <Badge variant="secondary" className="font-mono text-[10px]">
                          {m.shortcodeCiudadano}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div>
                    <h2 className="break-words text-lg font-semibold text-text-primary">
                      {m.nombre}
                    </h2>
                    {m.dimensionOnu && (
                      <p className="mt-1 text-xs text-text-tertiary">
                        Dimensión: {m.dimensionOnu}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs text-text-secondary">
                    <p className="flex items-center gap-2 text-text-primary">
                      <Landmark className="size-3.5 shrink-0 text-text-tertiary" />
                      <span className="font-medium">{m.entidad}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <CalendarDays className="size-3.5 shrink-0 text-text-tertiary" />
                      <span>{formatearFecha(m.fecha)}</span>
                      {m.horario && (
                        <>
                          <span className="text-text-tertiary">·</span>
                          <Clock className="size-3.5 shrink-0 text-text-tertiary" />
                          <span>{m.horario}</span>
                        </>
                      )}
                    </p>
                    <p className="flex items-center gap-2">
                      <MapPin className="size-3.5 shrink-0 text-text-tertiary" />
                      <span className="truncate">{m.lugar}</span>
                    </p>
                    <div className="flex flex-wrap items-center gap-3 pt-1 text-text-tertiary">
                      <span className="flex items-center gap-1 text-text-secondary">
                        <Users className="size-3.5 text-text-tertiary" />
                        {m.totalAsistentes} participantes
                      </span>
                      {m.submesas && m.submesas.length > 0 && (
                        <span className="flex items-center gap-1 text-text-secondary">
                          <Layers className="size-3.5 text-text-tertiary" />
                          {m.submesas.length}{" "}
                          {m.submesas.length === 1 ? "submesa" : "submesas"}
                        </span>
                      )}
                      {m.facilitador && (
                        <span className="truncate">
                          Facilitador: {m.facilitador}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between gap-2 border-t border-border pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={`Ver detalle de ${m.nombre}`}
                    className="flex-1 justify-center sm:flex-initial"
                    onClick={() =>
                      openPanel("mesa", { mesaId: m.id, soloLectura: !editar })
                    }
                  >
                    Ver detalle
                  </Button>

                  {editar && (
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Editar ${m.nombre}`}
                      onClick={() =>
                        openPanel("mesa-editor", { mesaId: m.id })
                      }
                      className="text-text-secondary hover:text-text-primary"
                    >
                      <Pencil className="size-3.5" />
                      Editar
                    </Button>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
