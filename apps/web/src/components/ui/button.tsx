import * as React from "react";
import { Slot as SlotPrimitive } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center cursor-pointer justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-foreground text-background shadow-sm hover:bg-foreground/90",
        primary:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
        "primary-gradient":
          "bg-gradient-to-r from-cyan-400 to-blue-500 text-white hover:opacity-85 transition-opacity",
        destructive:
          "bg-destructive/0 border border-destructive/25 text-destructive shadow-xs hover:bg-destructive hover:text-destructive-foreground",
        outline:
          "border border-input bg-transparent shadow-xs hover:opacity-75 transition-opacity hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-foreground/15 border border-input",
        text: "bg-transparent p-0 rounded-none opacity-100 hover:opacity-50 transition-opacity", // Instead of ghost (matches app better)
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-sm px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-7 w-7",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? SlotPrimitive.Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
