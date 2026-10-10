"use client";

import {useState, useEffect, type FormEvent} from "react";
import {toast} from "sonner";
import {
  Coins,
  DollarSign,
  Calendar,
  CheckCircle2,
  ShieldAlert,
  Lock,
  Building,
  Tag,
  AlertTriangle,
  Loader2,
  FileDown
} from "lucide-react";
import {PanelShell} from "@/core/panels/panel-shell";
import {usePanels} from "@/core/panels/panel-store";
import type {PanelComponentProps} from "@/app/_composition/panel-registry";
import {Button} from "@/shared/ui/button";
import {FormField} from "@/shared/ui/form-field";
import {Input} from "@/shared/ui/input";
import {Textarea} from "@/shared/ui/textarea";
import {Badge} from "@/shared/ui/badge";
import {Label} from "@/shared/ui/label";
import {Switch} from "@/shared/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/shared/ui/select";
import {useSesionStore} from "@/features/sesion/state/session-store";
import {puedeEditar} from "@/features/plataforma/models/acceso";
import {useAlternativasStore} from "../state/alternativas-store";
import {
  listarFuentesFinanciacion,
  crearAsignacionPresupuestal
} from "../services/presupuesto-api";
import type {FuenteFinanciacion, TipoVigenciaFutura} from "../models/presupuesto";

