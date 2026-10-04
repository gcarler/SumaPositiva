"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  MapPin,
  Building2,
  Globe,
  ArrowRight,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  BarChart3,
  X,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Badge } from "@/shared/ui/badge";
import { usePanels } from "@/core/panels/panel-store";
import {
  enrutarCasoCiudadano,
  DEPENDENCIAS_CARTAGENA_2026,
  type EnrutamientoCiudadanoResultado,
} from "../data/entidades-cartagena.data";

const EJEMPLOS_CONSULTA = [
  { texto: "Basuras y sedimentos en el caño que causan inundaciones", etiqueta: "🗑️ Basuras y caños" },
  { texto: "Punto de venta y consumo de drogas cerca a colegio", etiqueta: "💊 Drogas en colegio" },
  { texto: "Riñas entre pandillas y enfrentamientos con armas", etiqueta: "⚔️ Riñas y pandillas" },
  { texto: "Zona oscura sin alumbrado público con atracos constantes", etiqueta: "💡 Alumbrado público" },
  { texto: "Menores en riesgo y explotación sexual en entorno turístico", etiqueta: "🛡️ ESCNNA en turismo" },
  { texto: "Focos de aguas estancadas y proliferación de dengue", etiqueta: "🦟 Criaderos de dengue" },
  { texto: "Cobro extorsivo o intimidación de prestamistas gota a gota", etiqueta: "💸 Extorsión y gota a gota" },
  { texto: "Riesgo de deslizamiento de tierra en ladera", etiqueta: "⛰️ Riesgo de derrumbe" },
];

const TERRITORIOS_OPCIONES = [
  { id: "todos", label: "Todos los territorios" },
  { id: "loc-1", label: "Localidad 1 — Histórica y Caribe Norte" },
  { id: "loc-2", label: "Localidad 2 — De la Virgen y Turística" },
  { id: "loc-3", label: "Localidad 3 — Industrial y Bahía" },
  { id: "rural-insular", label: "Zona Rural e Insular (Barú, Tierrabomba, Islas)" },
];

