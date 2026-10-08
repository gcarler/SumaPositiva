"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { PanelShell } from "@/core/panels/panel-shell";
import { usePanels } from "@/core/panels/panel-store";
import { ApiError } from "@/core/http/api-client";
import {
  useCrearTestimonio,
  useEditarTestimonio,
  useTestimonioGestionDetalle,
  useResumenTestimonios,
  TESTIMONIOS_KEYS,
} from "../services/use-testimonios-queries";
import { useDimensiones } from "@/features/politicas/services/use-politicas-queries";
import type { TestimonioCrearPeticion } from "../models/testimonio";
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
import { ShieldCheck, HeartHandshake, MapPin, Tag, RefreshCw } from "lucide-react";

interface TestimonioEditorPanelProps {
  entryKey: string;
  props?: {
    testimonioId?: string;
  };
}

const TERRITORIOS_FALLBACK = [
  { id: "01a0f5dd-5391-7c5d-b29f-c020e56d7adf", nombre: "Localidad 1: Histórica y del Caribe Norte" },
  { id: "01a0f5dd-5391-760c-96f0-d919dd88e7c6", nombre: "Localidad 2: De la Virgen y Turística" },
  { id: "01a0f5dd-5391-786c-9f9c-ded0e6dbb0e2", nombre: "Localidad 3: Industrial y de la Bahía" },
  { id: "01a0f5dd-5392-79e4-b09a-1d1f26e7712f", nombre: "La Boquilla (Zona Rural)" },
  { id: "01a0f5dd-5393-77af-b2f5-96ea12961d85", nombre: "Isla de Barú" },
  { id: "01a0f5dd-5393-7f9a-ad8d-7c466f379695", nombre: "Isla de Tierra Bomba" },
  { id: "01a0f5dd-5393-7fc0-b083-fa4b8c52cc18", nombre: "Bayunca" },
  { id: "01a0f5dd-5393-7a90-9e85-76997d5fdd4c", nombre: "Pasacaballos" },
  { id: "01a0f5dd-5395-72f4-88ab-c3d1f39baa6c", nombre: "Centro Histórico y San Diego" },
  { id: "01a0f5dd-5395-703a-b8ed-f5150954087f", nombre: "Getsemaní" },
  { id: "01a0f5dd-5395-7395-8dd6-c057908e293b", nombre: "El Pozón" },
  { id: "01a0f5dd-5394-71d5-b6dc-52e3a9690f90", nombre: "Olaya Herrera" },
  { id: "01a0f5dd-5395-7ec2-ace1-a713ddc32ce9", nombre: "Nelson Mandela" },
];

const DIMENSIONES_FALLBACK = [
  { id: "01a0f5dd-532d-7da9-9394-0f99be53424e", nombre: "Seguridad Económica" },
  { id: "01a0f5dd-532e-7906-90af-31d884eba586", nombre: "Seguridad Alimentaria" },
  { id: "01a0f5dd-532e-7910-8a72-9b61f5ad2a24", nombre: "Seguridad en Salud" },
  { id: "01a0f5dd-532e-711b-9323-99a7ec277282", nombre: "Seguridad Ambiental" },
  { id: "01a0f5dd-532e-7bbb-aecb-e840aaed5d99", nombre: "Seguridad Personal" },
  { id: "01a0f5dd-532e-7a59-8f56-f5dbba0cae99", nombre: "Seguridad Comunitaria" },
  { id: "01a0f5dd-532e-78f9-9b6a-87d6e649c6df", nombre: "Seguridad Política" },
];

