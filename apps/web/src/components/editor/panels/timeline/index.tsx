"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Delete02Icon,
	MagicWand05Icon,
	MusicNote03Icon,
	TaskAdd02Icon,
	TextIcon,
	ViewIcon,
	ViewOffSlashIcon,
	VolumeHighIcon,
	VolumeOffIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { OcShapesIcon, OcVideoIcon } from "@/components/icons";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTimelineZoom } from "@/hooks/timeline/use-timeline-zoom";
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from "react";
import type { ElementDragState, DropTarget } from "@/lib/timeline";
import { TimelineTrackContent } from "./timeline-track";
import { TimelinePlayhead } from "./timeline-playhead";
import { SelectionBox } from "@/lib/selection/selection-box";
import { useBoxSelect } from "@/lib/selection/hooks/use-box-select";
import { SnapIndicator } from "./snap-indicator";
import type { SnapPoint } from "@/lib/timeline/snap-utils";
import type { TimelineTrack } from "@/lib/timeline";
import {
	TIMELINE_CONSTANTS,
	TRACK_GAP,
	TIMELINE_SCROLLBAR_SIZE_PX,
} from "@/constants/timeline-constants";
import { useElementInteraction } from "@/hooks/timeline/element/use-element-interaction";
import {
	getTrackHeight,
	getCumulativeHeightBefore,
	getTotalTracksHeight,
	canTracktHaveAudio,
	canTrackBeHidden,
	isMainTrack,
	getTimelineZoomMin,
	getTimelinePaddingPx,
} from "@/lib/timeline";
import { TimelineToolbar } from "./timeline-toolbar";
import { useElementSelection } from "@/hooks/timeline/element/use-element-selection";
import { useTimelineSeek } from "@/hooks/timeline/use-timeline-seek";
import { useTimelineDragDrop } from "@/hooks/timeline/use-timeline-drag-drop";
import { TimelineRuler } from "./timeline-ruler";
import { TimelineBookmarksRow } from "./bookmarks";
import { useBookmarkDrag } from "@/hooks/timeline/use-bookmark-drag";
import { useEdgeAutoScroll } from "@/hooks/timeline/use-edge-auto-scroll";
import { useInitialScrollBottom } from "@/hooks/timeline/use-initial-scroll-bottom";
import { useTimelineStore } from "@/stores/timeline-store";
import { useEditor } from "@/hooks/use-editor";
import { useTimelinePlayhead } from "@/hooks/timeline/use-timeline-playhead";
import { DragLine } from "./drag-line";
import { invokeAction } from "@/lib/actions";
import { resolveTimelineElementIntersections } from "@/lib/timeline/selection-hit-testing";
import { cn } from "@/utils/ui";

const TRACKS_CONTAINER_MAX_HEIGHT = 800;
const FALLBACK_CONTAINER_WIDTH = 1000;
const TRACKS_CONTAINER_HEIGHT = { min: 0, max: TRACKS_CONTAINER_MAX_HEIGHT };
const TRACK_ICONS: Record<TimelineTrack["type"], ReactNode> = {
	video: <OcVideoIcon className="text-muted-foreground size-4 shrink-0" />,
	text: (
		<HugeiconsIcon
			icon={TextIcon}
			className="text-muted-foreground size-4 shrink-0"
		/>
	),
	audio: (
		<HugeiconsIcon
			icon={MusicNote03Icon}
			className="text-muted-foreground size-4 shrink-0"
		/>
	),
	graphic: <OcShapesIcon className="text-muted-foreground size-4 shrink-0" />,
	effect: (
		<HugeiconsIcon
			icon={MagicWand05Icon}
			className="text-muted-foreground size-4 shrink-0"
		/>
	),
};

