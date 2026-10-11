"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BARRIO_DEFECTO,
  type BarrioCartagena,
} from "../data/barrios-cartagena";
import { BarrioSelector } from "./barrio-selector";
import { AcuerdosBarrioTab } from "./acuerdos-barrio-tab";
import { PropuestaBarrioTab } from "./propuesta-barrio-tab";
import { SemaforoBarrioTab } from "./semaforo-barrio-tab";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import {
  Landmark,
  FileText,
  PlusCircle,
  Activity,
  ArrowLeft,
  Wifi,
  ShieldCheck,
} from "lucide-react";

type TabModoBarrio = "acuerdos" | "proponer" | "semaforo";

export function BarrioView() {
  const [barrio, setBarrio] = useState<BarrioCartagena>(BARRIO_DEFECTO);
  const [tabActiva, setTabActiva] = useState<TabModoBarrio>("acuerdos");

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] flex flex-col">
      {/* Header Ultraligero Mobile-First */}
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-md px-3 py-2.5 sm:px-6">
        <div className="mx-auto max-w-lg flex items-center justify-between gap-2">
          {/* Marca / Identidad Institucional */}
          <Link
            href="/barrio"
            className="flex items-center gap-2 group outline-none"
            aria-label="POLIS Modo Barrio — Inicio"
          >
            <span className="flex size-7 items-center justify-center rounded-md bg-[var(--text-primary)] text-[var(--text-inverse)] shadow-xs">
              <Landmark className="size-4" />
            </span>
            <div className="flex flex-col leading-tight">
              <span className="flex items-center gap-1 text-xs font-bold tracking-tight text-[var(--text-primary)]">
                POLIS Barrio
                <span className="size-1 rounded-full bg-[var(--ember)]" />
              </span>
              <span className="text-[10px] text-[var(--text-tertiary)]">
                Cartagena de Indias
              </span>
            </div>
          </Link>

          {/* Indicador de Ahorro y Regreso */}
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="hidden sm:inline-flex gap-1 text-[10px] border-[var(--border-strong)] text-[var(--success)]"
            >
              <Wifi className="size-3" />
              <span>Bajo Consumo (&lt;150 KB)</span>
            </Badge>

            <Button
              asChild
              variant="outline"
              size="sm"
              className="gap-1 text-xs h-8 px-2.5 border-[var(--border)]"
            >
              <Link href="/" title="Regresar a la plataforma completa con mapas y paneles">
                <ArrowLeft className="size-3.5" />
                <span className="hidden xs:inline">Vista Completa</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Contenedor Principal (Max-w-lg optimizado para celulares) */}
      <main className="flex-1 mx-auto w-full max-w-lg px-3 py-3.5 sm:px-4 sm:py-5 space-y-4">
        {/* Banner Informativo de Equidad Digital */}
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-[var(--ember)] shrink-0" />
            <span>Participación directa sin consumir tu plan de datos.</span>
          </div>
          <span className="font-mono text-[10px] text-[var(--text-tertiary)]">
            3G / 4G
          </span>
        </div>

        {/* Selector de Barrio de Cartagena */}
        <BarrioSelector
          barrioSeleccionado={barrio}
          onCambiarBarrio={(b) => setBarrio(b)}
        />

        {/* Pestañas de las 3 Preguntas Clave */}
        <nav
          className="grid grid-cols-3 gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-1 shadow-xs"
          aria-label="Preguntas clave del barrio"
        >
          <Button
            variant="unstyled"
            size="unstyled"
            type="button"
            onClick={() => setTabActiva("acuerdos")}
            aria-selected={tabActiva === "acuerdos"}
            className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg text-center transition-all ${
              tabActiva === "acuerdos"
                ? "bg-[var(--surface-3)] text-[var(--text-primary)] font-bold shadow-xs border border-[var(--border)]"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)]"
            }`}
          >
            <FileText className={`size-4 ${tabActiva === "acuerdos" ? "text-[var(--ember)]" : ""}`} />
            <span className="text-[11px] leading-tight">1. ¿Qué se acordó?</span>
          </Button>

          <Button
            variant="unstyled"
            size="unstyled"
            type="button"
            onClick={() => setTabActiva("proponer")}
            aria-selected={tabActiva === "proponer"}
            className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg text-center transition-all ${
              tabActiva === "proponer"
                ? "bg-[var(--surface-3)] text-[var(--text-primary)] font-bold shadow-xs border border-[var(--border)]"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)]"
            }`}
          >
            <PlusCircle className={`size-4 ${tabActiva === "proponer" ? "text-[var(--ember)]" : ""}`} />
            <span className="text-[11px] leading-tight">2. ¿Qué propones?</span>
          </Button>

          <Button
            variant="unstyled"
            size="unstyled"
            type="button"
            onClick={() => setTabActiva("semaforo")}
            aria-selected={tabActiva === "semaforo"}
            className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg text-center transition-all ${
              tabActiva === "semaforo"
                ? "bg-[var(--surface-3)] text-[var(--text-primary)] font-bold shadow-xs border border-[var(--border)]"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)]"
            }`}
          >
            <Activity className={`size-4 ${tabActiva === "semaforo" ? "text-[var(--ember)]" : ""}`} />
            <span className="text-[11px] leading-tight">3. ¿Cómo va?</span>
          </Button>
        </nav>

        {/* Contenido según la pestaña activa */}
        <section aria-live="polite">
          {tabActiva === "acuerdos" && (
            <AcuerdosBarrioTab
              barrio={barrio}
              onIrAProponer={() => setTabActiva("proponer")}
            />
          )}

          {tabActiva === "proponer" && (
            <PropuestaBarrioTab barrio={barrio} />
          )}

          {tabActiva === "semaforo" && (
            <SemaforoBarrioTab barrio={barrio} />
          )}
        </section>
      </main>

      {/* Footer Minimalista de Bajo Consumo */}
      <footer className="mt-auto border-t border-[var(--border)] bg-[var(--surface-1)] py-4 px-3 text-center text-xs text-[var(--text-tertiary)]">
        <div className="mx-auto max-w-lg space-y-1">
          <p className="font-semibold text-[var(--text-secondary)]">
            Alcaldía Mayor de Cartagena de Indias
          </p>
          <p className="text-[11px]">
            Plan de Desarrollo "Cartagena Ciudad de Derechos" (2024–2027)
          </p>
          <div className="pt-2 flex items-center justify-center gap-4 text-[11px]">
            <Link
              href="/"
              className="text-[var(--ember)] hover:underline font-medium"
            >
              Ir a la Plataforma Completa
            </Link>
            <span>•</span>
            <span className="font-mono text-[10px]">POLIS v2.4</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
