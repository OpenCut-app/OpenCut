import {
	useState,
	useCallback,
	useEffect,
	useRef,
	type RefObject,
} from "react";
import { useEditor } from "@/hooks/use-editor";
import { useShiftKey } from "@/hooks/use-shift-key";
import { DRAG_THRESHOLD_PX } from "@/constants/timeline-constants";
import { snapTimeToFrame } from "@/lib/time";
import { getMouseTimeFromClientX } from "@/lib/timeline/drag-utils";
import {
	findSnapPoints,
	snapToNearestPoint,
	type SnapPoint,
} from "@/lib/timeline/snap-utils";
import type { Bookmark } from "@/types/timeline";

export interface BookmarkDragState {
	isDragging: boolean;
	bookmarkTime: number | null;
	currentTime: number;
}

interface PendingBookmarkDrag {
	bookmarkTime: number;
	startMouseX: number;
	startMouseY: number;
}

interface UseBookmarkDragProps {
	zoomLevel: number;
	scrollRef: RefObject<HTMLElement | null>;
	snappingEnabled: boolean;
	onSnapPointChange?: (snapPoint: SnapPoint | null) => void;
}

export function useBookmarkDrag({
	zoomLevel,
	scrollRef,
	snappingEnabled,
	onSnapPointChange,
}: UseBookmarkDragProps) {
	const editor = useEditor();
	const isShiftHeldRef = useShiftKey();
	const tracks = editor.timeline.getTracks();
	const activeScene = editor.scenes.getActiveScene();
	const bookmarks = activeScene?.bookmarks ?? [];
	const playheadTime = editor.playback.getCurrentTime();
	const duration = editor.timeline.getTotalDuration();

	const [dragState, setDragState] = useState<BookmarkDragState>({
		isDragging: false,
		bookmarkTime: null,
		currentTime: 0,
	});
	const [isPendingDrag, setIsPendingDrag] = useState(false);
	const pendingDragRef = useRef<PendingBookmarkDrag | null>(null);
	const lastMouseXRef = useRef(0);

	const startDrag = useCallback(
		({
			bookmarkTime,
			initialCurrentTime,
		}: {
			bookmarkTime: number;
			initialCurrentTime: number;
		}) => {
			setDragState({
				isDragging: true,
				bookmarkTime,
				currentTime: initialCurrentTime,
			});
		},
		[],
	);

	const endDrag = useCallback(() => {
		setDragState({
			isDragging: false,
			bookmarkTime: null,
			currentTime: 0,
		});
	}, []);

	const getSnapResult = useCallback(
		({
			rawTime,
			excludeBookmarkTime,
		}: {
			rawTime: number;
			excludeBookmarkTime: number;
		}): { snappedTime: number; snapPoint: SnapPoint | null } => {
			const shouldSnap = snappingEnabled && !isShiftHeldRef.current;
			if (!shouldSnap) {
				return { snappedTime: rawTime, snapPoint: null };
			}

			const snapPoints = findSnapPoints({
				tracks,
				playheadTime,
				bookmarks,
				excludeBookmarkTime,
			});
			const result = snapToNearestPoint({
				targetTime: rawTime,
				snapPoints,
				zoomLevel,
			});
			return {
				snappedTime: result.snappedTime,
				snapPoint: result.snapPoint,
			};
		},
		[snappingEnabled, tracks, playheadTime, bookmarks, zoomLevel, isShiftHeldRef],
	);

	useEffect(() => {
		if (!dragState.isDragging && !isPendingDrag) return;

		const handleMouseMove = (event: MouseEvent) => {
			lastMouseXRef.current = event.clientX;

			const scrollContainer = scrollRef.current;
			if (!scrollContainer) return;

			if (isPendingDrag && pendingDragRef.current) {
				const { startMouseX, startMouseY, bookmarkTime } =
					pendingDragRef.current;
				const deltaX = Math.abs(event.clientX - startMouseX);
				const deltaY = Math.abs(event.clientY - startMouseY);

				if (deltaX <= DRAG_THRESHOLD_PX && deltaY <= DRAG_THRESHOLD_PX) {
					return;
				}

				const activeProject = editor.project.getActive();
				if (!activeProject) return;

				const scrollLeft = scrollContainer.scrollLeft;
				const mouseTime = getMouseTimeFromClientX({
					clientX: event.clientX,
					containerRect: scrollContainer.getBoundingClientRect(),
					zoomLevel,
					scrollLeft,
				});
				const frameSnappedTime = snapTimeToFrame({
					time: Math.max(0, Math.min(mouseTime, duration)),
					fps: activeProject.settings.fps,
				});
				const { snappedTime: initialTime } = getSnapResult({
					rawTime: frameSnappedTime,
					excludeBookmarkTime: bookmarkTime,
				});

				startDrag({
					bookmarkTime,
					initialCurrentTime: initialTime,
				});
				pendingDragRef.current = null;
				setIsPendingDrag(false);
				return;
			}

			if (!dragState.isDragging || dragState.bookmarkTime === null) return;

			const activeProject = editor.project.getActive();
			if (!activeProject) return;

			const scrollLeft = scrollContainer.scrollLeft;
			const mouseTime = getMouseTimeFromClientX({
				clientX: event.clientX,
				containerRect: scrollContainer.getBoundingClientRect(),
				zoomLevel,
				scrollLeft,
			});
			const clampedTime = Math.max(0, Math.min(mouseTime, duration));
			const frameSnappedTime = snapTimeToFrame({
				time: clampedTime,
				fps: activeProject.settings.fps,
			});
			const snapResult = getSnapResult({
				rawTime: frameSnappedTime,
				excludeBookmarkTime: dragState.bookmarkTime,
			});

			setDragState((previousDragState) => ({
				...previousDragState,
				currentTime: snapResult.snappedTime,
			}));
			onSnapPointChange?.(snapResult.snapPoint);
		};

		document.addEventListener("mousemove", handleMouseMove);
		return () => document.removeEventListener("mousemove", handleMouseMove);
	}, [
		dragState.isDragging,
		dragState.bookmarkTime,
		zoomLevel,
		duration,
		editor.project,
		scrollRef,
		isPendingDrag,
		startDrag,
		getSnapResult,
		onSnapPointChange,
	]);

	useEffect(() => {
		if (!dragState.isDragging) return;

		const handleMouseUp = () => {
			if (dragState.bookmarkTime === null) {
				endDrag();
				onSnapPointChange?.(null);
				return;
			}

			const clampedTime = Math.max(
				0,
				Math.min(dragState.currentTime, duration),
			);

			editor.scenes.moveBookmark({
				fromTime: dragState.bookmarkTime,
				toTime: clampedTime,
			});

			endDrag();
			onSnapPointChange?.(null);
		};

		document.addEventListener("mouseup", handleMouseUp);
		return () => document.removeEventListener("mouseup", handleMouseUp);
	}, [
		dragState.isDragging,
		dragState.bookmarkTime,
		dragState.currentTime,
		duration,
		endDrag,
		onSnapPointChange,
		editor.scenes,
	]);

	useEffect(() => {
		if (!isPendingDrag) return;

		const handleMouseUp = () => {
			pendingDragRef.current = null;
			setIsPendingDrag(false);
			onSnapPointChange?.(null);
		};

		document.addEventListener("mouseup", handleMouseUp);
		return () => document.removeEventListener("mouseup", handleMouseUp);
	}, [isPendingDrag, onSnapPointChange]);

	const handleBookmarkMouseDown = useCallback(
		({ event, bookmark }: { event: React.MouseEvent; bookmark: Bookmark }) => {
			if (event.button !== 0) return;

			event.preventDefault();
			event.stopPropagation();

			pendingDragRef.current = {
				bookmarkTime: bookmark.time,
				startMouseX: event.clientX,
				startMouseY: event.clientY,
			};
			setIsPendingDrag(true);
		},
		[],
	);

	return {
		dragState,
		handleBookmarkMouseDown,
		lastMouseXRef,
	};
}
