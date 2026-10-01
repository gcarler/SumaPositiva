"use client";

import type { ComponentProps } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { cn } from "@/shared/lib/utils";

export interface SearchFieldProps extends Omit<
  ComponentProps<"input">,
  "type" | "value" | "onChange"
> {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
}

export function SearchField({
  label,
  value,
  onValueChange,
  className,
  ...props
}: SearchFieldProps) {
  return (
    <div className={cn("relative", className)} data-slot="search-field">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-text-tertiary"
      />
      <Input
        {...props}
        type="search"
        aria-label={label}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        className="rounded-full pl-10 pr-12 [&::-webkit-search-cancel-button]:appearance-none"
      />
      {value && (
        <Button
          variant="ghost"
          size="icon-sm"
          className="absolute right-1 top-1/2 -translate-y-1/2"
          aria-label={`Limpiar ${label.toLowerCase()}`}
          onClick={() => onValueChange("")}
        >
          <X className="size-4" aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}
