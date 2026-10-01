"use client";
import { useTheme } from "next-themes";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/shared/ui/page-header";
import { Button } from "@/shared/ui/button";
import { Notice } from "@/shared/ui/notice";
import { useSesionStore } from "@/features/sesion/state/session-store";
import { usePanels } from "@/core/panels/panel-store";
import { FormField } from "@/shared/ui/form-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { toast } from "sonner";
import { puedeEditar } from "../models/acceso";
export function ConfiguracionView() {
  const sesion = useSesionStore((s) => s.sesion);
  const { theme, setTheme } = useTheme();
  const cache = useQueryClient();
  const { openPanel } = usePanels();
  const editar = puedeEditar(sesion, "configuracion");
  return (
    <>
      <PageHeader
        title="Configuración"
        description="Preferencias de la interfaz y acceso a los parámetros de participación."
      />
      {!editar && (
        <Notice title="Solo lectura">
          La configuración se consulta sin modificar parámetros.
        </Notice>
      )}
      <section className="max-w-xl space-y-4 rounded-xl border border-border bg-surface-1 p-5">
        <h2 className="text-lg font-semibold">Preferencias de trabajo</h2>
        <FormField
          label="Tema de la interfaz"
          description="Preferencia local de este navegador; no modifica la configuración distrital."
        >
          {(field) => (
            <Select
              value={theme ?? "light"}
              onValueChange={setTheme}
              disabled={!editar}
            >
              <SelectTrigger {...field}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Claro</SelectItem>
                <SelectItem value="dark">Oscuro</SelectItem>
              </SelectContent>
            </Select>
          )}
        </FormField>
        <Button
          disabled={!editar}
          variant="outline"
          onClick={() => {
            void cache.invalidateQueries();
            toast.success("Consultas actualizadas");
          }}
        >
          Actualizar datos de la sesión
        </Button>
      </section>
      <section className="space-y-3 rounded-xl border border-border p-5">
        <h2 className="text-lg font-semibold">Participación y fases</h2>
        <p className="text-sm text-text-secondary">
          La disponibilidad de recepción web se configura por fase. Los límites
          y cierres se configuran dentro de cada formulario.
        </p>
        {editar && sesion?.permisos?.includes("politicas:gestionar") && (
          <Button onClick={() => openPanel("fases-control", {})}>
            Configurar participación por fase
          </Button>
        )}
        <p className="text-sm text-text-secondary">
          Los parámetros globales del sistema aún no están disponibles aquí.
        </p>
      </section>
    </>
  );
}
