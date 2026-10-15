"use client";

import React, { useEffect, useRef } from "react";
import {
  Contrast,
  RotateCcw,
  Sliders,
  X,
  Sun,
  Moon,
  Underline,
  Sparkles,
  ChevronRight,
  Volume2,
  ExternalLink,
} from "lucide-react";
import { Button } from "./button";
import { Label } from "./label";
import { cn } from "@/shared/lib/utils";

export interface AccesibilidadWidgetProps {
  textSize: "100" | "125" | "150" | "200";
  contrast: "normal" | "alto";
  grayscale: boolean;
  lineSpacing: "normal" | "amplio";
  letterSpacing: "normal" | "amplio";
  underlineLinks: boolean;
  reducedMotion: boolean;
  theme?: string;
  isOpen: boolean;
  ultimoAnuncio?: string;

  /** Modo geovisor: permite colapsar a pestaña mínima para no tapar paneles acoplados */
  isGeovisor?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;

  onToggleOpen: () => void;
  onClose: () => void;
  onTextSizeChange: (size: "100" | "125" | "150" | "200") => void;
  onAumentarTextSize: () => void;
  onDisminuirTextSize: () => void;
  onContrastChange: (contrast: "normal" | "alto") => void;
  onToggleContrast?: () => void;
  onGrayscaleToggle: () => void;
  onLineSpacingToggle: () => void;
  onLetterSpacingToggle: () => void;
  onUnderlineLinksToggle: () => void;
  onReducedMotionToggle: () => void;
  onThemeToggle?: () => void;
  onResetAll: () => void;
  className?: string;
}

