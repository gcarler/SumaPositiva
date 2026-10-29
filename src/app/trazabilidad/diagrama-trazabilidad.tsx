"use client";

import {
  ArrowDown,
  ClipboardList,
  FileCheck2,
  Landmark,
  Recycle,
  ScrollText,
  Workflow,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/shared/ui/accordion";

interface Actividad {
  titulo: string;
  detalle: string;
}

interface Carril {
  id: string;
  actor: string;
  actividades: Actividad[]; // una por fase (5)
}

interface Fase {
  numero: number;
  nombre: string;
  objetivo: string;
  actores: string;
  entradas: string[];
  procesos: string[];
  salidas: string[];
  marcoLegal: string;
  moduloPolis: string;
}

interface PasoLinea {
  titulo: string;
  detalle: string;
  radicado?: string;
}

const FASES: { numero: number; nombre: string }[] = [
  { numero: 1, nombre: "Alistamiento y diagnóstico" },
  { numero: 2, nombre: "Formulación de alternativas" },
  { numero: 3, nombre: "Adopción e inversión" },
  { numero: 4, nombre: "Implementación y ejecución" },
  { numero: 5, nombre: "Seguimiento y rendición" },
];

const CARRILES: Carril[] = [
  {
    id: "ciudadania",
    actor: "Ciudadanía y comunidades territoriales",
    actividades: [
      {
        titulo: "Ingresa a la mesa de trabajo",
        detalle: "Participación en las 35 mesas: 3 localidades urbanas y la zona rural e insular.",
      },
      {
        titulo: "Radicación multicanal",
        detalle: "WhatsApp, plataforma web, formularios y actas comunitarias con radicado único.",
      },
      {
        titulo: "Prioriza con la mesa",
        detalle: "Deliberación de alternativas junto al equipo técnico y veedurías ciudadanas (Ley 1757/2015).",
      },
      {
        titulo: "Aval comunitario",
        detalle: "Concertación en JAC y plenarias de mesa antes de la adopción del acto administrativo.",
      },
      {
        titulo: "Control social y quejas",
        detalle: "Reportes al geovisor, denuncias y acompañamiento a la rendición de cuentas.",
      },
    ],
  },
  {
    id: "tecnico",
    actor: "Equipo técnico distrital (Planeación, DADIS, Interior)",
    actividades: [
      {
        titulo: "Diagnóstico participativo",
        detalle: "Identificación de causa raíz, geocodificación y análisis causal (árbol de problemas).",
      },
      {
        titulo: "Banco de alternativas",
        detalle: "Árbol de objetivos, ponderación costo-beneficio y evaluación multicriterio MGA.",
      },
      {
        titulo: "Estructura líneas estratégicas",
        detalle: "28 líneas y sublíneas trazadoras bajo las 7 Dimensiones de Seguridad Humana.",
      },
      {
        titulo: "Banco de proyectos BPIM",
        detalle: "Estructuración operativa y lógica de inversión por proyecto.",
      },
      {
        titulo: "Interpretación técnica",
        detalle: "Cálculo de avance ponderado y evaluación de impacto social.",
      },
    ],
  },
  {
    id: "politico",
    actor: "Nivel político-normativo (Alcaldía y Concejo)",
    actividades: [
      {
        titulo: "Encarga el proceso",
        detalle: "Acto administrativo de formulación participativa (Decreto Distrital 037/2026).",
      },
      {
        titulo: "Delibera portafolio",
        detalle: "Consejo de Gobierno y concertación con el Concejo Distrital.",
      },
      {
        titulo: "Decisión de viabilidad",
        detalle: "Sí → adopción vinculante; No → devolución a la Fase 2 para reformular.",
      },
      {
        titulo: "Adopta la política",
        detalle: "Decreto Distrital 037/2026 y armonización con el Acuerdo 139/2024.",
      },
      {
        titulo: "Responde y recalibra",
        detalle: "Decide ajustes de política a partir de los semáforos y dictámenes.",
      },
    ],
  },
  {
    id: "ejecutor",
    actor: "Entidades ejecutoras y operadores",
    actividades: [
      {
        titulo: "Alistamiento operativo",
        detalle: "Rutas de brigadas y programas sociales por barrio y corregimiento.",
      },
      {
        titulo: "Estructura inversión",
        detalle: "Fichas de la matriz plurianual con fuentes (FONSET, SGP, SGR, Recursos Propios).",
      },
      {
        titulo: "Plan de acción e inversión",
        detalle: "Matriz plurianual de inversión con compromisos y montos por fuente.",
      },
      {
        titulo: "Ejecuta con la comunidad",
        detalle: "Obras sociales, brigadas de salud, programas y convenios solidarios con JAC.",
      },
      {
        titulo: "Reporta ejecución",
        detalle: "Habilita supervisión financiera y física sobre lo entregado.",
      },
    ],
  },
  {
    id: "control",
    actor: "Órganos de control y monitoreo (Personería, Contraloría, POLIS)",
    actividades: [
      {
        titulo: "Verifica transparencia de datos",
        detalle: "Salvaguardas Habeas Data y despojo de metadatos EXIF/GPS del diagnóstico.",
      },
      {
        titulo: "Audita la deliberación",
        detalle: "Registro trazable de actos y acuerdos de la formulación participativa.",
      },
      {
        titulo: "Vigila la decisión",
        detalle: "Conformidad de la adopción con Ley 1474/2011 (anticorrupción).",
      },
      {
        titulo: "Supervisa operaciones",
        detalle: "Geovisor en tiempo real y brigadas de control en territorio.",
      },
      {
        titulo: "Dictamina y retroalimenta",
        detalle: "Semáforos de cumplimiento y bucle de retorno a la Fase 1 o 2.",
      },
    ],
  },
];

const FICHA_FASES: Fase[] = [
  {
    numero: 1,
    nombre: "Alistamiento y diagnóstico territorial participativo",
    objetivo:
      "Levantar el diagnóstico situacional de Cartagena con la ciudadanía y las fuentes oficiales, identificando la causa raíz desde las comunidades.",
    actores: "Ciudadanía en las 35 mesas, equipo técnico (Planeación, DADIS, Interior, EPA), POLIS",
    entradas: [
      "Problemas percibidos por la comunidad",
      "Estadísticas criminales y Terridata",
      "DANE y fuentes oficiales",
      "Actas de las 35 mesas de trabajo",
    ],
    procesos: [
      "Identificación de la causa raíz",
      "Despojo de metadatos EXIF/GPS (Habeas Data)",
      "Geocodificación y árbol de problemas",
    ],
    salidas: ["Diagnóstico situacional validado", "Árbol de problemas oficial"],
    marcoLegal:
      "Decreto Distrital 037/2026 (formulación participativa); Ley 1712/2014; Ley 1581/2012",
    moduloPolis: "Diagnóstico y árbol de problemas (módulos de la Fase 1 en la plataforma)",
  },
  {
    numero: 2,
    nombre: "Formulación y deliberación de alternativas",
    objetivo:
      "Transformar el diagnóstico en un portafolio de líneas estratégicas con metas e indicadores trazadores.",
    actores: "Ciudadanía y veedurías, equipo técnico, Consejo de Gobierno",
    entradas: ["Diagnóstico situacional", "Catálogo de alternativas y buenas prácticas"],
    procesos: [
      "Banco de alternativas",
      "Ponderación costo-beneficio y evaluación multicriterio MGA",
      "Estructuración de las 28 líneas estratégicas bajo las 7 Dimensiones de Seguridad Humana",
    ],
    salidas: [
      "Portafolio de líneas y sublíneas",
      "Indicadores trazadores y metas por dimensión",
    ],
    marcoLegal:
      "Acuerdo Distrital 139/2024 (Línea Estratégica 1: Seguridad Humana); Ley 2294/2022",
    moduloPolis: "Banco de alternativas, ranking de presupuesto y árbol de objetivos",
  },
  {
    numero: 3,
    nombre: "Adopción y plan de acción e inversión (FONSET / MPI)",
    objetivo:
      "Convertir el portafolio en un acto administrativo vinculante con su matriz plurianual de inversión.",
    actores: "Consejo de Gobierno, Alcaldía Mayor, Concejo Distrital, órganos de control",
    entradas: [
      "Portafolio formulado",
      "Proyecciones de ingresos distritales (FONSET, SGP, SGR, Recursos Propios)",
    ],
    procesos: [
      "Armonización presupuestal",
      "Priorización en el Consejo de Gobierno",
      "Concertación normativa con el Concejo",
    ],
    salidas: [
      "Decreto Distrital 037/2026",
      "Matriz plurianual de inversión",
      "Banco de proyectos BPIM",
    ],
    marcoLegal:
      "Decreto Distrital 037/2026; Acuerdo Distrital 139/2024; Ley 1417/2010 (Juntas de Acción Comunal) y Ley 1414/2010 (contraloría social)",
    moduloPolis: "Matriz de inversión (módulos de seguimiento de la Fase 3)",
  },
  {
    numero: 4,
    nombre: "Implementación, contratación y ejecución territorial",
    objetivo:
      "Ejecutar en territorio los proyectos y programas adoptados, con bienes y servicios entregados a la comunidad.",
    actores: "Entidades ejecutoras, operadores contratistas, JAC, ciudadanía veedora",
    entradas: [
      "Asignación presupuestal",
      "Pliegos contractuales",
      "Ruta de brigadas activada en territorio",
    ],
    procesos: [
      "Formulación de proyectos BPIM",
      "Licitaciones y contratación transparente",
      "Convenios solidarios con JAC y ejecución barrial",
    ],
    salidas: ["Actividades concluidas", "Bienes y servicios públicos entregados"],
    marcoLegal:
      "Ley 1474/2011 (Anticorrupción); Ley 2175/2021 (ordenamiento de la contratación pública)",
    moduloPolis: "Proyectos y seguimiento (módulo de proyectos de la Fase 4)",
  },
  {
    numero: 5,
    nombre: "Seguimiento, auditoría social y rendición de cuentas",
    objetivo:
      "Verificar el cumplimiento, medir el impacto y recalibrar la política con un bucle de retroalimentación.",
    actores: "Personería, Contraloría, POLIS (geovisor/inteligencia), ciudadanía veedora",
    entradas: [
      "Reportes de interventoría",
      "Monitoreo en geovisor",
      "Denuncias ciudadanas y radar social",
    ],
    procesos: [
      "Cálculo de avance ponderado",
      "Evaluación de impacto social",
      "Audiencias públicas de rendición de cuentas",
    ],
    salidas: [
      "Semáforos de cumplimiento",
      "Dictamen de impacto",
      "Decisiones de recalibración (bucle a la Fase 1 o 2)",
    ],
    marcoLegal: "Ley 1712/2014 y Ley 1757/2015 (transparencia y control social)",
    moduloPolis: "Geovisor y tableros de rendición de cuentas",
  },
];

const LINEA_DEL_DATO: PasoLinea[] = [
  {
    titulo: "Aporte nace en la mesa",
    detalle: "Vecino de Pozón o Barú registra su propuesta en la mesa de trabajo territorial.",
    radicado: "R-0001",
  },
  {
    titulo: "Recepción multicanal verificada",
    detalle:
      "El sistema recibe la propuesta por WhatsApp o plataforma web; el mensaje queda registrado en el inbox durable.",
    radicado: "INB-0001-2026",
  },
  {
    titulo: "La causa raíz entra al diagnóstico",
    detalle: "La propuesta se integra al árbol de problemas y se geocodifica con salvaguardas Habeas Data.",
    radicado: "DIAG-0001",
  },
  {
    titulo: "Criterios MGA la convierten en alternativa",
    detalle: "El equipo técnico pondera costo-beneficio y la adecua en el banco de alternativas.",
    radicado: "ALT-0001",
  },
  {
    titulo: "Línea estratégica y meta asignada",
    detalle: "La alternativa ingresa al portafolio de línea (ejemplo LE-03) con meta e indicador trazador.",
    radicado: "LE-03",
  },
  {
    titulo: "Financiación vinculante en el plan plurianual",
    detalle: "La línea entra a la matriz plurianual de inversión con fuente FONSET, SGP o SGR.",
    radicado: "PPI-2026-LE03-01",
  },
  {
    titulo: "Proyecto BPIM y contrato",
    detalle: "El banco de proyectos estructura la ficha; se licita o se firma convenio con la JAC.",
    radicado: "BPIM-2026-045",
  },
  {
    titulo: "Ejecución en territorio",
    detalle: "Brigadas, obras y programas sociales se ejecutan y se registran avances semanales.",
    radicado: "EJEC-0001",
  },
  {
    titulo: "Verificación en el geovisor",
    detalle: "El tablero del geovisor y los semáforos de cumplimiento cruzan la ejecución física y financiera.",
    radicado: "GV-EJEC-0001",
  },
  {
    titulo: "Rendición de cuentas y recalibración",
    detalle:
      "En la audiencia pública se compara la evidencia con la promesa y se decide si se recalibra el ciclo (regresa a Fase 1 o 2).",
  },
];

const TABS: { id: string; etiqueta: string; icono: typeof Workflow }[] = [
  { id: "diagrama", etiqueta: "Diagrama UML de flujo", icono: Workflow },
  { id: "matriz", etiqueta: "Matriz de fases y artefactos", icono: ClipboardList },
  { id: "linea", etiqueta: "Ciclo de vida del dato ciudadano", icono: Recycle },
];

function ConectorFase() {
  return (
    <div className="flex justify-center" aria-hidden="true">
      <ArrowDown className="size-4 text-[var(--text-tertiary)]" strokeWidth={1.5} />
    </div>
  );
}

export function DiagramaTrazabilidad() {
  return (
    <section aria-label="Diagrama de trazabilidad de la política pública" className="mt-8">
      <Tabs defaultValue="diagrama" className="gap-0">
        <TabsList className="h-auto w-fit justify-start gap-1 rounded-lg bg-[var(--surface-2)] p-1 text-[var(--text-secondary)]">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="rounded-md border border-transparent px-3 py-2 text-sm font-medium data-[state=active]:border-[var(--ember)] data-[state=active]:bg-[var(--surface-1)] data-[state=active]:text-[var(--text-primary)] hover:text-[var(--text-primary)]"
            >
              <tab.icono className="size-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
              {tab.etiqueta}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Vista 1: swimlanes UML con fases */}
        <TabsContent value="diagrama" className="mt-6 outline-none">
          <p className="mb-3 text-xs text-[var(--text-tertiary)]">
            Carriles de actores (swimlanes) por fase. En móvil desplázate horizontalmente;
            en escritorio se ve el carril completo.
          </p>
          <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-3">
            <div className="min-w-[1080px]">
              <div className="grid grid-cols-[170px_repeat(5,minmax(200px,1fr))] gap-2">
                <div className="flex flex-col justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
                  <Workflow
                    className="size-5 text-[var(--ember)]"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  <ul className="mt-3 space-y-3">
                    {FASES.map((fase) => (
                      <li
                        key={fase.numero}
                        className="flex items-start gap-1.5 text-[11px] font-semibold text-[var(--text-secondary)]"
                      >
                        <span className="font-mono text-[10px] text-[var(--ember)]">
                          F{fase.numero}
                        </span>
                        {fase.nombre}
                      </li>
                    ))}
                  </ul>
                </div>
                {CARRILES.map((carril) => (
                  <div key={carril.id} className="flex flex-col gap-2">
                    <div className="rounded-lg border border-[var(--ember)]/30 bg-[var(--surface-2)] p-3">
                      <p className="text-xs font-bold leading-tight text-[var(--text-primary)]">
                        {carril.actor}
                      </p>
                    </div>
                    {carril.actividades.map((actividad, j) => (
                      <div key={j} className="flex-1">
                        <div className="h-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-2.5 text-[10px] leading-snug">
                          <p className="font-bold text-[var(--ember)]">{actividad.titulo}</p>
                          <p className="mt-1 text-[var(--text-secondary)]">{actividad.detalle}</p>
                        </div>
                        {j < carril.actividades.length - 1 && <ConectorFase />}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="flex gap-2 rounded-lg border border-[var(--info)]/40 bg-[var(--surface-2)] p-3 text-sm text-[var(--text-secondary)]">
              <Landmark className="size-4 shrink-0 text-[var(--info)]" strokeWidth={1.5} aria-hidden="true" />
              <span>
                <strong className="text-[var(--text-primary)]">Rombos de decisión:</strong> en
                la Fase 3 la viabilidad fiscal pregunta: ¿el portafolio entra en el plan
                plurianual? Si no, devolución a la Fase 2 para reformular.
              </span>
            </div>
            <div className="flex gap-2 rounded-lg border border-[var(--success)]/40 bg-[var(--surface-2)] p-3 text-sm text-[var(--text-secondary)]">
              <Recycle className="size-4 shrink-0 text-[var(--success)]" strokeWidth={1.5} aria-hidden="true" />
              <span>
                <strong className="text-[var(--text-primary)]">Bucle de retroalimentación:</strong>{" "}
                los dictámenes de la Fase 5 retornan a la Fase 1 o 2 para recalibrar la
                política con la evidencia social.
              </span>
            </div>
          </div>
        </TabsContent>

        {/* Vista 2: matriz detallada por fase */}
        <TabsContent value="matriz" className="mt-6 outline-none">
          <Accordion type="single" collapsible defaultValue="fase-1" className="grid gap-4">
            {FICHA_FASES.map((fase) => (
              <AccordionItem
                key={fase.numero}
                value={`fase-${fase.numero}`}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-5 last:border-b"
              >
                <AccordionTrigger className="py-4 hover:no-underline">
                  <span className="block">
                    <span className="block text-xs font-bold uppercase tracking-widest text-[var(--ember)]">
                      Fase {fase.numero}
                    </span>
                    <span className="mt-1 block text-sm font-semibold text-[var(--text-primary)]">
                      {fase.nombre}
                    </span>
                  </span>
                  <FileCheck2
                    className="size-5 shrink-0 text-[var(--ember)]"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                    <strong className="text-[var(--text-primary)]">Objetivo:</strong>{" "}
                    {fase.objetivo}
                  </p>
                  <dl className="mt-4 space-y-4 text-xs leading-relaxed text-[var(--text-secondary)]">
                    {[
                      ["Actores clave", fase.actores],
                      ["Entradas", fase.entradas],
                      ["Procesos", fase.procesos],
                      ["Salidas", fase.salidas],
                      ["Marco legal aplicable", fase.marcoLegal],
                      ["Módulo POLIS", fase.moduloPolis],
                    ].map(([etiqueta, valor], indice) => (
                      <div key={`${indice}-${String(etiqueta)}`}>
                        <dt className="label-micro uppercase tracking-widest text-[var(--text-tertiary)]">
                          {etiqueta}
                        </dt>
                        <dd className="mt-1">
                          {Array.isArray(valor) ? (
                            <ul className="list-disc space-y-1 pl-4">
                              {valor.map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                          ) : (
                            valor
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </TabsContent>

        {/* Vista 3: línea de vida del dato */}
        <TabsContent value="linea" className="mt-6 outline-none">
          <ol className="max-w-3xl space-y-3">
            {LINEA_DEL_DATO.map((paso, indice) => (
              <li key={indice} className="flex gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)] font-mono text-xs font-bold text-[var(--ember)] ring-1 ring-[var(--border)]">
                  {indice + 1}
                </span>
                <div className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-4">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                      {paso.titulo}
                    </h3>
                    {paso.radicado && (
                      <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 font-mono text-[10px] text-[var(--info)]">
                        {paso.radicado}
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-secondary)]">
                    {paso.detalle}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-6 flex max-w-3xl items-start gap-2 rounded-lg border border-[var(--info)]/40 bg-[var(--surface-2)] p-4 text-xs leading-relaxed text-[var(--text-secondary)]">
            <ScrollText className="mt-0.5 size-4 shrink-0 text-[var(--info)]" strokeWidth={1.5} aria-hidden="true" />
            <span>
              Cada radicado es único y permite auditar de punta a punta la trayectoria de la
              propuesta ciudadana. Los prefijos son institucionales de trazabilidad; en
              ejercicio se correlacionan con los registros del inbox durable, los actos
              administrativos y el banco de proyectos.
            </span>
          </p>
        </TabsContent>
      </Tabs>
    </section>
  );
}
