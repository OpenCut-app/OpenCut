"use client";

import { useEffect, useRef } from "react";

interface SelectionBoxProps {
  startPos: { x: number; y: number } | null;
  currentPos: { x: number; y: number } | null;
  containerRef: React.RefObject<HTMLElement>;
  isActive: boolean;
}

export function SelectionBox({
  startPos,
  currentPos,
  containerRef,
  isActive,
}: SelectionBoxProps) {
  const selectionBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !startPos || !currentPos || !containerRef.current) return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();

    // Calculate relative positions within the container
    const startX = startPos.x - containerRect.left;
    const startY = startPos.y - containerRect.top;
    const currentX = currentPos.x - containerRect.left;
    const currentY = currentPos.y - containerRect.top;

    // Calculate the selection rectangle bounds
    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    // Update the selection box position and size
    if (selectionBoxRef.current) {
      selectionBoxRef.current.style.left = `${left}px`;
      selectionBoxRef.current.style.top = `${top}px`;
      selectionBoxRef.current.style.width = `${width}px`;
      selectionBoxRef.current.style.height = `${height}px`;
    }
  }, [startPos, currentPos, isActive, containerRef]);

  if (!isActive || !startPos || !currentPos) return null;

  return (
    <div
      ref={selectionBoxRef}
      className="absolute pointer-events-none z-50 bg-foreground/10"
    />
  );
}
