import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

export interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 max-w-3xl">
        {eyebrow && (
          <p className="label-micro mb-3 text-text-tertiary">{eyebrow}</p>
        )}
        <h1 className="ui-page-title text-text-primary">{title}</h1>
        {description && (
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-text-secondary md:text-base">
            {description}
          </p>
        )}
      </div>
      {action && (
        <div className="shrink-0 self-start sm:self-auto">{action}</div>
      )}
    </header>
  );
}
