"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Delete02Icon,
	TaskAdd02Icon,
	ViewIcon,
	ViewOffSlashIcon,
	VolumeHighIcon,
	VolumeOffIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from "../../../ui/context-menu";
import { useTimelineZoom } from "@/hooks/timeline/use-timeline-zoom";
import { useState, useRef, useCallback } from "react";
import { TimelineTrackContent } from "./timeline-track";
import { TimelinePlayhead } from "./timeline-playhead";
import { SelectionBox } from "../../selection-box";
import { useSelectionBox } from "@/hooks/timeline/use-selection-box";
import { SnapIndicator } from "./snap-indicator";
import type { SnapPoint } from "@/lib/timeline/snap-utils";
import type { TimelineTrack } from "@/types/timeline";
import {
	TIMELINE_CONSTANTS,
	TRACK_ICONS,
} from "@/constants/timeline-constants";
import { useElementInteraction } from "@/hooks/timeline/element/use-element-interaction";
import {
	getTrackHeight,
	getCumulativeHeightBefore,
	getTotalTracksHeight,
	canTracktHaveAudio,
	canTrackBeHidden,
	getTimelineZoomMin,
	getTimelinePaddingPx,
	isMainTrack,
} from "@/lib/timeline";
import { TimelineToolbar } from "./timeline-toolbar";
import { useScrollSync } from "@/hooks/timeline/use-scroll-sync";
import { useElementSelection } from "@/hooks/timeline/element/use-element-selection";
import { useTimelineSeek } from "@/hooks/timeline/use-timeline-seek";
import { useTimelineDragDrop } from "@/hooks/timeline/use-timeline-drag-drop";
import { TimelineRuler } from "./timeline-ruler";
import { TimelineBookmarksRow } from "./bookmarks";
import { useBookmarkDrag } from "@/hooks/timeline/use-bookmark-drag";
import { useEdgeAutoScroll } from "@/hooks/timeline/use-edge-auto-scroll";
import { useTimelineStore } from "@/stores/timeline-store";
import { useEditor } from "@/hooks/use-editor";
import { useTimelinePlayhead } from "@/hooks/timeline/use-timeline-playhead";
import { DragLine } from "./drag-line";
import { invokeAction } from "@/lib/actions";

