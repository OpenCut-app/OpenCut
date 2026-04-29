"use client";

import { useTheme } from "next-themes";
import { useThemeStore, PALETTES } from "@/lib/themes";
import { cn } from "@/utils/ui";
import { CheckmarkCircle01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Sun03Icon } from "@hugeicons/core-free-icons";

export function PaletteSelector({ className }: { className?: string }) {
	const { theme, setTheme } = useTheme();
	const { paletteId, setPalette } = useThemeStore();
	const activePalette = PALETTES.find((p) => p.id === paletteId);

	return (
		<div className={cn("flex items-center gap-1", className)}>
			<Button
				size="icon"
				variant="ghost"
				className="size-8"
				onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
			>
				<HugeiconsIcon icon={Sun03Icon} className="!size-[1.1rem]" />
			</Button>
			<Popover>
				<PopoverTrigger asChild>
					<Button variant="ghost" size="icon" className="size-8 gap-0 p-1">
						<div className="flex gap-0.5">
							{activePalette?.preview && (
								<>
									<div
										className="size-3 rounded-full border border-border"
										style={{ backgroundColor: activePalette.preview.primary }}
									/>
									<div
										className="size-3 rounded-full border border-border"
										style={{ backgroundColor: activePalette.preview.accent }}
									/>
								</>
							)}
						</div>
					</Button>
				</PopoverTrigger>
				<PopoverContent align="end" className="w-48 p-2">
					<div className="flex flex-col gap-1">
						<p className="text-muted-foreground px-2 text-xs font-medium">
							Palette
						</p>
						{PALETTES.map((palette) => (
							<button
								key={palette.id}
								type="button"
								className={cn(
									"flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent",
									paletteId === palette.id && "bg-accent",
								)}
								onClick={() => setPalette(palette.id)}
							>
								<div className="flex gap-0.5">
									<div
										className="size-3.5 rounded-full border border-border"
										style={{ backgroundColor: palette.preview.primary }}
									/>
									<div
										className="size-3.5 rounded-full border border-border"
										style={{ backgroundColor: palette.preview.background }}
									/>
									<div
										className="size-3.5 rounded-full border border-border"
										style={{ backgroundColor: palette.preview.accent }}
									/>
								</div>
								<span className="flex-1 text-left">{palette.name}</span>
								{paletteId === palette.id && (
									<HugeiconsIcon
										icon={CheckmarkCircle01Icon}
										className="text-primary !size-4"
									/>
								)}
							</button>
						))}
					</div>
				</PopoverContent>
			</Popover>
		</div>
	);
}
