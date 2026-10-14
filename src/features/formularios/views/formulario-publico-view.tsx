"use client";
import { ApiError } from "@/core/http/api-client";
import { ArrowLeft, Landmark } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useSesionStore } from "@/features/sesion/state/session-store";
import { Button } from "@/shared/ui/button";
import { Notice } from "@/shared/ui/notice";
import { FormularioRuntime } from "../components/formulario-runtime";
import type { Formulario } from "../models/formulario";
import { formulariosRemotos } from "../services/formularios-remotos";
import { motivoCierre } from "../services/formulario-engine";
export function FormularioPublicoPage({
  slug,
  inicial,
  borrador = false,
}: {
  slug: string;
  inicial?: Formulario;
  borrador?: boolean;
}) {
  const router = useRouter();
  const sesion = useSesionStore((s) => s.sesion);
  const cargando = useSesionStore((s) => s.cargando);
  const [confirmado, setConfirmado] = useState(false);
  const privado = borrador && !!sesion?.usuarioId;
  const consulta = useQuery({
    queryKey: [
      "formulario-publico",
      slug,
      privado ? "privado" : "publico",
      privado ? sesion?.usuarioId : null,
    ],
    queryFn: () =>
      privado
        ? formulariosRemotos.privado(slug)
        : formulariosRemotos.publico(slug),
    initialData: inicial,
    enabled: !borrador || privado,
    refetchOnWindowFocus: true,
    retry: 1,
  });
  useEffect(() => {
    if (borrador && !cargando && !sesion?.usuarioId) router.replace("/");
  }, [borrador, cargando, sesion?.usuarioId, router]);
  useEffect(() => {
    if (
      consulta.error instanceof ApiError &&
      consulta.error.status === 403 &&
      !sesion?.usuarioId
    )
      router.replace("/");
  }, [consulta.error, sesion?.usuarioId, router]);
  const form = consulta.data;
  const cierre = form ? motivoCierre(form) : undefined;
  return (
    <div className="min-h-screen min-w-0 bg-background text-foreground">
      <a href="#formulario-publico" className="ui-skip-link">
        Saltar al formulario
      </a>
      <header className="border-b border-border bg-surface-1">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:py-5">
          <Link
            href="/"
            aria-label="Ir a la página principal de POLIS"
            className="flex items-center gap-3 transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
          >
            <Landmark
              aria-hidden="true"
              className="size-10 sm:size-12 shrink-0 text-ember"
            />
            <p className="text-xs sm:text-sm font-semibold text-foreground">
              Política Pública de Seguridad Humana Integral — Cartagena 2026–2036
            </p>
          </Link>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="shrink-0 text-xs font-medium"
          >
            <Link href="/" className="inline-flex items-center gap-1.5">
              <ArrowLeft className="size-3.5" />
              <span className="hidden sm:inline">Volver al inicio</span>
              <span className="sm:hidden">Inicio</span>
            </Link>
          </Button>
        </div>
      </header>
      <main
        id="formulario-publico"
        tabIndex={-1}
        className="mx-auto w-full max-w-3xl space-y-5 px-4 py-6 sm:px-6"
      >
        {borrador && (
          <Notice title="Vista previa privada">
            Este borrador no admite respuestas públicas.
          </Notice>
        )}
        {consulta.isPending || !form ? (
          <p role={consulta.error ? "alert" : "status"}>
            {consulta.error
              ? "No se pudo abrir el formulario. Intenta nuevamente."
              : "Preparando formulario…"}
          </p>
        ) : (
          <section className="min-w-0 rounded-2xl border border-border bg-surface-1 p-4 sm:p-6">
            <h1 className="break-words text-2xl font-bold">{form.titulo}</h1>
            <p className="mt-2 whitespace-pre-wrap break-words text-text-secondary">
              {form.descripcion}
            </p>
            <p className="my-4 text-sm text-text-secondary">
              {
                form.preguntas.filter(
                  (p) => !["seccion", "descripcion"].includes(p.tipo),
                ).length
              }{" "}
              preguntas
            </p>
            {consulta.error ? (
              <Notice tone="danger" title="No se pudo verificar la publicación">
                Reintenta antes de responder.{" "}
                <Button
                  variant="outline"
                  onClick={() => void consulta.refetch()}
                >
                  Reintentar
                </Button>
              </Notice>
            ) : confirmado ? (
              <div role="status">
                <h2 className="font-semibold">Respuesta recibida</h2>
                <p className="whitespace-pre-wrap">
                  {form.configuracion.mensajeConfirmacion}
                </p>
              </div>
            ) : cierre && !borrador ? (
              <Notice title="Formulario cerrado">{cierre}</Notice>
            ) : (
              <>
                <h2 className="sr-only">Responder al formulario</h2>
                <FormularioRuntime
                  key={`${form.id}-${form.actualizadoEn}`}
                  form={form}
                  etiquetaEnvio="Enviar respuesta"
                  preview={borrador}
                  enviar={async (respuestas, enfoque) => {
                    await formulariosRemotos.enviar(form, respuestas, enfoque);
                    setConfirmado(true);
                    if (form.configuracion.slug === "reporte-inseguridad")
                      toast.success(
                        "Reporte recibido. Gracias por participar.",
                      );
                  }}
                />
              </>
            )}
          </section>
        )}
      </main>
      <footer className="mx-auto max-w-3xl px-4 py-6 text-center text-xs text-text-secondary">
        © Alcaldía de Cartagena — Secretaría de Planeación Distrital
      </footer>
    </div>
  );
}
