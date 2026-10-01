"use client";

import { useEffect, useMemo, useRef, useState, type FocusEvent, type MouseEvent } from "react";
import { useReducedMotion } from "framer-motion";
import { Button } from "@/shared/ui/button";
import { StatusBadge } from "@/shared/ui/status-badge";
import {
  ESTADISTICAS_TERRITORIOS,
  VARIABLE_META,
  obtenerValorVariable,
  type EstadisticasTerritorio,
  type VariableMapa,
} from "../data/estadisticas.data";

interface GeovisorChartsProps {
  territorioId: string;
  variableMapa: VariableMapa;
  onTerritorioChange: (id: string) => void;
  onVariableChange: (variable: VariableMapa) => void;
}

const MESES = ["Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre"];
const LOCALIDADES = ["loc-1", "loc-2", "loc-3"] as const;
const DIMENSIONES: { label: string; variable: VariableMapa }[] = [
  { label: "Personal", variable: "personal" },
  { label: "Comunitaria", variable: "comunitaria" },
  { label: "Económica", variable: "economica" },
  { label: "Ambiental", variable: "ambiental" },
  { label: "Alimentaria", variable: "alimentaria" },
  { label: "Salud", variable: "salud" },
  { label: "Política", variable: "politica" },
];

function territorioActual(id: string): EstadisticasTerritorio {
  return ESTADISTICAS_TERRITORIOS.find((territorio) => territorio.id === id)
    ?? ESTADISTICAS_TERRITORIOS[0];
}

function encabezado(titulo: string, territorio: EstadisticasTerritorio, etiqueta: string) {
  return (
    <div className="mb-4 flex min-h-12 items-start justify-between gap-2">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">{etiqueta}</p>
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">{titulo}</h2>
      </div>
      <StatusBadge tone="ember" className="max-w-[48%] truncate text-[10px]" title={territorio.nombre}>
        {territorio.nombre.split(" — ")[0]}
      </StatusBadge>
    </div>
  );
}

function valorDimensiones(territorio: EstadisticasTerritorio): number[] {
  return DIMENSIONES.map(({ variable }) => obtenerValorVariable(territorio, variable));
}

function puntosPoligono(valores: number[], centro: number, radio: number): string {
  return valores.map((valor, indice) => {
    const angulo = -Math.PI / 2 + (indice * Math.PI * 2) / valores.length;
    const distancia = (Math.max(0, Math.min(100, valor)) / 100) * radio;
    return `${(centro + Math.cos(angulo) * distancia).toFixed(2)},${(centro + Math.sin(angulo) * distancia).toFixed(2)}`;
  }).join(" ");
}

