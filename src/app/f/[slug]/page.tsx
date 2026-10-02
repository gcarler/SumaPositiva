import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FormularioPublicoPage } from "@/features/formularios/views/formulario-publico-view";
import {
  obtenerFormularioPublico,
  slugsPublicados,
} from "@/features/formularios/services/formulario-publico-server";
import {
  ORIGEN_FORMULARIOS,
  urlFormulario,
} from "@/features/formularios/services/formulario-url";
export const revalidate = 60;
export const dynamicParams = true;
type Props = { params: Promise<{ slug: string }> };
export async function generateStaticParams() {
  return (await slugsPublicados()).map((slug) => ({ slug }));
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const form = await obtenerFormularioPublico(slug);
  if (!form || form === "borrador")
    return {
      title: "Formulario no publicado — POLIS",
      robots: { index: false, follow: false },
    };
  return {
    title: `${form.titulo} — Seguridad Humana Cartagena`,
    description: form.descripcion,
    alternates: { canonical: urlFormulario(slug) },
    openGraph: {
      title: form.titulo,
      description: form.descripcion,
      url: urlFormulario(slug),
      siteName: "Política Pública de Seguridad Humana Integral — Cartagena",
      images: [
        {
          url: `${ORIGEN_FORMULARIOS}/og-image.png`,
          width: 1200,
          height: 630,
          alt: "Seguridad Humana Integral — Cartagena",
        },
      ],
    },
  };
}
export default async function Page({ params }: Props) {
  const { slug } = await params;
  const form = await obtenerFormularioPublico(slug);
  if (!form) notFound();
  return (
    <FormularioPublicoPage
      slug={slug}
      inicial={form === "borrador" ? undefined : form}
      borrador={form === "borrador"}
    />
  );
}
