"use client";

import * as React from "react";
import { ContextMenu as ContextMenuPrimitive } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/utils/ui";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	Tick02Icon,
	ArrowRightIcon,
	CircleIcon,
} from "@hugeicons/core-free-icons";

const ContextMenu = ContextMenuPrimitive.Root;

const ContextMenuTrigger = ContextMenuPrimitive.Trigger;

const ContextMenuGroup = ContextMenuPrimitive.Group;

const ContextMenuPortal = ContextMenuPrimitive.Portal;

const ContextMenuSub = ContextMenuPrimitive.Sub;

const ContextMenuRadioGroup = ContextMenuPrimitive.RadioGroup;

const contextMenuItemVariants = cva(
	"relative flex cursor-pointer select-none items-center gap-2.5 px-4 py-1.5 text-sm outline-hidden data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
	{
		variants: {
			variant: {
				default:
					"focus:bg-accent focus:text-accent-foreground [&_svg]:text-muted-foreground",
				destructive:
					"text-destructive focus:bg-destructive/5 focus:text-destructive [&_svg]:text-destructive",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

const ContextMenuSubTrigger = React.forwardRef<
	React.ElementRef<typeof ContextMenuPrimitive.SubTrigger>,
	React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubTrigger> & {
		inset?: boolean;
		variant?: VariantProps<typeof contextMenuItemVariants>["variant"];
		icon?: React.ReactNode;
	}
>(
	(
		{ className, inset, children, variant = "default", icon, ...props },
		ref,
	) => (
		<ContextMenuPrimitive.SubTrigger
			ref={ref}
			className={cn(
				contextMenuItemVariants({ variant }),
				"data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
				inset && "pl-8",
				className,
			)}
			{...props}
		>
			{icon && (
				<span className="size-4 shrink-0 text-muted-foreground">{icon}</span>
			)}
			{children}
			<HugeiconsIcon
				icon={ArrowRightIcon}
				className="ml-auto text-muted-foreground/80"
			/>
		</ContextMenuPrimitive.SubTrigger>
	),
);
ContextMenuSubTrigger.displayName = ContextMenuPrimitive.SubTrigger.displayName;

const ContextMenuSubContent = React.forwardRef<
	React.ElementRef<typeof ContextMenuPrimitive.SubContent>,
	React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
	<ContextMenuPrimitive.SubContent
		ref={ref}
		className={cn(
			"bg-popover text-popover-foreground z-50 min-w-48 overflow-hidden rounded-lg border shadow-xl py-2.5",
			className,
		)}
		{...props}
	/>
));
ContextMenuSubContent.displayName = ContextMenuPrimitive.SubContent.displayName;

const ContextMenuContent = React.forwardRef<
	React.ElementRef<typeof ContextMenuPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Content> & {
		container?: HTMLElement | null;
	}
>(({ className, container, ...props }, ref) => (
	<ContextMenuPrimitive.Portal container={container ?? undefined}>
		<ContextMenuPrimitive.Content
			ref={ref}
			className={cn(
				"bg-popover text-popover-foreground z-50 min-w-48 overflow-hidden rounded-lg border shadow-xl py-1.5",
				className,
			)}
			{...props}
		/>
	</ContextMenuPrimitive.Portal>
));
ContextMenuContent.displayName = ContextMenuPrimitive.Content.displayName;

const ContextMenuItem = React.forwardRef<
	React.ElementRef<typeof ContextMenuPrimitive.Item>,
	React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Item> & {
		inset?: boolean;
		variant?: VariantProps<typeof contextMenuItemVariants>["variant"];
		icon?: React.ReactNode;
		textRight?: string;
	}
>(
	(
		{
			className,
			inset,
			variant = "default",
			icon,
			children,
			textRight,
			...props
		},
		ref,
	) => {
		const shouldInsetContent = inset || Boolean(icon);

		return (
			<ContextMenuPrimitive.Item
				ref={ref}
				className={cn(
					contextMenuItemVariants({ variant }),
					shouldInsetContent && "pl-8",
					className,
				)}
				{...props}
			>
				{icon && (
					<span className="absolute left-3 flex size-3.5 items-center justify-center text-muted-foreground [&_svg]:size-4 [&_svg]:shrink-0">
						{icon}
					</span>
				)}
				{children}
				{textRight && (
					<span className="ml-auto text-[0.60rem] tracking-widest text-muted-foreground/80 mb-0.5">
						{textRight}
					</span>
				)}
			</ContextMenuPrimitive.Item>
		);
	},
);
ContextMenuItem.displayName = ContextMenuPrimitive.Item.displayName;

const ContextMenuCheckboxItem = React.forwardRef<
	React.ElementRef<typeof ContextMenuPrimitive.CheckboxItem>,
	React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.CheckboxItem> & {
		variant?: VariantProps<typeof contextMenuItemVariants>["variant"];
		icon?: React.ReactNode;
	}
>(
	(
		{ className, children, checked, variant = "default", icon, ...props },
		ref,
	) => (
		<ContextMenuPrimitive.CheckboxItem
			ref={ref}
			className={cn(
				contextMenuItemVariants({ variant }),
				"pr-2 pl-8",
				className,
			)}
			checked={checked}
			{...props}
		>
			<span className="absolute left-3 flex size-3.5 items-center justify-center">
				<ContextMenuPrimitive.ItemIndicator>
					<HugeiconsIcon icon={Tick02Icon} className="size-4" />
				</ContextMenuPrimitive.ItemIndicator>
			</span>
			{icon && (
				<span className="size-4 shrink-0 text-muted-foreground">{icon}</span>
			)}
			{children}
		</ContextMenuPrimitive.CheckboxItem>
	),
);
ContextMenuCheckboxItem.displayName =
	ContextMenuPrimitive.CheckboxItem.displayName;

const ContextMenuRadioItem = React.forwardRef<
	React.ElementRef<typeof ContextMenuPrimitive.RadioItem>,
	React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.RadioItem> & {
		variant?: VariantProps<typeof contextMenuItemVariants>["variant"];
		icon?: React.ReactNode;
	}
>(({ className, children, variant = "default", icon, ...props }, ref) => (
	<ContextMenuPrimitive.RadioItem
		ref={ref}
		className={cn(contextMenuItemVariants({ variant }), "pr-2 pl-8", className)}
		{...props}
	>
		<span className="absolute left-2 flex size-3.5 items-center justify-center">
			<ContextMenuPrimitive.ItemIndicator>
				<HugeiconsIcon icon={CircleIcon} className="size-2 fill-current" />
			</ContextMenuPrimitive.ItemIndicator>
		</span>
		{icon && (
			<span className="size-4 shrink-0 text-muted-foreground">{icon}</span>
		)}
		{children}
	</ContextMenuPrimitive.RadioItem>
));
ContextMenuRadioItem.displayName = ContextMenuPrimitive.RadioItem.displayName;

const ContextMenuLabel = React.forwardRef<
	React.ElementRef<typeof ContextMenuPrimitive.Label>,
	React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Label> & {
		inset?: boolean;
		icon?: React.ReactNode;
	}
>(({ className, inset, icon, children, ...props }, ref) => (
	<ContextMenuPrimitive.Label
		ref={ref}
		className={cn(
			"flex items-center gap-2.5 px-4 py-1.5 text-sm font-semibold text-foreground",
			inset && "pl-8",
			className,
		)}
		{...props}
	>
		{icon && (
			<span className="size-4 shrink-0 text-muted-foreground">{icon}</span>
		)}
		{children}
	</ContextMenuPrimitive.Label>
));
ContextMenuLabel.displayName = ContextMenuPrimitive.Label.displayName;

const ContextMenuSeparator = React.forwardRef<
	React.ElementRef<typeof ContextMenuPrimitive.Separator>,
	React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
	<ContextMenuPrimitive.Separator
		ref={ref}
		className={cn("bg-border my-2 h-px", className)}
		{...props}
	/>
));
ContextMenuSeparator.displayName = ContextMenuPrimitive.Separator.displayName;

const ContextMenuShortcut = ({
	className,
	...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
	return (
		<span
			className={cn(
				"ml-auto text-xs tracking-widest text-muted-foreground opacity-60",
				className,
			)}
			{...props}
		/>
	);
};
ContextMenuShortcut.displayName = "ContextMenuShortcut";

export {
	ContextMenu,
	ContextMenuTrigger,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuCheckboxItem,
	ContextMenuRadioItem,
	ContextMenuLabel,
	ContextMenuSeparator,
	ContextMenuShortcut,
	ContextMenuGroup,
	ContextMenuPortal,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuRadioGroup,
};
