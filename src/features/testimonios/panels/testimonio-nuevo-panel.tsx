"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  MessageSquareQuote,
  ShieldCheck,
  Send,
  MapPin,
  Sparkles,
} from "lucide-react";
import { PanelShell } from "@/core/panels/panel-shell";
import { usePanels } from "@/core/panels/panel-store";
import { useCrearTestimonio } from "../services/use-testimonios-queries";
import type { TipoTestimonio } from "../models/testimonio";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";

interface TestimonioNuevoPanelProps {
  entryKey: string;
  props?: Record<string, never>;
}

const DIMENSIONES_ONU = [
  "Seguridad Personal y Convivencia",
  "Seguridad Ambiental y Cambio Climático",
  "Seguridad Económica y Empleo",
  "Seguridad Alimentaria y Nutrición",
  "Seguridad en Salud Integral",
  "Seguridad Comunitaria y Cohesión Social",
  "Seguridad Política y Derechos Humanos",
];

const LOCALIDADES = [
  "Localidad 1 — Histórica y del Caribe Norte",
  "Localidad 2 — De la Virgen y Turística",
  "Localidad 3 — Industrial y de la Bahía",
  "Zona Corregimental e Insular",
];

export function TestimonioNuevoPanel({ entryKey }: TestimonioNuevoPanelProps) {
  const { closeTop } = usePanels();
  const crearTestimonio = useCrearTestimonio();

  const [anonimo, setAnonimo] = useState(false);
  const [nombre, setNombre] = useState("");
  const [barrio, setBarrio] = useState("");
  const [localidad, setLocalidad] = useState<string>("");
  const [tipo, setTipo] = useState<TipoTestimonio>("ciudadano");
  const [texto, setTexto] = useState("");
  const [dimensionOnu, setDimensionOnu] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const maxChars = 500;
  const remaining = maxChars - texto.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!anonimo && !nombre.trim()) {
      toast.error("Nombre requerido", {
        description:
          "Ingresa tu nombre o activa la opción de testimonio anónimo para proteger tu identidad.",
      });
      return;
    }

    if (!texto.trim() || texto.trim().length < 10) {
      toast.error("Testimonio demasiado corto", {
        description: "Comparte al menos 10 caracteres describiendo tu experiencia o propuesta.",
      });
      return;
    }

    if (texto.length > maxChars) {
      toast.error("Límite de caracteres excedido", {
        description: `El testimonio no puede superar los ${maxChars} caracteres.`,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await crearTestimonio.mutateAsync({
        nombre_autor: anonimo ? "Anónimo" : nombre.trim(),
        titulo: texto.trim().slice(0, 80),
        relato: texto.trim(),
        metadatos_enfoque: {
          anonimo,
          barrio: barrio.trim() || null,
          localidad: localidad || null,
          tipo_actor: tipo,
          dimension: dimensionOnu || null,
          canal_origen: "portal_ciudadano_web",
        },
      });

      toast.success("¡Gracias! Tu testimonio será revisado.", {
        description:
          "El equipo de facilitación comunitaria validará tu aporte para incorporarlo al diagnóstico territorial.",
      });

      closeTop();
    } catch {
      toast.error("Ocurrió un error al registrar el testimonio.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PanelShell
      entryKey={entryKey}
      title="Comparte tu Testimonio"
      subtitle="Tu voz y experiencia son vitales para la Política Pública de Seguridad Humana de Cartagena"
      crumbs={[{ label: "Testimonios" }, { label: "Nuevo Aporte" }]}
      onClose={closeTop}
      onCloseToKey={closeTop}
    >
      <form onSubmit={handleSubmit} className="space-y-6 p-6">
        {/* Banner informativo de Habeas Data */}
        <div className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 text-xs text-[var(--text-secondary)]">
          <ShieldCheck className="size-5 shrink-0 text-[var(--ember)]" />
          <div className="space-y-1">
            <p className="font-semibold text-[var(--text-primary)]">
              Garantía de Participación y Protección de Datos
            </p>
            <p>
              Tu testimonio será catalogado según la dimensión ONU correspondiente.
              Si prefieres mantener reserva, puedes publicar de manera 100% anónima.
            </p>
          </div>
        </div>

        {/* Control de Anonimato */}
        <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
          <div className="space-y-0.5">
            <Label htmlFor="toggle-anonimo" className="text-sm font-medium text-[var(--text-primary)]">
              ¿Quieres dar tu nombre o ser anónimo?
            </Label>
            <p className="text-xs text-[var(--text-secondary)]">
              {anonimo
                ? "Tu testimonio se publicará como 'Anónimo' protegiendo tu identidad."
                : "Tu nombre aparecerá públicamente en el muro de testimonios."}
            </p>
          </div>
          <Switch
            id="toggle-anonimo"
            checked={anonimo}
            onCheckedChange={setAnonimo}
            aria-label="Publicar de manera anónima"
          />
        </div>

        {/* Nombre del autor (si no es anónimo) */}
        {!anonimo && (
          <div className="space-y-2">
            <Label htmlFor="nombre" className="text-xs font-semibold text-[var(--text-primary)]">
              Nombre y apellido <span className="text-[var(--ember)]">*</span>
            </Label>
            <Input
              id="nombre"
              type="text"
              placeholder="Ej. María González, Pedro Gómez..."
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required={!anonimo}
            />
          </div>
        )}

        {/* Tipo de participante */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-[var(--text-primary)]">
            Tipo de actor o rol en la comunidad <span className="text-[var(--ember)]">*</span>
          </Label>
          <Select
            value={tipo}
            onValueChange={(val) => setTipo(val as TipoTestimonio)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecciona tu rol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ciudadano">Ciudadano(a) / Habitante</SelectItem>
              <SelectItem value="lider_comunal">Líder(esa) Comunitario(a) / JAC</SelectItem>
              <SelectItem value="funcionario">Servidor(a) Público(a) / Institución</SelectItem>
              <SelectItem value="academia">Academia / Investigador(a)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Barrio y Localidad */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="barrio" className="text-xs font-semibold text-[var(--text-primary)]">
              Barrio o Corregimiento
            </Label>
            <div className="relative">
              <Input
                id="barrio"
                type="text"
                placeholder="Ej. Getsemaní, El Pozón, Barú..."
                value={barrio}
                onChange={(e) => setBarrio(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-[var(--text-primary)]">
              Localidad o Zona
            </Label>
            <Select value={localidad} onValueChange={setLocalidad}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona localidad" />
              </SelectTrigger>
              <SelectContent>
                {LOCALIDADES.map((loc) => (
                  <SelectItem key={loc} value={loc}>
                    {loc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Dimensión de Seguridad ONU */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-[var(--text-primary)]">
            Dimensión de seguridad que más te afecta o representa
          </Label>
          <Select value={dimensionOnu} onValueChange={setDimensionOnu}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecciona una dimensión (opcional)" />
            </SelectTrigger>
            <SelectContent>
              {DIMENSIONES_ONU.map((dim) => (
                <SelectItem key={dim} value={dim}>
                  {dim}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Texto del testimonio con contador de 500 chars */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="texto" className="text-xs font-semibold text-[var(--text-primary)]">
              Tu testimonio, vivencia o propuesta <span className="text-[var(--ember)]">*</span>
            </Label>
            <span
              className={`text-xs tabular-nums font-mono ${
                remaining < 0
                  ? "text-[var(--danger)] font-bold"
                  : remaining < 50
                  ? "text-[var(--warning)]"
                  : "text-[var(--text-tertiary)]"
              }`}
            >
              {texto.length} / {maxChars}
            </span>
          </div>

          <Textarea
            id="texto"
            rows={5}
            placeholder="Narra brevemente qué sucede en tu barrio, qué riesgos enfrentas y qué acuerdos o alternativas consideras indispensables para la seguridad de tu comunidad..."
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            className="resize-none"
            required
          />
          <p className="text-[11px] text-[var(--text-secondary)]">
            Sé específico y propositivo. Máximo 500 caracteres para asegurar una lectura ágil en la galería comunitaria.
          </p>
        </div>

        {/* Acciones */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
          <Button
            type="button"
            variant="outline"
            size="default"
            onClick={closeTop}
      disabled={isSubmitting || crearTestimonio.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="default"
            size="default"
            disabled={isSubmitting || remaining < 0}
            className="gap-2"
          >
            <Send className="size-4" />
            <span>Enviar testimonio</span>
          </Button>
        </div>
      </form>
    </PanelShell>
  );
}
