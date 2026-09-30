"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  VenetianMask,
  ScanFace,
  ShieldCheck,
  Loader2,
  LogOut,
  Check,
} from "lucide-react";
import { PanelShell } from "@/components/panels/panel-shell";
import { usePanels } from "@/stores/panel-store";
import { useSesionStore, type ModoSesion } from "@/stores/session-store";
import { SectionLabel, SesionAvatar } from "@/features/politicas/components/ui-bits";

/**
 * Panel de sesión — el ciudadano elige participar de forma anónima
 * o con identidad (demo local persistida; será JWT con FastAPI).
 * Cero modales: es un panel más de la pila.
 */

const identidadSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(3, "Tu nombre público necesita al menos 3 caracteres")
    .max(40, "Máximo 40 caracteres"),
  email: z
    .string()
    .trim()
    .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, "Correo no válido")
    .optional()
    .or(z.literal("")),
  ciudad: z.string().trim().max(60, "Máximo 60 caracteres").optional().or(z.literal("")),
});

type IdentidadForm = z.infer<typeof identidadSchema>;

const OPCIONES: {
  modo: ModoSesion;
  titulo: string;
  desc: string;
  icon: typeof VenetianMask;
}[] = [
  {
    modo: "anonimo",
    titulo: "De forma anónima",
    desc: "Tus aportes se publican sin ningún dato personal. Tu voz cuenta igual.",
    icon: VenetianMask,
  },
  {
    modo: "identidad",
    titulo: "Con mi identidad",
    desc: "Tu nombre acompaña cada aporte y el equipo técnico puede responderte directamente.",
    icon: ScanFace,
  },
];