export function AsignacionPresupuestalPanel({
  entryKey,
  props,
}: PanelComponentProps<"asignacion-presupuestal">) {
  const { closeTop } = usePanels();
  const sesion = useSesionStore((s) => s.sesion);
  const puedeEditarUsuario = puedeEditar(sesion, "alternativas");
  const esSoloLectura = props.soloLectura ?? !puedeEditarUsuario;

  const alternativas = useAlternativasStore((s) => s.alternativas);
  const [fuentes, setFuentes] = useState<FuenteFinanciacion[]>([]);
  const [cargandoFuentes, setCargandoFuentes] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // Form State
  const [alternativaSeleccionadaId, setAlternativaSeleccionadaId] = useState<string>(
    props.alternativaId ?? alternativas[0]?.id ?? ""
  );
  const [fuenteSeleccionadaId, setFuenteSeleccionadaId] = useState<string>("");
  const [monto, setMonto] = useState<number>(1000000000);
  const [anioVigencia, setAnioVigencia] = useState<number>(2026);
  const [esVigenciaFutura, setEsVigenciaFutura] = useState<boolean>(false);
  const [tipoVigenciaFutura, setTipoVigenciaFutura] = useState<TipoVigenciaFutura>("Ordinaria");
  const [codigoBpin, setCodigoBpin] = useState<string>(
    `BPIN-2026-CTG-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [justificacion, setJustificacion] = useState<string>("");

  useEffect(() => {
    async function cargar() {
      setCargandoFuentes(true);
      try {
        const datosFuentes = await listarFuentesFinanciacion();
        setFuentes(datosFuentes);
        if (datosFuentes.length > 0 && !fuenteSeleccionadaId) {
          setFuenteSeleccionadaId(datosFuentes[0].id);
        }
      } catch {
        toast.error("Error al cargar las fuentes de financiación.");
      } finally {
        setCargandoFuentes(false);
      }
    }
    cargar();
  }, [fuenteSeleccionadaId]);

  // Si cambia anioVigencia > 2026 se activa automáticamente la sugerencia de vigencia futura
  useEffect(() => {
    if (anioVigencia > 2026) {
      setEsVigenciaFutura(true);
      if (anioVigencia >= 2028) {
        setTipoVigenciaFutura("Excepcional");
      }
    } else {
      setEsVigenciaFutura(false);
      setTipoVigenciaFutura("Ordinaria");
    }
  }, [anioVigencia]);

  const alternativaActual = alternativas.find((a) => a.id === alternativaSeleccionadaId);
  const fuenteActual = fuentes.find((f) => f.id === fuenteSeleccionadaId);

  const formatoMoneda = (val: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (esSoloLectura) return;

    if (!fuenteSeleccionadaId) {
      toast.error("Seleccione una fuente de financiación válida.");
      return;
    }

    if (monto <= 0) {
      toast.error("El monto de la asignación debe ser superior a cero.");
      return;
    }

    if (!justificacion.trim()) {
      toast.error("Debe ingresar una justificación técnica vinculante.");
      return;
    }

    setGuardando(true);
    try {
      await crearAsignacionPresupuestal({
        fuente_financiacion_id: fuenteSeleccionadaId,
        monto_estimado: monto,
        anio_vigencia: anioVigencia,
        es_vigencia_futura: esVigenciaFutura,
        tipo_vigencia_futura: esVigenciaFutura ? tipoVigenciaFutura : null,
        codigo_bpin: codigoBpin.trim() || null,
        justificacion: justificacion.trim(),
        metadatos: {
          alternativa_id: alternativaActual?.id,
          alternativa_codigo: alternativaActual?.codigo,
          alternativa_nombre: alternativaActual?.nombre,
          registrado_por: sesion?.usuario ?? "sistema",
          fecha_registro: new Date().toISOString(),
        },
      });

      toast.success(
        `Asignación formalizada por ${formatoMoneda(monto)} para ${alternativaActual?.codigo ?? "proyecto de solución"}.`
      );

      props.onAsignacionGuardada?.();
      closeTop();
    } catch {
      toast.error("Error al registrar la asignación presupuestal.");
    } finally {
      setGuardando(false);
    }
  };

  const handleExportarJson = () => {
    const payload = {
      alternativa: {
        id: alternativaActual?.id,
        codigo: alternativaActual?.codigo,
        nombre: alternativaActual?.nombre,
      },
      fuente: {
        id: fuenteActual?.id,
        codigo: fuenteActual?.codigo,
        nombre: fuenteActual?.nombre,
        base_legal: fuenteActual?.base_legal,
      },
      asignacion: {
        monto_estimado: monto,
        anio_vigencia: anioVigencia,
        es_vigencia_futura: esVigenciaFutura,
        tipo_vigencia_futura: esVigenciaFutura ? tipoVigenciaFutura : null,
        codigo_bpin: codigoBpin,
        justificacion,
      },
      fecha_dictamen: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `asignacion-presupuestal-${codigoBpin || "preliminar"}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Expediente de asignación presupuestal exportado.");
  };

  return (
    <PanelShell
      entryKey={entryKey}
      crumbs={[{ label: "Banco de Alternativas de Solución" }, { label: "Costeo Presupuestal" }]}
      kicker="Formulación Estratégica · Plan Financiero"
      title="Asignación Presupuestal y Costeo de Alternativas"
      subtitle="Formalización del financiamiento plurianual con fuentes oficiales distritales y control fiscal de vigencias futuras"
      onClose={closeTop}
      onCloseToKey={closeTop}
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Banner de solo lectura para auditor forense */}
        {esSoloLectura && (
          <div className="flex items-start gap-3 p-3.5 rounded-lg border border-border bg-surface-2">
            <Lock className="size-4 text-warning shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1">
              <p className="text-xs font-semibold text-text-primary">
                Modo de Supervisión Técnica Forense
              </p>
              <p className="text-xs text-text-secondary">
                Este formulario se encuentra inmutable para su perfil. Puede auditar los montos, BPIN y fuentes asignadas con fines periciales y de trazabilidad fiscal.
              </p>
            </div>
          </div>
        )}

        {/* Resumen de la Alternativa Vinculada */}
        <div className="rounded-xl border border-border bg-surface-1 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
              <Building className="size-3.5 text-ember" aria-hidden="true" />
              Iniciativa a Financiar
            </span>
            {alternativaActual && (
              <Badge variant="outline" className="border-border text-text-secondary font-mono text-[10px]">
                {alternativaActual.codigo}
              </Badge>
            )}
          </div>

          <FormField label="Alternativa de Solución" required>
            {({ id }) => (
              <Select
                value={alternativaSeleccionadaId}
                onValueChange={setAlternativaSeleccionadaId}
                disabled={esSoloLectura}
              >
                <SelectTrigger id={id} className="w-full bg-surface-2 border-border text-xs">
                  <SelectValue placeholder="Seleccione una alternativa..." />
                </SelectTrigger>
                <SelectContent>
                  {alternativas.map((alt) => (
                    <SelectItem key={alt.id} value={alt.id} className="text-xs">
                      {alt.codigo} — {alt.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>

          {alternativaActual && (
            <div className="p-3 rounded-lg border border-border bg-surface-2/60 text-xs space-y-1.5">
              <p className="font-medium text-text-primary">{alternativaActual.nombre}</p>
              <p className="text-text-muted line-clamp-2">{alternativaActual.descripcion}</p>
              <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-text-secondary">
                <span>Costo estimado total: <strong className="text-text-primary">{formatoMoneda(alternativaActual.costo_estimado_cop)}</strong></span>
                <span>•</span>
                <span>Horizonte: <strong className="text-text-primary">{alternativaActual.horizonte_anios} años</strong></span>
                <span>•</span>
                <span>Territorio: <strong className="text-text-primary">{alternativaActual.territorio_cobertura}</strong></span>
              </div>
            </div>
          )}
        </div>

        {/* Parámetros de la Asignación Presupuestal */}
        <div className="rounded-xl border border-border bg-surface-1 p-4 space-y-4">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
            <Coins className="size-3.5 text-ember" aria-hidden="true" />
            Parámetros Presupuestales y Fuentes Oficiales
          </span>

          <FormField label="Fuente de Financiación Distrital" required>
            {({ id }) => (
              <Select
                value={fuenteSeleccionadaId}
                onValueChange={setFuenteSeleccionadaId}
                disabled={esSoloLectura || cargandoFuentes}
              >
                <SelectTrigger id={id} className="w-full bg-surface-2 border-border text-xs">
                  <SelectValue placeholder="Seleccione una fuente de financiación..." />
                </SelectTrigger>
                <SelectContent>
                  {fuentes.map((f) => (
                    <SelectItem key={f.id} value={f.id} className="text-xs">
                      [{f.codigo}] {f.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>

          {fuenteActual && (
            <div className="p-3 rounded-lg border border-border bg-surface-2/60 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-text-primary">{fuenteActual.nombre}</span>
                <Badge variant="outline" className="text-[10px] border-border text-accent font-mono">
                  {fuenteActual.codigo}
                </Badge>
              </div>
              <p className="text-[11px] text-text-muted">
                <strong>Base Legal:</strong> {fuenteActual.base_legal}
              </p>
              {fuenteActual.descripcion && (
                <p className="text-[11px] text-text-secondary">{fuenteActual.descripcion}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Monto a Asignar (COP)" required>
              {({ id }) => (
                <div className="space-y-1">
                  <div className="relative">
                    <DollarSign className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden="true" />
                    <Input
                      id={id}
                      type="number"
                      min={1}
                      step={1000000}
                      value={monto}
                      onChange={(e) => setMonto(Number(e.target.value))}
                      disabled={esSoloLectura}
                      className="pl-8 bg-surface-2 border-border font-mono text-xs"
                    />
                  </div>
                  <p className="text-[11px] text-accent font-semibold">
                    {formatoMoneda(monto)}
                  </p>
                </div>
              )}
            </FormField>

            <FormField label="Año de Vigencia Fiscal" required>
              {({ id }) => (
                <div className="relative">
                  <Calendar className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden="true" />
                  <Select
                    value={String(anioVigencia)}
                    onValueChange={(val) => setAnioVigencia(Number(val))}
                    disabled={esSoloLectura}
                  >
                    <SelectTrigger id={id} className="w-full pl-8 bg-surface-2 border-border text-xs">
                      <SelectValue placeholder="Seleccione año..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2026" className="text-xs">2026 (Vigencia Actual)</SelectItem>
                      <SelectItem value="2027" className="text-xs">2027</SelectItem>
                      <SelectItem value="2028" className="text-xs">2028</SelectItem>
                      <SelectItem value="2029" className="text-xs">2029</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </FormField>
          </div>

          <FormField label="Código BPIN Distrital / Nacional (Preliminar)">
            {({ id }) => (
              <div className="relative">
                <Tag className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden="true" />
                <Input
                  id={id}
                  type="text"
                  placeholder="BPIN-2026-CTG-XXXX"
                  value={codigoBpin}
                  onChange={(e) => setCodigoBpin(e.target.value)}
                  disabled={esSoloLectura}
                  className="pl-8 bg-surface-2 border-border font-mono text-xs"
                />
              </div>
            )}
          </FormField>
        </div>

        {/* Control Fiscal de Vigencias Futuras (Leyes 819/03 y 1483/11) */}
        <div className="rounded-xl border border-border bg-surface-1 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                <ShieldAlert className="size-3.5 text-ember" aria-hidden="true" />
                ¿Constituye Vigencia Futura?
              </Label>
              <p className="text-[11px] text-text-muted">
                Marque si el compromiso presupuestal afectará vigencias fiscales posteriores a 2026.
              </p>
            </div>
            <Switch
              checked={esVigenciaFutura}
              onCheckedChange={setEsVigenciaFutura}
              disabled={esSoloLectura}
            />
          </div>

          {esVigenciaFutura && (
            <div className="p-3.5 rounded-lg border border-border bg-surface-2 space-y-3 animate-in fade-in-50 duration-200">
              <FormField label="Tipo de Vigencia Futura" required>
                {({ id }) => (
                  <Select
                    value={tipoVigenciaFutura}
                    onValueChange={(val) => setTipoVigenciaFutura(val as TipoVigenciaFutura)}
                    disabled={esSoloLectura}
                  >
                    <SelectTrigger id={id} className="w-full bg-surface-1 border-border text-xs">
                      <SelectValue placeholder="Seleccione modalidad..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ordinaria" className="text-xs">
                        Vigencia Futura Ordinaria (Ley 819 de 2003 — Dentro del período)
                      </SelectItem>
                      <SelectItem value="Excepcional" className="text-xs">
                        Vigencia Futura Excepcional (Ley 1483 de 2011 — Trasciende el período)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </FormField>

              {tipoVigenciaFutura === "Excepcional" ? (
                <div className="flex items-start gap-2.5 p-3 rounded-lg border border-border bg-surface-1 text-xs">
                  <AlertTriangle className="size-4 text-warning shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="space-y-1 text-text-secondary text-[11px]">
                    <span className="font-semibold text-text-primary block">
                      Requisito Vinculante: Autorización Previa del Concejo Distrital
                    </span>
                    Conforme a la Ley 1483 de 2011, las vigencias futuras excepcionales en Cartagena exigen declaratoria previa de importancia estratégica por el CONFIS distrital y aprobación formal mediante Acuerdo del Concejo Distrital de Cartagena.
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2.5 p-3 rounded-lg border border-border bg-surface-1 text-xs">
                  <CheckCircle2 className="size-4 text-success shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-[11px] text-text-secondary">
                    Vigencia dentro del cuatrienio gubernamental amparada por el Marco Fiscal de Mediano Plazo (MFMP) distrital.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Justificación Técnica Presupuestal */}
        <div className="rounded-xl border border-border bg-surface-1 p-4 space-y-3">
          <FormField label="Justificación Técnica y Destinación del Gasto" required>
            {({ id }) => (
              <Textarea
                id={id}
                rows={3}
                placeholder="Describa el objeto de la inversión, componentes a financiar, articulación con el árbol de objetivos y justificación conforme a la regla fiscal..."
                value={justificacion}
                onChange={(e) => setJustificacion(e.target.value)}
                disabled={esSoloLectura}
                className="bg-surface-2 border-border text-xs leading-relaxed"
              />
            )}
          </FormField>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportarJson}
            className="h-9 px-3 text-xs gap-1.5"
          >
            <FileDown className="size-3.5" aria-hidden="true" />
            <span>Exportar JSON</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={closeTop}
            className="h-9 px-4 text-xs"
          >
            Cancelar
          </Button>

          {!esSoloLectura && (
            <Button
              type="submit"
              size="sm"
              disabled={guardando}
              className="h-9 px-4 text-xs gap-1.5 bg-ember hover:bg-ember/90 text-text-inverse font-semibold"
            >
              {guardando ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  <span>Formalizando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-3.5" aria-hidden="true" />
                  <span>Formalizar Asignación Presupuestal</span>
                </>
              )}
            </Button>
          )}
        </div>
      </form>
    </PanelShell>
  );
}
