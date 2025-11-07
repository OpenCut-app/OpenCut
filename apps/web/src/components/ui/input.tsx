"use client";

import { Eye, EyeOff, X } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "./button";
import { forwardRef, ComponentProps } from "react";
import { useState } from "react";

interface InputProps extends ComponentProps<"input"> {
  showPassword?: boolean;
  onShowPasswordChange?: (show: boolean) => void;
  showClearIcon?: boolean;
  onClear?: () => void;
  containerClassName?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      containerClassName,
      showPassword,
      onShowPasswordChange,
      showClearIcon,
      onClear,
      value,
      onFocus,
      onBlur,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);

    const isPassword = type === "password";
    const showPasswordToggle = isPassword && onShowPasswordChange;
    const showClear =
      showClearIcon &&
      onClear &&
      value &&
      String(value).length > 0 &&
      isFocused;
    const inputType = isPassword && showPassword ? "text" : type;

    const hasIcons = showPasswordToggle || showClear;
    const iconCount = Number(showPasswordToggle) + Number(showClear);
    const paddingRight =
      iconCount === 2 ? "pr-20" : iconCount === 1 ? "pr-10" : "";

    return (
      <div className={cn(hasIcons ? "relative w-full" : "", containerClassName)}>
        <input
          type={inputType}
          className={cn(
            "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-accent/50 px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[2px]",
            "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
            paddingRight,
            className
          )}
          ref={ref}
          value={value}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />
        {showClear && (
          <Button
            type="button"
            variant="text"
            size="icon"
            onMouseDown={(e) => {
              e.preventDefault();
              onClear?.();
            }}
            className="absolute right-0 top-0 h-full px-3 text-muted-foreground !opacity-100"
            aria-label="Clear input"
          >
            <X className="!size-[0.85]" />
          </Button>
        )}
        {showPasswordToggle && (
          <Button
            type="button"
            variant="text"
            size="icon"
            onClick={() => onShowPasswordChange?.(!showPassword)}
            className={cn(
              "absolute top-0 h-full px-3 text-muted-foreground hover:text-foreground",
              showClear ? "right-10" : "right-0"
            )}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
