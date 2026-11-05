import type { Metadata } from "next";
import { Footer } from "@/shared/layout/footer";
import { ValidacionRadicadoCliente } from "./validacion-cliente";

export const dynamicParams = true;

type Props = {
  params: Promise<{ codigo: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { codigo } = await params;
  const codigoDecodificado = decodeURIComponent(codigo).trim().toUpperCase();
  return {
    title: `Validación de Radicado ${codigoDecodificado} — POLIS Fe Pública`,
    description: `Verificación oficial de fe pública y constancia auténtica para el radicado ${codigoDecodificado} en la Política Pública de Seguridad Humana de Cartagena de Indias.`,
  };
}

export default async function AporteValidacionPage({ params }: Props) {
  const { codigo } = await params;
  const codigoDecodificado = decodeURIComponent(codigo).trim().toUpperCase();

  return (
    <div className="flex min-h-screen flex-col bg-[var(--surface-primary)]">
      <main id="main-content" tabIndex={-1} className="flex-1 py-4 sm:py-8">
        <ValidacionRadicadoCliente codigoInicial={codigoDecodificado} />
      </main>
      <Footer />
    </div>
  );
}
