"use client";

import * as React from "react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import { Check, ChevronRight, Circle } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/utils/ui";

const DropdownMenu = DropdownMenuPrimitive.Root;

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

const DropdownMenuGroup = DropdownMenuPrimitive.Group;

const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

const DropdownMenuSub = DropdownMenuPrimitive.Sub;

const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

const dropdownMenuItemVariants = cva(
	"relative flex cursor-pointer select-none items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground outline-hidden data-[highlighted]:bg-popover-hover data-disabled:pointer-events-none data-disabled:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0",
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

const DropdownMenuSubTrigger = React.forwardRef<
	React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
		inset?: boolean;
		variant?: VariantProps<typeof dropdownMenuItemVariants>["variant"];
	}
>(({ className, inset, children, variant = "default", ...props }, ref) => (
	<DropdownMenuPrimitive.SubTrigger
		ref={ref}
		className={cn(
			dropdownMenuItemVariants({ variant }),
			"data-[state=open]:bg-muted data-[state=open]:text-foreground",
			inset && "pl-8",
			className,
		)}
		{...props}
	>
		{children}
		<ChevronRight className="ml-auto" />
	</DropdownMenuPrimitive.SubTrigger>
));
DropdownMenuSubTrigger.displayName =
	DropdownMenuPrimitive.SubTrigger.displayName;

const DropdownMenuSubContent = React.forwardRef<
	React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
	<DropdownMenuPrimitive.SubContent
		ref={ref}
		className={cn(
			"group/menu bg-popover text-popover-foreground z-50 min-w-32 overflow-hidden rounded-2xl border p-2 shadow-lg",
			className,
		)}
		{...props}
	/>
));
DropdownMenuSubContent.displayName =
	DropdownMenuPrimitive.SubContent.displayName;

const DropdownMenuContent = React.forwardRef<
	React.ElementRef<typeof DropdownMenuPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
	<DropdownMenuPrimitive.Portal>
		<DropdownMenuPrimitive.Content
			ref={ref}
			sideOffset={sideOffset}
			onCloseAutoFocus={(e) => {
				e.stopPropagation();
				e.preventDefault();
			}}
			className={cn(
				"group/menu bg-popover text-popover-foreground z-50 min-w-32 overflow-hidden rounded-lg border p-1.5 shadow-lg",
				className,
			)}
			{...props}
		/>
	</DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

const DropdownMenuItem = React.forwardRef<
	React.ElementRef<typeof DropdownMenuPrimitive.Item>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
		inset?: boolean;
		icon?: React.ReactNode;
		variant?: VariantProps<typeof dropdownMenuItemVariants>["variant"];
	}
>(
	(
		{
			className,
			inset,
			icon,
			variant = "default",
			children,
			asChild,
			...props
		},
		ref,
	) => {
		const iconSlot = (
			<span className="hidden size-4 shrink-0 items-center justify-center group-has-[[data-has-icon]]/menu:flex">
				{icon}
			</span>
		);

		const renderedChildren =
			asChild && React.isValidElement(children) ? (
				React.cloneElement(
					children as React.ReactElement<{ children?: React.ReactNode }>,
					{},
					iconSlot,
					(children as React.ReactElement<{ children?: React.ReactNode }>).props
						.children,
				)
			) : (
				<>
					{iconSlot}
					{children}
				</>
			);

		return (
			<DropdownMenuPrimitive.Item
				ref={ref}
				asChild={asChild}
				data-has-icon={icon ? "" : undefined}
				className={cn(
					dropdownMenuItemVariants({ variant }),
					inset && "pl-8",
					className,
				)}
				{...props}
			>
				{renderedChildren}
			</DropdownMenuPrimitive.Item>
		);
	},
);
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

const DropdownMenuCheckboxItem = React.forwardRef<
	React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem> & {
		variant?: VariantProps<typeof dropdownMenuItemVariants>["variant"];
	}
>(({ className, children, checked, variant = "default", ...props }, ref) => (
	<DropdownMenuPrimitive.CheckboxItem
		ref={ref}
		className={cn(
			dropdownMenuItemVariants({ variant }),
			"pr-8 pl-2",
			className,
		)}
		checked={checked}
		onSelect={(e) => {
			e.preventDefault();
		}}
		{...props}
	>
		{children}
		<span className="absolute right-2 flex size-3.5 items-center justify-center">
			<DropdownMenuPrimitive.ItemIndicator>
				<Check className="size-4" />
			</DropdownMenuPrimitive.ItemIndicator>
		</span>
	</DropdownMenuPrimitive.CheckboxItem>
));

DropdownMenuCheckboxItem.displayName =
	DropdownMenuPrimitive.CheckboxItem.displayName;

const DropdownMenuRadioItem = React.forwardRef<
	React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem> & {
		variant?: VariantProps<typeof dropdownMenuItemVariants>["variant"];
	}
>(({ className, children, variant = "default", ...props }, ref) => (
	<DropdownMenuPrimitive.RadioItem
		ref={ref}
		className={cn(
			dropdownMenuItemVariants({ variant }),
			"pr-2 pl-8",
			className,
		)}
		{...props}
	>
		<span className="absolute left-2 flex size-3.5 items-center justify-center">
			<DropdownMenuPrimitive.ItemIndicator>
				<Circle className="size-2 fill-current" />
			</DropdownMenuPrimitive.ItemIndicator>
		</span>
		{children}
	</DropdownMenuPrimitive.RadioItem>
));
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;

const DropdownMenuLabel = React.forwardRef<
	React.ElementRef<typeof DropdownMenuPrimitive.Label>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
		inset?: boolean;
	}
>(({ className, inset, ...props }, ref) => (
	<DropdownMenuPrimitive.Label
		ref={ref}
		className={cn(
			"px-3 pb-2 pt-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground",
			inset && "pl-8",
			className,
		)}
		{...props}
	/>
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

const DropdownMenuSeparator = React.forwardRef<
	React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
	<DropdownMenuPrimitive.Separator
		ref={ref}
		className={cn("bg-border/60 mx-1 my-2 h-px", className)}
		{...props}
	/>
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

const DropdownMenuShortcut = ({
	className,
	...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
	return (
		<span
			className={cn("ml-auto text-xs tracking-widest opacity-60", className)}
			{...props}
		/>
	);
};
DropdownMenuShortcut.displayName = "DropdownMenuShortcut";

export {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuCheckboxItem,
	DropdownMenuRadioItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuGroup,
	DropdownMenuPortal,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuRadioGroup,
};
