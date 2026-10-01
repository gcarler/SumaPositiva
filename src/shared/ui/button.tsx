import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/shared/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-medium transition-[background,color,border-color,box-shadow] duration-150 disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring",
  {
    variants: {
      variant: {
        default:
          "rounded-full border border-transparent bg-primary text-primary-foreground hover:bg-primary/90",
        ember:
          "rounded-full border border-transparent bg-ember text-ember-foreground hover:bg-ember/90",
        destructive:
          "rounded-full border border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "rounded-full border border-border-strong bg-surface-1 text-text-secondary hover:bg-surface-2 hover:text-text-primary",
        secondary:
          "rounded-full border border-transparent bg-secondary text-secondary-foreground hover:bg-surface-3",
        ghost:
          "rounded-full border border-transparent text-text-secondary hover:bg-surface-2 hover:text-text-primary",
        link: "rounded-sm text-ember underline-offset-4 hover:underline",
        unstyled: "min-w-0 whitespace-normal",
      },
      size: {
        default: "h-11 px-5 text-sm",
        sm: "h-9 gap-1.5 px-3.5 text-xs",
        lg: "h-12 px-6 text-sm",
        icon: "size-11 p-0",
        "icon-sm": "size-9 p-0",
        unstyled: "",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ComponentProps<"button">, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingLabel?: string;
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  loadingLabel,
  disabled,
  children,
  type,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      type={asChild ? undefined : (type ?? "button")}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading && (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          )}
          {loading && loadingLabel ? loadingLabel : children}
        </>
      )}
    </Comp>
  );
}

export { Button, buttonVariants };
