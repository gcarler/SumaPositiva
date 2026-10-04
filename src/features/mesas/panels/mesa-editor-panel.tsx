"use client";

import {Button} from "@/shared/ui/button";
import {FormField} from "@/shared/ui/form-field";
import {Input} from "@/shared/ui/input";
import {Badge} from "@/shared/ui/badge";
import {Checkbox} from "@/shared/ui/checkbox";
import {Label} from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/shared/ui/select";
import {useState, useMemo, useEffect} from "react";
import {useForm, useFieldArray, Controller, useWatch} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {z} from "zod";
import {toast} from "sonner";
import {
  Check,
  ChevronDown,
  MapPin,
  Plus,
  Trash2
} from "lucide-react";
import {motion, AnimatePresence} from "framer-motion";
import {useQueryClient} from "@tanstack/react-query";
import {PanelShell} from "@/core/panels/panel-shell";
import {usePanels} from "@/core/panels/panel-store";
import {useMesa, useMesasStore, type MesaInput} from "@/features/mesas/state/mesas-store";
import {crearMesaRemota} from "@/features/mesas/services/mesas-api";
import {MESAS_KEYS} from "@/features/mesas/services/use-mesas-queries";

/**
 * Panel editor pro de mesa de trabajo — crear o editar.
 * Arquitectura Zero-Modals: formulario RHF + Zod dividido en 3 secciones
 * colapsables con indicador de progreso y listas dinámicas de entidades/responsables.
 */

const entidadItemSchema = z.object({
  id: z.string(),
  nombre: z.string().trim().min(2, "Mínimo 2 caracteres").max(100, "Máximo 100 caracteres"),
  rol: z.string().trim().min(1, "Elige un rol"),
});

const responsableItemSchema = z.object({
  id: z.string(),
  nombre: z.string().trim().min(2, "Mínimo 2 caracteres").max(100, "Máximo 100 caracteres"),
  cargo: z.string().trim().max(100, "Máximo 100 caracteres"),
  esFacilitador: z.boolean(),
});

const mesaSchema = z
  .object({
    // Sección 1 — obligatorios
    nombre: z
      .string()
      .trim()
      .min(6, "Nombra la mesa con al menos 6 caracteres")
      .max(120, "Máximo 120 caracteres"),
    fecha: z.string().min(1, "Elige la fecha de la mesa"),
    horaInicio: z.string().optional().or(z.literal("")),
    horaFin: z.string().optional().or(z.literal("")),
    lugar: z
      .string()
      .trim()
      .min(3, "Indica el lugar de encuentro")
      .max(200, "Máximo 200 caracteres"),

    // Sección 2 — listas dinámicas
    entidades: z.array(entidadItemSchema),
    responsables: z.array(responsableItemSchema),

    // Sección 3 — opcionales
    urlMapa: z.string().url("Debe ser una URL válida").optional().or(z.literal("")),
    coordenadas: z
      .object({
        lat: z.number(),
        lng: z.number(),
      })
      .optional(),
    aforo: z
      .number()
      .int("Debe ser un número entero")
      .min(1, "Mínimo 1")
      .max(100000, "Máximo 100.000")
      .optional(),

    // Al editar mesa cerrada
    totalAsistentes: z
      .number()
      .int("Debe ser un número entero")
      .min(0, "Mínimo 0")
      .optional(),
  })
  .refine(
    (d) => !d.horaInicio || !d.horaFin || d.horaInicio < d.horaFin,
    {
      message: "La hora de inicio debe ser anterior a la hora de fin",
      path: ["horaFin"],
    }
  );

type MesaForm = z.infer<typeof mesaSchema>;

function parsearCoordenadas(url: string): { lat: number; lng: number } | null {
  if (!url) return null;
  const match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (match) return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  const q = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (q) return { lat: parseFloat(q[1]), lng: parseFloat(q[2]) };
  return null;
}

