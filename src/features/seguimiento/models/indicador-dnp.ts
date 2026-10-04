/**
 * POLIS — Modelos de Datos del Tablero SINERGIA DNP y Cadena de Valor
 * Metodología del Departamento Nacional de Planeación (DNP) / CONPES / MIPG
 * Cartagena de Indias 2026–2036.
 */

export type TipoIndicador = "insumo" | "producto" | "resultado" | "impacto";
export type SentidoEsperado = "ascendente" | "descendente";

export interface FichaIndicadorDnp {
  id: string;
  codigo: string;
  nombre: string;
  tipo_indicador: TipoIndicador;
  linea_estrategica_id?: string | null;
  dimension_id?: string | null;
  nodo_instrumento_id?: string | null;
  definicion: string;
  metodo_calculo: string;
  unidad_medida: string;
  sentido_esperado: SentidoEsperado;
  periodicidad: string;
  linea_base_valor: number | string;
  linea_base_anio: number;
  meta_cuatrienio: number | string;
  meta_anualizada?: Record<string, unknown>;
  fuente_datos: string;
  responsable_reporte: string;
  metadatos?: Record<string, unknown>;
  valor_actual: number | string;
  porcentaje_avance: number | string;
  tiene_mediciones?: boolean;
  es_demostracion?: boolean;
  fecha_corte_ultimo_reporte?: string | null;
  periodo_ultimo_reporte?: string | null;
  creado_en?: string;
  actualizado_en?: string;
}

export interface CadenaValorData {
  insumo: FichaIndicadorDnp[];
  producto: FichaIndicadorDnp[];
  resultado: FichaIndicadorDnp[];
}

export interface MedicionIndicadorInput {
  periodo: string;
  fecha_corte: string;
  valor_medido: number;
  observaciones?: string;
  evidencia_documental_url?: string;
  registrado_por: string;
  es_demostracion?: boolean;
}

export interface MedicionIndicadorRespuesta extends MedicionIndicadorInput {
  id: string;
  indicador_id: string;
  avance_acumulado: number;
  es_demostracion?: boolean;
  creado_en: string;
  actualizado_en: string;
}

/**
 * Calcula el avance porcentual según la metodología oficial DNP / SINERGIA:
 * - Ascendente (mayor es mejor): ((valorActual - lineaBase) / (meta - lineaBase)) * 100
 * - Descendente (menor es mejor, ej. reducción de homicidios): ((lineaBase - valorActual) / (lineaBase - meta)) * 100
 */
export function calcularAvancePorcentaje(
  valorActual: number,
  lineaBase: number,
  meta: number,
  sentido: SentidoEsperado
): number {
  if (sentido === "descendente") {
    const denominador = lineaBase - meta;
    if (denominador === 0) {
      return valorActual <= meta ? 100 : 0;
    }
    const numerador = lineaBase - valorActual;
    const porcentaje = (numerador / denominador) * 100;
    return Math.round(porcentaje * 100) / 100;
  }

  const denominador = meta - lineaBase;
  if (denominador === 0) {
    return valorActual >= meta ? 100 : 0;
  }
  const numerador = valorActual - lineaBase;
  const porcentaje = (numerador / denominador) * 100;
  return Math.round(porcentaje * 100) / 100;
}

export type NivelSemaforo = "verde" | "ambar" | "rojo";

export interface InfoSemaforo {
  nivel: NivelSemaforo;
  label: string;
  colorTexto: string;
  colorBg: string;
  colorBorde: string;
  colorBarra: string;
  badgeVariant: "success" | "warning" | "destructive";
}

export function obtenerSemaforoAvance(porcentaje: number): InfoSemaforo {
  if (porcentaje >= 80) {
    return {
      nivel: "verde",
      label: "Óptimo",
      colorTexto: "text-success",
      colorBg: "bg-success-soft",
      colorBorde: "border-success/30",
      colorBarra: "bg-success",
      badgeVariant: "success",
    };
  }

  if (porcentaje >= 50) {
    return {
      nivel: "ambar",
      label: "En Alerta",
      colorTexto: "text-warning",
      colorBg: "bg-warning-soft",
      colorBorde: "border-warning/30",
      colorBarra: "bg-warning",
      badgeVariant: "warning",
    };
  }

  return {
    nivel: "rojo",
    label: "Crítico",
    colorTexto: "text-danger",
    colorBg: "bg-danger-soft",
    colorBorde: "border-danger/30",
    colorBarra: "bg-danger",
    badgeVariant: "destructive",
  };
}
