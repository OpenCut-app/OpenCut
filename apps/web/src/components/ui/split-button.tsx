import { Button, type ButtonProps } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { type ReactNode, forwardRef } from "react";
import { cn } from "@/utils/ui";

interface SplitButtonProps {
	children: ReactNode;
	className?: string;
}

interface SplitButtonSideProps extends Omit<ButtonProps, "variant" | "size"> {
	children: ReactNode;
}

const SplitButton = forwardRef<HTMLDivElement, SplitButtonProps>(
	({ children, className, ...props }, ref) => {
		return (
			<div
				ref={ref}
				className={cn(
					"border-input bg-accent inline-flex h-7 overflow-hidden rounded-lg border",
					className,
				)}
				{...props}
			>
				{children}
			</div>
		);
	},
);
SplitButton.displayName = "SplitButton";

const SplitButtonSide = forwardRef<
	HTMLButtonElement,
	SplitButtonSideProps & { paddingClass: string }
>(({ children, className, paddingClass, onClick, ...props }, ref) => {
	return (
		<Button
			ref={ref}
			variant="text"
			className={cn(
				"bg-accent disabled:text-muted-foreground h-full gap-0 rounded-none border-0 font-normal !opacity-100",
				onClick
					? "hover:bg-foreground/10 cursor-pointer hover:opacity-100"
					: "cursor-default select-text",
				paddingClass,
				className,
			)}
			onClick={onClick}
			{...props}
		>
			{typeof children === "string" ? (
				<span className="cursor-text font-normal">{children}</span>
			) : (
				children
			)}
		</Button>
	);
});
SplitButtonSide.displayName = "SplitButtonSide";

const SplitButtonLeft = forwardRef<HTMLButtonElement, SplitButtonSideProps>(
	({ ...props }, ref) => {
		return <SplitButtonSide ref={ref} paddingClass="pl-3 pr-2" {...props} />;
	},
);
SplitButtonLeft.displayName = "SplitButtonLeft";

const SplitButtonRight = forwardRef<HTMLButtonElement, SplitButtonSideProps>(
	({ ...props }, ref) => {
		return <SplitButtonSide ref={ref} paddingClass="pl-2 pr-3" {...props} />;
	},
);
SplitButtonRight.displayName = "SplitButtonRight";

const SplitButtonSeparator = forwardRef<HTMLDivElement, { className?: string }>(
	({ className, ...props }, ref) => {
		return (
			<Separator
				ref={ref}
				orientation="vertical"
				className={cn("bg-foreground/15 h-full", className)}
				{...props}
			/>
		);
	},
);
SplitButtonSeparator.displayName = "SplitButtonSeparator";

export { SplitButton, SplitButtonLeft, SplitButtonRight, SplitButtonSeparator };
