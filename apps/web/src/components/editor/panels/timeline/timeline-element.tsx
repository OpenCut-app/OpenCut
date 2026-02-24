"use client";

import { useEditor } from "@/hooks/use-editor";
import { useAssetsPanelStore } from "@/stores/assets-panel-store";
import AudioWaveform from "./audio-waveform";
import { useTimelineElementResize } from "@/hooks/timeline/element/use-element-resize";
import type { SnapPoint } from "@/lib/timeline/snap-utils";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import {
	getTrackClasses,
	getTrackHeight,
	canElementHaveAudio,
	canElementBeHidden,
	hasMediaId,
} from "@/lib/timeline";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "../../../ui/context-menu";
import type {
	TimelineElement as TimelineElementType,
	TimelineTrack,
	ElementDragState,
} from "@/types/timeline";
import type { MediaAsset } from "@/types/assets";
import { mediaSupportsAudio } from "@/lib/media/media-utils";
import { getActionDefinition, type TAction, invokeAction } from "@/lib/actions";
import { useElementSelection } from "@/hooks/timeline/element/use-element-selection";
import { resolveStickerId } from "@/lib/stickers";
import Image from "next/image";
import {
	ScissorIcon,
	Delete02Icon,
	Copy01Icon,
	ViewIcon,
	ViewOffSlashIcon,
	VolumeHighIcon,
	VolumeOffIcon,
	VolumeMute02Icon,
	Search01Icon,
	Exchange01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { uppercase } from "@/utils/string";
import type { ComponentProps } from "react";

function getDisplayShortcut(action: TAction) {
	const { defaultShortcuts } = getActionDefinition(action);
	if (!defaultShortcuts?.length) {
		return "";
	}

	return uppercase({
		string: defaultShortcuts[0].replace("+", " "),
	});
}

interface TimelineElementProps {
	element: TimelineElementType;
	track: TimelineTrack;
	zoomLevel: number;
	isSelected: boolean;
	onSnapPointChange?: (snapPoint: SnapPoint | null) => void;
	onResizeStateChange?: (params: { isResizing: boolean }) => void;
	onElementMouseDown: (
		e: React.MouseEvent,
		element: TimelineElementType,
	) => void;
	onElementClick: (e: React.MouseEvent, element: TimelineElementType) => void;
	dragState: ElementDragState;
}

export function TimelineElement({
	element,
	track,
	zoomLevel,
	isSelected,
	onSnapPointChange,
	onResizeStateChange,
	onElementMouseDown,
	onElementClick,
	dragState,
}: TimelineElementProps) {
	const editor = useEditor();
	const { selectedElements } = useElementSelection();
	const { requestRevealMedia } = useAssetsPanelStore();

	const mediaAssets = editor.media.getAssets();
	let mediaAsset: MediaAsset | null = null;

	if (hasMediaId(element)) {
		mediaAsset =
			mediaAssets.find((asset) => asset.id === element.mediaId) ?? null;
	}

	const hasAudio = mediaSupportsAudio({ media: mediaAsset });

	const { handleResizeStart, isResizing, currentStartTime, currentDuration } =
		useTimelineElementResize({
			element,
			track,
			zoomLevel,
			onSnapPointChange,
			onResizeStateChange,
		});

	const isCurrentElementSelected = selectedElements.some(
		(selected) =>
			selected.elementId === element.id && selected.trackId === track.id,
	);

	const isBeingDragged = dragState.elementId === element.id;
	const dragOffsetY =
		isBeingDragged && dragState.isDragging
			? dragState.currentMouseY - dragState.startMouseY
			: 0;
	const elementStartTime =
		isBeingDragged && dragState.isDragging
			? dragState.currentTime
			: element.startTime;
	const displayedStartTime = isResizing ? currentStartTime : elementStartTime;
	const displayedDuration = isResizing ? currentDuration : element.duration;
	const elementWidth =
		displayedDuration * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel;
	const elementLeft = displayedStartTime * 50 * zoomLevel;

	const handleRevealInMedia = ({ event }: { event: React.MouseEvent }) => {
		event.stopPropagation();
		if (hasMediaId(element)) {
			requestRevealMedia(element.mediaId);
		}
	};

	const isMuted = canElementHaveAudio(element) && element.muted === true;

	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>
				<div
					className={`absolute top-0 h-full select-none`}
					style={{
						left: `${elementLeft}px`,
						width: `${elementWidth}px`,
						transform:
							isBeingDragged && dragState.isDragging
								? `translate3d(0, ${dragOffsetY}px, 0)`
								: undefined,
					}}
				>
					<ElementInner
						element={element}
						track={track}
						isSelected={isSelected}
						hasAudio={hasAudio}
						isMuted={isMuted}
						mediaAssets={mediaAssets}
						onElementClick={onElementClick}
						onElementMouseDown={onElementMouseDown}
						handleResizeStart={handleResizeStart}
					/>
				</div>
			</ContextMenuTrigger>
			<ContextMenuContent className="w-64">
				<ActionMenuItem
					action="split"
					icon={<HugeiconsIcon icon={ScissorIcon} />}
				>
					Split
				</ActionMenuItem>
				<CopyMenuItem />
				{canElementHaveAudio(element) && hasAudio && (
					<MuteMenuItem
						isMultipleSelected={selectedElements.length > 1}
						isCurrentElementSelected={isCurrentElementSelected}
						isMuted={isMuted}
					/>
				)}
				{canElementBeHidden(element) && (
					<VisibilityMenuItem
						element={element}
						isMultipleSelected={selectedElements.length > 1}
						isCurrentElementSelected={isCurrentElementSelected}
					/>
				)}
				{selectedElements.length === 1 && (
					<ActionMenuItem
						action="duplicate-selected"
						icon={<HugeiconsIcon icon={Copy01Icon} />}
					>
						Duplicate
					</ActionMenuItem>
				)}
				{selectedElements.length === 1 && hasMediaId(element) && (
					<>
						<ContextMenuItem
							icon={<HugeiconsIcon icon={Search01Icon} />}
							onClick={(event) => handleRevealInMedia({ event })}
						>
							Reveal media
						</ContextMenuItem>
						<ContextMenuItem
							icon={<HugeiconsIcon icon={Exchange01Icon} />}
							disabled
						>
							Replace media
						</ContextMenuItem>
					</>
				)}
				<ContextMenuSeparator />
				<DeleteMenuItem
					isMultipleSelected={selectedElements.length > 1}
					isCurrentElementSelected={isCurrentElementSelected}
					elementType={element.type}
					selectedCount={selectedElements.length}
				/>
			</ContextMenuContent>
		</ContextMenu>
	);
}

