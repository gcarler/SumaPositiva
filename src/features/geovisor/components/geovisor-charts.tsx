"use client";

import { useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Bar, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, Scatter, ScatterChart, XAxis, YAxis } from "recharts";
import { Download, MapPin } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/shared/ui/chart";
import { EmptyState } from "@/shared/ui/empty-state";
import { FormField } from "@/shared/ui/form-field";
import { Notice } from "@/shared/ui/notice";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import type { VariableMapa } from "../data/estadisticas.data";
import type { AnaliticaMultifuente, SerieMultifuenteDetalle } from "../models/analitica-multifuente";
import { useAnaliticaMultifuente } from "../services/analitica-multifuente-api";
import { listarIndicadores } from "../services/geovisor-api";
import { useGeovisorAnaliticaStore } from "../state/geovisor-analitica-store";
import { useGeovisorLayoutStore } from "../state/geovisor-layout-store";
import { MultifuenteFiltros } from "./multifuente-filtros";

interface GeovisorChartsProps {
  territorioId?: string;
  variableMapa?: VariableMapa;
  onTerritorioChange?: (id: string) => void;
  onVariableChange?: (variable: VariableMapa) => void;
  /** Inyección exclusiva para historias aisladas; no es respaldo de producción. */
  datosIniciales?: AnaliticaMultifuente | null;
  cargandoInicial?: boolean;
  errorInicial?: string;
}

const formato = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 3 });
const COLORES = ["var(--ember)", "var(--info)", "var(--success)", "var(--warning)", "var(--danger)", "var(--text-secondary)"];

function numero(valor: number | null | undefined): string {
  return valor === null || valor === undefined ? "Sin dato" : formato.format(valor);
}

