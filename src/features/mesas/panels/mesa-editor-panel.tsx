"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Check, Loader2, PencilLine, Plus } from "lucide-react";
import { PanelShell } from "@/components/panels/panel-shell";
import { usePanels } from "@/stores/panel-store";
import { useMesa, useMesasStore } from "@/stores/mesas-store";
import { useSesionStore } from "@/stores/session-store";

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
      invalid_type_error: "Ingresa el número total de asistentes",
    })
    .int("Debe ser un número entero")
    .min(1, "Mínimo 1 asistente")
    .max(50000, "Máximo 50.000 asistentes"),
});

type MesaForm = z.infer<typeof mesaSchema>;

const inputCls =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-colors focus:border-[var(--ember)] focus:outline-none";

export function MesaEditorPanel({
  entryKey,
  props,
}: {
  entryKey: string;
  props: { mesaId?: string };
}) {
  const { closeTop, openPanel } = usePanels();
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
      totalAsistentes: mesaEditada?.totalAsistentes ?? ("" as unknown as number),
    },
  });

  const guardar = async (data: MesaForm) => {
    await new Promise((r) => setTimeout(r, 300)); // latencia simulada

    if (esEdicion && props.mesaId) {
      actualizarMesa(props.mesaId, data);
      toast.success("Mesa actualizada", {
        description: "Los datos de la mesa quedaron al día.",
      });
      closeTop();
      return;
    }

    const mesa = crearMesa(data);
    toast.success("Mesa creada", {
      description: "Registra la plenaria y crea las submesas para empezar.",
    });
    // sustituye el editor por el panel de detalle de la mesa
    closeTop();
    openPanel("mesa", { mesaId: mesa.id });
  };

  return (
    <PanelShell
      entryKey={entryKey}
      crumbs={[{ label: "Mesas de trabajo" }]}
      kicker={esEdicion ? "Editar mesa" : "Nueva mesa"}
      title={esEdicion ? "Editar datos de la mesa" : "Crear mesa de trabajo"}
      subtitle={
        esEdicion
          ? "Actualiza la información administrativa de la mesa."
          : "Registra la mesa: estos datos quedan en el acta y orientan el trabajo de la plenaria y las submesas."
      }
      onClose={closeTop}
      onCloseToKey={closeTop}
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] leading-tight text-[var(--text-tertiary)]">
            {esEdicion
              ? "Los cambios se reflejan de inmediato en el acta de la mesa."
              : "Después podrás crear submesas y diligenciar el papelografo."}
          </p>
          <button
            type="submit"
            form="form-mesa"
            disabled={isSubmitting || !isValid}
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[var(--text-primary)] px-4 py-2 text-xs font-medium text-[var(--text-inverse)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" strokeWidth={1.5} />
                Guardando…
              </>
            ) : esEdicion ? (
              <>
                <Check className="size-3.5" strokeWidth={1.5} />
                Guardar cambios
              </>
            ) : (
              <>
                <Plus className="size-3.5" strokeWidth={1.5} />
                Crear mesa
              </>
            )}
          </button>
        </div>
      }
    >
      <form
        id="form-mesa"
        onSubmit={handleSubmit(guardar)}
        noValidate
        className="mx-auto w-full max-w-xl space-y-6 px-5 py-6 sm:px-6 2xl:px-8"
      >
        <div className="space-y-1.5">
          <label htmlFor="mesa-nombre" className="text-xs font-medium text-[var(--text-secondary)]">
            Nombre de la mesa <span className="text-[var(--danger)]">*</span>
          </label>
          <input
            id="mesa-nombre"
            {...register("nombre")}
            type="text"
            placeholder="Ej.: Mesa territorial de Movilidad Segura — Comuna 4"
            className={inputCls}
          />
          {errors.nombre && <p className="text-xs text-[var(--danger)]">{errors.nombre.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="mesa-entidad" className="text-xs font-medium text-[var(--text-secondary)]">
            Entidad que convoca <span className="text-[var(--danger)]">*</span>
          </label>
          <input
            id="mesa-entidad"
            {...register("entidad")}
            type="text"
            placeholder="Dependencia o secretaría responsable"
            className={inputCls}
          />
          {errors.entidad && (
            <p className="text-xs text-[var(--danger)]">{errors.entidad.message}</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="mesa-fecha" className="text-xs font-medium text-[var(--text-secondary)]">
              Fecha <span className="text-[var(--danger)]">*</span>
            </label>
            <input id="mesa-fecha" {...register("fecha")} type="date" className={inputCls} />
            {errors.fecha && <p className="text-xs text-[var(--danger)]">{errors.fecha.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="mesa-asistentes"
              className="text-xs font-medium text-[var(--text-secondary)]"
            >
              Total de asistentes <span className="text-[var(--danger)]">*</span>
            </label>
            <input
              id="mesa-asistentes"
              {...register("totalAsistentes", { valueAsNumber: true })}
              type="number"
              min={1}
              placeholder="Ej.: 47"
              className={`${inputCls} tabular`}
            />
            {errors.totalAsistentes && (
              <p className="text-xs text-[var(--danger)]">{errors.totalAsistentes.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="mesa-lugar" className="text-xs font-medium text-[var(--text-secondary)]">
            Lugar <span className="text-[var(--danger)]">*</span>
          </label>
          <input
            id="mesa-lugar"
            {...register("lugar")}
            type="text"
            placeholder="Ej.: Colegio José Acevedo y Gómez — auditorio"
            className={inputCls}
          />
          {errors.lugar && <p className="text-xs text-[var(--danger)]">{errors.lugar.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="mesa-facilitador"
            className="text-xs font-medium text-[var(--text-secondary)]"
          >
            Funcionario facilitador <span className="text-[var(--danger)]">*</span>
          </label>
          <input
            id="mesa-facilitador"
            {...register("facilitador")}
            type="text"
            placeholder="Quien guía la dinámica del papelografo"
            className={inputCls}
          />
          {errors.facilitador && (
            <p className="text-xs text-[var(--danger)]">{errors.facilitador.message}</p>
          )}
          {!esEdicion && !sesion?.identidad && (
            <p className="text-[11px] leading-relaxed text-[var(--text-tertiary)]">
              Sugerencia: si inicias sesión con tu identidad en la parte superior, este campo
              se llena automáticamente.
            </p>
          )}
        </div>

        {!esEdicion && (
          <p className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4 text-[11px] leading-relaxed text-[var(--text-secondary)]">
            <PencilLine className="mt-0.5 size-4 shrink-0 text-[var(--text-tertiary)]" strokeWidth={1.5} />
            <span>
              Dinámica sugerida: en la plenaria de apertura acuerden el problema a tratar y
              distribuyan temas; luego creen las submesas y diligencien el papelografo (árbol
              de problemas y de soluciones) en cada una.
            </span>
          </p>
        )}
      </form>
    </PanelShell>
  );
}