function ElementInner({
	element,
	track,
	isSelected,
	hasAudio,
	isMuted,
	mediaAssets,
	onElementClick,
	onElementMouseDown,
	handleResizeStart,
}: {
	element: TimelineElementType;
	track: TimelineTrack;
	isSelected: boolean;
	hasAudio: boolean;
	isMuted: boolean;
	mediaAssets: MediaAsset[];
	onElementClick: (e: React.MouseEvent, element: TimelineElementType) => void;
	onElementMouseDown: (
		e: React.MouseEvent,
		element: TimelineElementType,
	) => void;
	handleResizeStart: (params: {
		event: React.MouseEvent;
		elementId: string;
		side: "left" | "right";
	}) => void;
}) {
	return (
		<div
			className={`relative h-full cursor-pointer overflow-hidden rounded-[0.5rem] ${getTrackClasses(
				{
					type: track.type,
				},
			)} ${canElementBeHidden(element) && element.hidden ? "opacity-50" : ""}`}
		>
			<button
				type="button"
				className="absolute inset-0 size-full cursor-pointer"
				onClick={(e) => onElementClick(e, element)}
				onMouseDown={(e) => onElementMouseDown(e, element)}
			>
				<div className="absolute inset-0 flex h-full items-center">
					<ElementContent
						element={element}
						track={track}
						isSelected={isSelected}
						mediaAssets={mediaAssets}
					/>
				</div>

				{(hasAudio
					? isMuted
					: canElementBeHidden(element) && element.hidden) && (
					<div className="bg-opacity-50 pointer-events-none absolute inset-0 flex items-center justify-center bg-black">
						{hasAudio ? (
							<HugeiconsIcon
								icon={VolumeHighIcon}
								className="size-6 text-white"
							/>
						) : (
							<HugeiconsIcon
								icon={VolumeOffIcon}
								className="size-6 text-white"
							/>
						)}
					</div>
				)}
			</button>

			{isSelected && (
				<>
					<ResizeHandle
						side="left"
						elementId={element.id}
						handleResizeStart={handleResizeStart}
					/>
					<ResizeHandle
						side="right"
						elementId={element.id}
						handleResizeStart={handleResizeStart}
					/>
				</>
			)}
		</div>
	);
}

