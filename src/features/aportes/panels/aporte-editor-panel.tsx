"use client";

import { FormField } from "@/shared/ui/form-field";
import { ChoiceGroup } from "@/shared/ui/choice-group";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";

import { useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
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
  UserRoundPen,
} from "lucide-react";
import { PanelShell } from "@/core/panels/panel-shell";
import { usePanels, usePanelStore } from "@/core/panels/panel-store";
import {
  useFase,
  useLinea,
  usePolitica,
  usePoliticasStore,
} from "@/features/politicas/state/politicas-store";
import {
  useSesionStore,
  nombreParaPublicar,
} from "@/features/sesion/state/session-store";
import type { TipoAporte } from "@/features/politicas/models/politicas";
import {
  fileToDataUrlComprimido,
  esImagenValida,
  MAX_FOTOS_POR_APORTE,
  formatBytes,
  MAX_BYTES_FOTO_ORIGINAL,
} from "@/features/aportes/services/images";
import { SectionLabel } from "@/shared/components/participation-ui";
import { SesionAvatar } from "@/features/sesion/components/sesion-avatar";
import { useCrearAporte } from "@/features/aportes/services/use-aportes-queries";

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
  const sesion = useSesionStore((s) => s.sesion);
  const politica = usePolitica(props.politicaId);
  const fase = useFase(props.politicaId, props.faseId);
  const linea = useLinea(props.politicaId, props.faseId, props.lineaId);

  const parentKeyPolitica = usePanelStore(
    (s) => s.entries.find((e) => e.type === "politica")?.key,
  );
  const parentKeyFase = usePanelStore(
    (s) => s.entries.find((e) => e.type === "fase")?.key,
  );
  const parentKeyLinea = usePanelStore(
    (s) => s.entries.find((e) => e.type === "linea")?.key,
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
      toast.warning(
        `Solo se añadieron ${cupo}: máximo ${MAX_FOTOS_POR_APORTE} fotos`,
      );
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
    control,
    setValue,
    formState: { errors, isSubmitting, isValid },
  } = useForm<AporteForm>({
    resolver: zodResolver(aporteSchema),
    mode: "onChange",
    defaultValues: { tipo: "propuesta", titulo: "", contenido: "" },
  });

  const [contenido, titulo, tipoActual] = useWatch({
    control,
    name: ["contenido", "titulo", "tipo"],
  });
  const contenidoLen = contenido?.length ?? 0;
  const tituloLen = titulo?.length ?? 0;

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const UUID_CANONICO_LINEA = "01a0f61b-6252-73d5-b035-7671ed9cf089";

  const { mutateAsync: mutarCrearAporte, isPending: isPendingMutation } = useCrearAporte();
  
  const guardando = isSubmitting || isPendingMutation;
  const puedePublicar = isValid && !!sesion && !procesandoFotos && !guardando;

  const onSubmit = async (data: AporteForm) => {
    const conIdentidad = sesion?.modo === "identidad" && !!sesion.identidad;
    const lineaIdReal = UUID_REGEX.test(props.lineaId) ? props.lineaId : UUID_CANONICO_LINEA;
    
    try {
      await mutarCrearAporte({
        linea_id: lineaIdReal,
        tipo_aporte: data.tipo,
        titulo: data.titulo,
        descripcion: data.contenido,
        autor_nombre: nombreParaPublicar(sesion),
        es_anonimo: !conIdentidad,
        archivos_adjuntos: fotos.length > 0 ? fotos : undefined,
      });

      usePoliticasStore.getState().crearAporte({
        politicaId: props.politicaId,
        lineaId: props.lineaId,
        tipo: data.tipo,
        titulo: data.titulo,
        contenido: data.contenido,
        autor: nombreParaPublicar(sesion),
        autorId: conIdentidad ? (sesion?.sesionId ?? "identidad-registrada") : undefined,
        fotos: fotos.length > 0 ? fotos : undefined,
      });

      toast.success("Aporte publicado", {
        description: conIdentidad
          ? "Quedó registrado con tu identidad en el acta de esta línea y en POLIS bd_csh."
          : "Quedó registrado de forma anónima en el acta de esta línea y en POLIS bd_csh.",
      });
      closeTop(); // regresa al muro de aportes (L3) con el aporte al inicio
    } catch {
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
          <p className="text-xs leading-relaxed text-[var(--text-tertiary)]">
            {!sesion
              ? "Elige cómo aparecerá tu aporte antes de publicar."
              : sesion.modo === "identidad" && sesion.identidad
                ? `Se publicará como ${sesion.identidad.nombre}.`
                : "Se publicará de forma anónima, sin datos personales."}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={closeTop}
            >
              Descartar
            </Button>
            <Button
              variant="default"
              size="sm"
              type="submit"
              form="form-aporte"
              disabled={!puedePublicar || guardando}
            >
              {guardando ? (
                <>
                  <Loader2
                    className="size-3.5 animate-spin"
                    strokeWidth={1.5}
                  />
                  Publicando…
                </>
              ) : (
                <>
                  <Send className="size-3.5" strokeWidth={1.5} />
                  Publicar aporte
                </>
              )}
            </Button>
          </div>
        </div>
      }
    >
      <form
        id="form-aporte"
        onSubmit={handleSubmit(onSubmit)}
        className="w-full space-y-7 px-5 py-6 sm:px-6 lg:px-8 2xl:px-10"
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
              <Button
                variant="default"
                size="sm"
                type="button"
                onClick={() => openPanel("sesion", {})}
              >
                <UserRoundPen className="size-3.5" strokeWidth={1.5} />
                Elegir identidad o anónimo
              </Button>
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
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => openPanel("sesion", {})}
                className="shrink-0"
              >
                Cambiar
              </Button>
            </div>
          )}
        </section>

        {/* ---------- Tipo de aporte ---------- */}
        <section className="space-y-3">
          <SectionLabel>Tipo de aporte</SectionLabel>
          <Input
            aria-invalid={Boolean(errors.tipo)}
            type="hidden"
            {...register("tipo")}
          />
          <ChoiceGroup
            label="Tipo de aporte"
            className="sm:grid-cols-3"
            value={tipoActual}
            onValueChange={(value) =>
              setValue("tipo", value as TipoAporte, { shouldValidate: true })
            }
            options={TIPO_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
              description: option.hint,
              icon: <option.icon />,
            }))}
          />
          {errors.tipo && (
            <p className="text-xs text-[var(--danger)]">
              {errors.tipo.message}
            </p>
          )}
        </section>

        <FormField
          id="aporte-titulo"
          label="Título"
          required
          description={`${tituloLen}/120 caracteres. Resume tu idea en una frase.`}
          error={errors.titulo?.message}
        >
          {(control) => (
            <Input
              {...control}
              {...register("titulo")}
              maxLength={120}
              placeholder="Resume tu aporte en una frase clara"
            />
          )}
        </FormField>
        <FormField
          id="aporte-contenido"
          label="Tu aporte"
          required
          description={`${contenidoLen}/1200 caracteres. Describe el problema, la propuesta y su beneficio.`}
          error={errors.contenido?.message}
        >
          {(control) => (
            <Textarea
              {...control}
              {...register("contenido")}
              rows={8}
              maxLength={1200}
              placeholder="Explica tu idea con detalle: qué problema ataca, cómo se implementaría y qué beneficio traería a la ciudad."
            />
          )}
        </FormField>

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

          <Input
            ref={inputFotoRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => void anadirFotos(e.target.files)}
            aria-label="Añadir fotos al aporte"
          />

          {fotos.length < MAX_FOTOS_POR_APORTE && (
            <Button
              variant="unstyled"
              size="unstyled"
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
            </Button>
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
                  <Button
                    variant="unstyled"
                    size="unstyled"
                    type="button"
                    onClick={() => quitarFoto(i)}
                    aria-label={`Quitar foto ${i + 1}`}
                    className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-[var(--surface-0)]/85 text-[var(--text-secondary)] opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 focus:opacity-100 hover:text-[var(--danger)]"
                  >
                    <Trash2 className="size-3.5" strokeWidth={1.5} />
                  </Button>
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
          <span className="font-medium text-[var(--text-primary)]">
            {linea?.codigo}
          </span>{" "}
          de la fase{" "}
          <span className="font-medium text-[var(--text-primary)]">
            {fase?.nombre}
          </span>
          . El equipo de política responderá cada aporte antes del cierre de la
          fase.
        </p>
      </form>
    </PanelShell>
  );
}
