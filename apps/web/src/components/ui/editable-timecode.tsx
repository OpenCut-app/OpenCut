"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { formatTimeCode, parseTimeCode, TimeCode } from "@/lib/time";
import { DEFAULT_FPS } from "@/stores/project-store";

interface EditableTimecodeProps {
  time: number;
  duration?: number;
  format?: TimeCode;
  fps?: number;
  onTimeChange?: (time: number) => void;
  className?: string;
  disabled?: boolean;
}

export function EditableTimecode({
  time,
  duration,
  format = "HH:MM:SS:FF",
  fps = DEFAULT_FPS,
  onTimeChange,
  className,
  disabled = false,
}: EditableTimecodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [hasError, setHasError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const enterPressedRef = useRef(false);

  const formattedTime = formatTimeCode(time, format, fps);

  const startEditing = () => {
    if (disabled) return;
    setIsEditing(true);
    setInputValue(formattedTime);
    setHasError(false);
    enterPressedRef.current = false;
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setInputValue("");
    setHasError(false);
    enterPressedRef.current = false;
  };

  const applyEdit = () => {
    const parsedTime = parseTimeCode(inputValue, format, fps);

    if (parsedTime === null) {
      setHasError(true);
      return;
    }

    // Clamp time to valid range
    const clampedTime = Math.max(
      0,
      duration ? Math.min(duration, parsedTime) : parsedTime
    );

    onTimeChange?.(clampedTime);
    setIsEditing(false);
    setInputValue("");
    setHasError(false);
    enterPressedRef.current = false;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      enterPressedRef.current = true;
      applyEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEditing();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setHasError(false);
  };

  const handleBlur = () => {
    // Only apply edit if Enter wasn't pressed (to avoid double processing)
    if (!enterPressedRef.current && isEditing) {
      applyEdit();
    }
  };

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className={cn(
          "text-xs font-mono bg-transparent border-none outline-none",
          "focus:bg-background focus:border focus:border-primary focus:px-1 focus:rounded",
          "tabular-nums text-primary",
          hasError && "text-destructive focus:border-destructive",
          className
        )}
        style={{ width: `${formattedTime.length + 1}ch` }}
        placeholder={formattedTime}
      />
    );
  }

  return (
    <span
      onClick={startEditing}
      className={cn(
        "text-xs font-mono tabular-nums text-primary cursor-pointer",
        "hover:bg-muted/50 hover:rounded px-1 -mx-1 transition-colors",
        disabled && "cursor-default hover:bg-transparent",
        className
      )}
      title={disabled ? undefined : "Click to edit time"}
    >
      {formattedTime}
    </span>
  );
}