export function Timeline() {
	const snappingEnabled = useTimelineStore((s) => s.snappingEnabled);
	const {
		selectedElements,
		clearElementSelection,
		setElementSelection,
		mergeElementsIntoSelection,
	} = useElementSelection();
	const editor = useEditor();
	const timeline = editor.timeline;
	const tracks = useEditor((editor) => editor.timeline.getTracks());
	const seek = (time: number) => editor.playback.seek({ time });

	const timelineRef = useRef<HTMLDivElement>(null);
	const timelineHeaderRef = useRef<HTMLDivElement>(null);
	const rulerRef = useRef<HTMLDivElement>(null);
	const rulerScrollRef = useRef<HTMLDivElement>(null);
	const tracksContainerRef = useRef<HTMLDivElement>(null);
	const tracksScrollRef = useRef<HTMLDivElement>(null);
	const trackLabelsRef = useRef<HTMLDivElement>(null);
	const playheadRef = useRef<HTMLDivElement>(null);
	const trackLabelsScrollRef = useRef<HTMLDivElement>(null);

	const [isResizing, setIsResizing] = useState(false);
	const [currentSnapPoint, setCurrentSnapPoint] = useState<SnapPoint | null>(
		null,
	);

	const handleSnapPointChange = useCallback((snapPoint: SnapPoint | null) => {
		setCurrentSnapPoint(snapPoint);
	}, []);
	const handleResizeStateChange = useCallback(
		({ isResizing: nextIsResizing }: { isResizing: boolean }) => {
			setIsResizing(nextIsResizing);
			if (!nextIsResizing) {
				setCurrentSnapPoint(null);
			}
		},
		[],
	);

	const timelineDuration = timeline.getTotalDuration() || 0;
	const minZoomLevel = getTimelineZoomMin({
		duration: timelineDuration,
		containerWidth: tracksContainerRef.current?.clientWidth,
	});

	const savedViewState = editor.project.getTimelineViewState();

	const { zoomLevel, setZoomLevel, handleWheel, saveScrollPosition } =
		useTimelineZoom({
			containerRef: timelineRef,
			minZoom: minZoomLevel,
			initialZoom: savedViewState?.zoomLevel,
			initialScrollLeft: savedViewState?.scrollLeft,
			initialPlayheadTime: savedViewState?.playheadTime,
			tracksScrollRef,
			rulerScrollRef,
		});

	// Stable refs so the wheel listener never goes stale
	const setZoomLevelRef = useRef(setZoomLevel);
	useEffect(() => {
		setZoomLevelRef.current = setZoomLevel;
	}, [setZoomLevel]);

	const saveScrollPositionRef = useRef(saveScrollPosition);
	useEffect(() => {
		saveScrollPositionRef.current = saveScrollPosition;
	}, [saveScrollPosition]);

	const minZoomLevelRef = useRef(minZoomLevel);
	useEffect(() => {
		minZoomLevelRef.current = minZoomLevel;
	}, [minZoomLevel]);

	// Pushes tracks scroll position to the two overflow:hidden followers
	// (ruler and track labels). Called from the wheel handler (before paint,
	// zero lag) and from onScroll on the tracks area (covers scrollbar drag).
	const syncFollowers = useCallback(() => {
		const tracks = tracksScrollRef.current;
		if (!tracks) return;
		if (rulerScrollRef.current) {
			rulerScrollRef.current.scrollLeft = tracks.scrollLeft;
		}
		if (trackLabelsScrollRef.current) {
			trackLabelsScrollRef.current.scrollTop = tracks.scrollTop;
		}
	}, []);

	// Single non-passive capture listener owns all wheel input. Prevents any
	// native scroll or browser zoom from firing inside the timeline.
	useEffect(() => {
		const container = timelineRef.current;
		if (!container) return;

		let pendingZoomDelta = 0;
		let zoomRafId: ReturnType<typeof requestAnimationFrame> | null = null;

		const onWheel = (e: WheelEvent) => {
			const isZoom = e.ctrlKey || e.metaKey;

			if (isZoom) {
				e.preventDefault();
				const normalizedDelta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
				pendingZoomDelta += normalizedDelta;

				if (zoomRafId === null) {
					zoomRafId = requestAnimationFrame(() => {
						const frameRawDelta = pendingZoomDelta;
						const cappedDelta =
							Math.sign(frameRawDelta) * Math.min(Math.abs(frameRawDelta), 30);
						const zoomFactor = Math.exp(-cappedDelta / 300);
						setZoomLevelRef.current((prev) => prev * zoomFactor);
						pendingZoomDelta = 0;
						zoomRafId = null;
					});
				}
				return;
			}

			const tracks = tracksScrollRef.current;
			if (!tracks) return;

			const isHorizontal =
				e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY);

			e.preventDefault();

			if (isHorizontal) {
				const raw =
					Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
				const clamped =
					Math.sign(raw) *
					Math.min(Math.abs(raw), TIMELINE_CONSTANTS.HORIZONTAL_WHEEL_STEP_PX);
				tracks.scrollLeft = Math.max(0, tracks.scrollLeft + clamped);
			} else {
				tracks.scrollTop = Math.max(0, tracks.scrollTop + e.deltaY);
			}

			syncFollowers();
			saveScrollPositionRef.current();
		};

		container.addEventListener("wheel", onWheel, {
			passive: false,
			capture: true,
		});
		return () => {
			container.removeEventListener("wheel", onWheel, { capture: true });
			if (zoomRafId !== null) cancelAnimationFrame(zoomRafId);
		};
	}, [syncFollowers]);

	useInitialScrollBottom({
		tracksScrollRef,
		trackLabelsScrollRef,
		onAfterScroll: () => saveScrollPositionRef.current(),
		isReady: tracks.length > 0,
	});

	const {
		dragState,
		dragDropTarget,
		handleElementMouseDown,
		handleElementClick,
		lastMouseXRef,
	} = useElementInteraction({
		zoomLevel,
		timelineRef,
		tracksContainerRef,
		tracksScrollRef,
		snappingEnabled,
		onSnapPointChange: handleSnapPointChange,
	});

	const {
		dragState: bookmarkDragState,
		handleBookmarkMouseDown,
		lastMouseXRef: bookmarkLastMouseXRef,
	} = useBookmarkDrag({
		zoomLevel,
		scrollRef: tracksScrollRef,
		snappingEnabled,
		onSnapPointChange: handleSnapPointChange,
	});

	const { handleRulerMouseDown: handlePlayheadRulerMouseDown } =
		useTimelinePlayhead({
			zoomLevel,
			rulerRef,
			rulerScrollRef,
			tracksScrollRef,
			playheadRef,
		});

	const { isDragOver, dropTarget, dragProps } = useTimelineDragDrop({
		containerRef: tracksContainerRef,
		tracksScrollRef,
		zoomLevel,
	});

	const {
		selectionBox,
		handleMouseDown: handleSelectionMouseDown,
		isSelecting,
		shouldIgnoreClick,
	} = useBoxSelect({
		containerRef: tracksContainerRef,
		selectedIds: selectedElements,
		anchorId: null,
		getIsAdditiveSelection: (event) =>
			event.shiftKey || event.ctrlKey || event.metaKey,
		resolveIntersections: ({ startPos, currentPos }) => {
			if (!tracksContainerRef.current) {
				return [];
			}

			return resolveTimelineElementIntersections({
				container: tracksContainerRef.current,
				scrollContainer: tracksScrollRef.current,
				tracks,
				zoomLevel,
				startPos,
				currentPos,
			});
		},
		onSelectionChange: ({ intersectedIds, isAdditive }) => {
			if (isAdditive) {
				mergeElementsIntoSelection({ elements: intersectedIds });
			} else {
				setElementSelection({ elements: intersectedIds });
			}
		},
	});

	const containerWidth =
		tracksContainerRef.current?.clientWidth || FALLBACK_CONTAINER_WIDTH;
	const contentWidth =
		timelineDuration * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel;
	const paddingPx = getTimelinePaddingPx({
		containerWidth,
		zoomLevel,
		minZoom: minZoomLevel,
	});
	const dynamicTimelineWidth = Math.max(
		contentWidth + paddingPx,
		containerWidth,
	);
	const tracksViewportWidth =
		tracksScrollRef.current?.clientWidth ??
		tracksContainerRef.current?.clientWidth ??
		containerWidth;
	const hasHorizontalScrollbar = dynamicTimelineWidth > tracksViewportWidth;

	useEdgeAutoScroll({
		isActive: bookmarkDragState.isDragging,
		getMouseClientX: () => bookmarkLastMouseXRef.current,
		rulerScrollRef,
		tracksScrollRef,
		contentWidth: dynamicTimelineWidth,
	});

	const showSnapIndicator =
		snappingEnabled &&
		currentSnapPoint !== null &&
		(dragState.isDragging || bookmarkDragState.isDragging || isResizing);

	const {
		handleTracksMouseDown,
		handleTracksClick,
		handleRulerMouseDown,
		handleRulerClick,
	} = useTimelineSeek({
		playheadRef,
		trackLabelsRef,
		rulerScrollRef,
		tracksScrollRef,
		zoomLevel,
		duration: timeline.getTotalDuration(),
		isSelecting,
		clearSelectedElements: clearElementSelection,
		seek,
	});

	const timelineHeaderHeight =
		(timelineHeaderRef.current?.getBoundingClientRect().height ?? 0) +
			TIMELINE_CONSTANTS.PADDING_TOP_PX || 0;

	return (
		<section
			className={
				"panel bg-background relative flex h-full flex-col overflow-hidden rounded-sm border"
			}
			{...dragProps}
			aria-label="Timeline"
		>
			<TimelineToolbar
				zoomLevel={zoomLevel}
				minZoom={minZoomLevel}
				setZoomLevel={({ zoom }) => setZoomLevel(zoom)}
			/>

			<div className="relative flex flex-1 overflow-hidden" ref={timelineRef}>
				<TrackLabelsPanel
					trackLabelsRef={trackLabelsRef}
					trackLabelsScrollRef={trackLabelsScrollRef}
					timelineHeaderHeight={timelineHeaderHeight}
					hasHorizontalScrollbar={hasHorizontalScrollbar}
				/>

				<div
					className="relative isolate flex flex-1 flex-col overflow-hidden"
					ref={tracksContainerRef}
				>
					<SelectionBox
						startPos={selectionBox?.startPos || null}
						currentPos={selectionBox?.currentPos || null}
						containerRef={tracksContainerRef}
						isActive={selectionBox?.isActive || false}
					/>
					<DragLine
						dropTarget={dropTarget}
						tracks={timeline.getTracks()}
						isVisible={isDragOver && !dropTarget?.targetElement}
						headerHeight={timelineHeaderHeight}
					/>
					<DragLine
						dropTarget={dragDropTarget}
						tracks={timeline.getTracks()}
						isVisible={dragState.isDragging}
						headerHeight={timelineHeaderHeight}
					/>

					<div ref={rulerScrollRef} className="shrink-0 overflow-hidden">
						<div
							ref={timelineHeaderRef}
							className="flex flex-col"
							style={{ width: `${dynamicTimelineWidth}px` }}
						>
							<TimelineRuler
								zoomLevel={zoomLevel}
								dynamicTimelineWidth={dynamicTimelineWidth}
								rulerRef={rulerRef}
								tracksScrollRef={rulerScrollRef}
								handleWheel={handleWheel}
								handleTimelineContentClick={handleRulerClick}
								handleRulerTrackingMouseDown={handleRulerMouseDown}
								handleRulerMouseDown={handlePlayheadRulerMouseDown}
							/>
							<TimelineBookmarksRow
								zoomLevel={zoomLevel}
								dynamicTimelineWidth={dynamicTimelineWidth}
								dragState={bookmarkDragState}
								onBookmarkMouseDown={handleBookmarkMouseDown}
								handleWheel={handleWheel}
								handleTimelineContentClick={handleRulerClick}
								handleRulerTrackingMouseDown={handleRulerMouseDown}
								handleRulerMouseDown={handlePlayheadRulerMouseDown}
							/>
						</div>
					</div>

					<ScrollArea
						className="flex-1"
						ref={tracksScrollRef}
						onScroll={() => {
							syncFollowers();
							saveScrollPosition();
						}}
					>
						<div
							className="flex min-h-full flex-col"
							style={{ width: `${dynamicTimelineWidth}px` }}
						>
							{/* biome-ignore lint/a11y/noStaticElementInteractions: canvas seek surface; keyboard seeking is handled by the global keybindings system */}
							{/* biome-ignore lint/a11y/useKeyWithClickEvents: canvas seek surface; keyboard seeking is handled by the global keybindings system */}
							<div
								className="relative shrink-0"
								style={{
									height: `${
										Math.max(
											TRACKS_CONTAINER_HEIGHT.min,
											Math.min(
												TRACKS_CONTAINER_HEIGHT.max,
												getTotalTracksHeight({ tracks }),
											),
										) + TIMELINE_CONSTANTS.PADDING_TOP_PX
									}px`,
								}}
								onMouseDown={(event) => {
									const isDirectTarget = event.target === event.currentTarget;
									if (!isDirectTarget) return;
									event.stopPropagation();
									handleTracksMouseDown(event);
									handleSelectionMouseDown(event);
								}}
								onClick={(event) => {
									const isDirectTarget = event.target === event.currentTarget;
									if (!isDirectTarget) return;
									event.stopPropagation();
									handleTracksClick(event);
								}}
							>
								{tracks.length > 0 && (
									<TimelineTrackRows
										dragElementId={dragState.elementId}
										zoomLevel={zoomLevel}
										dragState={dragState}
										tracksScrollRef={tracksScrollRef}
										lastMouseXRef={lastMouseXRef}
										onSnapPointChange={handleSnapPointChange}
										onResizeStateChange={handleResizeStateChange}
										onElementMouseDown={handleElementMouseDown}
										onElementClick={handleElementClick}
										onTrackMouseDown={(event) => {
											handleSelectionMouseDown(event);
											handleTracksMouseDown(event);
										}}
										onTrackMouseUp={handleTracksClick}
										shouldIgnoreClick={shouldIgnoreClick}
										isDragOver={isDragOver}
										dropTarget={dropTarget}
									/>
								)}
							</div>
							<TimelineGutter
								onMouseDown={(event) => {
									handleTracksMouseDown(event);
									handleSelectionMouseDown(event);
								}}
								onClick={handleTracksClick}
							/>
						</div>
					</ScrollArea>

					<TimelinePlayhead
						zoomLevel={zoomLevel}
						hasHorizontalScrollbar={hasHorizontalScrollbar}
						rulerRef={rulerRef}
						rulerScrollRef={rulerScrollRef}
						tracksScrollRef={tracksScrollRef}
						timelineRef={timelineRef}
						playheadRef={playheadRef}
						isSnappingToPlayhead={
							showSnapIndicator && currentSnapPoint?.type === "playhead"
						}
					/>
				</div>
				<SnapIndicator
					snapPoint={currentSnapPoint}
					zoomLevel={zoomLevel}
					timelineRef={timelineRef}
					tracksScrollRef={tracksScrollRef}
					isVisible={showSnapIndicator}
				/>
			</div>
		</section>
	);
}

