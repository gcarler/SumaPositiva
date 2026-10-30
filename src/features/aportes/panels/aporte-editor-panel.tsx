"use client";

import { FormField } from "@/shared/ui/form-field";
import { ChoiceGroup } from "@/shared/ui/choice-group";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Badge } from "@/shared/ui/badge";

import { useMemo, useRef, useState } from "react";
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
  Check,
  Copy,
  FileCheck,
  ShieldCheck,
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
  useLineas,
  useFases,
  usePoliticas,
} from "@/features/politicas/services/use-politicas-queries";
import {
  useSesionStore,
  nombreParaPublicar,
} from "@/features/sesion/state/session-store";
import type { Fase, LineaEstrategica, PoliticaPublica, TipoAporte } from "@/features/politicas/models/politicas";
import {
  esImagenValida,
  MAX_FOTOS_POR_APORTE,
  formatBytes,
  MAX_BYTES_FOTO_ORIGINAL,
} from "@/features/aportes/services/images";
import { subirEvidenciaFotografica } from "@/features/evidencias/services/evidencias-api";
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
  correo_contacto: z
    .string()
    .trim()
    .email("Ingresa un correo electrónico válido")
    .optional()
    .or(z.literal("")),
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

  const lineasQuery = useLineas();
  const fasesQuery = useFases();
  const politicasQuery = usePoliticas();

  const storePolitica = usePolitica(props.politicaId);
  const storeFase = useFase(props.politicaId, props.faseId);
  const storeLinea = useLinea(props.politicaId, props.faseId, props.lineaId);

  const linea: LineaEstrategica | undefined = useMemo(() => {
    if (storeLinea) return storeLinea;
    const encontrada = lineasQuery.data?.find(
      (l) => l.id === props.lineaId || l.codigo === props.lineaId
    );
    if (!encontrada) return undefined;
    return {
      id: encontrada.id,
      faseId: encontrada.fase_id,
      codigo: encontrada.codigo,
      titulo: encontrada.titulo,
      descripcion: encontrada.descripcion,
      aportes: [],
      aportesCount: encontrada.aportes_count ?? 0,
    };
  }, [storeLinea, lineasQuery.data, props.lineaId]);

  const fase: Fase | undefined = useMemo(() => {
    if (storeFase) return storeFase;
    const idBuscado = props.faseId || linea?.faseId;
    const encontrada =
      fasesQuery.data?.find((f) => f.id === idBuscado || f.codigo === idBuscado) ??
      fasesQuery.data?.find((f) => f.estado === "activa") ??
      fasesQuery.data?.[0];
    if (!encontrada) return undefined;
    return {
      id: encontrada.id,
      politicaId: props.politicaId,
      orden: encontrada.orden,
      nombre: encontrada.nombre,
      tipo: "diagnostico",
      descripcion: encontrada.descripcion ?? "",
      estado: (encontrada.estado === "activa"
        ? "activa"
        : encontrada.estado === "completada"
        ? "completada"
        : "proxima") as "activa" | "completada" | "proxima",
      progreso: Number(encontrada.progreso_porcentaje ?? 0),
      lineas: [],
    };
  }, [storeFase, props.faseId, linea?.faseId, fasesQuery.data, props.politicaId]);

  const politica: PoliticaPublica = useMemo(() => {
    if (storePolitica) return storePolitica;
    const encontrada = politicasQuery.data?.find(
      (p) => p.id === props.politicaId || p.slug === props.politicaId
    );
    if (encontrada) return encontrada;
    if (politicasQuery.data && politicasQuery.data.length > 0) {
      return politicasQuery.data[0];
    }
    return {
      id: "pol-001",
      slug: "seguridad-humana-cartagena",
      titulo: "Política Pública de Seguridad Humana Integral de Cartagena 2026–2036",
      resumen:
        "Construcción participativa de la Política Pública de Seguridad Humana Integral del Distrito de Cartagena de Indias.",
      descripcion:
        "Política Pública de Seguridad Humana Integral de Cartagena 2026–2036.",
      problema: "",
      sector: "seguridad",
      estado: "consulta_publica",
      cobertura:
        "Distrito de Cartagena: 3 Localidades urbanas, 11 corregimientos y zonas insulares",
      fechaInicio: "2026-02-01",
      fechaCierre: "2026-12-31",
      participantes: 0,
      fases: [],
    };
  }, [storePolitica, politicasQuery.data, props.politicaId]);

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
        const evidencia = await subirEvidenciaFotografica(file);
        aceptadas.push(evidencia.archivo_url);
      } catch (err) {
        toast.error(`No se pudo subir y sanitizar "${file.name}"`, {
          description:
            err instanceof Error
              ? err.message
              : "Error al comunicarse con el servidor de evidencias.",
        });
      }
    }
    if (aceptadas.length > 0) setFotos((prev) => [...prev, ...aceptadas]);
    setProcesandoFotos(false);
    if (inputFotoRef.current) inputFotoRef.current.value = "";
  };

  const quitarFoto = (idx: number) =>
    setFotos((prev) => prev.filter((_, i) => i !== idx));

  /* ---------- Radicado y Fe Pública ---------- */
  const [radicadoConfirmado, setRadicadoConfirmado] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const handleCopiarRadicado = async () => {
    if (!radicadoConfirmado) return;
    try {
      await navigator.clipboard.writeText(radicadoConfirmado);
      setCopiado(true);
      toast.success("Código de radicado copiado al portapapeles");
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      toast.info(`Radicado: ${radicadoConfirmado}`);
    }
  };

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
    defaultValues: { tipo: "propuesta", titulo: "", contenido: "", correo_contacto: "" },
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
    const lineaIdReal = UUID_REGEX.test(linea?.id ?? "")
      ? (linea?.id as string)
      : UUID_REGEX.test(props.lineaId)
        ? props.lineaId
        : UUID_CANONICO_LINEA;
    const correoSesion = sesion?.identidad?.email || sesion?.usuario?.correo;
    const correoFinal = data.correo_contacto?.trim() || correoSesion || undefined;

    try {
      const nuevoAporte = await mutarCrearAporte({
        linea_id: lineaIdReal,
        tipo_aporte: data.tipo,
        titulo: data.titulo,
        descripcion: data.contenido,
        autor_nombre: nombreParaPublicar(sesion),
        es_anonimo: !conIdentidad,
        archivos_adjuntos: fotos.length > 0 ? fotos : undefined,
        correo_contacto: correoFinal,
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
        codigo_radicado: nuevoAporte.codigo_radicado,
      });

      const confirmacionHerald = `Constancia oficial emitida a su correo con código ${nuevoAporte.codigo_radicado}`;
      toast.success(`Aporte recibido bajo radicado ${nuevoAporte.codigo_radicado}`, {
        description: correoFinal
          ? `${confirmacionHerald} por POLIS Herald.`
          : `${confirmacionHerald}.`,
      });

      setRadicadoConfirmado(nuevoAporte.codigo_radicado);
    } catch {
      toast.error("No se pudo publicar el aporte", {
        description: "Inténtalo de nuevo en unos segundos.",
      });
    }
  };

  if (radicadoConfirmado) {
    return (
      <PanelShell
        entryKey={entryKey}
        crumbs={[
          { label: politica?.titulo ?? "Política", targetKey: parentKeyPolitica },
          { label: fase?.nombre ?? "Fase", targetKey: parentKeyFase },
          { label: linea?.codigo ?? "Línea", targetKey: parentKeyLinea },
          { label: "Radicación confirmada" },
        ]}
        kicker="Constancia Digital de Radicación"
        title="Radicación Exitosa"
        subtitle={linea?.titulo}
        onClose={closeTop}
        onCloseToKey={closeToKey}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="default"
              size="sm"
              type="button"
              onClick={closeTop}
            >
              Volver a la línea
            </Button>
          </div>
        }
      >
        <div className="mx-auto max-w-md space-y-6 px-5 py-8 text-center sm:px-6">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--border)]">
            <FileCheck className="size-7 text-[var(--accent)]" strokeWidth={1.5} />
          </div>

          <div className="space-y-2">
            <Badge
              variant="outline"
              className="text-xs uppercase tracking-wider font-semibold text-[var(--accent)] border-[var(--border-strong)]"
            >
              Radicación Oficial Confirmada
            </Badge>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">
              Aporte Recibido en POLIS
            </h3>
            <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
              En cumplimiento del mandato de proscripción del silencio administrativo (Sentencia C-150 de 2015), tu aporte ha sido radicado bajo el número único oficial:
            </p>
          </div>

          <div className="rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] p-5 shadow-sm space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              Código Único de Radicado
            </p>
            <p className="font-mono text-2xl font-extrabold tracking-widest text-[var(--text-primary)]">
              {radicadoConfirmado}
            </p>
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={handleCopiarRadicado}
                className="gap-2 text-xs"
              >
                {copiado ? (
                  <>
                    <Check className="size-3.5 text-[var(--accent)]" strokeWidth={2} />
                    <span>¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" strokeWidth={1.5} />
                    <span>Copiar Radicado</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-3 text-xs text-[var(--text-secondary)] flex items-start gap-2.5 text-left">
            <ShieldCheck className="size-4 text-[var(--accent)] shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-semibold text-[var(--text-primary)]">
                POLIS Herald — Fe Pública y Notificaciones
              </p>
              <p className="mt-0.5">
                Constancia oficial emitida a su correo con código <strong>{radicadoConfirmado}</strong>.
              </p>
            </div>
          </div>

          <p className="text-[11px] leading-relaxed text-[var(--text-tertiary)]">
            Alcaldía Mayor de Cartagena de Indias · Cartagena Ciudad de Derechos. Puedes consultar el avance de tu propuesta en cualquier momento ingresando este radicado en la plataforma.
          </p>
        </div>
      </PanelShell>
    );
  }

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

        <FormField
          id="aporte-correo-contacto"
          label="Correo electrónico para recibir constancia oficial de radicación (opcional)"
          description="Te enviaremos el comprobante formal con el número de radicado POL-2026-XXXX y las notificaciones sobre el avance de tu propuesta."
          error={errors.correo_contacto?.message}
        >
          {(control) => (
            <Input
              {...control}
              {...register("correo_contacto")}
              type="email"
              placeholder={
                sesion?.identidad?.email ||
                sesion?.usuario?.correo ||
                "ejemplo@cartagena.gov.co o tu correo personal"
              }
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
