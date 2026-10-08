import type { Metadata } from "next";
import { AGENDA_MESAS } from "@/features/mesas/data/agenda.data";
import {
  MAPA_CODIGO_OFICIAL_A_AGENDA,
  MAPA_SHORTCODE_A_AGENDA,
  MAPA_UUID_A_AGENDA,
} from "@/features/geovisor/data/mesas-geovisor.data";
import { AsistenciaCliente } from "./asistencia-cliente";

type Props = {
  params: Promise<{ mesaId: string }>;
};

export const dynamicParams = true;

export async function generateStaticParams() {
  const params: { mesaId: string }[] = [];
  const vistos = new Set<string>();

  const agregar = (id: string) => {
    if (!vistos.has(id)) {
      vistos.add(id);
      params.push({ mesaId: id });
    }
  };

  for (const m of AGENDA_MESAS) {
    agregar(m.id);
  }
  for (const cod of Object.keys(MAPA_CODIGO_OFICIAL_A_AGENDA)) {
    agregar(cod);
    agregar(cod.toLowerCase());
  }
  for (const sc of Object.keys(MAPA_SHORTCODE_A_AGENDA)) {
    agregar(sc);
    agregar(sc.toLowerCase());
  }

  return params;
}

function resolverMesa(mesaId: string) {
  const idLower = mesaId.toLowerCase();
  const codUpper = mesaId.toUpperCase();
  const idMapeado =
    MAPA_CODIGO_OFICIAL_A_AGENDA[codUpper] ||
    MAPA_SHORTCODE_A_AGENDA[codUpper] ||
    MAPA_UUID_A_AGENDA[idLower] ||
    idLower;

  return AGENDA_MESAS.find(
    (m) =>
      m.id.toLowerCase() === idLower ||
      m.id.toLowerCase() === idMapeado.toLowerCase()
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { mesaId } = await params;
  const mesa = resolverMesa(mesaId);

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
