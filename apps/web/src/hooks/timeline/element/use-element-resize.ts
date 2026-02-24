import { useState, useEffect, useRef, useCallback } from "react";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import { snapTimeToFrame } from "@/lib/time";
import type { TimelineElement, TimelineTrack } from "@/types/timeline";
import { useEditor } from "@/hooks/use-editor";
import { useShiftKey } from "@/hooks/use-shift-key";
import {
	findSnapPoints,
	snapToNearestPoint,
	type SnapPoint,
} from "@/lib/timeline/snap-utils";
import { useTimelineStore } from "@/stores/timeline-store";

export interface ResizeState {
	elementId: string;
	side: "left" | "right";
	startX: number;
	initialTrimStart: number;
	initialTrimEnd: number;
	initialStartTime: number;
	initialDuration: number;
}

interface UseTimelineElementResizeProps {
	element: TimelineElement;
	track: TimelineTrack;
	zoomLevel: number;
	onSnapPointChange?: (snapPoint: SnapPoint | null) => void;
	onResizeStateChange?: (params: { isResizing: boolean }) => void;
}

export function useTimelineElementResize({
	element,
	track,
	zoomLevel,
	onSnapPointChange,
	onResizeStateChange,
}: UseTimelineElementResizeProps) {
	const editor = useEditor();
	const activeProject = editor.project.getActive();
	const isShiftHeldRef = useShiftKey();
	const snappingEnabled = useTimelineStore((state) => state.snappingEnabled);


	const [resizing, setResizing] = useState<ResizeState | null>(null);
	const [currentTrimStart, setCurrentTrimStart] = useState(element.trimStart);
	const [currentTrimEnd, setCurrentTrimEnd] = useState(element.trimEnd);
	const [currentStartTime, setCurrentStartTime] = useState(element.startTime);
	const [currentDuration, setCurrentDuration] = useState(element.duration);
	const currentTrimStartRef = useRef(element.trimStart);
	const currentTrimEndRef = useRef(element.trimEnd);
	const currentStartTimeRef = useRef(element.startTime);
	const currentDurationRef = useRef(element.duration);

	const handleResizeStart = ({
		event,
		elementId,
		side,
	}: {
		event: React.MouseEvent;
		elementId: string;
		side: "left" | "right";
	}) => {
		event.stopPropagation();
		event.preventDefault();

		setResizing({
			elementId,
			side,
			startX: event.clientX,
			initialTrimStart: element.trimStart,
			initialTrimEnd: element.trimEnd,
			initialStartTime: element.startTime,
			initialDuration: element.duration,
		});

		setCurrentTrimStart(element.trimStart);
		setCurrentTrimEnd(element.trimEnd);
		setCurrentStartTime(element.startTime);
		setCurrentDuration(element.duration);
		currentTrimStartRef.current = element.trimStart;
		currentTrimEndRef.current = element.trimEnd;
		currentStartTimeRef.current = element.startTime;
		currentDurationRef.current = element.duration;
		onResizeStateChange?.({ isResizing: true });
	};

	const canExtendElementDuration = useCallback(() => {
		if (element.type === "text" || element.type === "image") {
			return true;
		}

		return false;
	}, [element.type]);

	const updateTrimFromMouseMove = useCallback(
		({ clientX }: { clientX: number }) => {
			if (!resizing) return;

			const deltaX = clientX - resizing.startX;
			let deltaTime =
				deltaX / (TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel);
			let resizeSnapPoint: SnapPoint | null = null;

			const projectFps = activeProject.settings.fps;
			const minDurationSeconds = 1 / projectFps;
			const shouldSnap = snappingEnabled && !isShiftHeldRef.current;
			if (shouldSnap) {
				const tracks = editor.timeline.getTracks();
				const playheadTime = editor.playback.getCurrentTime();
				const snapPoints = findSnapPoints({
					tracks,
					playheadTime,
					excludeElementId: element.id,
				});
				if (resizing.side === "left") {
					const targetStartTime = resizing.initialStartTime + deltaTime;
					const snapResult = snapToNearestPoint({
						targetTime: targetStartTime,
						snapPoints,
						zoomLevel,
					});
					resizeSnapPoint = snapResult.snapPoint;
					if (snapResult.snapPoint) {
						deltaTime = snapResult.snappedTime - resizing.initialStartTime;
					}
				} else {
					const baseEndTime =
						resizing.initialStartTime + resizing.initialDuration;
					const targetEndTime = baseEndTime + deltaTime;
					const snapResult = snapToNearestPoint({
						targetTime: targetEndTime,
						snapPoints,
						zoomLevel,
					});
					resizeSnapPoint = snapResult.snapPoint;
					if (snapResult.snapPoint) {
						deltaTime = snapResult.snappedTime - baseEndTime;
					}
				}
			}
			onSnapPointChange?.(resizeSnapPoint);

			if (resizing.side === "left") {
				const sourceDuration =
					resizing.initialTrimStart +
					resizing.initialDuration +
					resizing.initialTrimEnd;
				const maxAllowed =
					sourceDuration - resizing.initialTrimEnd - minDurationSeconds;
				const calculated = resizing.initialTrimStart + deltaTime;

				if (calculated >= 0 && calculated <= maxAllowed) {
					const newTrimStart = snapTimeToFrame({
						time: Math.min(maxAllowed, calculated),
						fps: projectFps,
					});
					const trimDelta = newTrimStart - resizing.initialTrimStart;
					const newStartTime = snapTimeToFrame({
						time: resizing.initialStartTime + trimDelta,
						fps: projectFps,
					});
					const newDuration = snapTimeToFrame({
						time: resizing.initialDuration - trimDelta,
						fps: projectFps,
					});

					setCurrentTrimStart(newTrimStart);
					setCurrentStartTime(newStartTime);
					setCurrentDuration(newDuration);
					currentTrimStartRef.current = newTrimStart;
					currentStartTimeRef.current = newStartTime;
					currentDurationRef.current = newDuration;
				} else if (calculated < 0) {
					if (canExtendElementDuration()) {
						const extensionAmount = Math.abs(calculated);
						const maxExtension = resizing.initialStartTime;
						const actualExtension = Math.min(extensionAmount, maxExtension);
						const newStartTime = snapTimeToFrame({
							time: resizing.initialStartTime - actualExtension,
							fps: projectFps,
						});
						const newDuration = snapTimeToFrame({
							time: resizing.initialDuration + actualExtension,
							fps: projectFps,
						});

						setCurrentTrimStart(0);
						setCurrentStartTime(newStartTime);
						setCurrentDuration(newDuration);
						currentTrimStartRef.current = 0;
						currentStartTimeRef.current = newStartTime;
						currentDurationRef.current = newDuration;
					} else {
						const trimDelta = 0 - resizing.initialTrimStart;
						const newStartTime = snapTimeToFrame({
							time: resizing.initialStartTime + trimDelta,
							fps: projectFps,
						});
						const newDuration = snapTimeToFrame({
							time: resizing.initialDuration - trimDelta,
							fps: projectFps,
						});

						setCurrentTrimStart(0);
						setCurrentStartTime(newStartTime);
						setCurrentDuration(newDuration);
						currentTrimStartRef.current = 0;
						currentStartTimeRef.current = newStartTime;
						currentDurationRef.current = newDuration;
					}
				}
			} else {
				const sourceDuration =
					resizing.initialTrimStart +
					resizing.initialDuration +
					resizing.initialTrimEnd;
				const newTrimEnd = resizing.initialTrimEnd - deltaTime;

				if (newTrimEnd < 0) {
					if (canExtendElementDuration()) {
						const extensionNeeded = Math.abs(newTrimEnd);
						const baseDuration =
							resizing.initialDuration + resizing.initialTrimEnd;
						const newDuration = snapTimeToFrame({
							time: baseDuration + extensionNeeded,
							fps: projectFps,
						});

						setCurrentDuration(newDuration);
						setCurrentTrimEnd(0);
						currentDurationRef.current = newDuration;
						currentTrimEndRef.current = 0;
					} else {
						const extensionToLimit = resizing.initialTrimEnd;
						const newDuration = snapTimeToFrame({
							time: resizing.initialDuration + extensionToLimit,
							fps: projectFps,
						});

						setCurrentDuration(newDuration);
						setCurrentTrimEnd(0);
						currentDurationRef.current = newDuration;
						currentTrimEndRef.current = 0;
					}
				} else {
					const maxTrimEnd =
						sourceDuration - resizing.initialTrimStart - minDurationSeconds;
					const clampedTrimEnd = Math.min(maxTrimEnd, Math.max(0, newTrimEnd));
					const finalTrimEnd = snapTimeToFrame({
						time: clampedTrimEnd,
						fps: projectFps,
					});
					const trimDelta = finalTrimEnd - resizing.initialTrimEnd;
					const newDuration = snapTimeToFrame({
						time: resizing.initialDuration - trimDelta,
						fps: projectFps,
					});

					setCurrentTrimEnd(finalTrimEnd);
					setCurrentDuration(newDuration);
					currentTrimEndRef.current = finalTrimEnd;
					currentDurationRef.current = newDuration;
				}
			}
		},
		[
			resizing,
			zoomLevel,
			activeProject.settings.fps,
			snappingEnabled,
			editor,
			element.id,
			onSnapPointChange,
			canExtendElementDuration,
			isShiftHeldRef,
		],
	);

	const handleResizeEnd = useCallback(() => {
		if (!resizing) return;

		const finalTrimStart = currentTrimStartRef.current;
		const finalTrimEnd = currentTrimEndRef.current;
		const finalStartTime = currentStartTimeRef.current;
		const finalDuration = currentDurationRef.current;
		const trimStartChanged = finalTrimStart !== resizing.initialTrimStart;
		const trimEndChanged = finalTrimEnd !== resizing.initialTrimEnd;
		const startTimeChanged = finalStartTime !== resizing.initialStartTime;
		const durationChanged = finalDuration !== resizing.initialDuration;

		if (trimStartChanged || trimEndChanged) {
			editor.timeline.updateElementTrim({
				elementId: element.id,
				trimStart: finalTrimStart,
				trimEnd: finalTrimEnd,
			});
		}

		if (startTimeChanged) {
			editor.timeline.updateElementStartTime({
				elements: [{ trackId: track.id, elementId: element.id }],
				startTime: finalStartTime,
			});
		}

		if (durationChanged) {
			editor.timeline.updateElementDuration({
				trackId: track.id,
				elementId: element.id,
				duration: finalDuration,
			});
		}

		setResizing(null);
		onResizeStateChange?.({ isResizing: false });
		onSnapPointChange?.(null);
	}, [
		resizing,
		editor.timeline,
		element.id,
		track.id,
		onResizeStateChange,
		onSnapPointChange,
	]);

	useEffect(() => {
		if (!resizing) return;

		const handleDocumentMouseMove = ({ clientX }: MouseEvent) => {
			updateTrimFromMouseMove({ clientX });
		};

		const handleDocumentMouseUp = () => {
			handleResizeEnd();
		};

		document.addEventListener("mousemove", handleDocumentMouseMove);
		document.addEventListener("mouseup", handleDocumentMouseUp);

		return () => {
			document.removeEventListener("mousemove", handleDocumentMouseMove);
			document.removeEventListener("mouseup", handleDocumentMouseUp);
		};
	}, [resizing, handleResizeEnd, updateTrimFromMouseMove]);

	return {
		resizing,
		isResizing: resizing !== null,
		handleResizeStart,
		currentTrimStart,
		currentTrimEnd,
		currentStartTime,
		currentDuration,
	};
}
