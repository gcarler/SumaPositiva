"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";

export interface PasswordInputProps
  extends Omit<React.ComponentProps<"input">, "type"> {
  mostrarBotonVisibilidad?: boolean;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput(
    { className, mostrarBotonVisibilidad = true, disabled, ...props },
    ref,
  ) {
    const [visible, setVisible] = React.useState(false);

    return (
      <div className="relative w-full" data-slot="password-input">
        <Input
          {...props}
          ref={ref}
          type={visible ? "text" : "password"}
          disabled={disabled}
          className={cn(mostrarBotonVisibilidad && "pr-11", className)}
        />
        {mostrarBotonVisibilidad && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={disabled}
            onClick={() => setVisible((prev) => !prev)}
            aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={visible}
            title={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
            tabIndex={0}
            className="absolute right-1 top-1/2 -translate-y-1/2 size-8 text-text-tertiary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {visible ? (
              <EyeOff className="size-4" aria-hidden="true" />
            ) : (
              <Eye className="size-4" aria-hidden="true" />
            )}
          </Button>
        )}
      </div>
    );
  },
);

PasswordInput.displayName = "PasswordInput";
