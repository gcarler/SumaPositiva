"use client";

import { useState } from "react";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Button } from "@/shared/ui/button";

interface FormularioContacto {
  nombreCompleto: string;
  correoOTelefono: string;
  territorio: string;
  tipoMensaje: "consulta" | "aporte-metodologico" | "solicitud-institucional";
  cuerpoMensaje: string;
}

const FORMULARIO_INICIAL: FormularioContacto = {
  nombreCompleto: "",
  correoOTelefono: "",
  territorio: "",
  tipoMensaje: "consulta",
  cuerpoMensaje: "",
};

const TIPOS_MENSAJE: { valor: FormularioContacto["tipoMensaje"]; etiqueta: string }[] = [
  { valor: "consulta", etiqueta: "Consulta" },
  { valor: "aporte-metodologico", etiqueta: "Aporte metodológico" },
  { valor: "solicitud-institucional", etiqueta: "Solicitud institucional" },
];

const TERRITORIOS = [
  "Localidad 1 — Centro Histórico",
  "Localidad 2 — San Diego",
  "Localidad 3 — Getsemaní",
  "Zona rural e insular",
  "Otro territorio de Cartagena",
];

function validarFormulario(datos: FormularioContacto) {
  const errores: Partial<Record<keyof FormularioContacto, string>> = {};
  if (datos.nombreCompleto.trim().length < 2) {
    errores.nombreCompleto = "Ingresa tu nombre completo (mínimo 2 caracteres).";
  }
  if (datos.correoOTelefono.trim().length < 5) {
    errores.correoOTelefono = "Ingresa un correo o un teléfono de contacto válido.";
  }
  if (datos.territorio.trim().length < 2) {
    errores.territorio = "Indica tu territorio o localidad de pertenencia.";
  }
  if (datos.cuerpoMensaje.trim().length < 10) {
    errores.cuerpoMensaje = "Escribe tu mensaje (mínimo 10 caracteres).";
  }
  return errores;
}

/**
 * Buzón de contacto y atención ciudadana de la página institucional
 * `/contacto`. El formulario mantiene el mensaje en el navegador del
 * participante: está pendiente conectarlo al backend institucional cuando
 * los datos y responsables estén definidos.
 */
export function BuzonContacto() {
  const [datos, setDatos] = useState<FormularioContacto>(FORMULARIO_INICIAL);
  const [errores, setErrores] = useState<Partial<Record<keyof FormularioContacto, string>>>({});
  const [estado, setEstado] = useState<"activo" | "enviado">("activo");

  function actualizarCampo<K extends keyof FormularioContacto>(
    campo: K,
    valor: FormularioContacto[K],
  ) {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
    setErrores((prev) => ({ ...prev, [campo]: undefined }));
  }

  function manejarEnvio(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const erroresEncontrados = validarFormulario(datos);
    setErrores(erroresEncontrados);
    if (Object.keys(erroresEncontrados).length > 0) return;

    setDatos(FORMULARIO_INICIAL);
    setEstado("enviado");
  }

  if (estado === "enviado") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-lg border border-[var(--success)] bg-[var(--surface-2)] p-6 text-sm leading-relaxed text-[var(--text-primary)]"
      >
        <p className="font-semibold">Mensaje registrado</p>
        <p className="mt-1 text-[var(--text-secondary)]">
          Gracias por tu aporte a la construcción de la Seguridad Humana de Cartagena. El
          equipo de la Secretaría correspondiente revisará tu mensaje y te responderá por
          el contacto que dejaste.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => {
            setEstado("activo");
          }}
        >
          Enviar otro mensaje
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={manejarEnvio} className="space-y-5" noValidate>
      <FormField label="Nombre completo" required error={errores.nombreCompleto}>
        {(field) => (
          <Input
            {...field}
            value={datos.nombreCompleto}
            onChange={(event) => actualizarCampo("nombreCompleto", event.target.value)}
            placeholder="Tu nombre y apellido"
            maxLength={150}
          />
        )}
      </FormField>
      <FormField
        label="Correo o teléfono"
        required
        error={errores.correoOTelefono}
        description="Preferimos un teléfono con WhatsApp para responderte más rápido."
      >
        {(field) => (
          <Input
            {...field}
            value={datos.correoOTelefono}
            onChange={(event) => actualizarCampo("correoOTelefono", event.target.value)}
            inputMode="email"
            placeholder="correo@ejemplo.com o +57 300 000 0000"
          />
        )}
      </FormField>
      <FormField
        label="Territorio o localidad de pertenencia"
        required
        error={errores.territorio}
      >
        {(field) => (
          <Input
            {...field}
            value={datos.territorio}
            onChange={(event) => actualizarCampo("territorio", event.target.value)}
            list="territorios-contacto"
            placeholder="Localidad o barrio de Cartagena"
          />
        )}
      </FormField>
      <datalist id="territorios-contacto">
        {TERRITORIOS.map((territorio) => (
          <option key={territorio} value={territorio} />
        ))}
      </datalist>
      <FormField label="Tipo de mensaje" required>
        {(field) => (
          <Select
            required
            value={datos.tipoMensaje}
            onValueChange={(valor) =>
              actualizarCampo("tipoMensaje", valor as FormularioContacto["tipoMensaje"])
            }
          >
            <SelectTrigger {...field} className="w-full">
              <SelectValue placeholder="Selecciona el tipo de mensaje" />
            </SelectTrigger>
            <SelectContent side="bottom">
              {TIPOS_MENSAJE.map((tipo) => (
                <SelectItem key={tipo.valor} value={tipo.valor}>
                  {tipo.etiqueta}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </FormField>
      <FormField label="Mensaje" required error={errores.cuerpoMensaje}>
        {(field) => (
          <Textarea
            {...field}
            value={datos.cuerpoMensaje}
            onChange={(event) => actualizarCampo("cuerpoMensaje", event.target.value)}
            placeholder="Escribe tu consulta, aporte metodológico o solicitud institucional"
            maxLength={2000}
          />
        )}
      </FormField>
      <p className="text-xs leading-relaxed text-[var(--text-tertiary)]">
        Tus datos se tratan bajo la Ley Estatutaria 1581 de 2012 (Habeas Data) y no se
        publican.
      </p>
      <Button type="submit">Enviar mensaje</Button>
    </form>
  );
}
