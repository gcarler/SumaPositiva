"use client";

import type { ComponentProps } from "react";
import { LayoutGrid, List, TableProperties } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/ui/tooltip";

export type CollectionViewMode = "lista" | "tarjetas" | "matriz";

export function CollectionViewToggle({
  value,
  onValueChange,
  label = "Vista de los registros",
  permitirMatriz = false,
}: {
  value: CollectionViewMode;
  onValueChange: (value: CollectionViewMode) => void;
  label?: string;
  permitirMatriz?: boolean;
}) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      value={value}
      aria-label={label}
      onValueChange={(next) => {
        if (next === "lista" || next === "tarjetas" || next === "matriz") {
          onValueChange(next as CollectionViewMode);
        }
      }}
      className="inline-flex items-center gap-0.5"
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <ToggleGroupItem
            value="lista"
            aria-label="Vista en lista"
            title="Vista en lista"
            className="size-8 p-0"
          >
            <List className="size-4" aria-hidden="true" />
          </ToggleGroupItem>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={6}>
          Vista en lista
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <ToggleGroupItem
            value="tarjetas"
            aria-label="Vista en cuadrícula"
            title="Vista en cuadrícula"
            className="size-8 p-0"
          >
            <LayoutGrid className="size-4" aria-hidden="true" />
          </ToggleGroupItem>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={6}>
          Vista en cuadrícula
        </TooltipContent>
      </Tooltip>

      {permitirMatriz && (
        <Tooltip>
          <TooltipTrigger asChild>
            <ToggleGroupItem
              value="matriz"
              aria-label="Vista en matriz"
              title="Vista en matriz"
              className="size-8 p-0"
            >
              <TableProperties className="size-4" aria-hidden="true" />
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={6}>
            Vista en matriz
          </TooltipContent>
        </Tooltip>
      )}
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
