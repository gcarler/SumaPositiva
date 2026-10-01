import type { ReactNode } from "react";
import { CircleCheck, CircleAlert, Info } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export interface NoticeProps {
  tone?: "info" | "success" | "warning" | "danger";
  title: string;
  children?: ReactNode;
  className?: string;
}
const styles = {
  info: "border-info/20 bg-info-soft text-info",
  success: "border-success/20 bg-success-soft text-success",
  warning: "border-warning/20 bg-warning-soft text-warning",
  danger: "border-danger/20 bg-danger-soft text-danger",
};

export function Notice({
  tone = "info",
  title,
  children,
  className,
}: NoticeProps) {
  const Icon =
    tone === "success" ? CircleCheck : tone === "info" ? Info : CircleAlert;
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "flex gap-3 rounded-xl border p-4",
        styles[tone],
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div>
        <p className="text-sm font-medium">{title}</p>
        {children && (
          <div className="mt-1 text-sm leading-relaxed text-text-secondary">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
