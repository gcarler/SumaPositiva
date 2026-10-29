import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { CollectionLayout, CollectionViewToggle, type CollectionViewMode } from "@/shared/ui/collection-view";
import { Button } from "@/shared/ui/button";

const meta = {
  title: "Shared/Collection view",
  component: CollectionViewToggle,
  tags: ["autodocs"],
  args: { value: "tarjetas", onValueChange: () => {} },
} satisfies Meta<typeof CollectionViewToggle>;
export default meta;
type Story = StoryObj<typeof meta>;

function Example({ initial }: { initial: CollectionViewMode }) {
  const [view, setView] = useState<CollectionViewMode>(initial);
  return (
    <div className="space-y-4 p-4">
      <CollectionViewToggle value={view} onValueChange={setView} />
      <CollectionLayout view={view} aria-label="Registros de ejemplo">
        {["Cartagena", "Santa Catalina", "Sahagún"].map((name) => (
          <article key={name} className="space-y-3 rounded-xl border border-border bg-surface-1 p-4">
            <h2 className="font-semibold text-text-primary">{name}</h2>
            <p className="text-sm text-text-secondary">Información territorial de ejemplo.</p>
            <Button variant="outline" size="sm">Consultar {name}</Button>
          </article>
        ))}
      </CollectionLayout>
    </div>
  );
}

export const Tarjetas: Story = { render: () => <Example initial="tarjetas" /> };
export const Lista: Story = { render: () => <Example initial="lista" /> };
