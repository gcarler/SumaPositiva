import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listarFormularios, obtenerFormulario, crearFormulario, obtenerAnalitica } from "./formularios-api";
import type { Formulario, AnaliticaFormulario } from "../models/formulario";

export const FORMULARIOS_KEYS = {
  all: ["formularios"] as const,
  detail: (id: string) => ["formularios", id] as const,
  analitica: (id: string) => ["formularios", "analitica", id] as const,
};

const MOCK_FORMULARIOS: Formulario[] = [
  {
    id: "f1",
    titulo: "Consulta Sectorial: Educación 2026",
    descripcion: "Consulta ciudadana sobre prioridades educativas en el distrito.",
    estado: "activo",
    preguntas: [
      { id: "p1", tipo: "opcion_unica", texto: "¿Cuál es el nivel educativo prioritario?", obligatoria: true, opciones: [{ id: "o1", texto: "Básica Primaria" }, { id: "o2", texto: "Básica Secundaria" }, { id: "o3", texto: "Superior" }] },
      { id: "p2", tipo: "likert", texto: "¿Cómo evalúa la infraestructura actual?", obligatoria: true }
    ],
    respuestasCount: 350,
    creadoEn: new Date().toISOString(),
    actualizadoEn: new Date().toISOString(),
  },
  {
    id: "f2",
    titulo: "Borrador: Consulta Territorial Zona Insular",
    descripcion: "Para habitantes de Barú, Tierrabomba, Islas del Rosario.",
    estado: "borrador",
    preguntas: [],
    respuestasCount: 0,
    creadoEn: new Date().toISOString(),
    actualizadoEn: new Date().toISOString(),
  }
];

export function useFormularios() {
  return useQuery({
    queryKey: FORMULARIOS_KEYS.all,
    queryFn: async () => {
      try {
        return await listarFormularios();
      } catch {
        return MOCK_FORMULARIOS;
      }
    },
  });
}

export function useFormularioDetalle(id: string) {
  return useQuery({
    queryKey: FORMULARIOS_KEYS.detail(id),
    queryFn: async () => {
      try {
        return await obtenerFormulario(id);
      } catch {
        const found = MOCK_FORMULARIOS.find(f => f.id === id);
        if (!found) throw new Error("Not found");
        return found;
      }
    },
    enabled: !!id,
  });
}

export function useFormularioAnalitica(id: string) {
  return useQuery({
    queryKey: FORMULARIOS_KEYS.analitica(id),
    queryFn: async () => {
      try {
        return await obtenerAnalitica(id);
      } catch {
        return {
          formularioId: id,
          totalRespuestas: 350,
          porEnfoqueDiferencial: {
            "Ley 1448/11": 45,
            "Ley 1618/13": 20,
            "Ninguno": 285
          },
          respuestasPorPregunta: [
            {
              preguntaId: "p1",
              conteo: { "Básica Primaria": 150, "Básica Secundaria": 120, "Superior": 80 }
            },
            {
              preguntaId: "p2",
              conteo: { "Muy Mala": 50, "Mala": 100, "Regular": 150, "Buena": 40, "Excelente": 10 },
              promedioLikert: 2.5
            }
          ]
        } as AnaliticaFormulario;
      }
    },
    enabled: !!id,
  });
}
