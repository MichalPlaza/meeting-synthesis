import * as React from "react";
import { cn } from "@/lib/utils";

const Separator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="separator"
    className={cn("shrink-0 bg-border", className, "h-px w-full")}
    {...props}
  />
));

Separator.displayName = "Separator";

export { Separator };