function RadarChart({
  territorio,
  onVariableChange,
  reducedMotion,
}: {
  territorio: EstadisticasTerritorio;
  onVariableChange: (variable: VariableMapa) => void;
  reducedMotion: boolean;
}) {
  const svgRef = useRef<SVGPolygonElement | null>(null);
  const size = 220;
  const center = size / 2;
  const radius = 70;
  const valores = valorDimensiones(territorio);
  const vertices = DIMENSIONES.map((dimension, indice) => {
    const angle = -Math.PI / 2 + (indice * Math.PI * 2) / DIMENSIONES.length;
    return {
      ...dimension,
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius,
      labelX: center + Math.cos(angle) * (radius + 24),
      labelY: center + Math.sin(angle) * (radius + 24),
    };
  });

  useEffect(() => {
    const polygon = svgRef.current;
    if (!polygon || reducedMotion) return;
    const perimeter = polygon.getTotalLength();
    polygon.style.transition = "none";
    polygon.style.strokeDasharray = `${perimeter}`;
    polygon.style.strokeDashoffset = `${perimeter}`;
    requestAnimationFrame(() => {
      polygon.style.transition = "stroke-dashoffset 500ms ease-out";
      polygon.style.strokeDashoffset = "0";
    });
    return () => {
      polygon.style.transition = "none";
    };
  }, [territorio.id, reducedMotion]);

  return (
    <div className="relative mx-auto w-full max-w-[250px]" aria-label={`Perfil derivado del territorio ${territorio.nombre}`}>
      <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Radar de siete dimensiones derivadas, escala de cero a cien" className="h-auto w-full overflow-visible">
        {[25, 50, 75, 100].map((nivel) => (
          <polygon key={nivel} points={puntosPoligono(Array(7).fill(nivel), center, radius)} fill="none" stroke="var(--border)" strokeWidth="1" />
        ))}
        {vertices.map((vertice) => (
          <line key={vertice.label} x1={center} y1={center} x2={vertice.x} y2={vertice.y} stroke="var(--border)" strokeWidth="1" />
        ))}
        <polygon
          ref={svgRef}
          points={puntosPoligono(valores, center, radius)}
          fill="var(--ember)"
          fillOpacity="0.2"
          stroke="var(--ember)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {vertices.map((vertice, indice) => (
          <g key={vertice.label} aria-hidden="true">
            <circle cx={center + Math.cos(-Math.PI / 2 + (indice * Math.PI * 2) / 7) * radius * valores[indice] / 100} cy={center + Math.sin(-Math.PI / 2 + (indice * Math.PI * 2) / 7) * radius * valores[indice] / 100} r="3" fill="var(--ember)" />
            <text x={vertice.labelX} y={vertice.labelY} textAnchor="middle" dominantBaseline="middle" className="fill-[var(--text-secondary)] text-[9px]">{vertice.label}</text>
          </g>
        ))}
      </svg>
      {vertices.map((vertice, indice) => (
        <Button
          key={vertice.variable}
          variant="unstyled"
          size="unstyled"
          className="absolute z-10 flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--surface-1)]/90 text-[9px] font-semibold text-[var(--text-primary)] shadow-sm ring-1 ring-[var(--border)] transition-colors hover:bg-[var(--ember)] hover:text-[var(--ember-foreground)] focus-visible:ring-2 focus-visible:ring-[var(--ember)]"
          style={{ left: `${(vertice.x / size) * 100}%`, top: `${(vertice.y / size) * 100}%`, transitionDuration: reducedMotion ? "0ms" : "300ms" }}
          aria-label={`Mostrar dimensión ${vertice.label} en el mapa (${valores[indice]} sobre 100)`}
          title={`${vertice.label}: ${Math.round(valores[indice])}/100`}
          onMouseEnter={() => onVariableChange(vertice.variable)}
          onFocus={() => onVariableChange(vertice.variable)}
          onClick={() => onVariableChange(vertice.variable)}
        >
          {Math.round(valores[indice])}
        </Button>
      ))}
    </div>
  );
}

