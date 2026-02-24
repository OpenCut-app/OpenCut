import { useCallback, useRef, useState } from "react";
import { useEditor } from "@/hooks/use-editor";
import { useShiftKey } from "@/hooks/use-shift-key";
import { useSyncExternalStore } from "react";
import {
	getVisibleElementsWithBounds,
	type ElementWithBounds,
} from "@/lib/preview/element-bounds";
import {
	screenPixelsToLogicalThreshold,
	screenToCanvas,
} from "@/lib/preview/preview-coords";
import {
	MIN_SCALE,
	SNAP_THRESHOLD_SCREEN_PIXELS,
	snapRotation,
	snapScale,
	type SnapLine,
} from "@/lib/preview/preview-snap";
import { isVisualElement } from "@/lib/timeline/element-utils";
import type { Transform } from "@/types/timeline";

type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";
type HandleType = Corner | "rotation";

interface ScaleState {
	trackId: string;
	elementId: string;
	initialTransform: Transform;
	initialDistance: number;
	initialBoundsCx: number;
	initialBoundsCy: number;
	baseWidth: number;
	baseHeight: number;
}

interface RotationState {
	trackId: string;
	elementId: string;
	initialTransform: Transform;
	initialAngle: number;
	initialBoundsCx: number;
	initialBoundsCy: number;
}

function areSnapLinesEqual({
	previousLines,
	nextLines,
}: {
	previousLines: SnapLine[];
	nextLines: SnapLine[];
}): boolean {
	if (previousLines.length !== nextLines.length) {
		return false;
	}
	for (const [index, line] of previousLines.entries()) {
		const nextLine = nextLines[index];
		if (!nextLine) {
			return false;
		}
		if (line.type !== nextLine.type || line.position !== nextLine.position) {
			return false;
		}
	}
	return true;
}

function getCornerDistance({
	bounds,
	corner,
}: {
	bounds: {
		cx: number;
		cy: number;
		width: number;
		height: number;
		rotation: number;
	};
	corner: Corner;
}): number {
	const halfW = bounds.width / 2;
	const halfH = bounds.height / 2;
	const angleRad = (bounds.rotation * Math.PI) / 180;
	const cos = Math.cos(angleRad);
	const sin = Math.sin(angleRad);

	const localX =
		corner === "top-left" || corner === "bottom-left" ? -halfW : halfW;
	const localY =
		corner === "top-left" || corner === "top-right" ? -halfH : halfH;

	const rotatedX = localX * cos - localY * sin;
	const rotatedY = localX * sin + localY * cos;
	return Math.sqrt(rotatedX * rotatedX + rotatedY * rotatedY) || 1;
}