export function TestimonioEditorPanel({ entryKey, props }: TestimonioEditorPanelProps) {
  const { closeTop } = usePanels();
  const queryClient = useQueryClient();
  const testimonioId = props?.testimonioId;
  const esEdicion = Boolean(testimonioId);

  const detalle = useTestimonioGestionDetalle(testimonioId ?? "");
  const resumen = useResumenTestimonios();
  const dimensionesQuery = useDimensiones();

  const crearMutation = useCrearTestimonio();
  const editarMutation = useEditarTestimonio();

  // Opciones combinadas remotas con fallback
  const territoriosOpciones = (resumen.data?.por_territorio && resumen.data.por_territorio.length > 0)
    ? resumen.data.por_territorio.map((t) => ({ id: t.territorio_id, nombre: t.nombre }))
    : TERRITORIOS_FALLBACK;

  const dimensionesOpciones = (dimensionesQuery.data && dimensionesQuery.data.length > 0)
    ? dimensionesQuery.data.map((d) => ({ id: d.id, nombre: d.nombre }))
    : DIMENSIONES_FALLBACK;

  // Estado local para mutaciones con inicialización reactiva
  const [edicion, setEdicion] = useState<{
    nombreAutor?: string;
    organizacion?: string;
    titulo?: string;
    relato?: string;
    urlFoto?: string;
    etnia?: string;
    esVictima?: boolean;
    territorioId?: string;
    dimensionId?: string;
  }>({});

  const datosServidor = detalle.data;
  const nombreAutor = edicion.nombreAutor ?? (esEdicion ? (datosServidor?.nombre_autor ?? "") : "");
  const organizacion = edicion.organizacion ?? (esEdicion ? (datosServidor?.organizacion_comunitaria ?? "") : "");
  const titulo = edicion.titulo ?? (esEdicion ? (datosServidor?.titulo ?? "") : "");
  const relato = edicion.relato ?? (esEdicion ? (datosServidor?.relato ?? "") : "");
  const urlFoto = edicion.urlFoto ?? (esEdicion ? (datosServidor?.url_foto ?? "") : "");
  const etnia = edicion.etnia ?? (esEdicion ? String(datosServidor?.metadatos_enfoque?.etnia ?? "ninguna") : "ninguna");
  const esVictima = edicion.esVictima ?? (esEdicion ? (datosServidor?.metadatos_enfoque?.ley_1448_victima === true) : false);
  const territorioId = edicion.territorioId ?? (esEdicion ? (datosServidor?.territorio_id ?? "ninguno") : "ninguno");
  const dimensionId = edicion.dimensionId ?? (esEdicion ? (datosServidor?.dimension_id ?? "ninguna") : "ninguna");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombreAutor.trim() || !titulo.trim() || !relato.trim()) {
      toast.error("Campos obligatorios requeridos", {
        description: "Por favor diligencia el nombre, título y relato del testimonio.",
      });
      return;
    }

    if (relato.trim().length < 15) {
      toast.error("Relato demasiado corto", {
        description: "El relato testimonial debe contener al menos 15 caracteres.",
      });
      return;
    }

    try {
      const payload: TestimonioCrearPeticion = {
        nombre_autor: nombreAutor.trim(),
        organizacion_comunitaria: organizacion.trim() || null,
        territorio_id: territorioId && territorioId !== "ninguno" ? territorioId : null,
        dimension_id: dimensionId && dimensionId !== "ninguna" ? dimensionId : null,
        titulo: titulo.trim(),
        relato: relato.trim(),
        url_foto: urlFoto.trim() || null,
        metadatos_enfoque: {
          etnia: etnia || "ninguna",
          ley_1448_victima: esVictima,
          canal_origen: "plataforma_administrativa",
        },
      };

      if (testimonioId) {
        await editarMutation.mutateAsync({
          id: testimonioId,
          datos: {
            ...payload,
            metadatos_enfoque: payload.metadatos_enfoque ?? {},
          },
        });
      } else {
        await crearMutation.mutateAsync(payload);
      }

      // Invalidación completa de queries de testimonios para actualización instantánea
      await queryClient.invalidateQueries({ queryKey: TESTIMONIOS_KEYS.all });
      await queryClient.invalidateQueries({ queryKey: TESTIMONIOS_KEYS.resumen });
      await queryClient.invalidateQueries({ queryKey: ["testimonios", "gestion"] });
      await queryClient.invalidateQueries({ queryKey: ["testimonios", "publicos"] });

      toast.success(
        testimonioId
          ? "Testimonio actualizado correctamente"
          : "Testimonio registrado exitosamente",
        {
          description: testimonioId
            ? "Los cambios editoriales fueron persistidos en la base de datos distrital."
            : "El nuevo testimonio ha sido registrado en la plataforma institucional.",
        }
      );
      closeTop();
    } catch (error: unknown) {
      const mensaje = error instanceof ApiError
        ? error.message
        : error instanceof Error
        ? error.message
        : "Ocurrió un error al persistir el testimonio en el servidor.";

      toast.error(testimonioId ? "Error al actualizar testimonio" : "Error al registrar testimonio", {
        description: mensaje,
      });
    }
  };

  const isSaving = crearMutation.isPending || editarMutation.isPending;

  return (
    <PanelShell
      entryKey={entryKey}
      title={esEdicion ? "Editar Testimonio Comunitario" : "Registrar Nuevo Testimonio"}
      subtitle={
        esEdicion
          ? "Edición institucional del relato comunitario y memoria viva"
          : "Registro y sistematización de testimonios territoriales de Cartagena"
      }
      crumbs={[
        { label: "Gestión de Testimonios" },
        { label: esEdicion ? "Editar testimonio" : "Nuevo testimonio" },
      ]}
      onClose={closeTop}
      onCloseToKey={closeTop}
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {/* Aviso de carga cuando es edición */}
        {esEdicion && detalle.isLoading && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 text-xs text-[var(--text-secondary)] flex items-center gap-2">
            <RefreshCw className="size-4 animate-spin text-[var(--ember)]" />
            <span>Cargando datos del testimonio desde el servidor...</span>
          </div>
        )}

        {/* Alerta de error no bloqueante con botón de reintento */}
        {esEdicion && detalle.isError && (
          <div className="rounded-xl border border-danger/30 bg-danger/10 p-3.5 text-xs text-danger flex items-center justify-between gap-3">
            <span>No se pudo cargar el testimonio desde el servidor. Puedes reintentar o diligenciar los datos manualmente.</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void detalle.refetch()}
              className="h-7 text-xs border-danger/40 text-danger hover:bg-danger/20"
            >
              Reintentar
            </Button>
          </div>
        )}

        {/* Encuadre normativo y ético */}
        <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] flex items-start gap-3">
          <HeartHandshake className="size-5 text-[var(--ember)] shrink-0 mt-0.5" />
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            La memoria colectiva consolida la historia y necesidades prioritarias del territorio. Conforme a la
            Ley Estatutaria 1757 de 2015, los testimonios aportan insumos cualitativos a las 7 Dimensiones de la Política Pública de Seguridad Humana.
          </p>
        </div>

        {/* Fila 1: Autor y Organización */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="nombre" className="text-xs font-medium text-[var(--text-primary)]">
              Nombre y Apellidos del Autor <span className="text-[var(--ember)]">*</span>
            </Label>
            <Input
              id="nombre"
              placeholder="Ej. Ana Rosa Gómez Mendoza"
              value={nombreAutor}
              onChange={(e) => setEdicion((actual) => ({ ...actual, nombreAutor: e.target.value }))}
              required
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="organizacion" className="text-xs font-medium text-[var(--text-primary)]">
              Organización Comunitaria, JAC o Colectivo
            </Label>
            <Input
              id="organizacion"
              placeholder="Ej. JAC Getsemaní / Colectivo de Mujeres"
              value={organizacion}
              onChange={(e) => setEdicion((actual) => ({ ...actual, organizacion: e.target.value }))}
              className="text-xs"
            />
          </div>
        </div>

        {/* Fila 2: Título o Lema */}
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

        {/* Fila 3: Territorio y Dimensión ONU */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <MapPin className="size-3.5 text-[var(--ember)]" />
              <Label htmlFor="territorio" className="text-xs font-medium text-[var(--text-primary)]">
                Territorio Distrital
              </Label>
            </div>
            <Select
              value={territorioId}
              onValueChange={(value) => setEdicion((actual) => ({ ...actual, territorioId: value }))}
            >
              <SelectTrigger id="territorio" className="w-full text-xs">
                <SelectValue placeholder="Selecciona un territorio distrital" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ninguno">Sin territorio específico / Todo el Distrito</SelectItem>
                {territoriosOpciones.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Tag className="size-3.5 text-[var(--ember)]" />
              <Label htmlFor="dimension" className="text-xs font-medium text-[var(--text-primary)]">
                Dimensión de Seguridad Humana
              </Label>
            </div>
            <Select
              value={dimensionId}
              onValueChange={(value) => setEdicion((actual) => ({ ...actual, dimensionId: value }))}
            >
              <SelectTrigger id="dimension" className="w-full text-xs">
                <SelectValue placeholder="Selecciona una dimensión" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ninguna">Sin dimensión específica / Transversal</SelectItem>
                {dimensionesOpciones.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Fila 4: Relato Testimonial */}
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
            placeholder="Narra las vivencias del territorio, problemáticas sentidas o propuestas prioritarias para la política pública distrital..."
            value={relato}
            onChange={(e) => setEdicion((actual) => ({ ...actual, relato: e.target.value }))}
            required
            className="text-xs leading-relaxed"
          />
        </div>

        {/* Fila 5: URL de Foto */}
        <div className="space-y-1.5">
          <Label htmlFor="foto" className="text-xs font-medium text-[var(--text-primary)]">
            URL de Fotografía Comunitaria o de Territorio (Opcional)
          </Label>
          <Input
            id="foto"
            placeholder="https://images.unsplash.com/... o enlace de fotografía"
            value={urlFoto}
            onChange={(e) => setEdicion((actual) => ({ ...actual, urlFoto: e.target.value }))}
            className="text-xs"
          />
        </div>

        {/* Fila 6: Enfoque Diferencial */}
        <div className="pt-2 border-t border-[var(--border)] space-y-3">
          <span className="block text-xs font-semibold text-[var(--text-primary)]">
            Enfoque Diferencial y Poblacional
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="etnia" className="text-[11px] text-[var(--text-secondary)]">
                Pertenencia Étnica
              </Label>
              <Select value={etnia} onValueChange={(value) => setEdicion((actual) => ({ ...actual, etnia: value }))}>
                <SelectTrigger id="etnia" className="w-full text-xs">
                  <SelectValue placeholder="No declara / General" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ninguna">No declara / Población General</SelectItem>
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
                Víctima del conflicto armado (Ley 1448 de 2011)
              </Label>
            </div>
          </div>
        </div>

        {/* Acciones de Guardado */}
        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
          <Button type="button" variant="outline" size="sm" onClick={closeTop}>
            Cancelar
          </Button>
          <Button
            type="submit"
            size="sm"
            variant="ember"
            disabled={isSaving || (esEdicion && detalle.isLoading)}
          >
            {isSaving ? (
              "Guardando..."
            ) : (
              <>
                <ShieldCheck className="mr-1.5 size-4" />
                {esEdicion ? "Guardar cambios" : "Registrar Testimonio"}
              </>
            )}
          </Button>
        </div>
      </form>
    </PanelShell>
  );
}
