"use client";

import {
  Coins,
  PackageCheck,
  Award,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Building2,
  FileText,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { usePanels } from "@/core/panels/panel-store";
import { useCadenaValorStore } from "../state/cadena-valor-store";
import type { FichaIndicadorDnp } from "../models/indicador-dnp";
import {
  calcularAvancePorcentaje,
  obtenerSemaforoAvance,
} from "../models/indicador-dnp";

interface CadenaValorTabProps {
  puedeEditar: boolean;
}

export function CadenaValorTab({ puedeEditar }: CadenaValorTabProps) {
  const { openPanel } = usePanels();
  const cadenaValor = useCadenaValorStore((s) => s.cadenaValor);
  const esContingencia = useCadenaValorStore((s) => s.esContingencia);

  const handleAbrirFicha = (ind: FichaIndicadorDnp) => {
    openPanel("indicador-detalle", {
      indicadorId: ind.id,
      soloLectura: !puedeEditar,
    });
  };

  const renderColumna = (
    titulo: string,
    subtitulo: string,
    eslabon: "insumo" | "producto" | "resultado",
    indicadores: FichaIndicadorDnp[],
    icono: typeof Coins,
    estiloCabecera: string,
    colorIcono: string
  ) => {
    const Icono = icono;
    return (
      <div className="flex flex-1 flex-col rounded-xl border border-border bg-surface-1 shadow-xs overflow-hidden">
        {/* Cabecera del Eslabón */}
        <div className={`p-4 border-b border-border ${estiloCabecera}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${colorIcono}`}>
                <Icono className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-text-primary tracking-tight">
                  {titulo}
                </h3>
                <p className="text-[11px] text-text-muted">{subtitulo}</p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              {indicadores.length} {indicadores.length === 1 ? "indicador" : "indicadores"}
            </Badge>
          </div>
        </div>

        {/* Lista de Fichas de Indicadores */}
        <div className="flex-1 p-3 space-y-3 overflow-y-auto">
          {indicadores.map((ind) => {
            const tieneMedicion =
              ind.tiene_mediciones === true ||
              (Number(ind.valor_actual) > 0 && ind.tiene_mediciones !== false);

            const avance = calcularAvancePorcentaje(
              Number(ind.valor_actual),
              Number(ind.linea_base_valor),
              Number(ind.meta_cuatrienio),
              ind.sentido_esperado
            );
            const semaforo = obtenerSemaforoAvance(avance);
            const esAscendente = ind.sentido_esperado === "ascendente";

            return (
              <div
                key={ind.id}
                className="group flex flex-col justify-between rounded-lg border border-border bg-surface-2/60 p-3.5 transition-all hover:border-border-strong hover:bg-surface-2"
              >
                <div>
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5">
                      {(ind.es_demostracion || (ind.metadatos?.es_demostracion as boolean)) && (
                        <Badge variant="warning" className="text-[10px] py-0 px-1 font-bold">
                          DEMO
                        </Badge>
                      )}
                      <span className="font-mono text-xs font-semibold text-accent">
                        {ind.codigo}
                      </span>
                    </div>
                    {tieneMedicion ? (
                      <Badge variant={semaforo.badgeVariant} className="text-[10px] py-0 px-1.5">
                        {semaforo.label} ({avance}%)
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-text-muted">
                        Sin medición
                      </Badge>
                    )}
                  </div>

                  <h4 className="mt-1.5 text-xs font-semibold text-text-primary leading-snug">
                    {ind.nombre}
                  </h4>

                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-text-muted">
                    <Building2 className="h-3 w-3 shrink-0" />
                    <span className="truncate">{ind.responsable_reporte}</span>
                  </div>

                  {/* Grid de Metas y Avance */}
                  <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-md bg-surface-1 p-2 text-center text-[10px]">
                    <div>
                      <span className="text-text-muted">Línea Base</span>
                      <p className="font-mono font-medium text-text-primary">
                        {Number(ind.linea_base_valor).toLocaleString("es-CO")}
                      </p>
                    </div>
                    <div>
                      <span className="text-text-muted">Meta 2029</span>
                      <p className="font-mono font-semibold text-accent">
                        {Number(ind.meta_cuatrienio).toLocaleString("es-CO")}
                      </p>
                    </div>
                    <div>
                      <span className="text-text-muted">Actual</span>
                      <p className={`font-mono font-bold ${tieneMedicion ? "text-text-primary" : "text-text-muted"}`}>
                        {tieneMedicion
                          ? Number(ind.valor_actual).toLocaleString("es-CO")
                          : "Sin medición"}
                      </p>
                    </div>
                  </div>

                  {/* Barra de Progreso */}
                  <div className="mt-2.5">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-1">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          tieneMedicion ? semaforo.colorBarra : "bg-border"
                        }`}
                        style={{
                          width: `${tieneMedicion ? Math.min(100, Math.max(0, avance)) : 0}%`,
                        }}
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-text-muted">
                      <span>Unidad: {ind.unidad_medida}</span>
                      <span className="flex items-center gap-0.5">
                        {esAscendente ? (
                          <TrendingUp className="h-2.5 w-2.5 text-success" />
                        ) : (
                          <TrendingDown className="h-2.5 w-2.5 text-info" />
                        )}
                        {esAscendente ? "Ascendente" : "Descendente"}
                      </span>
                    </div>

                    {ind.fecha_corte_ultimo_reporte && (
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-text-muted">
                        <Calendar className="h-2.5 w-2.5 shrink-0" />
                        <span>Corte: {ind.fecha_corte_ultimo_reporte}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Botón Acción */}
                <div className="mt-3 pt-2.5 border-t border-border/70 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAbrirFicha(ind)}
                    className="h-7 gap-1 text-[11px] w-full justify-center"
                  >
                    <FileText className="h-3 w-3" />
                    <span>Ver Ficha Técnica DNP</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Banner de Modo Contingencia (AUD-02) */}
      {esContingencia && (
        <div className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning/10 p-3.5 text-xs text-text-primary">
          <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-warning">
                Modo Contingencia Local
              </span>
              <Badge variant="warning" className="text-[10px]">
                Datos de Contingencia
              </Badge>
            </div>
            <p className="mt-0.5 text-text-muted">
              El servicio central de indicadores no se encuentra disponible. Se está visualizando el catálogo canónico en memoria; las operaciones de registro de mediciones están protegidas para evitar inconsistencias de persistencia.
            </p>
          </div>
        </div>
      )}

      {/* Banner de Contexto Metodológico DNP */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-border bg-surface-1 p-4 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-accent uppercase tracking-wider">
              Metodología DNP · Cadena de Valor
            </span>
            <Badge variant="outline" className="text-[10px]">
              SINERGIA
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              MIPG
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              Decreto Distrital 037/2026
            </Badge>
            {esContingencia ? (
              <Badge variant="warning" className="text-[10px]">
                Catálogo de Contingencia
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] text-success border-success/30 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse inline-block" />
                Datos en Vivo (PostgreSQL)
              </Badge>
            )}
          </div>
          <p className="mt-1.5 text-xs text-text-secondary max-w-3xl">
            Estructuración lógica de causalidad para la Seguridad Humana Integral: los <strong>Insumos</strong> financieros y operativos permiten generar <strong>Productos</strong> y bienes públicos que impactan directamente en los <strong>Resultados</strong> de vida, tranquilidad y convivencia ciudadana en Cartagena de Indias.
          </p>
        </div>

        <div className="hidden lg:flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-lg border border-border bg-surface-2 text-xs font-medium text-text-muted">
          <span>Insumos</span>
          <ArrowRight className="h-3.5 w-3.5 text-accent" />
          <span>Productos</span>
          <ArrowRight className="h-3.5 w-3.5 text-ember" />
          <span>Resultados</span>
        </div>
      </div>

      {/* Grid de 3 Columnas Articuladas */}
      <div className="grid gap-4 lg:grid-cols-3">
        {renderColumna(
          "1. Insumos",
          "Recursos financieros y operativos",
          "insumo",
          cadenaValor.insumo,
          Coins,
          "bg-accent-soft/30",
          "bg-accent-soft text-accent"
        )}

        {renderColumna(
          "2. Productos",
          "Bienes y servicios públicos entregados",
          "producto",
          cadenaValor.producto,
          PackageCheck,
          "bg-ember-soft/30",
          "bg-ember-soft text-ember"
        )}

        {renderColumna(
          "3. Resultados de Impacto",
          "Transformación y bienestar ciudadano",
          "resultado",
          cadenaValor.resultado,
          Award,
          "bg-success-soft/30",
          "bg-success-soft text-success"
        )}
      </div>
    </div>
  );
}
