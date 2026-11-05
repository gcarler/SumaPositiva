import type { Metadata } from "next";
import { MarcoLegalView } from "@/features/marco-legal/views/marco-legal-view";
import { Footer } from "@/shared/layout/footer";

export const metadata: Metadata = {
  title: "Marcos Jurídicos, Doctrinales y Normativos — POLIS Cartagena",
  description:
    "Doble andamiaje normativo diferenciado: Política Pública de Seguridad Humana de Cartagena de Indias (Acuerdo 139/2024, Decreto 037/2026, Decreto 1070/2021) y marco legal de la plataforma cívica digital POLIS operada por Ples SAS (Ley 527/1999, Ley 1581/2012, Ley 1757/2015).",
  keywords: [
    "Marco Legal",
    "Seguridad Humana",
    "Cartagena de Indias",
    "Acuerdo 139 de 2024",
    "Decreto 037 de 2026",
    "Decreto 1070 de 2021",
    "Ley 527 de 1999",
    "Ley 1581 de 2012",
    "Habeas Data",
    "Fe Pública Digital",
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
