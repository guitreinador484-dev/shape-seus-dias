"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn("relative h-1.5 w-full overflow-hidden rounded-full bg-white/8", className)}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full w-full flex-1 transition-all duration-500 ease-out"
      style={{
        transform: `translateX(-${100 - (value || 0)}%)`,
        background: "linear-gradient(90deg, #7C5CFF 0%, #5B8CFF 100%)",
        boxShadow: value && value > 0 ? "0 0 8px rgba(124,92,255,0.5)" : undefined,
      }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
