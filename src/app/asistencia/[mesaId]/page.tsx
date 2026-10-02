import type { Metadata } from "next";
import { AGENDA_MESAS } from "@/features/mesas/data/agenda.data";
import { AsistenciaCliente } from "./asistencia-cliente";

type Props = {
  params: Promise<{ mesaId: string }>;
};

export async function generateStaticParams() {
  return AGENDA_MESAS.map((m) => ({ mesaId: m.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { mesaId } = await params;
  const mesa = AGENDA_MESAS.find((m) => m.id === mesaId);

  const titulo = mesa
    ? `Registro de Asistencia — ${mesa.nombre}`
    : "Registro de Asistencia en Puerta — POLIS Cartagena";

  const descripcion = mesa
    ? `Registro de asistencia digital en puerta para la ${mesa.nombre} en ${mesa.lugar}, Cartagena de Indias.`
    : "Registro oficial de participación ciudadana para la Política Pública de Seguridad Humana Integral de Cartagena.";

  return {
    title: `${titulo} | POLIS Cartagena`,
    description: descripcion,
    openGraph: {
      title: titulo,
      description: descripcion,
      siteName: "POLIS Cartagena — Seguridad Humana Integral",
    },
  };
}

export default async function AsistenciaMesaPage({ params }: Props) {
  const { mesaId } = await params;
  return <AsistenciaCliente mesaId={mesaId} />;
}
