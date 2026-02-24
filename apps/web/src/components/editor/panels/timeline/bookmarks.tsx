"use client";

import { useEffect, useState } from "react";
import type { EditorCore } from "@/core";
import { useEditor } from "@/hooks/use-editor";
import type { BookmarkDragState } from "@/hooks/timeline/use-bookmark-drag";
import { BOOKMARK_TIME_EPSILON } from "@/lib/timeline/bookmarks";
import {
	DEFAULT_BOOKMARK_COLOR,
	TIMELINE_CONSTANTS,
} from "@/constants/timeline-constants";
import { DEFAULT_FPS } from "@/constants/project-constants";
import { getSnappedSeekTime } from "@/lib/time";
import {
	ArrowTurnBackwardIcon,
	Delete02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Bookmark } from "@/types/timeline";
import {
	Popover,
	PopoverAnchor,
	PopoverContent,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ColorPicker } from "@/components/ui/color-picker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { uppercase } from "@/utils/string";
import { clamp } from "@/utils/math";

const PIXELS_PER_SECOND = TIMELINE_CONSTANTS.PIXELS_PER_SECOND;
const MIN_BOOKMARK_WIDTH_PX = 2;
const BOOKMARK_MARKER_WIDTH_PX = 12;
const BOOKMARK_MARKER_HEIGHT_PX = 15;
const BOOKMARK_HALF_WIDTH_PX = BOOKMARK_MARKER_WIDTH_PX / 2;
const BOOKMARK_MARKER_CLIP_PATH =
	"polygon(50% 100%, 12% 72%, 12% 10%, 88% 10%, 88% 72%)";

function seekToBookmarkTime({
	editor,
	time,
}: {
	editor: EditorCore;
	time: number;
}) {
	const activeProject = editor.project.getActive();
	const duration = editor.timeline.getTotalDuration();
	const fps = activeProject?.settings.fps ?? DEFAULT_FPS;
	const snappedTime = getSnappedSeekTime({ rawTime: time, duration, fps });
	editor.playback.seek({ time: snappedTime });
}

interface TimelineBookmarksRowProps {
	zoomLevel: number;
	dynamicTimelineWidth: number;
	dragState: BookmarkDragState;
	onBookmarkMouseDown: (params: {
		event: React.MouseEvent;
		bookmark: Bookmark;
	}) => void;
	handleWheel: (event: React.WheelEvent) => void;
	handleTimelineContentClick: (event: React.MouseEvent) => void;
	handleRulerTrackingMouseDown: (event: React.MouseEvent) => void;
	handleRulerMouseDown: (event: React.MouseEvent) => void;
}

export function TimelineBookmarksRow({
	zoomLevel,
	dynamicTimelineWidth,
	dragState,
	onBookmarkMouseDown,
	handleWheel,
	handleTimelineContentClick,
	handleRulerTrackingMouseDown,
	handleRulerMouseDown,
}: TimelineBookmarksRowProps) {
	const editor = useEditor();
	const activeScene = editor.scenes.getActiveScene();

	return (
		<div className="relative h-4 flex-1 overflow-hidden">
			<button
				className="relative h-4 w-full cursor-default select-none border-0 bg-transparent p-0"
				style={{
					width: `${dynamicTimelineWidth}px`,
				}}
				aria-label="Timeline ruler"
				type="button"
				onWheel={handleWheel}
				onClick={(event) => {
					if (!event.currentTarget.contains(event.target as Node)) return;
					handleTimelineContentClick(event);
				}}
				onMouseDown={(event) => {
					if (!event.currentTarget.contains(event.target as Node)) return;
					handleRulerMouseDown(event);
					handleRulerTrackingMouseDown(event);
				}}
			>
				{activeScene.bookmarks.map((bookmark) => (
					<TimelineBookmark
						key={`bookmark-${bookmark.time}`}
						bookmark={bookmark}
						zoomLevel={zoomLevel}
						dragState={dragState}
						onBookmarkMouseDown={onBookmarkMouseDown}
					/>
				))}
			</button>
		</div>
	);
}

