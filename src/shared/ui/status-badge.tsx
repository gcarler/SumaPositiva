import type { ComponentProps } from "react";
import { Badge } from "@/shared/ui/badge";

export type StatusTone =
  "neutral" | "ember" | "success" | "warning" | "danger" | "info";
const variants = {
  neutral: "outline",
  ember: "ember",
  success: "success",
  warning: "warning",
  danger: "destructive",
  info: "info",
} as const;

export function StatusBadge({
  tone = "neutral",
  children,
  ...props
}: Omit<ComponentProps<typeof Badge>, "variant"> & { tone?: StatusTone }) {
  return (
    <Badge {...props} variant={variants[tone]}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {children}
    </Badge>
  );
}
