import {
	type WheelEvent as ReactWheelEvent,
	type RefObject,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import { useEditor } from "@/hooks/use-editor";
import { zoomToSlider } from "@/lib/timeline/zoom-utils";

interface UseTimelineZoomProps {
	containerRef: RefObject<HTMLDivElement | null>;
	minZoom?: number;
	initialZoom?: number;
	initialScrollLeft?: number;
	initialPlayheadTime?: number;
	tracksScrollRef: RefObject<HTMLDivElement | null>;
	rulerScrollRef: RefObject<HTMLDivElement | null>;
}

interface UseTimelineZoomReturn {
	zoomLevel: number;
	setZoomLevel: (zoomLevel: number | ((prev: number) => number)) => void;
	handleWheel: (event: ReactWheelEvent) => void;
	saveScrollPosition: () => void;
}

export function useTimelineZoom({
	containerRef,
	minZoom = TIMELINE_CONSTANTS.ZOOM_MIN,
	initialZoom,
	initialScrollLeft,
	initialPlayheadTime,
	tracksScrollRef,
	rulerScrollRef,
}: UseTimelineZoomProps): UseTimelineZoomReturn {
	const editor = useEditor();
	const hasInitializedRef = useRef(false);
	const hasRestoredPlayheadRef = useRef(false);
	const scrollSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);

	const [zoomLevel, setZoomLevelRaw] = useState(() => {
		if (initialZoom !== undefined) {
			hasInitializedRef.current = true;
			return Math.max(
				minZoom,
				Math.min(TIMELINE_CONSTANTS.ZOOM_MAX, initialZoom),
			);
		}
		return minZoom;
	});
	const previousZoomRef = useRef(zoomLevel);
	const hasRestoredScrollRef = useRef(false);
	const preZoomScrollLeftRef = useRef(0);
	const prePlayheadAnchorScrollLeftRef = useRef(0);
	const isInPlayheadAnchorModeRef = useRef(false);

	const setZoomLevel = useCallback(
		(updater: number | ((prev: number) => number)) => {
			const scrollElement = tracksScrollRef.current;
			if (scrollElement) {
				preZoomScrollLeftRef.current = scrollElement.scrollLeft;
			}
			setZoomLevelRaw(updater);
		},
		[tracksScrollRef],
	);

	const handleWheel = useCallback(
		(event: ReactWheelEvent) => {
			const isZoomGesture = event.ctrlKey || event.metaKey;
			const isHorizontalScrollGesture =
				event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY);

			if (isHorizontalScrollGesture) {
				return;
			}

			// pinch-zoom (ctrl/meta + wheel)
			if (isZoomGesture) {
				const zoomMultiplier = event.deltaY > 0 ? 1 / 1.1 : 1.1;
				setZoomLevel((prev) => {
					const nextZoom = Math.max(
						minZoom,
						Math.min(TIMELINE_CONSTANTS.ZOOM_MAX, prev * zoomMultiplier),
					);
					return nextZoom;
				});
				return;
			}
		},
		[minZoom, setZoomLevel],
	);

	useEffect(() => {
		if (initialZoom !== undefined && !hasInitializedRef.current) {
			hasInitializedRef.current = true;
			setZoomLevel(
				Math.max(minZoom, Math.min(TIMELINE_CONSTANTS.ZOOM_MAX, initialZoom)),
			);
			return;
		}
		setZoomLevel((prev) => {
			if (prev < minZoom) {
				return minZoom;
			}
			return prev;
		});
	}, [minZoom, initialZoom, setZoomLevel]);

	const wrappedSetZoomLevel = useCallback(
		(zoomLevelOrUpdater: number | ((prev: number) => number)) => {
			setZoomLevel((prev) => {
				const nextZoom =
					typeof zoomLevelOrUpdater === "function"
						? zoomLevelOrUpdater(prev)
						: zoomLevelOrUpdater;
				const clampedZoom = Math.max(
					minZoom,
					Math.min(TIMELINE_CONSTANTS.ZOOM_MAX, nextZoom),
				);
				return clampedZoom;
			});
		},
		[minZoom, setZoomLevel],
	);

	useLayoutEffect(() => {
		const previousZoom = previousZoomRef.current;
		if (previousZoom === zoomLevel) return;

		const scrollElement = tracksScrollRef.current;
		if (!scrollElement) {
			previousZoomRef.current = zoomLevel;
			return;
		}

		const currentScrollLeft = preZoomScrollLeftRef.current;
		const playheadTime = editor.playback.getCurrentTime();
		const sliderPercent = zoomToSlider({ zoomLevel, minZoom });
		const previousSliderPercent = zoomToSlider({
			zoomLevel: previousZoom,
			minZoom,
		});
		const isCrossingThresholdUp =
			previousSliderPercent <
				TIMELINE_CONSTANTS.ZOOM_ANCHOR_PLAYHEAD_THRESHOLD &&
			sliderPercent >= TIMELINE_CONSTANTS.ZOOM_ANCHOR_PLAYHEAD_THRESHOLD;
		const isCrossingThresholdDown =
			previousSliderPercent >=
				TIMELINE_CONSTANTS.ZOOM_ANCHOR_PLAYHEAD_THRESHOLD &&
			sliderPercent < TIMELINE_CONSTANTS.ZOOM_ANCHOR_PLAYHEAD_THRESHOLD;

		const syncScroll = (scrollLeft: number) => {
			scrollElement.scrollLeft = scrollLeft;
			if (rulerScrollRef.current) {
				rulerScrollRef.current.scrollLeft = scrollLeft;
			}
		};

		const clampScrollLeft = (scrollLeft: number) => {
			const maxScrollLeft =
				scrollElement.scrollWidth - scrollElement.clientWidth;
			return Math.max(0, Math.min(maxScrollLeft, scrollLeft));
		};

		if (isCrossingThresholdUp) {
			prePlayheadAnchorScrollLeftRef.current = currentScrollLeft;
			isInPlayheadAnchorModeRef.current = true;
		}

		if (sliderPercent >= TIMELINE_CONSTANTS.ZOOM_ANCHOR_PLAYHEAD_THRESHOLD) {
			const playheadPixelsBefore =
				playheadTime * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * previousZoom;
			const playheadPixelsAfter =
				playheadTime * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel;

			const viewportOffset = playheadPixelsBefore - currentScrollLeft;
			const newScrollLeft = playheadPixelsAfter - viewportOffset;

			syncScroll(clampScrollLeft(newScrollLeft));
		} else if (isCrossingThresholdDown && isInPlayheadAnchorModeRef.current) {
			syncScroll(clampScrollLeft(prePlayheadAnchorScrollLeftRef.current));
			isInPlayheadAnchorModeRef.current = false;
		}

		previousZoomRef.current = zoomLevel;

		editor.project.setTimelineViewState({
			viewState: {
				zoomLevel,
				scrollLeft: scrollElement.scrollLeft,
				playheadTime,
			},
		});
	}, [zoomLevel, editor, tracksScrollRef, rulerScrollRef, minZoom]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: tracksScrollRef is a stable ref
	const saveScrollPosition = useCallback(() => {
		if (scrollSaveTimeoutRef.current) {
			clearTimeout(scrollSaveTimeoutRef.current);
		}
		scrollSaveTimeoutRef.current = setTimeout(() => {
			const scrollElement = tracksScrollRef.current;
			if (scrollElement) {
				editor.project.setTimelineViewState({
					viewState: {
						zoomLevel,
						scrollLeft: scrollElement.scrollLeft,
						playheadTime: editor.playback.getCurrentTime(),
					},
				});
			}
		}, 300);
	}, [zoomLevel, editor]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: refs are stable
	useEffect(() => {
		if (initialScrollLeft === undefined) return;
		if (hasRestoredScrollRef.current) return;
		const scrollElement = tracksScrollRef.current;
		if (!scrollElement) return;

		const restoreScroll = () => {
			scrollElement.scrollLeft = initialScrollLeft;
			if (rulerScrollRef.current) {
				rulerScrollRef.current.scrollLeft = initialScrollLeft;
			}
			hasRestoredScrollRef.current = true;
		};

		if (scrollElement.scrollWidth > 0) {
			restoreScroll();
		} else {
			const observer = new ResizeObserver(() => {
				if (scrollElement.scrollWidth > 0) {
					restoreScroll();
					observer.disconnect();
				}
			});
			observer.observe(scrollElement);
			return () => observer.disconnect();
		}
	}, [initialScrollLeft]);

	useEffect(() => {
		if (initialPlayheadTime !== undefined && !hasRestoredPlayheadRef.current) {
			hasRestoredPlayheadRef.current = true;
			editor.playback.seek({ time: initialPlayheadTime });
		}
	}, [initialPlayheadTime, editor]);

	// prevent browser zoom in the timeline
	useEffect(() => {
		const preventZoom = (event: WheelEvent) => {
			const isZoomKeyPressed = event.ctrlKey || event.metaKey;
			const isInContainer = containerRef.current?.contains(
				event.target as Node,
			);
			// only check isInContainer, not isInTimeline state - the state check
			// causes race conditions where the closure captures stale state
			if (isZoomKeyPressed && isInContainer) {
				event.preventDefault();
			}
		};

		document.addEventListener("wheel", preventZoom, {
			passive: false,
			capture: true,
		});

		return () => {
			document.removeEventListener("wheel", preventZoom, { capture: true });
		};
	}, [containerRef]);

	return {
		zoomLevel,
		setZoomLevel: wrappedSetZoomLevel,
		handleWheel,
		saveScrollPosition,
	};
}
