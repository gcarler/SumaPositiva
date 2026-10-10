"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Download } from "lucide-react";
import { usePanels } from "@/core/panels/panel-store";
import { useSesionStore } from "@/features/sesion/state/session-store";
import { Button } from "@/shared/ui/button";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/shared/ui/accordion";
import { Notice } from "@/shared/ui/notice";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/shared/ui/table";
import {
  lineasApi,
  LINEAS_KEY,
  type LineaPersistida,
} from "../services/lineas-api";
import {
  matrizPolitica,
  matrizCsv,
  descargarMatriz,
} from "../services/lineas-export";
import { dimensionMeta } from "./dimensiones-meta";

export function ArquitecturaPolitica() {
  const sesion = useSesionStore((s) => s.sesion);
  const editable =
    !!sesion?.permisos?.includes("politicas:gestionar") &&
    sesion.rol !== "auditor_forense";
  const { openPanel } = usePanels();
  const client = useQueryClient();
  const [confirmar, setConfirmar] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const dims = useQuery({
    queryKey: ["politicas", "dimensiones"],
    queryFn: lineasApi.dimensiones,
  });
  const lineas = useQuery({ queryKey: LINEAS_KEY, queryFn: lineasApi.listar });
  const fases = useQuery({
    queryKey: ["politicas", "fases"],
    queryFn: lineasApi.fases,
  });
  const error = dims.error ?? lineas.error ?? fases.error;
  if (error)
    return (
      <Notice tone="danger" title="No se pudo cargar la arquitectura">
        <p>{error.message}</p>
        <Button
          variant="outline"
          onClick={() => {
            void dims.refetch();
            void lineas.refetch();
            void fases.refetch();
          }}
        >
          Reintentar
        </Button>
      </Notice>
    );
  if (!dims.data || !lineas.data || !fases.data)
    return <p role="status">Cargando arquitectura de la política…</p>;
  const eliminar = async (id: string) => {
    setEliminando(true);
    try {
      await lineasApi.eliminar(id);
      await Promise.all([
        client.invalidateQueries({ queryKey: LINEAS_KEY }),
        client.invalidateQueries({ queryKey: ["plataforma", "lineas"] }),
      ]);
      setConfirmar(null);
      toast.success("Línea eliminada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo eliminar");
    } finally {
      setEliminando(false);
    }
  };
  const contenidoLinea = (l: LineaPersistida) => (
    <AccordionItem key={l.id} value={l.id}>
      <AccordionTrigger className="text-left break-words">
        {l.codigo} · {l.titulo}
        {!l.activa ? " (inactiva)" : ""}
      </AccordionTrigger>
      <AccordionContent className="space-y-4">
        <p className="break-words">{l.descripcion}</p>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-text-secondary">Fase de la política</dt>
            <dd>
              {fases.data?.find((f) => f.id === l.fase_id)?.nombre ?? l.fase_id}
            </dd>
          </div>
          <div>
            <dt className="text-text-secondary">Entidad líder</dt>
            <dd>{l.entidad_lider}</dd>
          </div>
          <div>
            <dt className="text-text-secondary">Problema abordado</dt>
            <dd>{l.problema_abordado || "Sin registrar"}</dd>
          </div>
          <div>
            <dt className="text-text-secondary">Objetivo específico</dt>
            <dd>{l.objetivo_especifico || "Sin registrar"}</dd>
          </div>
          <div>
            <dt className="text-text-secondary">Costo estimado COP</dt>
            <dd>
              {new Intl.NumberFormat("es-CO", {
                style: "currency",
                currency: "COP",
              }).format(Number(l.costo_estimado))}
            </dd>
          </div>
          <div>
            <dt className="text-text-secondary">Fuentes</dt>
            <dd>{l.fuentes_financiacion.join(", ")}</dd>
          </div>
        </dl>
        {l.sublineas.length ? (
          <div
            className="max-w-full overflow-x-auto"
            role="region"
            aria-label={`Sublíneas de ${l.codigo}`}
            tabIndex={0}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  {[
                    "Código",
                    "Intervención",
                    "Meta cuatrienal",
                    "Indicador",
                    "Corresponsable",
                  ].map((h) => (
                    <TableHead key={h}>{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {l.sublineas.map((s) => (
                  <TableRow key={s.codigo}>
                    <TableCell>{s.codigo}</TableCell>
                    <TableCell className="whitespace-normal">
                      {s.titulo}
                      <p className="text-xs text-text-secondary">
                        {s.descripcion}
                      </p>
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      {s.meta_cuatrienal || "Sin registrar"}
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      {s.indicador_nombre || "Sin registrar"}
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      {s.actor_coresponsable || "Sin registrar"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-text-secondary">Sin sublíneas registradas.</p>
        )}
        {editable && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => openPanel("linea-editor", { lineaId: l.id })}
            >
              <Pencil aria-hidden="true" className="size-4" />
              Editar {l.codigo}
            </Button>
            <Button variant="outline" onClick={() => setConfirmar(l.id)}>
              <Trash2 aria-hidden="true" className="size-4" />
              Eliminar {l.codigo}
            </Button>
          </div>
        )}
        {editable && confirmar === l.id && (
          <Notice tone="warning" title={`¿Eliminar ${l.codigo}?`}>
            <p>
              Solo se permite si no tiene registros vinculados. Para conservar
              la línea puede desactivarla desde el editor.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button disabled={eliminando} onClick={() => void eliminar(l.id)}>
                {eliminando ? "Eliminando…" : "Confirmar eliminación"}
              </Button>
              <Button
                variant="outline"
                disabled={eliminando}
                onClick={() => setConfirmar(null)}
              >
                Cancelar eliminación
              </Button>
            </div>
          </Notice>
        )}
      </AccordionContent>
    </AccordionItem>
  );
  const sinDimension = lineas.data.filter(
    (l) => !dims.data.some((d) => d.id === l.dimension_id),
  );
  return (
    <section
      className="min-w-0 space-y-5"
      aria-label="Arquitectura de la política pública"
    >
      <h2 className="text-xl font-semibold">
        Arquitectura de la Política Pública: Dimensiones, Líneas y Sublíneas
      </h2>
      <p className="text-sm text-text-secondary">
        Siete dimensiones de Seguridad Humana, líneas estratégicas por fase de la política
        y sublíneas con metas e indicadores.
      </p>
      <div className="flex flex-wrap gap-3">
        {editable && (
          <Button onClick={() => openPanel("linea-editor", {})}>
            <Plus aria-hidden="true" className="size-4" />
            Nueva Línea Estratégica
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() =>
            descargarMatriz(matrizCsv(dims.data, lineas.data), "csv")
          }
        >
          <Download aria-hidden="true" className="size-4" />
          Exportar Matriz Completa (CSV)
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            descargarMatriz(
              JSON.stringify(matrizPolitica(dims.data, lineas.data), null, 2),
              "json",
            )
          }
        >
          Exportar JSON
        </Button>
      </div>
      {dims.data.map((d) => {
        const { Icon, color } = dimensionMeta(d.codigo);
        const ls = lineas.data.filter((l) => l.dimension_id === d.id);
        return (
          <section
            key={d.id}
            className="min-w-0 rounded-xl border border-border bg-surface-1 p-4"
          >
            <h3 className="flex items-center gap-2 font-semibold">
              <Icon aria-hidden="true" className={`size-5 shrink-0 ${color}`} />
              {d.nombre}
            </h3>
            <p className="text-sm text-text-secondary">
              {ls.length} líneas estratégicas
            </p>
            {ls.length ? (
              <Accordion type="multiple">{ls.map(contenidoLinea)}</Accordion>
            ) : (
              <p className="mt-3 text-sm">Sin líneas registradas.</p>
            )}
          </section>
        );
      })}
      {!!sinDimension.length && (
        <section className="rounded-xl border border-border p-4">
          <h3 className="font-semibold">
            Líneas históricas sin dimensión canónica
          </h3>
          <p>Seleccione una dimensión al editar estos registros.</p>
          <Accordion type="multiple">
            {sinDimension.map(contenidoLinea)}
          </Accordion>
        </section>
      )}
    </section>
  );
}
