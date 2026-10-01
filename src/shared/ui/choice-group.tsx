"use client";

import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import type { ComponentProps, ReactNode } from "react";
import { CircleCheck } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export interface ChoiceOption {
  value: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface ChoiceGroupProps extends Omit<
  ComponentProps<typeof RadioGroupPrimitive.Root>,
  "children"
> {
  options: ChoiceOption[];
  label: string;
}

/** Radio cards with roving focus and arrow-key navigation from Radix. */
export function ChoiceGroup({
  options,
  label,
  className,
  ...props
}: ChoiceGroupProps) {
  return (
    <RadioGroupPrimitive.Root
      {...props}
      aria-label={label}
      className={cn("grid gap-3", className)}
    >
      {options.map((option) => (
        <RadioGroupPrimitive.Item
          key={option.value}
          value={option.value}
          disabled={option.disabled}
          className="group flex w-full items-start gap-3 rounded-xl border border-border-strong bg-surface-1 p-4 text-left transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-ember data-[state=checked]:bg-ember-soft"
        >
          {option.icon && (
            <span
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface-1 text-text-secondary group-data-[state=checked]:text-ember [&_svg]:size-4"
            >
              {option.icon}
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-text-primary">
              {option.label}
            </span>
            {option.description && (
              <span className="mt-1 block text-xs leading-relaxed text-text-secondary">
                {option.description}
              </span>
            )}
          </span>
          <RadioGroupPrimitive.Indicator className="text-ember">
            <CircleCheck className="size-4" aria-hidden="true" />
          </RadioGroupPrimitive.Indicator>
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  );
}
