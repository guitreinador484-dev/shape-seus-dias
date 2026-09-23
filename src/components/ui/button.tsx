import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border text-sm font-bold cursor-pointer transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "border-primary bg-linear-to-b from-primary to-primary/80 text-primary-foreground shadow-[0_8px_24px_-12px_color-mix(in_oklab,var(--primary)_65%,transparent)] hover:brightness-110 hover:shadow-[0_10px_28px_-10px_color-mix(in_oklab,var(--primary)_75%,transparent)]",
        destructive:
          "border-destructive bg-destructive text-destructive-foreground shadow-md shadow-destructive/20 hover:brightness-110",
        outline:
          "border-border bg-secondary text-foreground shadow-sm hover:border-primary/60 hover:bg-surface-2 hover:text-primary",
        secondary:
          "border-border bg-secondary text-secondary-foreground shadow-sm hover:border-primary/50 hover:bg-surface-2 hover:text-foreground",
        ghost:
          "border-transparent text-foreground/75 hover:bg-surface-2 hover:text-primary",
        link:
          "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2 text-sm",
        sm: "h-10 rounded-lg px-3 text-xs sm:h-9",
        lg: "h-12 rounded-lg px-6 text-base font-bold",
        icon: "h-11 w-11 rounded-lg sm:h-10 sm:w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
