"use client";

import { useState } from "react";
import {
  Check,
  RotateCcw,
  Sliders,
  ExternalLink,
  MapPin,
  Play,
  Pause,
  Link as LinkIcon,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Switch } from "@/shared/ui/switch";
import {
  useHeroConfigStore,
  HERO_IMAGE_OPTIONS,
  HERO_DEFAULT_IMAGE_ID,
  resolverImagenHero,
  type HeroImageOption,
} from "@/features/politicas/state/hero-store";
import {
  HERO_PAGES_CONFIG,
  type HeroPageConfig,
} from "@/features/politicas/data/hero-pages.data";

export interface GestorHerosPlataformaProps {
  editar?: boolean;
  className?: string;
}

interface EspacioPublico {
  key: string;
  nombre: string;
  ruta: string;
  descripcion: string;
  configDefecto: HeroPageConfig;
}

const ESPACIOS_PUBLICOS: EspacioPublico[] = [
  {
    key: "home",
    nombre: "Portada Principal",
    ruta: "/",
    descripcion: "Carrusel cinematográfico inmersivo de los 5 frentes cívicos de Cartagena.",
    configDefecto: HERO_PAGES_CONFIG.home,
  },
  {
    key: "explorar",
    nombre: "Líneas y Gobernanza",
    ruta: "/explorar",
    descripcion: "Encabezado estratégico de las líneas temáticas y flujo de inversión distrital.",
    configDefecto: HERO_PAGES_CONFIG.explorar,
  },
  {
    key: "mesas",
    nombre: "Mesas de Diálogo",
    ruta: "/mesas",
    descripcion: "Cabecera territorial de concertación cívica para las 33 mesas distritales.",
    configDefecto: HERO_PAGES_CONFIG.mesas,
  },
  {
    key: "geovisor",
    nombre: "Geovisor Cartográfico",
    ruta: "/geovisor",
    descripcion: "Banner ultracompacto que resguarda la visibilidad del mapa interactivo y capas SIG.",
    configDefecto: HERO_PAGES_CONFIG.geovisor,
  },
  {
    key: "noticias",
    nombre: "Noticias y Novedades",
    ruta: "/noticias",
    descripcion: "Banner institucional para la sección de actualidad, avances y comunicados.",
    configDefecto: HERO_PAGES_CONFIG.noticias,
  },
  {
    key: "testimonios",
    nombre: "Voces y Testimonios",
    ruta: "/testimonios",
    descripcion: "Cabecera comunitaria con relatos ciudadanos y memoria social territorial.",
    configDefecto: HERO_PAGES_CONFIG.testimonios,
  },
  {
    key: "fases",
    nombre: "Diagnóstico y Fases",
    ruta: "/fases",
    descripcion: "Encabezado institucional metodológico con indicadores clave de gobernanza.",
    configDefecto: HERO_PAGES_CONFIG.fases,
  },
  {
    key: "barrio",
    nombre: "Modo Barrio Popular",
    ruta: "/barrio",
    descripcion: "Banner compacto mobile-first para reporte y participación comunitaria directa.",
    configDefecto: HERO_PAGES_CONFIG.barrio,
  },
  {
    key: "rendicion",
    nombre: "Veeduría y Rendición",
    ruta: "/plataforma/rendicion",
    descripcion: "Cabecera de concertación ciudadana, control social y actas de fe pública.",
    configDefecto: HERO_PAGES_CONFIG.rendicion,
  },
];

