"use client";

import type { ComponentProps } from "react";
import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/toggle-group";

export type CollectionViewMode = "lista" | "tarjetas";

export function CollectionViewToggle({
  value,
  onValueChange,
  label = "Vista de los registros",
}: {
  value: CollectionViewMode;
  onValueChange: (value: CollectionViewMode) => void;
  label?: string;
}) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      value={value}
      aria-label={label}
      onValueChange={(next) => {
        if (next === "lista" || next === "tarjetas") onValueChange(next);
      }}
    >
      <ToggleGroupItem value="lista" aria-label="Vista en lista" className="gap-1.5">
        <List className="size-4" aria-hidden="true" />Lista
      </ToggleGroupItem>
      <ToggleGroupItem value="tarjetas" aria-label="Vista en tarjetas" className="gap-1.5">
        <LayoutGrid className="size-4" aria-hidden="true" />Tarjetas
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

/** One collection, with the same records and actions in either layout. */
export function CollectionLayout({
  view,
  className,
  ...props
}: ComponentProps<"div"> & { view: CollectionViewMode }) {
  return (
    <div
      role="group"
      {...props}
      data-view={view}
      className={cn(
        "min-w-0 gap-4 [overflow-wrap:anywhere] [&>*]:min-w-0",
        view === "tarjetas" ? "grid sm:grid-cols-2 xl:grid-cols-3" : "flex flex-col",
        className,
      )}
    />
  );
}
