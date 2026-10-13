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
import {useState, useMemo, useEffect, useCallback} from "react";
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
import {Notice} from "@/shared/ui/notice";
import {useMesa, useMesasStore, type MesaInput} from "@/features/mesas/state/mesas-store";
import {actualizarMesaRemota, crearMesaRemota} from "@/features/mesas/services/mesas-api";
import {useMesaQuery, MESAS_KEYS} from "@/features/mesas/services/use-mesas-queries";
import {useSesionStore} from "@/features/sesion/state/session-store";
import {puedeEditar} from "@/features/plataforma/models/acceso";
import dynamic from "next/dynamic";
import {
  esEnlaceCorto,
  parsearCoordenadasUrl,
  parsearTextoCoordenadas,
  validarLimitesCartagena,
  type Coordenadas,
} from "@/features/mesas/lib/coordenadas-parser";

const SelectorUbicacionMesa = dynamic(
  () =>
    import("@/features/mesas/components/selector-ubicacion-mesa").then(
      (m) => m.SelectorUbicacionMesa
    ),
  { ssr: false }
);

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
        lat: z.number().min(-90, "Latitud entre -90 y 90").max(90, "Latitud entre -90 y 90"),
        lng: z.number().min(-180, "Longitud entre -180 y 180").max(180, "Longitud entre -180 y 180"),
      })
      .optional()
      .nullable(),
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