function TimelineBookmark({
	bookmark,
	zoomLevel,
	dragState,
	onBookmarkMouseDown,
}: {
	bookmark: Bookmark;
	zoomLevel: number;
	dragState: BookmarkDragState;
	onBookmarkMouseDown: (params: {
		event: React.MouseEvent;
		bookmark: Bookmark;
	}) => void;
}) {
	const editor = useEditor();
	const duration = editor.timeline.getTotalDuration();
	const [isPopoverOpen, setIsPopoverOpen] = useState(false);

	const isDragging =
		dragState.isDragging &&
		dragState.bookmarkTime !== null &&
		Math.abs(dragState.bookmarkTime - bookmark.time) < BOOKMARK_TIME_EPSILON;

	const displayTime = isDragging ? dragState.currentTime : bookmark.time;
	const time = bookmark.time;
	const bookmarkDuration = bookmark.duration ?? 0;
	const durationWidth =
		bookmarkDuration > 0 ? bookmarkDuration * PIXELS_PER_SECOND * zoomLevel : 0;
	const hasDurationRange = durationWidth > MIN_BOOKMARK_WIDTH_PX;
	const bookmarkWidth = BOOKMARK_MARKER_WIDTH_PX + Math.max(durationWidth, 0);
	const left = displayTime * PIXELS_PER_SECOND * zoomLevel;
	const bookmarkLeft = left - BOOKMARK_HALF_WIDTH_PX;
	const rightHalfLeft = BOOKMARK_HALF_WIDTH_PX + Math.max(durationWidth, 0);
	const iconColor = bookmark.color ?? DEFAULT_BOOKMARK_COLOR;

	const handleSeek = () => seekToBookmarkTime({ editor, time });

	const handleClick = (event: React.MouseEvent) => {
		event.preventDefault();
		event.stopPropagation();
		if (event.detail === 2) {
			setIsPopoverOpen(true);
		} else {
			handleSeek();
		}
	};

	const handleKeyDown = (event: React.KeyboardEvent) => {
		if (event.key !== "Enter" && event.key !== " ") return;
		event.preventDefault();
		handleSeek();
	};

	const handleMouseDown = (event: React.MouseEvent) => {
		onBookmarkMouseDown({ event, bookmark });
		event.preventDefault();
		event.stopPropagation();
	};

	return (
		<Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
			<PopoverAnchor asChild>
				<button
					className={`absolute top-0 h-full min-w-0.5 border-0 bg-transparent p-0 ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
					style={{
						left: `${bookmarkLeft}px`,
						width: `${bookmarkWidth}px`,
					}}
					aria-label={`Bookmark at ${time.toFixed(1)}s`}
					type="button"
					onMouseDown={handleMouseDown}
					onClick={handleClick}
					onKeyDown={handleKeyDown}
				>
					{hasDurationRange ? (
						<div
							className="absolute opacity-30"
							style={{
								top: 1.5,
								height: BOOKMARK_MARKER_HEIGHT_PX - 2.5,
								left: BOOKMARK_HALF_WIDTH_PX,
								width: durationWidth,
								backgroundColor: iconColor,
							}}
						/>
					) : null}
					<div
						className="absolute top-0 overflow-hidden"
						style={{
							left: 0,
							width: BOOKMARK_HALF_WIDTH_PX,
							height: BOOKMARK_MARKER_HEIGHT_PX,
						}}
					>
						<div
							className="absolute inset-0"
							style={{
								width: BOOKMARK_MARKER_WIDTH_PX,
								height: BOOKMARK_MARKER_HEIGHT_PX,
								clipPath: BOOKMARK_MARKER_CLIP_PATH,
								backgroundColor: "hsl(var(--background))",
							}}
						/>
						<div
							className="absolute"
							style={{
								top: 1,
								left: 1,
								width: BOOKMARK_MARKER_WIDTH_PX - 2,
								height: BOOKMARK_MARKER_HEIGHT_PX - 2,
								clipPath: BOOKMARK_MARKER_CLIP_PATH,
								backgroundColor: iconColor,
							}}
						/>
					</div>
					<div
						className="absolute top-0 overflow-hidden"
						style={{
							left: rightHalfLeft,
							width: BOOKMARK_HALF_WIDTH_PX,
							height: BOOKMARK_MARKER_HEIGHT_PX,
						}}
					>
						<div
							className="absolute top-0"
							style={{
								left: -BOOKMARK_HALF_WIDTH_PX,
								width: BOOKMARK_MARKER_WIDTH_PX,
								height: BOOKMARK_MARKER_HEIGHT_PX,
								clipPath: BOOKMARK_MARKER_CLIP_PATH,
								backgroundColor: "hsl(var(--background))",
							}}
						/>
						<div
							className="absolute"
							style={{
								top: 1,
								left: 1 - BOOKMARK_HALF_WIDTH_PX,
								width: BOOKMARK_MARKER_WIDTH_PX - 2,
								height: BOOKMARK_MARKER_HEIGHT_PX - 2,
								clipPath: BOOKMARK_MARKER_CLIP_PATH,
								backgroundColor: iconColor,
							}}
						/>
					</div>
				</button>
			</PopoverAnchor>
			<PopoverContent
				className="w-64 flex flex-col gap-3 p-3"
				align="start"
				side="bottom"
				sideOffset={8}
				onOpenAutoFocus={(event) => event.preventDefault()}
			>
				<BookmarkPopoverContent
					bookmark={bookmark}
					time={time}
					timelineDuration={duration}
					onPopoverClose={() => setIsPopoverOpen(false)}
				/>
			</PopoverContent>
		</Popover>
	);
}

function BookmarkPopoverContent({
	bookmark,
	time,
	timelineDuration,
	onPopoverClose,
}: {
	bookmark: Bookmark;
	time: number;
	timelineDuration: number;
	onPopoverClose: () => void;
}) {
	const editor = useEditor();
	const [draftColorHex, setDraftColorHex] = useState(
		(bookmark.color ?? DEFAULT_BOOKMARK_COLOR).replace("#", "").toUpperCase(),
	);

	useEffect(() => {
		setDraftColorHex(
			(bookmark.color ?? DEFAULT_BOOKMARK_COLOR).replace("#", "").toUpperCase(),
		);
	}, [bookmark.color]);

	const handleRemove = () => {
		editor.scenes.removeBookmark({ time });
		onPopoverClose();
	};

	const handleUpdate = ({
		note,
		color,
		duration,
	}: Partial<{ note: string; color: string; duration: number }>) => {
		const updates: Partial<{ note: string; color: string; duration: number }> =
			{};
		if (note !== undefined && note !== bookmark.note) updates.note = note;
		if (
			color !== undefined &&
			color.toUpperCase() !== (bookmark.color ?? "").toUpperCase()
		) {
			updates.color = color;
		}
		if (duration !== undefined && duration !== bookmark.duration) {
			updates.duration = duration;
		}
		if (Object.keys(updates).length === 0) return;
		editor.scenes.updateBookmark({ time, updates });
	};

	return (
		<>
			<div className="flex flex-col gap-2">
				<Label className="text-xs">Note</Label>
				<Input
					placeholder="Add a note..."
					value={bookmark.note ?? ""}
					onChange={(event) => handleUpdate({ note: event.target.value })}
					className="h-8 text-sm"
				/>
			</div>
			<div className="flex flex-col gap-2">
				<Label className="text-xs">Color</Label>
				<div className="relative">
					<ColorPicker
						value={uppercase({ string: draftColorHex })}
						onChange={(color) => setDraftColorHex(uppercase({ string: color }))}
						onChangeEnd={(color) =>
							handleUpdate({ color: `#${uppercase({ string: color })}` })
						}
						className="bg-background border"
					/>
					{bookmark.color &&
						bookmark.color.replace(/^#/, "").toUpperCase() !==
							DEFAULT_BOOKMARK_COLOR.replace(/^#/, "").toUpperCase() && (
							<Button
								type="button"
								variant="text"
								size="text"
								aria-label="Reset to default color"
								className="absolute top-1/2 right-1 -translate-y-1/2 mr-1"
								onClick={() =>
									editor.scenes.updateBookmark({
										time,
										updates: { color: undefined },
									})
								}
							>
								<HugeiconsIcon
									icon={ArrowTurnBackwardIcon}
									className="!size-3.5"
								/>
							</Button>
						)}
				</div>
			</div>
			<div className="flex flex-col gap-2">
				<Label className="text-xs">Duration</Label>
				<div className="flex items-center gap-1.5">
					<Input
						type="number"
						min={0}
						step={0.1}
						value={bookmark.duration ?? 0}
						onChange={(event) => {
							const parsed = parseFloat(event.target.value);
							const value = Number.isNaN(parsed)
								? 0
								: clamp({
										value: parsed,
										min: 0,
										max: Math.max(0, timelineDuration - time),
									});
							handleUpdate({ duration: value });
						}}
						className="h-8 text-sm"
						containerClassName="w-full"
					/>
				</div>
			</div>
			<Button
				type="button"
				variant="outline"
				size="sm"
				className="text-destructive hover:bg-destructive/10"
				onClick={handleRemove}
				onKeyDown={(event) => {
					if (event.key === "Enter" || event.key === " ") {
						handleRemove();
					}
				}}
				aria-label="delete bookmark"
			>
				<HugeiconsIcon icon={Delete02Icon} className="!size-3.5" />
				Delete
			</Button>
		</>
	);
}
