"use client";

import * as React from "react";
import { Select as SelectPrimitive } from "radix-ui";
import { Check } from "lucide-react";
import { ArrowUpIcon, ArrowDownIcon } from "@hugeicons/core-free-icons";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/utils/ui";
import { HugeiconsIcon } from "@hugeicons/react";

const Select = SelectPrimitive.Root;

const SelectGroup = SelectPrimitive.Group;

const SelectValue = SelectPrimitive.Value;

const selectItemVariants = cva(
	"relative flex cursor-pointer select-none items-center gap-1.5 rounded-sm px-2 py-1 text-sm text-foreground/85 outline-hidden data-[highlighted]:bg-popover-hover data-disabled:pointer-events-none data-disabled:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0",
	{
		variants: {
			variant: {
				default: "",
				destructive:
					"text-destructive data-[highlighted]:bg-destructive/5 data-[highlighted]:text-destructive",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

const selectTriggerVariants = cva(
	"border-border ring-offset-background placeholder:text-muted-foreground flex h-7 w-auto cursor-pointer items-center justify-between gap-1 rounded-md border px-2.5 text-sm whitespace-nowrap transition-none focus:border-primary focus:ring-0 focus:ring-primary/10 focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
	{
		variants: {
			variant: {
				default: "bg-accent",
				outline: "bg-background hover:bg-accent/50",
			},
			size: {
				default: "",
				sm: "",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

const SelectTrigger = React.forwardRef<
	React.ElementRef<typeof SelectPrimitive.Trigger>,
	React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> &
		VariantProps<typeof selectTriggerVariants> & {
			icon?: React.ReactNode;
		}
>(({ className, children, icon, variant, size, ...props }, ref) => (
	<SelectPrimitive.Trigger
		ref={ref}
		className={cn(selectTriggerVariants({ variant, size }), className)}
		{...props}
	>
		<div className="flex items-center gap-1.5">
			{icon && (
				<span className="text-muted-foreground [&_svg]:size-3.5 shrink-0">
					{icon}
				</span>
			)}
			{children}
		</div>
		<SelectPrimitive.Icon asChild>
			<HugeiconsIcon icon={ArrowDownIcon} className="size-4" />
		</SelectPrimitive.Icon>
	</SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = React.forwardRef<
	React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
	React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
	<SelectPrimitive.ScrollUpButton
		ref={ref}
		className={cn(
			"flex cursor-default items-center justify-center py-1",
			className,
		)}
		{...props}
	>
		<HugeiconsIcon icon={ArrowUpIcon} className="size-4" />
	</SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<
	React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
	React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
	<SelectPrimitive.ScrollDownButton
		ref={ref}
		className={cn(
			"flex cursor-default items-center justify-center py-1",
			className,
		)}
		{...props}
	>
		<HugeiconsIcon icon={ArrowDownIcon} className="size-4" />
	</SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName =
	SelectPrimitive.ScrollDownButton.displayName;

const SelectContent = React.forwardRef<
	React.ElementRef<typeof SelectPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
	<SelectPrimitive.Portal>
		<SelectPrimitive.Content
			ref={ref}
			className={cn(
				"bg-popover text-popover-foreground z-50 max-h-(--radix-select-content-available-height) min-w-32 overflow-hidden rounded-md border p-1 shadow-lg",
				className,
			)}
			position={position}
			onCloseAutoFocus={(e) => {
				e.preventDefault();
				e.stopPropagation();
			}}
			{...props}
		>
			<SelectScrollUpButton />
			<SelectPrimitive.Viewport
				className={cn(
					position === "popper" &&
						"h-(--radix-select-trigger-height) w-full min-w-(--radix-select-trigger-width)",
				)}
			>
				{children}
			</SelectPrimitive.Viewport>
			<SelectScrollDownButton />
		</SelectPrimitive.Content>
	</SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<
	React.ElementRef<typeof SelectPrimitive.Label>,
	React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
	<SelectPrimitive.Label
		ref={ref}
		className={cn(
			"px-2 pb-1 pt-0.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground",
			className,
		)}
		{...props}
	/>
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = React.forwardRef<
	React.ElementRef<typeof SelectPrimitive.Item>,
	React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item> & {
		variant?: VariantProps<typeof selectItemVariants>["variant"];
	}
>(({ className, children, variant = "default", ...props }, ref) => (
	<SelectPrimitive.Item
		ref={ref}
		className={cn(selectItemVariants({ variant }), "pl-6 pr-2", className)}
		{...props}
	>
		<span className="absolute left-1.5 flex size-3.5 items-center justify-center">
			<SelectPrimitive.ItemIndicator>
				<Check className="size-3.5" />
			</SelectPrimitive.ItemIndicator>
		</span>
		<SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
	</SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
	React.ElementRef<typeof SelectPrimitive.Separator>,
	React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
	<SelectPrimitive.Separator
		ref={ref}
		className={cn("bg-border mx-1 my-1 h-px", className)}
		{...props}
	/>
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
	Select,
	SelectGroup,
	SelectValue,
	SelectTrigger,
	SelectContent,
	SelectLabel,
	SelectItem,
	SelectSeparator,
	SelectScrollUpButton,
	SelectScrollDownButton,
};
