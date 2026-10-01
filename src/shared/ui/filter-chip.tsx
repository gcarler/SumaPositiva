import type { ComponentProps } from "react";
import { Button } from "@/shared/ui/button";

export interface FilterChipProps extends ComponentProps<"button"> {
  active?: boolean;
}

export function FilterChip({
  active = false,
  children,
  ...props
}: FilterChipProps) {
  return (
    <Button
      {...props}
      variant={active ? "default" : "outline"}
      size="sm"
      aria-pressed={active}
    >
      {children}
    </Button>
  );
}
