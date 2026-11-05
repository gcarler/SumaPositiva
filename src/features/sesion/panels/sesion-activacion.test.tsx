import React from "react";
import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { CircleCheck } from "lucide-react";

describe("Aviso de Activación de Cuenta Ciudadana", () => {
  it("renderiza correctamente las instrucciones pedagógicas de activación y spam", () => {
    const correo = "ciudadano@ejemplo.gov.co";
    const html = renderToString(
      <div
        role="status"
        aria-live="polite"
        className="space-y-3 rounded-xl border border-success/30 bg-success-soft/30 p-4 sm:p-5 text-text-primary"
      >
        <div className="flex items-start gap-3">
          <CircleCheck
            className="mt-0.5 size-5 shrink-0 text-success"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="text-base font-semibold text-text-primary">
              ¡Cuenta creada! Estás a un paso de activarla
            </h3>
            <p className="text-sm leading-relaxed text-text-secondary">
              Para garantizar la autenticidad y seguridad de tu participación ciudadana, enviamos un mensaje de activación a{" "}
              <strong className="font-semibold text-text-primary break-all">
                {correo}
              </strong>.
            </p>
          </div>
        </div>

        <div className="space-y-2 rounded-lg border border-border/70 bg-surface-elevated/95 p-3.5 sm:p-4 text-sm">
          <p className="font-medium text-text-primary">
            Pasos requeridos para activar tu cuenta:
          </p>
          <ol className="list-decimal space-y-1.5 pl-5 text-xs text-text-secondary sm:text-sm">
            <li>
              Abre la <strong>bandeja de entrada</strong> de tu correo electrónico.
            </li>
            <li>
              Abre el correo institucional de <strong>POLIS</strong> y haz clic en el enlace o botón oficial para <strong>activar tu cuenta</strong>.
            </li>
            <li>
              <span className="font-medium text-text-primary">
                ¿No encuentras el correo?
              </span>{" "}
              Revisa tu carpeta de <strong>Correo no deseado (Spam)</strong> y marca el mensaje como <strong>«No es spam»</strong>. Esto asegurará que tu cuenta se active y que recibas sin contratiempos tus constancias oficiales de radicación de propuestas y actas comunitarias.
            </li>
          </ol>
        </div>

        <p className="text-xs text-text-muted">
          Una vez que confirmes el enlace en tu correo, tu cuenta quedará lista para iniciar sesión ingresando tus datos a continuación.
        </p>
      </div>
    );

    expect(html).toContain("¡Cuenta creada! Estás a un paso de activarla");
    expect(html).toContain("ciudadano@ejemplo.gov.co");
    expect(html).toContain("No es spam");
    expect(html).toContain("Correo no deseado (Spam)");
    expect(html).toContain("Pasos requeridos para activar tu cuenta");
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
  });
});
