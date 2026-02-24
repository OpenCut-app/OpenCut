"use client";

import {
	useState,
	useMemo,
	useRef,
	useEffect,
	useCallback,
	type CSSProperties,
} from "react";
import { List, type RowComponentProps } from "react-window";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
	getCachedFontAtlas,
	loadFullFont,
	prefetchFontAtlas,
	clearFontAtlasCache,
} from "@/lib/fonts/google-fonts";
import type { FontAtlas, FontAtlasEntry } from "@/types/fonts";
import { cn } from "@/utils/ui";
import { ChevronDown, Search, Upload } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { TextFontIcon } from "@hugeicons/core-free-icons";

const FONT_TABS = [
	{ key: "all", label: "All fonts" },
	{ key: "favorites", label: "Favorites" },
	{ key: "my-fonts", label: "My fonts" },
] as const;

type FontTab = (typeof FONT_TABS)[number]["key"];

const ROW_HEIGHT = 40;
const SPRITE_ROW_HEIGHT = 40;
const PREVIEW_SCALE = 0.8;
const LIST_WIDTH = 288;
const MAX_LIST_HEIGHT = 288;
const OVERSCAN = 15;

interface FontPickerProps {
	defaultValue?: string;
	onValueChange?: (value: string) => void;
	className?: string;
}

export function FontPicker({
	defaultValue,
	onValueChange,
	className,
}: FontPickerProps) {
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const [activeTab, setActiveTab] = useState<FontTab>("all");
	const [atlas, setAtlas] = useState<FontAtlas | null>(() =>
		getCachedFontAtlas(),
	);
	const [status, setStatus] = useState<"idle" | "loading" | "error">(() =>
		getCachedFontAtlas() ? "idle" : "loading",
	);
	const searchInputRef = useRef<HTMLInputElement>(null);

	const fontNames = useMemo(() => {
		if (!atlas) return [];
		return Object.keys(atlas.fonts).sort();
	}, [atlas]);

	const filteredFonts = useMemo(() => {
		if (!search) return fontNames;
		const query = search.toLowerCase();
		return fontNames.filter((name) => name.toLowerCase().includes(query));
	}, [fontNames, search]);

	const listHeight = Math.min(
		MAX_LIST_HEIGHT,
		filteredFonts.length * ROW_HEIGHT,
	);

	const handleSelect = useCallback(
		async ({ family }: { family: string }) => {
			try {
				await loadFullFont({ family });
				onValueChange?.(family);
			} catch {
				onValueChange?.(family);
			}
			setOpen(false);
		},
		[onValueChange],
	);

	// Load atlas on first open if cache is empty (fallback when prefetch hasn't completed)
	useEffect(() => {
		if (!open || atlas) return;

		setStatus("loading");
		prefetchFontAtlas().then((data) => {
			if (data) {
				setAtlas(data);
				setStatus("idle");
			} else {
				setStatus("error");
			}
		});
	}, [open, atlas]);

	useEffect(() => {
		if (!open) {
			setSearch("");
			setActiveTab("all");
		}
	}, [open]);

	const handleRetry = useCallback(() => {
		clearFontAtlasCache();
		setStatus("loading");
		prefetchFontAtlas().then((data) => {
			if (data) {
				setAtlas(data);
				setStatus("idle");
			} else {
				setStatus("error");
			}
		});
	}, []);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				className={cn(
					"border-border bg-accent flex h-7 w-full cursor-pointer items-center justify-between gap-1 rounded-md border px-2.5 text-sm whitespace-nowrap focus-visible:border-primary focus-visible:ring-0 focus:outline-hidden",
					className,
				)}
			>
				<div className="flex min-w-0 items-center gap-1.5">
					<span className="text-muted-foreground [&_svg]:size-3.5 shrink-0">
						<HugeiconsIcon icon={TextFontIcon} />
					</span>
					<span className="truncate" style={{ fontFamily: defaultValue }}>
						{defaultValue ?? "Select a font"}
					</span>
				</div>
				<ChevronDown className="size-3 shrink-0 opacity-50" />
			</PopoverTrigger>
			<PopoverContent
				className="w-72 p-0 overflow-hidden"
				align="start"
				side="left"
				onOpenAutoFocus={(event) => {
					event.preventDefault();
					searchInputRef.current?.focus();
				}}
				onCloseAutoFocus={(event) => {
					event.preventDefault();
					event.stopPropagation();
				}}
			>
				<div className="relative px-3 py-1.5">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 shrink-0 opacity-50" />
					<Input
						ref={searchInputRef}
						placeholder="Search fonts..."
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						size="xs"
						className="w-full pl-5 bg-transparent !border-none !shadow-none"
					/>
				</div>
				<div className="flex border-b px-3">
					{FONT_TABS.map((tab) => (
						<button
							key={tab.key}
							type="button"
							className={cn(
								"px-3 py-1.5 text-xs border-b-2 -mb-px",
								activeTab === tab.key
									? "border-foreground text-foreground"
									: "border-transparent text-muted-foreground hover:text-foreground",
							)}
							onClick={() => setActiveTab(tab.key)}
						>
							{tab.label}
						</button>
					))}
				</div>
				{status === "loading" && (
					<div className="py-8 text-center text-sm text-muted-foreground">
						Loading fonts...
					</div>
				)}
				{status === "error" && (
					<div className="flex flex-col items-center gap-3 py-8 px-4">
						<p className="text-sm text-muted-foreground text-center">
							Failed to load font previews.
						</p>
						<Button variant="outline" size="sm" onClick={handleRetry}>
							Retry
						</Button>
					</div>
				)}
				{status === "idle" &&
					fontNames.length > 0 &&
					filteredFonts.length === 0 && (
						<div className="py-6 text-center text-sm text-muted-foreground">
							No fonts found.
						</div>
					)}
				{status === "idle" && atlas && filteredFonts.length > 0 && (
					<List
						rowCount={filteredFonts.length}
						rowHeight={ROW_HEIGHT}
						overscanCount={OVERSCAN}
						rowComponent={FontRow}
						rowProps={{
							atlas,
							filteredFonts,
							selectedFont: defaultValue,
							onFontSelect: handleSelect,
						}}
						style={{ height: listHeight, width: LIST_WIDTH }}
					/>
				)}
				<div className="border-t p-1">
					<Button
						variant="ghost"
						size="sm"
						className="w-full justify-start text-muted-foreground h-8 font-normal"
						onClick={() => {
							// TODO: Implement local font loading
							console.log("Load local fonts clicked");
						}}
					>
						<Upload className="!size-3.5" />
						Load local fonts
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	);
}

