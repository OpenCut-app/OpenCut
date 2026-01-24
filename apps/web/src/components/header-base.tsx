import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface HeaderBaseProps {
  leftContent?: ReactNode;
  rightContent?: ReactNode;
  className?: string;
}

export function HeaderBase({
  leftContent,
  rightContent,
  className,
}: HeaderBaseProps) {
  return (
    <header className={cn("flex justify-between", className)}>
      <div>{leftContent}</div>
      <div>{rightContent}</div>
    </header>
  );
}
