import { Button, ButtonProps } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ReactNode, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface SplitButtonProps {
  children: ReactNode;
  className?: string;
}

interface SplitButtonSideProps extends Omit<ButtonProps, "variant" | "size"> {
  children: ReactNode;
}

const SplitButton = forwardRef<HTMLDivElement, SplitButtonProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex rounded-full h-7 border border-input bg-panel-accent overflow-hidden",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
SplitButton.displayName = "SplitButton";

const SplitButtonSide = forwardRef<
  HTMLButtonElement,
  SplitButtonSideProps & { paddingClass: string }
>(({ children, className, paddingClass, onClick, ...props }, ref) => {
  return (
    <Button
      ref={ref}
      variant="text"
      className={cn(
        "h-full rounded-none bg-panel-accent !opacity-100 border-0 gap-0 font-normal transition-colors disabled:text-muted-foreground",
        onClick
          ? "hover:bg-foreground/10 hover:opacity-100 cursor-pointer"
          : "cursor-default select-text",
        paddingClass,
        className
      )}
      onClick={onClick}
      {...props}
    >
      {typeof children === "string" ? (
        <span className="font-normal cursor-text">{children}</span>
      ) : (
        children
      )}
    </Button>
  );
});
SplitButtonSide.displayName = "SplitButtonSide";

const SplitButtonLeft = forwardRef<HTMLButtonElement, SplitButtonSideProps>(
  ({ ...props }, ref) => {
    return <SplitButtonSide ref={ref} paddingClass="pl-3 pr-2" {...props} />;
  }
);
SplitButtonLeft.displayName = "SplitButtonLeft";

const SplitButtonRight = forwardRef<HTMLButtonElement, SplitButtonSideProps>(
  ({ ...props }, ref) => {
    return <SplitButtonSide ref={ref} paddingClass="pl-2 pr-3" {...props} />;
  }
);
SplitButtonRight.displayName = "SplitButtonRight";

const SplitButtonSeparator = forwardRef<HTMLDivElement, { className?: string }>(
  ({ className, ...props }, ref) => {
    return (
      <Separator
        ref={ref}
        orientation="vertical"
        className={cn("h-full bg-foreground/15", className)}
        {...props}
      />
    );
  }
);
SplitButtonSeparator.displayName = "SplitButtonSeparator";

export { SplitButton, SplitButtonLeft, SplitButtonRight, SplitButtonSeparator };
