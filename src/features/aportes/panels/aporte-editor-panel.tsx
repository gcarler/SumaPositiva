"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Lightbulb,
  PenLine,
  MessageCircleQuestion,
  Loader2,
  Send,
} from "lucide-react";
import { PanelShell } from "@/components/panels/panel-shell";
import { usePanels, usePanelStore } from "@/stores/panel-store";
import { useFase, useLinea, usePolitica, usePoliticasStore } from "@/stores/politicas-store";
import type { TipoAporte } from "@/types/domain";
import { SectionLabel } from "@/features/politicas/components/ui-bits";

/**
 * Panel L4 — Editor de Aporte Ciudadano (propuesta / anotación / pregunta).
 * React Hook Form + Zod con validación estricta. Cero modales: es un panel más.
 */

const aporteSchema = z.object({
  tipo: z.enum(["propuesta", "anotacion", "pregunta"], {
    message: "Selecciona el tipo de aporte",
  }),
  titulo: z
    .string()
    .trim()
    .min(8, "El título necesita al menos 8 caracteres")
    .max(120, "Máximo 120 caracteres"),
  contenido: z
    .string()
    .trim()
    .min(30, "Desarrolla tu aporte con al menos 30 caracteres")
    .max(1200, "Máximo 1200 caracteres"),
});

type AporteForm = z.infer<typeof aporteSchema>;

const TIPO_OPTIONS: {
  value: TipoAporte;
  label: string;
  hint: string;
  icon: typeof Lightbulb;
}[] = [
  {
    value: "propuesta",
    label: "Propuesta",
    hint: "Propones una acción concreta",
    icon: Lightbulb,
  },
  {
    value: "anotacion",
    label: "Anotación",
    hint: "Aportas contexto o datos",
    icon: PenLine,
  },
  {
    value: "pregunta",
    label: "Pregunta",
    hint: "Solicitas una aclaración",
    icon: MessageCircleQuestion,
  },
];

