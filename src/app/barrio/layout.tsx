import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Modo Barrio — POLIS Cartagena de Indias",
  description:
    "Vista ciudadana ultraligera y de bajo consumo de datos para participar en la Política de Seguridad Humana de Cartagena.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function BarrioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
