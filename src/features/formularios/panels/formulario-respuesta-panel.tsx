"use client";
import { useState } from "react";
import { PanelShell } from "@/core/panels/panel-shell";
import { usePanels } from "@/core/panels/panel-store";
import { Button } from "@/shared/ui/button";
import { useSesionStore } from "@/features/sesion/state/session-store";
import { FormularioRuntime } from "../components/formulario-runtime";
import {
  useFormularioDetalle,
  useEnviarRespuesta,
} from "../services/use-formularios-queries";
import { useFormulariosStore } from "../state/formularios-store";
import { motivoCierre } from "../services/formulario-engine";
export function FormularioRespuestaPanel({
  entryKey,
  props,
}: {
  entryKey: string;
  props: { formularioId: string };
}) {
  const { closeTop, openPanel } = usePanels();
  const { data: form, error } = useFormularioDetalle(props.formularioId);
  const sesion = useSesionStore((s) => s.sesion);
  const [anonimoId] = useState(() => crypto.randomUUID());
  const identidad = sesion?.usuarioId ?? sesion?.sesionId ?? anonimoId;
  const anterior = useFormulariosStore((s) =>
    s.respuestas.find(
      (r) => r.formularioId === props.formularioId && r.sesionId === identidad,
    ),
  );
  const [confirmacion, setConfirmacion] = useState(false);
  const enviar = useEnviarRespuesta();
  const motivo = form ? motivoCierre(form) : undefined;
  const cierre =
    motivo === "Se alcanzó el límite de respuestas." &&
    anterior &&
    form?.configuracion.permitirEdicion
      ? undefined
      : motivo;
  const autenticado =
    !!sesion?.usuarioId &&
    !!sesion.token &&
    !!sesion.expiraEn &&
    Date.parse(sesion.expiraEn) > Date.now();
  return (
    <PanelShell
      entryKey={entryKey}
      title={form?.titulo ?? "Responder formulario"}
      subtitle={form?.descripcion}
      crumbs={[{ label: "Formularios" }, { label: "Responder" }]}
      onClose={closeTop}
      onCloseToKey={closeTop}
    >
      <div className="space-y-6 p-6">
        <p className="text-xs text-text-secondary">
          Tu respuesta se registra en POLIS al enviarla.
        </p>
        {confirmacion && form ? (
          <div role="status">
            <h3 className="font-semibold">Respuesta recibida</h3>
            <p className="whitespace-pre-wrap">
              {form.configuracion.mensajeConfirmacion}
            </p>
          </div>
        ) : !form ? (
          <p role="alert">{error?.message ?? "Cargando…"}</p>
        ) : cierre ? (
          <p role="status">{cierre}</p>
        ) : form.configuracion.requiereAutenticacion && !autenticado ? (
          <div className="space-y-3">
            <p>Inicia sesión para responder este formulario.</p>
            <Button onClick={() => openPanel("sesion", {})}>
              Iniciar sesión
            </Button>
          </div>
        ) : anterior && !form.configuracion.permitirEdicion ? (
          <p role="status">Ya respondiste este formulario en esta sesión.</p>
        ) : (
          <FormularioRuntime
            key={form.id}
            form={form}
            inicial={anterior?.respuestas}
            enviar={async (respuestas, enfoqueDiferencial) => {
              await enviar.mutateAsync({
                formularioId: form.id,
                sesionId: identidad,
                respuestas,
                enfoqueDiferencial,
                autenticado,
              });
              setConfirmacion(true);
            }}
          />
        )}
      </div>
    </PanelShell>
  );
}
