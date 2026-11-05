import type { Metadata } from "next";

import { Footer } from "@/shared/layout/footer";
import { IndicadoresCatalogoView } from "@/features/indicadores/views/indicadores-catalogo-view";

export const metadata: Metadata = {
  title: "Catálogo de indicadores — POLIS Cartagena",
  description:
    "Catálogo municipal de indicadores de seguridad humana con fórmula, denominador, fuente, URL, custodio, licencia, año base y estado.",
};

export default function IndicadoresPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--surface-0)]">
      <IndicadoresCatalogoView />
      <Footer />
    </div>
  );
}
