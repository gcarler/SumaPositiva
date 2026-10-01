import * as React from "react";
import { cn } from "@/shared/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "ui-field-control h-11 file:mr-3 file:border-0 file:bg-transparent file:font-medium file:text-text-primary",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
