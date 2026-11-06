import type { Metadata } from "next";
import { MarcoLegalView } from "@/features/marco-legal/views/marco-legal-view";
import { Footer } from "@/shared/layout/footer";

export const metadata: Metadata = {
  title: "Marcos Jurídicos, Doctrinales y Normativos — POLIS Cartagena",
  description:
    "Política Pública de Seguridad Humana de Cartagena de Indias: Acuerdo 139/2024, Decreto Distrital 0730/2023 y Decreto Nacional 0037/2026. Marco de mensajes de datos y privacidad de POLIS, operada por Ples SAS: Ley 527/1999 y Ley 1581/2012. Decreto 1070/2021 como antecedente.",
  keywords: [
    "Marco Legal",
    "Seguridad Humana",
    "Cartagena de Indias",
    "Acuerdo 139 de 2024",
    "Decreto Nacional 0037 de 2026",
    "Decreto Distrital 0730 de 2023",
    "Ley 527 de 1999",
    "Ley 1581 de 2012",
    "Habeas Data",
    "Trazabilidad documental",
    "Ples SAS",
    "POLIS",
  ],
  openGraph: {
    title: "Marcos Jurídicos, Doctrinales y Normativos — POLIS Cartagena",
    description:
      "Diferenciación estructural entre la Política Pública de Seguridad Humana de Cartagena y la plataforma cívica digital POLIS de Ples SAS.",
    url: "/marco-legal",
    siteName: "POLIS Cartagena",
    locale: "es_CO",
    type: "website",
  },
};

export default function MarcoLegalPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--surface-primary)]">
      <MarcoLegalView />
      <Footer />
    </div>
  );
}
