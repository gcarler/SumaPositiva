import {Layers, ShieldAlert, BarChart3} from "lucide-react";

import {Label} from "@/shared/ui/label";
import {Checkbox} from "@/shared/ui/checkbox";
import {Button} from "@/shared/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  type VariableMapa,
  VARIABLE_META,
  ESCALA_CHOROPLETH_PASOS,
  ESTADISTICAS_TERRITORIOS,
  obtenerValorVariable
} from "../data/estadisticas.data";

export interface CapasConfig {
  localidades: boolean;
  corregimientos: boolean;
  barrios: boolean;
  puntos: boolean;
  etiquetas: boolean;
  isocronas?: boolean;
  hurtoMotocicletas?: boolean;
  hurtoResidencias?: boolean;
  hurtoComercio?: boolean;
}

interface GeovisorControlesProps {
  capas: CapasConfig;
  onToggleCapa: (capa: keyof CapasConfig) => void;
  variableMapa: VariableMapa;
  anioHurto?: number | null;
  onAnioHurtoChange?: (anio: number | null) => void;
  onAbrirTableroHurtos?: () => void;
}

export function GeovisorControles({
  capas,
  onToggleCapa,
  variableMapa,
  anioHurto = null,
  onAnioHurtoChange,
  onAbrirTableroHurtos,
}: GeovisorControlesProps) {
  const meta = VARIABLE_META[variableMapa];

  // Cálculo de min y max para la leyenda dinámica
  const valores = ESTADISTICAS_TERRITORIOS.map((t) => obtenerValorVariable(t, variableMapa));
  const minVal = Math.min(...valores);
  const maxVal = Math.max(...valores);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-sm">
      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2.5">
        <Layers className="size-4 text-[var(--ember)]" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
          Control de Capas SIG
        </h3>
      </div>

      {/* Lista de Toggles de Capas */}
      <div className="space-y-2.5 text-xs">
        <Label htmlFor="capa-localidades" className="flex items-center justify-between gap-2 cursor-pointer hover:text-[var(--text-primary)] text-[var(--text-secondary)] font-normal">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={capas.localidades}
              onCheckedChange={() => onToggleCapa("localidades")}
              id="capa-localidades"
            />
            <span className="font-medium text-xs">Localidades (3)</span>
          </div>
          <span className="size-2 rounded-full" style={{ backgroundColor: "#e85d04" }} />
        </Label>

        <Label htmlFor="capa-corregimientos" className="flex items-center justify-between gap-2 cursor-pointer hover:text-[var(--text-primary)] text-[var(--text-secondary)] font-normal">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={capas.corregimientos}
              onCheckedChange={() => onToggleCapa("corregimientos")}
              id="capa-corregimientos"
            />
            <span className="font-medium text-xs">Corregimientos e Islas</span>
          </div>
          <span className="size-2 rounded-full" style={{ backgroundColor: "#6d6875" }} />
        </Label>

        <Label htmlFor="capa-barrios" className="flex items-center justify-between gap-2 cursor-pointer hover:text-[var(--text-primary)] text-[var(--text-secondary)] font-normal">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={capas.barrios}
              onCheckedChange={() => onToggleCapa("barrios")}
              id="capa-barrios"
            />
            <span className="font-medium text-xs">Barrios Catastrales (217)</span>
          </div>
          <span className="size-2 rounded-full" style={{ backgroundColor: "#3a86ff" }} />
        </Label>

        <Label htmlFor="capa-puntos" className="flex items-center justify-between gap-2 cursor-pointer hover:text-[var(--text-primary)] text-[var(--text-secondary)] font-normal">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={capas.puntos}
              onCheckedChange={() => onToggleCapa("puntos")}
              id="capa-puntos"
            />
            <span className="font-medium text-xs">Puntos de Alerta SAT</span>
          </div>
          <span className="size-2 rounded-full" style={{ backgroundColor: "#d62828" }} />
        </Label>

        <Label htmlFor="capa-etiquetas" className="flex items-center justify-between gap-2 cursor-pointer hover:text-[var(--text-primary)] text-[var(--text-secondary)] font-normal">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={capas.etiquetas}
              onCheckedChange={() => onToggleCapa("etiquetas")}
              id="capa-etiquetas"
            />
            <span className="font-medium text-xs">Etiquetas y Nombres</span>
          </div>
          <span className="text-[10px] text-[var(--text-tertiary)]">Aa</span>
        </Label>

        {capas.isocronas !== undefined && (
          <Label htmlFor="capa-isocronas" className="flex items-center justify-between gap-2 cursor-pointer hover:text-[var(--text-primary)] text-[var(--text-secondary)] font-normal">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={capas.isocronas}
                onCheckedChange={() => onToggleCapa("isocronas")}
                id="capa-isocronas"
              />
              <span className="font-medium text-xs">Isócronas de Accesibilidad</span>
            </div>
            <span className="size-2 rounded-full" style={{ backgroundColor: "#10b981" }} />
          </Label>
        )}

        {/* Sección de Capas Analíticas de Hurtos 2018-2026 */}
        <div className="border-t border-[var(--border)] pt-2.5 mt-1 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[var(--danger)]">
              <ShieldAlert className="size-3.5" />
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Hurtos SIEDCO
              </span>
            </div>
            {onAbrirTableroHurtos && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onAbrirTableroHurtos}
                className="h-6 px-1.5 text-[10px] text-[var(--danger)] hover:bg-[var(--danger)]/10"
                title="Abrir tablero analítico completo"
              >
                <BarChart3 className="size-3 mr-1" />
                Tablero
              </Button>
            )}
          </div>

          <Label
            htmlFor="capa-hurto-motos"
            className="flex items-center justify-between gap-2 cursor-pointer hover:text-[var(--text-primary)] text-[var(--text-secondary)] font-normal"
          >
            <div className="flex items-center gap-2">
              <Checkbox
                checked={Boolean(capas.hurtoMotocicletas)}
                onCheckedChange={() => onToggleCapa("hurtoMotocicletas")}
                id="capa-hurto-motos"
              />
              <span className="font-medium text-xs">Hurto a Motocicletas</span>
            </div>
            <span className="size-2 rounded-full" style={{ backgroundColor: "#f97316" }} />
          </Label>

          <Label
            htmlFor="capa-hurto-residencias"
            className="flex items-center justify-between gap-2 cursor-pointer hover:text-[var(--text-primary)] text-[var(--text-secondary)] font-normal"
          >
            <div className="flex items-center gap-2">
              <Checkbox
                checked={Boolean(capas.hurtoResidencias)}
                onCheckedChange={() => onToggleCapa("hurtoResidencias")}
                id="capa-hurto-residencias"
              />
              <span className="font-medium text-xs">Hurto a Residencias</span>
            </div>
            <span className="size-2 rounded-full" style={{ backgroundColor: "#8b5cf6" }} />
          </Label>

          <Label
            htmlFor="capa-hurto-comercio"
            className="flex items-center justify-between gap-2 cursor-pointer hover:text-[var(--text-primary)] text-[var(--text-secondary)] font-normal"
          >
            <div className="flex items-center gap-2">
              <Checkbox
                checked={Boolean(capas.hurtoComercio)}
                onCheckedChange={() => onToggleCapa("hurtoComercio")}
                id="capa-hurto-comercio"
              />
              <span className="font-medium text-xs">Hurto a Comercio</span>
            </div>
            <span className="size-2 rounded-full" style={{ backgroundColor: "#06b6d4" }} />
          </Label>

          {(capas.hurtoMotocicletas || capas.hurtoResidencias || capas.hurtoComercio) && (
            <div className="pt-1">
              <Label
                htmlFor="select-filtro-anio-geovisor"
                className="block text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1"
              >
                Año Delictivo
              </Label>
              <Select
                value={anioHurto ? String(anioHurto) : "TODOS"}
                onValueChange={(val) => onAnioHurtoChange?.(val === "TODOS" ? null : Number(val))}
              >
                <SelectTrigger
                  id="select-filtro-anio-geovisor"
                  className="w-full h-7 text-[11px]"
                  aria-label="Filtrar año delictivo"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS" className="text-xs">
                    2018–2026 (Consolidado)
                  </SelectItem>
                  {[2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018].map((a) => (
                    <SelectItem key={a} value={String(a)} className="text-xs">
                      Año {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {onAbrirTableroHurtos && (
            <div className="pt-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onAbrirTableroHurtos}
                className="w-full h-8 text-[11px] font-semibold border-[var(--ember)]/40 text-[var(--ember)] hover:bg-[var(--ember)]/10"
              >
                <BarChart3 className="size-3.5 mr-1.5" />
                Procesar y Gestionar GeoJSON
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Leyenda Dinámica Coroplética */}
      <div className="border-t border-[var(--border)] pt-3 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-[var(--text-primary)] truncate">
            {meta.label}
          </span>
          <span className="text-[11px] font-medium text-[var(--text-tertiary)] shrink-0">
            {meta.unidad}
          </span>
        </div>

        {/* Gradiente de 5 pasos */}
        <div className="grid grid-cols-5 gap-1 h-3 rounded overflow-hidden">
          {ESCALA_CHOROPLETH_PASOS.map((color, idx) => (
            <div
              key={idx}
              className="h-full w-full"
              style={{ backgroundColor: color }}
              title={`Nivel ${idx + 1}`}
            />
          ))}
        </div>

        <div className="flex justify-between text-[10px] text-[var(--text-tertiary)] tabular">
          <span>Min: {minVal.toLocaleString("es-CO")}</span>
          <span>Max: {maxVal.toLocaleString("es-CO")}</span>
        </div>
      </div>
    </div>
  );
}