export function GestorHerosPlataforma({
  editar = true,
  className,
}: GestorHerosPlataformaProps) {
  const [espacioActivoKey, setEspacioActivoKey] = useState<string>("home");
  const [urlPersonalizada, setUrlPersonalizada] = useState<string>("");

  const {
    heroImageId,
    opacidad,
    modoCarrusel,
    intervaloSegundos,
    pausado,
    pageImages,
    setHeroImageId,
    setOpacidad,
    setModoCarrusel,
    setIntervaloSegundos,
    togglePausa,
    setPageImage,
    resetPageImage,
    resetAllPageImages,
  } = useHeroConfigStore();

  const espacioActivo =
    ESPACIOS_PUBLICOS.find((e) => e.key === espacioActivoKey) ??
    ESPACIOS_PUBLICOS[0];

  /* Imagen actualmente asignada al espacio seleccionado */
  const customKey =
    espacioActivo.key === "home"
      ? heroImageId
      : pageImages[espacioActivo.key];

  const imagenActivaSrc = customKey
    ? resolverImagenHero(customKey)
    : espacioActivo.configDefecto.imagenFondo;

  const esPersonalizada =
    espacioActivo.key === "home"
      ? heroImageId !== HERO_DEFAULT_IMAGE_ID
      : Boolean(pageImages[espacioActivo.key]);

  const esMinimalista =
    customKey === "ninguna" || (heroImageId === "ninguna" && espacioActivo.key === "home");

  /* Manejadores de acción */
  const handleSeleccionarImagen = (opcion: HeroImageOption) => {
    if (!editar) return;

    if (espacioActivo.key === "home") {
      setHeroImageId(opcion.id);
      setPageImage("home", opcion.id);
    } else {
      setPageImage(espacioActivo.key, opcion.id);
    }

    toast.success(
      opcion.id === "ninguna"
        ? `Fondo minimalista activado en ${espacioActivo.nombre}`
        : `Fotografía "${opcion.titulo}" asignada a ${espacioActivo.nombre}`
    );
  };

  const handleAplicarUrlPersonalizada = () => {
    if (!editar || !urlPersonalizada.trim()) return;
    const url = urlPersonalizada.trim();

    if (espacioActivo.key === "home") {
      setHeroImageId(url);
      setPageImage("home", url);
    } else {
      setPageImage(espacioActivo.key, url);
    }

    setUrlPersonalizada("");
    toast.success(`Imagen personalizada aplicada a ${espacioActivo.nombre}`);
  };

  const handleRestaurarEspacio = () => {
    if (!editar) return;
    if (espacioActivo.key === "home") {
      setHeroImageId(HERO_DEFAULT_IMAGE_ID);
      resetPageImage("home");
    } else {
      resetPageImage(espacioActivo.key);
    }
    toast.success(`Imagen restablecida a la oficial para ${espacioActivo.nombre}`);
  };

  const handleRestablecerTodo = () => {
    if (!editar) return;
    if (confirm("¿Restablecer la configuración de todas las imágenes a sus valores iniciales?")) {
      resetAllPageImages();
      setOpacidad(60);
      setModoCarrusel(true);
      setIntervaloSegundos(7);
      toast.success("Todos los Heros territoriales han sido restablecidos a sus valores de fábrica");
    }
  };

  return (
    <div className={`space-y-6 ${className ?? ""}`} data-testid="gestor-heros-plataforma">
      {/* ================= 1. NAVEGACIÓN ENTRE ESPACIOS PÚBLICOS ================= */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
            Espacio Público a Gestionar
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!editar}
            onClick={handleRestablecerTodo}
            className="h-7 text-xs text-[var(--text-tertiary)] hover:text-[var(--danger)] gap-1"
          >
            <RotateCcw className="size-3" />
            Restablecer Todos
          </Button>
        </div>

        <div
          className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5"
          role="tablist"
          aria-label="Espacios públicos del sistema"
        >
          {ESPACIOS_PUBLICOS.map((espacio) => {
            const esSeleccionado = espacio.key === espacioActivoKey;
            const tieneOverride =
              espacio.key === "home"
                ? heroImageId !== HERO_DEFAULT_IMAGE_ID
                : Boolean(pageImages[espacio.key]);

            return (
              <Button
                key={espacio.key}
                type="button"
                role="tab"
                aria-selected={esSeleccionado}
                variant={esSeleccionado ? "default" : "outline"}
                size="sm"
                onClick={() => setEspacioActivoKey(espacio.key)}
                className={`h-auto min-h-12 flex flex-col items-start justify-center p-2.5 text-left transition-all ${
                  esSeleccionado
                    ? "border-[var(--border-strong)] shadow-xs"
                    : "border-[var(--border)] bg-[var(--surface-0)] hover:bg-[var(--surface-2)]"
                }`}
              >
                <div className="flex w-full items-center justify-between gap-1">
                  <span className="text-xs font-bold truncate">
                    {espacio.nombre}
                  </span>
                  {tieneOverride && (
                    <span
                      className="size-1.5 rounded-full bg-[var(--ember)]"
                      title="Imagen personalizada"
                    />
                  )}
                </div>
                <span className="font-mono text-[10px] opacity-75 truncate">
                  {espacio.ruta}
                </span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* ================= 2. FICHA DEL ESPACIO ACTIVO Y PREVIEW ================= */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-4 sm:p-5 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--border)] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                {espacioActivo.nombre}
              </h3>
              <Badge variant="outline" className="text-[10px] uppercase font-mono">
                {espacioActivo.configDefecto.altura}
              </Badge>
              {esPersonalizada ? (
                <Badge variant="warning" className="text-[10px]">
                  Personalizada
                </Badge>
              ) : (
                <Badge variant="success" className="text-[10px]">
                  Catálogo Oficial
                </Badge>
              )}
            </div>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              {espacioActivo.descripcion}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {esPersonalizada && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!editar}
                onClick={handleRestaurarEspacio}
                className="h-8 text-xs gap-1 text-[var(--text-secondary)]"
              >
                <RotateCcw className="size-3.5" />
                Restaurar oficial
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              asChild
              className="h-8 text-xs text-[var(--ember)] hover:text-[var(--ember)]"
            >
              <a href={espacioActivo.ruta} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1.5 size-3.5" />
                Ver en vivo
              </a>
            </Button>
          </div>
        </div>

        {/* ================= 3. LIVE MINI-PREVIEW DEL BANNER ================= */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
            Previsualización en Tiempo Real
          </span>
          <div
            className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 sm:p-6 min-h-[7.5rem] flex flex-col justify-center"
            data-testid="live-banner-preview"
          >
            {/* Imagen simulada */}
            {imagenActivaSrc && !esMinimalista && (
              <div
                className="pointer-events-none absolute inset-0 select-none overflow-hidden"
                aria-hidden="true"
              >
                <img
                  src={imagenActivaSrc}
                  alt=""
                  className="h-full w-full object-cover object-center"
                  style={{ opacity: Math.max(0.75, (opacidad ?? 80) / 100) }}
                />
              </div>
            )}

            {/* Viñeta adaptativa de alta visibilidad */}
            <div
              className="pointer-events-none absolute inset-0 z-[1] select-none bg-gradient-to-r from-[var(--surface-0)]/85 via-[var(--surface-0)]/40 to-transparent"
              aria-hidden="true"
            />
            <div
              className="bg-dotgrid pointer-events-none absolute inset-0 z-[2] opacity-20"
              aria-hidden="true"
            />

            {/* Contenido en vivo */}
            <div className="relative z-10 space-y-1.5 max-w-xl">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-strong)] bg-[var(--surface-2)]/90 px-2 py-0.5 text-[10px] font-semibold text-[var(--ember)]">
                  <MapPin className="size-3 text-[var(--ember)]" />
                  <span>{espacioActivo.configDefecto.ubicacionReal}</span>
                </span>
                <span className="text-[10px] text-[var(--text-secondary)]">
                  • {espacioActivo.configDefecto.badgeTexto}
                </span>
              </div>
              <h4 className="text-sm sm:text-base font-extrabold text-[var(--text-primary)] truncate">
                {espacioActivo.configDefecto.titulo}
              </h4>
              <p className="text-xs text-[var(--text-secondary)] line-clamp-1">
                {espacioActivo.configDefecto.subtitulo}
              </p>
            </div>
          </div>
        </div>

        {/* ================= 4. CONTROLES DEL CARRUSEL (SOLO HOME) ================= */}
        {espacioActivo.key === "home" && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  Rotación Automática del Carrusel (Portada)
                </span>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Alterna automáticamente las 5 fotografías territoriales de Cartagena en la portada.
                </p>
              </div>
              <Switch
                checked={modoCarrusel}
                onCheckedChange={(checked) => {
                  if (!editar) return;
                  setModoCarrusel(checked);
                  toast.success(
                    checked
                      ? "Carrusel automático activado en portada"
                      : "Carrusel automático pausado"
                  );
                }}
                disabled={!editar}
                aria-label="Activar modo carrusel automático"
              />
            </div>

            {modoCarrusel && (
              <div className="pt-2 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <span>Velocidad de cambio:</span>
                  <div className="flex items-center gap-1">
                    {[
                      { seg: 3, label: "3s" },
                      { seg: 5, label: "5s" },
                      { seg: 7, label: "7s (Oficial)" },
                      { seg: 10, label: "10s" },
                      { seg: 15, label: "15s" },
                    ].map((item) => (
                      <Button
                        key={item.seg}
                        type="button"
                        variant={intervaloSegundos === item.seg ? "default" : "outline"}
                        size="sm"
                        disabled={!editar}
                        onClick={() => {
                          setIntervaloSegundos(item.seg);
                          toast.success(`Intervalo de rotación fijado en ${item.seg} segundos`);
                        }}
                        className="h-6 px-2 text-[11px]"
                      >
                        {item.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!editar}
                  onClick={togglePausa}
                  className="h-6 px-2.5 text-[11px] gap-1"
                >
                  {pausado ? (
                    <>
                      <Play className="size-3 text-[var(--ember)]" />
                      <span>Reanudar</span>
                    </>
                  ) : (
                    <>
                      <Pause className="size-3 text-[var(--ember)]" />
                      <span>Pausar</span>
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ================= 5. CATÁLOGO DE FOTOGRAFÍAS TERRITORIALES ================= */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              Biblioteca de Fotografías Territoriales Oficiales
            </span>
            <span className="text-[11px] text-[var(--text-secondary)]">
              Haz clic sobre una imagen para asignarla a {espacioActivo.nombre}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {HERO_IMAGE_OPTIONS.map((opcion) => {
              const esActiva = customKey === opcion.id;
              const esNinguna = opcion.id === "ninguna";

              return (
                <div
                  key={opcion.id}
                  onClick={() => handleSeleccionarImagen(opcion)}
                  className={`group relative flex flex-col justify-between overflow-hidden rounded-xl border p-3 transition-all cursor-pointer ${
                    esActiva
                      ? "border-[var(--ember)] bg-[var(--surface-2)] ring-1 ring-[var(--ember)] shadow-xs"
                      : "border-[var(--border)] bg-[var(--surface-1)] hover:border-[var(--ember)]/50 hover:bg-[var(--surface-2)]/50"
                  } ${!editar ? "cursor-not-allowed opacity-75" : ""}`}
                >
                  <div className="space-y-2.5">
                    {/* Thumbnail */}
                    <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-2)]">
                      {esNinguna ? (
                        <div className="flex h-full w-full items-center justify-center bg-dotgrid p-3 text-center">
                          <span className="text-xs font-medium text-[var(--text-tertiary)]">
                            Solo retícula institucional
                          </span>
                        </div>
                      ) : (
                        <img
                          src={opcion.thumbnail || opcion.archivo}
                          alt={opcion.titulo}
                          className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                        />
                      )}

                      {esActiva && (
                        <div className="absolute right-2 top-2">
                          <Badge variant="success" className="shadow-xs font-medium text-[10px]">
                            <Check className="mr-1 size-3" />
                            Activa en {espacioActivo.nombre}
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Metadatos */}
                    <div>
                      <h4 className="text-xs font-bold text-[var(--text-primary)] truncate">
                        {opcion.titulo}
                      </h4>
                      <Badge variant="outline" className="mt-1 text-[9px] uppercase tracking-wider">
                        {opcion.enfoque}
                      </Badge>
                      <p className="mt-1 text-[11px] text-[var(--text-secondary)] line-clamp-2">
                        {opcion.descripcion}
                      </p>
                    </div>
                  </div>

                  {/* Botón de selección al pie */}
                  <div className="mt-3 pt-2.5 border-t border-[var(--border)] flex items-center justify-between">
                    <span className="text-[10px] text-[var(--text-tertiary)]">
                      {esActiva ? "Asignada actualmente" : "Clic para asignar"}
                    </span>
                    <Button
                      type="button"
                      variant={esActiva ? "default" : "outline"}
                      size="sm"
                      disabled={!editar}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSeleccionarImagen(opcion);
                      }}
                      className="h-6 text-[10px] px-2 font-medium"
                    >
                      {esActiva ? "Asignada" : "Asignar"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ================= 6. ASIGNACIÓN DE IMAGEN EXTERNA / URL ================= */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 space-y-2.5">
          <div className="flex items-center gap-2">
            <LinkIcon className="size-4 text-[var(--ember)]" />
            <span className="text-xs font-bold text-[var(--text-primary)]">
              Asignar Imagen Personalizada vía URL o Ruta Local
            </span>
          </div>
          <p className="text-[11px] text-[var(--text-secondary)]">
            Puedes vincular una fotografía externa o alojada en la plataforma (ej. `/images/...` o `https://...`) para {espacioActivo.nombre}.
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              type="text"
              value={urlPersonalizada}
              onChange={(e) => setUrlPersonalizada(e.target.value)}
              placeholder="https://ejemplo.gov.co/foto-comunitaria.webp o /images/..."
              disabled={!editar}
              className="text-xs flex-1"
            />
            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={!editar || !urlPersonalizada.trim()}
              onClick={handleAplicarUrlPersonalizada}
              className="text-xs h-9 shrink-0 gap-1.5"
            >
              <Check className="size-3.5" />
              Aplicar a {espacioActivo.nombre}
            </Button>
          </div>
        </div>
      </div>

      {/* ================= 7. CALIBRACIÓN GLOBAL DE INTENSIDAD (OPACIDAD) ================= */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-4 sm:p-5 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sliders className="size-4 text-[var(--ember)]" />
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Calibración Global de Intensidad Ambiental (Opacidad: {opacidad}%)
              </h3>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Ajusta la visibilidad de las imágenes en todos los Heros del portal. La viñeta semántica multicapa blinda el contraste institucional.
            </p>
          </div>

          <div className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1 text-xs text-[var(--success)]">
            <ShieldCheck className="size-3.5" />
            <span className="font-semibold text-[11px]">Certificado WCAG 2.1 AA</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[
            { valor: 40, etiqueta: "40% (Suave)" },
            { valor: 60, etiqueta: "60% (Medio)" },
            { valor: 80, etiqueta: "80% (Recomendado)" },
            { valor: 85, etiqueta: "85% (Vibrante)" },
            { valor: 95, etiqueta: "95% (Máximo)" },
          ].map((preset) => (
            <Button
              key={preset.valor}
              type="button"
              variant={opacidad === preset.valor ? "default" : "outline"}
              size="sm"
              disabled={!editar}
              onClick={() => {
                setOpacidad(preset.valor);
                toast.success(`Intensidad ambiental calibrada al ${preset.valor}%`);
              }}
              className="h-8 text-xs font-medium"
            >
              {preset.etiqueta}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
