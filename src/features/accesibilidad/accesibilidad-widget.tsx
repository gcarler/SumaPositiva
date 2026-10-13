"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { AccesibilidadWidget as AccesibilidadWidgetUI } from "@/shared/ui/accesibilidad-widget";
import { useAccesibilidadStore } from "./accesibilidad-store";

export function AccesibilidadWidget() {
  const pathname = usePathname();
  const { theme, resolvedTheme, setTheme } = useTheme();

  const isGeovisor = Boolean(pathname?.startsWith("/geovisor"));
  const [isCollapsed, setIsCollapsed] = useState<boolean>(isGeovisor);

  // Sincronizar el colapso inicial si cambia la ruta entre geovisor y páginas públicas normales
  useEffect(() => {
    setIsCollapsed(isGeovisor);
  }, [isGeovisor]);

  const {
    textSize,
    contrast,
    grayscale,
    lineSpacing,
    letterSpacing,
    underlineLinks,
    reducedMotion,
    isOpen,
    ultimoAnuncio,
    setTextSize,
    aumentarTextSize,
    disminuirTextSize,
    setContrast,
    toggleContrast,
    toggleGrayscale,
    toggleLineSpacing,
    toggleLetterSpacing,
    toggleUnderlineLinks,
    toggleReducedMotion,
    setIsOpen,
    toggleOpen,
    resetAll,
    initFromSystemAndStorage,
  } = useAccesibilidadStore();

  // Inicializar preferencias desde localStorage y sistema en el montaje del cliente
  useEffect(() => {
    initFromSystemAndStorage();
  }, [initFromSystemAndStorage]);

  // Excluir de rutas privadas /plataforma en esta versión v1
  if (pathname?.startsWith("/plataforma")) {
    return null;
  }

  const handleThemeToggle = () => {
    const actual = resolvedTheme ?? theme ?? "light";
    setTheme(actual === "dark" ? "light" : "dark");
  };

  return (
    <AccesibilidadWidgetUI
      textSize={textSize}
      contrast={contrast}
      grayscale={grayscale}
      lineSpacing={lineSpacing}
      letterSpacing={letterSpacing}
      underlineLinks={underlineLinks}
      reducedMotion={reducedMotion}
      theme={resolvedTheme ?? theme ?? "light"}
      isOpen={isOpen}
      ultimoAnuncio={ultimoAnuncio}
      isGeovisor={isGeovisor}
      isCollapsed={isCollapsed}
      onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
      onToggleOpen={toggleOpen}
      onClose={() => setIsOpen(false)}
      onTextSizeChange={setTextSize}
      onAumentarTextSize={aumentarTextSize}
      onDisminuirTextSize={disminuirTextSize}
      onContrastChange={setContrast}
      onToggleContrast={toggleContrast}
      onGrayscaleToggle={toggleGrayscale}
      onLineSpacingToggle={toggleLineSpacing}
      onLetterSpacingToggle={toggleLetterSpacing}
      onUnderlineLinksToggle={toggleUnderlineLinks}
      onReducedMotionToggle={toggleReducedMotion}
      onThemeToggle={handleThemeToggle}
      onResetAll={resetAll}
    />
  );
}
