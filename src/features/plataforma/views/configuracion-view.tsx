"use client";

import { useState, type ReactNode } from "react";
import { useTheme } from "next-themes";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Check,
  Eye,
  Globe2,
  LockKeyhole,
  MapPinned,
  Palette,
  RefreshCw,
  Settings2,
  Image as ImageIcon,
  ExternalLink,
  Sliders,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/shared/ui/page-header";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Notice } from "@/shared/ui/notice";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { Switch } from "@/shared/ui/switch";
import { useSesionStore } from "@/features/sesion/state/session-store";
import { usePanels } from "@/core/panels/panel-store";
import {
  useHeroConfigStore,
  HERO_IMAGE_OPTIONS,
} from "@/features/politicas/state/hero-store";
import { puedeEditar } from "../models/acceso";

export function ConfiguracionView() {
  const sesion = useSesionStore((state) => state.sesion);
  const { theme, setTheme } = useTheme();
  const cache = useQueryClient();
  const { openPanel } = usePanels();
  const editar = puedeEditar(sesion, "configuracion");
  const [resumenSemanal, setResumenSemanal] = useState(false);
  const [latitud, setLatitud] = useState("10.3997");
  const [longitud, setLongitud] = useState("-75.5144");
  const [zoom, setZoom] = useState("13");
  const googleConfigurado = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

  /* Identidad Visual del Hero en Portada (FEAT-HERO-01) */
  const heroImageId = useHeroConfigStore((state) => state.heroImageId);
  const opacidad = useHeroConfigStore((state) => state.opacidad);
  const setHeroImageId = useHeroConfigStore((state) => state.setHeroImageId);
  const setOpacidad = useHeroConfigStore((state) => state.setOpacidad);

  return (
    <div className="space-y-6">
      <PageHeader title="Configuración" description="Preferencias de trabajo y parámetros generales de POLIS." action={<Button variant="outline" disabled={!editar} onClick={() => { void cache.invalidateQueries(); toast.success("Consultas actualizadas"); }}><RefreshCw className="size-4" aria-hidden="true" />Actualizar consultas</Button>} />
      {!editar && <Notice title="Solo lectura">Puedes consultar estos parámetros. Los cambios requieren el permiso de gestión de configuración.</Notice>}
      <Notice tone="info" title="Alcance de esta configuración">Las preferencias de tema se guardan localmente. Los parámetros distritales y de despliegue se muestran como referencia; su modificación se administra por los canales de configuración autorizados.</Notice>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-border bg-surface-1">
          <CabeceraSeccion icono={<Palette className="size-5" />} titulo="Apariencia" detalle="Personaliza la lectura de la plataforma." />
          <div className="space-y-5 p-5">
            <FormField label="Tema de la interfaz" description="Preferencia guardada por este navegador.">
              {(field) => <div id={field.id} className="flex flex-wrap gap-2" role="group" aria-label="Tema de la interfaz">
                <Button type="button" variant={theme !== "dark" ? "default" : "outline"} disabled={!editar} aria-pressed={theme !== "dark"} onClick={() => setTheme("light")}>Claro</Button>
                <Button type="button" variant={theme === "dark" ? "default" : "outline"} disabled={!editar} aria-pressed={theme === "dark"} onClick={() => setTheme("dark")}>Oscuro</Button>
              </div>}
            </FormField>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface-0 p-4">
              <div><p className="font-medium">Vista de alto contraste</p><p className="mt-1 text-sm text-text-secondary">Consulta las opciones de accesibilidad del sistema.</p></div>
              <Badge variant="outline"><Eye className="mr-1 size-3" aria-hidden="true" />Estándar</Badge>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-border bg-surface-1">
          <CabeceraSeccion icono={<Bell className="size-5" />} titulo="Notificaciones" detalle="Elige qué avisos recibir en el entorno de trabajo." />
          <div className="space-y-4 p-5">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface-0 p-4">
              <div><p className="font-medium">Resumen semanal por correo</p><p className="mt-1 text-sm text-text-secondary">Recibe un resumen de actividad del equipo.</p></div>
              <Switch checked={resumenSemanal} onCheckedChange={(value) => { setResumenSemanal(value); toast.success(value ? "Preferencia activada en esta sesión" : "Preferencia desactivada en esta sesión"); }} disabled={!editar} aria-label="Resumen semanal por correo" />
            </div>
            <p className="text-xs text-text-tertiary">La entrega de correo requiere una configuración institucional del servicio de notificaciones.</p>
          </div>
        </section>

        {/* Identidad Visual de la Portada Pública (FEAT-HERO-01) */}
        <section className="overflow-hidden rounded-2xl border border-border bg-surface-1 xl:col-span-2">
          <CabeceraSeccion
            icono={<ImageIcon className="size-5" />}
            titulo="Identidad Visual de la Portada Pública"
            detalle="Selecciona la fotografía territorial del Hero del portal ciudadano y calibra su intensidad ambiental."
          />
          <div className="space-y-6 p-5">
            {/* Barra de Controles Rápidos y Previsualización */}
            <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface-0 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sliders className="size-4 text-ember" />
                  <span className="text-sm font-semibold text-text-primary">
                    Intensidad Ambiental (Opacidad: {opacidad}%)
                  </span>
                </div>
                <p className="text-xs text-text-secondary">
                  Calibra la sutileza de la fotografía territorial de fondo detrás del contenido de la portada.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {[
                  { valor: 10, etiqueta: "10% (Sutil)" },
                  { valor: 18, etiqueta: "18% (Recomendado)" },
                  { valor: 25, etiqueta: "25% (Marcado)" },
                  { valor: 35, etiqueta: "35% (Vibrante)" },
                ].map((preset) => (
                  <Button
                    key={preset.valor}
                    type="button"
                    variant={opacidad === preset.valor ? "default" : "outline"}
                    size="sm"
                    disabled={!editar}
                    onClick={() => {
                      setOpacidad(preset.valor);
                      toast.success(`Intensidad de portada calibrada al ${preset.valor}%`);
                    }}
                    className="h-8 text-xs font-medium"
                  >
                    {preset.etiqueta}
                  </Button>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  asChild
                  className="h-8 text-xs font-medium text-ember hover:text-ember"
                >
                  <a href="/" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-1.5 size-3.5" />
                    Previsualizar portal público (/)
                  </a>
                </Button>
              </div>
            </div>

            {/* Cuadrícula de Opciones de Fotografía Territorial */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {HERO_IMAGE_OPTIONS.map((opcion) => {
                const esActiva = heroImageId === opcion.id;
                const esNinguna = opcion.id === "ninguna";

                return (
                  <div
                    key={opcion.id}
                    onClick={() => {
                      if (!editar) return;
                      setHeroImageId(opcion.id);
                      toast.success(
                        esNinguna
                          ? "Fondo minimalista oficial activado en portada"
                          : `Fotografía "${opcion.titulo}" activada en el portal público`
                      );
                    }}
                    className={`group relative flex flex-col justify-between overflow-hidden rounded-xl border p-3.5 transition-all duration-200 cursor-pointer ${
                      esActiva
                        ? "border-ember bg-surface-2/80 ring-1 ring-ember shadow-sm"
                        : "border-border bg-surface-0 hover:border-ember/40 hover:bg-surface-2/40"
                    } ${!editar ? "cursor-not-allowed opacity-75" : ""}`}
                  >
                    <div className="space-y-3">
                      {/* Vista previa o thumbnail */}
                      <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border/80 bg-surface-2">
                        {esNinguna ? (
                          <div className="flex h-full w-full items-center justify-center bg-dotgrid p-4 text-center">
                            <span className="text-xs font-medium text-text-tertiary">
                              Retícula de puntos institucional
                            </span>
                          </div>
                        ) : (
                          <img
                            src={opcion.thumbnail || opcion.archivo}
                            alt={opcion.titulo}
                            className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                          />
                        )}

                        {/* Badge de estado activa */}
                        {esActiva && (
                          <div className="absolute right-2 top-2">
                            <Badge variant="success" className="shadow-sm font-medium">
                              <Check className="mr-1 size-3" />
                              Activa en el portal
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* Textos y metadata */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm font-semibold text-text-primary line-clamp-1">
                            {opcion.titulo}
                          </h3>
                        </div>
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                          {opcion.enfoque}
                        </Badge>
                        <p className="text-xs leading-relaxed text-text-secondary line-clamp-2">
                          {opcion.descripcion}
                        </p>
                      </div>
                    </div>

                    {/* Botón de acción al pie de la tarjeta */}
                    <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between">
                      <span className="text-[11px] text-text-tertiary">
                        {esActiva ? "Seleccionada actualmente" : "Clic para activar"}
                      </span>
                      <Button
                        type="button"
                        variant={esActiva ? "default" : "outline"}
                        size="sm"
                        disabled={!editar}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!editar) return;
                          setHeroImageId(opcion.id);
                          toast.success(
                            esNinguna
                              ? "Fondo minimalista oficial activado en portada"
                              : `Fotografía "${opcion.titulo}" activada en el portal público`
                          );
                        }}
                        className="h-7 text-xs font-medium"
                      >
                        {esActiva ? "Activa" : "Activar como portada"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-border bg-surface-1">
          <CabeceraSeccion icono={<Globe2 className="size-5" />} titulo="Política pública" detalle="Marco de referencia institucional de la plataforma." />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <FormField label="Nombre">{(field) => <Input {...field} value="Seguridad Humana Integral" readOnly />}</FormField>
            <FormField label="Vigencia">{(field) => <Input {...field} value="2026–2036" readOnly />}</FormField>
            <FormField label="Marco Legal">{(field) => <Input {...field} value="Ley 1757 de 2015" readOnly />}</FormField>
            <div className="flex items-end"><Badge variant="success"><Check className="mr-1 size-3" aria-hidden="true" />Marco institucional</Badge></div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-border bg-surface-1">
          <CabeceraSeccion icono={<MapPinned className="size-5" />} titulo="Geovisor" detalle="Valores iniciales de referencia para el mapa distrital." />
          <div className="grid gap-4 p-5 sm:grid-cols-3">
            <FormField label="Latitud">{(field) => <Input {...field} inputMode="decimal" value={latitud} onChange={(event) => setLatitud(event.target.value)} disabled={!editar} />}</FormField>
            <FormField label="Longitud">{(field) => <Input {...field} inputMode="decimal" value={longitud} onChange={(event) => setLongitud(event.target.value)} disabled={!editar} />}</FormField>
            <FormField label="Zoom inicial">{(field) => <Input {...field} type="number" min={1} max={20} value={zoom} onChange={(event) => setZoom(event.target.value)} disabled={!editar} />}</FormField>
            <p className="text-xs text-text-tertiary sm:col-span-3">Coordenadas de referencia en Cartagena. Los cambios aquí solo actualizan esta vista y no alteran el servicio del geovisor.</p>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-border bg-surface-1 xl:col-span-2">
          <CabeceraSeccion icono={<LockKeyhole className="size-5" />} titulo="Seguridad e identidad" detalle="Estado de integración y dominio institucional." />
          <div className="grid gap-4 p-5 md:grid-cols-2">
            <div className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-surface-0 p-4 sm:flex-row sm:items-center">
              <div><p className="font-medium">Inicio de sesión Google OAuth</p><p className="mt-1 text-sm text-text-secondary">La integración depende de las variables del entorno de despliegue.</p></div>
              <Badge variant={googleConfigurado ? "success" : "warning"}>{googleConfigurado ? "Configurado" : "Pendiente"}</Badge>
            </div>
            <div className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-surface-0 p-4 sm:flex-row sm:items-center">
              <div><p className="font-medium">Dominio institucional permitido</p><p className="mt-1 text-sm text-text-secondary">Referencia de correo para las cuentas del Distrito.</p></div>
              <Badge variant="outline">@cartagena.gov.co</Badge>
            </div>
            <p className="text-xs text-text-tertiary md:col-span-2">No se muestran ni editan secretos desde la interfaz. La configuración de OAuth se realiza en el entorno de despliegue.</p>
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-1 p-5 sm:flex-row sm:items-center sm:justify-between xl:col-span-2">
          <div className="flex items-start gap-3"><Settings2 className="mt-0.5 size-5 text-ember" aria-hidden="true" /><div><h2 className="font-semibold">Participación y fases</h2><p className="mt-1 text-sm text-text-secondary">La recepción web y los cierres se configuran desde cada fase y formulario.</p></div></div>
          {editar && sesion?.permisos?.includes("politicas:gestionar") && <Button variant="outline" onClick={() => openPanel("fases-control", {})}>Configurar fases</Button>}
        </section>
      </div>
    </div>
  );
}

function CabeceraSeccion({ icono, titulo, detalle }: { icono: ReactNode; titulo: string; detalle: string }) {
  return <header className="flex items-start gap-3 border-b border-border p-5"><span className="rounded-xl bg-ember-soft p-2.5 text-ember">{icono}</span><div><h2 className="font-semibold text-text-primary">{titulo}</h2><p className="mt-1 text-sm text-text-secondary">{detalle}</p></div></header>;
}
