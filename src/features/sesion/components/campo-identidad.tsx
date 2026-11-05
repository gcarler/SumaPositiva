import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { PasswordInput } from "@/shared/ui/password-input";

export function CampoIdentidad({
  name,
  label,
  type = "text",
  defaultValue,
  minLength,
  maxLength = 100,
  autoComplete,
  required = true,
  readOnly = false,
  placeholder,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
  minLength?: number;
  maxLength?: number;
  autoComplete?: string;
  required?: boolean;
  readOnly?: boolean;
  placeholder?: string;
}) {
  return (
    <FormField label={label} required={required}>
      {(field) =>
        type === "password" ? (
          <PasswordInput
            {...field}
            name={name}
            defaultValue={defaultValue}
            minLength={minLength}
            maxLength={maxLength}
            autoComplete={autoComplete}
            readOnly={readOnly}
            placeholder={placeholder}
          />
        ) : (
          <Input
            {...field}
            name={name}
            type={type}
            defaultValue={defaultValue}
            minLength={minLength}
            maxLength={maxLength}
            autoComplete={autoComplete}
            readOnly={readOnly}
            placeholder={placeholder}
          />
        )
      }
    </FormField>
  );
}

export function CampoContrasena({
  name = "contrasena",
  label = "Contraseña",
  defaultValue,
  minLength = 8,
  maxLength = 72,
  autoComplete = "new-password",
  required = true,
  readOnly = false,
  placeholder,
}: {
  name?: string;
  label?: string;
  defaultValue?: string;
  minLength?: number;
  maxLength?: number;
  autoComplete?: string;
  required?: boolean;
  readOnly?: boolean;
  placeholder?: string;
}) {
  return (
    <CampoIdentidad
      name={name}
      label={label}
      type="password"
      defaultValue={defaultValue}
      minLength={minLength}
      maxLength={maxLength}
      autoComplete={autoComplete}
      required={required}
      readOnly={readOnly}
      placeholder={placeholder}
    />
  );
}

export function textoFormulario(datos: FormData, campo: string): string {
  const valor = datos.get(campo);
  return typeof valor === "string" ? valor : "";
}

export function comprobarContrasena(datos: FormData): string {
  const clave = textoFormulario(datos, "contrasena");
  if (clave.length < 8 || new TextEncoder().encode(clave).length > 72)
    throw new Error(
      "La contraseña debe tener al menos 8 caracteres y hasta 72 bytes UTF-8.",
    );
  if (clave !== textoFormulario(datos, "confirmacion"))
    throw new Error("Las contraseñas no coinciden.");
  return clave;
}