function RankingChart({
  territorioId,
  variableMapa,
  onTerritorioChange,
  reducedMotion,
}: {
  territorioId: string;
  variableMapa: VariableMapa;
  onTerritorioChange: (id: string) => void;
  reducedMotion: boolean;
}) {
  const territorios = useMemo(() => [...ESTADISTICAS_TERRITORIOS].sort(
    (a, b) => obtenerValorVariable(b, variableMapa) - obtenerValorVariable(a, variableMapa),
  ), [variableMapa]);
  const promedio = territorios.reduce((total, item) => total + obtenerValorVariable(item, variableMapa), 0) / Math.max(territorios.length, 1);
  const maximo = Math.max(...territorios.map((item) => obtenerValorVariable(item, variableMapa)), 1);
  const meta = VARIABLE_META[variableMapa];
  const [tooltip, setTooltip] = useState<{ x: number; y: number; texto: string } | null>(null);

  function mostrarTooltip(event: MouseEvent<HTMLButtonElement> | FocusEvent<HTMLButtonElement>, item: EstadisticasTerritorio) {
    const bounds = event.currentTarget.parentElement?.getBoundingClientRect();
    if (!bounds) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const clientX = "clientX" in event ? event.clientX : rect.left + rect.width / 2;
    const clientY = "clientY" in event ? event.clientY : rect.top + rect.height / 2;
    const valor = obtenerValorVariable(item, variableMapa);
    setTooltip({ x: clientX - bounds.left, y: clientY - bounds.top, texto: `${valor.toLocaleString("es-CO")} ${meta.unidad} · ${valor - promedio >= 0 ? "+" : ""}${(valor - promedio).toLocaleString("es-CO", { maximumFractionDigits: 1 })} vs. promedio simple` });
  }

  return (
    <div className="relative">
      <div className="mb-2 flex justify-between text-[10px] text-[var(--text-tertiary)]"><span>Territorio</span><span>{meta.label} · {meta.unidad}</span></div>
      <div className="space-y-2">
        {territorios.map((item) => {
          const valor = obtenerValorVariable(item, variableMapa);
          const activo = territorioId === item.id;
          return (
            <Button
              key={item.id}
              variant="unstyled"
              size="unstyled"
              className={`group w-full rounded-md px-1.5 py-1 text-left transition-colors hover:bg-[var(--surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--ember)] ${activo ? "bg-[var(--ember-soft)]" : ""}`}
              style={{ transitionDuration: reducedMotion ? "0ms" : "300ms" }}
              aria-pressed={activo}
              aria-label={`Seleccionar ${item.nombre}: ${valor.toLocaleString("es-CO")} ${meta.unidad}`}
              onClick={() => onTerritorioChange(item.id)}
              onMouseMove={(event) => mostrarTooltip(event, item)}
              onMouseEnter={(event) => mostrarTooltip(event, item)}
              onMouseLeave={() => setTooltip(null)}
              onFocus={(event) => mostrarTooltip(event, item)}
              onBlur={() => setTooltip(null)}
            >
              <span className="mb-1 flex items-center justify-between gap-2 text-[10px]">
                <span className="truncate text-[var(--text-primary)]">{item.nombre}</span>
                <span className="shrink-0 font-semibold tabular text-[var(--text-primary)]">{valor.toLocaleString("es-CO")} {meta.unidad}</span>
              </span>
              <span className="block h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
                <span className={`block h-full rounded-full transition-[width,background-color] ease-out ${activo ? "bg-[var(--ember)]" : "bg-[var(--info)] group-hover:bg-[var(--ember)]"} ${activo && !reducedMotion ? "animate-pulse" : ""}`} style={{ width: `${Math.max(2, (valor / maximo) * 100)}%`, transitionDuration: reducedMotion ? "0ms" : "300ms" }} />
              </span>
            </Button>
          );
        })}
      </div>
      <p className="mt-3 text-[10px] text-[var(--text-tertiary)]">Diferencia frente al promedio simple de los territorios listados; no es una ponderación poblacional.</p>
      {tooltip && <div className="pointer-events-none absolute z-20 max-w-[90%] -translate-x-1/2 -translate-y-full rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-2 py-1 text-[10px] text-[var(--text-primary)] shadow-raised" style={{ left: tooltip.x, top: tooltip.y }}>{tooltip.texto}</div>}
    </div>
  );
}

