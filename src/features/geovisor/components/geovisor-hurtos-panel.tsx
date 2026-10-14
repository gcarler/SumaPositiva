"use client";

import { useMemo, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldAlert,
  Calendar,
  Layers,
  MapPin,
  TrendingUp,
  Flame,
  CheckCircle2,
  RefreshCw,
  BarChart3,
  Table as TableIcon,
  Upload,
  Download,
  Search,
  Filter,
  FileText,
  ChevronLeft,
  ChevronRight,
  Database,
  Eye,
  Trash2,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Label } from "@/shared/ui/label";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  obtenerResumenHurtos,
  obtenerPoligonosHurtosGeojson,
  explorarRegistrosHurtos,
  type DelitoTipo,
  type ResumenHurtosResponse,
  type ExploradorHurtosResponse,
} from "../services/hurtos-api";

export type ModoHurtos = "resumen" | "procesador" | "gestor";

export interface GeovisorHurtosPanelProps {
  delitoSeleccionado?: string | null;
  onDelitoChange?: (delito: string | null) => void;
  anioSeleccionado?: number | null;
  onAnioChange?: (anio: number | null) => void;
  onActivarCapaMapa?: (delito: string) => void;
  onCargarGeojsonPersonalizado?: (geojson: unknown, nombreCapa: string, color: string) => void;
  modoInicial?: ModoHurtos;
}

const OPCIONES_DELITOS: Array<{ id: string; label: string; canonico: DelitoTipo | null; color: string }> = [
  { id: "TODOS", label: "Todos los Hurtos", canonico: null, color: "#ef4444" },
  { id: "hurto_motocicletas", label: "Hurto a Motocicletas", canonico: "HURTO MOTOCICLETA", color: "#f97316" },
  { id: "hurto_residencias", label: "Hurto a Residencias", canonico: "HURTO RESIDENCIAS", color: "#8b5cf6" },
  { id: "hurto_comercio", label: "Hurto a Comercio", canonico: "HURTO COMERCIO", color: "#06b6d4" },
];

const ANIOS_DISPONIBLES = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018];

const OPCIONES_AGRUPACION = [
  { id: "armas_medios", label: "Modalidad / Arma Empleada" },
  { id: "clase_sitio", label: "Clase de Sitio de Ocurrencia" },
  { id: "dia_semana", label: "Día de la Semana" },
  { id: "mes", label: "Mes del Año" },
  { id: "anio", label: "Año de Registro" },
  { id: "delito", label: "Tipo de Delito" },
  { id: "zona", label: "Zona Urbana vs Rural" },
];

const COLORES_PRESET_CAPA = [
  { hex: "#e85d04", nombre: "Ember / Naranja Institucional" },
  { hex: "#3a86ff", nombre: "Azul Seguridad" },
  { hex: "#16a34a", nombre: "Verde Esmeralda" },
  { hex: "#8b5cf6", nombre: "Púrpura Residencial" },
  { hex: "#06b6d4", nombre: "Cyan Comercial" },
];

interface ArchivoGeojsonInfo {
  nombre: string;
  tamanoKb: number;
  featuresCount: number;
  tiposGeometria: string[];
  propiedades: string[];
  muestraFilas: Array<Record<string, unknown>>;
  geojson: unknown;
  color: string;
}

