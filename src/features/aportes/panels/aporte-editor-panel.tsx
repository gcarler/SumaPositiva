"use client";

import { useRef, useState } from "react";
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
  ImagePlus,
  Trash2,
  VenetianMask,
  UserRoundPen,
} from "lucide-react";
import { PanelShell } from "@/components/panels/panel-shell";
import { usePanels, usePanelStore } from "@/stores/panel-store";
import { useFase, useLinea, usePolitica, usePoliticasStore } from "@/stores/politicas-store";
import {
  useSesionStore,
  nombreParaPublicar,
} from "@/stores/session-store";
import type { TipoAporte } from "@/types/domain";
import {
  fileToDataUrlComprimido,
  esImagenValida,
  MAX_FOTOS_POR_APORTE,
  formatBytes,
  MAX_BYTES_FOTO_ORIGINAL,
} from "@/lib/images";
import { SectionLabel, SesionAvatar } from "@/features/politicas/components/ui-bits";

/**
 * Panel L4 — Editor de Aporte Ciudadano (propuesta / anotación / pregunta).
 * React Hook Form + Zod con validación estricta. Cero modales: es un panel más.
 *
 * Identidad: usa la sesión global (anónima o con identidad) elegida en el
 * panel "Tu identidad"; sin sesión, exige elegirla antes de publicar.
 * Fotos: compresión local (canvas → JPEG ≤1600px) antes de entrar al estado.
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
  const { openPanel, closeTop, closeToKey } = usePanels();
  const crearAporte = usePoliticasStore((s) => s.crearAporte);
  const sesion = useSesionStore((s) => s.sesion);
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

  /* ---------- Fotos ---------- */
  const inputFotoRef = useRef<HTMLInputElement>(null);
  const [fotos, setFotos] = useState<string[]>([]);
  const [procesandoFotos, setProcesandoFotos] = useState(false);

  const anadirFotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const cupo = MAX_FOTOS_POR_APORTE - fotos.length;
    const seleccion = Array.from(files).slice(0, Math.max(0, cupo));
    if (seleccion.length === 0) {
      toast.warning(`Máximo ${MAX_FOTOS_POR_APORTE} fotos por aporte`);
      return;
    }
    if (files.length > cupo) {
      toast.warning(`Solo se añadieron ${cupo}: máximo ${MAX_FOTOS_POR_APORTE} fotos`);
    }

    setProcesandoFotos(true);
    const aceptadas: string[] = [];
    for (const file of seleccion) {
      if (!esImagenValida(file)) {
        toast.error(`"${file.name}" no es válida`, {
          description: `Formatos de imagen, hasta ${formatBytes(MAX_BYTES_FOTO_ORIGINAL)} por foto.`,
        });
        continue;
      }
      try {
        aceptadas.push(await fileToDataUrlComprimido(file));
      } catch {
        toast.error(`No se pudo procesar "${file.name}"`, {
          description: "Puede ser un formato no compatible con el navegador.",
        });
      }
    }
    if (aceptadas.length > 0) setFotos((prev) => [...prev, ...aceptadas]);
    setProcesandoFotos(false);
    if (inputFotoRef.current) inputFotoRef.current.value = "";
  };

  const quitarFoto = (idx: number) =>
    setFotos((prev) => prev.filter((_, i) => i !== idx));

  /* ---------- Formulario ---------- */
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

  const puedePublicar = isValid && !!sesion && !procesandoFotos;

  const onSubmit = async (data: AporteForm) => {
    // Simulación de latencia de red — reemplazar por apiFetch cuando exista backend
    await new Promise((r) => setTimeout(r, 600));
    const conIdentidad = sesion?.modo === "identidad" && !!sesion.identidad;
    const creado = crearAporte({
      politicaId: props.politicaId,
      lineaId: props.lineaId,
      tipo: data.tipo,
      titulo: data.titulo,
      contenido: data.contenido,
      autor: nombreParaPublicar(sesion),
      autorId: conIdentidad ? "usr-demo" : undefined,
      fotos: fotos.length > 0 ? fotos : undefined,
    });

    if (creado) {
      toast.success("Aporte publicado", {
        description: conIdentidad
          ? "Quedó registrado con tu identidad en el acta de esta línea."
          : "Quedó registrado de forma anónima en el acta de esta línea.",
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
            {!sesion
              ? "Elige cómo aparecerá tu aporte antes de publicar."
              : sesion.modo === "identidad" && sesion.identidad
                ? `Se publicará como ${sesion.identidad.nombre}.`
                : "Se publicará de forma anónima, sin datos personales."}
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
              disabled={!puedePublicar || isSubmitting}
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
        className="mx-auto w-full max-w-2xl space-y-7 px-5 py-6 sm:px-6 lg:px-8 2xl:px-10"
        noValidate
      >
        {/* ---------- Identidad ---------- */}
        <section className="space-y-3">
          <SectionLabel>Tu identidad</SectionLabel>
          {!sesion ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-[var(--border-strong)] bg-[var(--surface-2)] p-4">
              <p className="w-full text-xs leading-relaxed text-[var(--text-secondary)]">
                Elige cómo aparecerá tu aporte en el acta pública.
              </p>
              <button
                type="button"
                onClick={() => openPanel("sesion", {})}
                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--text-primary)] px-3.5 py-2 text-xs font-medium text-[var(--text-inverse)] transition-opacity hover:opacity-90"
              >
                <UserRoundPen className="size-3.5" strokeWidth={1.5} />
                Elegir identidad o anónimo
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-3.5">
              <SesionAvatar sesion={sesion} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-[var(--text-primary)]">
                  {nombreParaPublicar(sesion)}
                </p>
                <p className="text-[11px] text-[var(--text-tertiary)]">
                  {sesion.modo === "identidad" && sesion.identidad
                    ? "Tu nombre acompañará este aporte"
                    : "Sin datos personales asociados"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => openPanel("sesion", {})}
                className="shrink-0 rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-[11px] font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--ember)] hover:text-[var(--ember)]"
              >
                Cambiar
              </button>
            </div>
          )}
        </section>

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

        {/* ---------- Fotos ---------- */}
        <section className="space-y-3">
          <SectionLabel
            right={
              <span className="text-xs tabular text-[var(--text-tertiary)]">
                {fotos.length}/{MAX_FOTOS_POR_APORTE}
              </span>
            }
          >
            Fotos (opcional)
          </SectionLabel>

          <input
            ref={inputFotoRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => void anadirFotos(e.target.files)}
            aria-label="Añadir fotos al aporte"
          />

          {fotos.length < MAX_FOTOS_POR_APORTE && (
            <button
              type="button"
              onClick={() => inputFotoRef.current?.click()}
              disabled={procesandoFotos}
              className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-dashed border-[var(--border-strong)] bg-[var(--surface-2)] px-4 py-5 text-xs font-medium text-[var(--text-secondary)] transition-all hover:border-[var(--ember)] hover:text-[var(--ember)] disabled:cursor-wait disabled:opacity-60"
            >
              {procesandoFotos ? (
                <>
                  <Loader2 className="size-4 animate-spin" strokeWidth={1.5} />
                  Procesando fotos…
                </>
              ) : (
                <>
                  <ImagePlus className="size-4" strokeWidth={1.5} />
                  Añadir fotos — evidencia, referencia o contexto visual
                </>
              )}
            </button>
          )}

          {fotos.length > 0 && (
            <ul className="grid grid-cols-4 gap-2">
              {fotos.map((src, i) => (
                <li
                  key={`${i}-${src.slice(-16)}`}
                  className="group relative aspect-square overflow-hidden rounded-lg border border-[var(--border)]"
                >
                  <img
                    src={src}
                    alt={`Foto adjunta ${i + 1}`}
                    className="size-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => quitarFoto(i)}
                    aria-label={`Quitar foto ${i + 1}`}
                    className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-[var(--surface-0)]/85 text-[var(--text-secondary)] opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 focus:opacity-100 hover:text-[var(--danger)]"
                  >
                    <Trash2 className="size-3.5" strokeWidth={1.5} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <p className="text-[11px] leading-relaxed text-[var(--text-tertiary)]">
            Las fotos se comprimen en tu dispositivo antes de enviarse. Evita
            rostros o placas de terceros: en modo anónimo la imagen no debe
            identificarte.
          </p>
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
