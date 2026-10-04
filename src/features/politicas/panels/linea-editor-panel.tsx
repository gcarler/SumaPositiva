"use client";
import { useForm, useFieldArray, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { PanelShell } from "@/core/panels/panel-shell";
import { usePanels } from "@/core/panels/panel-store";
import { useSesionStore } from "@/features/sesion/state/session-store";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { FormField } from "@/shared/ui/form-field";
import { ChoiceGroup } from "@/shared/ui/choice-group";
import { Checkbox } from "@/shared/ui/checkbox";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/shared/ui/select";
import {
  lineasApi,
  lineaInputSchema,
  LINEAS_KEY,
  type LineaInput,
  type LineaPersistida,
} from "../services/lineas-api";
import { dimensionMeta, ENTIDADES } from "../components/dimensiones-meta";

type Props = { entryKey: string; lineaId?: string; props?: { lineaId?: string } };
export function LineaEditorPanel({ entryKey, lineaId: directLineaId, props }: Props) {
  const lineaId = directLineaId ?? props?.lineaId;
  const { closeTop, closeToKey } = usePanels();
  const sesion = useSesionStore((s) => s.sesion);
  const lineas = useQuery({
    queryKey: LINEAS_KEY,
    queryFn: lineasApi.listar,
    enabled: !!lineaId,
  });
  const linea = lineas.data?.find((l) => l.id === lineaId);
  const autorizado =
    !!sesion?.permisos?.includes("politicas:gestionar") &&
    sesion.rol !== "auditor_forense";
  return (
    <PanelShell
      entryKey={entryKey}
      crumbs={[
        { label: "Políticas" },
        { label: lineaId ? "Editar línea" : "Nueva línea" },
      ]}
      title={lineaId ? "Editar línea estratégica" : "Nueva línea estratégica"}
      kicker="Arquitectura de la política"
      onClose={closeTop}
      onCloseToKey={closeToKey}
    >
      {!autorizado ? (
        <p className="p-5" role="alert">
          Se requiere permiso para gestionar políticas.
        </p>
      ) : lineaId && !linea ? (
        <div className="p-5">
          <p role="status">
            {lineas.isPending
              ? "Cargando línea…"
              : (lineas.error?.message ?? "Línea no encontrada")}
          </p>
          {lineas.isError && (
            <Button onClick={() => void lineas.refetch()}>Reintentar</Button>
          )}
        </div>
      ) : (
        <LineaForm key={lineaId ?? "nueva"} linea={linea} />
      )}
    </PanelShell>
  );
}
function LineaForm({ linea }: { linea?: LineaPersistida }) {
  const { closeTop, closeToKey } = usePanels();
  const client = useQueryClient();
  const dimensiones = useQuery({
    queryKey: ["politicas", "dimensiones"],
    queryFn: lineasApi.dimensiones,
  });
  const fases = useQuery({
    queryKey: ["politicas", "fases"],
    queryFn: lineasApi.fases,
  });
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LineaInput>({
    resolver: zodResolver(lineaInputSchema),
    defaultValues: {
      codigo: linea?.codigo ?? "LE-01",
      titulo: linea?.titulo ?? "",
      descripcion: linea?.descripcion ?? "",
      problema_abordado: linea?.problema_abordado ?? "",
      objetivo_especifico: linea?.objetivo_especifico ?? "",
      fase_id: linea?.fase_id ?? "",
      dimension_id: linea?.dimension_id ?? "",
      entidad_lider: linea?.entidad_lider ?? ENTIDADES[0],
      fuentes_financiacion: linea?.fuentes_financiacion ?? ["FONSET"],
      costo_estimado: linea?.costo_estimado ?? "0",
      activa: linea?.activa ?? true,
      sublineas: linea?.sublineas ?? [],
    },
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "sublineas",
  });
  const codigo = useWatch({ control, name: "codigo" });
  const guardar = handleSubmit(async (data) => {
    try {
      await lineasApi.guardar(data, linea?.id);
      await Promise.all([
        client.invalidateQueries({ queryKey: LINEAS_KEY }),
        client.invalidateQueries({ queryKey: ["plataforma", "lineas"] }),
      ]);
      toast.success("Línea estratégica guardada");
      closeTop();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo guardar";
      setError("root", { message });
      toast.error(message);
    }
  });
  const catalogoError = dimensiones.error ?? fases.error;
  return (
    <form onSubmit={guardar} noValidate className="min-w-0 space-y-6 p-5">
      <fieldset disabled={isSubmitting} className="min-w-0 space-y-6">
        <legend className="mb-3 font-semibold">1. Dimensión y fase DNP</legend>
        <Controller
          control={control}
          name="dimension_id"
          render={({ field }) => (
            <ChoiceGroup
              label="Dimensión de Seguridad Humana"
              aria-invalid={!!errors.dimension_id}
              aria-describedby={
                errors.dimension_id ? "linea-dimension-error" : undefined
              }
              value={field.value}
              onValueChange={field.onChange}
              className="sm:grid-cols-2"
              options={(dimensiones.data ?? [])
                .filter((d) => d.activa)
                .map((d) => {
                  const { Icon, color } = dimensionMeta(d.codigo);
                  return {
                    value: d.id,
                    label: d.nombre,
                    icon: <Icon className={color} />,
                  };
                })}
            />
          )}
        />
        {errors.dimension_id && (
          <p
            id="linea-dimension-error"
            role="alert"
            className="text-sm text-danger"
          >
            {errors.dimension_id.message}
          </p>
        )}
        {catalogoError && (
          <div role="alert">
            <p>{catalogoError.message}</p>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void dimensiones.refetch();
                void fases.refetch();
              }}
            >
              Reintentar catálogos
            </Button>
          </div>
        )}
        <Controller
          control={control}
          name="fase_id"
          render={({ field }) => (
            <FormField
              label="Fase DNP"
              required
              error={errors.fase_id?.message}
            >
              {(props) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    {...props}
                    className="w-full min-w-0 [&_[data-slot=select-value]]:min-w-0"
                  >
                    <SelectValue placeholder="Selecciona la fase" />
                  </SelectTrigger>
                  <SelectContent>
                    {fases.data?.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>
          )}
        />
        <h2 className="font-semibold">2. Línea estratégica</h2>
        {(
          [
            ["codigo", "Código"],
            ["titulo", "Título"],
            ["problema_abordado", "Problema abordado"],
            ["objetivo_especifico", "Objetivo específico"],
          ] as const
        ).map(([name, label]) => (
          <FormField
            key={name}
            label={label}
            required={name === "codigo" || name === "titulo"}
            error={errors[name]?.message}
          >
            {(props) => <Input {...props} {...register(name)} />}
          </FormField>
        ))}
        <FormField
          label="Descripción"
          required
          error={errors.descripcion?.message}
        >
          {(props) => (
            <Textarea {...props} {...register("descripcion")} rows={4} />
          )}
        </FormField>
        <Controller
          control={control}
          name="entidad_lider"
          render={({ field }) => (
            <FormField
              label="Entidad líder"
              required
              error={errors.entidad_lider?.message}
            >
              {(props) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    {...props}
                    className="w-full min-w-0 [&_[data-slot=select-value]]:min-w-0"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from(new Set([...ENTIDADES, field.value]))
                      .filter(Boolean)
                      .map((e) => (
                        <SelectItem key={e} value={e}>
                          {e}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>
          )}
        />
        <Controller
          control={control}
          name="fuentes_financiacion"
          render={({ field }) => (
            <fieldset className="space-y-2">
              <legend>Fuentes de financiación</legend>
              <div className="flex flex-wrap gap-4">
                {Array.from(
                  new Set(["FONSET", "SGP", "SGR", "ICLD", ...field.value]),
                ).map((f) => (
                  <Label key={f} className="flex items-center gap-2">
                    <Checkbox
                      aria-label={f}
                      checked={field.value.includes(f)}
                      onCheckedChange={(v) =>
                        field.onChange(
                          v
                            ? [...field.value, f]
                            : field.value.filter((x) => x !== f),
                        )
                      }
                    />
                    {f}
                  </Label>
                ))}
              </div>
              {errors.fuentes_financiacion && (
                <p role="alert" className="text-sm text-danger">
                  {errors.fuentes_financiacion.message}
                </p>
              )}
            </fieldset>
          )}
        />
        <FormField
          label="Costo estimado (COP)"
          required
          error={errors.costo_estimado?.message}
        >
          {(props) => (
            <Input
              {...props}
              {...register("costo_estimado")}
              inputMode="decimal"
            />
          )}
        </FormField>
        <Controller
          control={control}
          name="activa"
          render={({ field }) => (
            <Label className="flex items-center gap-3">
              <Switch
                aria-label="Línea activa"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
              Línea activa
            </Label>
          )}
        />
        <h2 className="font-semibold">3. Sublíneas de acción</h2>
        {fields.map((field, i) => (
          <fieldset
            key={field.id}
            className="min-w-0 space-y-3 rounded-xl border border-border p-4"
          >
            <legend className="px-1">Sublínea {i + 1}</legend>
            {(
              [
                ["codigo", "Código hijo"],
                ["titulo", "Título de la intervención"],
                ["descripcion", "Descripción de la sublínea"],
                ["meta_cuatrienal", "Meta cuatrienal"],
                ["indicador_nombre", "Indicador DNP sugerido"],
                ["actor_coresponsable", "Actor corresponsable"],
              ] as const
            ).map(([name, label]) => (
              <FormField
                key={name}
                label={label}
                required={name === "codigo" || name === "titulo"}
                error={errors.sublineas?.[i]?.[name]?.message}
              >
                {(props) => (
                  <Input {...props} {...register(`sublineas.${i}.${name}`)} />
                )}
              </FormField>
            ))}
            <Button variant="outline" type="button" onClick={() => remove(i)}>
              <Trash2 aria-hidden="true" className="size-4" />
              Eliminar sublínea {i + 1}
            </Button>
          </fieldset>
        ))}
        <Button
          variant="outline"
          type="button"
          disabled={fields.length >= 200}
          onClick={() => {
            const usados = new Set(fields.map((f) => f.codigo));
            let n = 1;
            while (usados.has(`${codigo}.${n}`)) n++;
            append({
              codigo: `${codigo}.${n}`,
              titulo: "",
              descripcion: "",
              meta_cuatrienal: "",
              indicador_nombre: "",
              actor_coresponsable: "",
            });
          }}
        >
          <Plus aria-hidden="true" className="size-4" />
          Agregar sublínea
        </Button>
      </fieldset>
      {errors.root && (
        <p role="alert" className="text-sm text-danger">
          {errors.root.message}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button
          type="submit"
          disabled={isSubmitting || !dimensiones.data || !fases.data}
        >
          {isSubmitting ? "Guardando…" : "Guardar línea estratégica"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          onClick={closeTop}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
