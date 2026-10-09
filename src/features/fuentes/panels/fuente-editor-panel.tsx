"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  FileText,
  Building2,
  Lock,
  ShieldCheck,
  User,
  PlusCircle,
} from "lucide-react";
import { PanelShell } from "@/core/panels/panel-shell";
import { usePanels } from "@/core/panels/panel-store";
import type { PanelComponentProps } from "@/app/_composition/panel-registry";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Badge } from "@/shared/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { useSesionStore } from "@/features/sesion/state/session-store";
import { puedeEditar } from "@/features/plataforma/models/acceso";
import { useFuentesStore } from "../state/fuentes-store";
import type {
  AmbitoFuente,
  EstadoEntrega,
  TipoFuente,
} from "../models/fuente";

export function FuenteEditorPanel({ entryKey, props }: PanelComponentProps<"fuente-editor">) {
  const { closeTop } = usePanels();
  const sesion = useSesionStore((s) => s.sesion);
  const fuenteId = props.fuenteId;
  const esCreacion = !fuenteId;

  const fuente = useFuentesStore((s) => (fuenteId ? s.getById(fuenteId) : undefined));
  const actualizarFuente = useFuentesStore((s) => s.actualizarFuente);
  const agregarFuente = useFuentesStore((s) => s.agregarFuente);

  const tienePermisoEscritura = puedeEditar(sesion, "fuentes") && !props.soloLectura;

  // Estados del formulario
  const [codigo, setCodigo] = useState(fuente?.codigo ?? "");
  const [entidad, setEntidad] = useState(fuente?.entidad ?? "");
  const [nombreFuente, setNombreFuente] = useState(fuente?.nombreFuente ?? "");
  const [tipo, setTipo] = useState<TipoFuente>(fuente?.tipo ?? "primaria");
  const [ambito, setAmbito] = useState<AmbitoFuente>(fuente?.ambito ?? "local");
  const [dimensionSeguridad, setDimensionSeguridad] = useState<string>(
    fuente?.dimensionSeguridad ?? "personal"
  );
  const [periodicidad, setPeriodicidad] = useState<
    "mensual" | "trimestral" | "semestral" | "anual" | "por_demanda"
  >(fuente?.periodicidad ?? "mensual");
  const [variablesTexto, setVariablesTexto] = useState(
    fuente?.variablesSolicitadas?.join("\n") ?? ""
  );

  const [radicado, setRadicado] = useState(fuente?.radicadoSolicitud ?? "");
  const [fechaSolicitud, setFechaSolicitud] = useState(fuente?.fechaSolicitud ?? "");
  const [fechaLimite, setFechaLimite] = useState(fuente?.fechaLimiteRespuesta ?? "");
  const [estadoEntrega, setEstadoEntrega] = useState<EstadoEntrega>(
    fuente?.estadoEntrega ?? (esCreacion ? "por_solicitar" : "en_termino")
  );
  const [datosResumen, setDatosResumen] = useState(fuente?.datosEntregadosResumen ?? "");
  const [archivoUrl, setArchivoUrl] = useState(fuente?.archivoAdjuntoUrl ?? "");
  const [observaciones, setObservaciones] = useState(fuente?.observacionesCalidad ?? "");

  const [contactoNombre, setContactoNombre] = useState(
    fuente?.responsableContacto?.nombre ?? ""
  );
  const [contactoCargo, setContactoCargo] = useState(
    fuente?.responsableContacto?.cargo ?? ""
  );
  const [contactoEmail, setContactoEmail] = useState(
    fuente?.responsableContacto?.email ?? ""
  );
  const [contactoTelefono, setContactoTelefono] = useState(
    fuente?.responsableContacto?.telefono ?? ""
  );

  const [guardando, setGuardando] = useState(false);

  if (!esCreacion && !fuente) {
    return (
      <PanelShell
        entryKey={entryKey}
        crumbs={[{ label: "Fuentes" }]}
        kicker="Gestión de Información"
        title="Fuente no encontrada"
        subtitle="El registro solicitado no existe en la base activa."
        onClose={closeTop}
        onCloseToKey={closeTop}
      >
        <div className="p-6 text-center text-text-secondary">
          <p>No se pudo localizar la fuente con identificador: {fuenteId}</p>
          <Button variant="outline" onClick={closeTop} className="mt-4">
            Volver al listado
          </Button>
        </div>
      </PanelShell>
    );
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!tienePermisoEscritura) {
      toast.error("No tienes permisos para modificar fuentes de información");
      return;
    }

    setGuardando(true);
    try {
      if (esCreacion) {
        if (!entidad.trim() || !nombreFuente.trim()) {
          toast.error("La entidad y el nombre de la fuente son obligatorios.");
          setGuardando(false);
          return;
        }

        const codigoGenerado = codigo.trim() || `FTE-${Date.now().toString().slice(-4)}`;
        const varsArray = variablesTexto
          .split(/[\n,]+/)
          .map((v) => v.trim())
          .filter(Boolean);

        const nueva = await agregarFuente({
          codigo: codigoGenerado.toUpperCase(),
          entidad: entidad.trim(),
          nombreFuente: nombreFuente.trim(),
          tipo,
          ambito,
          dimensionSeguridad,
          periodicidad,
          radicadoSolicitud: radicado.trim() || undefined,
          fechaSolicitud: fechaSolicitud || undefined,
          fechaLimiteRespuesta: fechaLimite || undefined,
          estadoEntrega,
          variablesSolicitadas: varsArray.length > 0 ? varsArray : ["Datos estadísticos del sector"],
          datosEntregadosResumen: datosResumen.trim() || undefined,
          archivoAdjuntoUrl: archivoUrl.trim() || undefined,
          responsableContacto: contactoNombre.trim()
            ? {
                nombre: contactoNombre.trim(),
                cargo: contactoCargo.trim(),
                email: contactoEmail.trim(),
                telefono: contactoTelefono.trim() || undefined,
              }
            : undefined,
          observacionesCalidad: observaciones.trim() || undefined,
        });

        toast.success(`Fuente ${nueva.codigo} radicada exitosamente`);
        closeTop();
      } else {
        await actualizarFuente(fuente!.id, {
          radicadoSolicitud: radicado.trim() || undefined,
          fechaSolicitud: fechaSolicitud || undefined,
          fechaLimiteRespuesta: fechaLimite || undefined,
          estadoEntrega,
          datosEntregadosResumen: datosResumen.trim() || undefined,
          archivoAdjuntoUrl: archivoUrl.trim() || undefined,
          observacionesCalidad: observaciones.trim() || undefined,
          responsableContacto: contactoNombre.trim()
            ? {
                nombre: contactoNombre.trim(),
                cargo: contactoCargo.trim(),
                email: contactoEmail.trim(),
                telefono: contactoTelefono.trim() || undefined,
              }
            : fuente!.responsableContacto,
        });

        toast.success(`Fuente ${fuente!.codigo} actualizada con éxito`);
        closeTop();
      }
    } catch (_err) {
      toast.error(esCreacion ? "Error al radicar la fuente" : "Error al actualizar la fuente", {
        description: "No se pudo sincronizar la solicitud con el servidor.",
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <PanelShell
      entryKey={entryKey}
      crumbs={[
        { label: "Fuentes" },
        { label: esCreacion ? "Radicar Fuente" : (fuente?.codigo || "Editar") },
      ]}
      kicker={esCreacion ? "Gestión Institucional de Fuentes · Radicación" : "Gestión de Información · Trazabilidad"}
      title={esCreacion ? "Radicar Fuente de Información" : `${fuente!.codigo} · ${fuente!.nombreFuente}`}
      subtitle={
        esCreacion
          ? "Registro institucional de solicitud oficial de información según Ley 1757 de 2015."
          : `Entidad responsable: ${fuente!.entidad}`
      }
      onClose={closeTop}
      onCloseToKey={closeTop}
    >
      <form onSubmit={handleSubmit} className="space-y-6 p-5 sm:p-6">
        {!tienePermisoEscritura && (
          <div className="flex items-center gap-3 rounded-xl border border-warning/20 bg-warning-soft p-4 text-xs text-warning">
            <Lock className="size-4 shrink-0" aria-hidden="true" />
            <div>
              <strong className="block font-semibold">Modo solo lectura</strong>
              <span>
                Tu rol actual ({sesion?.rol ?? "auditor"}) no dispone de permisos de
                escritura en el catálogo de fuentes. Los campos se encuentran bloqueados.
              </span>
            </div>
          </div>
        )}

        {/* Datos Principales (Modo Creación) o Ficha Técnica (Modo Edición) */}
        {esCreacion ? (
          <section className="space-y-4 rounded-xl border border-border bg-surface-2 p-4">
            <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                <PlusCircle className="size-3.5 text-ember" aria-hidden="true" />
                Definición y Clasificación de la Fuente
              </span>
              <Badge variant="outline" className="text-2xs font-semibold">
                Nueva Radicación
              </Badge>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Entidad Solicitada" required>
                {(field) => (
                  <Input
                    {...field}
                    value={entidad}
                    onChange={(e) => setEntidad(e.target.value)}
                    placeholder="ej. Distriseguridad / Policía Nacional"
                    disabled={!tienePermisoEscritura}
                    required
                  />
                )}
              </FormField>

              <FormField label="Nombre de la Fuente / Registro" required>
                {(field) => (
                  <Input
                    {...field}
                    value={nombreFuente}
                    onChange={(e) => setNombreFuente(e.target.value)}
                    placeholder="ej. Sistema SIEDCO / Cifras de convivencia"
                    disabled={!tienePermisoEscritura}
                    required
                  />
                )}
              </FormField>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label="Código Oficial (Opcional)">
                {(field) => (
                  <Input
                    {...field}
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    placeholder="ej. FTE-DIS-09"
                    disabled={!tienePermisoEscritura}
                  />
                )}
              </FormField>

              <FormField label="Tipo de Fuente">
                {(field) => (
                  <Select
                    value={tipo}
                    onValueChange={(val) => setTipo(val as TipoFuente)}
                    disabled={!tienePermisoEscritura}
                  >
                    <SelectTrigger {...field}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primaria">Primaria (Directa)</SelectItem>
                      <SelectItem value="secundaria">Secundaria (Indirecta)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </FormField>

              <FormField label="Ámbito Territorial">
                {(field) => (
                  <Select
                    value={ambito}
                    onValueChange={(val) => setAmbito(val as AmbitoFuente)}
                    disabled={!tienePermisoEscritura}
                  >
                    <SelectTrigger {...field}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local">Local (Cartagena)</SelectItem>
                      <SelectItem value="nacional">Nacional</SelectItem>
                      <SelectItem value="internacional">Internacional</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </FormField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Dimensión de Seguridad Humana ONU">
                {(field) => (
                  <Select
                    value={dimensionSeguridad}
                    onValueChange={(val) => setDimensionSeguridad(val)}
                    disabled={!tienePermisoEscritura}
                  >
                    <SelectTrigger {...field}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personal">Personal (Vida e Integridad)</SelectItem>
                      <SelectItem value="comunitaria">Comunitaria (Convivencia y Tejido)</SelectItem>
                      <SelectItem value="ambiental">Ambiental (Recursos y Hábitat)</SelectItem>
                      <SelectItem value="economica">Económica (Ingreso y Empleo)</SelectItem>
                      <SelectItem value="alimentaria">Alimentaria (Soberanía)</SelectItem>
                      <SelectItem value="salud">Salud (Acceso y Bienestar)</SelectItem>
                      <SelectItem value="politica">Política (Derechos y Libertades)</SelectItem>
                      <SelectItem value="crisis">Crisis (Emergencias y Riesgos)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </FormField>

              <FormField label="Periodicidad Solicitada">
                {(field) => (
                  <Select
                    value={periodicidad}
                    onValueChange={(val) => setPeriodicidad(val as typeof periodicidad)}
                    disabled={!tienePermisoEscritura}
                  >
                    <SelectTrigger {...field}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mensual">Mensual</SelectItem>
                      <SelectItem value="trimestral">Trimestral</SelectItem>
                      <SelectItem value="semestral">Semestral</SelectItem>
                      <SelectItem value="anual">Anual</SelectItem>
                      <SelectItem value="por_demanda">Por Demanda</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </FormField>
            </div>

            <FormField
              label="Variables Requeridas para la Política Pública"
              description="Escribe una variable por línea o separadas por comas."
            >
              {(field) => (
                <Textarea
                  {...field}
                  value={variablesTexto}
                  onChange={(e) => setVariablesTexto(e.target.value)}
                  placeholder="ej. Homicidios mensuales por cuadrante&#10;Hurtos a comercio&#10;Casos de violencia intrafamiliar"
                  rows={3}
                  disabled={!tienePermisoEscritura}
                />
              )}
            </FormField>
          </section>
        ) : (
          <section className="space-y-3 rounded-xl border border-border bg-surface-2 p-4">
            <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Ficha Técnica de Radicación
              </span>
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="capitalize text-xs">
                  {fuente!.ambito}
                </Badge>
                <Badge variant="secondary" className="capitalize text-xs">
                  {fuente!.tipo}
                </Badge>
              </div>
            </div>

            <div className="grid gap-2 text-xs sm:grid-cols-2">
              <div>
                <span className="text-text-secondary">Dimensión de Seguridad:</span>{" "}
                <strong className="capitalize text-text-primary">
                  {fuente!.dimensionSeguridad}
                </strong>
              </div>
              <div>
                <span className="text-text-secondary">Periodicidad:</span>{" "}
                <strong className="capitalize text-text-primary">
                  {fuente!.periodicidad.replace("_", " ")}
                </strong>
              </div>
            </div>

            <div className="pt-1">
              <span className="text-xs font-medium text-text-secondary">
                Variables Requeridas para la Política:
              </span>
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs text-text-primary">
                {fuente!.variablesSolicitadas.map((v, i) => (
                  <li key={i}>{v}</li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Control de Radicación y Tiempos */}
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <FileText className="size-4 text-ember" aria-hidden="true" />
            <span>Radicación Institucional y Términos</span>
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Radicado oficial de solicitud">
              {(field) => (
                <Input
                  {...field}
                  value={radicado}
                  onChange={(e) => setRadicado(e.target.value)}
                  placeholder="ej. DIST-SEC-2026-0891"
                  disabled={!tienePermisoEscritura}
                  maxLength={60}
                />
              )}
            </FormField>

            <FormField label="Estado de entrega y cumplimiento">
              {(field) => (
                <Select
                  value={estadoEntrega}
                  onValueChange={(val) => setEstadoEntrega(val as EstadoEntrega)}
                  disabled={!tienePermisoEscritura}
                >
                  <SelectTrigger {...field}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="por_solicitar">Por Solicitar</SelectItem>
                    <SelectItem value="en_termino">En Término</SelectItem>
                    <SelectItem value="entregada">Entregada</SelectItem>
                    <SelectItem value="incompleta">Incompleta</SelectItem>
                    <SelectItem value="vencida_sin_entrega">Vencida sin Entrega</SelectItem>
                    <SelectItem value="requerimiento_insistencia">
                      Requerimiento de Insistencia
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            </FormField>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Fecha de radicación">
              {(field) => (
                <Input
                  {...field}
                  type="date"
                  value={fechaSolicitud}
                  onChange={(e) => setFechaSolicitud(e.target.value)}
                  disabled={!tienePermisoEscritura}
                />
              )}
            </FormField>

            <FormField label="Fecha límite legal de respuesta">
              {(field) => (
                <Input
                  {...field}
                  type="date"
                  value={fechaLimite}
                  onChange={(e) => setFechaLimite(e.target.value)}
                  disabled={!tienePermisoEscritura}
                />
              )}
            </FormField>
          </div>
        </div>

        {/* Resumen de Datos y Enlace */}
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <Building2 className="size-4 text-ember" aria-hidden="true" />
            <span>Datos Entregados y Enlace a Repositorio</span>
          </h3>

          <FormField
            label="Resumen de datos o cortes recibidos"
            description="Detalla el alcance temporal, desagregación y formato de los datos entregados."
          >
            {(field) => (
              <Textarea
                {...field}
                value={datosResumen}
                onChange={(e) => setDatosResumen(e.target.value)}
                placeholder="ej. Serie histórica 2021-2025 y cortes mensuales a enero 2026..."
                rows={3}
                disabled={!tienePermisoEscritura}
              />
            )}
          </FormField>

          <FormField
            label="URL de recurso o archivo adjunto"
            description="Enlace directo a repositorio institucional, drive seguro o dataset distrital."
          >
            {(field) => (
              <Input
                {...field}
                type="url"
                value={archivoUrl}
                onChange={(e) => setArchivoUrl(e.target.value)}
                placeholder="https://datos.cartagena.gov.co/..."
                disabled={!tienePermisoEscritura}
              />
            )}
          </FormField>
        </div>

        {/* Contacto Institucional */}
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <User className="size-4 text-ember" aria-hidden="true" />
            <span>Contacto Institucional y Enlace</span>
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Nombre del contacto">
              {(field) => (
                <Input
                  {...field}
                  value={contactoNombre}
                  onChange={(e) => setContactoNombre(e.target.value)}
                  placeholder="Nombre y apellido"
                  disabled={!tienePermisoEscritura}
                  maxLength={100}
                />
              )}
            </FormField>

            <FormField label="Cargo / Dependencia">
              {(field) => (
                <Input
                  {...field}
                  value={contactoCargo}
                  onChange={(e) => setContactoCargo(e.target.value)}
                  placeholder="ej. Director de Telemática"
                  disabled={!tienePermisoEscritura}
                  maxLength={100}
                />
              )}
            </FormField>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Correo electrónico institucional">
              {(field) => (
                <Input
                  {...field}
                  type="email"
                  value={contactoEmail}
                  onChange={(e) => setContactoEmail(e.target.value)}
                  placeholder="contacto@entidad.gov.co"
                  disabled={!tienePermisoEscritura}
                />
              )}
            </FormField>

            <FormField label="Teléfono / Conmutador">
              {(field) => (
                <Input
                  {...field}
                  value={contactoTelefono}
                  onChange={(e) => setContactoTelefono(e.target.value)}
                  placeholder="+57 605 600..."
                  disabled={!tienePermisoEscritura}
                  maxLength={30}
                />
              )}
            </FormField>
          </div>
        </div>

        {/* Observaciones Forenses y de Calidad */}
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <ShieldCheck className="size-4 text-ember" aria-hidden="true" />
            <span>Dictamen Pericial de Calidad de la Fuente</span>
          </h3>

          <FormField
            label="Observaciones periciales de calidad y consistencia"
            description="Evaluación de fiabilidad, cobertura geográfica, sesgos muestrales o requerimientos pendientes."
          >
            {(field) => (
              <Textarea
                {...field}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Indica si la fuente cumple con los criterios de precisión pericial para alimentar los indicadores de política..."
                rows={3}
                disabled={!tienePermisoEscritura}
              />
            )}
          </FormField>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
          <Button variant="outline" type="button" onClick={closeTop}>
            {tienePermisoEscritura ? "Cancelar" : "Cerrar"}
          </Button>
          {tienePermisoEscritura && (
            <Button
              variant="default"
              type="submit"
              loading={guardando}
              loadingLabel={esCreacion ? "Radicando..." : "Guardando…"}
              className="bg-ember text-text-inverse hover:bg-ember/90"
            >
              {esCreacion ? "Radicar Fuente Institucional" : "Guardar Cambios"}
            </Button>
          )}
        </div>
      </form>
    </PanelShell>
  );
}
