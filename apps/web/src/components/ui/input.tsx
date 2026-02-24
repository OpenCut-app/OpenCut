"use client";

import { Eye, EyeOff, X } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/utils/ui";
import { Button } from "./button";
import { forwardRef, type ComponentProps } from "react";
import { useState } from "react";

const inputVariants = cva(
	"file:text-foreground placeholder:text-muted-foreground border-border bg-input flex w-full min-w-0 rounded-md border shadow-xs outline-none file:inline-flex file:border-0 file:bg-transparent file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-0 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
	{
		variants: {
			variant: {
				default: "selection:bg-primary selection:text-primary-foreground",
				destructive:
					"selection:bg-destructive selection:text-destructive-foreground focus-visible:border-destructive focus-visible:ring-destructive/10",
			},
			size: {
				default: "h-9 px-3 py-1 text-base file:h-7 file:text-sm md:text-sm",
				xs: "h-7 px-3 text-xs file:h-6 file:text-xs",
				sm: "h-8 px-3 text-sm file:h-6 file:text-xs",
				lg: "h-10 px-4 text-base file:h-8 file:text-sm md:text-sm",
			},
		},
		defaultVariants: {
			size: "default",
			variant: "default",
		},
	},
);

interface InputProps
	extends Omit<ComponentProps<"input">, "size">,
		VariantProps<typeof inputVariants> {
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
			size,
			variant,
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
		ref,
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
			<div
				className={cn(hasIcons ? "relative w-full" : "", containerClassName)}
			>
				<input
					type={inputType}
					className={cn(
						inputVariants({
							size,
							className: cn(paddingRight, className),
							variant,
						}),
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
						variant="text"
						size="icon"
						onMouseDown={(e) => {
							e.preventDefault();
							onClear?.();
						}}
						className="text-muted-foreground absolute top-0 right-0 h-full px-3 !opacity-100"
						aria-label="Clear input"
					>
						<X className="!size-[0.85]" />
					</Button>
				)}
				{showPasswordToggle && (
					<Button
						variant="text"
						size="icon"
						onClick={() => onShowPasswordChange?.(!showPassword)}
						className={cn(
							"text-muted-foreground hover:text-foreground absolute top-0 h-full px-3",
							showClear ? "right-10" : "right-0",
						)}
						aria-label={showPassword ? "Hide password" : "Show password"}
					>
						{showPassword ? (
							<Eye className="size-4" />
						) : (
							<EyeOff className="size-4" />
						)}
					</Button>
				)}
			</div>
		);
	},
);
Input.displayName = "Input";

export { Input };
