import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface PropertyItemProps {
  direction?: "row" | "column";
  children: React.ReactNode;
  className?: string;
}

export function PropertyItem({
  direction = "row",
  children,
  className,
}: PropertyItemProps) {
  return (
    <div
      className={cn(
        "flex gap-2",
        direction === "row"
          ? "items-center justify-between gap-6"
          : "flex-col gap-1.5",
        className
      )}
    >
      {children}
    </div>
  );
}

export function PropertyItemLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("text-xs text-muted-foreground", className)}>
      {children}
    </label>
  );
}

export function PropertyItemValue({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("flex-1 text-sm", className)}>{children}</div>;
}

interface PropertyGroupProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  className?: string;
  titleClassName?: string;
}

export function PropertyGroup({
  title,
  children,
  defaultExpanded = true,
  className,
  titleClassName,
}: PropertyGroupProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <PropertyItem direction="column" className={cn("gap-3", className)}>
      <div
        className="flex items-center gap-1.5 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <PropertyItemLabel className={cn("cursor-pointer", titleClassName)}>
          {title}
        </PropertyItemLabel>
        <ChevronDown className={cn("size-3", !isExpanded && "-rotate-90")} />
      </div>
      {isExpanded && <PropertyItemValue>{children}</PropertyItemValue>}
    </PropertyItem>
  );
}