function ResizeHandle({
	side,
	elementId,
	handleResizeStart,
}: {
	side: "left" | "right";
	elementId: string;
	handleResizeStart: (params: {
		event: React.MouseEvent;
		elementId: string;
		side: "left" | "right";
	}) => void;
}) {
	const isLeft = side === "left";
	return (
		<button
			type="button"
			className={`bg-primary absolute top-0 bottom-0 flex w-[0.6rem] items-center justify-center ${isLeft ? "left-0 cursor-w-resize" : "right-0 cursor-e-resize"}`}
			onMouseDown={(event) => handleResizeStart({ event, elementId, side })}
			aria-label={`${isLeft ? "Left" : "Right"} resize handle`}
		>
			<div className="bg-foreground h-[1.5rem] w-[0.2rem] rounded-full" />
		</button>
	);
}

function ElementContent({
	element,
	track,
	isSelected,
	mediaAssets,
}: {
	element: TimelineElementType;
	track: TimelineTrack;
	isSelected: boolean;
	mediaAssets: MediaAsset[];
}) {
	if (element.type === "text") {
		return (
			<div className="flex size-full items-center justify-start pl-2">
				<span className="truncate text-xs text-white">{element.content}</span>
			</div>
		);
	}

	if (element.type === "sticker") {
		return (
			<div className="flex size-full items-center gap-2 pl-2">
				<Image
					src={resolveStickerId({
						stickerId: element.stickerId,
						options: { width: 20, height: 20 },
					})}
					alt={element.name}
					className="size-5 shrink-0"
					width={20}
					height={20}
					unoptimized
				/>
				<span className="truncate text-xs text-white">{element.name}</span>
			</div>
		);
	}

	if (element.type === "audio") {
		const audioBuffer =
			element.sourceType === "library" ? element.buffer : undefined;

		const audioUrl =
			element.sourceType === "library"
				? element.sourceUrl
				: mediaAssets.find((asset) => asset.id === element.mediaId)?.url;

		if (audioBuffer || audioUrl) {
			return (
				<div className="flex size-full items-center gap-2">
					<div className="min-w-0 flex-1">
						<AudioWaveform
							audioBuffer={audioBuffer}
							audioUrl={audioUrl}
							height={24}
							className="w-full"
						/>
					</div>
				</div>
			);
		}

		return (
			<span className="text-foreground/80 truncate text-xs">
				{element.name}
			</span>
		);
	}

	const mediaAsset = mediaAssets.find((asset) => asset.id === element.mediaId);
	if (!mediaAsset) {
		return (
			<span className="text-foreground/80 truncate text-xs">
				{element.name}
			</span>
		);
	}

	if (
		mediaAsset.type === "image" ||
		(mediaAsset.type === "video" && mediaAsset.thumbnailUrl)
	) {
		const trackHeight = getTrackHeight({ type: track.type });
		const tileWidth = trackHeight * (16 / 9);
		const imageUrl =
			mediaAsset.type === "image" ? mediaAsset.url : mediaAsset.thumbnailUrl;

		return (
			<div className="flex size-full items-center justify-center">
				<div
					className={`relative size-full ${isSelected ? "bg-primary" : "bg-transparent"}`}
				>
					<div
						className="absolute right-0 left-0"
						style={{
							backgroundImage: imageUrl ? `url(${imageUrl})` : "none",
							backgroundRepeat: "repeat-x",
							backgroundSize: `${tileWidth}px ${trackHeight}px`,
							backgroundPosition: "left center",
							pointerEvents: "none",
							top: isSelected ? "0.25rem" : "0rem",
							bottom: isSelected ? "0.25rem" : "0rem",
						}}
					/>
				</div>
			</div>
		);
	}

	return (
		<span className="text-foreground/80 truncate text-xs">{element.name}</span>
	);
}

