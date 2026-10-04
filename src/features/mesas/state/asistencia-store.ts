"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  RegistroAsistencia,
  EnfoqueDiferencial,
} from "@/features/mesas/models/asistencia";
import {
  ENFOQUES_DIFERENCIALES_LABELS,
  TIPOS_DOCUMENTO_LABELS,
  GENEROS_LABELS,
} from "@/features/mesas/models/asistencia";
import { sanitizarCsv as escapeCSV } from "@/shared/lib/csv";

export type NuevoAsistenteInput = Omit<RegistroAsistencia, "id" | "horaRegistro">;

interface AsistenciaState {
  registros: Record<string, RegistroAsistencia[]>;
  registrarAsistente: (input: NuevoAsistenteInput) => RegistroAsistencia;
  eliminarRegistro: (mesaId: string, id: string) => void;
  limpiarRegistrosMesa: (mesaId: string) => void;
  exportarPlanillaCSV: (mesaId: string, nombreMesa?: string) => void;
}

const REGISTROS_SEMILLA: Record<string, RegistroAsistencia[]> = {
  "mt-001": [
    {
      id: "asist-mt1-01",
      mesaId: "mt-001",
      nombreCompleto: "Dora Luz Morales Mendoza",
      tipoDocumento: "CC",
      numeroDocumento: "45.489.120",
      genero: "mujer",
      enfoqueDiferencial: "afrodescendiente",
      organizacionOBarrio: "JAC Getsemaní — Calle del Pozo",
      telefonoWhatsApp: "300 458 9123",
      correo: "dora.morales@getsemani.org",
      horaRegistro: "2026-10-15T08:15:00.000Z",
      subMesaAsignada: "Seguridad Ciudadana y Espacio Público",
    },
    {
      id: "asist-mt1-02",
      mesaId: "mt-001",
      nombreCompleto: "Édgar Julio Arrieta",
      tipoDocumento: "CC",
      numeroDocumento: "73.190.450",
      genero: "hombre",
      enfoqueDiferencial: "adulto_mayor",
      organizacionOBarrio: "Asociación de Guías Patrimoniales del Centro",
      telefonoWhatsApp: "311 234 5678",
      correo: "edgar.arrieta@patrimonio.org",
      horaRegistro: "2026-10-15T08:22:00.000Z",
      subMesaAsignada: "Convivencia y Turismo Sostenible",
    },
    {
      id: "asist-mt1-03",
      mesaId: "mt-001",
      nombreCompleto: "Yuliet Paola Zúñiga Carmona",
      tipoDocumento: "CC",
      numeroDocumento: "1.047.382.910",
      genero: "mujer",
      enfoqueDiferencial: "juventud",
      organizacionOBarrio: "Colectivo Juvenil San Diego Activo",
      telefonoWhatsApp: "315 678 1234",
      correo: "yuliet.zuniga@juventudctg.co",
      horaRegistro: "2026-10-15T08:28:00.000Z",
      subMesaAsignada: "Oportunidades Productivas Juveniles",
    },
    {
      id: "asist-mt1-04",
      mesaId: "mt-001",
      nombreCompleto: "Marcos Aurelio Cuesta Murillo",
      tipoDocumento: "CC",
      numeroDocumento: "9.145.230",
      genero: "hombre",
      enfoqueDiferencial: "victima_conflicto",
      organizacionOBarrio: "Mesa Distrital de Víctimas de Cartagena",
      telefonoWhatsApp: "320 890 4567",
      correo: "marcos.cuesta@victimasctg.gov.co",
      horaRegistro: "2026-10-15T08:31:00.000Z",
      subMesaAsignada: "Garantías de No Repetición y Paz",
    },
    {
      id: "asist-mt1-05",
      mesaId: "mt-001",
      nombreCompleto: "Claudia Patricia Herrera",
      tipoDocumento: "CC",
      numeroDocumento: "33.150.892",
      genero: "mujer",
      enfoqueDiferencial: "mujeres",
      organizacionOBarrio: "Red de Mujeres Constructoras de Paz",
      telefonoWhatsApp: "301 765 4321",
      correo: "claudia.herrera@redmujeres.org",
      horaRegistro: "2026-10-15T08:35:00.000Z",
      subMesaAsignada: "Protección a Mujeres y Enfoque de Género",
    },
  ],
  "mt-002": [
    {
      id: "asist-mt2-01",
      mesaId: "mt-002",
      nombreCompleto: "Rafael Antonio Berrío",
      tipoDocumento: "CC",
      numeroDocumento: "73.220.100",
      genero: "hombre",
      enfoqueDiferencial: "afrodescendiente",
      organizacionOBarrio: "JAC Olaya Herrera — Sector Ricaurte",
      telefonoWhatsApp: "318 450 1200",
      correo: "rafael.berrio@olaya.org",
      horaRegistro: "2026-10-16T08:10:00.000Z",
    },
    {
      id: "asist-mt2-02",
      mesaId: "mt-002",
      nombreCompleto: "Carmen Cecilia Tatis",
      tipoDocumento: "CC",
      numeroDocumento: "45.512.800",
      genero: "mujer",
      enfoqueDiferencial: "mujeres",
      organizacionOBarrio: "Lideresa Barrio La Esperanza",
      telefonoWhatsApp: "314 555 9012",
      horaRegistro: "2026-10-16T08:18:00.000Z",
    },
  ],
  "mr-001": [
    {
      id: "asist-mr1-01",
      mesaId: "mr-001",
      nombreCompleto: "Pedro Nel Blanco Cassiani",
      tipoDocumento: "CC",
      numeroDocumento: "73.008.411",
      genero: "hombre",
      enfoqueDiferencial: "afrodescendiente",
      organizacionOBarrio: "Asociación de Pescadores Artesanales de La Boquilla",
      telefonoWhatsApp: "310 987 6543",
      correo: "pedro.blanco@boquillapescadores.org",
      horaRegistro: "2026-10-20T08:05:00.000Z",
    },
    {
      id: "asist-mr1-02",
      mesaId: "mr-001",
      nombreCompleto: "Rosa Inés Márquez Marrugo",
      tipoDocumento: "CC",
      numeroDocumento: "33.201.780",
      genero: "mujer",
      enfoqueDiferencial: "palenquero",
      organizacionOBarrio: "Consejo Comunitario de Comunidades Negras",
      telefonoWhatsApp: "300 222 3344",
      horaRegistro: "2026-10-20T08:12:00.000Z",
    },
  ],
  "mesa-001": [
    {
      id: "asist-m01-01",
      mesaId: "mesa-001",
      nombreCompleto: "Mateo Andrés Restrepo Gómez",
      tipoDocumento: "CC",
      numeroDocumento: "1.047.890.123",
      genero: "hombre",
      enfoqueDiferencial: "juventud",
      organizacionOBarrio: "Colectivo Ciclistas Urbanos Comuna 4",
      telefonoWhatsApp: "316 443 2198",
      correo: "mateo.restrepo@ciclistas.org",
      horaRegistro: "2026-09-18T08:15:00.000Z",
      subMesaAsignada: "Entornos escolares seguros",
    },
    {
      id: "asist-m01-02",
      mesaId: "mesa-001",
      nombreCompleto: "Gladys Elena Ramos",
      tipoDocumento: "CC",
      numeroDocumento: "45.670.320",
      genero: "mujer",
      enfoqueDiferencial: "adulto_mayor",
      organizacionOBarrio: "Asociación de Padres IE José Acevedo",
      telefonoWhatsApp: "300 901 2345",
      horaRegistro: "2026-09-18T08:20:00.000Z",
      subMesaAsignada: "Entornos escolares seguros",
    },
  ],
};

