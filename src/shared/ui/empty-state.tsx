import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-xl border border-dashed border-border-strong bg-surface-1 px-6 py-12 text-center",
        className,
      )}
      data-slot="empty-state"
      role="status"
    >
      {icon && (
        <span
          className="mb-4 flex size-12 items-center justify-center rounded-full bg-surface-2 text-text-secondary [&_svg]:size-5"
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      <p className="text-base font-medium text-text-primary">{title}</p>
      {description && (
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-text-secondary">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
