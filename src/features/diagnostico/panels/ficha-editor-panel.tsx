"use client";

import { useState, useEffect, type FormEvent } from "react";
import { toast } from "sonner";
import { Lock, FileSpreadsheet, ShieldAlert } from "lucide-react";
import { PanelShell } from "@/core/panels/panel-shell";
import { usePanels } from "@/core/panels/panel-store";
import type { PanelComponentProps } from "@/app/_composition/panel-registry";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
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
import {
  crearFichaIndicador,
  actualizarFichaIndicador,
  obtenerFichaIndicador,
} from "../services/indicadores-api";
import type {
  FichaIndicador,
  TipoIndicador,
  SentidoEsperado,
  FichaIndicadorCrearPayload,
  FichaIndicadorActualizarPayload,
} from "../models/indicador";

export function FichaEditorPanel({
  entryKey,
  props,
}: PanelComponentProps<"ficha-editor">) {
  const { closeTop } = usePanels();
  const sesion = useSesionStore((s) => s.sesion);
  const editable = puedeEditar(sesion, "diagnostico") && !props.soloLectura;

  const { fichaId, onGuardado } = props;
  const fichaInicial = (props.ficha as FichaIndicador | undefined) || null;

  const esEdicion = Boolean(fichaId || fichaInicial?.id);

  // Estados del formulario
  const [cargandoFicha, setCargandoFicha] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [codigo, setCodigo] = useState(fichaInicial?.codigo || "");
  const [nombre, setNombre] = useState(fichaInicial?.nombre || "");
  const [tipoIndicador, setTipoIndicador] = useState<TipoIndicador>(
    fichaInicial?.tipo_indicador || "resultado"
  );
  const [definicion, setDefinicion] = useState(fichaInicial?.definicion || "");
  const [metodoCalculo, setMetodoCalculo] = useState(
    fichaInicial?.metodo_calculo || ""
  );
  const [unidadMedida, setUnidadMedida] = useState(
    fichaInicial?.unidad_medida || ""
  );
  const [sentidoEsperado, setSentidoEsperado] = useState<SentidoEsperado>(
    fichaInicial?.sentido_esperado || "ascendente"
  );
  const [periodicidad, setPeriodicidad] = useState(
    fichaInicial?.periodicidad || "Anual"
  );
  const [lineaBaseValor, setLineaBaseValor] = useState(
    fichaInicial?.linea_base_valor !== undefined
      ? String(fichaInicial.linea_base_valor)
      : "0"
  );
  const [lineaBaseAnio, setLineaBaseAnio] = useState(
    fichaInicial?.linea_base_anio !== undefined
      ? String(fichaInicial.linea_base_anio)
      : "2023"
  );
  const [metaCuatrienio, setMetaCuatrienio] = useState(
    fichaInicial?.meta_cuatrienio !== undefined
      ? String(fichaInicial.meta_cuatrienio)
      : "0"
  );
  const [fuenteDatos, setFuenteDatos] = useState(
    fichaInicial?.fuente_datos || "Distrito de Cartagena"
  );
  const [responsableReporte, setResponsableReporte] = useState(
    fichaInicial?.responsable_reporte || "Secretaría del Interior"
  );

  // Cargar datos de la ficha si viene fichaId y no fichaInicial
  useEffect(() => {
    if (fichaId && !fichaInicial) {
      setCargandoFicha(true);
      obtenerFichaIndicador(fichaId)
        .then((f) => {
          setCodigo(f.codigo);
          setNombre(f.nombre);
          setTipoIndicador(f.tipo_indicador);
          setDefinicion(f.definicion);
          setMetodoCalculo(f.metodo_calculo);
          setUnidadMedida(f.unidad_medida);
          setSentidoEsperado(f.sentido_esperado);
          setPeriodicidad(f.periodicidad);
          setLineaBaseValor(String(f.linea_base_valor));
          setLineaBaseAnio(String(f.linea_base_anio));
          setMetaCuatrienio(String(f.meta_cuatrienio));
          setFuenteDatos(f.fuente_datos);
          setResponsableReporte(f.responsable_reporte);
        })
        .catch(() => {
          toast.error("No se pudo cargar la información de la ficha técnica.");
        })
        .finally(() => {
          setCargandoFicha(false);
        });
    }
  }, [fichaId, fichaInicial]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!editable) {
      toast.error("No tienes permisos para gestionar fichas técnicas de indicadores.");
      return;
    }

    if (esEdicion) {
      // Modo Edición (PATCH): solo campos permitidos
      if (!responsableReporte.trim()) {
        toast.error("El responsable del reporte es obligatorio.");
        return;
      }
      if (!fuenteDatos.trim()) {
        toast.error("La fuente oficial de datos es obligatoria.");
        return;
      }
      if (!periodicidad.trim()) {
        toast.error("La periodicidad es obligatoria.");
        return;
      }

      setGuardando(true);
      try {
        const payload: FichaIndicadorActualizarPayload = {
          responsable_reporte: responsableReporte.trim(),
          fuente_datos: fuenteDatos.trim(),
          periodicidad: periodicidad.trim(),
        };

        const targetId = fichaId || fichaInicial?.id || "";
        await actualizarFichaIndicador(targetId, payload);
        toast.success("Ficha técnica de indicador actualizada exitosamente.");
        onGuardado?.();
        closeTop();
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : "Error al actualizar la ficha técnica del indicador."
        );
      } finally {
        setGuardando(false);
      }
    } else {
      // Modo Creación (POST): validación de todos los campos
      if (!codigo.trim()) {
        toast.error("El código del indicador es obligatorio (ej. IND-RES-09).");
        return;
      }
      if (!nombre.trim()) {
        toast.error("El nombre del indicador es obligatorio.");
        return;
      }
      if (!definicion.trim()) {
        toast.error("La definición técnica es obligatoria.");
        return;
      }
      if (!metodoCalculo.trim()) {
        toast.error("El método de cálculo / fórmula matemática es obligatorio.");
        return;
      }
      if (!unidadMedida.trim()) {
        toast.error("La unidad de medida es obligatoria.");
        return;
      }

      const lbVal = parseFloat(lineaBaseValor);
      if (isNaN(lbVal)) {
        toast.error("El valor de la línea base debe ser un número válido.");
        return;
      }

      const lbAnio = parseInt(lineaBaseAnio, 10);
      if (isNaN(lbAnio) || lbAnio < 1990 || lbAnio > 2040) {
        toast.error("El año de la línea base debe ser un año válido (ej. 2023).");
        return;
      }

      const metaVal = parseFloat(metaCuatrienio);
      if (isNaN(metaVal)) {
        toast.error("La meta cuatrienio debe ser un valor numérico válido.");
        return;
      }

      setGuardando(true);
      try {
        const payload: FichaIndicadorCrearPayload = {
          codigo: codigo.trim().toUpperCase(),
          nombre: nombre.trim(),
          tipo_indicador: tipoIndicador,
          definicion: definicion.trim(),
          metodo_calculo: metodoCalculo.trim(),
          unidad_medida: unidadMedida.trim(),
          sentido_esperado: sentidoEsperado,
          periodicidad: periodicidad.trim(),
          linea_base_valor: lbVal,
          linea_base_anio: lbAnio,
          meta_cuatrienio: metaVal,
          fuente_datos: fuenteDatos.trim(),
          responsable_reporte: responsableReporte.trim(),
        };

        await crearFichaIndicador(payload);
        toast.success("Ficha técnica de indicador creada y radicada exitosamente.");
        onGuardado?.();
        closeTop();
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : "Error al crear la ficha técnica del indicador."
        );
      } finally {
        setGuardando(false);
      }
    }
  };

  return (
    <PanelShell
      entryKey={entryKey}
      kicker="Fichas Técnicas de Indicadores · Sistema Distrital de Monitoreo"
      title={
        esEdicion
          ? `Editar Ficha Técnica de Indicador — ${codigo || "Indicador"}`
          : "Nueva Ficha Técnica de Indicador"
      }
      subtitle={
        esEdicion
          ? "Actualización de dependencias responsables, fuentes oficiales y metadatos de reporte."
          : "Registro y estructuración de indicador para el seguimiento de la política pública distrital."
      }
      crumbs={[
        { label: "Diagnóstico y Línea Base" },
        { label: esEdicion ? "Editar Ficha Técnica" : "Nueva Ficha Técnica" },
      ]}
      onClose={closeTop}
      onCloseToKey={closeTop}
      actions={
        <div className="flex items-center gap-2">
          <Badge
            variant={esEdicion ? "outline" : "ember"}
            className="text-xs uppercase font-bold"
          >
            {esEdicion ? "Modo Edición" : "Nueva Ficha"}
          </Badge>
          {!editable && (
            <Badge variant="outline" className="text-2xs text-text-tertiary">
              <Lock className="size-3 mr-1 inline" /> Solo lectura
            </Badge>
          )}
        </div>
      }
    >
      {cargandoFicha ? (
        <div className="py-12 text-center text-xs text-text-tertiary">
          Cargando ficha técnica desde PostgreSQL...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto py-2">
          {esEdicion && (
            <div className="rounded-xl border border-border bg-surface-2/60 p-4 flex gap-3 text-xs text-text-secondary leading-relaxed">
              <ShieldAlert className="size-5 shrink-0 text-ember mt-0.5" />
              <div>
                <span className="font-semibold text-text-primary block mb-0.5">
                  Salvaguarda Metodológica y Normativa (Ley 152/94 y C-150/15)
                </span>
                La fórmula matemática, el método de cálculo y la línea base de
                este indicador están sellados institucionalmente para garantizar
                inmutabilidad pericial. Solo se permite actualizar la
                dependencia responsable, fuente y periodicidad de reporte.
              </div>
            </div>
          )}

          {/* Sección 1: Identificación y Clasificación */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-tertiary border-b border-border pb-1">
              1. Identificación y Clasificación Técnica
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ficha-codigo" className="text-xs font-medium text-text-primary">
                  Código del Indicador <span className="text-ember">*</span>
                </Label>
                <Input
                  id="ficha-codigo"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  disabled={esEdicion || !editable}
                  placeholder="IND-RES-01"
                  className="font-mono text-xs"
                />
                <p className="text-2xs text-text-tertiary">Ej: IND-RES-09, IND-PROD-14</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ficha-tipo" className="text-xs font-medium text-text-primary">
                  Tipo de Indicador (Cadena de Valor) <span className="text-ember">*</span>
                </Label>
                <Select
                  value={tipoIndicador}
                  onValueChange={(val) => setTipoIndicador(val as TipoIndicador)}
                  disabled={esEdicion || !editable}
                >
                  <SelectTrigger id="ficha-tipo" className="text-xs">
                    <SelectValue placeholder="Seleccionar tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="insumo" className="text-xs">Insumo (Recursos y Gestión)</SelectItem>
                    <SelectItem value="producto" className="text-xs">Producto (Bienes y Servicios)</SelectItem>
                    <SelectItem value="resultado" className="text-xs">Resultado (Efectos Directos)</SelectItem>
                    <SelectItem value="impacto" className="text-xs">Impacto (Bienestar Colectivo)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-2xs text-text-tertiary">Nivel de la cadena de valor</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ficha-nombre" className="text-xs font-medium text-text-primary">
                Nombre del Indicador <span className="text-ember">*</span>
              </Label>
              <Input
                id="ficha-nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                disabled={esEdicion || !editable}
                placeholder="Tasa de homicidios por cada 100.000 habitantes en Cartagena"
                className="text-xs"
              />
              <p className="text-2xs text-text-tertiary">Nombre técnico oficial descriptivo</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ficha-definicion" className="text-xs font-medium text-text-primary">
                Definición Conceptual y Alcance <span className="text-ember">*</span>
              </Label>
              <Textarea
                id="ficha-definicion"
                value={definicion}
                onChange={(e) => setDefinicion(e.target.value)}
                disabled={esEdicion || !editable}
                placeholder="Mide la incidencia relativa de muertes violentas intencionales en el Distrito..."
                rows={3}
                className="text-xs"
              />
              <p className="text-2xs text-text-tertiary">Describe el fenómeno que mide y la población objetivo</p>
            </div>
          </div>

          {/* Sección 2: Método de Cálculo y Unidad */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-tertiary border-b border-border pb-1">
              2. Método de Cálculo y Sentido
            </h4>

            <div className="space-y-1.5">
              <Label htmlFor="ficha-metodo" className="text-xs font-medium text-text-primary">
                Método de Cálculo / Algoritmo Matemático <span className="text-ember">*</span>
              </Label>
              <Textarea
                id="ficha-metodo"
                value={metodoCalculo}
                onChange={(e) => setMetodoCalculo(e.target.value)}
                disabled={esEdicion || !editable}
                placeholder="(Total homicidios en el año t / Población total DANE proyectada en t) * 100.000"
                rows={2}
                className="font-mono text-xs"
              />
              <p className="text-2xs text-text-tertiary">Fórmula explícita: (Numerador / Denominador) * Factor</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ficha-unidad" className="text-xs font-medium text-text-primary">
                  Unidad de Medida <span className="text-ember">*</span>
                </Label>
                <Input
                  id="ficha-unidad"
                  value={unidadMedida}
                  onChange={(e) => setUnidadMedida(e.target.value)}
                  disabled={esEdicion || !editable}
                  placeholder="Tasa por 100.000 hab"
                  className="text-xs"
                />
                <p className="text-2xs text-text-tertiary">Ej: Tasa por 100k hab, Porcentaje (%), Número</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ficha-sentido" className="text-xs font-medium text-text-primary">
                  Sentido Esperado <span className="text-ember">*</span>
                </Label>
                <Select
                  value={sentidoEsperado}
                  onValueChange={(val) => setSentidoEsperado(val as SentidoEsperado)}
                  disabled={esEdicion || !editable}
                >
                  <SelectTrigger id="ficha-sentido" className="text-xs">
                    <SelectValue placeholder="Sentido..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ascendente" className="text-xs">Ascendente (Mayor es mejor)</SelectItem>
                    <SelectItem value="descendente" className="text-xs">Descendente (Menor es mejor)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-2xs text-text-tertiary">Dirección del avance deseable</p>
              </div>
            </div>
          </div>

          {/* Sección 3: Metas y Línea Base */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-tertiary border-b border-border pb-1">
              3. Línea Base y Meta Cuatrienal
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ficha-linea-base-val" className="text-xs font-medium text-text-primary">
                  Valor Línea Base <span className="text-ember">*</span>
                </Label>
                <Input
                  id="ficha-linea-base-val"
                  type="number"
                  step="any"
                  value={lineaBaseValor}
                  onChange={(e) => setLineaBaseValor(e.target.value)}
                  disabled={esEdicion || !editable}
                  className="text-xs font-mono"
                />
                <p className="text-2xs text-text-tertiary">Dato de partida verificado</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ficha-linea-base-anio" className="text-xs font-medium text-text-primary">
                  Año Línea Base <span className="text-ember">*</span>
                </Label>
                <Input
                  id="ficha-linea-base-anio"
                  type="number"
                  value={lineaBaseAnio}
                  onChange={(e) => setLineaBaseAnio(e.target.value)}
                  disabled={esEdicion || !editable}
                  placeholder="2023"
                  className="text-xs font-mono"
                />
                <p className="text-2xs text-text-tertiary">Año del corte inicial</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ficha-meta" className="text-xs font-medium text-text-primary">
                  Meta Cuatrienio <span className="text-ember">*</span>
                </Label>
                <Input
                  id="ficha-meta"
                  type="number"
                  step="any"
                  value={metaCuatrienio}
                  onChange={(e) => setMetaCuatrienio(e.target.value)}
                  disabled={esEdicion || !editable}
                  className="text-xs font-mono"
                />
                <p className="text-2xs text-text-tertiary">Meta acordada al cierre</p>
              </div>
            </div>
          </div>

          {/* Sección 4: Fuentes y Responsables (Editables siempre) */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-tertiary border-b border-border pb-1">
              4. Fuentes de Verificación y Gobernanza Institucional
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ficha-fuente" className="text-xs font-medium text-text-primary">
                  Fuente Oficial de Datos <span className="text-ember">*</span>
                </Label>
                <Input
                  id="ficha-fuente"
                  value={fuenteDatos}
                  onChange={(e) => setFuenteDatos(e.target.value)}
                  disabled={!editable}
                  placeholder="Policía Nacional (SIEDCO) / Medicina Legal"
                  className="text-xs"
                />
                <p className="text-2xs text-text-tertiary">Sistema o entidad originaria de los registros</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ficha-responsable" className="text-xs font-medium text-text-primary">
                  Dependencia Responsable <span className="text-ember">*</span>
                </Label>
                <Input
                  id="ficha-responsable"
                  value={responsableReporte}
                  onChange={(e) => setResponsableReporte(e.target.value)}
                  disabled={!editable}
                  placeholder="Secretaría del Interior y Convivencia Ciudadana"
                  className="text-xs"
                />
                <p className="text-2xs text-text-tertiary">Secretaría o dirección obligada a reportar</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ficha-periodicidad" className="text-xs font-medium text-text-primary">
                Periodicidad de Reporte <span className="text-ember">*</span>
              </Label>
              <Select
                value={periodicidad}
                onValueChange={(val) => setPeriodicidad(val)}
                disabled={!editable}
              >
                <SelectTrigger id="ficha-periodicidad" className="text-xs">
                  <SelectValue placeholder="Seleccionar periodicidad..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mensual" className="text-xs">Mensual</SelectItem>
                  <SelectItem value="Bimestral" className="text-xs">Bimestral</SelectItem>
                  <SelectItem value="Trimestral" className="text-xs">Trimestral</SelectItem>
                  <SelectItem value="Semestral" className="text-xs">Semestral</SelectItem>
                  <SelectItem value="Anual" className="text-xs">Anual</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-2xs text-text-tertiary">Frecuencia obligatoria de corte y cargue de evidencias</p>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={closeTop}
              disabled={guardando}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="ember"
              size="sm"
              disabled={guardando || !editable}
              className="gap-2"
            >
              <FileSpreadsheet className="size-4" />
              <span>
                {guardando
                  ? "Radicando en PostgreSQL..."
                  : esEdicion
                  ? "Guardar Metadatos"
                  : "Crear Ficha Técnica"}
              </span>
            </Button>
          </div>
        </form>
      )}
    </PanelShell>
  );
}
