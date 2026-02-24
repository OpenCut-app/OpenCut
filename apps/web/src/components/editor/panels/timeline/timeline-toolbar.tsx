import { useEditor } from "@/hooks/use-editor";
import {
	TooltipProvider,
	Tooltip,
	TooltipTrigger,
	TooltipContent,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { SplitSquareHorizontal } from "lucide-react";
import {
	SplitButton,
	SplitButtonLeft,
	SplitButtonRight,
	SplitButtonSeparator,
} from "@/components/ui/split-button";
import { Slider } from "@/components/ui/slider";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import { sliderToZoom, zoomToSlider } from "@/lib/timeline/zoom-utils";
import { ScenesView } from "../../scenes-view";
import { type TAction, invokeAction } from "@/lib/actions";
import { cn } from "@/utils/ui";
import { useTimelineStore } from "@/stores/timeline-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Bookmark02Icon,
	Delete02Icon,
	SnowIcon,
	ScissorIcon,
	MagnetIcon,
	Link04Icon,
	SearchAddIcon,
	SearchMinusIcon,
	Copy01Icon,
	AlignLeftIcon,
	AlignRightIcon,
	Layers01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export function TimelineToolbar({
	zoomLevel,
	minZoom,
	setZoomLevel,
}: {
	zoomLevel: number;
	minZoom: number;
	setZoomLevel: ({ zoom }: { zoom: number }) => void;
}) {
	const handleZoom = ({ direction }: { direction: "in" | "out" }) => {
		const newZoomLevel =
			direction === "in"
				? Math.min(
						TIMELINE_CONSTANTS.ZOOM_MAX,
						zoomLevel * TIMELINE_CONSTANTS.ZOOM_BUTTON_FACTOR,
					)
				: Math.max(minZoom, zoomLevel / TIMELINE_CONSTANTS.ZOOM_BUTTON_FACTOR);
		setZoomLevel({ zoom: newZoomLevel });
	};

	return (
		<ScrollArea className="scrollbar-hidden">
			<div className="flex h-10 items-center justify-between border-b px-2 py-1">
				<ToolbarLeftSection />

				<SceneSelector />

				<ToolbarRightSection
					zoomLevel={zoomLevel}
					minZoom={minZoom}
					onZoomChange={(zoom) => setZoomLevel({ zoom })}
					onZoom={handleZoom}
				/>
			</div>
		</ScrollArea>
	);
}

function ToolbarLeftSection() {
	const editor = useEditor();
	const currentTime = editor.playback.getCurrentTime();
	const currentBookmarked = editor.scenes.isBookmarked({ time: currentTime });

	const handleAction = ({
		action,
		event,
	}: {
		action: TAction;
		event: React.MouseEvent;
	}) => {
		event.stopPropagation();
		invokeAction(action);
	};

	return (
		<div className="flex items-center gap-1">
			<TooltipProvider delayDuration={500}>
				<ToolbarButton
					icon={<HugeiconsIcon icon={ScissorIcon} />}
					tooltip="Split element"
					onClick={({ event }) => handleAction({ action: "split", event })}
				/>

				<ToolbarButton
					icon={<HugeiconsIcon icon={AlignLeftIcon} />}
					tooltip="Split left"
					onClick={({ event }) => handleAction({ action: "split-left", event })}
				/>

				<ToolbarButton
					icon={<HugeiconsIcon icon={AlignRightIcon} />}
					tooltip="Split right"
					onClick={({ event }) =>
						handleAction({ action: "split-right", event })
					}
				/>

				<ToolbarButton
					icon={<SplitSquareHorizontal />}
					tooltip="Coming soon" /* separate audio */
					disabled={true}
					onClick={({ event: _event }) => {}}
				/>

				<ToolbarButton
					icon={<HugeiconsIcon icon={Copy01Icon} />}
					tooltip="Duplicate element"
					onClick={({ event }) =>
						handleAction({ action: "duplicate-selected", event })
					}
				/>

				<ToolbarButton
					icon={<HugeiconsIcon icon={SnowIcon} />}
					tooltip="Coming soon" /* freeze frame */
					disabled={true}
					onClick={({ event: _event }) => {}}
				/>

				<ToolbarButton
					icon={<HugeiconsIcon icon={Delete02Icon} />}
					tooltip="Delete element"
					onClick={({ event }) =>
						handleAction({ action: "delete-selected", event })
					}
				/>

				<div className="bg-border mx-1 h-6 w-px" />

				<Tooltip>
					<ToolbarButton
						icon={<HugeiconsIcon icon={Bookmark02Icon} />}
						isActive={currentBookmarked}
						tooltip={currentBookmarked ? "Remove bookmark" : "Add bookmark"}
						onClick={({ event }) =>
							handleAction({ action: "toggle-bookmark", event })
						}
					/>
				</Tooltip>
			</TooltipProvider>
		</div>
	);
}

function SceneSelector() {
	const editor = useEditor();
	const currentScene = editor.scenes.getActiveScene();

	return (
		<div>
			<SplitButton className="border-foreground/10 border">
				<SplitButtonLeft>{currentScene?.name || "No Scene"}</SplitButtonLeft>
				<SplitButtonSeparator />
				<ScenesView>
					<SplitButtonRight onClick={() => {}}>
						<HugeiconsIcon icon={Layers01Icon} className="size-4" />
					</SplitButtonRight>
				</ScenesView>
			</SplitButton>
		</div>
	);
}

function ToolbarRightSection({
	zoomLevel,
	minZoom,
	onZoomChange,
	onZoom,
}: {
	zoomLevel: number;
	minZoom: number;
	onZoomChange: (zoom: number) => void;
	onZoom: (options: { direction: "in" | "out" }) => void;
}) {
	const {
		snappingEnabled,
		rippleEditingEnabled,
		toggleSnapping,
		toggleRippleEditing,
	} = useTimelineStore();

	return (
		<div className="flex items-center gap-1">
			<TooltipProvider delayDuration={500}>
				<ToolbarButton
					icon={<HugeiconsIcon icon={MagnetIcon} />}
					isActive={snappingEnabled}
					tooltip="Auto snapping"
					onClick={() => toggleSnapping()}
				/>

				<ToolbarButton
					icon={<HugeiconsIcon icon={Link04Icon} className="scale-110" />}
					isActive={rippleEditingEnabled}
					tooltip="Ripple editing"
					onClick={() => toggleRippleEditing()}
				/>
			</TooltipProvider>

			<div className="bg-border mx-1 h-6 w-px" />

			<div className="flex items-center gap-1">
				<Button
					variant="text"
					size="icon"
					onClick={() => onZoom({ direction: "out" })}
				>
					<HugeiconsIcon icon={SearchMinusIcon} />
				</Button>
				<Slider
					className="w-28"
					value={[zoomToSlider({ zoomLevel, minZoom })]}
					onValueChange={(values) =>
						onZoomChange(sliderToZoom({ sliderPosition: values[0], minZoom }))
					}
					min={0}
					max={1}
					step={0.005}
				/>
				<Button
					variant="text"
					size="icon"
					onClick={() => onZoom({ direction: "in" })}
				>
					<HugeiconsIcon icon={SearchAddIcon} />
				</Button>
			</div>
		</div>
	);
}

function ToolbarButton({
	icon,
	tooltip,
	onClick,
	disabled,
	isActive,
}: {
	icon: React.ReactNode;
	tooltip: string;
	onClick: ({ event }: { event: React.MouseEvent }) => void;
	disabled?: boolean;
	isActive?: boolean;
}) {
	return (
		<Tooltip delayDuration={200}>
			<TooltipTrigger asChild>
				<Button
					variant={isActive ? "secondary" : "text"}
					size="icon"
					onClick={(event) => onClick({ event })}
					className={cn(
						"rounded-sm",
						disabled ? "cursor-not-allowed opacity-50" : "",
					)}
				>
					{icon}
				</Button>
			</TooltipTrigger>
			<TooltipContent>{tooltip}</TooltipContent>
		</Tooltip>
	);
}
