import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PageHeader } from "@/shared/ui/page-header";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import {
  ArrowRight,
  Landmark,
  MessageSquare,
  Users,
  VenetianMask,
  Sun,
  Moon,
} from "lucide-react";

const meta = {
  title: "Fundamentos/Sistema de diseño",
  parameters: { layout: "padded" },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Introduction: Story = {
  name: "Bienvenido a POLIS UI",
  render: () => (
    <div className="mx-auto max-w-5xl space-y-10">
      <PageHeader
        eyebrow="POLIS UI · 1.0"
        title="Una conversación. Un lenguaje visual."
        description="La biblioteca que conecta a ciudadanía e instituciones: clara, cálida y consistente en cada pantalla."
      />
      <div className="flex flex-wrap gap-2">
        <Badge variant="ember">Tokens semánticos</Badge>
        <Badge variant="outline">Claro y oscuro</Badge>
        <Badge variant="outline">Teclado y foco</Badge>
        <Badge variant="outline">Paneles laterales</Badge>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: "Fundamentos",
            text: "Colores, tipografía, espacio, elevación y movimiento compartidos.",
          },
          {
            title: "Componentes",
            text: "Controles y superficies con estados consistentes y contratos tipados.",
          },
          {
            title: "Patrones",
            text: "Búsqueda, elección, formularios y paneles listos para componer.",
          },
        ].map((item) => (
          <Card key={item.title}>
            <CardContent>
              <h2 className="text-lg font-semibold">{item.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                {item.text}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="max-w-2xl text-sm leading-relaxed text-text-secondary">
        La interfaz conserva su sobriedad editorial. El acento ember señala
        acciones y momentos importantes; el contenido y la participación tienen
        el protagonismo. Usa el selector de tema de la barra de Storybook para
        revisar cada ejemplo.
      </p>
      <Button asChild variant="outline">
        <a href="?path=/docs/componentes-button--docs">
          Explorar componentes
          <ArrowRight />
        </a>
      </Button>
    </div>
  ),
};
const colorGroups = [
  {
    title: "Superficies",
    names: ["background", "surface-0", "surface-1", "surface-2", "surface-3"],
  },
  {
    title: "Texto",
    names: ["text-primary", "text-secondary", "text-tertiary", "text-inverse"],
  },
  {
    title: "Interacción",
    names: ["ember", "ember-soft", "border", "border-strong", "ring"],
  },
  {
    title: "Estados",
    names: [
      "success",
      "success-soft",
      "warning",
      "warning-soft",
      "danger",
      "danger-soft",
      "info",
      "info-soft",
    ],
  },
];
export const Colors: Story = {
  name: "Color · tokens semánticos",
  render: () => (
    <div className="max-w-5xl space-y-8">
      <PageHeader
        eyebrow="Fundamentos"
        title="Color con propósito"
        description="El mismo token expresa la misma función en ambos temas. Los valores viven en tokens.css."
      />
      {colorGroups.map((group) => (
        <section key={group.title}>
          <h2 className="mb-4 text-lg font-semibold">{group.title}</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
            {group.names.map((name) => (
              <div
                key={name}
                className="overflow-hidden rounded-xl border border-border bg-surface-1"
              >
                <div
                  aria-hidden="true"
                  className="h-20 border-b border-border"
                  style={{ background: `var(--${name})` }}
                />
                <div className="p-3">
                  <code className="text-xs text-text-primary">--{name}</code>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  ),
};
export const Typography: Story = {
  name: "Tipografía",
  render: () => (
    <div className="max-w-5xl space-y-7">
      <PageHeader
        eyebrow="Fundamentos"
        title="El contenido primero"
        description="Geist para lectura y acciones; Geist Mono para código y datos. Fuentes locales, sin solicitudes externas."
      />
      <section className="space-y-6">
        <div>
          <p className="label-micro mb-3 text-text-tertiary">
            Display · fluido
          </p>
          <p className="display-tight text-[clamp(2.5rem,5vw,5rem)] font-semibold">
            Tu voz construye ciudad.
          </p>
        </div>
        <div>
          <p className="label-micro mb-3 text-text-tertiary">
            Título de página
          </p>
          <p className="ui-page-title">Políticas públicas</p>
        </div>
        <div>
          <p className="label-micro mb-3 text-text-tertiary">
            Título de sección
          </p>
          <p className="ui-section-title">Construyamos acuerdos</p>
        </div>
        <p className="max-w-xl text-base leading-relaxed text-text-secondary">
          Una plataforma pública se entiende desde la primera visita. Usamos
          palabras claras, jerarquías visibles y medidas de lectura cómodas.
        </p>
        <p className="text-sm leading-relaxed text-text-secondary">
          Texto de interfaz · 14 px, con espacio suficiente para leer.
        </p>
        <p className="text-xs text-text-tertiary">
          Texto auxiliar · 12 px, con contraste suficiente para su función.
        </p>
        <code className="font-mono text-sm">
          LE-01 · 1.284 aportes · 2026-10-01
        </code>
      </section>
    </div>
  ),
};
export const Spacing: Story = {
  name: "Espaciado y radios",
  render: () => (
    <div className="max-w-3xl space-y-8">
      <PageHeader
        eyebrow="Fundamentos"
        title="Espacio para pensar"
        description="Escala de 4 px. Las superficies y los controles comparten radios y alturas."
      />
      <div className="space-y-4">
        {[1, 2, 3, 4, 6, 8, 12, 16].map((size) => (
          <div key={size} className="flex items-center gap-5">
            <code className="w-32 text-xs">--space-{size}</code>
            <div
              className="h-5 rounded bg-ember"
              style={{ width: `var(--space-${size})` }}
            />
            <span className="text-xs text-text-secondary">{size * 4} px</span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-5">
        {["sm", "md", "lg", "xl"].map((size) => (
          <div
            key={size}
            className="flex h-20 w-28 items-center justify-center border border-border-strong bg-surface-2 text-xs"
            style={{ borderRadius: `var(--radius-${size})` }}
          >
            {size}
          </div>
        ))}
      </div>
    </div>
  ),
};
export const Elevation: Story = {
  name: "Superficies y elevación",
  render: () => (
    <div className="grid max-w-4xl gap-6 sm:grid-cols-3">
      {[
        { title: "Tarjeta", shadow: "var(--elevation-card)" },
        { title: "Elevada", shadow: "var(--elevation-raised)" },
        { title: "Panel", shadow: "var(--elevation-panel)" },
      ].map((item) => (
        <div
          key={item.title}
          className="rounded-xl border border-border bg-surface-1 p-8"
          style={{ boxShadow: item.shadow }}
        >
          <h2 className="font-medium">{item.title}</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Profundidad discreta, bordes claros.
          </p>
        </div>
      ))}
    </div>
  ),
};
export const Iconography: Story = {
  name: "Iconografía",
  render: () => (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Fundamentos"
        title="Señales que acompañan"
        description="Lucide, trazo de 1.5 px, tamaños de 16, 20 y 24 px. Los botones de icono siempre tienen nombre accesible."
      />
      <div className="flex flex-wrap gap-4">
        {[
          { Icon: Landmark, label: "Institución" },
          { Icon: MessageSquare, label: "Aportes" },
          { Icon: Users, label: "Comunidad" },
          { Icon: VenetianMask, label: "Anonimato" },
          { Icon: Sun, label: "Claro" },
          { Icon: Moon, label: "Oscuro" },
        ].map(({ Icon, label }) => (
          <div
            key={label}
            className="flex w-24 flex-col items-center gap-3 rounded-xl border border-border bg-surface-1 p-4"
          >
            <Icon className="size-5" strokeWidth={1.5} aria-hidden="true" />
            <span className="text-xs text-text-secondary">{label}</span>
          </div>
        ))}
      </div>
    </div>
  ),
};
export const Motion: Story = {
  name: "Movimiento y accesibilidad",
  render: () => (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Fundamentos"
        title="Movimiento que orienta"
        description="Las transiciones explican relaciones entre vistas. La preferencia de movimiento reducido se respeta en toda la plataforma."
      />
      <dl className="grid gap-4 sm:grid-cols-3">
        {[
          { title: "Rápido", value: "140 ms", text: "Respuesta de controles" },
          { title: "Estándar", value: "220 ms", text: "Superficies y hover" },
          {
            title: "Pausado",
            value: "360 ms",
            text: "Transiciones de contexto",
          },
        ].map((item) => (
          <div key={item.title} className="rounded-xl border border-border p-5">
            <dt className="text-sm text-text-secondary">{item.title}</dt>
            <dd className="mt-2 text-xl font-semibold">{item.value}</dd>
            <dd className="mt-2 text-xs text-text-tertiary">{item.text}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm leading-relaxed text-text-secondary">
        Prueba cada control con Tab y las flechas. Los estados no dependen
        exclusivamente del color: incluyen texto, iconos o atributos de
        selección. Las pruebas automáticas complementan la revisión humana.
      </p>
    </div>
  ),
};