export function useTransformHandles({
	canvasRef,
}: {
	canvasRef: React.RefObject<HTMLCanvasElement | null>;
}) {
	const editor = useEditor();
	const isShiftHeldRef = useShiftKey();
	const [activeHandle, setActiveHandle] = useState<HandleType | null>(null);
	const [snapLines, setSnapLines] = useState<SnapLine[]>([]);
	const snapLinesRef = useRef<SnapLine[]>([]);
	const scaleStateRef = useRef<ScaleState | null>(null);
	const rotationStateRef = useRef<RotationState | null>(null);

	const selectedElements = useSyncExternalStore(
		(listener) => editor.selection.subscribe(listener),
		() => editor.selection.getSelectedElements(),
	);

	const tracks = editor.timeline.getTracks();
	const currentTime = editor.playback.getCurrentTime();
	const mediaAssets = editor.media.getAssets();
	const canvasSize = editor.project.getActive().settings.canvasSize;

	const elementsWithBounds = getVisibleElementsWithBounds({
		tracks,
		currentTime,
		canvasSize,
		mediaAssets,
	});

	const selectedWithBounds: ElementWithBounds | null =
		selectedElements.length === 1
			? (elementsWithBounds.find(
					(entry) =>
						entry.trackId === selectedElements[0].trackId &&
						entry.elementId === selectedElements[0].elementId,
				) ?? null)
			: null;

	const hasVisualSelection =
		selectedWithBounds !== null && isVisualElement(selectedWithBounds.element);

	const handleCornerPointerDown = useCallback(
		({ event, corner }: { event: React.PointerEvent; corner: Corner }) => {
			if (!selectedWithBounds) return;
			event.stopPropagation();

			const { bounds, trackId, elementId, element } = selectedWithBounds;
			if (!isVisualElement(element)) return;

			const initialDistance = getCornerDistance({ bounds, corner });
			const baseWidth = bounds.width / element.transform.scale;
			const baseHeight = bounds.height / element.transform.scale;

			scaleStateRef.current = {
				trackId,
				elementId,
				initialTransform: element.transform,
				initialDistance,
				initialBoundsCx: bounds.cx,
				initialBoundsCy: bounds.cy,
				baseWidth,
				baseHeight,
			};
			setActiveHandle(corner);
			(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		},
		[selectedWithBounds],
	);

	const handleRotationPointerDown = useCallback(
		({ event }: { event: React.PointerEvent }) => {
			if (!selectedWithBounds || !canvasRef.current) return;
			event.stopPropagation();

			const { bounds, trackId, elementId, element } = selectedWithBounds;
			if (!isVisualElement(element)) return;

			const position = screenToCanvas({
				clientX: event.clientX,
				clientY: event.clientY,
				canvas: canvasRef.current,
			});
			const dx = position.x - bounds.cx;
			const dy = position.y - bounds.cy;
			const initialAngle = (Math.atan2(dy, dx) * 180) / Math.PI;

			rotationStateRef.current = {
				trackId,
				elementId,
				initialTransform: element.transform,
				initialAngle,
				initialBoundsCx: bounds.cx,
				initialBoundsCy: bounds.cy,
			};
			setActiveHandle("rotation");
			(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		},
		[selectedWithBounds, canvasRef],
	);

	const handlePointerMove = useCallback(
		({ event }: { event: React.PointerEvent }) => {
			if (!canvasRef.current) return;
			if (!scaleStateRef.current && !rotationStateRef.current) return;

			const position = screenToCanvas({
				clientX: event.clientX,
				clientY: event.clientY,
				canvas: canvasRef.current,
			});

			if (
				scaleStateRef.current &&
				activeHandle &&
				activeHandle !== "rotation"
			) {
				const {
					trackId,
					elementId,
					initialTransform,
					initialDistance,
					initialBoundsCx,
					initialBoundsCy,
					baseWidth,
					baseHeight,
				} = scaleStateRef.current;

				const dx = position.x - initialBoundsCx;
				const dy = position.y - initialBoundsCy;
				const currentDistance = Math.sqrt(dx * dx + dy * dy) || 1;
				const scaleFactor = currentDistance / initialDistance;
				const proposedScale = Math.max(
					MIN_SCALE,
					initialTransform.scale * scaleFactor,
				);

				const canvasSize = editor.project.getActive().settings.canvasSize;
				const snapThreshold = screenPixelsToLogicalThreshold({
					canvas: canvasRef.current,
					screenPixels: SNAP_THRESHOLD_SCREEN_PIXELS,
				});
				const shouldSnap = !isShiftHeldRef.current;
				const { snappedScale, activeLines } = shouldSnap
					? snapScale({
							proposedScale,
							position: initialTransform.position,
							baseWidth,
							baseHeight,
							canvasSize,
							snapThreshold,
						})
					: { snappedScale: proposedScale, activeLines: [] as SnapLine[] };

				const isSameLines = areSnapLinesEqual({
					previousLines: snapLinesRef.current,
					nextLines: activeLines,
				});

				if (!isSameLines) {
					snapLinesRef.current = activeLines;
					setSnapLines(activeLines);
				}

				editor.timeline.previewElements({
					updates: [
						{
							trackId,
							elementId,
							updates: {
								transform: { ...initialTransform, scale: snappedScale },
							},
						},
					],
				});
				return;
			}

			if (rotationStateRef.current && activeHandle === "rotation") {
				const {
					trackId,
					elementId,
					initialTransform,
					initialAngle,
					initialBoundsCx,
					initialBoundsCy,
				} = rotationStateRef.current;

				const dx = position.x - initialBoundsCx;
				const dy = position.y - initialBoundsCy;
				const currentAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
				let deltaAngle = currentAngle - initialAngle;
				if (deltaAngle > 180) deltaAngle -= 360;
				if (deltaAngle < -180) deltaAngle += 360;
				const newRotate = initialTransform.rotate + deltaAngle;
				const shouldSnapRotation = !isShiftHeldRef.current;
				const { snappedRotation } = shouldSnapRotation
					? snapRotation({ proposedRotation: newRotate })
					: { snappedRotation: newRotate };

				editor.timeline.previewElements({
					updates: [
						{
							trackId,
							elementId,
							updates: {
								transform: { ...initialTransform, rotate: snappedRotation },
							},
						},
					],
				});
			}
		},
		[activeHandle, canvasRef, editor, isShiftHeldRef],
	);

	const handlePointerUp = useCallback(
		({ event }: { event: React.PointerEvent }) => {
			if (scaleStateRef.current || rotationStateRef.current) {
				editor.timeline.commitPreview();
				scaleStateRef.current = null;
				rotationStateRef.current = null;
				setActiveHandle(null);
				snapLinesRef.current = [];
				setSnapLines([]);
			}
			(event.currentTarget as HTMLElement).releasePointerCapture(
				event.pointerId,
			);
		},
		[editor],
	);

	return {
		selectedWithBounds,
		hasVisualSelection,
		activeHandle,
		snapLines,
		handleCornerPointerDown,
		handleRotationPointerDown,
		handlePointerMove,
		handlePointerUp,
	};
}
