import React from "react";
import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { CircleCheck, ShieldCheck, ShieldAlert } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { comprobarContrasena } from "@/features/sesion/components/campo-identidad";

describe("Flujo de Recuperación y Restablecimiento de Contraseña (Encargo 322)", () => {
  it("valida contraseñas con comprobarContrasena: requiere longitud mínima de 8 caracteres y coincidencia exacta", () => {
    // Caso inválido: menos de 8 caracteres
    const datosCortos = new FormData();
    datosCortos.set("contrasena", "12345");
    datosCortos.set("confirmacion", "12345");
    expect(() => comprobarContrasena(datosCortos)).toThrow(
      "La contraseña debe tener al menos 8 caracteres y hasta 72 bytes UTF-8.",
    );

    // Caso inválido: no coinciden
    const datosNoCoinciden = new FormData();
    datosNoCoinciden.set("contrasena", "ClaveSegura2026*");
    datosNoCoinciden.set("confirmacion", "OtraClaveDiferente2026*");
    expect(() => comprobarContrasena(datosNoCoinciden)).toThrow(
      "Las contraseñas no coinciden.",
    );

    // Caso válido: cumple criterios
    const datosValidos = new FormData();
    datosValidos.set("contrasena", "ClaveCiudadanaValida2026*");
    datosValidos.set("confirmacion", "ClaveCiudadanaValida2026*");
    expect(comprobarContrasena(datosValidos)).toBe("ClaveCiudadanaValida2026*");
  });

  it("renderiza el aviso pedagógico accesible de recuperación de contraseña con guía de spam y vigencia de 30 min", () => {
    const correo = "ciudadano-recuperar@ejemplo.gov.co";
    const avisoExito = {
      tipo: "recuperacion",
      titulo: "Instrucciones de recuperación enviadas",
      correo,
    };

    const html = renderToString(
      <div
        role="status"
        aria-live="polite"
        className="space-y-3 rounded-xl border border-success/30 bg-success-soft/30 p-4 sm:p-5 text-text-primary"
      >
        <div className="flex items-start gap-3">
          <CircleCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="text-base font-semibold text-text-primary">
              {avisoExito.titulo}
            </h3>
            <p className="text-sm leading-relaxed text-text-secondary">
              Hemos emitido las instrucciones para crear tu nueva clave a{" "}
              <strong className="font-semibold text-text-primary break-all">
                {avisoExito.correo}
              </strong>.
            </p>
          </div>
        </div>

        <div className="space-y-2 rounded-lg border border-border/70 bg-surface-elevated/95 p-3.5 sm:p-4 text-sm">
          <p className="font-medium text-text-primary">
            Pasos para restablecer tu contraseña:
          </p>
          <ol className="list-decimal space-y-1.5 pl-5 text-xs text-text-secondary sm:text-sm">
            <li>
              Abre la <strong>bandeja de entrada</strong> de tu correo electrónico.
            </li>
            <li>
              Busca el mensaje de <strong>POLIS</strong> y haz clic en el enlace o botón oficial <strong>«Restablecer contraseña»</strong>.
            </li>
            <li>
              <span className="font-medium text-text-primary">
                ¿No encuentras el correo?
              </span>{" "}
              Revisa tu carpeta de <strong>Correo no deseado (Spam)</strong> o Promociones y marca el mensaje como <strong>«No es spam»</strong>. El enlace tiene una validez de 30 minutos.
            </li>
          </ol>
        </div>

        <div className="pt-2">
          <Button type="button" variant="outline">
            ← Volver a Iniciar sesión
          </Button>
        </div>
      </div>
    );

    expect(html).toContain("Instrucciones de recuperación enviadas");
    expect(html).toContain("ciudadano-recuperar@ejemplo.gov.co");
    expect(html).toContain("Restablecer contraseña");
    expect(html).toContain("Correo no deseado (Spam)");
    expect(html).toContain("30 minutos");
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
  });

  it("renderiza el enlace contextual accesible ¿Olvidaste tu contraseña? para la vista de login", () => {
    const html = renderToString(
      <div className="flex justify-end pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-auto p-0 text-xs font-medium text-accent hover:underline focus-visible:ring-1"
        >
          ¿Olvidaste tu contraseña?
        </Button>
      </div>
    );

    expect(html).toContain("¿Olvidaste tu contraseña?");
    expect(html).toContain("text-accent");
  });
});

describe("Regla Institucional de Autenticación Google Workspace para Funcionarios (Encargo 322)", () => {
  it("renderiza la advertencia de acceso restringido para perfiles de funcionarios institucionales", () => {
    const html = renderToString(
      <div
        role="alert"
        aria-live="assertive"
        className="space-y-3 rounded-xl border border-warning/40 bg-warning-soft/30 p-4 text-text-primary"
      >
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden="true" />
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="text-sm font-semibold text-text-primary">
              Acceso exclusivo para funcionarios institucionales
            </h3>
            <p className="text-xs leading-relaxed text-text-secondary">
              Tu cuenta tiene perfil de funcionario institucional. Por política de seguridad y
              trazabilidad de notificaciones oficiales, el ingreso debe realizarse exclusivamente
              mediante el botón <strong>«Continuar con Google»</strong>.
            </p>
          </div>
        </div>
      </div>
    );

    expect(html).toContain("Acceso exclusivo para funcionarios institucionales");
    expect(html).toContain("Continuar con Google");
    expect(html).toContain("trazabilidad de notificaciones oficiales");
    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-live="assertive"');
  });

  it("renderiza el callout informativo institucional en el pie del formulario de login", () => {
    const html = renderToString(
      <div className="rounded-xl border border-border/80 bg-surface-elevated/60 p-3.5 text-xs text-text-secondary space-y-1.5">
        <p className="font-semibold text-text-primary flex items-center gap-1.5">
          <ShieldCheck className="size-4 text-accent" aria-hidden="true" />
          Acceso para Funcionarios y Facilitadores
        </p>
        <p className="leading-relaxed text-[11px]">
          Por directriz institucional y trazabilidad de notificaciones oficiales, los equipos de
          formulación territorial y seguimiento deben autenticarse exclusivamente con su cuenta
          institucional de <strong>Google Workspace</strong>.
        </p>
      </div>
    );

    expect(html).toContain("Acceso para Funcionarios y Facilitadores");
    expect(html).toContain("Google Workspace");
    expect(html).toContain("notificaciones oficiales");
  });

  it("renderiza la credencial y estado de notificación institucional en la barra de encabezado de la plataforma", () => {
    const html = renderToString(
      <span
        className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[var(--brand-polis-cyan)]/30 bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-medium text-[var(--brand-polis-blue)] dark:text-[var(--brand-polis-sky)]"
        title="Sesión institucional autenticada con Google Workspace para la recepción oficial de notificaciones"
      >
        <span className="size-1.5 rounded-full bg-[var(--success)]" aria-hidden="true" />
        Google Workspace Oficial
      </span>
    );

    expect(html).toContain("Google Workspace Oficial");
    expect(html).toContain("Sesión institucional autenticada con Google Workspace");
  });
});