function TendenciaChart({ territorio, reducedMotion }: { territorio: EstadisticasTerritorio; reducedMotion: boolean }) {
  const values = territorio.tendenciaAlertas;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const width = 320;
  const height = 160;
  const padding = { x: 22, y: 18 };
  const plotWidth = width - padding.x * 2;
  const plotHeight = height - padding.y * 2;
  const range = Math.max(max - min, 1);
  const points = values.map((value, index) => ({
    x: padding.x + (index / Math.max(values.length - 1, 1)) * plotWidth,
    y: padding.y + ((max - value) / range) * plotHeight,
    value,
  }));
  const line = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const area = `${line} L ${points.at(-1)?.x ?? 0} ${height - padding.y} L ${padding.x} ${height - padding.y} Z`;
  const average = values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
  const averageY = padding.y + ((max - average) / range) * plotHeight;
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  return (
    <div className="relative" onMouseLeave={() => setTooltip(null)}>
      <div className="mb-2 flex items-baseline justify-between"><span className="text-xl font-semibold tabular text-[var(--text-primary)]">{values.at(-1) ?? 0}</span><span className="text-[10px] text-[var(--text-tertiary)]">alertas · octubre</span></div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Tendencia de alertas referencial para ${territorio.nombre}, de mayo a octubre`} className="w-full overflow-visible">
        <defs><linearGradient id={`gradiente-alertas-${territorio.id}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--ember)" stopOpacity="0.3" /><stop offset="100%" stopColor="var(--ember)" stopOpacity="0" /></linearGradient></defs>
        <line x1={padding.x} x2={width - padding.x} y1={averageY} y2={averageY} stroke="var(--text-tertiary)" strokeDasharray="4 4" strokeWidth="1" />
        <path d={area} fill={`url(#gradiente-alertas-${territorio.id})`} className="transition-all" style={{ transitionDuration: reducedMotion ? "0ms" : "300ms" }} />
        <path d={line} fill="none" stroke="var(--ember)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-all" style={{ transitionDuration: reducedMotion ? "0ms" : "300ms" }} />
        {points.map((point, index) => (
          <g key={`${territorio.id}-${MESES[index]}`} onMouseMove={(event) => {
            const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
            if (bounds) setTooltip({ x: event.clientX - bounds.left, y: event.clientY - bounds.top, text: `${MESES[index]} 2026 · ${point.value} alertas` });
          }} onFocus={() => setTooltip({ x: point.x / width * 100, y: point.y / height * 100, text: `${MESES[index]} 2026 · ${point.value} alertas` })}>
            <circle cx={point.x} cy={point.y} r="11" fill="transparent" tabIndex={0} role="img" aria-label={`${MESES[index]} de 2026: ${point.value} alertas`} />
            <circle cx={point.x} cy={point.y} r="3.5" fill="var(--surface-1)" stroke="var(--ember)" strokeWidth="2" />
          </g>
        ))}
        {points.map((point, index) => <text key={MESES[index]} x={point.x} y={height - 2} textAnchor="middle" className="fill-[var(--text-tertiary)] text-[8px]">{MESES[index].slice(0, 3)}</text>)}
      </svg>
      {tooltip && <div className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-2 py-1 text-[10px] text-[var(--text-primary)] shadow-raised" style={{ left: tooltip.x, top: tooltip.y }}>{tooltip.text}</div>}
      <p className="mt-1 text-[10px] text-[var(--text-tertiary)]">Promedio: {average.toLocaleString("es-CO", { maximumFractionDigits: 1 })} · serie referencial de los datos disponibles</p>
    </div>
  );
}

function arcoDonut(cx: number, cy: number, radio: number, inicio: number, fin: number): string {
  const punto = (angulo: number) => ({ x: cx + radio * Math.cos(angulo), y: cy + radio * Math.sin(angulo) });
  const primero = punto(inicio);
  const segundo = punto(fin);
  const arcoGrande = fin - inicio > Math.PI ? 1 : 0;
  return `M ${primero.x} ${primero.y} A ${radio} ${radio} 0 ${arcoGrande} 1 ${segundo.x} ${segundo.y}`;
}

