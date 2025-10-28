"use client";

import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ReactNode, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlaybackStore } from "@/stores/playback-store";
import { DragData } from "@/types/timeline";

export interface DraggableMediaItemProps {
  name: string;
  preview: ReactNode;
  dragData: DragData;
  onDragStart?: (e: React.DragEvent) => void;
  onAddToTimeline?: (currentTime: number) => void;
  aspectRatio?: number;
  className?: string;
  containerClassName?: string;
  showPlusOnDrag?: boolean;
  showLabel?: boolean;
  rounded?: boolean;
  variant?: "card" | "compact";
  isDraggable?: boolean;
  isHighlighted?: boolean;
}

export function DraggableMediaItem({
  name,
  preview,
  dragData,
  onDragStart,
  onAddToTimeline,
  aspectRatio = 16 / 9,
  className = "",
  containerClassName,
  showPlusOnDrag = true,
  showLabel = true,
  rounded = true,
  variant = "card",
  isDraggable = true,
  isHighlighted = false,
}: DraggableMediaItemProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const dragRef = useRef<HTMLDivElement>(null);
  const currentTime = isDraggable
    ? usePlaybackStore((state) => state.currentTime)
    : 0;
  const highlightClassName = "ring-2 ring-primary rounded-sm bg-primary/10";

  const handleAddToTimeline = () => {
    onAddToTimeline?.(currentTime);
  };

  const emptyImg = new window.Image();
  emptyImg.src =
    "data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=";

  useEffect(() => {
    if (!isDragging) return;

    const handleDragOver = (e: DragEvent) => {
      setDragPosition({ x: e.clientX, y: e.clientY });
    };

    document.addEventListener("dragover", handleDragOver);

    return () => {
      document.removeEventListener("dragover", handleDragOver);
    };
  }, [isDragging]);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setDragImage(emptyImg, 0, 0);

    // Set drag data
    e.dataTransfer.setData(
      "application/x-media-item",
      JSON.stringify(dragData)
    );
    e.dataTransfer.effectAllowed = "copy";

    // Set initial position and show custom drag preview
    setDragPosition({ x: e.clientX, y: e.clientY });
    setIsDragging(true);

    onDragStart?.(e);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <>
      {variant === "card" ? (
        <div
          ref={dragRef}
          className={cn("relative group", containerClassName ?? "w-28 h-28")}
        >
          <div
            className={cn(
              "flex flex-col gap-1 p-1 h-auto w-full relative cursor-default",
              className,
              isHighlighted && highlightClassName
            )}
          >
            <AspectRatio
              ratio={aspectRatio}
              className={cn(
                "bg-panel-accent relative overflow-hidden",
                rounded && "rounded-md",
                isDraggable && "[&::-webkit-drag-ghost]:opacity-0" // Webkit-specific ghost hiding
              )}
              draggable={isDraggable}
              onDragStart={isDraggable ? handleDragStart : undefined}
              onDragEnd={isDraggable ? handleDragEnd : undefined}
            >
              {preview}
              {!isDragging && (
                <PlusButton
                  className="opacity-0 group-hover:opacity-100"
                  onClick={handleAddToTimeline}
                />
              )}
            </AspectRatio>
            {showLabel && (
              <span
                className="text-[0.7rem] text-muted-foreground truncate w-full text-left"
                aria-label={name}
                title={name}
              >
                {name.length > 8
                  ? `${name.slice(0, 16)}...${name.slice(-3)}`
                  : name}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div
          ref={dragRef}
          className={cn(
            "relative group w-full",
            isHighlighted && highlightClassName
          )}
        >
          <div
            className={cn(
              "h-8 flex items-center gap-3 cursor-default w-full px-1",
              isDraggable && "[&::-webkit-drag-ghost]:opacity-0",
              className
            )}
            draggable={isDraggable}
            onDragStart={isDraggable ? handleDragStart : undefined}
            onDragEnd={isDraggable ? handleDragEnd : undefined}
          >
            <div className="w-6 h-6 flex-shrink-0 rounded-[0.35rem] overflow-hidden">
              {preview}
            </div>
            <span className="text-sm truncate flex-1 w-full">{name}</span>
          </div>
        </div>
      )}

      {/* Custom drag preview */}
      {isDraggable &&
        isDragging &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed pointer-events-none z-9999"
            style={{
              left: dragPosition.x - 40, // Center the preview (half of 80px)
              top: dragPosition.y - 40, // Center the preview (half of 80px)
            }}
          >
            <div className="w-[80px]">
              <AspectRatio
                ratio={1}
                className="relative rounded-md overflow-hidden shadow-2xl ring-3 ring-primary"
              >
                <div className="w-full h-full [&_img]:w-full [&_img]:h-full [&_img]:object-cover [&_img]:rounded-none">
                  {preview}
                </div>
                {showPlusOnDrag && (
                  <PlusButton
                    onClick={handleAddToTimeline}
                    tooltipText="Add to timeline or drag to position"
                  />
                )}
              </AspectRatio>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

function PlusButton({
  className,
  onClick,
  tooltipText,
}: {
  className?: string;
  onClick?: () => void;
  tooltipText?: string;
}) {
  const button = (
    <Button
      size="icon"
      className={cn(
        "absolute bottom-2 right-2 size-5 bg-background hover:bg-panel text-foreground",
        className
      )}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick?.();
      }}
      title={tooltipText}
    >
      <Plus className="size-4!" />
    </Button>
  );

  if (tooltipText) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent>
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return button;
}
