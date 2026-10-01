import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { Search, Users, VenetianMask, UserRound, Plus } from "lucide-react";
import { SearchField } from "./search-field";
import { FilterChip } from "./filter-chip";
import { EmptyState } from "./empty-state";
import { PageHeader } from "./page-header";
import { ChoiceGroup } from "./choice-group";
import { Notice } from "./notice";
import { StatusBadge } from "./status-badge";
import { Button } from "./button";
import { Skeleton } from "./skeleton";

const meta = {
  title: "Patrones/Composición",
  parameters: { layout: "padded" },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
function SearchDemo() {
  const [value, setValue] = useState("");
  return (
    <SearchField
      className="max-w-md"
      label="Buscar políticas"
      value={value}
      onValueChange={setValue}
      placeholder="Buscar por título o problema…"
    />
  );
}
export const SearchInput: Story = {
  name: "SearchField",
  render: () => <SearchDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("searchbox");
    await userEvent.type(input, "Movilidad");
    await userEvent.click(
      canvas.getByRole("button", { name: "Limpiar buscar políticas" }),
    );
    await expect(input).toHaveValue("");
  },
};
function FiltersDemo() {
  const [filter, setFilter] = useState("Todas");
  return (
    <div
      role="group"
      aria-label="Filtrar por sector"
      className="flex flex-wrap gap-2"
    >
      {["Todas", "Movilidad", "Salud", "Ambiente"].map((label) => (
        <FilterChip
          key={label}
          active={filter === label}
          onClick={() => setFilter(label)}
        >
          {label}
        </FilterChip>
      ))}
    </div>
  );
}
export const Filters: Story = {
  name: "FilterChip",
  render: () => <FiltersDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Salud" }));
    await expect(canvas.getByRole("button", { name: "Salud" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(canvas.getByRole("button", { name: "Todas" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  },
};
export const NoResults: Story = {
  name: "EmptyState · búsqueda",
  render: () => (
    <EmptyState
      icon={<Search />}
      title="No encontramos políticas"
      description="Prueba con otro término o ajusta los filtros."
      action={<Button variant="outline">Limpiar filtros</Button>}
    />
  ),
};
export const EmptyWorkspace: Story = {
  name: "EmptyState · primera visita",
  render: () => (
    <EmptyState
      icon={<Users />}
      title="La conversación comienza aquí"
      description="Crea una mesa e invita a tu comunidad a construir acuerdos."
      action={
        <Button>
          <Plus />
          Crear mesa
        </Button>
      }
    />
  ),
};
export const Header: Story = {
  name: "PageHeader",
  render: () => (
    <PageHeader
      eyebrow="Área de trabajo"
      title="Mesas de trabajo"
      description="Espacios para deliberar, construir acuerdos y documentar propuestas en comunidad."
      action={
        <Button>
          <Plus />
          Crear mesa
        </Button>
      }
    />
  ),
};
function ChoiceDemo() {
  const [value, setValue] = useState("anonimo");
  return (
    <ChoiceGroup
      className="max-w-xl"
      label="Forma de participar"
      value={value}
      onValueChange={setValue}
      options={[
        {
          value: "anonimo",
          label: "De forma anónima",
          description: "Participa sin publicar tu nombre.",
          icon: <VenetianMask />,
        },
        {
          value: "identidad",
          label: "Con mi identidad",
          description: "Firma tus aportes con tu nombre público.",
          icon: <UserRound />,
        },
        {
          value: "institucional",
          label: "Cuenta institucional",
          description: "Requiere un acceso habilitado.",
          disabled: true,
        },
      ]}
    />
  );
}
export const Choices: Story = {
  name: "ChoiceGroup",
  render: () => <ChoiceDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("radio", { name: /Con mi identidad/ }),
    );
    await expect(
      canvas.getByRole("radio", { name: /Con mi identidad/ }),
    ).toHaveAttribute("data-state", "checked");
    await userEvent.keyboard("{ArrowUp>}");
    await waitFor(() =>
      expect(
        canvas.getByRole("radio", { name: /De forma anónima/ }),
      ).toHaveAttribute("data-state", "checked"),
    );
    await userEvent.keyboard("{/ArrowUp}");
  },
};
export const Notices: Story = {
  name: "Notice · estados",
  render: () => (
    <div className="grid max-w-2xl gap-4">
      <Notice title="Consulta abierta">
        Puedes aportar hasta la fecha de cierre.
      </Notice>
      <Notice tone="success" title="Aporte publicado">
        Tu propuesta ya aparece en la línea estratégica.
      </Notice>
      <Notice tone="warning" title="Revisa tu información">
        Completa los campos obligatorios antes de continuar.
      </Notice>
      <Notice tone="danger" title="No pudimos guardar">
        Tu borrador sigue disponible. Intenta de nuevo.
      </Notice>
    </div>
  ),
};
export const Statuses: Story = {
  name: "StatusBadge",
  render: () => (
    <div className="flex flex-wrap gap-3">
      <StatusBadge>Programada</StatusBadge>
      <StatusBadge tone="ember">Consulta pública</StatusBadge>
      <StatusBadge tone="info">En deliberación</StatusBadge>
      <StatusBadge tone="warning">En revisión</StatusBadge>
      <StatusBadge tone="success">Aprobada</StatusBadge>
      <StatusBadge tone="danger">Cerrada</StatusBadge>
    </div>
  ),
};
export const LoadingCards: Story = {
  name: "Skeleton · carga",
  render: () => (
    <div
      role="status"
      aria-label="Cargando políticas"
      className="grid gap-4 sm:grid-cols-3"
    >
      {[1, 2, 3].map((key) => (
        <div
          key={key}
          className="space-y-5 rounded-xl border border-border bg-surface-1 p-6"
        >
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-4/5" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <Skeleton className="h-8 w-28" />
        </div>
      ))}
    </div>
  ),
};

export const DarkNotices: Story = {
  ...Notices,
  name: "Notice · tema oscuro",
  globals: { theme: "dark" },
};
export const DarkChoices: Story = {
  ...Choices,
  name: "ChoiceGroup · tema oscuro",
  globals: { theme: "dark" },
};
export const DarkStatuses: Story = {
  ...Statuses,
  name: "StatusBadge · tema oscuro",
  globals: { theme: "dark" },
};