export function AporteEditorPanel({
  entryKey,
  props,
}: {
  entryKey: string;
  props: { politicaId: string; faseId: string; lineaId: string };
}) {
  const { closeTop, closeToKey } = usePanels();
  const crearAporte = usePoliticasStore((s) => s.crearAporte);
  const politica = usePolitica(props.politicaId);
  const fase = useFase(props.politicaId, props.faseId);
  const linea = useLinea(props.politicaId, props.faseId, props.lineaId);

  const parentKeyPolitica = usePanelStore(
    (s) => s.entries.find((e) => e.type === "politica")?.key
  );
  const parentKeyFase = usePanelStore(
    (s) => s.entries.find((e) => e.type === "fase")?.key
  );
  const parentKeyLinea = usePanelStore(
    (s) => s.entries.find((e) => e.type === "linea")?.key
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting, isValid },
  } = useForm<AporteForm>({
    resolver: zodResolver(aporteSchema),
    mode: "onChange",
    defaultValues: { tipo: "propuesta", titulo: "", contenido: "" },
  });

  const contenidoLen = watch("contenido")?.length ?? 0;
  const tituloLen = watch("titulo")?.length ?? 0;
  const tipoActual = watch("tipo");

  const onSubmit = async (data: AporteForm) => {
    // Simulación de latencia de red — reemplazar por apiFetch cuando exista backend
    await new Promise((r) => setTimeout(r, 600));
    const creado = crearAporte({
      politicaId: props.politicaId,
      lineaId: props.lineaId,
      tipo: data.tipo,
      titulo: data.titulo,
      contenido: data.contenido,
      autor: "Tú",
    });

    if (creado) {
      toast.success("Aporte publicado", {
        description:
          "Quedó registrado en el acta de esta línea. Recibirás respuesta oficial antes del cierre de la fase.",
      });
      closeTop(); // regresa al muro de aportes (L3) con el aporte al inicio
    } else {
      toast.error("No se pudo publicar el aporte", {
        description: "Inténtalo de nuevo en unos segundos.",
      });
    }
  };

  return (
    <PanelShell
      width={640}
      entryKey={entryKey}
      crumbs={[
        { label: politica?.titulo ?? "Política", targetKey: parentKeyPolitica },
        { label: fase?.nombre ?? "Fase", targetKey: parentKeyFase },
        { label: linea?.codigo ?? "Línea", targetKey: parentKeyLinea },
        { label: "Nuevo aporte" },
      ]}
      kicker="Contribución ciudadana"
      title="Nuevo aporte"
      subtitle={linea?.titulo}
      onClose={closeTop}
      onCloseToKey={closeToKey}
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] leading-tight text-[var(--text-tertiary)]">
            Se publica con tu identidad de sesión demo.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={closeTop}
              className="rounded-full border border-[var(--border-strong)] px-4 py-2 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)]"
            >
              Descartar
            </button>
            <button
              type="submit"
              form="form-aporte"
              disabled={isSubmitting || !isValid}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--text-primary)] px-4 py-2 text-xs font-medium text-[var(--text-inverse)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" strokeWidth={1.5} />
                  Publicando…
                </>
              ) : (
                <>
                  <Send className="size-3.5" strokeWidth={1.5} />
                  Publicar aporte
                </>
              )}
            </button>
          </div>
        </div>
      }
    >
      <form
        id="form-aporte"
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-7 px-6 py-6"
        noValidate
      >
        {/* ---------- Tipo de aporte ---------- */}
        <section className="space-y-3">
          <SectionLabel>Tipo de aporte</SectionLabel>
          <input type="hidden" {...register("tipo")} />
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Tipo de aporte">
            {TIPO_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = tipoActual === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setValue("tipo", opt.value, { shouldValidate: true })}
                  className={`flex flex-col items-center gap-1.5 rounded-lg border p-3.5 text-center transition-all ${
                    active
                      ? "border-[var(--ember)] bg-[var(--ember-soft)]"
                      : "border-[var(--border)] bg-[var(--surface-1)] hover:border-[var(--border-strong)]"
                  }`}
                >
                  <Icon
                    className={`size-4 ${active ? "text-[var(--ember)]" : "text-[var(--text-secondary)]"}`}
                    strokeWidth={1.5}
                  />
                  <span
                    className={`text-xs font-medium ${
                      active ? "text-[var(--ember)]" : "text-[var(--text-primary)]"
                    }`}
                  >
                    {opt.label}
                  </span>
                  <span className="text-[10px] leading-tight text-[var(--text-tertiary)]">
                    {opt.hint}
                  </span>
                </button>
              );
            })}
          </div>
          {errors.tipo && (
            <p className="text-xs text-[var(--danger)]">{errors.tipo.message}</p>
          )}
        </section>

        {/* ---------- Título ---------- */}
        <section className="space-y-3">
          <SectionLabel
            right={
              <span
                className={`text-xs tabular ${
                  tituloLen > 120 ? "text-[var(--danger)]" : "text-[var(--text-tertiary)]"
                }`}
              >
                {tituloLen}/120
              </span>
            }
          >
            Título
          </SectionLabel>
          <input
            {...register("titulo")}
            type="text"
            placeholder="Resume tu aporte en una frase clara"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-colors focus:border-[var(--ember)] focus:outline-none"
          />
          {errors.titulo && (
            <p className="text-xs text-[var(--danger)]">{errors.titulo.message}</p>
          )}
        </section>

        {/* ---------- Contenido ---------- */}
        <section className="space-y-3">
          <SectionLabel
            right={
              <span
                className={`text-xs tabular ${
                  contenidoLen > 1200 ? "text-[var(--danger)]" : "text-[var(--text-tertiary)]"
                }`}
              >
                {contenidoLen}/1200
              </span>
            }
          >
            Tu aporte
          </SectionLabel>
          <textarea
            {...register("contenido")}
            rows={8}
            placeholder="Explica tu idea con detalle: qué problema ataca, cómo se implementaría y qué beneficio traería a la ciudad."
            className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3.5 py-3 text-sm leading-relaxed text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-colors focus:border-[var(--ember)] focus:outline-none"
          />
          {errors.contenido && (
            <p className="text-xs text-[var(--danger)]">{errors.contenido.message}</p>
          )}
        </section>

        {/* ---------- Compromiso de trazabilidad ---------- */}
        <p className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4 text-[11px] leading-relaxed text-[var(--text-secondary)]">
          Al publicar, tu aporte se registra en el acta pública de la línea{" "}
          <span className="font-medium text-[var(--text-primary)]">{linea?.codigo}</span>{" "}
          de la fase <span className="font-medium text-[var(--text-primary)]">{fase?.nombre}</span>.
          El equipo de política responderá cada aporte antes del cierre de la fase.
        </p>
      </form>
    </PanelShell>
  );
}
