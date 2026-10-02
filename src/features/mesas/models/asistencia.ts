/**
 * POLIS — Modelo de Registro de Asistencia Digital con Enfoque Diferencial
 * Cartagena de Indias 2026–2036
 * Cumplimiento: Ley 1757 de 2015, Decreto 037 de 2026 del Ministerio del Interior y Sentencia C-150 de 2015.
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
  afrodescendiente: { etiqueta: "Afrodescendiente", color: "#d97706" },
  palenquero: { etiqueta: "Palenquero", color: "#ca8a04" },
  raizal: { etiqueta: "Raizal", color: "#059669" },
  indigena: { etiqueta: "Indígena", color: "#b45309" },
  rrom: { etiqueta: "Rrom", color: "#7c3aed" },
  victima_conflicto: { etiqueta: "Víctima del Conflicto", color: "#dc2626" },
  discapacidad: { etiqueta: "Discapacidad", color: "#0284c7" },
  adulto_mayor: { etiqueta: "Persona Mayor", color: "#475569" },
  juventud: { etiqueta: "Juventud", color: "#16a34a" },
  mujeres: { etiqueta: "Mujeres", color: "#db2777" },
  lgbtiq: { etiqueta: "LGBTIQ+", color: "#9333ea" },
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
