export type EstadoAlternativa =
  | "en_formulacion"
  | "viable"
  | "requiere_ajustes"
  | "priorizada"
  | "descartada";

export type SectorMGA =
  | "seguridad_convivencia"
  | "proteccion_nna"
  | "ambiente_habitat"
  | "genero_inclusion"
  | "desarrollo_economico"
  | "educacion_cultura"
  | "etnico_comunitario";

export interface AlternativaSolucion {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  sector: SectorMGA;
  linea_estrategica_codigo: string;
  dimension_id: string;
  objetivo_central_mga: string;
  territorio_cobertura: string;
  poblacion_objetivo_estimada: number;
  costo_estimado_cop: number;
  horizonte_anios: number;
  fuentes_financiacion_sugeridas: string[];
  estado: EstadoAlternativa;
  requiere_consulta_previa: boolean;
  metadatos?: Record<string, unknown>;
  creado_en: string;
  actualizado_en: string;
}

export const SECTORES_MGA: Record<
  SectorMGA,
  { label: string; descripcion: string; sectorDnp: string }
> = {
  seguridad_convivencia: {
    label: "Seguridad y Convivencia",
    descripcion: "Prevención del delito, mediación comunitaria, desarme y videovigilancia.",
    sectorDnp: "Justicia y del Derecho / Defensa",
  },
  proteccion_nna: {
    label: "Protección Niñez y Juventud",
    descripcion: "Prevención de ESCNNA, entornos protectores y rutas de restitución de derechos.",
    sectorDnp: "Inclusión Social y Reconciliación",
  },
  ambiente_habitat: {
    label: "Ambiente, Hábitat y Riesgo",
    descripcion: "Restauración ecológica de ciénagas y canales, resiliencia climática y drenajes.",
    sectorDnp: "Ambiente y Desarrollo Sostenible / Vivienda",
  },
  genero_inclusion: {
    label: "Género e Inclusión Social",
    descripcion: "Sistemas distritales de cuidado, Casas de Justicia Violeta y prevención de VBG.",
    sectorDnp: "Inclusión Social / Equidad de la Mujer",
  },
  desarrollo_economico: {
    label: "Desarrollo Económico Popular",
    descripcion: "Microcrédito blando, financiamiento comunal y lucha contra la usura.",
    sectorDnp: "Comercio, Industria y Turismo",
  },
  educacion_cultura: {
    label: "Educación, Ciencia y Cultura",
    descripcion: "Bilingüismo, habilidades tecnológicas e innovación náutica para zonas vulnerables.",
    sectorDnp: "Educación / Tecnologías de la Información",
  },
  etnico_comunitario: {
    label: "Étnico y Autonomía Territorial",
    descripcion: "Fortalecimiento de Consejos Comunitarios de Comunidades Negras y Cabildos (Ley 70/93).",
    sectorDnp: "Interior / Asuntos Étnicos",
  },
};

export const ESTADOS_ALTERNATIVA: Record<
  EstadoAlternativa,
  {
    label: string;
    descripcion: string;
    badgeVariant: "default" | "secondary" | "outline" | "destructive";
    toneClass: string;
  }
> = {
  priorizada: {
    label: "Priorizada",
    descripcion: "Iniciativa de primer orden para asignación presupuestal distrital inmediata.",
    badgeVariant: "default",
    toneClass: "bg-success-soft text-success border-success/30",
  },
  viable: {
    label: "Viable",
    descripcion: "Alternativa con coherencia técnica y viabilidad normativa preliminar.",
    badgeVariant: "default",
    toneClass: "bg-surface-2 text-text-primary border-border",
  },
  en_formulacion: {
    label: "En formulación",
    descripcion: "Ficha en proceso de estructuración analítica, objetivos y metas cuantitativas.",
    badgeVariant: "secondary",
    toneClass: "bg-warning-soft text-warning border-warning/30",
  },
  requiere_ajustes: {
    label: "Requiere ajustes",
    descripcion: "Observaciones metodológicas o salvaguardas (ej. Consulta Previa) pendientes.",
    badgeVariant: "outline",
    toneClass: "bg-ember-soft text-ember border-ember/30",
  },
  descartada: {
    label: "Descartada",
    descripcion: "Alternativa que no supera el filtro causal o invade competencias.",
    badgeVariant: "destructive",
    toneClass: "bg-danger-soft text-danger border-danger/30",
  },
};

export const LINEAS_ESTRATEGICAS_MAP: Record<string, string> = {
  "LE-01": "Línea 1 — Seguridad Ciudadana, Convivencia y Desarme Social",
  "LE-02": "Línea 2 — Protección Integral de Niñez, Juventud y Género",
  "LE-03": "Línea 3 — Seguridad Ambiental, Hábitat Resiliente y Territorio",
  "LE-04": "Línea 4 — Inclusión Económica Popular, Soberanía Alimentaria e Institucionalidad",
};

export const DIMENSIONES_ONU_MAP: Record<string, string> = {
  personal: "Personal / Integridad",
  comunitaria: "Comunitaria / Social",
  ambiental: "Ambiental / Hábitat",
  economica: "Económica / Empleo",
  alimentaria: "Alimentaria / Nutrición",
  salud: "Salud Pública",
  politica: "Política / Gobernanza",
};

export const FUENTES_FINANCIACION_OFICIALES = [
  "FONSET",
  "SGP",
  "SGR",
  "ICLD",
  "Presupuesto Participativo",
  "Cooperación Internacional",
  "Fondo Emprender / Crédito de Fomento",
] as const;