export function Timeline() {
	const tracksContainerHeight = { min: 0, max: 800 };
	const { snappingEnabled } = useTimelineStore();
	const { clearElementSelection, setElementSelection } = useElementSelection();
	const editor = useEditor();
	const timeline = editor.timeline;
	const tracks = timeline.getTracks();
	const seek = (time: number) => editor.playback.seek({ time });

	// refs
	const timelineRef = useRef<HTMLDivElement>(null);
	const timelineHeaderRef = useRef<HTMLDivElement>(null);
	const rulerRef = useRef<HTMLDivElement>(null);
	const tracksContainerRef = useRef<HTMLDivElement>(null);
	const tracksScrollRef = useRef<HTMLDivElement>(null);
	const trackLabelsRef = useRef<HTMLDivElement>(null);
	const playheadRef = useRef<HTMLDivElement>(null);
	const trackLabelsScrollRef = useRef<HTMLDivElement>(null);

	// state
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
			rulerScrollRef: tracksScrollRef,
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
		headerRef: timelineHeaderRef,
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
			rulerScrollRef: tracksScrollRef,
			tracksScrollRef,
			playheadRef,
		});

	const { isDragOver, dropTarget, dragProps } = useTimelineDragDrop({
		containerRef: tracksContainerRef,
		headerRef: timelineHeaderRef,
		zoomLevel,
	});

	const {
		selectionBox,
		handleMouseDown: handleSelectionMouseDown,
		isSelecting,
		shouldIgnoreClick,
	} = useSelectionBox({
		containerRef: tracksContainerRef,
		onSelectionComplete: (elements) => {
			setElementSelection({ elements });
		},
		tracksScrollRef,
		zoomLevel,
	});

	const containerWidth = tracksContainerRef.current?.clientWidth || 1000;
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

	useEdgeAutoScroll({
		isActive: bookmarkDragState.isDragging,
		getMouseClientX: () => bookmarkLastMouseXRef.current,
		rulerScrollRef: tracksScrollRef,
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
		rulerScrollRef: tracksScrollRef,
		tracksScrollRef,
		zoomLevel,
		duration: timeline.getTotalDuration(),
		isSelecting,
		clearSelectedElements: clearElementSelection,
		seek,
	});

	useScrollSync({
		tracksScrollRef,
		trackLabelsScrollRef,
	});

	const timelineHeaderHeight =
		timelineHeaderRef.current?.getBoundingClientRect().height ?? 0;

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

			<div
				className="relative flex flex-1 flex-col overflow-hidden"
				ref={timelineRef}
			>
				<SnapIndicator
					snapPoint={currentSnapPoint}
					zoomLevel={zoomLevel}
					tracks={tracks}
					timelineRef={timelineRef}
					trackLabelsRef={trackLabelsRef}
					tracksScrollRef={tracksScrollRef}
					isVisible={showSnapIndicator}
				/>
				<div className="flex flex-1 overflow-hidden">
					<div className="bg-background flex w-28 shrink-0 flex-col border-r">
						<div className="bg-background flex h-4 items-center justify-between px-3">
							<span className="opacity-0">.</span>
						</div>
						<div className="bg-background flex h-4 items-center justify-between px-3">
							<span className="opacity-0">.</span>
						</div>
						{tracks.length > 0 && (
							<div
								ref={trackLabelsRef}
								className="bg-background flex-1 overflow-y-auto"
								style={{ paddingTop: TIMELINE_CONSTANTS.PADDING_TOP_PX }}
							>
								<ScrollArea className="size-full" ref={trackLabelsScrollRef}>
									<div className="flex flex-col gap-1">
										{tracks.map((track) => (
											<div
												key={track.id}
												className="group flex items-center px-3"
												style={{
													height: `${getTrackHeight({ type: track.type })}px`,
												}}
											>
												<div className="flex min-w-0 flex-1 items-center justify-end gap-2">
													{process.env.NODE_ENV === "development" &&
														isMainTrack(track) && (
															<div className="bg-red-500 size-1.5 rounded-full" />
														)}
													{canTracktHaveAudio(track) && (
														<TrackToggleIcon
															isOff={track.muted}
															icons={{
																on: VolumeHighIcon,
																off: VolumeOffIcon,
															}}
															onClick={() =>
																editor.timeline.toggleTrackMute({
																	trackId: track.id,
																})
															}
														/>
													)}
													{canTrackBeHidden(track) && (
														<TrackToggleIcon
															isOff={track.hidden}
															icons={{
																on: ViewIcon,
																off: ViewOffSlashIcon,
															}}
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
								</ScrollArea>
							</div>
						)}
					</div>

					<div
						className="relative flex flex-1 flex-col overflow-hidden"
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
							isVisible={isDragOver}
							headerHeight={timelineHeaderHeight}
						/>
						<DragLine
							dropTarget={dragDropTarget}
							tracks={timeline.getTracks()}
							isVisible={dragState.isDragging}
							headerHeight={timelineHeaderHeight}
						/>
						<ScrollArea
							className="size-full overflow-y-hidden"
							ref={tracksScrollRef}
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
							onWheel={(event) => {
								if (
									event.shiftKey ||
									Math.abs(event.deltaX) > Math.abs(event.deltaY)
								) {
									return;
								}
								handleWheel(event);
							}}
							onScroll={() => {
								saveScrollPosition();
							}}
						>
							<div
								className="relative"
								style={{
									width: `${dynamicTimelineWidth}px`,
								}}
							>
								<div
									ref={timelineHeaderRef}
									className="bg-background sticky top-0 flex flex-col"
								>
									<TimelineRuler
										zoomLevel={zoomLevel}
										dynamicTimelineWidth={dynamicTimelineWidth}
										rulerRef={rulerRef}
										tracksScrollRef={tracksScrollRef}
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
								<TimelinePlayhead
									zoomLevel={zoomLevel}
									rulerRef={rulerRef}
									rulerScrollRef={tracksScrollRef}
									tracksScrollRef={tracksScrollRef}
									timelineRef={timelineRef}
									playheadRef={playheadRef}
									isSnappingToPlayhead={
										showSnapIndicator && currentSnapPoint?.type === "playhead"
									}
								/>
								<div
									className="relative"
									style={{
										height: `${Math.max(
											tracksContainerHeight.min,
											Math.min(
												tracksContainerHeight.max,
												getTotalTracksHeight({ tracks }),
											),
										)}px`,
									}}
								>
									{tracks.length === 0 ? (
										<div />
									) : (
										tracks.map((track, index) => (
											<ContextMenu key={track.id}>
												<ContextMenuTrigger asChild>
													<div
														className="absolute right-0 left-0"
														style={{
															top: `${getCumulativeHeightBefore({
																tracks,
																trackIndex: index,
															})}px`,
															height: `${getTrackHeight({
																type: track.type,
															})}px`,
														}}
													>
														<TimelineTrackContent
															track={track}
															zoomLevel={zoomLevel}
															dragState={dragState}
															rulerScrollRef={tracksScrollRef}
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
															onTrackClick={handleTracksClick}
															shouldIgnoreClick={shouldIgnoreClick}
														/>
													</div>
												</ContextMenuTrigger>
												<ContextMenuContent className="w-40">
													<ContextMenuItem
														icon={<HugeiconsIcon icon={TaskAdd02Icon} />}
														onClick={(e) => {
															e.stopPropagation();
															invokeAction("paste-copied");
														}}
													>
														Paste elements
													</ContextMenuItem>
													<ContextMenuItem
														onClick={(e) => {
															e.stopPropagation();
															timeline.toggleTrackMute({
																trackId: track.id,
															});
														}}
													>
														<HugeiconsIcon icon={VolumeHighIcon} />
														<span>
															{canTracktHaveAudio(track) && track.muted
																? "Unmute track"
																: "Mute track"}
														</span>
													</ContextMenuItem>
													<ContextMenuItem
														onClick={(e) => {
															e.stopPropagation();
															timeline.toggleTrackVisibility({
																trackId: track.id,
															});
														}}
													>
														<HugeiconsIcon icon={ViewIcon} />
														<span>
															{canTrackBeHidden(track) && track.hidden
																? "Show track"
																: "Hide track"}
														</span>
													</ContextMenuItem>
													<ContextMenuItem
														onClick={(e) => {
															e.stopPropagation();
															timeline.removeTrack({
																trackId: track.id,
															});
														}}
														variant="destructive"
													>
														<HugeiconsIcon icon={Delete02Icon} />
														Delete track
													</ContextMenuItem>
												</ContextMenuContent>
											</ContextMenu>
										))
									)}
								</div>
							</div>
						</ScrollArea>
					</div>
				</div>
			</div>
		</section>
	);
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