function DonutChart({ territorioId, variableMapa, onTerritorioChange, reducedMotion }: {
  territorioId: string;
  variableMapa: VariableMapa;
  onTerritorioChange: (id: string) => void;
  reducedMotion: boolean;
}) {
  const localidades = LOCALIDADES.map((id) => territorioActual(id));
  const total = localidades.reduce((suma, item) => suma + item.poblacion, 0);
  const centerTerritory = territorioActual(territorioId);
  const centerValue = obtenerValorVariable(centerTerritory, variableMapa);
  const colors: Record<(typeof LOCALIDADES)[number], string> = {
    "loc-1": "var(--territory-loc-1)",
    "loc-2": "var(--territory-loc-2)",
    "loc-3": "var(--territory-loc-3)",
  };
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const segmentos = localidades.reduce<Array<{ item: EstadisticasTerritorio; portion: number; start: number; end: number }>>((acumulados, item) => {
    const start = acumulados.at(-1)?.end ?? -Math.PI / 2;
    const portion = item.poblacion / total;
    acumulados.push({ item, portion, start, end: start + portion * Math.PI * 2 });
    return acumulados;
  }, []);

  return (
    <div className="relative" onMouseLeave={() => setTooltip(null)}>
      <svg viewBox="0 0 220 190" role="img" aria-label="Distribución referencial de población por localidad" className="mx-auto w-full max-w-[260px] overflow-visible">
        {segmentos.map(({ item, portion, start, end }) => {
          const selected = territorioId === item.id;
          const middle = (start + end) / 2;
          const offset = selected ? 5 : 0;
          const cx = 110 + Math.cos(middle) * offset;
          const cy = 90 + Math.sin(middle) * offset;
          return (
            <path
              key={item.id}
              d={arcoDonut(cx, cy, selected ? 59 : 55, start, end)}
              fill="none"
              stroke={colors[item.id as (typeof LOCALIDADES)[number]]}
              strokeWidth={selected ? 29 : 24}
              strokeLinecap="butt"
              className="cursor-pointer transition-all hover:opacity-80 focus-visible:outline-none"
              style={{ transitionDuration: reducedMotion ? "0ms" : "300ms" }}
              tabIndex={0}
              role="button"
              aria-label={`Seleccionar ${item.nombre}, población ${item.poblacion.toLocaleString("es-CO")}`}
              onClick={() => onTerritorioChange(item.id)}
              onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onTerritorioChange(item.id); } }}
              onMouseMove={(event) => {
                const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
                if (bounds) setTooltip({ x: event.clientX - bounds.left, y: event.clientY - bounds.top, text: `${item.nombre.split(" — ")[0]} · ${item.poblacion.toLocaleString("es-CO")} habitantes (${Math.round(portion * 100)}%)` });
              }}
              onFocus={() => setTooltip({ x: 50, y: 12, text: `${item.nombre.split(" — ")[0]} · ${item.poblacion.toLocaleString("es-CO")} habitantes` })}
            />
          );
        })}
        <text x="110" y="84" textAnchor="middle" className="fill-[var(--text-tertiary)] text-[9px]">{VARIABLE_META[variableMapa].label}</text>
        <text x="110" y="104" textAnchor="middle" className="fill-[var(--text-primary)] text-[15px] font-bold">{centerValue.toLocaleString("es-CO")}</text>
      </svg>
      <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1">
        {localidades.map((item) => <Button key={item.id} type="button" variant="unstyled" size="unstyled" className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-[10px] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--ember)]" onClick={() => onTerritorioChange(item.id)}><span aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: colors[item.id as (typeof LOCALIDADES)[number]] }} />{item.nombre.split(" — ")[0]}</Button>)}
      </div>
      <p className="mt-2 text-center text-[10px] text-[var(--text-tertiary)]">Población total referencial: {total.toLocaleString("es-CO")}</p>
      {tooltip && <div className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-2 py-1 text-[10px] text-[var(--text-primary)] shadow-raised" style={{ left: tooltip.x, top: tooltip.y }}>{tooltip.text}</div>}
    </div>
  );
}

export function GeovisorCharts({ territorioId, variableMapa, onTerritorioChange, onVariableChange }: GeovisorChartsProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const territorio = territorioActual(territorioId);
  const variableLabel = VARIABLE_META[variableMapa].label;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">Exploración interactiva · {variableLabel}</p>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Análisis estadístico territorial</h2>
        </div>
        <p className="text-xs text-[var(--text-secondary)]">Selecciona una gráfica o territorio; el mapa y las gráficas comparten la selección.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-sm" aria-label="Perfil multidimensional derivado">
          {encabezado("Perfil multidimensional", territorio, "Indicadores derivados · 0–100")}
          <RadarChart territorio={territorio} onVariableChange={onVariableChange} reducedMotion={reducedMotion} />
          <p className="mt-3 text-[10px] leading-relaxed text-[var(--text-tertiary)]">Exploración construida con fórmulas derivadas; no equivale a una medición oficial de las dimensiones ONU.</p>
        </article>
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-sm" aria-label="Ranking de territorios">
          {encabezado("Ranking territorial", territorio, "Comparativa")}
          <RankingChart territorioId={territorioId} variableMapa={variableMapa} onTerritorioChange={onTerritorioChange} reducedMotion={reducedMotion} />
        </article>
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-sm" aria-label="Tendencia de alertas">
          {encabezado("Tendencia de alertas", territorio, "Mayo–octubre 2026")}
          <TendenciaChart territorio={territorio} reducedMotion={reducedMotion} />
        </article>
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-sm" aria-label="Distribución de población por localidad">
          {encabezado("Población por localidad", territorio, "Distribución referencial")}
          <DonutChart territorioId={territorioId} variableMapa={variableMapa} onTerritorioChange={onTerritorioChange} reducedMotion={reducedMotion} />
        </article>
      </div>
    </div>
  );
}
