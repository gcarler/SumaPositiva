import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Datos | POLIS",
  description: "Sistema de Estadística y Análisis Territorial: fuentes, series, gráficas y mapas con procedencia verificable.",
};

export default function EstadisticaDatosLayout({ children }: { children: ReactNode }) {
  return children;
}
