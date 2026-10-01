"use client";

import { useId, type ReactNode } from "react";
import { Label } from "@/shared/ui/label";
import { cn } from "@/shared/lib/utils";

export interface FieldControlProps {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid": boolean;
  required: boolean;
}

export interface FormFieldProps {
  id?: string;
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: (props: FieldControlProps) => ReactNode;
}

/** Associates the label, helper text and validation error with one control. */
export function FormField({
  id: providedId,
  label,
  description,
  error,
  required = false,
  className,
  children,
}: FormFieldProps) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy =
    [descriptionId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("space-y-2", className)} data-slot="form-field">
      <Label htmlFor={id} className="text-sm leading-5 text-text-primary">
        {label}
        {required && (
          <span className="text-danger" aria-hidden="true">
            *
          </span>
        )}
      </Label>
      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": Boolean(error),
        required,
      })}
      {description && (
        <p
          id={descriptionId}
          className="text-xs leading-relaxed text-text-secondary"
        >
          {description}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-xs leading-relaxed text-danger"
        >
          {error}
        </p>
      )}
    </div>
  );
}
