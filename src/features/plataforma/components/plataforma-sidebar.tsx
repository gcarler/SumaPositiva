"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  ClipboardList,
  Map,
  Handshake,
  Users,
  FileText,
  Database,
  Settings,
  ArrowLeft,
  Menu,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { useSesionStore } from "@/features/sesion/state/session-store";
import { modulosPermitidos, type ModuloPlataforma } from "../models/acceso";
export const ICONOS = {
  dashboard: Home,
  formularios: ClipboardList,
  geovisor: Map,
  mesas: Handshake,
  usuarios: Users,
  contenido: FileText,
  fuentes: Database,
  actores: Users,
  configuracion: Settings,
} satisfies Record<ModuloPlataforma, typeof Home>;
export function PlataformaSidebar() {
  const sesion = useSesionStore((s) => s.sesion);
  const ruta = usePathname();
  const [abierto, setAbierto] = useState(false);
  return (
    <aside className="shrink-0 border-b border-border bg-surface-1 lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:overflow-y-auto lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between gap-3 p-4">
        <span className="font-semibold text-text-primary">
          POLIS · Gestión interna
        </span>
        <Button
          variant="outline"
          size="icon-sm"
          className="lg:hidden"
          aria-label="Mostrar navegación interna"
          aria-expanded={abierto}
          aria-controls="navegacion-interna"
          onClick={() => setAbierto(!abierto)}
        >
          <Menu aria-hidden="true" />
        </Button>
      </div>
      <nav
        id="navegacion-interna"
        aria-label="Navegación de plataforma"
        className={`${abierto ? "block" : "hidden"} space-y-2 p-3 lg:block`}
      >
        {modulosPermitidos(sesion).map((m) => {
          const Icono = ICONOS[m.id];
          return (
            <Button
              key={m.id}
              asChild
              variant={ruta === m.ruta ? "secondary" : "ghost"}
              className="h-auto min-h-11 w-full justify-start whitespace-normal text-left"
            >
              <Link
                href={m.ruta}
                aria-current={ruta === m.ruta ? "page" : undefined}
                onClick={() => setAbierto(false)}
              >
                <Icono aria-hidden="true" className="size-4" />
                {m.titulo}
              </Link>
            </Button>
          );
        })}
        <div className="border-t border-border pt-3">
          <Button asChild variant="outline" className="w-full justify-start">
            <Link href="/">
              <ArrowLeft aria-hidden="true" className="size-4" />
              Volver al portal
            </Link>
          </Button>
        </div>
      </nav>
    </aside>
  );
}
