import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { AccesibilidadWidget } from "./accesibilidad-widget";

const meta = {
  title: "Componentes/AccesibilidadWidget",
  component: AccesibilidadWidget,
  args: {
    textSize: "100",
    contrast: "normal",
    grayscale: false,
    lineSpacing: "normal",
    letterSpacing: "normal",
    underlineLinks: false,
    reducedMotion: false,
    theme: "light",
    isOpen: false,
    isGeovisor: false,
    isCollapsed: false,
    ultimoAnuncio: "Barra de accesibilidad lista",
    onToggleCollapse: fn(),
    onToggleOpen: fn(),
    onClose: fn(),
    onTextSizeChange: fn(),
    onAumentarTextSize: fn(),
    onDisminuirTextSize: fn(),
    onContrastChange: fn(),
    onToggleContrast: fn(),
    onGrayscaleToggle: fn(),
    onLineSpacingToggle: fn(),
    onLetterSpacingToggle: fn(),
    onUnderlineLinksToggle: fn(),
    onReducedMotionToggle: fn(),
    onThemeToggle: fn(),
    onResetAll: fn(),
  },
  parameters: {
    layout: "fullscreen",
    a11y: { test: "error" },
    docs: {
      description: {
        component:
          "Barra vertical fija de accesibilidad adosada al borde derecho estilo Función Pública / GOV.CO (A11Y-WIDGET-01b). Permite acciones directas de alto contraste, escala de texto A−/A+, restablecer, subpanel de Más Opciones y enlace a Centro de Relevo con soporte responsive y modo pestaña colapsada para el geovisor.",
      },
    },
  },
} satisfies Meta<typeof AccesibilidadWidget>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Barra lateral en reposo con interacción directa sobre contraste y aumento de texto */
export const BarraLateral: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const nav = canvas.getByRole("navigation", { name: "Menú de accesibilidad" });
    await expect(nav).toBeInTheDocument();

    const btnContraste = canvas.getByRole("button", { name: /alto contraste/i });
    await userEvent.click(btnContraste);
    await expect(args.onToggleContrast).toHaveBeenCalled();

    const btnAumentar = canvas.getByRole("button", { name: /aumentar tamaño de texto/i });
    await userEvent.click(btnAumentar);
    await expect(args.onAumentarTextSize).toHaveBeenCalled();

    // Verificación de enlace a Centro de Relevo (A11Y-WIDGET-01b)
    const linkRelevo = canvas.getByRole("link", { name: /centro de relevo/i });
    await expect(linkRelevo).toBeInTheDocument();
  },
};

/** Subpanel de Más Opciones desplegado a la izquierda de la barra */
export const ConMasOpciones: Story = {
  args: {
    isOpen: true,
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const panel = canvas.getByRole("region", { name: /controles adicionales de accesibilidad/i });
    await expect(panel).toBeInTheDocument();

    const btnReset = canvas.getByRole("button", { name: "Restablecer todo" });
    await userEvent.click(btnReset);
    await expect(args.onResetAll).toHaveBeenCalled();
  },
};

/** Modo Alto Contraste AAA (>= 7:1 en texto y >= 3:1 en bordes) */
export const AltoContraste: Story = {
  args: {
    contrast: "alto",
  },
  decorators: [
    (Story) => (
      <div data-a11y-contrast="alto" className="min-h-screen bg-[var(--background)] p-4 text-[var(--text-primary)]">
        <Story />
      </div>
    ),
  ],
};

/** Modo Oscuro */
export const Oscuro: Story = {
  args: {
    theme: "dark",
  },
  decorators: [
    (Story) => (
      <div className="dark min-h-screen bg-[var(--background)] p-4 text-[var(--text-primary)]">
        <Story />
      </div>
    ),
  ],
};

/** Escala de Texto al 200% (WCAG 1.4.4 / 1.4.10) */
export const Texto200: Story = {
  args: {
    textSize: "200",
  },
  decorators: [
    (Story) => (
      <div data-a11y-text-size="200" className="min-h-screen bg-[var(--background)] p-4 text-[var(--text-primary)]">
        <Story />
      </div>
    ),
  ],
};

/** Pestaña mínima colapsada para el Geovisor (no obstruye paneles acoplados) */
export const GeovisorColapsado: Story = {
  args: {
    isGeovisor: true,
    isCollapsed: true,
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const btnTab = canvas.getByRole("button", { name: "Abrir menú de accesibilidad" });
    await userEvent.click(btnTab);
    await expect(args.onToggleCollapse).toHaveBeenCalled();
  },
};
