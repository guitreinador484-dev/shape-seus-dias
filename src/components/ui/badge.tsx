import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/80",
        secondary:
          "border-white/10 bg-white/5 backdrop-blur-md text-foreground/80 hover:bg-white/10 hover:text-foreground",
        destructive:
          "border-transparent bg-destructive/15 text-destructive border-destructive/20 hover:bg-destructive/25",
        outline:
          "border-white/15 text-foreground/70 backdrop-blur-md hover:border-white/25 hover:text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
