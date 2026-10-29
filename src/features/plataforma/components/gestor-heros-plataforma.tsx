"use client";

import { useState, useEffect, useRef, type FormEvent, type ChangeEvent } from "react";
import {
  Check,
  RotateCcw,
  Sliders,
  ExternalLink,
  MapPin,
  Play,
  Pause,
  Plus,
  Trash2,
  ShieldCheck,
  Upload,
  Save,
  Loader2,
  ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/core/http/api-client";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { FormField } from "@/shared/ui/form-field";
import { Switch } from "@/shared/ui/switch";
import {
  useHeroConfigStore,
  esRutaImagenHero,
  obtenerDiapositivasHero,
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
    descripcion: "Carrusel territorial de las imágenes habilitadas en la biblioteca.",
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
    descripcion: "Cabecera territorial de concertación cívica para las 35 mesas distritales.",
    configDefecto: HERO_PAGES_CONFIG.mesas,
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
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [nuevaImagen, setNuevaImagen] = useState({
    titulo: "",
    descripcion: "",
    enfoque: "",
    archivo: "",
    thumbnail: "",
  });
  const [errores, setErrores] = useState<Partial<Record<keyof typeof nuevaImagen, string>>>({});
  const [errorFormulario, setErrorFormulario] = useState("");
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const [confirmacion, setConfirmacion] = useState<
    | { tipo: "eliminar"; id: string; titulo: string }
    | { tipo: "restaurar" }
    | null
  >(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const clientStore = useHeroConfigStore();
  const store = typeof window === "undefined" ? useHeroConfigStore.getState() : clientStore;
  const {
    imagenesCatalogo,
    slides,
    heroImageId,
    opacidad,
    modoCarrusel,
    intervaloSegundos,
    pausado,
    pageImages,
    guardandoServidor,
    cambiosPendientes,
    setHeroImageId,
    setOpacidad,
    setModoCarrusel,
    setIntervaloSegundos,
    togglePausa,
    setPageImage,
    resetPageImage,
    toggleHabilitarImagen,
    agregarImagen,
    eliminarImagen,
    eliminarSlide,
    sincronizarConServidor,
    guardarEnServidor,
    restaurarCatalogoOficial,
  } = store;

  /* Sincronización inicial con la configuración persistida en el servidor */
  useEffect(() => {
    void sincronizarConServidor?.();
  }, [sincronizarConServidor]);

  const espacioActivo =
    ESPACIOS_PUBLICOS.find((e) => e.key === espacioActivoKey) ??
    ESPACIOS_PUBLICOS[0];

  /* Diapositivas activas para la portada */
  const slidesPortada = obtenerDiapositivasHero(imagenesCatalogo, slides);

  /* Imagen actualmente asignada al espacio seleccionado */
  const customKey =
    espacioActivo.key === "home"
      ? heroImageId
      : pageImages[espacioActivo.key];

  const imagenActivaSrc = customKey
    ? resolverImagenHero(customKey, imagenesCatalogo)
    : resolverImagenHero(espacioActivo.configDefecto.imagenFondo, imagenesCatalogo);

  const esPersonalizada =
    espacioActivo.key === "home"
      ? heroImageId !== HERO_DEFAULT_IMAGE_ID
      : Boolean(pageImages[espacioActivo.key]);

  const esMinimalista =
    customKey === "ninguna" || (heroImageId === "ninguna" && espacioActivo.key === "home");

  /* El archivo se aloja en la plataforma; el catálogo conserva su ruta. */
  const handleSeleccionarArchivo = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!editar) return;
    const archivo = event.target.files?.[0];
    if (!archivo) return;
    event.target.value = "";
    if (!["image/png", "image/jpeg", "image/webp"].includes(archivo.type) || !/\.(png|jpe?g|webp)$/i.test(archivo.name)) {
      toast.error("Selecciona una imagen JPG, PNG o WebP.");
      return;
    }
    if (archivo.size > 8 * 1024 * 1024) {
      toast.error("La fotografía supera los 8 MB permitidos.");
      return;
    }
    setSubiendoArchivo(true);
    const datos = new FormData();
    datos.append("archivo", archivo);
    try {
      const respuesta = await apiFetch<unknown>("/politicas/heros/subir-imagen", {
        method: "POST", body: datos, retry: { retries: 0 },
      });
      if (!respuesta || typeof respuesta !== "object" || !("url" in respuesta) ||
        typeof respuesta.url !== "string" || !esRutaImagenHero(respuesta.url)) {
        throw new Error("El servidor no devolvió una ruta de imagen válida.");
      }
      const ruta = respuesta.url;
      setNuevaImagen((previa) => ({ ...previa, archivo: ruta, thumbnail: ruta,
        titulo: previa.titulo || archivo.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ") }));
      toast.success("Fotografía cargada. Completa sus datos y guárdala en la biblioteca.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar la fotografía.");
    } finally { setSubiendoArchivo(false); }
  };

  /* Manejadores de acción */
  const handleSeleccionarImagen = (opcion: HeroImageOption) => {
    if (!editar || !imagenesCatalogo.some((imagen) => imagen.id === opcion.id && imagen.habilitada)) return;

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

  const handleGuardarImagen = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editar) return;
    const problemas: typeof errores = {};
    if (!nuevaImagen.titulo.trim()) problemas.titulo = "Escribe el título de la imagen.";
    if (!nuevaImagen.descripcion.trim()) problemas.descripcion = "Escribe una descripción.";
    if (!nuevaImagen.enfoque.trim()) problemas.enfoque = "Escribe el enfoque o ubicación territorial.";
    if (!nuevaImagen.archivo.trim()) {
      problemas.archivo = "Carga un archivo de imagen o escribe una URL / ruta.";
    } else if (!esRutaImagenHero(nuevaImagen.archivo.trim())) {
      problemas.archivo = "Introduce una imagen válida (URL HTTPS, ruta /images/... o sube un archivo).";
    }
    if (nuevaImagen.thumbnail.trim() && !esRutaImagenHero(nuevaImagen.thumbnail.trim())) {
      problemas.thumbnail = "Introduce una miniatura válida o deja el campo vacío.";
    }
    setErrores(problemas);
    setErrorFormulario("");
    if (Object.keys(problemas).length) return;

    try {
      const imagen = agregarImagen(nuevaImagen);
      setNuevaImagen({ titulo: "", descripcion: "", enfoque: "", archivo: "", thumbnail: "" });
      setFormularioAbierto(false);
      toast.success(`Fotografía "${imagen.titulo}" agregada a la biblioteca`);
    } catch (error) {
      setErrorFormulario(error instanceof Error ? error.message : "No se pudo agregar la imagen.");
    }
  };

  const handleQuitarSlide = (slideId: string, titulo: string) => {
    if (!editar) return;
    try {
      eliminarSlide(slideId);
      toast.success(`Diapositiva "${titulo}" deshabilitada en el carrusel de portada`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo quitar la diapositiva.");
    }
  };

  const handleConfirmar = () => {
    if (!editar || !confirmacion) return;
    if (confirmacion.tipo === "restaurar") {
      restaurarCatalogoOficial();
      toast.success("Las seis imágenes del catálogo oficial se han restaurado.");
    } else {
      eliminarImagen(confirmacion.id);
      toast.success(`Fotografía "${confirmacion.titulo}" retirada de la biblioteca.`);
    }
    setConfirmacion(null);
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
    setConfirmacion({ tipo: "restaurar" });
  };

  const handleGuardarServidor = async () => {
    if (!editar) return;
    const ok = await guardarEnServidor();
    if (ok) {
      if (useHeroConfigStore.getState().cambiosPendientes) {
        toast.success("Se guardó la versión enviada. Quedan cambios locales por guardar.");
      } else {
        toast.success("Configuración de imágenes guardada en la plataforma.");
      }
    } else {
      toast.error("No se pudo conectar con el servidor. Los cambios se conservan en tu navegador.");
    }
  };

  return (
    <div className={`space-y-6 ${className ?? ""}`} data-testid="gestor-heros-plataforma">
      {/* ================= BARRA SUPERIOR CON BOTÓN GUARDAR ================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-3">
        <div className="flex items-center gap-2">
          <ImageIcon className="size-4 text-[var(--ember)]" />
          <span className="text-xs font-bold text-[var(--text-primary)]">
            Gestor de Identidad Visual y Heros Públicos
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={!editar || guardandoServidor}
            onClick={handleGuardarServidor}
            className="h-auto min-h-8 max-w-full gap-1.5 whitespace-normal text-xs font-semibold"
          >
            {guardandoServidor ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Guardando en Servidor...
              </>
            ) : (
              <>
                <Save className="size-3.5" />
                Guardar Cambios en la Plataforma
              </>
            )}
          </Button>
        </div>
      </div>

      <p role="status" className="text-xs text-text-secondary">
        {cambiosPendientes
          ? "Tienes cambios locales. Guarda los cambios en la plataforma para compartirlos con los visitantes."
          : "Las imágenes de la biblioteca se utilizan en la portada y en los espacios públicos."}
      </p>

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
                <span className="font-mono text-[10px] text-[var(--text-secondary)] truncate">
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
            <div className="flex flex-wrap items-center gap-2">
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

          <div className="flex flex-wrap items-center gap-2">
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

        {/* ================= 4. CONTROLES DEL CARRUSEL Y GESTIÓN DE DIAPOSITIVAS (SOLO HOME) ================= */}
        {espacioActivo.key === "home" && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  Rotación Automática del Carrusel (Portada)
                </span>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Alterna automáticamente las fotografías territoriales activas de Cartagena en la portada.
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
                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <span>Velocidad de cambio:</span>
                  <div className="flex flex-wrap items-center gap-1">
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
                          toast.success(`Intervalo fijado en ${item.seg} segundos`);
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

            {/* LISTADO DE DIAPOSITIVAS ACTIVAS DEL CARRUSEL (QUITAR / GESTIONAR) */}
            <div className="pt-3 border-t border-[var(--border)] space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)]">
                    Diapositivas Activas en el Carrusel Público ({slidesPortada.length})
                  </h4>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Las fotografías habilitadas se incluyen en la rotación. Puedes deshabilitarlas o agregar nuevas desde la biblioteca.
                  </p>
                </div>
              </div>

              <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
                {slidesPortada.map((slide, idx) => (
                  <div
                    key={slide.id}
                    className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-0)] p-2.5"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      <span className="font-mono text-[10px] font-bold text-[var(--ember)] bg-[var(--surface-2)] px-1.5 py-0.5 rounded">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <div className="size-10 shrink-0 overflow-hidden rounded border border-[var(--border)] bg-[var(--surface-2)]">
                        <img
                          src={slide.imagenFondo}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                          {slide.titulo}
                        </p>
                        <p className="text-[10px] text-[var(--text-secondary)] truncate">
                          {slide.ubicacionReal || slide.enfoque}
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={!editar}
                      onClick={() => handleQuitarSlide(slide.id, slide.titulo)}
                      aria-label={`Deshabilitar ${slide.titulo} en el carrusel`}
                      title="Deshabilitar esta imagen en el carrusel"
                      className="h-7 px-2 text-[11px] text-[var(--danger)] hover:bg-[var(--danger)]/10 shrink-0 gap-1"
                    >
                      <Trash2 className="size-3" />
                      <span className="hidden sm:inline">Deshabilitar</span>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= 5. BIBLIOTECA DE FOTOGRAFÍAS TERRITORIALES ================= */}
        <section className="space-y-3" aria-label="Biblioteca de imágenes hero">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-text-primary">
                Biblioteca de imágenes hero
              </h3>
              <p className="mt-1 text-xs text-text-secondary">
                Asigna una imagen habilitada a {espacioActivo.nombre} o agrega nuevas fotos desde tu equipo.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!editar}
                onClick={() => setConfirmacion({ tipo: "restaurar" })}
              >
                <RotateCcw className="size-3.5" aria-hidden="true" />
                Restaurar catálogo oficial
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!editar}
                aria-expanded={formularioAbierto}
                onClick={() => setFormularioAbierto((abierto) => !abierto)}
              >
                <Plus className="size-3.5" aria-hidden="true" />
                Nueva imagen hero
              </Button>
            </div>
          </div>

          {confirmacion && (
            <div
              role="group"
              aria-label="Confirmación de cambios del catálogo"
              className="space-y-3 rounded-xl border border-border bg-surface-2 p-4"
            >
              <p className="break-words text-sm text-text-primary">
                {confirmacion.tipo === "eliminar"
                  ? `¿Retirar "${confirmacion.titulo}" de la biblioteca? Los espacios que la utilizan pasarán a una imagen de respaldo.`
                  : "¿Restaurar las seis imágenes oficiales? Las imágenes agregadas se retirarán del catálogo."}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={!editar}
                  onClick={handleConfirmar}
                >
                  {confirmacion.tipo === "eliminar" ? "Confirmar retiro" : "Confirmar restauración"}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setConfirmacion(null)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* FORMULARIO PARA AGREGAR NUEVA IMAGEN / FOTOGRAFÍA */}
          {formularioAbierto && (
            <form
              onSubmit={handleGuardarImagen}
              noValidate
              aria-label="Nueva imagen hero"
              className="space-y-4 rounded-xl border border-border bg-surface-1 p-4"
            >
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                <h4 className="text-sm font-semibold text-text-primary">
                  Agregar Nueva Fotografía al Hero
                </h4>
                <Badge variant="outline" className="text-[10px]">
                  Soporta Subida de Archivo o URL
                </Badge>
              </div>

              {/* Botón para subir archivo desde el equipo */}
              <div className="rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-0)] p-4 text-center space-y-2">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  aria-label="Archivo de fotografía hero"
                  disabled={!editar || subiendoArchivo}
                  className="hidden"
                  onChange={handleSeleccionarArchivo}
                />
                <div className="flex flex-col items-center justify-center gap-1.5">
                  <div className="p-2 rounded-full bg-[var(--surface-2)]">
                    <Upload className="size-5 text-[var(--ember)]" />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!editar || subiendoArchivo}
                    onClick={() => fileInputRef.current?.click()}
                    className="h-auto min-h-9 max-w-full gap-1.5 whitespace-normal text-xs"
                  >
                    {subiendoArchivo ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        Cargando...
                      </>
                    ) : (
                      <>
                        <Upload className="size-3.5" />
                        Seleccionar Foto desde tu Equipo (JPG, PNG, WebP)
                      </>
                    )}
                  </Button>
                  <p className="text-[11px] text-[var(--text-tertiary)]">
                    Hasta 8MB. O si prefieres, escribe la URL o ruta abajo.
                  </p>
                </div>

                {esRutaImagenHero(nuevaImagen.archivo.trim()) && (
                  <div className="mt-2 flex min-w-0 items-center justify-center gap-2 rounded-lg bg-[var(--surface-2)] p-2">
                    <img
                      src={esRutaImagenHero(nuevaImagen.thumbnail.trim()) ? nuevaImagen.thumbnail : nuevaImagen.archivo}
                      alt="Vista previa"
                      className="size-12 object-cover rounded border border-[var(--border)]"
                    />
                    <div className="min-w-0 text-left text-xs">
                      <span className="font-semibold text-[var(--success)] flex items-center gap-1">
                        <Check className="size-3" /> Imagen lista para guardar
                      </span>
                      <span className="text-[10px] text-[var(--text-tertiary)] block break-all">
                        {nuevaImagen.archivo.startsWith("data:") ? "Archivo local listo" : nuevaImagen.archivo}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <FormField label="Título de la imagen" required error={errores.titulo}>
                {(campo) => (
                  <Input
                    {...campo}
                    value={nuevaImagen.titulo}
                    maxLength={160}
                    disabled={!editar}
                    placeholder="Ej: Diálogo Territorial en Olaya Herrera"
                    onChange={(event) =>
                      setNuevaImagen({ ...nuevaImagen, titulo: event.target.value })
                    }
                  />
                )}
              </FormField>

              <FormField label="Descripción de la imagen" required error={errores.descripcion}>
                {(campo) => (
                  <Textarea
                    {...campo}
                    value={nuevaImagen.descripcion}
                    maxLength={1200}
                    disabled={!editar}
                    placeholder="Describe el encuentro ciudadano, los participantes o el propósito cívico..."
                    onChange={(event) =>
                      setNuevaImagen({ ...nuevaImagen, descripcion: event.target.value })
                    }
                  />
                )}
              </FormField>

              <FormField label="Enfoque o tema territorial" required error={errores.enfoque}>
                {(campo) => (
                  <Input
                    {...campo}
                    value={nuevaImagen.enfoque}
                    maxLength={200}
                    disabled={!editar}
                    placeholder="Ej: Sector Rafael Núñez — Localidad 2"
                    onChange={(event) =>
                      setNuevaImagen({ ...nuevaImagen, enfoque: event.target.value })
                    }
                  />
                )}
              </FormField>

              <FormField
                label="URL o ruta de la imagen"
                required
                error={errores.archivo}
                description="Dirección HTTPS, ruta local /images/... o archivo cargado."
              >
                {(campo) => (
                  <Input
                    {...campo}
                    value={nuevaImagen.archivo}
                    disabled={!editar}
                    placeholder="https://ejemplo.gov.co/foto.webp o /images/foto.webp"
                    onChange={(event) =>
                      setNuevaImagen({ ...nuevaImagen, archivo: event.target.value })
                    }
                  />
                )}
              </FormField>

              <FormField
                label="URL o ruta de la miniatura (opcional)"
                error={errores.thumbnail}
                description="Si dejas este campo vacío se utilizará la misma imagen."
              >
                {(campo) => (
                  <Input
                    {...campo}
                    value={nuevaImagen.thumbnail}
                    disabled={!editar}
                    onChange={(event) =>
                      setNuevaImagen({ ...nuevaImagen, thumbnail: event.target.value })
                    }
                  />
                )}
              </FormField>

              {errorFormulario && (
                <p role="alert" className="text-sm text-danger">
                  {errorFormulario}
                </p>
              )}

              <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--border)]">
                <Button type="submit" size="sm" disabled={!editar || subiendoArchivo} className="gap-1.5">
                  <Plus className="size-3.5" />
                  Guardar imagen
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormularioAbierto(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          )}

          {!imagenesCatalogo.length && (
            <p role="status" className="rounded-xl border border-border p-4 text-sm text-text-secondary">
              No hay imágenes en la biblioteca. Agrega una nueva o restaura el catálogo oficial.
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {imagenesCatalogo.map((opcion) => {
              const esActiva = customKey === opcion.id && opcion.habilitada;
              return (
                <article
                  key={opcion.id}
                  aria-label={opcion.titulo}
                  data-testid={`imagen-hero-${opcion.id}`}
                  className={`min-w-0 space-y-3 rounded-xl border p-3 ${
                    esActiva ? "border-primary bg-surface-2" : "border-border bg-surface-1"
                  }`}
                >
                  <div
                    className={`relative aspect-video overflow-hidden rounded-lg border border-border bg-surface-2 ${
                      !opcion.habilitada ? "opacity-50" : ""
                    }`}
                  >
                    {opcion.archivo ? (
                      <img
                        src={opcion.thumbnail || opcion.archivo}
                        alt={opcion.titulo}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="bg-dotgrid flex h-full items-center justify-center p-3 text-center text-xs text-text-secondary">
                        Solo retícula institucional
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge variant={opcion.habilitada ? "success" : "outline"}>
                      {opcion.habilitada ? "Habilitada" : "Deshabilitada"}
                    </Badge>
                    <Switch
                      checked={opcion.habilitada}
                      disabled={!editar}
                      aria-label={`Habilitar ${opcion.titulo}`}
                      onCheckedChange={() => {
                        if (!editar) return;
                        toggleHabilitarImagen(opcion.id);
                        toast.success(
                          `Imagen ${opcion.habilitada ? "deshabilitada" : "habilitada"}: ${opcion.titulo}`
                        );
                                        }}
                    />
                  </div>

                  <div className="space-y-1">
                    <h4 className="break-words text-sm font-semibold text-text-primary">
                      {opcion.titulo}
                    </h4>
                    <p className="break-words text-xs font-medium text-text-secondary">
                      {opcion.enfoque}
                    </p>
                    <p className="break-words text-xs text-text-secondary line-clamp-2">
                      {opcion.descripcion}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                    <Button
                      type="button"
                      variant={esActiva ? "default" : "outline"}
                      size="sm"
                      disabled={!editar || !opcion.habilitada}
                      aria-label={`Asignar ${opcion.titulo}`}
                      onClick={() => handleSeleccionarImagen(opcion)}
                    >
                      {esActiva ? "Asignada" : "Asignar"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={!editar}
                      aria-label={`Eliminar ${opcion.titulo}`}
                      onClick={() =>
                        setConfirmacion({
                          tipo: "eliminar",
                          id: opcion.id,
                          titulo: opcion.titulo,
                        })
                      }
                      className="text-xs text-[var(--text-tertiary)] hover:text-[var(--danger)]"
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                      Eliminar
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

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
