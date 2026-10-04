"use client";

import { useState } from "react";
import { Plus, Users, Globe, Building2, MapPin, CheckCircle2 } from "lucide-react";
import { PanelShell } from "@/core/panels/panel-shell";
import { usePanels } from "@/core/panels/panel-store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { SectionLabel } from "@/shared/components/participation-ui";
import {
  useTableroConsolidado,
  useDesgloseWeb,
  useDesgloseMesas,
  useEscenariosEspeciales,
} from "../services/use-participacion-queries";

export function ParticipacionMulticanalPanel({
  entryKey,
  props,
}: {
  entryKey: string;
  props: { canalInicial?: string };
}) {
  const { closeTop, openPanel } = usePanels();
  const [tab, setTab] = useState(props.canalInicial || "consolidado");

  const {
    data: consolidado,
    isLoading: loadingConsolidado,
    isError: errorConsolidado,
  } = useTableroConsolidado();
  const {
    data: web,
    isLoading: loadingWeb,
    isError: errorWeb,
  } = useDesgloseWeb();
  const {
    data: mesas,
    isLoading: loadingMesas,
    isError: errorMesas,
  } = useDesgloseMesas();
  const {
    data: escenarios,
    isLoading: loadingEscenarios,
    isError: errorEscenarios,
  } = useEscenariosEspeciales();

  return (
    <PanelShell
      entryKey={entryKey}
      title="Tablero de Asistencia y Participación"
      subtitle="Registro consolidado multicanal y desagregado poblacional"
      crumbs={[{ label: "Participación" }]}
      onClose={closeTop}
      onCloseToKey={closeTop}
    >
      <div className="p-6">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="w-full mb-6 grid grid-cols-4">
            <TabsTrigger value="consolidado">Consolidado</TabsTrigger>
            <TabsTrigger value="web">Canal Web</TabsTrigger>
            <TabsTrigger value="mesas">Mesas</TabsTrigger>
            <TabsTrigger value="escenarios">Escenarios</TabsTrigger>
          </TabsList>

          {/* TAB 1: CONSOLIDADO */}
          <TabsContent value="consolidado" className="space-y-6 mt-0">
            {loadingConsolidado ? (
              <div className="text-sm text-[var(--text-secondary)] py-6 text-center">
                Consultando consolidado distrital...
              </div>
            ) : errorConsolidado ? (
              <div className="text-sm text-[var(--text-secondary)] py-6 text-center">
                No fue posible conectar con el consolidado. Mostrando datos de contingencia.
              </div>
            ) : consolidado ? (
              <>
                <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-center flex flex-col justify-center items-center">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                      Gran Total Participantes Distrital
                    </span>
                    <span className="block text-4xl font-extrabold text-[var(--ember)]">
                      {(consolidado.gran_total_participantes_distrital ?? consolidado.totalCartageneros).toLocaleString()}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)] mt-2">
                      {consolidado.participantes_unicos_identificados?.toLocaleString() ?? 0} identificados únicos (Canal 1 ∪ Canal 2)
                    </span>
                  </div>

                  <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] space-y-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] block">
                      Participación por Canal
                    </span>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                          <Globe className="size-3.5 text-[var(--info)]" /> Canal Web
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[var(--text-primary)]">
                            {(consolidado.total_canal_web ?? consolidado.participacionWeb).toLocaleString()}
                          </span>
                          <span className="text-[10px] text-[var(--text-secondary)]">
                            ({consolidado.porcentaje_canal_web ?? 0}%)
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-[var(--surface-2)] rounded-full h-1.5">
                        <div
                          className="bg-[var(--info)] h-1.5 rounded-full"
                          style={{ width: `${Math.min(consolidado.porcentaje_canal_web ?? 0, 100)}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-xs pt-1">
                        <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                          <Building2 className="size-3.5 text-[var(--ember)]" /> Mesas Deliberativas
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[var(--text-primary)]">
                            {(consolidado.total_canal_mesas ?? consolidado.participacionMesas).toLocaleString()}
                          </span>
                          <span className="text-[10px] text-[var(--text-secondary)]">
                            ({consolidado.porcentaje_canal_mesas ?? 0}%)
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-[var(--surface-2)] rounded-full h-1.5">
                        <div
                          className="bg-[var(--ember)] h-1.5 rounded-full"
                          style={{ width: `${Math.min(consolidado.porcentaje_canal_mesas ?? 0, 100)}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-xs pt-1">
                        <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                          <Users className="size-3.5 text-[var(--success)]" /> Escenarios Especiales
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[var(--text-primary)]">
                            {(consolidado.total_canal_escenarios ?? consolidado.participacionEscenarios).toLocaleString()}
                          </span>
                          <span className="text-[10px] text-[var(--text-secondary)]">
                            ({consolidado.porcentaje_canal_escenarios ?? 0}%)
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-[var(--surface-2)] rounded-full h-1.5">
                        <div
                          className="bg-[var(--success)] h-1.5 rounded-full"
                          style={{ width: `${Math.min(consolidado.porcentaje_canal_escenarios ?? 0, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </section>

                {/* Desglose Territorial Agregado */}
                {consolidado.desglose_territorial_agregado && consolidado.desglose_territorial_agregado.length > 0 && (
                  <section className="space-y-3">
                    <SectionLabel>Distribución Territorial Agregada (Top Territorios)</SectionLabel>
                    <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] space-y-2.5">
                      {consolidado.desglose_territorial_agregado
                        .filter((t) => t.total_participacion > 0)
                        .slice(0, 6)
                        .map((terr) => {
                          const total = consolidado.gran_total_participantes_distrital || 1;
                          const pct = ((terr.total_participacion / total) * 100).toFixed(1);
                          return (
                            <div key={terr.codigo} className="text-xs space-y-1">
                              <div className="flex justify-between">
                                <span className="font-medium text-[var(--text-primary)]">{terr.territorio}</span>
                                <span className="text-[var(--text-secondary)]">
                                  {terr.total_participacion.toLocaleString()} participantes ({pct}%)
                                </span>
                              </div>
                              <div className="w-full bg-[var(--surface-2)] rounded-full h-1.5">
                                <div
                                  className="bg-[var(--ember)] h-1.5 rounded-full"
                                  style={{ width: `${Math.min(Number(pct), 100)}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </section>
                )}

                {/* Desglose Demográfico */}
                {consolidado.desglose && (
                  <section className="space-y-4">
                    <SectionLabel>Desglose Demográfico Global</SectionLabel>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] space-y-3">
                        <h4 className="text-xs font-semibold text-[var(--text-primary)]">Por Género</h4>
                        {Object.entries({
                          Mujeres: consolidado.desglose.mujeres ?? 0,
                          Hombres: consolidado.desglose.hombres ?? 0,
                          Otros: consolidado.desglose.otros ?? 0,
                        }).map(([label, val]) => (
                          <div key={label} className="text-xs">
                            <div className="flex justify-between mb-1">
                              <span className="text-[var(--text-secondary)]">{label}</span>
                              <span className="text-[var(--text-primary)] font-medium">{val.toLocaleString()}</span>
                            </div>
                            <div className="w-full bg-[var(--surface-2)] rounded-full h-1.5">
                              <div
                                className="bg-[var(--info)] h-1.5 rounded-full"
                                style={{
                                  width: `${
                                    consolidado.totalCartageneros
                                      ? (val / consolidado.totalCartageneros) * 100
                                      : 0
                                  }%`,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] space-y-3">
                        <h4 className="text-xs font-semibold text-[var(--text-primary)]">Enfoque Diferencial</h4>
                        {Object.entries(consolidado.desglose.enfoqueDiferencial ?? {}).map(([label, val]) => (
                          <div
                            key={label}
                            className="flex justify-between text-xs py-1 border-b border-[var(--border)] last:border-0"
                          >
                            <span className="text-[var(--text-secondary)]">{label}</span>
                            <span className="text-[var(--text-primary)] font-medium">{val.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                )}
              </>
            ) : (
              <div className="text-sm text-[var(--text-secondary)] py-6 text-center">
                Sin registros consolidados de participación disponibles.
              </div>
            )}
          </TabsContent>

          {/* TAB 2: CANAL WEB */}
          <TabsContent value="web" className="space-y-6 mt-0">
            {loadingWeb ? (
              <div className="text-sm text-[var(--text-secondary)] py-6 text-center">
                Consultando datos del Canal Web...
              </div>
            ) : errorWeb ? (
              <div className="text-sm text-[var(--text-secondary)] py-6 text-center">
                Error al cargar Canal Web.
              </div>
            ) : web ? (
              <div className="space-y-6">
                {/* KPIs del Canal Web */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-center">
                    <span className="text-[11px] text-[var(--text-secondary)] block">Total Aportes</span>
                    <span className="text-2xl font-bold text-[var(--ember)]">
                      {(web.total_aportes ?? web.totalAportes).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-center">
                    <span className="text-[11px] text-[var(--text-secondary)] block">Total Apoyos</span>
                    <span className="text-2xl font-bold text-[var(--info)]">
                      {(web.total_apoyos ?? 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-center">
                    <span className="text-[11px] text-[var(--text-secondary)] block">Participantes Únicos</span>
                    <span className="text-2xl font-bold text-[var(--text-primary)]">
                      {(web.participantes_unicos_web ?? 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-center">
                    <span className="text-[11px] text-[var(--text-secondary)] block">Formularios</span>
                    <span className="text-2xl font-bold text-[var(--text-secondary)]">
                      {(web.total_respuestas_formularios ?? 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Por Línea Estratégica */}
                <section className="space-y-3">
                  <SectionLabel>Participación por Línea Estratégica (Canal Web)</SectionLabel>
                  <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] space-y-3">
                    {web.por_linea_estrategica && web.por_linea_estrategica.length > 0
                      ? web.por_linea_estrategica.map((item) => {
                          const total = web.total_aportes || 1;
                          const pct = ((item.total_aportes / total) * 100).toFixed(1);
                          return (
                            <div key={item.linea_id || item.codigo} className="text-xs space-y-1">
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-[var(--text-primary)]">{item.titulo}</span>
                                  {item.dimension_nombre && (
                                    <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                                      {item.dimension_nombre}
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-[var(--text-secondary)]">
                                  {item.total_aportes} aportes ({item.total_apoyos} apoyos)
                                </span>
                              </div>
                              <div className="w-full bg-[var(--surface-2)] rounded-full h-1.5">
                                <div
                                  className="bg-[var(--ember)] h-1.5 rounded-full"
                                  style={{ width: `${Math.min(Number(pct), 100)}%` }}
                                />
                              </div>
                            </div>
                          );
                        })
                      : Object.entries(web.porLineaEstrategica ?? {}).map(([label, val]) => (
                          <div key={label} className="text-xs space-y-1">
                            <div className="flex justify-between">
                              <span className="text-[var(--text-secondary)]">{label}</span>
                              <span className="text-[var(--text-primary)] font-medium">{val}</span>
                            </div>
                            <div className="w-full bg-[var(--surface-2)] rounded-full h-1.5">
                              <div
                                className="bg-[var(--ember)] h-1.5 rounded-full"
                                style={{ width: `${web.totalAportes ? (val / web.totalAportes) * 100 : 0}%` }}
                              />
                            </div>
                          </div>
                        ))}
                  </div>
                </section>

                {/* Por Dimensión */}
                {web.por_dimension && web.por_dimension.length > 0 && (
                  <section className="space-y-3">
                    <SectionLabel>Participación por Dimensión de Seguridad Humana</SectionLabel>
                    <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] grid grid-cols-1 md:grid-cols-2 gap-3">
                      {web.por_dimension.map((dim) => (
                        <div
                          key={dim.dimension_id || dim.codigo}
                          className="flex justify-between items-center text-xs py-1.5 border-b border-[var(--border)] last:border-0"
                        >
                          <span className="text-[var(--text-secondary)]">{dim.nombre}</span>
                          <span className="font-semibold text-[var(--text-primary)]">
                            {dim.total_aportes} aportes
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Por Territorio Web */}
                {web.por_territorio && web.por_territorio.some((t) => t.total_aportes > 0) && (
                  <section className="space-y-3">
                    <SectionLabel>Distribución Territorial en Canal Web</SectionLabel>
                    <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] space-y-2">
                      {web.por_territorio
                        .filter((t) => t.total_aportes > 0)
                        .map((terr) => (
                          <div
                            key={terr.territorio_id || terr.codigo}
                            className="flex justify-between items-center text-xs py-1 border-b border-[var(--border)] last:border-0"
                          >
                            <span className="flex items-center gap-1.5 text-[var(--text-primary)]">
                              <MapPin className="size-3 text-[var(--text-secondary)]" /> {terr.nombre}
                            </span>
                            <span className="font-medium text-[var(--text-secondary)]">
                              {terr.total_aportes} aportes
                            </span>
                          </div>
                        ))}
                    </div>
                  </section>
                )}
              </div>
            ) : (
              <div className="text-sm text-[var(--text-secondary)] py-6 text-center">
                Sin registros de participación web disponibles.
              </div>
            )}
          </TabsContent>

          {/* TAB 3: MESAS */}
          <TabsContent value="mesas" className="space-y-6 mt-0">
            {loadingMesas ? (
              <div className="text-sm text-[var(--text-secondary)] py-6 text-center">
                Consultando estructura de mesas territoriales...
              </div>
            ) : errorMesas ? (
              <div className="text-sm text-[var(--text-secondary)] py-6 text-center">
                Error al consultar Canal Mesas.
              </div>
            ) : mesas ? (
              <div className="space-y-6">
                {/* KPIs de Mesas */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-center">
                    <span className="text-[11px] text-[var(--text-secondary)] block">Mesas Principales</span>
                    <span className="text-2xl font-bold text-[var(--ember)]">
                      {(mesas.total_mesas_principales ?? 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-center">
                    <span className="text-[11px] text-[var(--text-secondary)] block">Submesas</span>
                    <span className="text-2xl font-bold text-[var(--info)]">
                      {(mesas.total_submesas ?? 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-center">
                    <span className="text-[11px] text-[var(--text-secondary)] block">Total Participantes</span>
                    <span className="text-2xl font-bold text-[var(--text-primary)]">
                      {(mesas.total_participantes ?? mesas.totalAsistentes).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-center">
                    <span className="text-[11px] text-[var(--text-secondary)] block">Actas Cerradas</span>
                    <span className="text-2xl font-bold text-[var(--success)]">
                      {(mesas.total_actas_cerradas ?? 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Listado jerárquico de mesas */}
                <section className="space-y-3">
                  <SectionLabel>Despliegue y Asistencia por Mesa Deliberativa</SectionLabel>
                  <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] space-y-3 max-h-[460px] overflow-y-auto">
                    {mesas.jerarquia_mesas && mesas.jerarquia_mesas.length > 0
                      ? mesas.jerarquia_mesas.map((m) => (
                          <div
                            key={m.id}
                            className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] space-y-2"
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-xs text-[var(--text-primary)]">
                                    {m.nombre}
                                  </span>
                                  <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                                    {m.codigo}
                                  </Badge>
                                </div>
                                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                                  {m.territorio || m.territorio_nombre || "Ámbito Distrital"} • Tipo: {m.tipo_mesa}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {m.acta_firmada ? (
                                  <Badge variant="outline" className="text-[10px] text-[var(--success)] border-[var(--success)]">
                                    <CheckCircle2 className="size-3 mr-1 inline" /> Acta Cerrada
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] text-[var(--text-secondary)]">
                                    En Deliberación
                                  </Badge>
                                )}
                                <span className="text-xs font-semibold text-[var(--text-primary)]">
                                  {m.asistentes_conteo} asistentes
                                </span>
                              </div>
                            </div>

                            {/* Submesas anidadas si existen */}
                            {m.submesas && m.submesas.length > 0 && (
                              <div className="pl-4 pt-2 border-l-2 border-[var(--border)] space-y-1.5 mt-2">
                                {m.submesas.map((sub) => (
                                  <div
                                    key={sub.id}
                                    className="flex justify-between items-center text-[11px] text-[var(--text-secondary)]"
                                  >
                                    <span>↳ {sub.nombre} ({sub.codigo})</span>
                                    <span className="font-medium text-[var(--text-primary)]">
                                      {sub.asistentes_conteo} asistentes
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      : Object.entries(mesas.porMesa ?? {}).map(([label, val]) => (
                          <div
                            key={label}
                            className="flex justify-between text-xs py-2 border-b border-[var(--border)] last:border-0"
                          >
                            <span className="text-[var(--text-secondary)] font-medium">{label}</span>
                            <span className="text-[var(--text-primary)]">{val} asistentes</span>
                          </div>
                        ))}
                  </div>
                </section>
              </div>
            ) : (
              <div className="text-sm text-[var(--text-secondary)] py-6 text-center">
                Sin registros de asistencia a mesas disponibles.
              </div>
            )}
          </TabsContent>

          {/* TAB 4: ESCENARIOS */}
          <TabsContent value="escenarios" className="space-y-6 mt-0">
            <div className="flex justify-between items-center">
              <div>
                <SectionLabel>Escenarios Especiales de Co-creación</SectionLabel>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Consultas previas étnicas, talleres focales y foros sectoriales
                </p>
              </div>
              <Button size="sm" onClick={() => openPanel("escenario-editor", {})}>
                <Plus className="mr-2 size-4" />
                Registrar Escenario
              </Button>
            </div>

            {loadingEscenarios ? (
              <div className="text-sm text-[var(--text-secondary)] py-6 text-center">
                Cargando escenarios especiales...
              </div>
            ) : errorEscenarios ? (
              <div className="text-sm text-[var(--text-secondary)] py-6 text-center">
                Error al consultar escenarios especiales.
              </div>
            ) : escenarios && escenarios.length > 0 ? (
              <div className="space-y-3">
                {escenarios.map((esc) => {
                  const nombre = esc.nombre || esc.titulo;
                  const totalAsistentes = esc.total_asistentes ?? esc.asistentes ?? 0;
                  const tipo = esc.tipo_escenario || esc.tipo || "OTRO";
                  const entidad = esc.entidad_convocante || esc.entidadConvocante;

                  return (
                    <div
                      key={esc.id}
                      className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] space-y-3"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-sm text-[var(--text-primary)]">
                              {nombre}
                            </h4>
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                              {esc.codigo_unico}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 uppercase">
                              {tipo}
                            </Badge>
                          </div>
                          <p className="text-xs text-[var(--text-secondary)] mt-1">
                            {entidad} • {new Date(esc.fecha).toLocaleDateString()} • {esc.lugar}
                            {esc.territorio_nombre ? ` (${esc.territorio_nombre})` : ""}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs font-semibold px-2.5 py-1 whitespace-nowrap">
                          {totalAsistentes.toLocaleString()} asistentes
                        </Badge>
                      </div>

                      {esc.sintesis_acuerdos && (
                        <div className="text-xs bg-[var(--surface-2)] p-2.5 rounded-lg border border-[var(--border)] text-[var(--text-secondary)]">
                          <span className="font-medium text-[var(--text-primary)]">Síntesis de Acuerdos: </span>
                          {esc.sintesis_acuerdos}
                        </div>
                      )}

                      {/* Desglose poblacional / étnico */}
                      {esc.desglose_poblacional && Object.keys(esc.desglose_poblacional).length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          <span className="text-[11px] text-[var(--text-secondary)] font-medium mr-1">
                            Desglose:
                          </span>
                          {Object.entries(esc.desglose_poblacional).map(([pobKey, pobVal]) => (
                            <span
                              key={pobKey}
                              className="text-[10px] bg-[var(--surface-2)] border border-[var(--border)] px-1.5 py-0.5 rounded text-[var(--text-secondary)]"
                            >
                              {pobKey.replace(/_/g, " ")}: <strong className="text-[var(--text-primary)]">{String(pobVal)}</strong>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-[var(--text-secondary)] py-6 text-center">
                No hay escenarios especiales registrados en el sistema.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PanelShell>
  );
}
