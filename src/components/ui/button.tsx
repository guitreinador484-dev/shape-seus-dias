import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border text-sm font-semibold cursor-pointer transition-[background-color,border-color,color,filter,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default:
          "border-primary bg-primary text-primary-foreground hover:brightness-110",
        destructive:
          "border-destructive bg-destructive text-destructive-foreground hover:brightness-110",
        outline:
          "border-input bg-transparent text-foreground hover:bg-secondary",
        secondary:
          "border-border bg-secondary text-secondary-foreground hover:bg-surface-2",
        ghost:
          "border-transparent text-foreground/80 hover:bg-secondary hover:text-foreground",
        link:
          "border-transparent text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2 text-sm",
        sm: "h-10 rounded-lg px-3 text-xs sm:h-9",
        lg: "h-12 rounded-lg px-6 text-base",
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