export function MesaEditorPanel({
  entryKey,
  props,
}: {
  entryKey: string;
  props: { mesaId?: string };
}) {
  const { closeTop, openPanel } = usePanels();
  const queryClient = useQueryClient();
  const crearMesa = useMesasStore((s) => s.crearMesa);
  const actualizarMesa = useMesasStore((s) => s.actualizarMesa);
  const mesaEditada = useMesa(props.mesaId ?? "");
  
  const esEdicion = Boolean(props.mesaId && mesaEditada);

  let defaultHoraInicio = "";
  let defaultHoraFin = "";
  if (mesaEditada?.horario) {
    const parts = mesaEditada.horario.split(/[–-]/).map((s) => s.trim());
    if (parts.length >= 2) {
      defaultHoraInicio = parts[0];
      defaultHoraFin = parts[1];
    }
  }

  const defaultEntidades =
    mesaEditada?.entidades && mesaEditada.entidades.length > 0
      ? mesaEditada.entidades
      : mesaEditada?.entidad
      ? [
          {
            id: `ent-${Date.now()}`,
            nombre: mesaEditada.entidad,
            rol: "Convocante",
          },
        ]
      : [];

  const defaultResponsables =
    mesaEditada?.responsables && mesaEditada.responsables.length > 0
      ? mesaEditada.responsables
      : mesaEditada?.facilitador
      ? [
          {
            id: `resp-${Date.now()}`,
            nombre: mesaEditada.facilitador,
            cargo: "Facilitador de mesa",
            esFacilitador: true,
          },
        ]
      : [];

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting, isValid },
  } = useForm<MesaForm>({
    resolver: zodResolver(mesaSchema),
    mode: "onChange",
    defaultValues: {
      nombre: mesaEditada?.nombre ?? "",
      fecha: mesaEditada?.fecha ?? "",
      horaInicio: defaultHoraInicio,
      horaFin: defaultHoraFin,
      lugar: mesaEditada?.lugar ?? "",
      entidades: defaultEntidades,
      responsables: defaultResponsables,
      urlMapa: mesaEditada?.urlMapa ?? "",
      coordenadas: mesaEditada?.coordenadas,
      aforo: mesaEditada?.aforo,
      totalAsistentes: mesaEditada?.totalAsistentes,
    },
  });

  const {
    fields: entidadFields,
    append: appendEntidad,
    remove: removeEntidad,
  } = useFieldArray({
    control,
    name: "entidades",
  });

  const {
    fields: responsableFields,
    append: appendResponsable,
    remove: removeResponsable,
  } = useFieldArray({
    control,
    name: "responsables",
  });

  const handleSetFacilitador = (index: number, checked: boolean) => {
    if (checked) {
      responsableFields.forEach((_, idx) => {
        setValue(`responsables.${idx}.esFacilitador`, idx === index, {
          shouldDirty: true,
        });
      });
    } else {
      setValue(`responsables.${index}.esFacilitador`, false, {
        shouldDirty: true,
      });
    }
  };

  const urlMapaValue = useWatch({ control, name: "urlMapa" });
  const coordsDetectadas = useMemo(() => {
    return urlMapaValue ? parsearCoordenadas(urlMapaValue) : null;
  }, [urlMapaValue]);

  useEffect(() => {
    if (coordsDetectadas) {
      setValue("coordenadas", coordsDetectadas, { shouldDirty: true });
    }
  }, [coordsDetectadas, setValue]);

  // Secciones colapsables
  const [seccion1Abierta, setSeccion1Abierta] = useState(true);
  const [seccion2Abierta, setSeccion2Abierta] = useState(false);
  const [seccion3Abierta, setSeccion3Abierta] = useState(false);

  const watchNombre = useWatch({ control, name: "nombre" });
  const watchFecha = useWatch({ control, name: "fecha" });
  const watchLugar = useWatch({ control, name: "lugar" });
  const watchAforo = useWatch({ control, name: "aforo" });
  const watchCoords = useWatch({ control, name: "coordenadas" });

  const seccion1Valida =
    (watchNombre?.trim()?.length ?? 0) >= 6 &&
    Boolean(watchFecha) &&
    (watchLugar?.trim()?.length ?? 0) >= 3;

  const seccion2Iniciada =
    (entidadFields?.length ?? 0) > 0 || (responsableFields?.length ?? 0) > 0;

  const seccion3Iniciada =
    Boolean(urlMapaValue?.trim()) ||
    Boolean(watchAforo) ||
    Boolean(watchCoords);

  const seccionesCompletadas =
    (seccion1Valida ? 1 : 0) +
    (seccion2Iniciada ? 1 : 0) +
    (seccion3Iniciada ? 1 : 0);

  const guardar = async (data: MesaForm) => {
    const horario =
      data.horaInicio && data.horaFin
        ? `${data.horaInicio} – ${data.horaFin}`
        : data.horaInicio || data.horaFin || undefined;

    const entidadPrincipal = data.entidades?.[0]?.nombre;
    const facilitadorPrincipal =
      data.responsables?.find((r) => r.esFacilitador)?.nombre ??
      data.responsables?.[0]?.nombre;

    const mesaPayload: MesaInput = {
      nombre: data.nombre,
      fecha: data.fecha,
      lugar: data.lugar,
      horario,
      entidad: entidadPrincipal,
      facilitador: facilitadorPrincipal,
      entidades: data.entidades,
      responsables: data.responsables,
      urlMapa: data.urlMapa || undefined,
      coordenadas: data.coordenadas,
      aforo: data.aforo,
      totalAsistentes: data.totalAsistentes,
    };

    if (esEdicion && props.mesaId) {
      actualizarMesa(props.mesaId, mesaPayload);
      queryClient.invalidateQueries({ queryKey: MESAS_KEYS.all });
      queryClient.invalidateQueries({
        queryKey: MESAS_KEYS.detail(props.mesaId),
      });
      toast.success("Mesa actualizada", {
        description: "Los datos de la mesa quedaron al día.",
      });
      closeTop();
      return;
    }

    const mesa = crearMesa(mesaPayload);
    crearMesaRemota({
      nombre: data.nombre,
      fecha: data.fecha,
      lugar: data.lugar,
      entidad: entidadPrincipal ?? "Secretaría de Planeación",
      facilitador: facilitadorPrincipal ?? "",
      totalAsistentes: data.totalAsistentes ?? 0,
    })
      .then((remota) => {
        if (remota?.id) {
          actualizarMesa(mesa.id, {
            codigoOficial: remota.codigoOficial,
            shortcodeCiudadano: remota.shortcodeCiudadano,
          });
          queryClient.invalidateQueries({ queryKey: MESAS_KEYS.all });
        }
      })
      .catch(() => {});

    toast.success("Mesa creada", {
      description: "Registra la plenaria y crea las submesas para empezar.",
    });
    closeTop();
    openPanel("mesa", { mesaId: mesa.id });
  };

  return (
    <PanelShell
      entryKey={entryKey}
      crumbs={[{ label: "Mesas de trabajo" }]}
      kicker={esEdicion ? "Editor Pro de mesa" : "Nueva mesa de trabajo"}
      title={esEdicion ? "Editar datos de la mesa" : "Crear mesa de trabajo"}
      subtitle="Configura la convocatoria comunitaria, las entidades responsables y la logística territorial."
      onClose={closeTop}
      onCloseToKey={closeTop}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="hidden text-xs text-[var(--text-secondary)] sm:block">
            La Sección 1 es obligatoria para guardar.
          </p>
          <div className="flex gap-2 sm:ml-auto">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={closeTop}
              className="flex-1 sm:flex-none"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="form-mesa-pro"
              size="sm"
              disabled={!isValid}
              loading={isSubmitting}
              loadingLabel="Guardando…"
              className="flex-1 sm:flex-none"
            >
              {esEdicion ? (
                <Check className="size-4" />
              ) : (
                <Plus className="size-4" />
              )}
              {esEdicion ? "Guardar cambios" : "Crear mesa"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="ui-panel-body w-full space-y-6 px-4 sm:px-6 lg:px-8 2xl:px-10">
        {/* Barra de progreso de configuración */}
        <div className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-[var(--text-secondary)]">
              Progreso de la configuración
            </span>
            <span className="text-[var(--text-tertiary)] tabular">
              {seccionesCompletadas} de 3 secciones {seccionesCompletadas === 3 ? "completas" : "configuradas"}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
            <div
              className="h-full bg-[var(--ember)] transition-all duration-300"
              style={{ width: `${(seccionesCompletadas / 3) * 100}%` }}
            />
          </div>
        </div>

        <form
          id="form-mesa-pro"
          onSubmit={handleSubmit(guardar)}
          noValidate
          className="space-y-4"
        >
          {/* SECCIÓN 1 — INFORMACIÓN BÁSICA */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] overflow-hidden">
            <Button
              variant="unstyled"
              type="button"
              onClick={() => setSeccion1Abierta((prev) => !prev)}
              className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-[var(--surface-2)]"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-xs font-semibold text-[var(--text-secondary)]">
                  1
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                    Información básica
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] truncate">
                    Nombre, fecha, horario y lugar de encuentro
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                {seccion1Valida ? (
                  <Badge variant="success" className="text-[11px]">
                    Completado ✓
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[11px] text-[var(--warning)] border-[var(--warning)]/30">
                    Requerido *
                  </Badge>
                )}
                <ChevronDown
                  className={`size-4 text-[var(--text-tertiary)] transition-transform duration-200 ${
                    seccion1Abierta ? "rotate-180 text-[var(--text-primary)]" : ""
                  }`}
                />
              </div>
            </Button>

            <AnimatePresence initial={false}>
              {seccion1Abierta && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22 }}
                  className="border-t border-[var(--border)] p-4 sm:p-5"
                >
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 lg:grid-cols-4">
                    <FormField
                      id="mesa-nombre"
                      label="Nombre de la mesa"
                      required
                      error={errors.nombre?.message}
                      className="col-span-full"
                    >
                      {(controlProps) => (
                        <Input
                          {...controlProps}
                          {...register("nombre")}
                          placeholder="Ej.: Mesa territorial de Movilidad Segura y Convivencia"
                        />
                      )}
                    </FormField>

                    <FormField
                      id="mesa-fecha"
                      label="Fecha"
                      required
                      error={errors.fecha?.message}
                      className="col-span-1 sm:col-span-1 lg:col-span-2"
                    >
                      {(controlProps) => (
                        <Input
                          {...controlProps}
                          type="date"
                          {...register("fecha")}
                        />
                      )}
                    </FormField>

                    <FormField
                      id="mesa-hora-inicio"
                      label="Hora de inicio"
                      error={errors.horaInicio?.message}
                      className="col-span-1 sm:col-span-1"
                    >
                      {(controlProps) => (
                        <Input
                          {...controlProps}
                          type="time"
                          placeholder="08:30"
                          {...register("horaInicio")}
                        />
                      )}
                    </FormField>

                    <FormField
                      id="mesa-hora-fin"
                      label="Hora de fin"
                      error={errors.horaFin?.message}
                      className="col-span-1 sm:col-span-1"
                    >
                      {(controlProps) => (
                        <Input
                          {...controlProps}
                          type="time"
                          placeholder="12:00"
                          {...register("horaFin")}
                        />
                      )}
                    </FormField>

                    <FormField
                      id="mesa-lugar"
                      label="Lugar"
                      required
                      error={errors.lugar?.message}
                      className="col-span-full"
                    >
                      {(controlProps) => (
                        <Input
                          {...controlProps}
                          {...register("lugar")}
                          placeholder="Ej.: Centro Cultural Las Palmeras, Salón Comunal"
                        />
                      )}
                    </FormField>

                    {esEdicion && mesaEditada?.estado === "cerrada" && (
                      <FormField
                        id="mesa-asistentes"
                        label="Total de asistentes confirmados"
                        error={errors.totalAsistentes?.message}
                        description="Disponible para mesas cerradas con planilla de asistencia."
                        className="col-span-full sm:col-span-2"
                      >
                        {(controlProps) => (
                          <Input
                            {...controlProps}
                            type="number"
                            min={0}
                            placeholder="47"
                            {...register("totalAsistentes", {
                              setValueAs: (v) =>
                                v === "" || v === null || isNaN(Number(v))
                                  ? undefined
                                  : Number(v),
                            })}
                          />
                        )}
                      </FormField>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* SECCIÓN 2 — ENTIDADES Y PERSONAS RESPONSABLES */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] overflow-hidden">
            <Button
              variant="unstyled"
              type="button"
              onClick={() => setSeccion2Abierta((prev) => !prev)}
              className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-[var(--surface-2)]"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-xs font-semibold text-[var(--text-secondary)]">
                  2
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                    Entidades y personas responsables
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] truncate">
                    Dependencias organizadoras y equipo facilitador
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                {seccion2Iniciada ? (
                  <Badge variant="success" className="text-[11px]">
                    Completado ✓
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[11px]">
                    Opcional
                  </Badge>
                )}
                <ChevronDown
                  className={`size-4 text-[var(--text-tertiary)] transition-transform duration-200 ${
                    seccion2Abierta ? "rotate-180 text-[var(--text-primary)]" : ""
                  }`}
                />
              </div>
            </Button>

            <AnimatePresence initial={false}>
              {seccion2Abierta && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22 }}
                  className="border-t border-[var(--border)] p-4 sm:p-5"
                >
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Entidades */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                          Entidades responsables
                        </h4>
                        <p className="text-xs text-[var(--text-secondary)]">
                          Secretarías distritales o dependencias aliadas
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        onClick={() =>
                          appendEntidad({
                            id: `ent-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                            nombre: "",
                            rol: "Convocante",
                          })
                        }
                        className="gap-1.5 text-xs"
                      >
                        <Plus className="size-3.5" />
                        Agregar entidad
                      </Button>
                    </div>

                    {entidadFields.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-[var(--border)] p-3.5 text-center text-xs text-[var(--text-tertiary)]">
                        Sin entidades añadidas. Puedes agregar convocantes o aliadas.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {entidadFields.map((item, index) => (
                          <div
                            key={item.id}
                            className="flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 sm:flex-row sm:items-start"
                          >
                            <div className="flex-1 min-w-0">
                              <FormField
                                id={`entidad-nombre-${item.id}`}
                                label="Nombre de la entidad"
                                error={errors.entidades?.[index]?.nombre?.message}
                              >
                                {(controlProps) => (
                                  <Input
                                    {...controlProps}
                                    {...register(`entidades.${index}.nombre` as const)}
                                    placeholder="Ej.: Secretaría de Participación Ciudadana"
                                    className="bg-[var(--surface-1)]"
                                  />
                                )}
                              </FormField>
                            </div>
                            <div className="w-full sm:w-44">
                              <FormField
                                id={`entidad-rol-${item.id}`}
                                label="Rol institucional"
                                error={errors.entidades?.[index]?.rol?.message}
                              >
                                {(controlProps) => (
                                  <Controller
                                    control={control}
                                    name={`entidades.${index}.rol` as const}
                                    render={({ field: selectField }) => (
                                      <Select
                                        value={selectField.value}
                                        onValueChange={selectField.onChange}
                                      >
                                        <SelectTrigger id={controlProps.id} className="w-full bg-[var(--surface-1)]">
                                          <SelectValue placeholder="Rol" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="Convocante">Convocante</SelectItem>
                                          <SelectItem value="Coorganizadora">Coorganizadora</SelectItem>
                                          <SelectItem value="Aliada">Aliada</SelectItem>
                                          <SelectItem value="Apoyo técnico">Apoyo técnico</SelectItem>
                                        </SelectContent>
                                    </Select>
                                  )}
                                />
                              )}
                            </FormField>
                          </div>
                          <div className="sm:pt-6">
                            <Button
                              variant="ghost"
                              size="sm"
                              type="button"
                              onClick={() => removeEntidad(index)}
                              className="text-[var(--text-tertiary)] hover:text-destructive"
                              aria-label={`Eliminar entidad ${index + 1}`}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Personas responsables */}
                <div className="space-y-3 pt-6 border-t border-[var(--border)] lg:border-t-0 lg:pt-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                        Personas responsables
                      </h4>
                      <p className="text-xs text-[var(--text-secondary)]">
                        Facilitador y equipo de apoyo comunitario
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() =>
                        appendResponsable({
                          id: `resp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                          nombre: "",
                          cargo: "",
                          esFacilitador: responsableFields.length === 0,
                        })
                      }
                      className="gap-1.5 text-xs"
                    >
                      <Plus className="size-3.5" />
                      Agregar persona
                    </Button>
                  </div>

                  {responsableFields.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-[var(--border)] p-3.5 text-center text-xs text-[var(--text-tertiary)]">
                      Sin personas asignadas aún. Puedes designar el facilitador de la dinámica.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {responsableFields.map((item, index) => (
                        <div
                          key={item.id}
                          className="flex flex-col gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                            <div className="flex-1 min-w-0">
                              <FormField
                                id={`resp-nombre-${item.id}`}
                                label="Nombre y apellido"
                                error={errors.responsables?.[index]?.nombre?.message}
                              >
                                {(controlProps) => (
                                  <Input
                                    {...controlProps}
                                    {...register(`responsables.${index}.nombre` as const)}
                                    placeholder="Ej.: Carlos Pérez"
                                    className="bg-[var(--surface-1)]"
                                  />
                                )}
                              </FormField>
                            </div>
                            <div className="w-full sm:w-48">
                              <FormField
                                id={`resp-cargo-${item.id}`}
                                label="Cargo o función"
                                error={errors.responsables?.[index]?.cargo?.message}
                              >
                                {(controlProps) => (
                                  <Input
                                    {...controlProps}
                                    {...register(`responsables.${index}.cargo` as const)}
                                    placeholder="Ej.: Enlace territorial"
                                    className="bg-[var(--surface-1)]"
                                  />
                                )}
                              </FormField>
                            </div>
                            <div className="sm:pt-6">
                              <Button
                                variant="ghost"
                                size="sm"
                                type="button"
                                onClick={() => removeResponsable(index)}
                                className="text-[var(--text-tertiary)] hover:text-destructive"
                                aria-label={`Eliminar persona ${index + 1}`}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)]/50">
                            <Controller
                              control={control}
                              name={`responsables.${index}.esFacilitador` as const}
                              render={({ field: cbField }) => (
                                <Checkbox
                                  id={`resp-fac-${item.id}`}
                                  checked={cbField.value}
                                  onCheckedChange={(checked) =>
                                    handleSetFacilitador(index, Boolean(checked))
                                  }
                                />
                              )}
                            />
                            <Label
                              htmlFor={`resp-fac-${item.id}`}
                              className="text-xs text-[var(--text-secondary)] cursor-pointer select-none font-medium"
                            >
                              Facilitador principal de la mesa (máximo 1 a la vez)
                            </Label>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
          </AnimatePresence>
        </div>

        {/* SECCIÓN 3 — UBICACIÓN Y LOGÍSTICA */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] overflow-hidden">
          <Button
            variant="unstyled"
            type="button"
            onClick={() => setSeccion3Abierta((prev) => !prev)}
            className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-[var(--surface-2)]"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-xs font-semibold text-[var(--text-secondary)]">
                3
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                  Ubicación y logística
                </p>
                <p className="text-xs text-[var(--text-secondary)] truncate">
                  Enlace de mapas, geolocalización y capacidad de aforo
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              {seccion3Iniciada ? (
                <Badge variant="success" className="text-[11px]">
                  Completado ✓
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[11px]">
                  Opcional
                </Badge>
              )}
              <ChevronDown
                className={`size-4 text-[var(--text-tertiary)] transition-transform duration-200 ${
                  seccion3Abierta ? "rotate-180 text-[var(--text-primary)]" : ""
                }`}
              />
            </div>
          </Button>

          <AnimatePresence initial={false}>
            {seccion3Abierta && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22 }}
                className="border-t border-[var(--border)] p-4 sm:p-5"
              >
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  <FormField
                    id="mesa-url-mapa"
                    label="Enlace al mapa (Google Maps / Waze / OSM)"
                    error={errors.urlMapa?.message}
                    description="Pega un enlace de Google Maps con ubicación; las coordenadas se detectarán automáticamente."
                    className="col-span-full sm:col-span-2 lg:col-span-2"
                  >
                    {(controlProps) => (
                      <Input
                        {...controlProps}
                        type="url"
                        placeholder="https://maps.google.com/... o enlace Waze / OSM"
                        {...register("urlMapa")}
                      />
                    )}
                  </FormField>

                  <FormField
                    id="mesa-aforo"
                    label="Capacidad máxima del lugar (aforo)"
                    error={errors.aforo?.message}
                    description="Número máximo de participantes permitidos en el espacio."
                    className="col-span-full sm:col-span-2 lg:col-span-1"
                  >
                    {(controlProps) => (
                      <Input
                        {...controlProps}
                        type="number"
                        min={1}
                        max={100000}
                        placeholder="Ej.: 120"
                        {...register("aforo", {
                          setValueAs: (v) =>
                            v === "" || v === null || isNaN(Number(v))
                              ? undefined
                              : Number(v),
                        })}
                      />
                    )}
                  </FormField>

                  {coordsDetectadas && (
                    <div className="col-span-full flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 text-xs text-[var(--success)] font-medium">
                      <MapPin className="size-4 shrink-0 text-[var(--success)]" />
                      <span>
                        📍 Coordenadas detectadas: {coordsDetectadas.lat.toFixed(6)},{" "}
                        {coordsDetectadas.lng.toFixed(6)}
                      </span>
                    </div>
                  )}

                  <FormField
                    id="mesa-lat"
                    label="Latitud (opcional)"
                    error={errors.coordenadas?.lat?.message}
                    className="col-span-1"
                  >
                    {(controlProps) => (
                      <Input
                        {...controlProps}
                        type="number"
                        step="any"
                        placeholder="10.39972"
                        {...register("coordenadas.lat", {
                          setValueAs: (v) =>
                            v === "" || v === null || isNaN(Number(v))
                              ? undefined
                              : Number(v),
                        })}
                      />
                    )}
                  </FormField>

                  <FormField
                    id="mesa-lng"
                    label="Longitud (opcional)"
                    error={errors.coordenadas?.lng?.message}
                    className="col-span-1"
                  >
                    {(controlProps) => (
                      <Input
                        {...controlProps}
                        type="number"
                        step="any"
                        placeholder="-75.51444"
                        {...register("coordenadas.lng", {
                          setValueAs: (v) =>
                            v === "" || v === null || isNaN(Number(v))
                              ? undefined
                              : Number(v),
                        })}
                      />
                    )}
                  </FormField>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </form>
    </div>
  </PanelShell>
  );
}
