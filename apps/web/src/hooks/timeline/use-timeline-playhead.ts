import { getSnappedSeekTime } from "@/lib/time";
import { useState, useEffect, useCallback, useRef } from "react";
import { useEdgeAutoScroll } from "@/hooks/timeline/use-edge-auto-scroll";
import { useEditor } from "../use-editor";
import { useShiftKey } from "@/hooks/use-shift-key";
import {
	findSnapPoints,
	snapToNearestPoint,
} from "@/lib/timeline/snap-utils";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";

interface UseTimelinePlayheadProps {
	zoomLevel: number;
	rulerRef: React.RefObject<HTMLDivElement | null>;
	rulerScrollRef: React.RefObject<HTMLDivElement | null>;
	tracksScrollRef: React.RefObject<HTMLDivElement | null>;
	playheadRef?: React.RefObject<HTMLDivElement | null>;
}

export function useTimelinePlayhead({
	zoomLevel,
	rulerRef,
	rulerScrollRef,
	tracksScrollRef,
	playheadRef,
}: UseTimelinePlayheadProps) {
	const editor = useEditor();
	const activeProject = editor.project.getActive();
	const currentTime = editor.playback.getCurrentTime();
	const duration = editor.timeline.getTotalDuration();
	const isPlaying = editor.playback.getIsPlaying();
	const isScrubbing = editor.playback.getIsScrubbing();
	const isShiftHeldRef = useShiftKey();

	const seek = useCallback(
		({ time }: { time: number }) => editor.playback.seek({ time }),
		[editor.playback],
	);

	const [scrubTime, setScrubTime] = useState<number | null>(null);

	const [isDraggingRuler, setIsDraggingRuler] = useState(false);
	const [hasDraggedRuler, setHasDraggedRuler] = useState(false);
	const lastMouseXRef = useRef<number>(0);

	const playheadPosition =
		isScrubbing && scrubTime !== null ? scrubTime : currentTime;

	const handleScrub = useCallback(
		({ event }: { event: MouseEvent | React.MouseEvent }) => {
			const ruler = rulerRef.current;
			if (!ruler) return;
			const rulerRect = ruler.getBoundingClientRect();
			const relativeMouseX = event.clientX - rulerRect.left;

			const timelineContentWidth =
				duration * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel;

			const clampedMouseX = Math.max(
				0,
				Math.min(timelineContentWidth, relativeMouseX),
			);

			const rawTime = Math.max(
				0,
				Math.min(
					duration,
					clampedMouseX / (TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel),
				),
			);

			const framesPerSecond = activeProject.settings.fps;
			const frameTime = getSnappedSeekTime({
				rawTime,
				duration,
				fps: framesPerSecond,
			});

			const shouldSnap = !isShiftHeldRef.current;
			const time = (() => {
				if (!shouldSnap) return frameTime;
				const tracks = editor.timeline.getTracks();
				const bookmarks =
					editor.scenes.getActiveScene()?.bookmarks ?? [];
				const snapPoints = findSnapPoints({
					tracks,
					playheadTime: frameTime,
					bookmarks,
					enablePlayheadSnapping: false,
				});
				const snapResult = snapToNearestPoint({
					targetTime: frameTime,
					snapPoints,
					zoomLevel,
				});
				return snapResult.snapPoint ? snapResult.snappedTime : frameTime;
			})();

			setScrubTime(time);
			seek({ time });

			lastMouseXRef.current = event.clientX;
		},
		[
			duration,
			zoomLevel,
			seek,
			rulerRef,
			activeProject.settings.fps,
			isShiftHeldRef,
			editor.scenes,
			editor.timeline,
		],
	);

	const handlePlayheadMouseDown = useCallback(
		({ event }: { event: React.MouseEvent }) => {
			event.preventDefault();
			event.stopPropagation();
			editor.playback.setScrubbing({ isScrubbing: true });
			handleScrub({ event });
		},
		[handleScrub, editor.playback],
	);

	const handleRulerMouseDown = useCallback(
		({ event }: { event: React.MouseEvent }) => {
			if (event.button !== 0) return;

			if (playheadRef?.current?.contains(event.target as Node)) return;

			event.preventDefault();
			setIsDraggingRuler(true);
			setHasDraggedRuler(false);

			editor.playback.setScrubbing({ isScrubbing: true });
			handleScrub({ event });
		},
		[handleScrub, playheadRef, editor.playback],
	);

	const handlePlayheadMouseDownEvent = useCallback(
		(event: React.MouseEvent) => handlePlayheadMouseDown({ event }),
		[handlePlayheadMouseDown],
	);

	const handleRulerMouseDownEvent = useCallback(
		(event: React.MouseEvent) => handleRulerMouseDown({ event }),
		[handleRulerMouseDown],
	);

	useEdgeAutoScroll({
		isActive: isScrubbing,
		getMouseClientX: () => lastMouseXRef.current,
		rulerScrollRef,
		tracksScrollRef,
		contentWidth: duration * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel,
	});

	useEffect(() => {
		if (!isScrubbing) return;

		const handleMouseMove = ({ event }: { event: MouseEvent }) => {
			handleScrub({ event });
			if (isDraggingRuler) {
				setHasDraggedRuler(true);
			}
		};

		const handleMouseUp = ({ event }: { event: MouseEvent }) => {
			editor.playback.setScrubbing({ isScrubbing: false });
			if (scrubTime !== null) {
				seek({ time: scrubTime });
				editor.project.setTimelineViewState({
					viewState: {
						zoomLevel,
						scrollLeft: tracksScrollRef.current?.scrollLeft ?? 0,
						playheadTime: scrubTime,
					},
				});
			}
			setScrubTime(null);

			if (isDraggingRuler) {
				setIsDraggingRuler(false);
				if (!hasDraggedRuler) {
					handleScrub({ event });
				}
				setHasDraggedRuler(false);
			}
		};

		const onMouseMove = (event: MouseEvent) => handleMouseMove({ event });
		const onMouseUp = (event: MouseEvent) => handleMouseUp({ event });

		window.addEventListener("mousemove", onMouseMove);
		window.addEventListener("mouseup", onMouseUp);

		return () => {
			window.removeEventListener("mousemove", onMouseMove);
			window.removeEventListener("mouseup", onMouseUp);
		};
	}, [
		isScrubbing,
		scrubTime,
		seek,
		handleScrub,
		isDraggingRuler,
		hasDraggedRuler,
		editor,
		tracksScrollRef,
		zoomLevel,
	]);

	useEffect(() => {
		if (!isPlaying || isScrubbing) return;

		const rulerViewport = rulerScrollRef.current;
		const tracksViewport = tracksScrollRef.current;
		if (!rulerViewport || !tracksViewport) return;

		const playheadPixels =
			playheadPosition * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel;
		const viewportWidth = rulerViewport.clientWidth;
		const scrollMinimum = 0;
		const scrollMaximum = rulerViewport.scrollWidth - viewportWidth;

		const needsScroll =
			playheadPixels < rulerViewport.scrollLeft ||
			playheadPixels > rulerViewport.scrollLeft + viewportWidth;

		if (needsScroll) {
			const desiredScroll = Math.max(
				scrollMinimum,
				Math.min(scrollMaximum, playheadPixels - viewportWidth / 2),
			);
			rulerViewport.scrollLeft = tracksViewport.scrollLeft = desiredScroll;
		}
	}, [
		playheadPosition,
		zoomLevel,
		rulerScrollRef,
		tracksScrollRef,
		isScrubbing,
		isPlaying,
	]);

	return {
		playheadPosition,
		handlePlayheadMouseDown: handlePlayheadMouseDownEvent,
		handleRulerMouseDown: handleRulerMouseDownEvent,
		isDraggingRuler,
	};
}