export function MesaEditorPanel({
  entryKey,
  props,
}: {
  entryKey: string;
  props: { mesaId?: string };
}) {
  const { closeTop, openPanel } = usePanels();
  const queryClient = useQueryClient();
  const sesion = useSesionStore((s) => s.sesion);
  const puedeModificar = puedeEditar(sesion, "mesas");
  const crearMesa = useMesasStore((s) => s.crearMesa);
  const actualizarMesa = useMesasStore((s) => s.actualizarMesa);

  const { data: mesaRemota, isLoading: cargandoRemota } = useMesaQuery(props.mesaId ?? "");
  const mesaStore = useMesa(props.mesaId ?? "");
  const mesaEditada = mesaRemota ?? mesaStore;
  
  const esEdicion = Boolean(props.mesaId);

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
    reset,
    formState: { errors, isSubmitting, isDirty },
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

  // Sincronizar reactivamente cuando la mesa remota o del store cargue (FIX-EDIT-MESA-01)
  useEffect(() => {
    if (mesaEditada && !isDirty) {
      let hInicio = "";
      let hFin = "";
      if (mesaEditada.horario) {
        const parts = mesaEditada.horario.split(/[–-]/).map((s) => s.trim());
        if (parts.length >= 2) {
          hInicio = parts[0];
          hFin = parts[1];
        }
      }

      const entidadesSincronizadas =
        mesaEditada.entidades && mesaEditada.entidades.length > 0
          ? mesaEditada.entidades
          : mesaEditada.entidad
          ? [
              {
                id: `ent-${Date.now()}`,
                nombre: mesaEditada.entidad,
                rol: "Convocante",
              },
            ]
          : [];

      const responsablesSincronizados =
        mesaEditada.responsables && mesaEditada.responsables.length > 0
          ? mesaEditada.responsables
          : mesaEditada.facilitador
          ? [
              {
                id: `resp-${Date.now()}`,
                nombre: mesaEditada.facilitador,
                cargo: "Facilitador de mesa",
                esFacilitador: true,
              },
            ]
          : [];

      reset({
        nombre: mesaEditada.nombre ?? "",
        fecha: mesaEditada.fecha ?? "",
        horaInicio: hInicio,
        horaFin: hFin,
        lugar: mesaEditada.lugar ?? "",
        entidades: entidadesSincronizadas,
        responsables: responsablesSincronizados,
        urlMapa: mesaEditada.urlMapa ?? "",
        coordenadas: mesaEditada.coordenadas,
        aforo: mesaEditada.aforo,
        totalAsistentes: mesaEditada.totalAsistentes,
      });
    }
  }, [mesaEditada, isDirty, reset]);

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
  const esUrlCorta = useMemo(() => Boolean(urlMapaValue && esEnlaceCorto(urlMapaValue)), [urlMapaValue]);
  const coordsDetectadasUrl = useMemo(() => {
    return urlMapaValue ? parsearCoordenadasUrl(urlMapaValue) : null;
  }, [urlMapaValue]);

  const watchCoords = useWatch({ control, name: "coordenadas" });
  const watchLat = useWatch({ control, name: "coordenadas.lat" });
  const watchLng = useWatch({ control, name: "coordenadas.lng" });

  const coordenadasActuales = useMemo<Coordenadas | undefined>(() => {
    if (watchLat !== undefined && watchLng !== undefined && watchLat !== null && watchLng !== null) {
      const latNum = Number(watchLat);
      const lngNum = Number(watchLng);
      if (Number.isFinite(latNum) && Number.isFinite(lngNum)) {
        return { lat: latNum, lng: lngNum };
      }
    }
    if (watchCoords && Number.isFinite(watchCoords.lat) && Number.isFinite(watchCoords.lng)) {
      return { lat: Number(watchCoords.lat), lng: Number(watchCoords.lng) };
    }
    return undefined;
  }, [watchCoords, watchLat, watchLng]);

  const fijarCoordenadas = useCallback(
    (coords: Coordenadas | null | undefined, dirty = true) => {
      setValue("coordenadas", coords ?? undefined, { shouldDirty: dirty, shouldValidate: true });
      setValue("coordenadas.lat", coords ? coords.lat : (undefined as unknown as number), {
        shouldDirty: dirty,
        shouldValidate: true,
      });
      setValue("coordenadas.lng", coords ? coords.lng : (undefined as unknown as number), {
        shouldDirty: dirty,
        shouldValidate: true,
      });
    },
    [setValue]
  );

  useEffect(() => {
    if (coordsDetectadasUrl) {
      fijarCoordenadas(coordsDetectadasUrl);
    }
  }, [coordsDetectadasUrl, fijarCoordenadas]);

  // Secciones colapsables: Sección 1 y Sección 3 abiertas por defecto según [MESA-UBIC-01]
  const [seccion1Abierta, setSeccion1Abierta] = useState(true);
  const [seccion2Abierta, setSeccion2Abierta] = useState(false);
  const [seccion3Abierta, setSeccion3Abierta] = useState(true);

  const watchNombre = useWatch({ control, name: "nombre" });
  const watchFecha = useWatch({ control, name: "fecha" });
  const watchLugar = useWatch({ control, name: "lugar" });
  const watchAforo = useWatch({ control, name: "aforo" });

  // Coordenadas planas combinadas (sincronizadas bidireccionalmente)
  const [textoCoordsPlanas, setTextoCoordsPlanas] = useState("");

  useEffect(() => {
    if (coordenadasActuales && Number.isFinite(coordenadasActuales.lat) && Number.isFinite(coordenadasActuales.lng)) {
      const parsed = parsearTextoCoordenadas(textoCoordsPlanas);
      if (
        !parsed ||
        Math.abs(parsed.lat - coordenadasActuales.lat) > 0.00001 ||
        Math.abs(parsed.lng - coordenadasActuales.lng) > 0.00001
      ) {
        setTextoCoordsPlanas(`${coordenadasActuales.lat.toFixed(5)}, ${coordenadasActuales.lng.toFixed(5)}`);
      }
    } else if (!coordenadasActuales && textoCoordsPlanas) {
      setTextoCoordsPlanas("");
    }
  }, [coordenadasActuales]);

  const advertenciaCartagena = useMemo(() => {
    if (!coordenadasActuales || !Number.isFinite(coordenadasActuales.lat) || !Number.isFinite(coordenadasActuales.lng)) {
      return null;
    }
    const res = validarLimitesCartagena(coordenadasActuales.lat, coordenadasActuales.lng);
    return res.dentroDeCartagena ? null : res.advertencia;
  }, [coordenadasActuales]);

  const seccion1Valida =
    (watchNombre?.trim()?.length ?? 0) >= 6 &&
    Boolean(watchFecha) &&
    (watchLugar?.trim()?.length ?? 0) >= 3;

  const seccion2Iniciada =
    (entidadFields?.length ?? 0) > 0 || (responsableFields?.length ?? 0) > 0;

  const seccion3Iniciada =
    Boolean(urlMapaValue?.trim()) ||
    Boolean(watchAforo) ||
    Boolean(coordenadasActuales);

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

    const coordsFinales = coordenadasActuales ?? data.coordenadas ?? undefined;

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
      coordenadas: coordsFinales,
      aforo: data.aforo,
    };

    if (esEdicion && props.mesaId) {
      const targetId = mesaEditada?.id || props.mesaId;
      actualizarMesa(targetId, { ...mesaPayload, totalAsistentes: data.totalAsistentes });

      if (!puedeModificar && !sesion?.token) {
        toast.info("Cambios guardados localmente", {
          description: "Inicia sesión con rol institucional para persistir en la base de datos oficial.",
        });
        closeTop();
        return;
      }

      try {
        const remota = await actualizarMesaRemota(targetId, mesaPayload);
        if (remota?.id) {
          actualizarMesa(remota.id, remota);
        }
        queryClient.invalidateQueries({ queryKey: MESAS_KEYS.all });
        queryClient.invalidateQueries({
          queryKey: MESAS_KEYS.detail(targetId),
        });
        if (props.mesaId !== targetId) {
          queryClient.invalidateQueries({
            queryKey: MESAS_KEYS.detail(props.mesaId),
          });
        }
        toast.success("Mesa actualizada", {
          description: "Los datos de la mesa quedaron al día.",
        });
        closeTop();
      } catch (err) {
        toast.error("No se pudo actualizar la mesa", {
          description: err instanceof Error ? err.message : "Error del servidor",
        });
      }
      return;
    }

    try {
      const remota = await crearMesaRemota({
        nombre: data.nombre,
        fecha: data.fecha,
        lugar: data.lugar,
        entidad: entidadPrincipal ?? "Secretaría de Planeación",
        facilitador: facilitadorPrincipal ?? "",
        totalAsistentes: data.totalAsistentes ?? 0,
        horario,
        aforo: data.aforo,
        coordenadas: coordsFinales,
        urlMapa: data.urlMapa || undefined,
        entidades: data.entidades,
        responsables: data.responsables,
      });

      if (remota?.id) {
        crearMesa({
          ...mesaPayload,
          id: remota.id,
          codigoOficial: remota.codigoOficial,
          shortcodeCiudadano: remota.shortcodeCiudadano,
        });
        queryClient.invalidateQueries({ queryKey: MESAS_KEYS.all });
        toast.success("Mesa creada exitosamente", {
          description: `Código: ${remota.codigoOficial || remota.nombre}`,
        });
        closeTop();
        openPanel("mesa", { mesaId: remota.id });
      }
    } catch (err) {
      toast.error("No se pudo crear la mesa", {
        description: err instanceof Error ? err.message : "Error del servidor",
      });
    }
  };

  const onInvalid = (fieldErrors: typeof errors) => {
    if (
      fieldErrors.nombre ||
      fieldErrors.fecha ||
      fieldErrors.lugar ||
      fieldErrors.horaInicio ||
      fieldErrors.horaFin
    ) {
      setSeccion1Abierta(true);
    } else if (fieldErrors.entidades || fieldErrors.responsables) {
      setSeccion2Abierta(true);
    } else if (fieldErrors.urlMapa || fieldErrors.coordenadas || fieldErrors.aforo) {
      setSeccion3Abierta(true);
    }
    toast.error("Por favor completa los campos requeridos", {
      description: "Revisa las secciones marcadas para corregir los campos pendientes.",
    });
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
        {esEdicion && !puedeModificar && (
          <Notice
            tone="warning"
            title="Modo de consulta / sin sesión institucional"
            className="mb-2"
          >
            Para persistir cambios en la base de datos oficial de Cartagena, inicia sesión como Facilitador de Mesa o Autoridad Distrital. Los cambios guardados se mantendrán en memoria local durante esta sesión.
          </Notice>
        )}

        {props.mesaId && cargandoRemota && !mesaEditada && (
          <div className="flex items-center justify-center p-6 text-xs text-[var(--text-secondary)] italic">
            Cargando información oficial de la mesa desde el servidor...
          </div>
        )}

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
          onSubmit={handleSubmit(guardar, onInvalid)}
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
                className="border-t border-[var(--border)] p-4 sm:p-5 space-y-5"
              >
                {/* 1. SELECCIONADOR POR CLIC EN MAPA */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                        1. Fijar ubicación en el mapa
                      </h4>
                      <p className="text-xs text-[var(--text-secondary)]">
                        Haz clic sobre el mapa para marcar o mover el punto de encuentro exacto.
                      </p>
                    </div>
                  </div>

                  <SelectorUbicacionMesa
                    coordenadas={coordenadasActuales}
                    onChange={(nuevasCoords) => {
                      fijarCoordenadas(nuevasCoords);
                    }}
                    altura="280px"
                  />
                </div>

                {/* Advertencia de límites de Cartagena si aplica */}
                {advertenciaCartagena && (
                  <Notice tone="warning" title="Punto fuera del Distrito de Cartagena">
                    <span className="text-xs">{advertenciaCartagena}</span>
                  </Notice>
                )}

                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 pt-2 border-t border-[var(--border)]">
                  {/* 2. PEGAR ENLACE DE MAPAS */}
                  <div className="col-span-full sm:col-span-2 lg:col-span-2">
                    <FormField
                      id="mesa-url-mapa"
                      label="2. Enlace de mapas (Google Maps / OpenStreetMap / Waze)"
                      error={errors.urlMapa?.message}
                      description="Pega un enlace de Google Maps con ubicación; las coordenadas se detectarán automáticamente."
                    >
                      {(controlProps) => (
                        <Input
                          {...controlProps}
                          type="url"
                          placeholder="https://maps.google.com/... o enlace OpenStreetMap / Waze"
                          {...register("urlMapa")}
                        />
                      )}
                    </FormField>

                    {esUrlCorta && (
                      <div className="mt-2">
                        <Notice tone="warning" title="Enlace acortado de mapas">
                          <span className="text-xs">
                            Los enlaces cortos (como maps.app.goo.gl o goo.gl) no exponen coordenadas directas.
                            Por favor abre el enlace en tu navegador y copia la URL completa expandida o escribe las coordenadas planas abajo.
                          </span>
                        </Notice>
                      </div>
                    )}

                    {coordsDetectadasUrl && (
                      <div className="mt-2 flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2.5 text-xs text-[var(--success)] font-medium">
                        <MapPin className="size-4 shrink-0 text-[var(--success)]" />
                        <span>
                          📍 Coordenadas detectadas desde URL: {coordsDetectadasUrl.lat.toFixed(5)},{" "}
                          {coordsDetectadasUrl.lng.toFixed(5)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Aforo máximo */}
                  <FormField
                    id="mesa-aforo"
                    label="Capacidad de aforo"
                    error={errors.aforo?.message}
                    description="Número máximo de participantes en el espacio."
                    className="col-span-full sm:col-span-2 lg:col-span-1"
                  >
                    {(controlProps) => (
                      <Input
                        {...controlProps}
                        type="number"
                        min={1}
                        max={100000}
                        placeholder="Ej.: 60"
                        {...register("aforo", {
                          setValueAs: (v) =>
                            v === "" || v === null || isNaN(Number(v))
                              ? undefined
                              : Number(v),
                        })}
                      />
                    )}
                  </FormField>

                  {/* 3. COORDENADAS PLANAS COMBINADAS */}
                  <div className="col-span-full sm:col-span-2">
                    <FormField
                      id="mesa-coords-planas"
                      label="3. Coordenadas planas combinadas (un solo campo)"
                      description="Escribe Latitud y Longitud separadas por coma, espacio o punto y coma (ej. 10.39972, -75.51444)."
                    >
                      {() => (
                        <Input
                          id="mesa-coords-planas"
                          type="text"
                          placeholder="10.39972, -75.51444"
                          value={textoCoordsPlanas}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTextoCoordsPlanas(val);
                            const parseadas = parsearTextoCoordenadas(val);
                            if (parseadas) {
                              fijarCoordenadas(parseadas);
                            }
                          }}
                        />
                      )}
                    </FormField>
                  </div>

                  {/* Latitud individual */}
                  <FormField
                    id="mesa-lat"
                    label="Latitud individual"
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

                  {/* Longitud individual */}
                  <FormField
                    id="mesa-lng"
                    label="Longitud individual"
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
