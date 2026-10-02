"use client";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { FormField } from "@/shared/ui/form-field";
import type { Formulario } from "../models/formulario";
import { enlacesCompartir } from "../services/formulario-url";
export function CompartirFormulario({ form }: { form: Formulario }) {
  const [qr, setQr] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const url = form.configuracion.urlPublica;
  const enlaces = enlacesCompartir(form.titulo, url);
  if (form.estado !== "activo" || !url)
    return (
      <p className="text-sm text-text-secondary">
        Publica el formulario para compartirlo.
      </p>
    );
  return (
    <section
      className="min-w-0 space-y-3 rounded-xl border border-border p-4"
      aria-labelledby={`${id}-titulo`}
    >
      <h3 id={`${id}-titulo`} className="font-semibold">
        Compartir formulario
      </h3>
      <FormField
        label="URL pública del formulario"
        description="Cualquier persona con este enlace puede abrir el formulario publicado."
      >
        {(control) => (
          <Input
            {...control}
            ref={input}
            value={url}
            readOnly
            onFocus={(e) => e.target.select()}
          />
        )}
      </FormField>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={async () => {
            setError("");
            try {
              if (navigator.clipboard?.writeText)
                await navigator.clipboard.writeText(url);
              else {
                input.current?.focus();
                input.current?.select();
                if (!document.execCommand("copy"))
                  throw Error(
                    "Copia el enlace seleccionado con Ctrl+C o mantén pulsado para copiar.",
                  );
              }
              toast.success("¡URL copiada!");
            } catch {
              input.current?.focus();
              input.current?.select();
              setError(
                "No se pudo copiar automáticamente. Copia el enlace seleccionado con Ctrl+C o mantén pulsado para copiar.",
              );
            }
          }}
        >
          Copiar
        </Button>
        <Button variant="outline" asChild>
          <a href={enlaces.whatsapp} target="_blank" rel="noopener noreferrer">
            WhatsApp
          </a>
        </Button>
        <Button variant="outline" asChild>
          <a href={enlaces.telegram} target="_blank" rel="noopener noreferrer">
            Telegram
          </a>
        </Button>
        <Button variant="outline" asChild>
          <a href={enlaces.correo}>Correo</a>
        </Button>
        <Button
          variant="outline"
          aria-expanded={qr}
          aria-controls={`${id}-qr`}
          onClick={() => setQr((v) => !v)}
        >
          QR
        </Button>
        <Button variant="outline" asChild>
          <a href={url} target="_blank" rel="noopener noreferrer">
            Abrir formulario
          </a>
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {qr && (
        <div id={`${id}-qr`} className="space-y-2">
          <img
            src={enlaces.qr}
            alt={`Código QR para abrir ${form.titulo}`}
            width={200}
            height={200}
            className="max-w-full rounded-lg"
          />
          <p className="text-xs text-text-secondary">
            El código contiene únicamente la URL pública. Generado por QRServer.
          </p>
        </div>
      )}
    </section>
  );
}