export function GeovisorHurtosPanel({
  delitoSeleccionado = null,
  onDelitoChange,
  anioSeleccionado = null,
  onAnioChange,
  onActivarCapaMapa,
  onCargarGeojsonPersonalizado,
  modoInicial = "resumen",
}: GeovisorHurtosPanelProps) {
  // Modo de navegación activo en la herramienta
  const [modo, setModo] = useState<ModoHurtos>(modoInicial);

  // Filtros compartidos y de analítica
  const [zonaFiltro, setZonaFiltro] = useState<string>("TODAS");
  const delitoActivo = delitoSeleccionado ?? "TODOS";
  const anioActivo = anioSeleccionado;

  // Filtros avanzados del Procesador y Tabla GeoJSON
  const [busquedaTexto, setBusquedaTexto] = useState<string>("");
  const [mesFiltro, setMesFiltro] = useState<string>("TODOS");
  const [diaFiltro, setDiaFiltro] = useState<string>("TODOS");
  const [armasFiltro, setArmasFiltro] = useState<string>("TODOS");
  const [sitioFiltro, setSitioFiltro] = useState<string>("TODOS");
  const [agruparPor, setAgruparPor] = useState<string>("armas_medios");
  const [paginaOffset, setPaginaOffset] = useState<number>(0);
  const [limitePorPagina, setLimitePorPagina] = useState<number>(25);
  const [exportando, setExportando] = useState<boolean>(false);

  // Estado del Gestor e Importador de archivos GeoJSON en cliente
  const [archivoImportado, setArchivoImportado] = useState<ArchivoGeojsonInfo | null>(null);
  const [errorImportacion, setErrorImportacion] = useState<string | null>(null);
  const [colorCapaPersonalizada, setColorCapaPersonalizada] = useState<string>("#e85d04");
  const [capaPersonalizadaPintada, setCapaPersonalizadaPintada] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 1. Consulta del Resumen y Gráficos (Modo 1)
  const { data: resumen, isLoading: cargandoResumen, refetch: refetchResumen } = useQuery<ResumenHurtosResponse>({
    queryKey: ["analitica-hurtos", delitoActivo, anioActivo, zonaFiltro],
    queryFn: () =>
      obtenerResumenHurtos({
        delito: delitoActivo === "TODOS" ? undefined : delitoActivo,
        anio: anioActivo ?? undefined,
        zona: zonaFiltro === "TODAS" ? undefined : zonaFiltro,
      }),
    staleTime: 60_000,
  });

  // 2. Consulta del Procesador y Tabla GeoJSON (Modo 2)
  const { data: explorador, isLoading: cargandoExplorador, refetch: refetchExplorador } = useQuery<ExploradorHurtosResponse>({
    queryKey: [
      "explorador-hurtos",
      delitoActivo,
      anioActivo,
      zonaFiltro,
      mesFiltro,
      diaFiltro,
      armasFiltro,
      sitioFiltro,
      busquedaTexto,
      agruparPor,
      limitePorPagina,
      paginaOffset,
    ],
    queryFn: () =>
      explorarRegistrosHurtos({
        delito: delitoActivo === "TODOS" ? undefined : delitoActivo,
        anio: anioActivo ?? undefined,
        zona: zonaFiltro === "TODAS" ? undefined : zonaFiltro,
        mes: mesFiltro === "TODOS" ? undefined : mesFiltro,
        dia_semana: diaFiltro === "TODOS" ? undefined : diaFiltro,
        armas_medios: armasFiltro === "TODOS" ? undefined : armasFiltro,
        clase_sitio: sitioFiltro === "TODOS" ? undefined : sitioFiltro,
        busqueda: busquedaTexto.trim() ? busquedaTexto.trim() : undefined,
        agrupar_por: agruparPor,
        limit: limitePorPagina,
        offset: paginaOffset,
      }),
    staleTime: 30_000,
  });

  const maxCasosAnual = useMemo(() => {
    if (!resumen?.serie_anual || resumen.serie_anual.length === 0) return 1;
    return Math.max(...resumen.serie_anual.map((item) => item.cantidad), 1);
  }, [resumen]);

  const maxCasosMensual = useMemo(() => {
    if (!resumen?.serie_mensual || resumen.serie_mensual.length === 0) return 1;
    return Math.max(...resumen.serie_mensual.map((item) => item.cantidad), 1);
  }, [resumen]);

  const urbanaInfo = resumen?.distribucion_zona.find((z) => z.zona === "URBANA");
  const ruralInfo = resumen?.distribucion_zona.find((z) => z.zona === "RURAL");

  // Procesamiento / Exportación CSV
  const handleExportarCsv = () => {
    setExportando(true);
    try {
      const registros = explorador?.registros ?? [];
      const encabezados = ["ID", "Delito", "Año", "Mes", "Día", "Zona", "Polígono", "Arma/Medio", "Clase Sitio", "Cantidad"];
      const filasCsv = registros.map((r) =>
        [
          `"${r.id}"`,
          `"${r.delito}"`,
          r.anio,
          `"${r.mes}"`,
          `"${r.dia_semana}"`,
          `"${r.zona}"`,
          r.poligono_id,
          `"${r.armas_medios}"`,
          `"${r.clase_sitio}"`,
          r.cantidad,
        ].join(",")
      );
      const contenidoCsv = [encabezados.join(","), ...filasCsv].join("\n");
      const blob = new Blob(["\uFEFF" + contenidoCsv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `hurtos_cartagena_${delitoActivo}_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportando(false);
    }
  };

  // Exportación GeoJSON Filtrado
  const handleExportarGeojson = async () => {
    setExportando(true);
    try {
      const fc = await obtenerPoligonosHurtosGeojson({
        delito: delitoActivo === "TODOS" ? undefined : delitoActivo,
        anio: anioActivo ?? undefined,
        zona: zonaFiltro === "TODAS" ? undefined : zonaFiltro,
      });
      const blob = new Blob([JSON.stringify(fc, null, 2)], { type: "application/geo+json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `poligonos_hurtos_cartagena_${new Date().toISOString().slice(0, 10)}.geojson`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportando(false);
    }
  };

  // Procesador / Importador de archivo GeoJSON en cliente
  const handleArchivoSeleccionado = (file: File) => {
    setErrorImportacion(null);
    if (!file.name.endsWith(".geojson") && !file.name.endsWith(".json")) {
      setErrorImportacion("El archivo debe tener extensión .geojson o .json");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);

        let features: Array<{ properties?: Record<string, unknown>; geometry?: { type: string } }> = [];
        if (parsed.type === "FeatureCollection" && Array.isArray(parsed.features)) {
          features = parsed.features;
        } else if (parsed.type === "Feature") {
          features = [parsed];
        } else {
          throw new Error("El archivo no contiene un FeatureCollection ni un Feature GeoJSON válido.");
        }

        const tiposSet = new Set<string>();
        const propsSet = new Set<string>();
        const muestra: Array<Record<string, unknown>> = [];

        features.forEach((feat, index) => {
          if (feat.geometry?.type) tiposSet.add(feat.geometry.type);
          if (feat.properties) {
            Object.keys(feat.properties).forEach((k) => propsSet.add(k));
            if (index < 5) muestra.push(feat.properties);
          }
        });

        setArchivoImportado({
          nombre: file.name,
          tamanoKb: Math.round(file.size / 1024),
          featuresCount: features.length,
          tiposGeometria: Array.from(tiposSet),
          propiedades: Array.from(propsSet),
          muestraFilas: muestra,
          geojson: parsed,
          color: colorCapaPersonalizada,
        });
      } catch (err) {
        setErrorImportacion(err instanceof Error ? err.message : "Error al procesar el archivo GeoJSON.");
      }
    };
    reader.onerror = () => {
      setErrorImportacion("Fallo al leer el archivo desde el disco.");
    };
    reader.readAsText(file);
  };

  const handlePintarCapaImportada = () => {
    if (!archivoImportado) return;
    onCargarGeojsonPersonalizado?.(archivoImportado.geojson, archivoImportado.nombre, colorCapaPersonalizada);
    setCapaPersonalizadaPintada(true);
  };

  const handleLimpiarCapaImportada = () => {
    onCargarGeojsonPersonalizado?.(null, "", "");
    setCapaPersonalizadaPintada(false);
  };

  return (
    <div
      data-testid="geovisor-hurtos-panel"
      className="flex flex-col gap-4 p-4 text-[var(--text-primary)]"
    >
      {/* 1. Encabezado Principal y Barra de Navegación de 3 Modos */}
      <div className="flex flex-col gap-3 border-b border-[var(--border)] pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-[var(--danger)]/10 text-[var(--danger)]">
              <ShieldAlert className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-tight text-[var(--text-primary)]">
                  Analítica Espacial de Hurtos SIEDCO
                </h2>
                <Badge variant="outline" className="text-[10px] text-[var(--danger)] border-[var(--danger)]/30">
                  2018–2026
                </Badge>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                12.280 registros georreferenciados consolidados por Policía Nacional y SIEDCO
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onActivarCapaMapa && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onActivarCapaMapa(delitoActivo)}
                className="h-8 gap-1 text-xs text-[var(--ember)] border-[var(--ember)]/30 hover:bg-[var(--ember)]/10"
                title="Activar y destacar capa delictiva en el mapa central"
              >
                <MapPin className="size-3.5" />
                <span>Ver en Mapa</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchResumen();
                refetchExplorador();
              }}
              disabled={cargandoResumen || cargandoExplorador}
              className="h-8 gap-1 text-xs"
              title="Actualizar datos analíticos"
            >
              <RefreshCw className={`size-3.5 ${cargandoResumen || cargandoExplorador ? "animate-spin" : ""}`} />
              <span>Actualizar</span>
            </Button>
          </div>
        </div>

        {/* Barra de 3 Modos de Trabajo (Workbench Tabs) */}
        <div
          role="tablist"
          aria-label="Modos de la herramienta de Hurtos y GeoJSON"
          className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-1"
        >
          <Button
            role="tab"
            aria-selected={modo === "resumen"}
            variant={modo === "resumen" ? "default" : "ghost"}
            size="sm"
            onClick={() => setModo("resumen")}
            className="flex-1 sm:flex-none h-8 gap-1.5 text-xs font-semibold"
          >
            <BarChart3 className="size-3.5" />
            <span>1. Resumen y Gráficos</span>
          </Button>

          <Button
            role="tab"
            aria-selected={modo === "procesador"}
            variant={modo === "procesador" ? "default" : "ghost"}
            size="sm"
            onClick={() => setModo("procesador")}
            className="flex-1 sm:flex-none h-8 gap-1.5 text-xs font-semibold"
          >
            <TableIcon className="size-3.5" />
            <span>2. Procesador y Tabla (12.280 registros)</span>
          </Button>

          <Button
            role="tab"
            aria-selected={modo === "gestor"}
            variant={modo === "gestor" ? "default" : "ghost"}
            size="sm"
            onClick={() => setModo("gestor")}
            className="flex-1 sm:flex-none h-8 gap-1.5 text-xs font-semibold"
          >
            <Layers className="size-3.5" />
            <span>3. Gestor e Importador GeoJSON</span>
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODO 1: RESUMEN Y GRÁFICOS */}
      {/* ========================================================================= */}
      {modo === "resumen" && (
        <div className="flex flex-col gap-4">
          {/* Botones de Pintado Rápido en Mapa */}
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3">
            <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              Pintado Rápido de Capas GeoJSON:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onActivarCapaMapa?.("hurto_motocicletas");
                  onDelitoChange?.("hurto_motocicletas");
                }}
                className="h-7 text-xs border-[var(--border)] hover:bg-[var(--surface-2)]"
              >
                <span className="size-2 rounded-full mr-1.5" style={{ backgroundColor: "#f97316" }} />
                Pintar en Mapa: Motocicletas
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onActivarCapaMapa?.("hurto_residencias");
                  onDelitoChange?.("hurto_residencias");
                }}
                className="h-7 text-xs border-[var(--border)] hover:bg-[var(--surface-2)]"
              >
                <span className="size-2 rounded-full mr-1.5" style={{ backgroundColor: "#8b5cf6" }} />
                Pintar: Residencias
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onActivarCapaMapa?.("hurto_comercio");
                  onDelitoChange?.("hurto_comercio");
                }}
                className="h-7 text-xs border-[var(--border)] hover:bg-[var(--surface-2)]"
              >
                <span className="size-2 rounded-full mr-1.5" style={{ backgroundColor: "#06b6d4" }} />
                Pintar: Comercio
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onActivarCapaMapa?.("TODOS");
                  onDelitoChange?.(null);
                }}
                className="h-7 text-xs border-[var(--border)] hover:bg-[var(--surface-2)]"
              >
                <span className="size-2 rounded-full mr-1.5" style={{ backgroundColor: "#ef4444" }} />
                Pintar: Consolidado
              </Button>
            </div>
          </div>

          {/* Filtros Interactivos: Delito, Año y Zona */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="select-delito-hurtos" className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                Tipo de Delito
              </Label>
              <Select
                value={delitoActivo}
                onValueChange={(val) => onDelitoChange?.(val === "TODOS" ? null : val)}
              >
                <SelectTrigger id="select-delito-hurtos" className="h-9 text-xs" aria-label="Seleccionar tipo de delito">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPCIONES_DELITOS.map((opc) => (
                    <SelectItem key={opc.id} value={opc.id} className="text-xs">
                      <span className="flex items-center gap-2">
                        <span className="size-2 rounded-full" style={{ backgroundColor: opc.color }} />
                        {opc.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="select-anio-hurtos" className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                Periodo / Año
              </Label>
              <Select
                value={anioActivo ? String(anioActivo) : "TODOS"}
                onValueChange={(val) => onAnioChange?.(val === "TODOS" ? null : Number(val))}
              >
                <SelectTrigger id="select-anio-hurtos" className="h-9 text-xs" aria-label="Seleccionar año">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS" className="text-xs">
                    Histórico Consolidado (2018–2026)
                  </SelectItem>
                  {ANIOS_DISPONIBLES.map((a) => (
                    <SelectItem key={a} value={String(a)} className="text-xs">
                      Año {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="select-zona-hurtos" className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                Ámbito Territorial
              </Label>
              <Select value={zonaFiltro} onValueChange={setZonaFiltro}>
                <SelectTrigger id="select-zona-hurtos" className="h-9 text-xs" aria-label="Seleccionar ámbito territorial">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODAS" className="text-xs">Distrito Completo (Urbano + Rural)</SelectItem>
                  <SelectItem value="URBANA" className="text-xs">Perímetro Urbano (75.3 km²)</SelectItem>
                  <SelectItem value="RURAL" className="text-xs">Zona Rural e Insular (597.4 km²)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tarjetas KPI */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3 shadow-sm">
              <div className="flex items-center justify-between text-[11px] text-[var(--text-tertiary)] font-medium">
                <span>Total Incidentes</span>
                <Flame className="size-3.5 text-[var(--danger)]" />
              </div>
              <div className="mt-1 text-xl font-bold tracking-tight text-[var(--text-primary)]">
                {cargandoResumen ? "…" : (resumen?.total_casos ?? 0).toLocaleString("es-CO")}
              </div>
              <p className="mt-0.5 text-[10px] text-[var(--text-secondary)]">
                {anioActivo ? `Año ${anioActivo}` : "Acumulado 2018–2026"}
              </p>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3 shadow-sm">
              <div className="flex items-center justify-between text-[11px] text-[var(--text-tertiary)] font-medium">
                <span>Perímetro Urbano</span>
                <MapPin className="size-3.5 text-[var(--ember)]" />
              </div>
              <div className="mt-1 text-xl font-bold tracking-tight text-[var(--text-primary)]">
                {cargandoResumen ? "…" : (urbanaInfo?.cantidad ?? 0).toLocaleString("es-CO")}
              </div>
              <p className="mt-0.5 text-[10px] text-[var(--text-secondary)]">
                {urbanaInfo?.porcentaje ?? 0}% del total distrital
              </p>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3 shadow-sm">
              <div className="flex items-center justify-between text-[11px] text-[var(--text-tertiary)] font-medium">
                <span>Zona Rural / Insular</span>
                <Layers className="size-3.5 text-[var(--info)]" />
              </div>
              <div className="mt-1 text-xl font-bold tracking-tight text-[var(--text-primary)]">
                {cargandoResumen ? "…" : (ruralInfo?.cantidad ?? 0).toLocaleString("es-CO")}
              </div>
              <p className="mt-0.5 text-[10px] text-[var(--text-secondary)]">
                {ruralInfo?.porcentaje ?? 0}% del total distrital
              </p>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3 shadow-sm">
              <div className="flex items-center justify-between text-[11px] text-[var(--text-tertiary)] font-medium">
                <span>Modalidad Predominante</span>
                <CheckCircle2 className="size-3.5 text-[var(--success)]" />
              </div>
              <div className="mt-1 truncate text-xs font-bold text-[var(--text-primary)]" title={resumen?.top_armas[0]?.categoria ?? "N/A"}>
                {cargandoResumen ? "…" : (resumen?.top_armas[0]?.categoria ?? "N/A")}
              </div>
              <p className="mt-0.5 text-[10px] text-[var(--text-secondary)]">
                {resumen?.top_armas[0]?.porcentaje ?? 0}% de los eventos
              </p>
            </div>
          </div>

          {/* Gráficos: Serie Anual y Serie Mensual */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Evolución Histórica Anual (2018–2026)
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Casos registrados por año en Cartagena
                  </p>
                </div>
                <Calendar className="size-4 text-[var(--text-tertiary)]" />
              </div>

              <div className="flex h-36 items-end gap-1.5 pt-4">
                {resumen?.serie_anual.map((item) => {
                  const alturaPct = Math.max(8, (item.cantidad / maxCasosAnual) * 100);
                  const esSeleccionado = anioActivo === Number(item.etiqueta);
                  return (
                    <Button
                      key={item.etiqueta}
                      variant="unstyled"
                      size="unstyled"
                      onClick={() => onAnioChange?.(esSeleccionado ? null : Number(item.etiqueta))}
                      className="group relative flex flex-1 flex-col items-center h-full justify-end focus:outline-none p-0"
                      title={`${item.etiqueta}: ${item.cantidad.toLocaleString("es-CO")} casos (${item.porcentaje}%)`}
                    >
                      <div
                        className={`w-full rounded-t transition-all ${
                          esSeleccionado
                            ? "bg-[var(--danger)] ring-2 ring-[var(--danger)]/50"
                            : "bg-[var(--ember)]/80 hover:bg-[var(--ember)]"
                        }`}
                        style={{ height: `${alturaPct}%` }}
                      />
                      <span className="mt-1 text-[10px] font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">
                        {item.etiqueta.slice(2)}
                      </span>
                      <div className="pointer-events-none absolute -top-6 hidden rounded bg-[var(--surface-2)] px-1 py-0.5 text-[9px] font-bold text-[var(--text-primary)] shadow group-hover:block z-10 whitespace-nowrap">
                        {item.cantidad.toLocaleString("es-CO")}
                      </div>
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Distribución Mensual
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    {anioActivo ? `Meses del año ${anioActivo}` : "Consolidado mensual histórico"}
                  </p>
                </div>
                <TrendingUp className="size-4 text-[var(--text-tertiary)]" />
              </div>

              <div className="flex h-36 items-end gap-1 pt-4">
                {resumen?.serie_mensual.map((item) => {
                  const alturaPct = Math.max(8, (item.cantidad / maxCasosMensual) * 100);
                  const mesCorto = item.etiqueta.slice(0, 3);
                  return (
                    <div
                      key={item.etiqueta}
                      className="group relative flex flex-1 flex-col items-center h-full justify-end"
                      title={`${item.etiqueta}: ${item.cantidad.toLocaleString("es-CO")} casos`}
                    >
                      <div
                        className="w-full rounded-t bg-[var(--info)]/80 transition-all hover:bg-[var(--info)]"
                        style={{ height: `${alturaPct}%` }}
                      />
                      <span className="mt-1 text-[9px] text-[var(--text-secondary)]">
                        {mesCorto}
                      </span>
                      <div className="pointer-events-none absolute -top-6 hidden rounded bg-[var(--surface-2)] px-1 py-0.5 text-[9px] font-bold text-[var(--text-primary)] shadow group-hover:block z-10 whitespace-nowrap">
                        {item.cantidad}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Top Armas / Medios y Top Clases de Sitio */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-sm">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                Top 5 Modalidades / Armas Empleadas
              </h3>
              <div className="flex flex-col gap-2 pt-1">
                {resumen?.top_armas.map((arma, idx) => (
                  <div key={arma.categoria} className="flex flex-col gap-0.5 text-xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="truncate text-[var(--text-primary)] font-medium">
                        {idx + 1}. {arma.categoria}
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums text-[var(--text-secondary)]">
                        {arma.cantidad.toLocaleString("es-CO")} ({arma.porcentaje}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[var(--surface-2)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--danger)]"
                        style={{ width: `${Math.min(100, arma.porcentaje * 1.5)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-sm">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                Top 5 Clases de Sitio de Ocurrencia
              </h3>
              <div className="flex flex-col gap-2 pt-1">
                {resumen?.top_sitios.map((sitio, idx) => (
                  <div key={sitio.categoria} className="flex flex-col gap-0.5 text-xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="truncate text-[var(--text-primary)] font-medium">
                        {idx + 1}. {sitio.categoria}
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums text-[var(--text-secondary)]">
                        {sitio.cantidad.toLocaleString("es-CO")} ({sitio.porcentaje}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[var(--surface-2)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--ember)]"
                        style={{ width: `${Math.min(100, sitio.porcentaje * 1.5)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 p-3">
            <span className="text-xs text-[var(--text-secondary)]">
              ¿Deseas explorar registro a registro o cruzar variables avanzadas?
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModo("procesador")}
              className="text-xs gap-1.5"
            >
              <span>Abrir Procesador y Tabla (12.280 registros)</span>
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODO 2: PROCESADOR Y TABLA DE DATOS GEOJSON (12.280 REGISTROS + PIVOT)   */}
      {/* ========================================================================= */}
      {modo === "procesador" && (
        <div className="flex flex-col gap-4">
          {/* Barra de Filtros Avanzados y Buscador */}
          <div className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-2.5">
              <div className="flex items-center gap-2">
                <Filter className="size-4 text-[var(--ember)]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  Filtros Multicriterio de los 12.280 Registros GeoJSON
                </span>
              </div>

              {/* Botones de Exportación */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportarCsv}
                  disabled={exportando}
                  className="h-8 gap-1.5 text-xs text-[var(--text-primary)]"
                  title="Descargar archivo CSV de los datos filtrados"
                >
                  <Download className="size-3.5 text-[var(--success)]" />
                  <span>Exportar CSV Procesado</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportarGeojson}
                  disabled={exportando}
                  className="h-8 gap-1.5 text-xs text-[var(--text-primary)]"
                  title="Descargar polígonos GeoJSON enriquecidos"
                >
                  <FileText className="size-3.5 text-[var(--info)]" />
                  <span>Exportar GeoJSON Filtrado</span>
                </Button>
              </div>
            </div>

            {/* Fila 1 de Filtros: Buscador, Delito, Año, Zona */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-4">
              <div className="flex flex-col gap-1 sm:col-span-2">
                <Label htmlFor="buscar-texto-hurtos" className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                  Búsqueda Textual Libre
                </Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--text-tertiary)]" />
                  <Input
                    id="buscar-texto-hurtos"
                    value={busquedaTexto}
                    onChange={(e) => {
                      setBusquedaTexto(e.target.value);
                      setPaginaOffset(0);
                    }}
                    placeholder="Filtrar por texto (arma, sitio, mes, día...)"
                    className="pl-8 h-8 text-xs"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <Label htmlFor="filtro-delito-tab" className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                  Delito
                </Label>
                <Select
                  value={delitoActivo}
                  onValueChange={(val) => {
                    onDelitoChange?.(val === "TODOS" ? null : val);
                    setPaginaOffset(0);
                  }}
                >
                  <SelectTrigger id="filtro-delito-tab" className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPCIONES_DELITOS.map((o) => (
                      <SelectItem key={o.id} value={o.id} className="text-xs">
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <Label htmlFor="filtro-anio-tab" className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                  Año
                </Label>
                <Select
                  value={anioActivo ? String(anioActivo) : "TODOS"}
                  onValueChange={(val) => {
                    onAnioChange?.(val === "TODOS" ? null : Number(val));
                    setPaginaOffset(0);
                  }}
                >
                  <SelectTrigger id="filtro-anio-tab" className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS" className="text-xs">Todos los Años (2018–2026)</SelectItem>
                    {ANIOS_DISPONIBLES.map((a) => (
                      <SelectItem key={a} value={String(a)} className="text-xs">
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Fila 2 de Filtros: Mes, Día, Zona, Arma, Sitio, Selector de Agrupación (Pivot) */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
              <div className="flex flex-col gap-1">
                <Label htmlFor="filtro-mes-tab" className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                  Mes
                </Label>
                <Select
                  value={mesFiltro}
                  onValueChange={(val) => {
                    setMesFiltro(val);
                    setPaginaOffset(0);
                  }}
                >
                  <SelectTrigger id="filtro-mes-tab" className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS" className="text-xs">Todos los Meses</SelectItem>
                    {(explorador?.catalogos.meses ?? [
                      "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
                      "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE",
                    ]).map((m) => (
                      <SelectItem key={m} value={m} className="text-xs">
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <Label htmlFor="filtro-dia-tab" className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                  Día Semana
                </Label>
                <Select
                  value={diaFiltro}
                  onValueChange={(val) => {
                    setDiaFiltro(val);
                    setPaginaOffset(0);
                  }}
                >
                  <SelectTrigger id="filtro-dia-tab" className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS" className="text-xs">Todos los Días</SelectItem>
                    {(explorador?.catalogos.dias_semana ?? [
                      "LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO",
                    ]).map((d) => (
                      <SelectItem key={d} value={d} className="text-xs">
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <Label htmlFor="filtro-zona-tab" className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                  Zona
                </Label>
                <Select
                  value={zonaFiltro}
                  onValueChange={(val) => {
                    setZonaFiltro(val);
                    setPaginaOffset(0);
                  }}
                >
                  <SelectTrigger id="filtro-zona-tab" className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODAS" className="text-xs">Urbana + Rural</SelectItem>
                    <SelectItem value="URBANA" className="text-xs">Urbana</SelectItem>
                    <SelectItem value="RURAL" className="text-xs">Rural / Insular</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <Label htmlFor="filtro-arma-tab" className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                  Arma / Medio
                </Label>
                <Select
                  value={armasFiltro}
                  onValueChange={(val) => {
                    setArmasFiltro(val);
                    setPaginaOffset(0);
                  }}
                >
                  <SelectTrigger id="filtro-arma-tab" className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="TODOS" className="text-xs">Todas las Armas</SelectItem>
                    {(explorador?.catalogos.top_armas_medios ?? []).map((a) => (
                      <SelectItem key={a} value={a} className="text-xs">
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <Label htmlFor="filtro-sitio-tab" className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                  Clase de Sitio
                </Label>
                <Select
                  value={sitioFiltro}
                  onValueChange={(val) => {
                    setSitioFiltro(val);
                    setPaginaOffset(0);
                  }}
                >
                  <SelectTrigger id="filtro-sitio-tab" className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="TODOS" className="text-xs">Todos los Sitios</SelectItem>
                    {(explorador?.catalogos.top_clases_sitio ?? []).map((s) => (
                      <SelectItem key={s} value={s} className="text-xs">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <Label htmlFor="select-agrupar-por" className="text-[11px] font-semibold text-[var(--ember)] uppercase tracking-wider">
                  Agrupar y Procesar por
                </Label>
                <Select value={agruparPor} onValueChange={setAgruparPor}>
                  <SelectTrigger id="select-agrupar-por" className="h-8 text-xs border-[var(--ember)]/40 font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPCIONES_AGRUPACION.map((ag) => (
                      <SelectItem key={ag.id} value={ag.id} className="text-xs">
                        {ag.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Tabla Dinámica (Pivot Analítico) */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  Procesamiento Agrupado Dinámico (Pivot)
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Agrupación según &quot;{OPCIONES_AGRUPACION.find((o) => o.id === agruparPor)?.label}&quot; sobre el filtro actual
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-semibold tabular-nums">
                {explorador?.agrupacion.length ?? 0} categorías agrupadas
              </Badge>
            </div>

            <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--surface-2)] text-[var(--text-secondary)] uppercase text-[10px] tracking-wider border-b border-[var(--border)]">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Categoría / Dimensión</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Registros GeoJSON</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Total Incidentes</th>
                    <th className="py-2.5 px-3 font-semibold text-right min-w-[12rem]">% Participación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {cargandoExplorador ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-xs text-[var(--text-secondary)]">
                        Procesando agrupación analítica…
                      </td>
                    </tr>
                  ) : explorador?.agrupacion.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-xs text-[var(--text-secondary)]">
                        No hay registros que coincidan con los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    explorador?.agrupacion.map((item, idx) => (
                      <tr key={`${item.categoria}-${idx}`} className="hover:bg-[var(--surface-2)]/50 transition-colors">
                        <td className="py-2 px-3 font-medium text-[var(--text-primary)] truncate max-w-[16rem]">
                          {item.categoria}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums text-[var(--text-secondary)]">
                          {item.registros.toLocaleString("es-CO")}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums font-bold text-[var(--text-primary)]">
                          {item.incidentes.toLocaleString("es-CO")}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-1.5 w-24 rounded-full bg-[var(--surface-2)] overflow-hidden">
                              <div
                                className="h-full rounded-full bg-[var(--ember)]"
                                style={{ width: `${Math.min(100, item.porcentaje)}%` }}
                              />
                            </div>
                            <span className="w-12 text-right tabular-nums font-medium text-[var(--text-secondary)]">
                              {item.porcentaje}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tabla Paginada de Registros GeoJSON */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  Registros GeoJSON Detallados
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Exploración tabular registro a registro con metadatos espaciales y policiales
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[var(--text-secondary)]">Filas por página:</span>
                <Select
                  value={String(limitePorPagina)}
                  onValueChange={(val) => {
                    setLimitePorPagina(Number(val));
                    setPaginaOffset(0);
                  }}
                >
                  <SelectTrigger className="h-7 w-20 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10" className="text-xs">10</SelectItem>
                    <SelectItem value="25" className="text-xs">25</SelectItem>
                    <SelectItem value="50" className="text-xs">50</SelectItem>
                    <SelectItem value="100" className="text-xs">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--surface-2)] text-[var(--text-secondary)] uppercase text-[10px] tracking-wider border-b border-[var(--border)]">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Delito</th>
                    <th className="py-2.5 px-3 font-semibold">Año / Mes</th>
                    <th className="py-2.5 px-3 font-semibold">Día</th>
                    <th className="py-2.5 px-3 font-semibold">Zona</th>
                    <th className="py-2.5 px-3 font-semibold">Arma / Modalidad</th>
                    <th className="py-2.5 px-3 font-semibold">Clase de Sitio</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Cant.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {cargandoExplorador ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-xs text-[var(--text-secondary)]">
                        Cargando registros tabulares…
                      </td>
                    </tr>
                  ) : explorador?.registros.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-xs text-[var(--text-secondary)]">
                        No se encontraron registros con los criterios seleccionados.
                      </td>
                    </tr>
                  ) : (
                    explorador?.registros.map((reg) => (
                      <tr key={reg.id} className="hover:bg-[var(--surface-2)]/50 transition-colors">
                        <td className="py-2 px-3 font-medium text-[var(--text-primary)]">
                          <span className="flex items-center gap-1.5">
                            <span
                              className="size-1.5 rounded-full"
                              style={{
                                backgroundColor:
                                  reg.delito.includes("MOTO")
                                    ? "#f97316"
                                    : reg.delito.includes("RESID")
                                    ? "#8b5cf6"
                                    : "#06b6d4",
                              }}
                            />
                            {reg.delito}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-[var(--text-secondary)] whitespace-nowrap">
                          {reg.anio} · {reg.mes}
                        </td>
                        <td className="py-2 px-3 text-[var(--text-secondary)]">
                          {reg.dia_semana}
                        </td>
                        <td className="py-2 px-3">
                          <Badge
                            variant="outline"
                            className={`text-[9px] ${
                              reg.zona === "URBANA"
                                ? "border-[var(--ember)]/30 text-[var(--ember)]"
                                : "border-[var(--info)]/30 text-[var(--info)]"
                            }`}
                          >
                            {reg.zona}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-[var(--text-secondary)] truncate max-w-[12rem]" title={reg.armas_medios}>
                          {reg.armas_medios}
                        </td>
                        <td className="py-2 px-3 text-[var(--text-secondary)] truncate max-w-[12rem]" title={reg.clase_sitio}>
                          {reg.clase_sitio}
                        </td>
                        <td className="py-2 px-3 text-right font-bold tabular-nums text-[var(--text-primary)]">
                          {reg.cantidad}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginador */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-3 text-xs text-[var(--text-secondary)]">
              <div>
                Mostrando{" "}
                <span className="font-semibold text-[var(--text-primary)]">
                  {explorador?.total_registros ? paginaOffset + 1 : 0}
                </span>{" "}
                a{" "}
                <span className="font-semibold text-[var(--text-primary)]">
                  {Math.min(paginaOffset + limitePorPagina, explorador?.total_registros ?? 0)}
                </span>{" "}
                de{" "}
                <span className="font-semibold text-[var(--text-primary)]">
                  {(explorador?.total_registros ?? 0).toLocaleString("es-CO")}
                </span>{" "}
                registros
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaginaOffset((p) => Math.max(0, p - limitePorPagina))}
                  disabled={paginaOffset === 0 || cargandoExplorador}
                  className="h-8 gap-1 text-xs"
                >
                  <ChevronLeft className="size-3.5" />
                  <span>Anterior</span>
                </Button>
                <span className="px-2 text-xs font-medium text-[var(--text-primary)]">
                  Página {Math.floor(paginaOffset / limitePorPagina) + 1} de{" "}
                  {Math.max(1, Math.ceil((explorador?.total_registros ?? 0) / limitePorPagina))}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaginaOffset((p) => p + limitePorPagina)}
                  disabled={
                    paginaOffset + limitePorPagina >= (explorador?.total_registros ?? 0) ||
                    cargandoExplorador
                  }
                  className="h-8 gap-1 text-xs"
                >
                  <span>Siguiente</span>
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODO 3: GESTOR DE CAPAS E IMPORTADOR GEOJSON EN EL NAVEGADOR              */}
      {/* ========================================================================= */}
      {modo === "gestor" && (
        <div className="flex flex-col gap-4">
          {/* Catálogo de Capas GeoJSON Oficiales de la Alcaldía / SIEDCO */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3 border-b border-[var(--border)] pb-2.5">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
                  <Database className="size-4 text-[var(--ember)]" />
                  Catálogo de Capas GeoJSON Oficiales SIEDCO (Google Drive)
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Archivos procesados y proyectados de EPSG:9377 a WGS84 EPSG:4326 con 18.242 eventos (2018–2026)
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-semibold">
                3 Capas Activas
              </Badge>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {/* Capa 1: Motocicletas */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 p-3.5 flex flex-col justify-between gap-3">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px] text-[var(--ember)] border-[var(--ember)]/30">
                      2.520 features
                    </Badge>
                    <span className="text-[10px] text-[var(--text-tertiary)] font-mono">EPSG:4326</span>
                  </div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)]">
                    Hurto_Motocicletas.geojson
                  </h4>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Dataset de hurtos a motocicletas con atributos de arma empleada, clase de sitio y zona.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[var(--border)]">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onActivarCapaMapa?.("hurto_motocicletas");
                      onDelitoChange?.("hurto_motocicletas");
                    }}
                    className="flex-1 h-7 text-xs text-[var(--ember)] border-[var(--ember)]/30 hover:bg-[var(--ember)]/10"
                  >
                    <Eye className="size-3 mr-1" />
                    Activar en Mapa
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onDelitoChange?.("hurto_motocicletas");
                      setModo("procesador");
                    }}
                    className="h-7 text-xs text-[var(--text-secondary)]"
                  >
                    Procesar
                  </Button>
                </div>
              </div>

              {/* Capa 2: Residencias */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 p-3.5 flex flex-col justify-between gap-3">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px] text-[var(--primary)] border-[var(--primary)]/30">
                      3.853 features
                    </Badge>
                    <span className="text-[10px] text-[var(--text-tertiary)] font-mono">EPSG:4326</span>
                  </div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)]">
                    Hurto_Residencias.geojson
                  </h4>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Dataset de penetración y hurto en viviendas y casas de habitación en Cartagena.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[var(--border)]">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onActivarCapaMapa?.("hurto_residencias");
                      onDelitoChange?.("hurto_residencias");
                    }}
                    className="flex-1 h-7 text-xs text-[var(--primary)] border-[var(--primary)]/30 hover:bg-[var(--primary)]/10"
                  >
                    <Eye className="size-3 mr-1" />
                    Activar en Mapa
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onDelitoChange?.("hurto_residencias");
                      setModo("procesador");
                    }}
                    className="h-7 text-xs text-[var(--text-secondary)]"
                  >
                    Procesar
                  </Button>
                </div>
              </div>

              {/* Capa 3: Comerciantes */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 p-3.5 flex flex-col justify-between gap-3">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px] text-[var(--info)] border-[var(--info)]/30">
                      5.907 features
                    </Badge>
                    <span className="text-[10px] text-[var(--text-tertiary)] font-mono">EPSG:4326</span>
                  </div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)]">
                    Hurto_Comerciantes.geojson
                  </h4>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Dataset de afectación a establecimientos comerciales, locales y almacenes.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[var(--border)]">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onActivarCapaMapa?.("hurto_comercio");
                      onDelitoChange?.("hurto_comercio");
                    }}
                    className="flex-1 h-7 text-xs text-[var(--info)] border-[var(--info)]/30 hover:bg-[var(--info)]/10"
                  >
                    <Eye className="size-3 mr-1" />
                    Activar en Mapa
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onDelitoChange?.("hurto_comercio");
                      setModo("procesador");
                    }}
                    className="h-7 text-xs text-[var(--text-secondary)]"
                  >
                    Procesar
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Importador y Procesador de Archivos GeoJSON en el Navegador */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-sm">
            <div className="mb-3 border-b border-[var(--border)] pb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
                <Upload className="size-4 text-[var(--info)]" />
                Cargar e Importar Archivo GeoJSON Local en el Navegador
              </h3>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Arrastra o selecciona un archivo .geojson o .json para inspeccionar sus atributos, contar geometrías y pintarlo en OpenLayers
              </p>
            </div>

            {/* Dropzone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) handleArchivoSeleccionado(file);
              }}
              className="flex flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--surface-2)]/30 p-6 text-center hover:border-[var(--ember)] transition-colors"
            >
              <div className="flex size-11 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text-secondary)]">
                <Upload className="size-5 text-[var(--ember)]" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[var(--text-primary)]">
                  Arrastra un archivo GeoJSON aquí o haz clic para examinar
                </p>
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                  Formatos compatibles: .geojson, .json (EPSG:4326 o cualquier FeatureCollection)
                </p>
              </div>

              <Input
                ref={fileInputRef}
                type="file"
                accept=".geojson,.json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleArchivoSeleccionado(file);
                }}
              />

              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs gap-1.5 mt-1"
              >
                <Upload className="size-3.5" />
                <span>Seleccionar Archivo Local</span>
              </Button>
            </div>

            {errorImportacion && (
              <div className="mt-3 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-3 text-xs text-[var(--danger)]">
                {errorImportacion}
              </div>
            )}

            {/* Ficha de Capa Importada */}
            {archivoImportado && (
              <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-2.5">
                  <div>
                    <h4 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-[var(--success)]" />
                      {archivoImportado.nombre}
                    </h4>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      {archivoImportado.featuresCount.toLocaleString("es-CO")} geometrías detectadas · {archivoImportado.tamanoKb} KB
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant={capaPersonalizadaPintada ? "secondary" : "default"}
                      size="sm"
                      onClick={handlePintarCapaImportada}
                      className="h-8 gap-1.5 text-xs font-semibold"
                    >
                      <Eye className="size-3.5" />
                      <span>{capaPersonalizadaPintada ? "Actualizar en Mapa" : "Pintar Capa en Mapa"}</span>
                    </Button>

                    {capaPersonalizadaPintada && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleLimpiarCapaImportada}
                        className="h-8 gap-1 text-xs text-[var(--danger)] hover:bg-[var(--danger)]/10"
                      >
                        <Trash2 className="size-3.5" />
                        <span>Quitar del Mapa</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Resumen de Atributos y Selector de Color */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5 text-xs">
                    <span className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                      Metadatos Espaciales:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {archivoImportado.tiposGeometria.map((tipo) => (
                        <Badge key={tipo} variant="outline" className="text-[10px]">
                          Geometría: {tipo}
                        </Badge>
                      ))}
                      <Badge variant="outline" className="text-[10px]">
                        {archivoImportado.propiedades.length} columnas / propiedades
                      </Badge>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 text-xs">
                    <span className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                      Color de Renderizado en OpenLayers:
                    </span>
                    <div className="flex items-center gap-2">
                      {COLORES_PRESET_CAPA.map((c) => (
                        <Button
                          key={c.hex}
                          variant="unstyled"
                          size="unstyled"
                          onClick={() => setColorCapaPersonalizada(c.hex)}
                          className={`size-6 rounded-full border-2 transition-transform ${
                            colorCapaPersonalizada === c.hex
                              ? "scale-110 border-[var(--text-primary)]"
                              : "border-transparent hover:scale-105"
                          }`}
                          style={{ backgroundColor: c.hex }}
                          title={c.nombre}
                          aria-label={c.nombre}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Previsualización de Columnas y Primeros Atributos */}
                <div className="mt-1 flex flex-col gap-1.5">
                  <span className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                    Columnas detectadas en el GeoJSON:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {archivoImportado.propiedades.map((p) => (
                      <span
                        key={p}
                        className="rounded bg-[var(--surface-3)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--text-secondary)]"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