export function AccesibilidadWidget({
  textSize = "100",
  contrast = "normal",
  grayscale = false,
  lineSpacing = "normal",
  letterSpacing = "normal",
  underlineLinks = false,
  reducedMotion = false,
  theme = "light",
  isOpen = false,
  ultimoAnuncio = "",
  isGeovisor = false,
  isCollapsed = false,
  onToggleCollapse,
  onToggleOpen,
  onClose,
  onTextSizeChange,
  onAumentarTextSize,
  onDisminuirTextSize,
  onContrastChange,
  onToggleContrast,
  onGrayscaleToggle,
  onLineSpacingToggle,
  onLetterSpacingToggle,
  onUnderlineLinksToggle,
  onReducedMotionToggle,
  onThemeToggle,
  onResetAll,
  className,
}: AccesibilidadWidgetProps) {
  const moreTriggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Manejo de teclado: tecla Esc cierra el subpanel de opciones y devuelve el foco
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        moreTriggerRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Cierre al hacer clic fuera del panel de opciones
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        moreTriggerRef.current &&
        !moreTriggerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  const handleContrastClick = () => {
    if (onToggleContrast) {
      onToggleContrast();
    } else {
      onContrastChange(contrast === "alto" ? "normal" : "alto");
    }
  };

  // Si está en /geovisor y en estado colapsado, mostrar pestaña mínima adherida al borde
  if (isGeovisor && isCollapsed) {
    return (
      <aside
        className={cn(
          "fixed top-1/2 right-0 -translate-y-1/2 z-40 select-none",
          className
        )}
        data-testid="accesibilidad-tab-container"
      >
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {ultimoAnuncio}
        </div>
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label="Abrir menú de accesibilidad"
          aria-expanded={false}
          className="flex h-14 w-7 items-center justify-center rounded-l-lg border-y border-l border-[var(--border-strong)] bg-[var(--surface-1)] text-[var(--text-primary)] shadow-md transition-all hover:w-9 focus-visible:outline-2 focus-visible:outline-[var(--ring)]"
        >
          <Sliders className="size-3.5 text-[var(--ember)]" aria-hidden="true" />
          <span className="sr-only">Abrir menú de accesibilidad</span>
        </button>
      </aside>
    );
  }

  const clasesExpansionBoton = !isOpen
    ? "hover:w-[196px] hover:border-[var(--border-strong)] hover:shadow-md focus-within:w-[196px] focus-within:border-[var(--border-strong)] focus-within:shadow-md focus-visible:w-[196px]"
    : "";

  const clasesOpacidadEtiqueta = !isOpen
    ? "group-hover:opacity-100 group-focus-within:opacity-100 group-focus-visible:opacity-100"
    : "";

  return (
    <aside
      className={cn(
        "fixed top-1/2 right-0 -translate-y-1/2 z-40 select-none",
        className
      )}
      data-testid="accesibilidad-sidebar-container"
    >
      {/* Región ARIA-Live para lectores de pantalla */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {ultimoAnuncio}
      </div>

      {/* Subpanel flotante compacto de Más Opciones (a la izquierda de la barra) */}
      {isOpen && (
        <div
          ref={panelRef}
          id="panel-mas-opciones-a11y"
          role="region"
          aria-label="Controles adicionales de accesibilidad"
          tabIndex={-1}
          className="absolute right-[60px] top-1/2 -translate-y-1/2 z-20 flex w-[min(20rem,calc(100vw-4.5rem))] flex-col gap-3 rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-1)] p-4 shadow-panel backdrop-blur transition-all duration-150 animate-in fade-in zoom-in-95 max-h-[85vh] overflow-y-auto"
        >
          {/* Encabezado del subpanel */}
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--ember)]">
                <Sliders className="size-4" aria-hidden="true" />
              </div>
              <h2 className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">
                Más opciones
              </h2>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                onClose();
                moreTriggerRef.current?.focus();
              }}
              aria-label="Cerrar opciones de accesibilidad"
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <X className="size-4" aria-hidden="true" />
            </Button>
          </div>

          {/* Pasos de texto (100 %, 125 %, 150 %, 200 %) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-[var(--text-primary)]">
                Tamaño de texto
              </Label>
              <span className="text-[11px] font-mono text-[var(--text-tertiary)]">
                {`${textSize}%`}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-1">
              {(["100", "125", "150", "200"] as const).map((step) => {
                const activo = textSize === step;
                return (
                  <Button
                    key={step}
                    variant={activo ? "ember" : "ghost"}
                    size="sm"
                    onClick={() => onTextSizeChange(step)}
                    aria-pressed={activo}
                    className="h-7 text-xs font-medium"
                  >
                    {`${step}%`}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Color y Tema */}
          <div className="flex flex-col gap-1.5 border-t border-[var(--border)] pt-2">
            <Label className="text-xs font-semibold text-[var(--text-primary)]">
              Color y Tema
            </Label>
            <div className="grid grid-cols-2 gap-1.5">
              {onThemeToggle && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onThemeToggle}
                  aria-label="Alternar tema claro y oscuro"
                  className="h-8 gap-1.5 text-xs font-medium text-[var(--text-primary)]"
                >
                  {theme === "dark" ? (
                    <>
                      <Sun className="size-3.5" aria-hidden="true" />
                      <span>Modo claro</span>
                    </>
                  ) : (
                    <>
                      <Moon className="size-3.5" aria-hidden="true" />
                      <span>Modo oscuro</span>
                    </>
                  )}
                </Button>
              )}
              <Button
                variant={grayscale ? "ember" : "outline"}
                size="sm"
                onClick={onGrayscaleToggle}
                aria-pressed={grayscale}
                className={cn(
                  "h-8 gap-1.5 text-xs font-medium",
                  !onThemeToggle && "col-span-2"
                )}
              >
                <Sparkles className="size-3.5" aria-hidden="true" />
                <span>Escala de grises</span>
              </Button>
            </div>
          </div>

          {/* Lectura y Movimiento */}
          <div className="flex flex-col gap-1.5 border-t border-[var(--border)] pt-2">
            <Label className="text-xs font-semibold text-[var(--text-primary)]">
              Lectura y Movimiento
            </Label>
            <div className="grid grid-cols-2 gap-1.5">
              <Button
                variant={lineSpacing === "amplio" ? "ember" : "outline"}
                size="sm"
                onClick={onLineSpacingToggle}
                aria-pressed={lineSpacing === "amplio"}
                className="h-8 text-[11px] font-medium"
              >
                Interlineado amplio
              </Button>
              <Button
                variant={letterSpacing === "amplio" ? "ember" : "outline"}
                size="sm"
                onClick={onLetterSpacingToggle}
                aria-pressed={letterSpacing === "amplio"}
                className="h-8 text-[11px] font-medium"
              >
                Espaciado letras
              </Button>
              <Button
                variant={underlineLinks ? "ember" : "outline"}
                size="sm"
                onClick={onUnderlineLinksToggle}
                aria-pressed={underlineLinks}
                className="h-8 gap-1 text-[11px] font-medium"
              >
                <Underline className="size-3" aria-hidden="true" />
                <span>Subrayar enlaces</span>
              </Button>
              <Button
                variant={reducedMotion ? "ember" : "outline"}
                size="sm"
                onClick={onReducedMotionToggle}
                aria-pressed={reducedMotion}
                className="h-8 text-[11px] font-medium"
              >
                Reducir movimiento
              </Button>
            </div>
          </div>

          {/* Restablecer todo */}
          <div className="border-t border-[var(--border)] pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onResetAll}
              className="h-8 w-full gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              <span>Restablecer todo</span>
            </Button>
          </div>
        </div>
      )}

      {/* Barra vertical fija estilo Función Pública / GOV.CO */}
      <nav
        aria-label="Menú de accesibilidad"
        className="relative z-10 flex w-[52px] flex-col rounded-l-xl border-y border-l border-[var(--border-strong)] bg-[var(--surface-1)] py-1.5 shadow-raised"
      >
        {/* En geovisor: botón para colapsar barra a pestaña mínima */}
        {isGeovisor && onToggleCollapse && (
          <div className="flex h-6 w-full items-center justify-center border-b border-[var(--border)] pb-1 mb-0.5">
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Ocultar menú de accesibilidad"
              title="Ocultar menú de accesibilidad"
              className="flex size-5 items-center justify-center rounded text-[var(--text-tertiary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--ring)]"
            >
              <ChevronRight className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        )}

        <ul role="list" className="m-0 flex w-full flex-col gap-1 p-0 list-none">
          {/* 1. Contraste (Alterna directamente Normal / Alto contraste AAA) */}
          <li className="relative h-12 w-[52px]">
            <button
              type="button"
              onClick={handleContrastClick}
              aria-label={
                contrast === "alto"
                  ? "Desactivar alto contraste (actual: activado)"
                  : "Activar alto contraste"
              }
              aria-pressed={contrast === "alto"}
              className={cn(
                "group absolute right-0 top-0 flex h-12 w-[52px] items-center overflow-hidden rounded-l-lg border-y border-l border-transparent bg-[var(--surface-1)] shadow-none transition-[width] duration-[250ms] ease-out focus-visible:outline-2 focus-visible:outline-[var(--ring)] motion-reduce:transition-none",
                clasesExpansionBoton,
                reducedMotion && "transition-none!"
              )}
            >
              <div className="flex h-full w-[196px] items-center pl-[13px] pr-3">
                <div
                  className={cn(
                    "flex size-[26px] shrink-0 items-center justify-center rounded-[6px] transition-colors",
                    contrast === "alto"
                      ? "bg-[var(--ember)] text-[var(--ember-foreground)] font-bold shadow-sm"
                      : "bg-[var(--surface-2)] text-[var(--text-primary)] group-hover:bg-[var(--ember)] group-hover:text-[var(--ember-foreground)]"
                  )}
                >
                  <Contrast className="size-3.5" aria-hidden="true" />
                </div>
                <span
                  className={cn(
                    "ml-2.5 whitespace-nowrap text-xs font-semibold text-[var(--text-primary)] opacity-0 transition-opacity duration-200",
                    clasesOpacidadEtiqueta,
                    reducedMotion && "transition-none!"
                  )}
                >
                  {contrast === "alto" ? "Contraste normal" : "Alto contraste"}
                </span>
              </div>
            </button>
          </li>

          {/* 2. Aumentar tamaño de texto (A+) */}
          <li className="relative h-12 w-[52px]">
            <button
              type="button"
              onClick={onAumentarTextSize}
              disabled={textSize === "200"}
              aria-label={`Aumentar tamaño de texto (actual ${textSize}%)`}
              className={cn(
                "group absolute right-0 top-0 flex h-12 w-[52px] items-center overflow-hidden rounded-l-lg border-y border-l border-transparent bg-[var(--surface-1)] shadow-none transition-[width] duration-[250ms] ease-out focus-visible:outline-2 focus-visible:outline-[var(--ring)] motion-reduce:transition-none",
                clasesExpansionBoton,
                textSize === "200" && "cursor-not-allowed opacity-50",
                reducedMotion && "transition-none!"
              )}
            >
              <div className="flex h-full w-[196px] items-center pl-[13px] pr-3">
                <div className="flex size-[26px] shrink-0 items-center justify-center rounded-[6px] bg-[var(--surface-2)] text-[var(--text-primary)] font-bold transition-colors group-hover:bg-[var(--ember)] group-hover:text-[var(--ember-foreground)]">
                  <span className="text-[12px] font-bold leading-none" aria-hidden="true">
                    A+
                  </span>
                </div>
                <span
                  className={cn(
                    "ml-2.5 whitespace-nowrap text-xs font-semibold text-[var(--text-primary)] opacity-0 transition-opacity duration-200",
                    clasesOpacidadEtiqueta,
                    reducedMotion && "transition-none!"
                  )}
                >
                  {`Aumentar (${textSize}%)`}
                </span>
              </div>
            </button>
          </li>

          {/* 3. Reducir tamaño de texto (A−) */}
          <li className="relative h-12 w-[52px]">
            <button
              type="button"
              onClick={onDisminuirTextSize}
              disabled={textSize === "100"}
              aria-label={`Reducir tamaño de texto (actual ${textSize}%)`}
              className={cn(
                "group absolute right-0 top-0 flex h-12 w-[52px] items-center overflow-hidden rounded-l-lg border-y border-l border-transparent bg-[var(--surface-1)] shadow-none transition-[width] duration-[250ms] ease-out focus-visible:outline-2 focus-visible:outline-[var(--ring)] motion-reduce:transition-none",
                clasesExpansionBoton,
                textSize === "100" && "cursor-not-allowed opacity-50",
                reducedMotion && "transition-none!"
              )}
            >
              <div className="flex h-full w-[196px] items-center pl-[13px] pr-3">
                <div className="flex size-[26px] shrink-0 items-center justify-center rounded-[6px] bg-[var(--surface-2)] text-[var(--text-primary)] font-bold transition-colors group-hover:bg-[var(--ember)] group-hover:text-[var(--ember-foreground)]">
                  <span className="text-[12px] font-bold leading-none" aria-hidden="true">
                    A−
                  </span>
                </div>
                <span
                  className={cn(
                    "ml-2.5 whitespace-nowrap text-xs font-semibold text-[var(--text-primary)] opacity-0 transition-opacity duration-200",
                    clasesOpacidadEtiqueta,
                    reducedMotion && "transition-none!"
                  )}
                >
                  {`Reducir (${textSize}%)`}
                </span>
              </div>
            </button>
          </li>

          {/* 4. Restablecer */}
          <li className="relative h-12 w-[52px]">
            <button
              type="button"
              onClick={onResetAll}
              aria-label="Restablecer todas las preferencias de accesibilidad"
              className={cn(
                "group absolute right-0 top-0 flex h-12 w-[52px] items-center overflow-hidden rounded-l-lg border-y border-l border-transparent bg-[var(--surface-1)] shadow-none transition-[width] duration-[250ms] ease-out focus-visible:outline-2 focus-visible:outline-[var(--ring)] motion-reduce:transition-none",
                clasesExpansionBoton,
                reducedMotion && "transition-none!"
              )}
            >
              <div className="flex h-full w-[196px] items-center pl-[13px] pr-3">
                <div className="flex size-[26px] shrink-0 items-center justify-center rounded-[6px] bg-[var(--surface-2)] text-[var(--text-primary)] font-bold transition-colors group-hover:bg-[var(--ember)] group-hover:text-[var(--ember-foreground)]">
                  <RotateCcw className="size-3.5" aria-hidden="true" />
                </div>
                <span
                  className={cn(
                    "ml-2.5 whitespace-nowrap text-xs font-semibold text-[var(--text-primary)] opacity-0 transition-opacity duration-200",
                    clasesOpacidadEtiqueta,
                    reducedMotion && "transition-none!"
                  )}
                >
                  Restablecer
                </span>
              </div>
            </button>
          </li>

          {/* 5. Más opciones */}
          <li className="relative h-12 w-[52px]">
            <button
              ref={moreTriggerRef}
              type="button"
              onClick={onToggleOpen}
              aria-label="Más opciones de accesibilidad"
              aria-expanded={isOpen}
              aria-controls="panel-mas-opciones-a11y"
              className={cn(
                "group absolute right-0 top-0 flex h-12 w-[52px] items-center overflow-hidden rounded-l-lg border-y border-l border-transparent bg-[var(--surface-1)] shadow-none transition-[width] duration-[250ms] ease-out focus-visible:outline-2 focus-visible:outline-[var(--ring)] motion-reduce:transition-none",
                clasesExpansionBoton,
                isOpen && "border-[var(--border-strong)] bg-[var(--surface-2)]",
                reducedMotion && "transition-none!"
              )}
            >
              <div className="flex h-full w-[196px] items-center pl-[13px] pr-3">
                <div
                  className={cn(
                    "flex size-[26px] shrink-0 items-center justify-center rounded-[6px] transition-colors",
                    isOpen
                      ? "bg-[var(--ember)] text-[var(--ember-foreground)] font-bold"
                      : "bg-[var(--surface-2)] text-[var(--text-primary)] group-hover:bg-[var(--ember)] group-hover:text-[var(--ember-foreground)]"
                  )}
                >
                  <Sliders className="size-3.5" aria-hidden="true" />
                </div>
                <span
                  className={cn(
                    "ml-2.5 whitespace-nowrap text-xs font-semibold text-[var(--text-primary)] opacity-0 transition-opacity duration-200",
                    clasesOpacidadEtiqueta,
                    reducedMotion && "transition-none!"
                  )}
                >
                  Más opciones
                </span>
              </div>
            </button>
          </li>

          {/* 6. Centro de Relevo / Signos en Red (Enlace externo oficial) */}
          <li className="relative h-12 w-[52px]">
            <a
              href="https://centroderelevo.gov.co/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Centro de Relevo Colombia (abre en una nueva pestaña)"
              className={cn(
                "group absolute right-0 top-0 flex h-12 w-[52px] items-center overflow-hidden rounded-l-lg border-y border-l border-transparent bg-[var(--surface-1)] shadow-none transition-[width] duration-[250ms] ease-out focus-visible:outline-2 focus-visible:outline-[var(--ring)] motion-reduce:transition-none",
                clasesExpansionBoton,
                reducedMotion && "transition-none!"
              )}
            >
              <div className="flex h-full w-[196px] items-center pl-[13px] pr-3">
                <div className="flex size-[26px] shrink-0 items-center justify-center rounded-[6px] bg-[var(--surface-2)] text-[var(--text-primary)] font-bold transition-colors group-hover:bg-[var(--ember)] group-hover:text-[var(--ember-foreground)]">
                  <Volume2 className="size-3.5" aria-hidden="true" />
                </div>
                <div
                  className={cn(
                    "ml-2.5 flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-[var(--text-primary)] opacity-0 transition-opacity duration-200",
                    clasesOpacidadEtiqueta,
                    reducedMotion && "transition-none!"
                  )}
                >
                  <span>Centro de Relevo</span>
                  <ExternalLink className="size-3 text-[var(--text-tertiary)]" aria-hidden="true" />
                </div>
              </div>
            </a>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
