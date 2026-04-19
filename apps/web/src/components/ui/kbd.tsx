"use client"
import * as React from "react";
import { cn } from "@/utils/ui";
type KbdProps = {
    children: React.ReactNode;
    className?: string;
}
export const Kbd =  (
    { 
        children,
        className

    }: KbdProps) => {
  return (
    <kbd className={cn("rounded bg-muted px-1.5 py-0.5 text-xs font-mono border", className)}>
      {children}
    </kbd>
  );
}