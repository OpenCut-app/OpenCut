import { createContext, useContext, useState } from "react";
import { cn } from "@/utils/ui";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDownIcon } from "@hugeicons/core-free-icons";

const sectionExpandedCache = new Map<string, boolean>();

interface SectionContext {
	isOpen: boolean;
	toggle: () => void;
	collapsible: boolean;
}

const SectionCtx = createContext<SectionContext | null>(null);

function useSectionContext() {
	return useContext(SectionCtx);
}

interface SectionProps {
	children: React.ReactNode;
	collapsible?: boolean;
	defaultOpen?: boolean;
	sectionKey?: string;
	className?: string;
	hasBorderTop?: boolean;
	hasBorderBottom?: boolean;
}

export function Section({
	children,
	collapsible = false,
	defaultOpen = true,
	sectionKey,
	className,
	hasBorderTop = true,
	hasBorderBottom = true,
}: SectionProps) {
	const cached = sectionKey ? sectionExpandedCache.get(sectionKey) : undefined;
	const [isOpen, setIsOpen] = useState(cached ?? defaultOpen);

	const toggle = () => {
		const next = !isOpen;
		setIsOpen(next);
		if (sectionKey) sectionExpandedCache.set(sectionKey, next);
	};

	return (
		<SectionCtx.Provider value={{ isOpen, toggle, collapsible }}>
			<div
				className={cn(
					"flex flex-col",
					hasBorderTop && "border-t",
					hasBorderBottom && "last:border-b",
					className,
				)}
			>
				{children}
			</div>
		</SectionCtx.Provider>
	);
}

interface SectionHeaderProps {
	title: string;
	children?: React.ReactNode;
	onClick?: () => void;
	className?: string;
}

export function SectionHeader({
	title,
	children,
	onClick,
	className,
}: SectionHeaderProps) {
	const ctx = useSectionContext();
	const isCollapsible = ctx?.collapsible ?? false;
	const isOpen = ctx?.isOpen ?? true;
	const isInteractive = isCollapsible || !!onClick;

	const handleClick = isCollapsible ? ctx?.toggle : onClick;

	const content = (
		<>
			<span
				className={cn(
					"text-sm font-medium",
					isOpen ? "text-foreground" : "text-muted-foreground",
				)}
			>
				{title}
			</span>
			<div className="flex items-center gap-1">
				{children}
				{isCollapsible && (
					<HugeiconsIcon
						icon={ArrowDownIcon}
						className={cn(
							"size-3 shrink-0 transition-transform duration-200 ease-out",
							isOpen
								? "rotate-0 text-foreground"
								: "-rotate-90 text-muted-foreground",
						)}
					/>
				)}
			</div>
		</>
	);

	const baseClassName = cn(
		"flex w-full items-center justify-between h-11 px-3.5",
		className,
	);

	if (isInteractive) {
		return (
			<button
				type="button"
				className={cn(baseClassName, "cursor-pointer text-left")}
				onClick={(event) => {
					handleClick?.();
					event.currentTarget.blur();
				}}
			>
				{content}
			</button>
		);
	}

	return <div className={baseClassName}>{content}</div>;
}

export function SectionContent({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	const ctx = useSectionContext();
	const isCollapsible = ctx?.collapsible ?? false;
	const isOpen = ctx?.isOpen ?? true;

	if (isCollapsible) {
		return (
			<div
				className={cn(
					"grid transition-[grid-template-rows] duration-100 ease-out",
					isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
				)}
			>
				<div className="overflow-hidden">
					<div className={cn("p-4 pt-0", className)}>{children}</div>
				</div>
			</div>
		);
	}

	return <div className={cn("p-4 pt-0", className)}>{children}</div>;
}
