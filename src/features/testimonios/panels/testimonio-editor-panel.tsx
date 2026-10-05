"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PanelShell } from "@/core/panels/panel-shell";
import { usePanels } from "@/core/panels/panel-store";
import { useCrearTestimonio, useEditarTestimonio, useTestimonioGestionDetalle } from "../services/use-testimonios-queries";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Checkbox } from "@/shared/ui/checkbox";
import { ShieldCheck, HeartHandshake } from "lucide-react";

export function TestimonioEditorPanel({ entryKey, props }: { entryKey: string; props?: { testimonioId?: string } }) {
  const { closeTop } = usePanels();
  const testimonioId = props?.testimonioId;
  const detalle = useTestimonioGestionDetalle(testimonioId ?? "");
  const crearMutation = useCrearTestimonio();
  const editarMutation = useEditarTestimonio();

  const [edicion, setEdicion] = useState<{
    nombreAutor?: string;
    organizacion?: string;
    titulo?: string;
    relato?: string;
    urlFoto?: string;
    etnia?: string;
    esVictima?: boolean;
  }>({});
  const nombreAutor = edicion.nombreAutor ?? detalle.data?.nombre_autor ?? "";
  const organizacion = edicion.organizacion ?? detalle.data?.organizacion_comunitaria ?? "";
  const titulo = edicion.titulo ?? detalle.data?.titulo ?? "";
  const relato = edicion.relato ?? detalle.data?.relato ?? "";
  const urlFoto = edicion.urlFoto ?? detalle.data?.url_foto ?? "";
  const etnia = edicion.etnia ?? String(detalle.data?.metadatos_enfoque?.etnia ?? "");
  const esVictima = edicion.esVictima ?? detalle.data?.metadatos_enfoque?.ley_1448_victima === true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombreAutor.trim() || !titulo.trim() || !relato.trim()) {
      toast.error("Campos obligatorios", {
        description: "Por favor diligencia el nombre, título y relato de tu testimonio.",
      });
      return;
    }

    if (relato.trim().length < 15) {
      toast.error("Relato muy corto", {
        description: "El relato testimonial debe contener al menos 15 caracteres.",
      });
      return;
    }

    try {
      const datos = {
        nombre_autor: nombreAutor.trim(),
        organizacion_comunitaria: organizacion.trim() || null,
        titulo: titulo.trim(),
        relato: relato.trim(),
        url_foto: urlFoto.trim() || null,
        metadatos_enfoque: {
          etnia: etnia || "ninguna",
          ley_1448_victima: esVictima,
          canal_origen: "portal_ciudadano_web",
        },
      };

      if (testimonioId) {
        await editarMutation.mutateAsync({ id: testimonioId, datos });
      } else {
        await crearMutation.mutateAsync(datos);
      }

      toast.success(testimonioId ? "Testimonio actualizado" : "Testimonio registrado", {
        description: testimonioId
          ? "Los cambios editoriales se guardaron desde la plataforma."
          : "Tu relato ha sido enviado a curaduría institucional y se publicará tras su revisión ética.",
      });
      closeTop();
    } catch {
      toast.error("Error al enviar", {
        description:
          "No fue posible registrar el testimonio. Asegúrate de tener una sesión cívica activa.",
      });
    }
  };

  return (
    <PanelShell
      entryKey={entryKey}
      title={testimonioId ? "Editar Testimonio Comunitario" : "Compartir Testimonio Comunitario"}
      subtitle={testimonioId ? "Edición institucional del relato comunitario" : "Memoria viva y aportes a la seguridad humana de Cartagena"}
      crumbs={[{ label: "Memoria Social" }, { label: testimonioId ? "Editar testimonio" : "Nuevo Testimonio" }]}
      onClose={closeTop}
      onCloseToKey={closeTop}
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {detalle.isLoading && testimonioId && <p role="status" className="text-sm text-text-secondary">Cargando testimonio…</p>}
        {detalle.isError && testimonioId && <p role="alert" className="text-sm text-danger">No se pudo cargar el testimonio para editar.</p>}
        <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] flex items-start gap-3">
          <HeartHandshake className="size-5 text-[var(--ember)] shrink-0 mt-0.5" />
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Tu voz construye la historia colectiva de la ciudad. Conforme a la Ley 1757 de 2015,
            todo testimonio pasa por curaduría ética antes de integrarse a la memoria social distrital.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="nombre" className="text-xs font-medium text-[var(--text-primary)]">
            Nombre y Apellidos <span className="text-[var(--ember)]">*</span>
          </Label>
          <Input
            id="nombre"
            placeholder="Ej. Ana Rosa Gómez"
            value={nombreAutor}
            onChange={(e) => setEdicion((actual) => ({ ...actual, nombreAutor: e.target.value }))}
            required
            className="text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="organizacion" className="text-xs font-medium text-[var(--text-primary)]">
            Organización Comunitaria, JAC o Colectivo (Opcional)
          </Label>
          <Input
            id="organizacion"
            placeholder="Ej. Junta de Acción Comunal Sector 19 de Febrero"
            value={organizacion}
            onChange={(e) => setEdicion((actual) => ({ ...actual, organizacion: e.target.value }))}
            className="text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="titulo" className="text-xs font-medium text-[var(--text-primary)]">
            Título o Lema del Testimonio <span className="text-[var(--ember)]">*</span>
          </Label>
          <Input
            id="titulo"
            placeholder="Ej. La defensa de nuestros manglares y la pesca artesanal"
            value={titulo}
            onChange={(e) => setEdicion((actual) => ({ ...actual, titulo: e.target.value }))}
            required
            className="text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <Label htmlFor="relato" className="text-xs font-medium text-[var(--text-primary)]">
              Relato Testimonial o Memoria Social <span className="text-[var(--ember)]">*</span>
            </Label>
            <span className="text-[10px] text-[var(--text-secondary)]">
              {relato.length} caracteres
            </span>
          </div>
          <Textarea
            id="relato"
            rows={5}
            placeholder="Narra tu experiencia comunitaria, vivencias del territorio o propuestas prioritarias para la política pública..."
            value={relato}
            onChange={(e) => setEdicion((actual) => ({ ...actual, relato: e.target.value }))}
            required
            className="text-xs leading-relaxed"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="foto" className="text-xs font-medium text-[var(--text-primary)]">
            URL de Fotografía Comunitaria o de Territorio (Opcional)
          </Label>
          <Input
            id="foto"
            placeholder="https://..."
            value={urlFoto}
            onChange={(e) => setEdicion((actual) => ({ ...actual, urlFoto: e.target.value }))}
            className="text-xs"
          />
        </div>

        <div className="pt-2 border-t border-[var(--border)] space-y-3">
          <span className="block text-xs font-semibold text-[var(--text-primary)]">
            Enfoque Diferencial y Poblacional
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="etnia" className="text-[11px] text-[var(--text-secondary)]">
                Pertenencia Étnica
              </Label>
              <Select value={etnia} onValueChange={(value) => setEdicion((actual) => ({ ...actual, etnia: value }))}>
                <SelectTrigger id="etnia" className="w-full text-xs">
                  <SelectValue placeholder="No declara / General" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ninguna">No declara / General</SelectItem>
                  <SelectItem value="afrodescendiente">Negra / Afrocolombiana / Palenquera</SelectItem>
                  <SelectItem value="raizales">Raizal de San Andrés y Providencia</SelectItem>
                  <SelectItem value="indigena">Indígena (Cabildos de Cartagena)</SelectItem>
                  <SelectItem value="rom">Rrom / Gitano</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 pt-4">
              <Checkbox
                id="victima"
                checked={esVictima}
                onCheckedChange={(checked) => setEdicion((actual) => ({ ...actual, esVictima: checked === true }))}
              />
              <Label htmlFor="victima" className="text-xs text-[var(--text-primary)] cursor-pointer">
                Víctima del conflicto armado (Ley 1448)
              </Label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
          <Button type="button" variant="outline" size="sm" onClick={closeTop}>
            Cancelar
          </Button>
          <Button
            type="submit"
            size="sm"
            variant="ember"
            disabled={crearMutation.isPending || editarMutation.isPending || (Boolean(testimonioId) && (detalle.isLoading || detalle.isError))}
          >
            {crearMutation.isPending || editarMutation.isPending ? (
              "Guardando..."
            ) : (
              <>
                <ShieldCheck className="mr-1.5 size-4" />
                {testimonioId ? "Guardar cambios" : "Registrar Testimonio"}
              </>
            )}
          </Button>
        </div>
      </form>
    </PanelShell>
  );
}