function TrackLabelsPanel({
	trackLabelsRef,
	trackLabelsScrollRef,
	timelineHeaderHeight,
	hasHorizontalScrollbar,
}: {
	trackLabelsRef: React.RefObject<HTMLDivElement | null>;
	trackLabelsScrollRef: React.RefObject<HTMLDivElement | null>;
	timelineHeaderHeight: number;
	hasHorizontalScrollbar: boolean;
}) {
	const editor = useEditor();
	const tracks = useEditor((e) => e.timeline.getTracks());
	const { selectedElements } = useElementSelection();
	const tracksWithSelection = useMemo(
		() => new Set(selectedElements.map((el) => el.trackId)),
		[selectedElements],
	);

	return (
		<div className="flex w-28 shrink-0 flex-col border-r">
			<div
				className="shrink-0"
				style={{ height: timelineHeaderHeight || 48 }}
			/>
			<div ref={trackLabelsRef} className="flex-1 overflow-hidden">
				<div ref={trackLabelsScrollRef} className="size-full overflow-hidden">
					{tracks.length > 0 && (
						<div className="flex flex-col" style={{ gap: `${TRACK_GAP}px` }}>
							{tracks.map((track) => (
								<div
									key={track.id}
									className={cn(
										"group flex items-center px-3",
										tracksWithSelection.has(track.id) &&
											TIMELINE_CONSTANTS.TRACK_SELECTED_BG,
									)}
									style={{
										height: `${getTrackHeight({ type: track.type })}px`,
									}}
								>
									<div className="flex min-w-0 flex-1 items-center justify-end gap-2">
										{canTracktHaveAudio(track) && (
											<TrackToggleIcon
												isOff={track.muted}
												icons={{ on: VolumeHighIcon, off: VolumeOffIcon }}
												onClick={() =>
													editor.timeline.toggleTrackMute({ trackId: track.id })
												}
											/>
										)}
										{canTrackBeHidden(track) && (
											<TrackToggleIcon
												isOff={track.hidden}
												icons={{ on: ViewIcon, off: ViewOffSlashIcon }}
												onClick={() =>
													editor.timeline.toggleTrackVisibility({
														trackId: track.id,
													})
												}
											/>
										)}
										<TrackIcon track={track} />
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
			<div
				className="bg-background shrink-0"
				style={{
					height: hasHorizontalScrollbar ? TIMELINE_SCROLLBAR_SIZE_PX : 0,
				}}
			/>
		</div>
	);
}

function TimelineTrackRows({
	dragElementId,
	zoomLevel,
	dragState,
	tracksScrollRef,
	lastMouseXRef,
	onSnapPointChange,
	onResizeStateChange,
	onElementMouseDown,
	onElementClick,
	onTrackMouseDown,
	onTrackMouseUp,
	shouldIgnoreClick,
	isDragOver,
	dropTarget,
}: {
	dragElementId: string | null;
	zoomLevel: number;
	dragState: ElementDragState;
	tracksScrollRef: React.RefObject<HTMLDivElement | null>;
	lastMouseXRef: React.RefObject<number>;
	onSnapPointChange: (snapPoint: SnapPoint | null) => void;
	onResizeStateChange: (params: { isResizing: boolean }) => void;
	onElementMouseDown: React.ComponentProps<
		typeof TimelineTrackContent
	>["onElementMouseDown"];
	onElementClick: React.ComponentProps<
		typeof TimelineTrackContent
	>["onElementClick"];
	onTrackMouseDown: (event: React.MouseEvent) => void;
	onTrackMouseUp: (event: React.MouseEvent) => void;
	shouldIgnoreClick: () => boolean;
	isDragOver: boolean;
	dropTarget: DropTarget | null;
}) {
	const timeline = useEditor((e) => e.timeline);
	const tracks = useEditor((e) => e.timeline.getTracks());
	const { selectedElements } = useElementSelection();
	const [trackToDelete, setTrackToDelete] = useState<TimelineTrack | null>(null);
	const tracksWithSelection = useMemo(
		() => new Set(selectedElements.map((el) => el.trackId)),
		[selectedElements],
	);

	const sortedTracks = useMemo(
		() =>
			[...tracks]
				.map((track, index) => ({ track, index }))
				.sort((a, b) => {
					const aHasDragged = a.track.elements.some(
						(el) => el.id === dragElementId,
					);
					const bHasDragged = b.track.elements.some(
						(el) => el.id === dragElementId,
					);
					if (aHasDragged) return 1;
					if (bHasDragged) return -1;
					return 0;
				}),
		[tracks, dragElementId],
	);

	return (
		<>
			{sortedTracks.map(({ track, index }) => (
				<ContextMenu key={track.id}>
					<ContextMenuTrigger asChild>
						<div
							className={cn(
								"absolute right-0 left-0 transition-colors",
								tracksWithSelection.has(track.id) &&
									TIMELINE_CONSTANTS.TRACK_SELECTED_BG,
							)}
							style={{
								top: `${TIMELINE_CONSTANTS.PADDING_TOP_PX + getCumulativeHeightBefore({ tracks, trackIndex: index })}px`,
								height: `${getTrackHeight({ type: track.type })}px`,
							}}
						>
							<TimelineTrackContent
								track={track}
								zoomLevel={zoomLevel}
								dragState={dragState}
								rulerScrollRef={tracksScrollRef}
								tracksScrollRef={tracksScrollRef}
								lastMouseXRef={lastMouseXRef}
								onSnapPointChange={onSnapPointChange}
								onResizeStateChange={onResizeStateChange}
								onElementMouseDown={onElementMouseDown}
								onElementClick={onElementClick}
								onTrackMouseDown={onTrackMouseDown}
								onTrackMouseUp={onTrackMouseUp}
								shouldIgnoreClick={shouldIgnoreClick}
								targetElementId={
									isDragOver
										? (dropTarget?.targetElement?.elementId ?? null)
										: null
								}
							/>
						</div>
					</ContextMenuTrigger>
					<ContextMenuContent className="w-40">
						<ContextMenuItem
							icon={<HugeiconsIcon icon={TaskAdd02Icon} />}
							onClick={(event: React.MouseEvent) => {
								event.stopPropagation();
								invokeAction("paste-copied");
							}}
						>
							Paste elements
						</ContextMenuItem>
						<ContextMenuItem
							icon={<HugeiconsIcon icon={VolumeHighIcon} />}
							onClick={(event: React.MouseEvent) => {
								event.stopPropagation();
								timeline.toggleTrackMute({ trackId: track.id });
							}}
						>
							{canTracktHaveAudio(track) && track.muted
								? "Unmute track"
								: "Mute track"}
						</ContextMenuItem>
						<ContextMenuItem
							icon={<HugeiconsIcon icon={ViewIcon} />}
							onClick={(event: React.MouseEvent) => {
								event.stopPropagation();
								timeline.toggleTrackVisibility({ trackId: track.id });
							}}
						>
							{canTrackBeHidden(track) && track.hidden
								? "Show track"
								: "Hide track"}
						</ContextMenuItem>
						{!isMainTrack(track) && (
							<ContextMenuItem
								icon={<HugeiconsIcon icon={Delete02Icon} />}
								onClick={(event: React.MouseEvent) => {
									event.stopPropagation();
									setTrackToDelete(track);
								}}
								variant="destructive"
							>
								Delete track
							</ContextMenuItem>
						)}
					</ContextMenuContent>
				</ContextMenu>
			))}
			{trackToDelete && (
				<AlertDialog open onOpenChange={(open) => !open && setTrackToDelete(null)}>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Delete track?</AlertDialogTitle>
							<AlertDialogDescription>
								This will remove {trackToDelete.elements.length} element{trackToDelete.elements.length === 1 ? "" : "s"}.
								This action cannot be undone.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancel</AlertDialogCancel>
							<AlertDialogAction
								onClick={() => {
									timeline.removeTrack({ trackId: trackToDelete.id });
									setTrackToDelete(null);
								}}
							>
								Delete
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			)}
		</>
	);
}

function TimelineGutter({
	onMouseDown,
	onClick,
}: {
	onMouseDown: (event: React.MouseEvent) => void;
	onClick: (event: React.MouseEvent) => void;
}) {
	// biome-ignore lint/a11y/noStaticElementInteractions: canvas seek surface; keyboard seeking is handled by the global keybindings system
	// biome-ignore lint/a11y/useKeyWithClickEvents: canvas seek surface; keyboard seeking is handled by the global keybindings system
	return <div className="flex-1" onMouseDown={onMouseDown} onClick={onClick} />;
}

function TrackIcon({ track }: { track: TimelineTrack }) {
	return <>{TRACK_ICONS[track.type]}</>;
}

function TrackToggleIcon({
	isOff,
	icons,
	onClick,
}: {
	isOff: boolean;
	icons: {
		on: IconSvgElement;
		off: IconSvgElement;
	};
	onClick: () => void;
}) {
	return (
		<>
			{isOff ? (
				<HugeiconsIcon
					icon={icons.off}
					className="text-destructive size-4 cursor-pointer"
					onClick={onClick}
				/>
			) : (
				<HugeiconsIcon
					icon={icons.on}
					className="text-muted-foreground size-4 cursor-pointer"
					onClick={onClick}
				/>
			)}
		</>
	);
}
