import type { Metadata } from "next";
import { SeguridadHumanaView } from "@/features/seguridad-humana/views/seguridad-humana-view";
import { Footer } from "@/shared/layout/footer";

export const metadata: Metadata = {
  title: "¿Qué es la Seguridad Humana Integral? — POLIS Cartagena",
  description:
    "Descubre el paradigma de Seguridad Humana Integral de Cartagena: 3 pilares ONU (Res. 66/290), 7 dimensiones territoriales, comparativa frente a la seguridad tradicional y Caja de Herramientas con el ABC descargable.",
  keywords: [
    "Seguridad Humana",
    "Seguridad Humana Integral",
    "Cartagena",
    "POLIS",
    "Resolución 66/290",
    "ONU",
    "Caja de Herramientas",
    "ABC Seguridad Humana",
    "Participación Ciudadana",
    "Políticas Públicas",
  ],
  openGraph: {
    title: "¿Qué es la Seguridad Humana Integral? — POLIS Cartagena",
    description:
      "Conoce los 3 pilares, las 7 dimensiones territoriales, la matriz comparativa y descarga la Caja de Herramientas y el ABC de la Seguridad Humana de Cartagena.",
    url: "/seguridad-humana",
    siteName: "POLIS Cartagena",
    locale: "es_CO",
    type: "website",
  },
};

export default function SeguridadHumanaPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--surface-0)]">
      <SeguridadHumanaView />
      <Footer />
    </div>
  );
}