export function EnrutadorCiudadanoInteligente() {
  const router = useRouter();
  const { openPanel } = usePanels();
  const [consulta, setConsulta] = useState("");
  const [territorioSeleccionado, setTerritorioSeleccionado] = useState("todos");
  const [resultado, setResultado] = useState<EnrutamientoCiudadanoResultado | null>(null);
  const [consultado, setConsultado] = useState(false);

  const procesarBusqueda = (texto: string, territorio = territorioSeleccionado) => {
    if (!texto.trim()) {
      setResultado(null);
      setConsultado(false);
      return;
    }
    const res = enrutarCasoCiudadano(texto, territorio);
    setResultado(res);
    setConsultado(true);
  };

  const handleLimpiar = () => {
    setConsulta("");
    setResultado(null);
    setConsultado(false);
  };

  const handleIrAReporte = () => {
    if (!resultado) return;
    const cat = encodeURIComponent(resultado.categoriaSugerida);
    const terr = encodeURIComponent(territorioSeleccionado);
    const lider = encodeURIComponent(resultado.dependenciaLider.sigla ?? resultado.dependenciaLider.codigo);
    router.push(`/f/reporte-inseguridad?categoria=${cat}&territorio=${terr}&lider=${lider}`);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface-1)] p-6 sm:p-8 lg:p-10 shadow-lg">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex size-2 rounded-full bg-[var(--ember)]" aria-hidden />
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--ember)]">
              Pilar 1 — Trazabilidad y Responsabilidad Institucional
            </p>
            <Badge variant="outline" className="border-[var(--border)] text-[10px]">
              Decreto 037 de 2026 MinInterior
            </Badge>
          </div>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
            ¿Quién Responde por tu Seguridad en Cartagena?
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)] sm:text-base max-w-3xl">
            Enrutador Inteligente de Competencias: describe en tus propias palabras qué ocurre en tu barrio
            y el sistema identifica en tiempo real la secretaría legalmente responsable, sus entidades aliadas
            y sus metas en el Plan de Acción 2026.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={() => openPanel("rendicion-cuentas", {})}
          className="shrink-0 gap-1.5 self-start md:self-auto"
        >
          <BarChart3 className="size-4 text-[var(--ember)]" />
          Rendición de Cuentas 2026
        </Button>
      </div>

      {/* Selector de Territorio */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1">
          <MapPin className="size-3.5 text-[var(--ember)]" />
          Territorio:
        </span>
        {TERRITORIOS_OPCIONES.map((terr) => {
          const activo = territorioSeleccionado === terr.id;
          return (
            <Button
              key={terr.id}
              variant="unstyled"
              size="unstyled"
              type="button"
              onClick={() => {
                setTerritorioSeleccionado(terr.id);
                if (consulta.trim()) {
                  procesarBusqueda(consulta, terr.id);
                }
              }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                activo
                  ? "bg-[var(--ember)] text-[var(--text-inverse)] shadow-sm"
                  : "bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]"
              }`}
            >
              {terr.label}
            </Button>
          );
        })}
      </div>

      {/* Search Input Box */}
      <div className="relative mt-4">
        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute left-4 size-5 text-[var(--text-tertiary)] z-10" />
          <Input
            type="text"
            value={consulta}
            onChange={(e) => {
              const val = e.target.value;
              setConsulta(val);
              procesarBusqueda(val);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                procesarBusqueda(consulta);
              }
            }}
            placeholder="¿Qué situación ocurre en tu barrio? (ej. basuras en caño que desbordan, atraco en baluartes, venta de drogas, riñas...)"
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] py-4 pl-12 pr-12 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--ember)] focus:ring-[var(--ember)]/20 transition-all sm:text-base h-auto"
          />
          {consulta && (
            <Button
              variant="unstyled"
              size="unstyled"
              type="button"
              onClick={handleLimpiar}
              aria-label="Limpiar búsqueda"
              className="absolute right-4 p-1 rounded-full text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] z-10"
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Chips Rápidos */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-[var(--text-tertiary)] flex items-center gap-1">
          <Sparkles className="size-3 text-[var(--ember)]" />
          Ejemplos rápidos:
        </span>
        {EJEMPLOS_CONSULTA.map((ej) => (
          <Button
            key={ej.etiqueta}
            variant="unstyled"
            size="unstyled"
            type="button"
            onClick={() => {
              setConsulta(ej.texto);
              procesarBusqueda(ej.texto);
            }}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-xs text-[var(--text-secondary)] hover:border-[var(--ember)] hover:text-[var(--text-primary)] transition-colors"
          >
            {ej.etiqueta}
          </Button>
        ))}
      </div>

      {/* Ficha de Enrutamiento Inteligente */}
      {resultado && (
        <div className="mt-8 rounded-2xl border-2 border-[var(--ember)] bg-[var(--surface-2)] p-6 transition-all">
          {/* Header de la Ficha */}
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border)] pb-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${resultado.dimensionPrincipal.tokenBadge} 15%, transparent)`,
                    color: resultado.dimensionPrincipal.tokenBadge,
                  }}
                >
                  <ShieldCheck className="size-3.5" />
                  {resultado.dimensionPrincipal.nombre}
                </span>
                <span className="text-xs text-[var(--text-tertiary)]">
                  Coincidencia semántica: {resultado.puntajeCoincidencia}%
                </span>
              </div>
              <h3 className="mt-2 text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Building2 className="size-5 text-[var(--ember)]" />
                {resultado.dependenciaLider.nombre}
                {resultado.dependenciaLider.sigla && (
                  <span className="text-sm font-semibold text-[var(--ember)]">
                    ({resultado.dependenciaLider.sigla})
                  </span>
                )}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                🏛️ Autoridad Competente Líder designada en el Plan de Desarrollo Distrital 2024–2027
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                type="button"
                onClick={handleIrAReporte}
                className="gap-2 bg-[var(--ember)] hover:bg-[var(--ember)] text-[var(--text-inverse)]"
              >
                Crear reporte formal
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>

          {/* Cuerpo de Competencia y Misión */}
          <div className="mt-5 grid gap-6 md:grid-cols-12">
            <div className="md:col-span-7 space-y-4">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Misión y Competencia en Seguridad Humana
                </h4>
                <p className="mt-1 text-sm text-[var(--text-primary)] leading-relaxed">
                  {resultado.dependenciaLider.misionPlanAccion2026 ?? resultado.dependenciaLider.competenciaSeguridadHumana}
                </p>
              </div>

              {/* Metas Priorizadas del PDD */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Proyectos Activos del Plan de Acción 2026
                </h4>
                <ul className="mt-2 space-y-1.5">
                  {resultado.proyectosActivos.map((p, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                      <CheckCircle2 className="size-3.5 shrink-0 text-[var(--success)] mt-0.5" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Entidades Corresponsables */}
              {resultado.entidadesAliadas.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                    Entidades Corresponsables y Aliadas
                  </h4>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {resultado.entidadesAliadas.map((aliada) => (
                      <Button
                        key={aliada.id}
                        variant="unstyled"
                        size="unstyled"
                        type="button"
                        onClick={() => openPanel("rendicion-cuentas", { dependenciaId: aliada.id })}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2.5 py-1 text-xs text-[var(--text-primary)] hover:border-[var(--ember)] transition-colors"
                        title={aliada.nombre}
                      >
                        <Building2 className="size-3 text-[var(--ember)]" />
                        <span className="font-medium">{aliada.sigla ?? aliada.codigo}</span>
                        <ExternalLink className="size-2.5 opacity-60" />
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Canales de Atención y Auditoría */}
            <div className="md:col-span-5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)] border-b border-[var(--border)] pb-2 flex items-center justify-between">
                <span>Canales Oficiales de Atención</span>
                <span className="text-[10px] text-[var(--success)] font-medium">Oficial 2026</span>
              </h4>

              {resultado.dependenciaLider.canalAtencion ? (
                <div className="space-y-2.5 text-xs text-[var(--text-secondary)]">
                  <div className="flex items-start gap-2">
                    <MapPin className="size-3.5 shrink-0 text-[var(--ember)] mt-0.5" />
                    <span>{resultado.dependenciaLider.canalAtencion.direccion}</span>
                  </div>
                  {resultado.dependenciaLider.canalAtencion.web && (
                    <div className="flex items-center gap-2">
                      <Globe className="size-3.5 shrink-0 text-[var(--ember)]" />
                      <a
                        href={resultado.dependenciaLider.canalAtencion.web}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--text-primary)] hover:underline flex items-center gap-1"
                      >
                        <span>{resultado.dependenciaLider.canalAtencion.web}</span>
                        <ExternalLink className="size-3" aria-hidden="true" />
                      </a>
                    </div>
                  )}
                  <div className="text-[11px] text-[var(--text-tertiary)] pl-5.5">
                    {resultado.dependenciaLider.canalAtencion.canalVirtual}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[var(--text-tertiary)]">
                  Plaza de la Aduana, Palacio de la Aduana — Línea 195 Distrital
                </p>
              )}

              {/* Indicador de Avance Real 2026 */}
              <div className="rounded-lg bg-[var(--surface-2)] p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-secondary)]">Cumplimiento Plan Acción:</span>
                  <span className="font-bold text-[var(--text-primary)]">
                    {resultado.dependenciaLider.avancePlanAccion2026 ?? 38.8}%
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full rounded-full bg-[var(--border)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${resultado.dependenciaLider.avancePlanAccion2026 ?? 38.8}%`,
                      backgroundColor:
                        (resultado.dependenciaLider.avancePlanAccion2026 ?? 38.8) >= 40
                          ? "var(--success)"
                          : (resultado.dependenciaLider.avancePlanAccion2026 ?? 38.8) >= 25
                            ? "var(--warning)"
                            : "var(--danger)",
                    }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--text-tertiary)]">
                  <span>Presupuesto 2026: {resultado.dependenciaLider.presupuesto2026Cop ?? "Auditado"}</span>
                  <Button
                    variant="unstyled"
                    size="unstyled"
                    type="button"
                    onClick={() => openPanel("rendicion-cuentas", { dependenciaId: resultado.dependenciaLider.id })}
                    className="text-[var(--ember)] hover:underline font-medium text-[11px]"
                  >
                    Ver semáforo →
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {consultado && !resultado && (
        <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-6 text-center">
          <p className="text-sm text-[var(--text-secondary)]">
            No se identificó una dependencia específica para esta descripción. Intenta con palabras clave como
            {" "}<span className="text-[var(--text-primary)] font-medium">caños, basuras, drogas, pandillas, ruidos, andenes o alumbrado</span>.
          </p>
        </div>
      )}
    </div>
  );
}
