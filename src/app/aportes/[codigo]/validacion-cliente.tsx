"use client";

import { useState, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Landmark,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Search,
  Copy,
  Check,
  Clock,
  MapPin,
  User,
  FileText,
  Scale,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Badge } from "@/shared/ui/badge";
import {
  consultarRadicado,
  type ConsultaRadicadoRespuesta,
} from "@/features/notificaciones/services/notificaciones-api";

export interface ValidacionRadicadoClienteProps {
  codigoInicial: string;
  radicadoInicial?: ConsultaRadicadoRespuesta | null;
  errorInicial?: string | null;
}

function formatearFechaOficial(fechaIso: string): string {
  try {
    const d = new Date(fechaIso);
    if (Number.isNaN(d.getTime())) return fechaIso;
    return format(d, "d 'de' MMMM 'de' yyyy, HH:mm '(COT)'", { locale: es });
  } catch {
    return fechaIso;
  }
}

function resolverBadgeEstado(estado: string): {
  variant: "info" | "success" | "ember" | "outline" | "secondary";
  etiqueta: string;
} {
  const normalizado = estado.toLowerCase().trim();
  switch (normalizado) {
    case "radicado":
    case "radicada":
    case "publicado":
    case "publicada":
      return { variant: "info", etiqueta: "Radicado Oficial" };
    case "en_tramite":
    case "evaluacion":
    case "en_evaluacion":
      return { variant: "ember", etiqueta: "En Evaluación Técnica" };
    case "priorizado":
    case "incorporado":
    case "aprobado":
      return { variant: "success", etiqueta: "Priorizado e Incorporado" };
    case "desestimado":
    case "rechazado":
    case "archivado":
      return { variant: "outline", etiqueta: "No Viable / Archivado" };
    default:
      return { variant: "secondary", etiqueta: estado };
  }
}

