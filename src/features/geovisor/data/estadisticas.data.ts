export interface EstadisticasLocalidad2025 {
  homicidios: number;
  hurtos: number;
}

export const ESTADISTICAS_SEGURIDAD_2025 = {
  homicidios_total: 410,
  hurtos_personas: 6493,
  tendencia_homicidios: "reducción_vs_2024",
  fuente: "Policía Nacional / Cartagena Cómo Vamos",
  periodo: "Enero-septiembre de 2025",
  corte: "Septiembre de 2025",
  percepcion_ciudadana: {
    valor: null,
    nota: "No se incluye una cifra de percepción sin una serie y metodología verificables.",
  },
  por_localidad: {
    "loc-1": { homicidios: 142, hurtos: 2800 },
    "loc-2": { homicidios: 178, hurtos: 2400 },
    "loc-3": { homicidios: 90, hurtos: 1293 },
  } satisfies Record<string, EstadisticasLocalidad2025>,
} as const;