function CopyMenuItem() {
	return (
		<ActionMenuItem
			action="copy-selected"
			icon={<HugeiconsIcon icon={Copy01Icon} />}
		>
			Copy
		</ActionMenuItem>
	);
}

function MuteMenuItem({
	isMultipleSelected,
	isCurrentElementSelected,
	isMuted,
}: {
	isMultipleSelected: boolean;
	isCurrentElementSelected: boolean;
	isMuted: boolean;
}) {
	const getIcon = () => {
		if (isMultipleSelected && isCurrentElementSelected) {
			return <HugeiconsIcon icon={VolumeMute02Icon} />;
		}
		return isMuted ? (
			<HugeiconsIcon icon={VolumeHighIcon} />
		) : (
			<HugeiconsIcon icon={VolumeOffIcon} />
		);
	};

	return (
		<ActionMenuItem action="toggle-elements-muted-selected" icon={getIcon()}>
			{isMuted ? "Unmute" : "Mute"}
		</ActionMenuItem>
	);
}

function VisibilityMenuItem({
	element,
	isMultipleSelected,
	isCurrentElementSelected,
}: {
	element: TimelineElementType;
	isMultipleSelected: boolean;
	isCurrentElementSelected: boolean;
}) {
	const isHidden = canElementBeHidden(element) && element.hidden;

	const getIcon = () => {
		if (isMultipleSelected && isCurrentElementSelected) {
			return <HugeiconsIcon icon={ViewOffSlashIcon} />;
		}
		return isHidden ? (
			<HugeiconsIcon icon={ViewIcon} />
		) : (
			<HugeiconsIcon icon={ViewOffSlashIcon} />
		);
	};

	return (
		<ActionMenuItem
			action="toggle-elements-visibility-selected"
			icon={getIcon()}
		>
			{isHidden ? "Show" : "Hide"}
		</ActionMenuItem>
	);
}

function DeleteMenuItem({
	isMultipleSelected,
	isCurrentElementSelected,
	elementType,
	selectedCount,
}: {
	isMultipleSelected: boolean;
	isCurrentElementSelected: boolean;
	elementType: TimelineElementType["type"];
	selectedCount: number;
}) {
	return (
		<ActionMenuItem
			action="delete-selected"
			variant="destructive"
			icon={<HugeiconsIcon icon={Delete02Icon} />}
		>
			{isMultipleSelected && isCurrentElementSelected
				? `Delete ${selectedCount} elements`
				: `Delete ${elementType === "text" ? "text" : "clip"}`}
		</ActionMenuItem>
	);
}

function ActionMenuItem({
	action,
	children,
	...props
}: Omit<ComponentProps<typeof ContextMenuItem>, "onClick" | "textRight"> & {
	action: TAction;
}) {
	return (
		<ContextMenuItem
			onClick={(event) => {
				event.stopPropagation();
				invokeAction(action);
			}}
			textRight={getDisplayShortcut(action)}
			{...props}
		>
			{children}
		</ContextMenuItem>
	);
}
