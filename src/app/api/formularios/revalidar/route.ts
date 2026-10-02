import { revalidatePath } from "next/cache";
import { z } from "zod";
const entrada = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(80),
});
export async function POST(request: Request) {
  const perfil = await fetch(
    `${process.env.POLIS_BACKEND_URL ?? "http://127.0.0.1:8000"}/api/v1/identidad/perfil`,
    {
      headers: { Authorization: request.headers.get("Authorization") ?? "" },
      cache: "no-store",
    },
  );
  if (!perfil.ok)
    return Response.json(
      { detail: "Sesión inválida" },
      { status: perfil.status === 403 ? 403 : 401 },
    );
  const usuario = z
    .object({ permisos: z.array(z.string()) })
    .safeParse(await perfil.json());
  if (
    !usuario.success ||
    !usuario.data.permisos.includes("formularios:gestionar")
  )
    return Response.json({ detail: "Permiso requerido" }, { status: 403 });
  const datos = entrada.safeParse(await request.json().catch(() => null));
  if (!datos.success)
    return Response.json({ detail: "Slug inválido" }, { status: 422 });
  revalidatePath(`/f/${datos.data.slug}`);
  return Response.json({ actualizado: true });
}
