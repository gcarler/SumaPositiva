"use client";

import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Check, Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { PanelShell } from "@/core/panels/panel-shell";
import { usePanels } from "@/core/panels/panel-store";
import { useMesa, useMesasStore } from "@/features/mesas/state/mesas-store";
import { useSesionStore } from "@/features/sesion/state/session-store";
import { crearMesaRemota } from "@/features/mesas/services/mesas-api";
import { MESAS_KEYS } from "@/features/mesas/services/use-mesas-queries";

/**
 * Panel editor de mesa de trabajo — crear (sin mesaId) o editar.
 * Cero modales: formulario RHF + Zod dentro de un panel de la pila.
 */

const mesaSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(6, "Nombra la mesa con al menos 6 caracteres")
    .max(90, "Máximo 90 caracteres"),
  entidad: z
    .string()
    .trim()
    .min(3, "Indica la entidad o dependencia que convoca")
    .max(90, "Máximo 90 caracteres"),
  fecha: z.string().min(1, "Elige la fecha de la mesa"),
  lugar: z
    .string()
    .trim()
    .min(3, "Indica el lugar de encuentro")
    .max(120, "Máximo 120 caracteres"),
  facilitador: z
    .string()
    .trim()
    .min(3, "¿Quién facilita la dinámica?")
    .max(80, "Máximo 80 caracteres"),
  totalAsistentes: z
    .number({
      error: "Ingresa el número total de asistentes",
    })
    .int("Debe ser un número entero")
    .min(1, "Mínimo 1 asistente")
    .max(50000, "Máximo 50.000 asistentes"),
});

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
  const crearMesa = useMesasStore((s) => s.crearMesa);
  const actualizarMesa = useMesasStore((s) => s.actualizarMesa);
  const mesaEditada = useMesa(props.mesaId ?? "");
  const sesion = useSesionStore((s) => s.sesion);

  const esEdicion = Boolean(props.mesaId && mesaEditada);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<MesaForm>({
    resolver: zodResolver(mesaSchema),
    mode: "onChange",
    defaultValues: {
      nombre: mesaEditada?.nombre ?? "",
      entidad: mesaEditada?.entidad ?? "",
      fecha: mesaEditada?.fecha ?? "",
      lugar: mesaEditada?.lugar ?? "",
      facilitador: mesaEditada?.facilitador ?? sesion?.identidad?.nombre ?? "",
      totalAsistentes:
        mesaEditada?.totalAsistentes ?? ("" as unknown as number),
    },
  });

  const guardar = async (data: MesaForm) => {
    if (esEdicion && props.mesaId) {
      actualizarMesa(props.mesaId, data);
      queryClient.invalidateQueries({ queryKey: MESAS_KEYS.all });
      queryClient.invalidateQueries({ queryKey: MESAS_KEYS.detail(props.mesaId) });
      toast.success("Mesa actualizada", {
        description: "Los datos de la mesa quedaron al día.",
      });
      closeTop();
      return;
    }

    const mesa = crearMesa(data);
    crearMesaRemota(data)
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
    // sustituye el editor por el panel de detalle de la mesa
    closeTop();
    openPanel("mesa", { mesaId: mesa.id });
  };

  const fields = [
    {
      name: "nombre",
      id: "mesa-nombre",
      label: "Nombre de la mesa",
      placeholder: "Ej.: Mesa territorial de Movilidad Segura",
      type: "text",
      wide: true,
    },
    {
      name: "entidad",
      id: "mesa-entidad",
      label: "Entidad que convoca",
      placeholder: "Dependencia o secretaría responsable",
      type: "text",
      wide: true,
    },
    {
      name: "fecha",
      id: "mesa-fecha",
      label: "Fecha",
      placeholder: "",
      type: "date",
      wide: false,
    },
    {
      name: "totalAsistentes",
      id: "mesa-asistentes",
      label: "Total de asistentes",
      placeholder: "Ej.: 47",
      type: "number",
      wide: false,
    },
    {
      name: "lugar",
      id: "mesa-lugar",
      label: "Lugar",
      placeholder: "Lugar de encuentro",
      type: "text",
      wide: true,
    },
    {
      name: "facilitador",
      id: "mesa-facilitador",
      label: "Funcionario facilitador",
      placeholder: "Quien guía la dinámica",
      type: "text",
      wide: true,
    },
  ] as const;

  return (
    <PanelShell
      entryKey={entryKey}
      crumbs={[{ label: "Mesas de trabajo" }]}
      kicker={esEdicion ? "Editar mesa" : "Nueva mesa"}
      title={esEdicion ? "Editar datos de la mesa" : "Crear mesa de trabajo"}
      subtitle="Registra la información que orientará el trabajo de la plenaria y las submesas."
      onClose={closeTop}
      onCloseToKey={closeTop}
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="hidden max-w-xs text-xs leading-relaxed text-text-secondary sm:block">
            Los campos marcados con * son obligatorios.
          </p>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={closeTop}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="form-mesa"
              size="sm"
              disabled={!isValid}
              loading={isSubmitting}
              loadingLabel="Guardando…"
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
      <form
        id="form-mesa"
        onSubmit={handleSubmit(guardar)}
        noValidate
        className="ui-panel-body mx-auto grid max-w-xl gap-6 sm:grid-cols-2"
      >
        {fields.map((field) => (
          <FormField
            key={field.name}
            id={field.id}
            label={field.label}
            required
            error={errors[field.name]?.message}
            className={field.wide ? "sm:col-span-2" : undefined}
            description={
              field.name === "facilitador" && !sesion?.identidad
                ? "Indica quién acompañará a los participantes durante la mesa."
                : undefined
            }
          >
            {(control) => (
              <Input
                {...control}
                {...register(
                  field.name,
                  field.name === "totalAsistentes"
                    ? { valueAsNumber: true }
                    : undefined,
                )}
                type={field.type}
                min={field.type === "number" ? 1 : undefined}
                placeholder={field.placeholder}
              />
            )}
          </FormField>
        ))}
      </form>
    </PanelShell>
  );
}