export function SesionPanel({ entryKey }: { entryKey: string }) {
  const { closeTop } = usePanels();
  const sesion = useSesionStore((s) => s.sesion);
  const elegirAnonimo = useSesionStore((s) => s.elegirAnonimo);
  const elegirIdentidad = useSesionStore((s) => s.elegirIdentidad);
  const cerrarSesion = useSesionStore((s) => s.cerrarSesion);

  const [modoSeleccion, setModoSeleccion] = useState<ModoSesion | null>(
    sesion?.modo ?? null
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<IdentidadForm>({
    resolver: zodResolver(identidadSchema),
    mode: "onChange",
    defaultValues: {
      nombre: sesion?.identidad?.nombre ?? "",
      email: sesion?.identidad?.email ?? "",
      ciudad: sesion?.identidad?.ciudad ?? "",
    },
  });

  const guardarIdentidad = async (data: IdentidadForm) => {
    await new Promise((r) => setTimeout(r, 350)); // latencia simulada
    elegirIdentidad({
      nombre: data.nombre,
      email: data.email || undefined,
      ciudad: data.ciudad || undefined,
    });
    toast.success("Identidad guardada", {
      description: "Tus próximos aportes se publicarán con tu nombre.",
    });
    closeTop();
  };

  const continuarAnonimo = () => {
    elegirAnonimo();
    toast.success("Participarás de forma anónima", {
      description: "Ningún dato personal se asociará a tus aportes.",
    });
    closeTop();
  };

  const cerrarSesionActual = () => {
    cerrarSesion();
    setModoSeleccion(null);
    toast.info("Sesión cerrada", {
      description: "Puedes elegir otra forma de participar.",
    });
  };

  return (
    <PanelShell
      entryKey={entryKey}
      crumbs={[{ label: "Tu identidad" }]}
      kicker="Tu identidad"
      title="Participa como prefieras"
      subtitle="Elige si quieres firmar tus aportes con tu identidad o hacerlo de forma anónima. Puedes cambiarlo en cualquier momento."
      onClose={closeTop}
      onCloseToKey={closeTop}
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] leading-tight text-[var(--text-tertiary)]">
            {modoSeleccion === "identidad"
              ? "Completa el formulario para guardar tu identidad."
              : modoSeleccion === "anonimo"
                ? "Ningún dato personal quedará asociado."
                : "Selecciona una opción para continuar."}
          </p>
          {modoSeleccion === "identidad" ? (
            <button
              type="submit"
              form="form-identidad"
              disabled={isSubmitting || !isValid}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--text-primary)] px-4 py-2 text-xs font-medium text-[var(--text-inverse)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" strokeWidth={1.5} />
                  Guardando…
                </>
              ) : (
                <>
                  <Check className="size-3.5" strokeWidth={1.5} />
                  Guardar identidad
                </>
              )}
            </button>
          ) : modoSeleccion === "anonimo" ? (
            <button
              type="button"
              onClick={continuarAnonimo}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--text-primary)] px-4 py-2 text-xs font-medium text-[var(--text-inverse)] transition-opacity hover:opacity-90"
            >
              <VenetianMask className="size-3.5" strokeWidth={1.5} />
              Continuar como anónimo
            </button>
          ) : (
            <button
              type="button"
              onClick={closeTop}
              disabled={!sesion}
              className="rounded-full border border-[var(--border-strong)] px-4 py-2 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Listo
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-7 px-6 py-6">
        {/* ---------- Sesión actual ---------- */}
        {sesion && (
          <section className="space-y-3">
            <SectionLabel>Sesión actual</SectionLabel>
            <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-4">
              <SesionAvatar sesion={sesion} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                  {sesion.modo === "identidad" && sesion.identidad
                    ? sesion.identidad.nombre
                    : "Participación anónima"}
                </p>
                <p className="text-[11px] text-[var(--text-tertiary)]">
                  {sesion.modo === "identidad" && sesion.identidad?.email
                    ? sesion.identidad.email
                    : "Sin datos personales asociados"}
                </p>
              </div>
              <button
                type="button"
                onClick={cerrarSesionActual}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-[11px] font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--danger)] hover:text-[var(--danger)]"
              >
                <LogOut className="size-3.5" strokeWidth={1.5} />
                Cerrar sesión
              </button>
            </div>
          </section>
        )}

        {/* ---------- Elección de modo ---------- */}
        <section className="space-y-3">
          <SectionLabel>
            {sesion ? "Cambiar forma de participar" : "Elige cómo participar"}
          </SectionLabel>
          <div className="grid gap-2" role="radiogroup" aria-label="Forma de participar">
            {OPCIONES.map((opt) => {
              const Icon = opt.icon;
              const active = modoSeleccion === opt.modo;
              return (
                <button
                  key={opt.modo}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setModoSeleccion(opt.modo)}
                  className={`flex items-start gap-3.5 rounded-xl border p-4 text-left transition-all ${
                    active
                      ? "border-[var(--ember)] bg-[var(--ember-soft)]"
                      : "border-[var(--border)] bg-[var(--surface-1)] hover:border-[var(--border-strong)]"
                  }`}
                >
                  <span
                    className={`flex size-9 shrink-0 items-center justify-center rounded-full border ${
                      active
                        ? "border-[var(--ember)]/40 bg-[var(--surface-0)]"
                        : "border-[var(--border)] bg-[var(--surface-2)]"
                    }`}
                  >
                    <Icon
                      className={`size-4 ${active ? "text-[var(--ember)]" : "text-[var(--text-secondary)]"}`}
                      strokeWidth={1.5}
                    />
                  </span>
                  <span className="min-w-0">
                    <span
                      className={`block text-sm font-medium ${
                        active ? "text-[var(--ember)]" : "text-[var(--text-primary)]"
                      }`}
                    >
                      {opt.titulo}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-[var(--text-secondary)]">
                      {opt.desc}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ---------- Formulario de identidad ---------- */}
        {modoSeleccion === "identidad" && (
          <motion.form
            id="form-identidad"
            onSubmit={handleSubmit(guardarIdentidad)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-4"
            noValidate
          >
            <SectionLabel>Tu identidad pública</SectionLabel>

            <div className="space-y-1.5">
              <label
                htmlFor="id-nombre"
                className="text-xs font-medium text-[var(--text-secondary)]"
              >
                Nombre público <span className="text-[var(--danger)]">*</span>
              </label>
              <input
                id="id-nombre"
                {...register("nombre")}
                type="text"
                placeholder="Cómo quieres que te vean los demás"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-colors focus:border-[var(--ember)] focus:outline-none"
              />
              {errors.nombre && (
                <p className="text-xs text-[var(--danger)]">{errors.nombre.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="id-email"
                className="text-xs font-medium text-[var(--text-secondary)]"
              >
                Correo (opcional)
              </label>
              <input
                id="id-email"
                {...register("email")}
                type="email"
                placeholder="Para recibir respuestas del equipo técnico"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-colors focus:border-[var(--ember)] focus:outline-none"
              />
              {errors.email && (
                <p className="text-xs text-[var(--danger)]">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="id-ciudad"
                className="text-xs font-medium text-[var(--text-secondary)]"
              >
                Ciudad o localidad (opcional)
              </label>
              <input
                id="id-ciudad"
                {...register("ciudad")}
                type="text"
                placeholder="Contexto territorial de tu aporte"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-colors focus:border-[var(--ember)] focus:outline-none"
              />
              {errors.ciudad && (
                <p className="text-xs text-[var(--danger)]">{errors.ciudad.message}</p>
              )}
            </div>
          </motion.form>
        )}

        {/* ---------- Nota de privacidad ---------- */}
        <p className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4 text-[11px] leading-relaxed text-[var(--text-secondary)]">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[var(--success)]" strokeWidth={1.5} />
          <span>
            Demo local: tu identidad se guarda únicamente en este navegador. En
            producción será autenticación JWT con consentimiento explícito de
            tratamiento de datos (Ley 1581 de 2012), y el modo anónimo nunca
            asociará tu aporte a datos personales.
          </span>
        </p>
      </div>
    </PanelShell>
  );
}
