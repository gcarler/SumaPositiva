import * as React from "react";
import { cn } from "@/shared/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn("ui-field-control min-h-28 resize-y", className)}
      {...props}
    />
  );
}

export { Textarea };
