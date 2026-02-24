"use client";

import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { useTheme } from "next-themes";
import { cn } from "@/utils/ui";
import { Sun03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

interface ThemeToggleProps {
	className?: string;
	iconClassName?: string;
	onToggle?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export function ThemeToggle({
	className,
	iconClassName,
	onToggle,
}: ThemeToggleProps) {
	const { theme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	// Prevent hydration mismatch by not rendering theme-dependent content until mounted
	if (!mounted) {
		return (
			<Button
				size="icon"
				variant="ghost"
				className={cn("size-8", className)}
			>
				<span className={cn("!size-[1.1rem]", iconClassName)} />
				<span className="sr-only">Toggle theme</span>
			</Button>
		);
	}

	return (
		<Button
			size="icon"
			variant="ghost"
			className={cn("size-8", className)}
			onClick={(e) => {
				setTheme(theme === "dark" ? "light" : "dark");
				onToggle?.(e);
			}}
		>
			<HugeiconsIcon
				icon={Sun03Icon}
				className={cn("!size-[1.1rem]", iconClassName)}
			/>
			<span className="sr-only">{theme === "dark" ? "Light" : "Dark"}</span>
		</Button>
	);
}
