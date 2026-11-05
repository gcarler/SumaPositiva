import React from "react";
import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { PasswordInput } from "@/shared/ui/password-input";
import { CampoIdentidad, CampoContrasena } from "./campo-identidad";

describe("PasswordInput / CampoContrasena UX y A11y", () => {
  it("renderiza inicialmente el campo con type='password'", () => {
    const html = renderToString(
      <PasswordInput name="contrasena" placeholder="Escribe tu clave" />,
    );
    expect(html).toContain('type="password"');
    expect(html).toContain('placeholder="Escribe tu clave"');
    expect(html).toContain('name="contrasena"');
  });

  it("renderiza el botón de visibilidad con type='button', aria-label y aria-pressed correctos", () => {
    const html = renderToString(
      <PasswordInput name="contrasena" />,
    );
    // El botón debe tener type="button" para evitar envío accidental del formulario
    expect(html).toContain('type="button"');
    // Inicialmente oculto: aria-label="Mostrar contraseña" y aria-pressed="false"
    expect(html).toContain('aria-label="Mostrar contraseña"');
    expect(html).toContain('aria-pressed="false"');
  });

  it("deshabilita el botón de alternancia si el campo está deshabilitado", () => {
    const html = renderToString(
      <PasswordInput name="contrasena" disabled />,
    );
    expect(html).toContain("disabled");
  });

  it("permite omitir el botón de visibilidad si mostrarBotonVisibilidad=false", () => {
    const html = renderToString(
      <PasswordInput name="contrasena" mostrarBotonVisibilidad={false} />,
    );
    expect(html).toContain('type="password"');
    expect(html).not.toContain('aria-label="Mostrar contraseña"');
  });

  it("CampoIdentidad integra PasswordInput automáticamente cuando type='password'", () => {
    const html = renderToString(
      <CampoIdentidad
        name="contrasena"
        label="Contraseña"
        type="password"
        autoComplete="new-password"
      />,
    );
    expect(html).toContain('type="password"');
    expect(html).toContain('aria-label="Mostrar contraseña"');
    expect(html).toContain('name="contrasena"');
    expect(html).toContain("Contraseña");
  });

  it("CampoContrasena renderiza un campo de contraseña accesible con toggle", () => {
    const html = renderToString(
      <CampoContrasena
        name="confirmacion"
        label="Confirmar contraseña"
        autoComplete="new-password"
      />,
    );
    expect(html).toContain('type="password"');
    expect(html).toContain('aria-label="Mostrar contraseña"');
    expect(html).toContain('name="confirmacion"');
    expect(html).toContain("Confirmar contraseña");
  });

  it("CampoIdentidad normal (texto) no incluye botón de contraseña", () => {
    const html = renderToString(
      <CampoIdentidad name="correo" label="Correo" type="email" />,
    );
    expect(html).toContain('type="email"');
    expect(html).not.toContain('aria-label="Mostrar contraseña"');
  });
});