function exportarSerie(serie: SerieMultifuenteDetalle, consultaSha: string) {
  const columnas = ["fuente", "territorio", "indicador", "unidad", "anio_referencia", "valor_original", "periodo_desde", "periodo_hasta", "provisional", "observacion_id", "url_fuente", "sha256_fuente", "sha256_consulta"];
  const filas = serie.puntos.map((p) => [serie.resumen.fuente, serie.resumen.territorio, serie.resumen.nombre, serie.resumen.unidad, p.anio, p.valor_original, p.periodo_desde, p.periodo_hasta, p.provisional, p.observacion_id, p.url_fuente, p.sha256, consultaSha]);
  const escapar = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  const contenido = [columnas, ...filas].map((fila) => fila.map(escapar).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", contenido], { type: "text/csv;charset=utf-8" }));
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `polis-serie-${serie.resumen.id.slice(0, 12)}.csv`;
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function SerieGrafica({ serie, tipo }: { serie: SerieMultifuenteDetalle; tipo: "linea" | "barras" }) {
  const reducirMovimiento = useReducedMotion() ?? false;
  const anios = serie.puntos.map((p) => p.anio);
  const porAnio = new Map(serie.puntos.map((p) => [p.anio, p]));
  if (porAnio.size !== serie.puntos.length) return <Notice tone="warning" title="Hay varias observaciones por año">Consulta los valores originales: no se agregan desagregaciones automáticamente.</Notice>;
  const primero = Math.min(...anios);
  const ultimo = Math.max(...anios);
  const datos = Array.from({ length: ultimo - primero + 1 }, (_, indice) => {
    const anio = primero + indice;
    const punto = porAnio.get(anio);
    return { anio: `${anio}${punto?.provisional || punto?.completo === false ? "*" : ""}`, valor: punto?.valor ?? null };
  });
  return (
    <section aria-label={`Gráfica de ${serie.resumen.nombre}`} className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">{serie.resumen.nombre}</h3>
      <p className="mb-3 break-words text-xs text-[var(--text-secondary)]">{serie.resumen.territorio} · {serie.resumen.unidad} · {serie.resumen.fuente}</p>
      <ChartContainer config={{ valor: { label: serie.resumen.unidad, color: "var(--ember)" } }} className="aspect-auto h-64 w-full min-w-0">
        <ComposedChart data={datos} accessibilityLayer margin={{ left: 0, right: 12, top: 8, bottom: 8 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="anio" tickLine={false} axisLine={false} minTickGap={18} tick={{ fill: "var(--text-secondary)", fontSize: 11 }} />
          <YAxis width={62} tickLine={false} axisLine={false} tickFormatter={(v: number) => formato.format(v)} tick={{ fill: "var(--text-secondary)", fontSize: 10 }} />
          <ChartTooltip content={<ChartTooltipContent />} />
          {tipo === "linea" ? <Line dataKey="valor" type="linear" stroke="var(--ember)" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} isAnimationActive={!reducirMovimiento} /> : <Bar dataKey="valor" fill="var(--ember)" radius={[4, 4, 0, 0]} isAnimationActive={!reducirMovimiento} />}
        </ComposedChart>
      </ChartContainer>
      <p className="text-xs text-[var(--text-secondary)]">* Corte parcial o provisional. Los huecos representan datos ausentes. El eje temporal usa el año de referencia declarado por la fuente.</p>
    </section>
  );
}

function CoberturaGrafica({ datos }: { datos: AnaliticaMultifuente }) {
  const reducirMovimiento = useReducedMotion() ?? false;
  const ordenadas = [...datos.cobertura_fuentes].sort((a, b) => b.total - a.total);
  const categorias = ordenadas.slice(0, 5).map((f) => ({ nombre: f.nombre, total: f.total }));
  if (ordenadas.length > 5) categorias.push({ nombre: "Otras entidades", total: ordenadas.slice(5).reduce((suma, f) => suma + f.total, 0) });
  if (!categorias.length) return null;
  return (
    <section aria-label="Composición de las observaciones consultadas" className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
      <h3 className="text-sm font-semibold">Cobertura del banco por entidad</h3>
      <p className="text-xs text-[var(--text-secondary)]">Cada observación se cuenta una vez en su grupo de entidad. Esta distribución describe la cobertura documental del banco.</p>
      <ChartContainer config={{ total: { label: "Observaciones", color: "var(--info)" } }} className="aspect-auto h-56 w-full min-w-0">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent nameKey="nombre" />} />
          <Pie data={categorias} dataKey="total" nameKey="nombre" innerRadius={42} outerRadius={78} isAnimationActive={!reducirMovimiento}>
            {categorias.map((c, i) => (
              <Cell
                key={c.nombre}
                fill={COLORES[i % COLORES.length]}
                aria-label={`${c.nombre}: ${c.total} observaciones`}
              />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <ul className="space-y-1 text-xs">
        {categorias.map((c, i) => <li key={c.nombre} className="flex min-w-0 items-start justify-between gap-2"><span className="min-w-0 break-words"><span aria-hidden="true" className="mr-2 inline-block size-2 rounded-full" style={{ backgroundColor: COLORES[i % COLORES.length] }} />{c.nombre}</span><span className="shrink-0 tabular-nums">{c.total.toLocaleString("es-CO")}</span></li>)}
      </ul>
    </section>
  );
}

function Trazabilidad({ serie }: { serie: SerieMultifuenteDetalle }) {
  const ultimo = serie.puntos.at(-1);
  if (!ultimo) return null;
  return (
    <section aria-label="Trazabilidad y método de la serie" className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
      <h3 className="text-sm font-semibold">Fuente y método</h3>
      <dl className="grid gap-2 text-xs sm:grid-cols-2">
        <div><dt className="text-[var(--text-secondary)]">Entidad y producto</dt><dd className="break-words">{serie.resumen.fuente}</dd></div>
        <div><dt className="text-[var(--text-secondary)]">Escala territorial</dt><dd>{serie.resumen.escala} · {serie.resumen.territorio}</dd></div>
        <div><dt className="text-[var(--text-secondary)]">Unidad y desagregación</dt><dd>{serie.resumen.unidad} · {serie.resumen.subtipo || "Sin declarar"}</dd></div>
        <div><dt className="text-[var(--text-secondary)]">Periodo del último dato</dt><dd>{ultimo.periodo_desde && ultimo.periodo_hasta ? `${ultimo.periodo_desde} a ${ultimo.periodo_hasta}` : `${ultimo.anio}: año de referencia; fechas sin acreditar`}</dd></div>
        <div><dt className="text-[var(--text-secondary)]">Método</dt><dd>{ultimo.metodo || "Lectura directa del valor del banco. Fórmula de origen sin declarar."}</dd></div>
        <div><dt className="text-[var(--text-secondary)]">Fecha de extracción</dt><dd>{ultimo.fecha_extraccion || "Sin declarar"}</dd></div>
        <div><dt className="text-[var(--text-secondary)]">Validación de origen</dt><dd>{ultimo.estado_validacion || "Sin declarar"}</dd></div>
        <div><dt className="text-[var(--text-secondary)]">Certificación del corte analítico</dt><dd>{ultimo.estado_publicacion || "Sin declarar"}</dd></div>
      </dl>
      {ultimo.url_fuente && <a href={ultimo.url_fuente} target="_blank" rel="noopener noreferrer" className="inline-block max-w-full break-all text-xs text-[var(--info)] underline focus-visible:outline focus-visible:outline-2">Consultar publicación de origen</a>}
      <p className="break-all text-xs text-[var(--text-secondary)]">SHA-256 de origen: {ultimo.sha256 || "No registrado en esta observación"}</p>
      {ultimo.referencia && <p className="text-xs">Referencia: {ultimo.referencia}</p>}
      {ultimo.nota && <p className="text-xs leading-relaxed text-[var(--text-secondary)]">{ultimo.nota}</p>}
      <details className="text-xs"><summary className="cursor-pointer rounded py-1 font-medium focus-visible:outline focus-visible:outline-2">Advertencias de la serie ({serie.resumen.advertencias.length})</summary><ul className="list-disc space-y-1 pl-4">{serie.resumen.advertencias.map((a) => <li key={a}>{a}</li>)}</ul></details>
    </section>
  );
}

export function GeovisorCharts({ onTerritorioChange, datosIniciales, cargandoInicial = false, errorInicial }: GeovisorChartsProps) {
  const consulta = useAnaliticaMultifuente(datosIniciales === undefined && !cargandoInicial && !errorInicial);
  const datos = datosIniciales === undefined ? consulta.data : datosIniciales;
  const setSerieX = useGeovisorAnaliticaStore((s) => s.setSerieX);
  const setSerieY = useGeovisorAnaliticaStore((s) => s.setSerieY);
  const [tipo, setTipo] = useState<"linea" | "barras">("linea");
  const [errorMapa, setErrorMapa] = useState<string | null>(null);
  const [abriendoMapa, setAbriendoMapa] = useState(false);
  const serie = datos?.serie;
  const comparacion = datos?.comparacion;
  const reducirMovimiento = useReducedMotion() ?? false;
  const cargando = cargandoInicial || (datosIniciales === undefined && consulta.isLoading && !errorInicial);
  const error = errorInicial || (consulta.isError ? (consulta.error instanceof Error ? consulta.error.message : "No fue posible consultar la API.") : null);

  async function mostrarEnMapa() {
    const ultimo = serie?.puntos.at(-1);
    if (!serie || !ultimo) return;
    setErrorMapa(null);
    setAbriendoMapa(true);
    try {
      const respuesta = await listarIndicadores({ codigo_territorio: serie.resumen.codigo_territorio, fuente_datos: serie.resumen.fuente, codigo_indicador: serie.resumen.codigo_indicador, anio_corte: ultimo.anio, limit: 100 });
      const observacion = respuesta.indicadores.find((item) => item.id === ultimo.observacion_id);
      if (!observacion) throw new Error("La observación ya no está disponible. Actualiza la consulta.");
      const estado = useGeovisorLayoutStore.getState();
      if (!estado.indicadoresMultifuenteActivos.some((i) => i.id === observacion.id)) estado.toggleIndicadorMultifuente(observacion);
      onTerritorioChange?.(serie.resumen.codigo_territorio);
    } catch (e) {
      setErrorMapa(e instanceof Error ? e.message : "No fue posible mostrar la observación en el mapa.");
    } finally {
      setAbriendoMapa(false);
    }
  }

  return (
    <div className="min-w-0 space-y-4" aria-busy={cargando}>
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--info)]">Banco Multifuente · análisis descriptivo</p>
        <h2 className="text-lg font-semibold">Estadísticas y comparación de fuentes</h2>
        <p className="text-sm text-[var(--text-secondary)]">Explora las series del banco, su cobertura y las condiciones para compararlas.</p>
      </header>
      <MultifuenteFiltros datos={datos ?? undefined} onTerritorioChange={onTerritorioChange} />
      {cargando ? <p role="status" className="p-6 text-sm text-[var(--text-secondary)]">Consultando observaciones y calculando series…</p> : error ? <Notice tone="danger" title="No se pudo consultar el banco"><p>{error}</p><Button variant="outline" size="sm" onClick={() => void consulta.refetch()}>Reintentar consulta</Button></Notice> : !datos || !serie ? <EmptyState title="Sin serie disponible" description="La serie seleccionada no contiene observaciones con estos filtros. Los datos municipales no se replican a otros territorios." action={datos?.series.length ? <Button variant="outline" onClick={() => setSerieX(null)}>Elegir una serie disponible</Button> : undefined} /> : (
        <>
          <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2">
            <FormField label="Indicador principal">
              {({ id, ...props }) => <Select value={serie.resumen.id} onValueChange={setSerieX}><SelectTrigger id={id} {...props} className="w-full min-w-0 [&>span]:truncate"><SelectValue /></SelectTrigger><SelectContent>{datos.series.map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre} · {s.fuente} · {s.territorio}</SelectItem>)}</SelectContent></Select>}
            </FormField>
            <FormField label="Comparar con otra serie" description="Para cruzar entidades, selecciona Todos en el filtro de fuente.">
              {({ id, ...props }) => <Select value={datos.serie_comparada?.resumen.id ?? "ninguna"} onValueChange={(v) => setSerieY(v === "ninguna" ? null : v)}><SelectTrigger id={id} {...props} className="w-full min-w-0 [&>span]:truncate"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ninguna">Sin comparación</SelectItem>{datos.series.filter((s) => s.id !== serie.resumen.id).map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre} · {s.fuente} · {s.territorio}</SelectItem>)}</SelectContent></Select>}
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Resumen de la serie consultada">
            {[ ["Observaciones de la serie", serie.puntos.length.toLocaleString("es-CO")], ["Último valor registrado", `${numero(serie.puntos.at(-1)?.valor)} ${serie.resumen.unidad}`], ["Mediana de valores disponibles", `${numero(serie.mediana)} ${serie.resumen.unidad}`], ["Observaciones del filtro", datos.total_observaciones.toLocaleString("es-CO")] ].map(([etiqueta, valor]) => <div key={etiqueta} className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3"><p className="text-xs text-[var(--text-secondary)]">{etiqueta}</p><p className="mt-1 break-words text-lg font-semibold tabular-nums">{valor}</p></div>)}
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Acciones y presentación de la serie">
            <Button size="sm" variant={tipo === "linea" ? "default" : "outline"} aria-pressed={tipo === "linea"} onClick={() => setTipo("linea")}>Evolución temporal</Button>
            <Button size="sm" variant={tipo === "barras" ? "default" : "outline"} aria-pressed={tipo === "barras"} onClick={() => setTipo("barras")}>Barras por año</Button>
            <Button size="sm" variant="outline" onClick={() => exportarSerie(serie, datos.consulta_sha256)}><Download className="mr-1 size-4" aria-hidden="true" />Descargar serie CSV</Button>
            <Button size="sm" variant="outline" disabled={abriendoMapa || datosIniciales !== undefined} onClick={() => void mostrarEnMapa()}><MapPin className="mr-1 size-4" aria-hidden="true" />{abriendoMapa ? "Localizando…" : "Ver último dato en mapa"}</Button>
          </div>
          {errorMapa && <Notice tone="danger" title="No se pudo mostrar el dato">{errorMapa}</Notice>}
          <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
            <SerieGrafica serie={serie} tipo={tipo} />
            {datos.serie_comparada ? <SerieGrafica serie={datos.serie_comparada} tipo={tipo} /> : <CoberturaGrafica datos={datos} />}
          </div>
          {comparacion && <section aria-label="Resultado de la comparación" className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
            <h3 className="text-sm font-semibold">Comparación trazable por año de referencia</h3>
            <p className="text-sm">{comparacion.muestra_total} pares observados · {comparacion.muestra_elegible} pares acreditados para cálculo.</p>
            <p className="text-sm">Pearson: {numero(comparacion.pearson)} · Spearman: {numero(comparacion.spearman)}</p>
            <ul className="list-disc space-y-1 pl-4 text-xs text-[var(--text-secondary)]">{comparacion.motivos.map((m) => <li key={m}>{m}</li>)}</ul>
            {comparacion.anios_sin_pareja.length > 0 && <p className="text-xs">Años sin pareja numérica: {comparacion.anios_sin_pareja.join(", ")}. Se conservan como ausencia.</p>}
            <p className="text-xs text-[var(--text-secondary)]">{comparacion.interpretacion}</p>
            {comparacion.estado === "correlacion_descriptiva" && <ChartContainer config={{ y: { label: datos.serie_comparada?.resumen.nombre, color: "var(--info)" } }} className="aspect-auto h-64 w-full min-w-0">
              <ScatterChart accessibilityLayer margin={{ left: 4, right: 12, top: 12, bottom: 12 }}>
                <CartesianGrid stroke="var(--border)" />
                <XAxis type="number" dataKey="x" name={serie.resumen.nombre} unit={` ${serie.resumen.unidad}`} tick={{ fill: "var(--text-secondary)", fontSize: 10 }} />
                <YAxis type="number" dataKey="y" name={datos.serie_comparada?.resumen.nombre} unit={` ${datos.serie_comparada?.resumen.unidad}`} tick={{ fill: "var(--text-secondary)", fontSize: 10 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Scatter name="Pares acreditados" data={comparacion.pares.filter((p) => p.elegible)} fill="var(--info)" isAnimationActive={!reducirMovimiento} />
              </ScatterChart>
            </ChartContainer>}
            <details className="text-xs"><summary className="cursor-pointer rounded py-1 focus-visible:outline focus-visible:outline-2">Ver valores y exclusiones de cada par</summary><div className="overflow-x-auto"><table className="w-full text-left"><caption className="sr-only">Pares de observaciones y motivos de exclusión</caption><thead><tr><th scope="col" className="p-2">Año</th><th scope="col" className="p-2">Principal ({serie.resumen.unidad})</th><th scope="col" className="p-2">Comparada ({datos.serie_comparada?.resumen.unidad})</th><th scope="col" className="p-2">Condiciones</th></tr></thead><tbody>{comparacion.pares.map((p) => <tr key={p.anio}><td className="p-2">{p.anio}</td><td className="p-2">{numero(p.x)}</td><td className="p-2">{numero(p.y)}</td><td className="p-2">{p.elegible ? "Par acreditado" : p.motivos.join(" ")}</td></tr>)}</tbody></table></div></details>
          </section>}
          <Trazabilidad serie={serie} />
          {datos.serie_comparada && <Trazabilidad serie={datos.serie_comparada} />}
          <details className="rounded-xl border border-[var(--border)] p-3 text-xs"><summary className="cursor-pointer rounded py-1 font-medium focus-visible:outline focus-visible:outline-2">Valores originales y procedencia de cada observación</summary><div className="overflow-x-auto"><table className="w-full text-left"><caption className="sr-only">Observaciones originales de la serie principal</caption><thead><tr><th scope="col" className="p-2">Año</th><th scope="col" className="p-2">Valor ({serie.resumen.unidad})</th><th scope="col" className="p-2">Periodo</th><th scope="col" className="p-2">Procedencia</th></tr></thead><tbody>{serie.puntos.map((p) => <tr key={p.observacion_id}><td className="p-2">{p.anio}</td><td className="p-2">{p.valor === null ? "Sin dato" : p.valor_original}</td><td className="p-2">{p.periodo_desde && p.periodo_hasta ? `${p.periodo_desde} / ${p.periodo_hasta}` : "Fechas sin acreditar"}{p.provisional || p.completo === false ? " · parcial/provisional" : ""}</td><td className="max-w-64 break-all p-2">{p.url_fuente && <a href={p.url_fuente} target="_blank" rel="noopener noreferrer" className="text-[var(--info)] underline">Fuente</a>}<span className="block">{p.observacion_id}</span><span className="block">{p.sha256 || "SHA no registrado"}</span></td></tr>)}</tbody></table></div></details>
          <footer className="space-y-1 break-words text-xs text-[var(--text-secondary)]">
            {datos.advertencias.map((a) => <p key={a}>{a}</p>)}
            <p>Ediciones previas excluidas de esta consulta: {datos.observaciones_excluidas}.</p>
            <p>Variación interanual: {numero(serie.variacion_interanual_pct)}{serie.variacion_interanual_pct !== null ? " %" : ""}. {serie.motivo_variacion}</p>
            <p>Método: {datos.version_metodo}. Estadísticos: mínimo, máximo y mediana de valores disponibles, sin imputación.</p>
            <p className="break-all">SHA-256 de la consulta: {datos.consulta_sha256}</p>
          </footer>
        </>
      )}
    </div>
  );
}
