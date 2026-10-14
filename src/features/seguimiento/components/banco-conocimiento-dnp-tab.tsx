"use client";

import { useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  ExternalLink,
  Sparkles,
  FileText,
  Calendar,
  Layers,
  ShieldCheck,
  Scale,
  Coins,
  Lightbulb,
} from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  BANCO_CONOCIMIENTO_CANONICO,
  validarRedaccionLocal,
  type ValidarRedaccionRespuesta,
  type TipoActividadDNP,
} from "../services/plan-accion-dnp-api";

export function BancoConocimientoDNPTab() {
  // Estado para el Simulador Lingüístico DNP
  const [textoPrueba, setTextoPrueba] = useState<string>(
    "Expedir el protocolo distrital unificado de atención inmediata contra ESCNNA"
  );
  const [tipoActividadSeleccionado, setTipoActividadSeleccionado] =
    useState<TipoActividadDNP>("NORMATIVA");

  // Paso seleccionado en la Ruta Metodológica
  const [pasoSeleccionado, setPasoSeleccionado] = useState<number>(1);

  // Validación en vivo
  const resultadoValidacion: ValidarRedaccionRespuesta = validarRedaccionLocal(
    textoPrueba,
    tipoActividadSeleccionado
  );

  const ejemplosRapidos = [
    {
      label: "Válida (Normativa)",
      tipo: "NORMATIVA" as TipoActividadDNP,
      texto: "Expedir el protocolo distrital unificado contra la extorsión comercial",
    },
    {
      label: "Válida (Logística)",
      tipo: "LOGISTICA" as TipoActividadDNP,
      texto: "Instalar 85 nuevos puntos de videovigilancia con cámaras analíticas LPR",
    },
    {
      label: "Inválida (Verbo Débil: 'Fortalecer')",
      tipo: "ADMINISTRATIVA" as TipoActividadDNP,
      texto: "Fortalecer las capacidades institucionales de mediación barrial",
    },
    {
      label: "Inválida (Verbo Débil: 'Implementar')",
      tipo: "DE_GESTION" as TipoActividadDNP,
      texto: "Implementar un plan de choque contra la delincuencia en paraderos",
    },
    {
      label: "Inválida (Sustantivo Inicial)",
      tipo: "NORMATIVA" as TipoActividadDNP,
      texto: "Ruta de atención prioritaria para jóvenes en alto riesgo social",
    },
  ];

  const pasoActual =
    BANCO_CONOCIMIENTO_CANONICO.ruta_metodologica_7_pasos.find(
      (p) => p.paso === pasoSeleccionado
    ) || BANCO_CONOCIMIENTO_CANONICO.ruta_metodologica_7_pasos[0];

  return (
    <div className="space-y-10">
      {/* =====================================================================
          BANNER MARCO NORMATIVO OFICIAL DNP
          ===================================================================== */}
      <section
        aria-labelledby="seccion-marco-normativo"
        className="rounded-2xl border border-border bg-surface-1 p-6 shadow-sm"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-ember border-ember/30">
                <BookOpen className="h-3 w-3 mr-1" />
                Estándar Oficial DNP / SisPT
              </Badge>
              <Badge variant="info">Kit Financiero MHCP / DNP</Badge>
            </div>
            <h2
              id="seccion-marco-normativo"
              className="text-xl font-bold tracking-tight text-text-primary"
            >
              Marco Normativo y Principios de Formulación Territorial
            </h2>
            <p className="text-xs text-text-secondary">
              Bases jurídicas vinculantes que rigen la programación, articulación presupuestal y publicación de los Planes de Acción en Colombia.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-xs"
              asChild
            >
              <a
                href="https://sispt.dnp.gov.co/"
                target="_blank"
                rel="noreferrer"
              >
                <span>Portal SisPT</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
          {BANCO_CONOCIMIENTO_CANONICO.marco_normativo.map((item) => (
            <div
              key={item.norma}
              className="flex flex-col justify-between rounded-xl border border-border bg-surface-2 p-4 transition-all hover:border-ember/40 hover:shadow-md"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-ember font-semibold text-xs">
                  <Scale className="h-4 w-4 shrink-0" />
                  <span>{item.norma}</span>
                </div>
                <h3 className="text-sm font-bold text-text-primary leading-snug">
                  {item.titulo}
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed line-clamp-4">
                  {item.descripcion}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-border">
                <span className="text-[11px] font-medium text-warning flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 shrink-0" />
                  {item.obligatoriedad}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =====================================================================
          SECCIÓN 1: ENCADENAMIENTO DE INSTRUMENTOS (KIT FINANCIERO DNP)
          ===================================================================== */}
      <section
        aria-labelledby="seccion-encadenamiento"
        className="rounded-2xl border border-border bg-surface-1 p-6 shadow-sm"
      >
        <div className="space-y-1 mb-6">
          <Badge variant="outline" className="text-info border-info/30">
            <Layers className="h-3 w-3 mr-1" />
            Cadena de Articulación Anual
          </Badge>
          <h2
            id="seccion-encadenamiento"
            className="text-xl font-bold tracking-tight text-text-primary"
          >
            1. Encadenamiento de Instrumentos de Planeación y Presupuesto
          </h2>
          <p className="text-xs text-text-secondary">
            Instructivo Oficial DNP (Págs. 6–7): Flujo secuencial donde cada instrumento nutre con insumos específicos la formulación del Plan de Acción.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {BANCO_CONOCIMIENTO_CANONICO.encadenamiento_instrumentos.map(
            (inst, idx) => (
              <div
                key={inst.instrumento}
                className="relative flex flex-col justify-between rounded-xl border border-border bg-surface-2 p-5"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ember/10 text-ember text-xs font-bold">
                      {idx + 1}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {inst.etapa}
                    </Badge>
                  </div>
                  <h3 className="text-sm font-bold text-text-primary">
                    {inst.instrumento}
                  </h3>

                  <div className="space-y-2 pt-2 border-t border-border text-xs">
                    <div>
                      <span className="font-semibold text-text-secondary block text-[11px] uppercase tracking-wider">
                        Actividad DNP:
                      </span>
                      <p className="text-text-primary leading-relaxed mt-0.5">
                        {inst.actividad_dnp}
                      </p>
                    </div>
                    <div>
                      <span className="font-semibold text-ember block text-[11px] uppercase tracking-wider">
                        Producto Generado:
                      </span>
                      <p className="text-text-secondary leading-relaxed mt-0.5">
                        {inst.producto_dnp}
                      </p>
                    </div>
                  </div>
                </div>

                {idx < 3 && (
                  <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                    <div className="h-6 w-6 rounded-full bg-surface-1 border border-border flex items-center justify-center text-text-muted shadow-sm">
                      <ArrowRight className="h-3 w-3" />
                    </div>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </section>

      {/* =====================================================================
          SECCIÓN 2: RUTA METODOLÓGICA DE 7 PASOS DNP
          ===================================================================== */}
      <section
        aria-labelledby="seccion-ruta-7pasos"
        className="rounded-2xl border border-border bg-surface-1 p-6 shadow-sm"
      >
        <div className="space-y-1 mb-6">
          <Badge variant="outline" className="text-ember border-ember/30">
            <Calendar className="h-3 w-3 mr-1" />
            Metodología Oficial SisPT
          </Badge>
          <h2
            id="seccion-ruta-7pasos"
            className="text-xl font-bold tracking-tight text-text-primary"
          >
            2. Ruta Metodológica de 7 Pasos para Elaborar el Plan de Acción
          </h2>
          <p className="text-xs text-text-secondary">
            Instructivo DNP (Págs. 8–9): Pasos estandarizados desde los lineamientos de Planeación hasta la aprobación en Consejo de Gobierno y la publicación del 31 de enero.
          </p>
        </div>

        {/* Barra interactiva de pasos */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-6">
          {BANCO_CONOCIMIENTO_CANONICO.ruta_metodologica_7_pasos.map((p) => {
            const activo = p.paso === pasoSeleccionado;
            const esUltimo = p.paso === 7;
            return (
              <Button
                key={p.paso}
                type="button"
                variant="outline"
                onClick={() => setPasoSeleccionado(p.paso)}
                className={`h-auto flex flex-col items-start text-left p-3 rounded-xl border transition-all text-xs ${
                  activo
                    ? "border-ember bg-ember/10 shadow-sm"
                    : esUltimo
                    ? "border-warning/40 bg-warning/5 hover:border-warning"
                    : "border-border bg-surface-2 hover:border-border/80"
                }`}
              >
                <div className="flex w-full items-center justify-between mb-1.5">
                  <span
                    className={`font-bold ${
                      activo
                        ? "text-ember"
                        : esUltimo
                        ? "text-warning"
                        : "text-text-muted"
                    }`}
                  >
                    {`Paso ${p.paso}`}
                  </span>
                  {esUltimo && (
                    <Badge variant="warning" className="text-[9px] px-1 py-0">
                      Ley 1474
                    </Badge>
                  )}
                </div>
                <span
                  className={`line-clamp-2 font-medium ${
                    activo ? "text-text-primary" : "text-text-secondary"
                  }`}
                >
                  {p.nombre}
                </span>
              </Button>
            );
          })}
        </div>

        {/* Detalle del paso seleccionado */}
        <div className="rounded-xl border border-border bg-surface-2 p-5 flex flex-col md:flex-row gap-5 items-start">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ember text-text-inverse font-bold text-lg shadow-sm">
            {pasoActual.paso}
          </div>
          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-text-primary">
                {pasoActual.nombre}
              </h3>
              <Badge variant="outline" className="text-text-muted text-[11px]">
                Responsable: {pasoActual.responsable}
              </Badge>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              {pasoActual.descripcion}
            </p>

            {pasoActual.paso === 7 && (
              <div className="mt-3 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-text-primary flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0 text-warning mt-0.5" />
                <div>
                  <span className="font-semibold text-warning">
                    Plazo Legal Improrrogable — 31 de Enero
                  </span>
                  <p className="text-text-secondary mt-0.5">
                    El Artículo 74 de la Ley 1474 de 2011 (Estatuto Anticorrupción) exige que a más tardar el 31 de enero de cada año todas las entidades del Estado publiquen en su portal oficial el Plan de Acción de la vigencia y el informe de gestión de la vigencia anterior para control social y fiscal.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECCIÓN 3: SIMULADOR Y VALIDADOR LINGÜÍSTICO DNP DE ACTIVIDADES
          ===================================================================== */}
      <section
        aria-labelledby="seccion-validador-linguistico"
        className="rounded-2xl border border-ember/30 bg-surface-1 p-6 shadow-md"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-border">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-ember text-text-inverse">
                <Sparkles className="h-3 w-3 mr-1" />
                Motor Lingüístico DNP
              </Badge>
              <Badge variant="outline" className="text-text-muted">
                Pág. 12 Instructivo Kit Financiero
              </Badge>
            </div>
            <h2
              id="seccion-validador-linguistico"
              className="text-xl font-bold tracking-tight text-text-primary"
            >
              3. Simulador y Validador Lingüístico DNP de Actividades
            </h2>
            <p className="text-xs text-text-secondary">
              Pruebe o redacte actividades en tiempo real. El motor analiza si la redacción inicia con un verbo fuerte en infinitivo o si incurre en la lista negra oficial de 16 verbos débiles prohibidos por el DNP.
            </p>
          </div>
        </div>

        {/* Ejemplos predefinidos para probar */}
        <div className="mb-4">
          <span className="text-[11px] font-semibold text-text-secondary block mb-2 uppercase tracking-wider">
            Cargar Casos Típicos de Prueba:
          </span>
          <div className="flex flex-wrap gap-2">
            {ejemplosRapidos.map((ej) => (
              <Button
                key={ej.label}
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => {
                  setTextoPrueba(ej.texto);
                  setTipoActividadSeleccionado(ej.tipo);
                }}
              >
                {ej.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Formulario del simulador */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="input-redaccion-actividad"
                className="text-xs font-semibold text-text-primary flex items-center justify-between"
              >
                <span>Redacción de la Actividad (DEBE iniciar con verbo fuerte en infinitivo)</span>
                <span className="text-[11px] text-text-muted">
                  Ej.: Expedir, Diseñar, Ejecutar, Instalar
                </span>
              </Label>
              <Textarea
                id="input-redaccion-actividad"
                rows={3}
                value={textoPrueba}
                onChange={(e) => setTextoPrueba(e.target.value)}
                placeholder="Escriba la redacción de la actividad..."
                className="w-full rounded-xl border border-border bg-surface-2 p-3 text-xs text-text-primary placeholder:text-text-muted focus:border-ember leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="select-tipo-actividad-sim"
                  className="text-xs font-medium text-text-secondary"
                >
                  Tipología de Actividad DNP:
                </Label>
                <Select
                  value={tipoActividadSeleccionado}
                  onValueChange={(val) =>
                    setTipoActividadSeleccionado(val as TipoActividadDNP)
                  }
                >
                  <SelectTrigger id="select-tipo-actividad-sim" className="w-full text-xs bg-surface-2 border-border">
                    <SelectValue placeholder="Seleccione tipología" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NORMATIVA">NORMATIVA (Leyes, decretos, reglamentos)</SelectItem>
                    <SelectItem value="ADMINISTRATIVA">ADMINISTRATIVA (Convenios, contratos, diseño)</SelectItem>
                    <SelectItem value="DE_GESTION">DE GESTIÓN (Programas, fondos, diálogo social)</SelectItem>
                    <SelectItem value="LOGISTICA">LOGÍSTICA (Infraestructura, dotación, alertas)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-medium text-text-secondary block">
                  Verbo Detectado por el Motor:
                </span>
                <div className="flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-surface-2 text-xs font-mono text-text-primary">
                  {resultadoValidacion.verbo_detectado ? (
                    <Badge
                      variant={resultadoValidacion.es_valida ? "success" : "destructive"}
                      className="font-mono text-xs"
                    >
                      {resultadoValidacion.verbo_detectado}
                    </Badge>
                  ) : (
                    <span className="text-text-muted italic">Ninguno</span>
                  )}
                  <span className="text-text-muted text-[11px]">
                    {resultadoValidacion.es_infinitivo
                      ? "(Infinitivo)"
                      : "(No es infinitivo)"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Panel de Resultado de la Validación */}
          <div
            className={`rounded-xl border p-5 flex flex-col justify-between transition-all ${
              resultadoValidacion.es_valida
                ? "border-success/40 bg-success/5"
                : resultadoValidacion.es_verbo_debil_prohibido
                ? "border-danger/40 bg-danger/5"
                : "border-warning/40 bg-warning/5"
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {resultadoValidacion.es_valida ? (
                  <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                ) : resultadoValidacion.es_verbo_debil_prohibido ? (
                  <XCircle className="h-5 w-5 text-danger shrink-0" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
                )}
                <span
                  className={`font-bold text-sm ${
                    resultadoValidacion.es_valida
                      ? "text-success"
                      : resultadoValidacion.es_verbo_debil_prohibido
                      ? "text-danger"
                      : "text-warning"
                  }`}
                >
                  {resultadoValidacion.es_valida
                    ? "Redacción Aprobada DNP"
                    : resultadoValidacion.es_verbo_debil_prohibido
                    ? "Verbo Prohibido DNP"
                    : "No Cumple Formato DNP"}
                </span>
              </div>

              <p className="text-xs text-text-primary leading-relaxed">
                {resultadoValidacion.mensaje_dnp}
              </p>

              {resultadoValidacion.verbos_fuertes_sugeridos.length > 0 && (
                <div className="pt-3 border-t border-border/60 space-y-2">
                  <span className="text-[11px] font-semibold text-text-secondary flex items-center gap-1">
                    <Lightbulb className="h-3 w-3 text-warning" />
                    Verbos fuertes sugeridos para {tipoActividadSeleccionado}:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {resultadoValidacion.verbos_fuertes_sugeridos.map(
                      (verbo) => (
                        <Button
                          key={verbo}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const partes = textoPrueba.trim().split(/\s+/);
                            partes[0] = verbo;
                            setTextoPrueba(partes.join(" "));
                          }}
                          className="h-auto px-2 py-0.5 rounded text-[11px] font-medium bg-surface-1 border border-border text-ember hover:border-ember transition-colors"
                        >
                          {verbo}
                        </Button>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-border/40 text-[10px] text-text-muted">
              Criterio metodológico: Pág. 12 Instructivo DNP (Kit Financiero)
            </div>
          </div>
        </div>

        {/* Lista negra de los 16 verbos débiles */}
        <div className="mt-6 pt-5 border-t border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <span className="text-xs font-bold text-danger flex items-center gap-1.5">
              <XCircle className="h-4 w-4 shrink-0" />
              Lista Negra Oficial de 16 Verbos Débiles Prohibidos por el DNP:
            </span>
            <span className="text-[11px] text-text-muted">
              (Prohibidos por ambiguos, indeterminados o no auditables)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-1.5">
            {BANCO_CONOCIMIENTO_CANONICO.regla_linguistica_dnp.verbos_debiles_prohibidos.map(
              (verbo) => (
                <div
                  key={verbo}
                  className="rounded-md border border-danger/20 bg-danger/5 px-2 py-1 text-center font-mono text-[11px] text-danger font-medium hover:border-danger/40 transition-colors"
                >
                  {verbo}
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECCIÓN 4: DICCIONARIO DE METAS Y FUENTES DE FINANCIACIÓN
          ===================================================================== */}
      <section
        aria-labelledby="seccion-diccionario"
        className="rounded-2xl border border-border bg-surface-1 p-6 shadow-sm"
      >
        <div className="space-y-1 mb-6">
          <Badge variant="outline" className="text-ember border-ember/30">
            <Coins className="h-3 w-3 mr-1" />
            Catálogo Estructurado DNP
          </Badge>
          <h2
            id="seccion-diccionario"
            className="text-xl font-bold tracking-tight text-text-primary"
          >
            4. Diccionario de Clasificación de Metas y Fuentes de Financiación
          </h2>
          <p className="text-xs text-text-secondary">
            Instructivo DNP (Págs. 10–13): Clasificación formal de metas para la matriz y catálogo de fuentes presupuestales por vigencia.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Clasificación de Metas */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-text-primary border-b border-border pb-2 flex items-center gap-2">
              <FileText className="h-4 w-4 text-ember" />
              Clasificación de Metas DNP (Paso 2)
            </h3>

            <div className="space-y-3">
              {BANCO_CONOCIMIENTO_CANONICO.taxonomia_metas.map((m) => (
                <div
                  key={m.tipo}
                  className="rounded-xl border border-border bg-surface-2 p-4 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-text-primary">
                      {m.nombre}
                    </span>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {m.tipo}
                    </Badge>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {m.definicion}
                  </p>
                  <div className="pt-2 text-[11px] text-text-muted">
                    <span className="font-semibold text-text-primary">Ejemplo: </span>
                    {m.ejemplo}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fuentes de Financiación */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-text-primary border-b border-border pb-2 flex items-center gap-2">
              <Coins className="h-4 w-4 text-ember" />
              Fuentes de Financiación por Vigencia (Paso 6)
            </h3>

            <div className="space-y-3">
              {Object.entries(
                BANCO_CONOCIMIENTO_CANONICO.catalogo_fuentes_financiacion
              ).map(([categoria, fuentes]) => (
                <div
                  key={categoria}
                  className="rounded-xl border border-border bg-surface-2 p-4 space-y-2"
                >
                  <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
                    <span className="font-bold text-xs text-text-primary uppercase tracking-wider">
                      {categoria === "INVERSION"
                        ? "Recursos de Inversión"
                        : categoria === "FUNCIONAMIENTO"
                        ? "Recursos de Funcionamiento"
                        : "Recursos de Gestión"}
                    </span>
                    <Badge
                      variant={
                        categoria === "INVERSION"
                          ? "default"
                          : categoria === "FUNCIONAMIENTO"
                          ? "info"
                          : "outline"
                      }
                      className="text-[10px]"
                    >
                      {categoria}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                    {fuentes.map((f) => (
                      <div
                        key={f.codigo}
                        className="rounded border border-border/40 bg-surface-1 px-2 py-1 text-[11px] text-text-secondary"
                      >
                        <span className="font-bold text-text-primary block text-[10px]">
                          {f.codigo}
                        </span>
                        <span className="line-clamp-1">{f.nombre}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export const BancoConocimientoDnpTab = BancoConocimientoDNPTab;
