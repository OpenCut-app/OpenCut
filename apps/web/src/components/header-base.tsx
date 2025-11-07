"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type HeaderBaseProps = {
  leftContent?: ReactNode;
  centerContent?: ReactNode;
  rightContent?: ReactNode;
  className?: string;
  children?: ReactNode;
};

export function HeaderBase({
  leftContent,
  centerContent,
  rightContent,
  className,
  children,
}: HeaderBaseProps) {
  // If children is provided, render it directly without the grid layout
  if (children) {
    return (
      <header
        className={cn("flex h-16 items-center px-6", className)}
        role="banner"
      >
        {children}
      </header>
    );
  }

  return (
    <header
      className={cn("flex h-14 items-center justify-between px-6", className)}
      role="banner"
    >
      {leftContent && (
        <div className="flex items-center" key="leftContent">
          {leftContent}
        </div>
      )}

      {centerContent && (
        <div className="flex items-center" key="centerContent">
          {centerContent}
        </div>
      )}

      {rightContent && (
        <div className="flex items-center" key="rightContent">
          {rightContent}
        </div>
      )}
    </header>
  );
}
