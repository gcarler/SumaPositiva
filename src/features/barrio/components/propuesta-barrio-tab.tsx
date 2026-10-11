"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { BarrioCartagena } from "../data/barrios-cartagena";
import {
  useAportes,
  useCrearAporte,
  useMisApoyos,
  useToggleApoyo,
} from "@/features/aportes/services/use-aportes-queries";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Badge } from "@/shared/ui/badge";
import { Label } from "@/shared/ui/label";
import { guardarPendiente } from "@/shared/offline";
import {
  Send,
  CheckCircle2,
  Copy,
  Share2,
  ArrowUp,
  ShieldCheck,
  User,
  PlusCircle,
  MessageSquare,
  MapPin,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  estandarizarDireccion,
  type DireccionEstandarizada,
} from "@/features/geovisor/services/geovisor-api";

const LINEA_ID_CANONICA = "01a0f61b-6252-73d5-b035-7671ed9cf089";

const TEMATICAS = [
  "Seguridad y Alarmas Comunitarias",
  "Iluminación LED y Vías Seguras",
  "Jóvenes y Oportunidades",
  "Convivencia y Mediación Barrial",
  "Prevención de Violencias",
];

interface PropuestaBarrioTabProps {
  barrio: BarrioCartagena;
}

export function PropuestaBarrioTab({ barrio }: PropuestaBarrioTabProps) {
  // Estado del formulario
  const [tematica, setTematica] = useState(TEMATICAS[0]);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [direccionRaw, setDireccionRaw] = useState("");
  const [direccionNormalizada, setDireccionNormalizada] = useState<DireccionEstandarizada | null>(null);
  const [normalizando, setNormalizando] = useState(false);
  const [esAnonimo, setEsAnonimo] = useState(true);
  const [autorNombre, setAutorNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Radicado emitido con éxito
  const [radicadoExitoso, setRadicadoExitoso] = useState<{
    codigo: string;
    titulo: string;
  } | null>(null);

  // Hooks de datos
  const { mutateAsync: crearAporteMutate } = useCrearAporte();
  const { data: aportesData, isLoading: cargandoAportes } = useAportes({
    limite: 15,
  });
  const { data: misApoyos = [] } = useMisApoyos();
  const { mutate: toggleApoyoMutate } = useToggleApoyo();

  const handleNormalizarDireccion = async () => {
    const q = direccionRaw.trim();
    if (!q || q.length < 3) {
      setDireccionNormalizada(null);
      return;
    }
    setNormalizando(true);
    try {
      const res = await estandarizarDireccion(q);
      if (res) {
        setDireccionNormalizada(res);
      }
    } finally {
      setNormalizando(false);
    }
  };

  const handleEnviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !descripcion.trim()) {
      toast.error("Por favor completa el título y la descripción.");
      return;
    }

    const direccionRef = direccionNormalizada?.direccion_normalizada || (direccionRaw.trim() || undefined);
    const sufijoDir = direccionRef ? ` | Dir: ${direccionRef}` : "";

    const payload = {
      linea_id: LINEA_ID_CANONICA,
      titulo: titulo.trim(),
      descripcion: `[Barrio: ${barrio.nombre} | Eje: ${tematica}${sufijoDir}] ${descripcion.trim()}`,
      tipo_aporte: "propuesta" as const,
      autor_nombre: esAnonimo
        ? `Vecino(a) de ${barrio.nombre}`
        : autorNombre.trim() || `Líder de ${barrio.nombre}`,
      es_anonimo: esAnonimo,
      metadatos: {
        canal: "modo_barrio",
        barrio_id: barrio.id,
        barrio_nombre: barrio.nombre,
        localidad: barrio.localidad,
        tematica,
        telefono: esAnonimo ? null : telefono.trim(),
        direccion_referencia: direccionRef,
        territorio_id: direccionNormalizada?.territorio_id || undefined,
        coordenadas_aproximadas: direccionNormalizada?.coordenadas_aproximadas || undefined,
      },
    };

    setEnviando(true);

    const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
    if (isOffline) {
      const sufijo = Math.random().toString(36).substring(2, 6).toUpperCase();
      const codigoProvisional = `POL-2026-OFFLINE-${sufijo}`;
      const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `offline-${Date.now()}`;
      try {
        await guardarPendiente("propuestas_pendientes", {
          id,
          codigoProvisional,
          payload,
          creadoEn: new Date().toISOString(),
          intentos: 0,
          estado: "pendiente",
        });
        setRadicadoExitoso({
          codigo: codigoProvisional,
          titulo: payload.titulo,
        });
        setTitulo("");
        setDescripcion("");
        setDireccionRaw("");
        setDireccionNormalizada(null);
        setAutorNombre("");
        setTelefono("");
        toast.warning(
          "Sin conexión: Propuesta protegida localmente con radicado provisional. Se sincronizará automáticamente al recuperar red."
        );
      } catch {
        toast.error("Error al almacenar la propuesta en el dispositivo.");
      } finally {
        setEnviando(false);
      }
      return;
    }

    try {
      const res = await crearAporteMutate(payload);

      setRadicadoExitoso({
        codigo: res.codigo_radicado,
        titulo: res.titulo,
      });

      // Limpiar campos
      setTitulo("");
      setDescripcion("");
      setDireccionRaw("");
      setDireccionNormalizada(null);
      setAutorNombre("");
      setTelefono("");
      toast.success("¡Propuesta radicada exitosamente!");
    } catch {
      // Fallback ante desconexión o fallo de red en vuelo
      const sufijo = Math.random().toString(36).substring(2, 6).toUpperCase();
      const codigoProvisional = `POL-2026-OFFLINE-${sufijo}`;
      const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `offline-${Date.now()}`;
      try {
        await guardarPendiente("propuestas_pendientes", {
          id,
          codigoProvisional,
          payload,
          creadoEn: new Date().toISOString(),
          intentos: 0,
          estado: "pendiente",
        });
        setRadicadoExitoso({
          codigo: codigoProvisional,
          titulo: payload.titulo,
        });
        setTitulo("");
        setDescripcion("");
        setDireccionRaw("");
        setDireccionNormalizada(null);
        setAutorNombre("");
        setTelefono("");
        toast.warning(
          "Fallo de conexión con el servidor. Propuesta guardada en dispositivo con radicado provisional."
        );
      } catch {
        toast.error("No se pudo radicar la propuesta en este momento.");
      }
    } finally {
      setEnviando(false);
    }
  };

  const copiarRadicado = (codigo: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(codigo);
      toast.success(`Radicado ${codigo} copiado al portapapeles`);
    }
  };

  const compartirWhatsApp = (codigo: string, tituloPropuesta: string) => {
    const esOffline = codigo.includes("OFFLINE");
    const tipo = esOffline ? "radicado provisional de campo" : "radicado oficial";
    const texto = `¡Hola vecinos de ${barrio.nombre}! Acabo de registrar la propuesta comunitaria "${tituloPropuesta}" ante la Alcaldía de Cartagena con el ${tipo} ${codigo}. ¡Apóyala en POLIS aquí: https://seguridadhumanaintegral.org/barrio!`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`;
    if (typeof window !== "undefined") {
      window.open(url, "_blank");
    }
  };

  const handleApoyar = (aporteId: string) => {
    toggleApoyoMutate(aporteId, {
      onSuccess: (data) => {
        if (data.apoyado) {
          toast.success("¡Gracias por tu respaldo cívico!");
        } else {
          toast.info("Respaldo retirado");
        }
      },
      onError: () => {
        toast.error("No se pudo actualizar tu apoyo");
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Panel de Éxito al Radicar */}
      {radicadoExitoso && (
        <div className={`rounded-xl border-2 p-4 shadow-sm animate-in fade-in bg-[var(--surface-1)] ${
          radicadoExitoso.codigo.includes("OFFLINE")
            ? "border-[var(--warning)]"
            : "border-[var(--success)]"
        }`}>
          <div className={`flex items-center gap-2 ${
            radicadoExitoso.codigo.includes("OFFLINE")
              ? "text-[var(--warning)]"
              : "text-[var(--success)]"
          }`}>
            <CheckCircle2 className="size-5" />
            <h4 className="text-sm font-bold">
              {radicadoExitoso.codigo.includes("OFFLINE")
                ? "¡Propuesta Asegurada en Modo Contingencia Local!"
                : "¡Propuesta Radicada con Fe Pública!"}
            </h4>
          </div>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            {radicadoExitoso.codigo.includes("OFFLINE")
              ? `Tu propuesta para ${barrio.nombre} está guardada en la memoria segura del dispositivo y se transmitirá automáticamente a la Alcaldía Distrital al detectar señal.`
              : `Tu propuesta ha sido radicada de forma atómica en el sistema distrital de Cartagena para ${barrio.nombre}.`}
          </p>

          <div className="mt-3 flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2.5">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] block">
                {radicadoExitoso.codigo.includes("OFFLINE")
                  ? "Radicado Provisional de Campo (IndexedDB)"
                  : "Radicado Oficial Distrital"}
              </span>
              <span className="font-mono text-sm font-bold text-[var(--text-primary)] tracking-wide">
                {radicadoExitoso.codigo}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => copiarRadicado(radicadoExitoso.codigo)}
              className="gap-1 text-xs h-8 border-[var(--border-strong)]"
            >
              <Copy className="size-3.5" />
              <span>Copiar</span>
            </Button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() =>
                compartirWhatsApp(
                  radicadoExitoso.codigo,
                  radicadoExitoso.titulo
                )
              }
              className="flex-1 gap-1.5 text-xs border-[var(--border-strong)] text-[var(--accent)] hover:border-[var(--accent)]"
            >
              <Share2 className="size-3.5" />
              <span>Compartir en WhatsApp del Barrio</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setRadicadoExitoso(null)}
              className="text-xs h-9 border-[var(--border)]"
            >
              Radicar otra
            </Button>
          </div>
        </div>
      )}

      {/* Formulario en 1 Pantalla */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-[var(--ember-soft)] text-[var(--ember)]">
            <PlusCircle className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Radicar Propuesta para {barrio.nombre}
            </h3>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Voz directa de tu sector. Recibes número de radicado inmediato.
            </p>
          </div>
        </div>

        <form onSubmit={handleEnviar} className="mt-4 space-y-3.5">
          {/* Eje temático */}
          <div>
            <span className="text-xs font-semibold text-[var(--text-primary)] block mb-1.5">
              ¿Sobre qué tema es tu propuesta?
            </span>
            <div className="flex flex-wrap gap-1.5">
              {TEMATICAS.map((t) => {
                const sel = tematica === t;
                return (
                  <Button
                    key={t}
                    variant="unstyled"
                    size="unstyled"
                    type="button"
                    onClick={() => setTematica(t)}
                    aria-pressed={sel}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-all ${
                      sel
                        ? "bg-[var(--ember)] text-[var(--text-inverse)]"
                        : "bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]"
                    }`}
                  >
                    {t}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Título */}
          <div>
            <Label
              htmlFor="propuesta-titulo"
              className="text-xs font-semibold text-[var(--text-primary)] block mb-1"
            >
              Título breve de la propuesta
            </Label>
            <Input
              id="propuesta-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej. Alarma sonora comunitaria en Calle Las Flores"
              className="text-xs h-9"
              maxLength={120}
              required
            />
          </div>

          {/* Descripción */}
          <div>
            <Label
              htmlFor="propuesta-desc"
              className="text-xs font-semibold text-[var(--text-primary)] block mb-1"
            >
              ¿Qué necesidad resuelve y qué se debe hacer?
            </Label>
            <Textarea
              id="propuesta-desc"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Describe detalladamente el lugar exacto y la solución requerida para el barrio..."
              className="text-xs min-h-[85px] resize-none"
              maxLength={600}
              required
            />
          </div>

          {/* Dirección o Sector exacto de referencia territorial */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label
                htmlFor="propuesta-direccion"
                className="text-xs font-semibold text-[var(--text-primary)]"
              >
                Dirección o sector exacto en {barrio.nombre} (opcional)
              </Label>
              {normalizando && (
                <span className="text-[10px] text-[var(--ember)] flex items-center gap-1 font-medium">
                  <Loader2 className="size-3 animate-spin" /> Verificando territorio...
                </span>
              )}
            </div>
            <Input
              id="propuesta-direccion"
              value={direccionRaw}
              onChange={(e) => {
                setDireccionRaw(e.target.value);
                if (direccionNormalizada) setDireccionNormalizada(null);
              }}
              onBlur={handleNormalizarDireccion}
              placeholder="Ej. Sector Playas Blancas Mz 12 Lt 4, Calle 30 # 25-10, etc."
              className="text-xs h-9"
            />
            {direccionNormalizada && (
              <div className="mt-1 text-[11px] text-[var(--text-secondary)] flex items-center gap-1.5 bg-[var(--surface-2)] p-2 rounded-lg border border-[var(--border)]">
                <MapPin className="size-3.5 text-[var(--ember)] shrink-0" />
                <span className="leading-snug">
                  Dirección estandarizada:{" "}
                  <strong className="text-[var(--text-primary)]">
                    {direccionNormalizada.direccion_normalizada}
                  </strong>
                  {direccionNormalizada.coordenadas_aproximadas && (
                    <span className="ml-1 text-[var(--text-tertiary)] font-mono text-[10px]">
                      ({direccionNormalizada.coordenadas_aproximadas.latitud.toFixed(4)}, {direccionNormalizada.coordenadas_aproximadas.longitud.toFixed(4)})
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Modalidad de Identidad */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2.5">
            <span className="text-[11px] font-semibold text-[var(--text-primary)] block mb-1.5">
              ¿Cómo deseas participar?
            </span>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="unstyled"
                size="unstyled"
                type="button"
                onClick={() => setEsAnonimo(true)}
                aria-pressed={esAnonimo}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 px-2 text-xs font-medium border transition-all ${
                  esAnonimo
                    ? "border-[var(--ember)] bg-[var(--ember-soft)] text-[var(--ember)]"
                    : "border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <ShieldCheck className="size-3.5" />
                <span>Anónimo (Ley 1581)</span>
              </Button>

              <Button
                variant="unstyled"
                size="unstyled"
                type="button"
                onClick={() => setEsAnonimo(false)}
                aria-pressed={!esAnonimo}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 px-2 text-xs font-medium border transition-all ${
                  !esAnonimo
                    ? "border-[var(--ember)] bg-[var(--ember-soft)] text-[var(--ember)]"
                    : "border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <User className="size-3.5" />
                <span>Con mis datos</span>
              </Button>
            </div>

            {!esAnonimo && (
              <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-[var(--border)]">
                <div>
                  <Label
                    htmlFor="autor-nombre"
                    className="text-[10px] text-[var(--text-secondary)] block mb-0.5"
                  >
                    Nombre completo
                  </Label>
                  <Input
                    id="autor-nombre"
                    value={autorNombre}
                    onChange={(e) => setAutorNombre(e.target.value)}
                    placeholder="Tu nombre o cargo en JAC"
                    className="text-xs h-8"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="autor-telefono"
                    className="text-[10px] text-[var(--text-secondary)] block mb-0.5"
                  >
                    Teléfono celular
                  </Label>
                  <Input
                    id="autor-telefono"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="Ej. 315 123 4567"
                    className="text-xs h-8"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Botón Enviar */}
          <Button
            variant="default"
            size="sm"
            type="submit"
            disabled={enviando}
            className="w-full gap-2 font-semibold text-xs h-10 shadow-sm"
          >
            <Send className="size-3.5" />
            <span>
              {enviando
                ? "Radicando propuesta..."
                : `Radicar Propuesta para ${barrio.nombre}`}
            </span>
          </Button>
        </form>
      </div>

      {/* Muro de Propuestas Comunitarias */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)] flex items-center gap-1.5">
            <MessageSquare className="size-3.5 text-[var(--ember)]" />
            <span>Muro Comunitario de Propuestas</span>
          </h4>
          <span className="text-[11px] text-[var(--text-tertiary)] tabular">
            {aportesData?.elementos.length ?? 0} registradas
          </span>
        </div>

        {cargandoAportes ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-6 text-center text-xs text-[var(--text-secondary)]">
            Cargando propuestas comunitarias...
          </div>
        ) : !aportesData?.elementos.length ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-6 text-center text-xs text-[var(--text-secondary)]">
            Aún no hay propuestas registradas. ¡Sé la primera persona en radicar
            para {barrio.nombre}!
          </div>
        ) : (
          <div className="space-y-3">
            {aportesData.elementos.map((prop) => {
              const apoyado = misApoyos.includes(prop.id);
              return (
                <div
                  key={prop.id}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3.5 transition-colors hover:border-[var(--border-strong)]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                      {prop.autor_nombre}
                    </span>
                    {prop.codigo_radicado && (
                      <Badge
                        variant="outline"
                        className="font-mono text-[10px] text-[var(--text-secondary)] border-[var(--border-strong)]"
                      >
                        {prop.codigo_radicado}
                      </Badge>
                    )}
                  </div>

                  <h5 className="mt-1 text-xs font-bold text-[var(--text-primary)] leading-snug">
                    {prop.titulo}
                  </h5>
                  <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
                    {prop.descripcion}
                  </p>

                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-[var(--border)]">
                    <span className="text-[10px] text-[var(--text-tertiary)]">
                      {formatDistanceToNow(new Date(prop.creado_en), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </span>

                    {/* Botón Apoyo Cívico 1 Ciudadano = 1 Voto */}
                    <Button
                      variant="unstyled"
                      size="unstyled"
                      type="button"
                      onClick={() => handleApoyar(prop.id)}
                      aria-pressed={apoyado}
                      aria-label={
                        apoyado
                          ? "Retirar apoyo a propuesta"
                          : "Apoyar propuesta"
                      }
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                        apoyado
                          ? "border-[var(--ember)] bg-[var(--ember-soft)] text-[var(--ember)]"
                          : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--ember)] hover:text-[var(--ember)]"
                      }`}
                    >
                      <ArrowUp
                        className="size-3.5"
                        strokeWidth={1.5}
                        fill={apoyado ? "currentColor" : "none"}
                      />
                      <span className="tabular font-bold">
                        {prop.apoyos_contador}
                      </span>
                      <span className="text-[10px] hidden sm:inline">
                        {apoyado ? "Apoyado" : "Apoyar"}
                      </span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
