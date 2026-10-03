"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  Lightbulb,
  DollarSign,
  ShieldAlert,
  Building,
  MapPin,
  Clock,
  Users,
  Target,
  FileDown,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { PanelShell } from "@/core/panels/panel-shell";
import { usePanels } from "@/core/panels/panel-store";
import type { PanelComponentProps } from "@/app/_composition/panel-registry";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Badge } from "@/shared/ui/badge";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { useSesionStore } from "@/features/sesion/state/session-store";
import { puedeEditar } from "@/features/plataforma/models/acceso";
import type {
  EstadoAlternativa,
  SectorMGA,
} from "../models/alternativa";
import {
  ESTADOS_ALTERNATIVA,
  SECTORES_MGA,
  LINEAS_ESTRATEGICAS_MAP,
  DIMENSIONES_ONU_MAP,
  FUENTES_FINANCIACION_OFICIALES,
} from "../models/alternativa";
import { useAlternativasStore } from "../state/alternativas-store";

export function AlternativaEditorPanel({
  entryKey,
  props,
}: PanelComponentProps<"alternativa-editor">) {
  const { closeTop } = usePanels();
  const sesion = useSesionStore((s) => s.sesion);
  const alternativaId = props.alternativaId;

  const alternativa = useAlternativasStore((s) =>
    alternativaId ? s.getById(alternativaId) : undefined
  );
  const agregarAlternativa = useAlternativasStore((s) => s.agregarAlternativa);
  const actualizarAlternativa = useAlternativasStore((s) => s.actualizarAlternativa);

  const esModoEdicion = !!alternativa;
  const esAuditor = sesion?.rol === "auditor_forense";
  const tienePermisoEscritura =
    puedeEditar(sesion, "alternativas") && !props.soloLectura && !esAuditor;

  // Estados del formulario
  const [codigo, setCodigo] = useState(
    alternativa?.codigo ?? `ALT-CTG-${Date.now().toString().slice(-4)}`
  );
  const [nombre, setNombre] = useState(alternativa?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(alternativa?.descripcion ?? "");
  const [sector, setSector] = useState<SectorMGA>(
    alternativa?.sector ?? "seguridad_convivencia"
  );
  const [linea, setLinea] = useState<string>(
    alternativa?.linea_estrategica_codigo ?? "LE-01"
  );
  const [dimension, setDimension] = useState<string>(
    alternativa?.dimension_id ?? "personal"
  );
  const [objetivoMGA, setObjetivoMGA] = useState(
    alternativa?.objetivo_central_mga ?? ""
  );
  const [territorio, setTerritorio] = useState(
    alternativa?.territorio_cobertura ?? ""
  );
  const [poblacion, setPoblacion] = useState<number>(
    alternativa?.poblacion_objetivo_estimada ?? 5000
  );
  const [costoCop, setCostoCop] = useState<number>(
    alternativa?.costo_estimado_cop ?? 1000000000
  );
  const [horizonteAnios, setHorizonteAnios] = useState<number>(
    alternativa?.horizonte_anios ?? 4
  );
  const [estado, setEstado] = useState<EstadoAlternativa>(
    alternativa?.estado ?? "en_formulacion"
  );
  const [requiereConsultaPrevia, setRequiereConsultaPrevia] = useState<boolean>(
    alternativa?.requiere_consulta_previa ?? false
  );
  const [fuentes, setFuentes] = useState<string[]>(
    alternativa?.fuentes_financiacion_sugeridas ?? ["FONSET"]
  );

  const toggleFuente = (fuente: string) => {
    if (!tienePermisoEscritura) return;
    setFuentes((prev) =>
      prev.includes(fuente) ? prev.filter((f) => f !== fuente) : [...prev, fuente]
    );
  };

  const handleExportarJson = () => {
    const payload = alternativa ?? {
      codigo,
      nombre,
      descripcion,
      sector,
      linea_estrategica_codigo: linea,
      dimension_id: dimension,
      objetivo_central_mga: objetivoMGA,
      territorio_cobertura: territorio,
      poblacion_objetivo_estimada: poblacion,
      costo_estimado_cop: costoCop,
      horizonte_anios: horizonteAnios,
      fuentes_financiacion_sugeridas: fuentes,
      estado,
      requiere_consulta_previa: requiereConsultaPrevia,
      fecha_exportacion: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `alternativa_${codigo}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Ficha técnica exportada a JSON correctamente.");
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!tienePermisoEscritura) return;

    if (!nombre.trim()) {
      toast.error("El nombre de la alternativa es obligatorio.");
      return;
    }
    if (!codigo.trim()) {
      toast.error("El código MGA de la alternativa es obligatorio.");
      return;
    }
    if (!objetivoMGA.trim()) {
      toast.error("El objetivo central MGA vinculado es obligatorio.");
      return;
    }
    if (!territorio.trim()) {
      toast.error("El territorio de cobertura es obligatorio.");
      return;
    }

    if (esModoEdicion && alternativaId) {
      actualizarAlternativa(alternativaId, {
        codigo: codigo.trim().toUpperCase(),
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        sector,
        linea_estrategica_codigo: linea,
        dimension_id: dimension,
        objetivo_central_mga: objetivoMGA.trim(),
        territorio_cobertura: territorio.trim(),
        poblacion_objetivo_estimada: Number(poblacion),
        costo_estimado_cop: Number(costoCop),
        horizonte_anios: Number(horizonteAnios),
        fuentes_financiacion_sugeridas: fuentes,
        estado,
        requiere_consulta_previa: requiereConsultaPrevia,
      });
      toast.success(`Alternativa ${codigo} actualizada correctamente.`);
    } else {
      agregarAlternativa({
        codigo: codigo.trim().toUpperCase(),
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        sector,
        linea_estrategica_codigo: linea,
        dimension_id: dimension,
        objetivo_central_mga: objetivoMGA.trim(),
        territorio_cobertura: territorio.trim(),
        poblacion_objetivo_estimada: Number(poblacion),
        costo_estimado_cop: Number(costoCop),
        horizonte_anios: Number(horizonteAnios),
        fuentes_financiacion_sugeridas: fuentes,
        estado,
        requiere_consulta_previa: requiereConsultaPrevia,
      });
      toast.success(`Alternativa ${codigo} registrada en el Banco Distrital.`);
    }

    closeTop();
  };

  return (
    <PanelShell
      entryKey={entryKey}
      crumbs={[{ label: "Banco de Alternativas MGA" }]}
      kicker="Formulación Estratégica · MGA DNP"
      title={
        esModoEdicion
          ? `Ficha Técnica · ${alternativa.codigo}`
          : "Nueva Alternativa de Solución MGA"
      }
      subtitle="Banco Distrital de Proyectos · Metodología General Ajustada (DNP)"
      onClose={closeTop}
      onCloseToKey={closeTop}
    >
      <form onSubmit={handleSubmit} className="space-y-6 p-4">
        {/* Aviso de sólo lectura para auditor o sin permisos */}
        {!tienePermisoEscritura && (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 p-3 text-xs text-text-muted">
            <Lock className="h-4 w-4 shrink-0 text-text-muted" />
            <span>
              {esAuditor
                ? "Modo de supervisión forense (EAF). La ficha técnica se encuentra en modo solo lectura para garantizar la trazabilidad inmutable."
                : "Usted no posee permisos de edición de alternativas. Vista de consulta técnica."}
            </span>
          </div>
        )}

        {/* Identificación de la Alternativa */}
        <div className="space-y-4 rounded-xl border border-border bg-surface-1 p-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              <Lightbulb className="h-4 w-4 text-accent" />
              Identificación y Formulación MGA
            </h4>
            <span className="font-mono text-xs text-text-muted">
              {codigo || "ALT-..."}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Código Oficial MGA" required>
              {({ id }) => (
                <Input
                  id={id}
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  disabled={!tienePermisoEscritura}
                  placeholder="ej. ALT-ESCNNA-01"
                  className="font-mono text-xs uppercase"
                />
              )}
            </FormField>

            <FormField label="Sector MGA" required>
              {({ id }) => (
                <Select
                  value={sector}
                  onValueChange={(val) => setSector(val as SectorMGA)}
                  disabled={!tienePermisoEscritura}
                >
                  <SelectTrigger id={id} className="text-xs">
                    <SelectValue placeholder="Seleccionar sector" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SECTORES_MGA).map(([key, info]) => (
                      <SelectItem key={key} value={key} className="text-xs">
                        {info.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>

            <FormField label="Estado de Viabilidad" required>
              {({ id }) => (
                <Select
                  value={estado}
                  onValueChange={(val) => setEstado(val as EstadoAlternativa)}
                  disabled={!tienePermisoEscritura}
                >
                  <SelectTrigger id={id} className="text-xs">
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ESTADOS_ALTERNATIVA).map(([key, info]) => (
                      <SelectItem key={key} value={key} className="text-xs">
                        {info.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>
          </div>

          <FormField label="Nombre de la Alternativa" required>
            {({ id }) => (
              <Input
                id={id}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                disabled={!tienePermisoEscritura}
                placeholder="ej. Ruta Distrital Segura contra la ESCNNA"
                className="text-sm font-medium"
              />
            )}
          </FormField>

          <FormField label="Descripción Técnica y Alcance">
            {({ id }) => (
              <Textarea
                id={id}
                rows={3}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                disabled={!tienePermisoEscritura}
                placeholder="Describa el alcance de la alternativa, los componentes operativos y las soluciones planteadas..."
                className="text-xs"
              />
            )}
          </FormField>
        </div>

        {/* Articulación con Árbol MGA y Dimensiones */}
        <div className="space-y-4 rounded-xl border border-border bg-surface-1 p-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              <Target className="h-4 w-4 text-ember" />
              Articulación con Plan Distrital y Árbol de Objetivos
            </h4>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Línea Estratégica Distrital" required>
              {({ id }) => (
                <Select
                  value={linea}
                  onValueChange={setLinea}
                  disabled={!tienePermisoEscritura}
                >
                  <SelectTrigger id={id} className="text-xs">
                    <SelectValue placeholder="Línea estratégica" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LINEAS_ESTRATEGICAS_MAP).map(([cod, label]) => (
                      <SelectItem key={cod} value={cod} className="text-xs">
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>

            <FormField label="Dimensión de Seguridad Humana" required>
              {({ id }) => (
                <Select
                  value={dimension}
                  onValueChange={setDimension}
                  disabled={!tienePermisoEscritura}
                >
                  <SelectTrigger id={id} className="text-xs">
                    <SelectValue placeholder="Dimensión ONU" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DIMENSIONES_ONU_MAP).map(([dimId, label]) => (
                      <SelectItem key={dimId} value={dimId} className="text-xs">
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>
          </div>

          <FormField
            label="Objetivo Central del Árbol MGA Vinculado"
            required
          >
            {({ id }) => (
              <Textarea
                id={id}
                rows={2}
                value={objetivoMGA}
                onChange={(e) => setObjetivoMGA(e.target.value)}
                disabled={!tienePermisoEscritura}
                placeholder="ej. Erradicar la explotación sexual comercial de niñas, niños y adolescentes en entornos turísticos..."
                className="text-xs"
              />
            )}
          </FormField>
        </div>

        {/* Cobertura Territorial y Salvaguarda Étnica */}
        <div className="space-y-4 rounded-xl border border-border bg-surface-1 p-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              <MapPin className="h-4 w-4 text-warning" />
              Focalización Territorial y Salvaguarda Étnica
            </h4>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Territorio de Cobertura" required>
              {({ id }) => (
                <Input
                  id={id}
                  value={territorio}
                  onChange={(e) => setTerritorio(e.target.value)}
                  disabled={!tienePermisoEscritura}
                  placeholder="ej. Centro Histórico (UCG 1), Bocagrande, Barú..."
                  className="text-xs"
                />
              )}
            </FormField>

            <FormField label="Población Objetivo Estimada" required>
              {({ id }) => (
                <Input
                  id={id}
                  type="number"
                  min={0}
                  value={poblacion}
                  onChange={(e) => setPoblacion(Number(e.target.value))}
                  disabled={!tienePermisoEscritura}
                  placeholder="Número de personas beneficiarias"
                  className="text-xs"
                />
              )}
            </FormField>
          </div>

          {/* Salvaguarda Étnica Ley 70/93 */}
          <div className="rounded-lg border border-border bg-surface-2 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <Label className="flex items-center gap-2 font-semibold text-xs text-text-primary">
                  <ShieldAlert className="h-3.5 w-3.5 text-warning" />
                  Requiere Consulta Previa (Ley 70 de 1993 / OIT 169)
                </Label>
                <p className="text-[11px] text-text-muted">
                  Active si la alternativa interviene territorios colectivos de comunidades
                  negras o indígenas de Cartagena (Tierrabomba, La Boquilla, Barú, etc.).
                </p>
              </div>
              <Button
                type="button"
                variant={requiereConsultaPrevia ? "default" : "outline"}
                size="sm"
                className="shrink-0 text-xs"
                disabled={!tienePermisoEscritura}
                onClick={() => setRequiereConsultaPrevia(!requiereConsultaPrevia)}
              >
                {requiereConsultaPrevia ? "Activada (Ley 70)" : "No requiere"}
              </Button>
            </div>
          </div>
        </div>

        {/* Costeo Presupuestal y Fuentes */}
        <div className="space-y-4 rounded-xl border border-border bg-surface-1 p-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              <DollarSign className="h-4 w-4 text-success" />
              Estimación Financiera y Fuentes de Financiación
            </h4>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Costo Estimado Cuatrienio (COP)" required>
              {({ id }) => (
                <Input
                  id={id}
                  type="number"
                  step={1000000}
                  min={0}
                  value={costoCop}
                  onChange={(e) => setCostoCop(Number(e.target.value))}
                  disabled={!tienePermisoEscritura}
                  placeholder="ej. 4500000000"
                  className="font-mono text-xs"
                />
              )}
            </FormField>

            <FormField label="Horizonte de Ejecución (Años)" required>
              {({ id }) => (
                <Input
                  id={id}
                  type="number"
                  min={1}
                  max={10}
                  value={horizonteAnios}
                  onChange={(e) => setHorizonteAnios(Number(e.target.value))}
                  disabled={!tienePermisoEscritura}
                  placeholder="1 a 10 años"
                  className="text-xs"
                />
              )}
            </FormField>
          </div>

          {/* Selector de Fuentes Oficiales */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-text-primary">
              Fuentes de Financiación Autorizadas Sugeridas
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {FUENTES_FINANCIACION_OFICIALES.map((f) => {
                const seleccionada = fuentes.includes(f);
                return (
                  <Button
                    key={f}
                    type="button"
                    variant={seleccionada ? "default" : "outline"}
                    size="sm"
                    className="text-[11px] h-7 px-2.5 rounded-full"
                    disabled={!tienePermisoEscritura}
                    onClick={() => toggleFuente(f)}
                  >
                    {f}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Barra de Acciones */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={handleExportarJson}
          >
            <FileDown className="h-3.5 w-3.5" />
            <span>Exportar Ficha JSON</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={closeTop}
            >
              Cerrar
            </Button>

            {tienePermisoEscritura && (
              <Button
                type="submit"
                variant="default"
                size="sm"
                className="gap-1.5 text-xs font-medium"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>
                  {esModoEdicion ? "Guardar Cambios" : "Registrar en Banco MGA"}
                </span>
              </Button>
            )}
          </div>
        </div>
      </form>
    </PanelShell>
  );
}