function generarId(): string {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).substring(2, 7);
  return `asist-${ts}-${rnd}`;
}

export const useAsistenciaStore = create<AsistenciaState>()(
  persist(
    (set, get) => ({
      registros: REGISTROS_SEMILLA,

      registrarAsistente: (input) => {
        const nuevoRegistro: RegistroAsistencia = {
          ...input,
          id: generarId(),
          horaRegistro: new Date().toISOString(),
        };

        set((state) => {
          const prev = state.registros[input.mesaId] ?? [];
          return {
            registros: {
              ...state.registros,
              [input.mesaId]: [nuevoRegistro, ...prev],
            },
          };
        });

        return nuevoRegistro;
      },

      eliminarRegistro: (mesaId, id) => {
        set((state) => {
          const actual = state.registros[mesaId] ?? [];
          return {
            registros: {
              ...state.registros,
              [mesaId]: actual.filter((r) => r.id !== id),
            },
          };
        });
      },

      limpiarRegistrosMesa: (mesaId) => {
        set((state) => ({
          registros: {
            ...state.registros,
            [mesaId]: [],
          },
        }));
      },

      exportarPlanillaCSV: (mesaId, nombreMesa) => {
        const lista = get().registros[mesaId] ?? [];
        if (lista.length === 0) {
          if (typeof window !== "undefined") {
            alert("No hay asistentes registrados para exportar en esta mesa.");
          }
          return;
        }

        const titulo = (nombreMesa || `Mesa_${mesaId}`).replace(/[^\w\s-]/gi, "_");
        const fechaDescarga = new Date().toISOString().split("T")[0];

        // Encabezados con metadatos institucionales
        const metadataHeader = [
          `"ALCALDÍA MAYOR DE CARTAGENA DE INDIAS — SECRETARÍA DE PLANEACIÓN DISTRITAL"`,
          `"POLÍTICA PÚBLICA DE SEGURIDAD HUMANA INTEGRAL (2026-2036)"`,
          `"PLANILLA OFICIAL DE CONTROL DE ASISTENCIA Y REGISTRO EN PUERTA"`,
          `"Mesa ID: ${mesaId} — ${nombreMesa || ""}"`,
          `"Fecha de exportación: ${new Date().toLocaleString("es-CO")}"`,
          `"Total registrados: ${lista.length}"`,
          `""`, // línea en blanco
        ].join("\r\n");

        const columnas = [
          "No.",
          "ID Registro",
          "Fecha y Hora de Registro",
          "Nombres y Apellidos",
          "Tipo Documento",
          "Número Documento",
          "Género",
          "Enfoque Diferencial",
          "Organización, JAC o Barrio",
          "Teléfono / WhatsApp",
          "Correo Electrónico",
          "Submesa Asignada",
        ];

        const filas = lista.map((reg, index) => {
          const fechaStr = new Date(reg.horaRegistro).toLocaleString("es-CO");
          return [
            index + 1,
            escapeCSV(reg.id),
            escapeCSV(fechaStr),
            escapeCSV(reg.nombreCompleto),
            escapeCSV(TIPOS_DOCUMENTO_LABELS[reg.tipoDocumento] || reg.tipoDocumento),
            escapeCSV(reg.numeroDocumento),
            escapeCSV(GENEROS_LABELS[reg.genero] || reg.genero),
            escapeCSV(ENFOQUES_DIFERENCIALES_LABELS[reg.enfoqueDiferencial] || reg.enfoqueDiferencial),
            escapeCSV(reg.organizacionOBarrio),
            escapeCSV(reg.telefonoWhatsApp || "N/A"),
            escapeCSV(reg.correo || "N/A"),
            escapeCSV(reg.subMesaAsignada || "Plenaria General"),
          ].join(",");
        });

        // Agregado de resumen estadístico por enfoque al final del CSV
        const conteoEnfoques: Record<string, number> = {};
        lista.forEach((r) => {
          const k = r.enfoqueDiferencial;
          conteoEnfoques[k] = (conteoEnfoques[k] ?? 0) + 1;
        });

        const resumenFilas = [
          `""`,
          `"--- RESUMEN POR ENFOQUE DIFERENCIAL ---"`,
          ...Object.entries(conteoEnfoques).map(([k, cnt]) => {
            const label = ENFOQUES_DIFERENCIALES_LABELS[k as EnfoqueDiferencial] || k;
            const pct = ((cnt / lista.length) * 100).toFixed(1);
            return `"${label}",${cnt},"${pct}%"`;
          }),
        ].join("\r\n");

        const csvContent =
          "\uFEFF" + // BOM UTF-8 para Excel en español
          metadataHeader +
          "\r\n" +
          columnas.map((c) => `"${c}"`).join(",") +
          "\r\n" +
          filas.join("\r\n") +
          "\r\n" +
          resumenFilas;

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `planilla_asistencia_${mesaId}_${fechaDescarga}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      },
    }),
    {
      name: "polis-asistencia-store-v1",
    }
  )
);

const EMPTY_REGISTROS: RegistroAsistencia[] = [];

/**
 * Selector helper para obtener registros de una mesa de manera reactiva
 */
export function useRegistrosMesa(mesaId: string): RegistroAsistencia[] {
  return useAsistenciaStore((s) => s.registros[mesaId] ?? EMPTY_REGISTROS);
}

/**
 * Helper para obtener conteo y métricas por enfoque diferencial
 */
export function calcularResumenEnfoques(registros: RegistroAsistencia[]): {
  total: number;
  porEnfoque: Record<EnfoqueDiferencial, number>;
  porcentajes: Record<EnfoqueDiferencial, number>;
} {
  const total = registros.length;
  const porEnfoque: Record<EnfoqueDiferencial, number> = {
    ninguno: 0,
    afrodescendiente: 0,
    palenquero: 0,
    raizal: 0,
    indigena: 0,
    rrom: 0,
    victima_conflicto: 0,
    discapacidad: 0,
    adulto_mayor: 0,
    juventud: 0,
    mujeres: 0,
    lgbtiq: 0,
  };

  registros.forEach((r) => {
    if (r.enfoqueDiferencial in porEnfoque) {
      porEnfoque[r.enfoqueDiferencial] = (porEnfoque[r.enfoqueDiferencial] ?? 0) + 1;
    }
  });

  const porcentajes: Record<EnfoqueDiferencial, number> = {} as Record<EnfoqueDiferencial, number>;
  (Object.keys(porEnfoque) as EnfoqueDiferencial[]).forEach((k) => {
    porcentajes[k] = total > 0 ? Math.round((porEnfoque[k] / total) * 100) : 0;
  });

  return { total, porEnfoque, porcentajes };
}
