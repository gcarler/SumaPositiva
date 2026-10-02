"use client";

import { useState, type ReactNode } from "react";
import { useTheme } from "next-themes";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, Check, Eye, Globe2, LockKeyhole, MapPinned, Palette, RefreshCw, Settings2 } from "lucide-react";
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

  return (
    <div className="space-y-6">
      <PageHeader title="Configuración" description="Preferencias de trabajo y parámetros generales de POLIS." action={<Button variant="outline" disabled={!editar} onClick={() => { void cache.invalidateQueries(); toast.success("Consultas actualizadas"); }}><RefreshCw className="size-4" aria-hidden="true" />Actualizar consultas</Button>} />
      {!editar && <Notice title="Solo lectura">Puedes consultar estos parámetros. Los cambios requieren el rol administrador de identidades.</Notice>}
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

        <section className="overflow-hidden rounded-2xl border border-border bg-surface-1">
          <CabeceraSeccion icono={<Globe2 className="size-5" />} titulo="Política pública" detalle="Marco de referencia institucional de la plataforma." />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <FormField label="Nombre">{(field) => <Input {...field} value="Seguridad Humana Integral" readOnly />}</FormField>
            <FormField label="Vigencia">{(field) => <Input {...field} value="2026–2036" readOnly />}</FormField>
            <FormField label="Decreto">{(field) => <Input {...field} value="037 de 2026" readOnly />}</FormField>
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
