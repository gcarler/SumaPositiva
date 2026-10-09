/**
 * POLIS — Modelo de Registro de Asistencia Digital con Enfoque Diferencial
 * Cartagena de Indias 2026–2036
 * Cumplimiento: Ley Estatutaria 1757 de 2015 y Sentencia C-150 de 2015.
 */

export type EnfoqueDiferencial =
  | "ninguno"
  | "afrodescendiente"
  | "palenquero"
  | "raizal"
  | "indigena"
  | "rrom"
  | "victima_conflicto"
  | "discapacidad"
  | "adulto_mayor"
  | "juventud"
  | "mujeres"
  | "lgbtiq";

export type TipoDocumento = "CC" | "TI" | "CE" | "PAS" | "OTRO";

export type Genero = "mujer" | "hombre" | "no_binario" | "otro";

export interface RegistroAsistencia {
  id: string;
  mesaId: string;
  nombreCompleto: string;
  tipoDocumento: TipoDocumento;
  numeroDocumento: string;
  genero: Genero;
  enfoqueDiferencial: EnfoqueDiferencial;
  organizacionOBarrio: string;
  telefonoWhatsApp?: string;
  correo?: string;
  horaRegistro: string;
  subMesaAsignada?: string;
  pendienteSincronizacion?: boolean;
  sincronizadoEn?: string;
}

export const ENFOQUES_DIFERENCIALES_LABELS: Record<EnfoqueDiferencial, string> = {
  ninguno: "Población general / Sin enfoque específico",
  afrodescendiente: "Comunidad Negra / Afrodescendiente",
  palenquero: "Comunidad Palenquera (San Basilio de Palenque)",
  raizal: "Comunidad Raizal del Archipiélago",
  indigena: "Pueblos y Comunidades Indígenas",
  rrom: "Pueblo Rrom / Gitano",
  victima_conflicto: "Víctima del Conflicto Armado (Ley 1448)",
  discapacidad: "Persona con Discapacidad",
  adulto_mayor: "Persona Mayor (60+ años)",
  juventud: "Jóvenes (14 a 28 años)",
  mujeres: "Mujeres y Liderazgos de Género",
  lgbtiq: "Sectores Sociales LGBTIQ+",
};

export const ENFOQUES_DIFERENCIALES_BADGES: Record<EnfoqueDiferencial, { etiqueta: string; color: string }> = {
  ninguno: { etiqueta: "General", color: "var(--text-secondary)" },
  afrodescendiente: { etiqueta: "Afrodescendiente", color: "var(--ember)" },
  palenquero: { etiqueta: "Palenquero", color: "var(--warning)" },
  raizal: { etiqueta: "Raizal", color: "var(--success)" },
  indigena: { etiqueta: "Indígena", color: "var(--ember)" },
  rrom: { etiqueta: "Rrom", color: "var(--info)" },
  victima_conflicto: { etiqueta: "Víctima del Conflicto", color: "var(--danger)" },
  discapacidad: { etiqueta: "Discapacidad", color: "var(--info)" },
  adulto_mayor: { etiqueta: "Persona Mayor", color: "var(--text-tertiary)" },
  juventud: { etiqueta: "Juventud", color: "var(--success)" },
  mujeres: { etiqueta: "Mujeres", color: "var(--ember)" },
  lgbtiq: { etiqueta: "LGBTIQ+", color: "var(--info)" },
};

export const TIPOS_DOCUMENTO_LABELS: Record<TipoDocumento, string> = {
  CC: "Cédula de Ciudadanía (CC)",
  TI: "Tarjeta de Identidad (TI)",
  CE: "Cédula de Extranjería (CE)",
  PAS: "Pasaporte (PAS)",
  OTRO: "Otro documento",
};

export const GENEROS_LABELS: Record<Genero, string> = {
  mujer: "Mujer",
  hombre: "Hombre",
  no_binario: "No binario",
  otro: "Otro / Prefiero no decir",
};
