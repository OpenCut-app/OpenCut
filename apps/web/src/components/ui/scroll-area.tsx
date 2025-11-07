import * as React from "react";
import { cn } from "@/lib/utils";

const ScrollArea = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("overflow-auto scrollbar-thin", className)}
    {...props}
  >
    {children}
  </div>
));
ScrollArea.displayName = "ScrollArea";

export { ScrollArea };
