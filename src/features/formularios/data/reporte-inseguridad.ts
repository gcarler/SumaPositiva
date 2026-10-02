import datos from "./reporte-inseguridad.json";
import { formularioSchema } from "../services/formulario-schema";
export const FORMULARIO_REPORTE_INSEGURIDAD = formularioSchema.parse(datos);
export const DIMENSIONES_REPORTE = [
  {
    id: "d1",
    nombre: "Seguridad Personal y Ciudadana",
    token: "--reporte-personal",
    icono: "🛡",
  },
  {
    id: "d2",
    nombre: "Convivencia y Seguridad Comunitaria",
    token: "--reporte-convivencia",
    icono: "🤝",
  },
  {
    id: "d3",
    nombre: "Seguridad Ambiental y del Entorno",
    token: "--reporte-ambiental",
    icono: "♻",
  },
  {
    id: "d4",
    nombre: "Seguridad Económica y Medios de Vida",
    token: "--reporte-economica",
    icono: "💼",
  },
  {
    id: "d5",
    nombre: "Seguridad Alimentaria y Sanitaria",
    token: "--reporte-alimentaria",
    icono: "🍽",
  },
  {
    id: "d6",
    nombre: "Seguridad Política e Institucional",
    token: "--reporte-politica",
    icono: "⚖",
  },
  {
    id: "d7",
    nombre: "Alertas Tempranas y Gestión de Crisis",
    token: "--reporte-alertas",
    icono: "⚠",
  },
] as const;