export function ValidacionRadicadoCliente({
  codigoInicial,
  radicadoInicial = null,
  errorInicial = null,
}: ValidacionRadicadoClienteProps) {
  const router = useRouter();
  const [codigoActual, setCodigoActual] = useState(codigoInicial);
  const [busquedaInput, setBusquedaInput] = useState(codigoInicial);
  const [radicado, setRadicado] = useState<ConsultaRadicadoRespuesta | null>(
    radicadoInicial,
  );
  const [cargando, setCargando] = useState(!radicadoInicial && !errorInicial);
  const [error, setError] = useState<string | null>(errorInicial);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    let cancelado = false;

    if (!codigoActual || codigoActual.trim() === "") {
      setError("Por favor ingrese un código de radicado válido.");
      setCargando(false);
      return;
    }

    // Si ya tenemos datos iniciales para este código exacto, no volvemos a consultar de inmediato
    if (
      radicadoInicial &&
      radicadoInicial.codigo_radicado.toUpperCase() ===
        codigoActual.trim().toUpperCase()
    ) {
      setRadicado(radicadoInicial);
      setCargando(false);
      setError(null);
      return;
    }

    if (errorInicial && !radicadoInicial) {
      setError(errorInicial);
      setCargando(false);
      return;
    }

    async function cargar() {
      setCargando(true);
      setError(null);
      try {
        const respuesta = await consultarRadicado(codigoActual);
        if (!cancelado) {
          setRadicado(respuesta);
          setError(null);
        }
      } catch (err: unknown) {
        if (!cancelado) {
          setRadicado(null);
          const mensaje =
            err instanceof Error && err.message
              ? err.message
              : "No se encontró el radicado en el registro oficial de fe pública distrital.";
          setError(mensaje);
        }
      } finally {
        if (!cancelado) {
          setCargando(false);
        }
      }
    }

    cargar();

    return () => {
      cancelado = true;
    };
  }, [codigoActual, radicadoInicial, errorInicial]);

  const handleBuscar = (e: FormEvent) => {
    e.preventDefault();
    const codigoLimpio = busquedaInput.trim().toUpperCase();
    if (!codigoLimpio) return;
    setCodigoActual(codigoLimpio);
    router.push(`/aportes/${encodeURIComponent(codigoLimpio)}`);
  };

  const copiarRadicado = async (codigo: string) => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(codigo);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2000);
      }
    } catch {
      // Ignorar si el portapapeles no está disponible
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Navegación y Encabezado de la Vista */}
      <nav aria-label="Navegación de retorno" className="mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          aria-label="Ir a la página principal de POLIS"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          <span>Volver al inicio</span>
        </Link>

        <Badge variant="outline" className="text-[11px] font-medium">
          POLIS Fe Pública Transaccional
        </Badge>
      </nav>

      {/* Cabecera institucional */}
      <header className="mb-6 text-center space-y-2">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)] shadow-sm">
          <Landmark className="size-6" aria-hidden="true" />
        </div>
        <p className="label-micro uppercase font-bold tracking-widest text-[var(--text-tertiary)]">
          Alcaldía Mayor de Cartagena de Indias • Secretaría del Interior y Convivencia
        </p>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
          Constancia Auténtica de Radicación Ciudadana
        </h1>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-xl mx-auto">
          Verificación pública, forense e inmutable de trámites y aportes participativos conforme a la Ley 1757 de 2015.
        </p>
      </header>

      {/* Estado: Cargando */}
      {cargando && (
        <section
          aria-live="polite"
          aria-busy="true"
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-8 text-center space-y-4"
        >
          <div className="mx-auto flex size-10 items-center justify-center animate-spin text-[var(--ember)]">
            <RefreshCw className="size-6" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Consultando registro oficial distrital...
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">
              Verificando autenticidad criptográfica del código {codigoActual}
            </p>
          </div>
        </section>
      )}

      {/* Estado: Éxito con Radicado Encontrado */}
      {!cargando && radicado && (
        <article
          aria-label="Constancia oficial de fe pública"
          className="rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-1)] shadow-sm overflow-hidden"
        >
          {/* Franja superior de Fe Pública */}
          <div className="border-b border-[var(--border)] bg-[var(--surface-2)] px-5 py-4 sm:px-8 sm:py-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex size-7 items-center justify-center rounded-full bg-[var(--surface-base)] text-[var(--success)] border border-[var(--border)]">
                <CheckCircle2 className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  Registro Auténtico Certificado
                </p>
                <p className="text-[11px] text-[var(--text-tertiary)]">
                  Fe pública distrital verificada
                </p>
              </div>
            </div>

            {/* Badge de Estado del Trámite */}
            {(() => {
              const info = resolverBadgeEstado(radicado.estado);
              return (
                <Badge variant={info.variant} className="text-xs font-semibold px-2.5 py-1">
                  {info.etiqueta}
                </Badge>
              );
            })()}
          </div>

          {/* Cuerpo principal de la constancia */}
          <div className="p-5 sm:p-8 space-y-6">
            {/* Bloque Destacado del Código de Radicado */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-base)] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <span className="label-micro uppercase font-bold tracking-wider text-[var(--text-tertiary)]">
                  Código de Radicado Oficial
                </span>
                <p className="text-xl sm:text-2xl font-mono font-bold tracking-tight text-[var(--text-primary)] mt-0.5">
                  {radicado.codigo_radicado}
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => copiarRadicado(radicado.codigo_radicado)}
                aria-label={`Copiar código de radicado ${radicado.codigo_radicado}`}
                className="self-start sm:self-center"
              >
                {copiado ? (
                  <>
                    <Check className="size-3.5 text-[var(--success)]" aria-hidden="true" />
                    <span>Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" aria-hidden="true" />
                    <span>Copiar código</span>
                  </>
                )}
              </Button>
            </div>

            {/* Título de la propuesta */}
            <div className="space-y-1.5">
              <span className="label-micro uppercase font-bold tracking-wider text-[var(--text-tertiary)]">
                Título del Aporte Ciudadano
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] leading-snug">
                {radicado.titulo}
              </h2>
            </div>

            {/* Descripción / Contenido */}
            {radicado.descripcion && (
              <div className="space-y-1.5">
                <span className="label-micro uppercase font-bold tracking-wider text-[var(--text-tertiary)]">
                  Síntesis del Aporte
                </span>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-base)] p-4 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">
                  {radicado.descripcion}
                </div>
              </div>
            )}

            {/* Metadatos y Detalles en Cuadrícula */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[var(--border)]">
              {/* Autor o Remitente */}
              <div className="flex items-start gap-2.5">
                <User className="size-4 text-[var(--text-tertiary)] mt-0.5" aria-hidden="true" />
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                    Autor / Remitente
                  </dt>
                  <dd className="text-xs sm:text-sm font-medium text-[var(--text-primary)] mt-0.5">
                    {radicado.autor_nombre || "Ciudadano Anónimo"}
                  </dd>
                </div>
              </div>

              {/* Territorio / Dimensión */}
              <div className="flex items-start gap-2.5">
                <MapPin className="size-4 text-[var(--text-tertiary)] mt-0.5" aria-hidden="true" />
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                    Territorio / Dimensión
                  </dt>
                  <dd className="text-xs sm:text-sm font-medium text-[var(--text-primary)] mt-0.5">
                    {radicado.territorio_nombre || "Distrito Turístico y Cultural de Cartagena"}
                  </dd>
                </div>
              </div>

              {/* Tipo de aporte */}
              <div className="flex items-start gap-2.5">
                <FileText className="size-4 text-[var(--text-tertiary)] mt-0.5" aria-hidden="true" />
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                    Tipo de Trámite
                  </dt>
                  <dd className="text-xs sm:text-sm font-medium text-[var(--text-primary)] mt-0.5 capitalize">
                    {radicado.tipo_aporte.replace(/_/g, " ")}
                  </dd>
                </div>
              </div>

              {/* Fecha y hora oficial */}
              <div className="flex items-start gap-2.5">
                <Clock className="size-4 text-[var(--text-tertiary)] mt-0.5" aria-hidden="true" />
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                    Fecha y Hora de Despacho Legal
                  </dt>
                  <dd className="text-xs sm:text-sm font-medium text-[var(--text-primary)] mt-0.5">
                    {formatearFechaOficial(radicado.creado_en)}
                  </dd>
                </div>
              </div>
            </div>

            {/* Sello de Garantía Legal */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 flex items-start gap-3">
              <Scale className="size-5 text-[var(--ember)] shrink-0 mt-0.5" aria-hidden="true" />
              <div className="text-xs leading-relaxed text-[var(--text-secondary)] space-y-1">
                <p className="font-semibold text-[var(--text-primary)]">
                  Garantía de Participación y No Revictimización
                </p>
                <p>
                  Esta constancia fehaciente certifica que el aporte ciudadano se encuentra radicado inmutablemente
                  e incorporado a la cadena de custodia de la Política Pública de Seguridad Humana de Cartagena de Indias
                  conforme a la Ley Estatutaria 1757 de 2015 y la Sentencia C-150 de 2015.
                </p>
              </div>
            </div>
          </div>

          {/* Botones de acción inferior */}
          <div className="border-t border-[var(--border)] bg-[var(--surface-base)] px-5 py-4 sm:px-8 sm:py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <Link
              href="/"
              className="w-full sm:w-auto"
            >
              <Button variant="default" className="w-full sm:w-auto">
                <Landmark className="size-4" aria-hidden="true" />
                <span>Volver al portal principal</span>
              </Button>
            </Link>

            <Link
              href="/trazabilidad"
              className="w-full sm:w-auto"
            >
              <Button variant="outline" className="w-full sm:w-auto">
                <span>Ver trazabilidad completa</span>
              </Button>
            </Link>
          </div>
        </article>
      )}

      {/* Estado: Error o No Encontrado */}
      {!cargando && error && (
        <section
          aria-labelledby="titulo-error"
          className="rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-1)] p-6 sm:p-8 space-y-6 shadow-sm"
        >
          <div className="flex items-start gap-3.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--surface-2)] text-[var(--ember)] border border-[var(--border)] shrink-0">
              <AlertCircle className="size-5" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h2 id="titulo-error" className="text-base sm:text-lg font-semibold text-[var(--text-primary)]">
                Constancia no verificada o radicado no encontrado
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                El código <strong className="font-mono text-[var(--text-primary)]">{codigoActual}</strong> no figura en
                el registro de fe pública distrital o fue digitado de forma incompleta.
              </p>
            </div>
          </div>

          {/* Formulario para buscar otro radicado */}
          <form onSubmit={handleBuscar} className="space-y-3 border-t border-[var(--border)] pt-5">
            <Label htmlFor="input-nuevo-radicado" className="text-xs font-semibold text-[var(--text-primary)]">
              Buscar o validar otro código de radicado:
            </Label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[var(--text-tertiary)]" aria-hidden="true" />
                <Input
                  id="input-nuevo-radicado"
                  type="text"
                  value={busquedaInput}
                  onChange={(e) => setBusquedaInput(e.target.value)}
                  placeholder="Ej. POL-2026-0001"
                  className="pl-10 uppercase font-mono text-sm"
                />
              </div>
              <Button type="submit" variant="ember" className="sm:w-auto">
                <span>Validar radicado</span>
              </Button>
            </div>
            <p className="text-[11px] text-[var(--text-tertiary)]">
              Verifique el código alfanumérico impreso en su constancia o debajo del código QR escaneado.
            </p>
          </form>

          {/* Botón de retorno */}
          <div className="pt-2">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="size-3.5" aria-hidden="true" />
                <span>Volver a la plataforma principal</span>
              </Button>
            </Link>
          </div>
        </section>
      )}

      {/* Franja adicional: Buscar otro código cuando ya hay un radicado visible */}
      {!cargando && radicado && (
        <section aria-label="Búsqueda de otro radicado" className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--surface-base)] p-4 sm:p-5">
          <form onSubmit={handleBuscar} className="flex flex-col sm:flex-row items-center gap-2.5">
            <div className="w-full sm:w-auto shrink-0">
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                ¿Desea consultar otro código?
              </span>
            </div>
            <div className="relative w-full sm:flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[var(--text-tertiary)]" aria-hidden="true" />
              <Input
                type="text"
                value={busquedaInput}
                onChange={(e) => setBusquedaInput(e.target.value)}
                placeholder="POL-2026-XXXX"
                aria-label="Código de radicado a consultar"
                className="pl-10 uppercase font-mono text-xs sm:text-sm"
              />
            </div>
            <Button type="submit" variant="outline" size="sm" className="w-full sm:w-auto">
              <span>Consultar</span>
            </Button>
          </form>
        </section>
      )}
    </div>
  );
}