function FontSpritePreview({ entry }: { entry: FontAtlasEntry }) {
	return (
		<div
			className="shrink-0"
			style={{
				width: entry.w,
				height: SPRITE_ROW_HEIGHT,
				backgroundColor: "currentColor",
				WebkitMaskImage: `url(/fonts/font-chunk-${entry.ch}.avif)`,
				WebkitMaskPosition: `-${entry.x}px -${entry.y}px`,
				WebkitMaskRepeat: "no-repeat",
				maskImage: `url(/fonts/font-chunk-${entry.ch}.avif)`,
				maskPosition: `-${entry.x}px -${entry.y}px`,
				maskRepeat: "no-repeat",
				transform: `scale(${PREVIEW_SCALE})`,
				transformOrigin: "left center",
			}}
		/>
	);
}

type FontRowProps = {
	atlas: FontAtlas;
	filteredFonts: string[];
	selectedFont: string | undefined;
	onFontSelect: (params: { family: string }) => void;
};

function FontRow({
	index,
	style,
	atlas,
	filteredFonts,
	selectedFont,
	onFontSelect,
}: RowComponentProps<FontRowProps>) {
	const fontName = filteredFonts[index];
	const entry = atlas.fonts[fontName];
	const isSelected = fontName === selectedFont;

	return (
		<button
			type="button"
			style={style as CSSProperties}
			className={cn(
				"flex w-full cursor-pointer items-center gap-2 px-3 outline-hidden hover:bg-popover-hover",
				isSelected && "bg-popover-hover",
			)}
			onClick={() => onFontSelect({ family: fontName })}
			onKeyDown={(event) => {
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					onFontSelect({ family: fontName });
				}
			}}
			aria-label={fontName}
		>
			<div className="min-w-0 overflow-hidden">
				<FontSpritePreview entry={entry} />
			</div>
		</button>
	);
}
