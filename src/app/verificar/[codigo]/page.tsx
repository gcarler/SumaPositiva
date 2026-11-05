import { redirect } from "next/navigation";

export const dynamicParams = true;

type Props = {
  params: Promise<{ codigo: string }>;
};

export default async function VerificarPage({ params }: Props) {
  const { codigo } = await params;
  redirect(`/aportes/${encodeURIComponent(codigo)}`);
}
