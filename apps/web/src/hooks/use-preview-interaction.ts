import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor } from "@/hooks/use-editor";
import { useShiftKey } from "@/hooks/use-shift-key";
import type { TextElement, Transform } from "@/types/timeline";
import { getVisibleElementsWithBounds } from "@/lib/preview/element-bounds";
import { hitTest } from "@/lib/preview/hit-test";
import {
	screenPixelsToLogicalThreshold,
	screenToCanvas,
} from "@/lib/preview/preview-coords";
import { isVisualElement } from "@/lib/timeline/element-utils";
import {
	SNAP_THRESHOLD_SCREEN_PIXELS,
	snapPosition,
	type SnapLine,
} from "@/lib/preview/preview-snap";

const MIN_DRAG_DISTANCE = 0.5;

interface DragState {
	startX: number;
	startY: number;
	bounds: {
		width: number;
		height: number;
	};
	elements: Array<{
		trackId: string;
		elementId: string;
		initialTransform: Transform;
	}>;
}

export function usePreviewInteraction({
	canvasRef,
}: {
	canvasRef: React.RefObject<HTMLCanvasElement | null>;
}) {
	const editor = useEditor();
	const isShiftHeldRef = useShiftKey();
	const [isDragging, setIsDragging] = useState(false);
	const [snapLines, setSnapLines] = useState<SnapLine[]>([]);
	const [editingText, setEditingText] = useState<{
		trackId: string;
		elementId: string;
		element: TextElement;
		originalOpacity: number;
	} | null>(null);
	const dragStateRef = useRef<DragState | null>(null);
	const wasPlayingRef = useRef(editor.playback.getIsPlaying());
	const editingTextRef = useRef(editingText);
	editingTextRef.current = editingText;

	const commitTextEdit = useCallback(() => {
		const current = editingTextRef.current;
		if (!current) return;
		editor.timeline.previewElements({
			updates: [
				{
					trackId: current.trackId,
					elementId: current.elementId,
					updates: { opacity: current.originalOpacity },
				},
			],
		});
		editor.timeline.commitPreview();
		setEditingText(null);
	}, [editor.timeline]);

	const cancelTextEdit = useCallback(() => {
		editor.timeline.discardPreview();
		setEditingText(null);
	}, [editor.timeline]);

	useEffect(() => {
		const unsubscribe = editor.playback.subscribe(() => {
			const isPlaying = editor.playback.getIsPlaying();
			if (isPlaying && !wasPlayingRef.current && editingTextRef.current) {
				commitTextEdit();
			}
			wasPlayingRef.current = isPlaying;
		});
		return unsubscribe;
	}, [editor.playback, commitTextEdit]);

	const handleDoubleClick = useCallback(
		({ clientX, clientY }: React.MouseEvent) => {
			if (!canvasRef.current || editingText) return;

			const tracks = editor.timeline.getTracks();
			const currentTime = editor.playback.getCurrentTime();
			const mediaAssets = editor.media.getAssets();
			const canvasSize = editor.project.getActive().settings.canvasSize;

			const startPos = screenToCanvas({
				clientX,
				clientY,
				canvas: canvasRef.current,
			});

			const elementsWithBounds = getVisibleElementsWithBounds({
				tracks,
				currentTime,
				canvasSize,
				mediaAssets,
			});

			const hit = hitTest({
				canvasX: startPos.x,
				canvasY: startPos.y,
				elementsWithBounds,
			});

			if (!hit || hit.element.type !== "text") return;

			const textElement = hit.element as TextElement;
			editor.timeline.previewElements({
				updates: [
					{
						trackId: hit.trackId,
						elementId: hit.elementId,
						updates: { opacity: 0 },
					},
				],
			});
			setEditingText({
				trackId: hit.trackId,
				elementId: hit.elementId,
				element: textElement,
				originalOpacity: textElement.opacity,
			});
		},
		[canvasRef, editor, editingText],
	);

	const handlePointerDown = useCallback(
		({
			clientX,
			clientY,
			currentTarget,
			pointerId,
			button,
		}: React.PointerEvent) => {
			if (!canvasRef.current) return;
			if (editingText) return;
			if (button !== 0) return;

			const tracks = editor.timeline.getTracks();
			const currentTime = editor.playback.getCurrentTime();
			const mediaAssets = editor.media.getAssets();
			const canvasSize = editor.project.getActive().settings.canvasSize;

			const startPos = screenToCanvas({
				clientX,
				clientY,
				canvas: canvasRef.current,
			});

			const elementsWithBounds = getVisibleElementsWithBounds({
				tracks,
				currentTime,
				canvasSize,
				mediaAssets,
			});

			const hit = hitTest({
				canvasX: startPos.x,
				canvasY: startPos.y,
				elementsWithBounds,
			});

			if (!hit) {
				editor.selection.clearSelection();
				return;
			}

			editor.selection.setSelectedElements({
				elements: [{ trackId: hit.trackId, elementId: hit.elementId }],
			});

			const elementsWithTracks = editor.timeline.getElementsWithTracks({
				elements: [{ trackId: hit.trackId, elementId: hit.elementId }],
			});

			const draggableElements = elementsWithTracks.filter(({ element }) =>
				isVisualElement(element),
			);

			if (draggableElements.length === 0) return;

			dragStateRef.current = {
				startX: startPos.x,
				startY: startPos.y,
				bounds: {
					width: hit.bounds.width,
					height: hit.bounds.height,
				},
				elements: draggableElements.map(({ track, element }) => ({
					trackId: track.id,
					elementId: element.id,
					initialTransform: (element as { transform: Transform }).transform,
				})),
			};

			setIsDragging(true);
			currentTarget.setPointerCapture(pointerId);
		},
		[editor, canvasRef, editingText],
	);

	const handlePointerMove = useCallback(
		({ clientX, clientY }: React.PointerEvent) => {
			if (!dragStateRef.current || !isDragging || !canvasRef.current) return;

			const canvasSize = editor.project.getActive().settings.canvasSize;

			const currentPos = screenToCanvas({
				clientX,
				clientY,
				canvas: canvasRef.current,
			});

			const deltaX = currentPos.x - dragStateRef.current.startX;
			const deltaY = currentPos.y - dragStateRef.current.startY;
			const hasMovement =
				Math.abs(deltaX) > MIN_DRAG_DISTANCE ||
				Math.abs(deltaY) > MIN_DRAG_DISTANCE;
			if (!hasMovement) {
				setSnapLines([]);
				return;
			}

			const firstElement = dragStateRef.current.elements[0];
			const proposedPosition = {
				x: firstElement.initialTransform.position.x + deltaX,
				y: firstElement.initialTransform.position.y + deltaY,
			};

			const shouldSnap = !isShiftHeldRef.current;
			const snapThreshold = screenPixelsToLogicalThreshold({
				canvas: canvasRef.current,
				screenPixels: SNAP_THRESHOLD_SCREEN_PIXELS,
			});
			const { snappedPosition, activeLines } = shouldSnap
				? snapPosition({
						proposedPosition,
						canvasSize,
						elementSize: dragStateRef.current.bounds,
						snapThreshold,
					})
				: {
						snappedPosition: proposedPosition,
						activeLines: [] as SnapLine[],
					};

			setSnapLines(activeLines);

			const deltaSnappedX =
				snappedPosition.x - firstElement.initialTransform.position.x;
			const deltaSnappedY =
				snappedPosition.y - firstElement.initialTransform.position.y;

			const updates = dragStateRef.current.elements.map(
				({ trackId, elementId, initialTransform }) => ({
					trackId,
					elementId,
					updates: {
						transform: {
							...initialTransform,
							position: {
								x: initialTransform.position.x + deltaSnappedX,
								y: initialTransform.position.y + deltaSnappedY,
							},
						},
					},
				}),
			);

			editor.timeline.previewElements({ updates });
		},
		[isDragging, canvasRef, editor, isShiftHeldRef],
	);

	const handlePointerUp = useCallback(
		({ clientX, clientY, currentTarget, pointerId }: React.PointerEvent) => {
			if (!dragStateRef.current || !isDragging || !canvasRef.current) return;

			const currentPos = screenToCanvas({
				clientX,
				clientY,
				canvas: canvasRef.current,
			});

			const deltaX = currentPos.x - dragStateRef.current.startX;
			const deltaY = currentPos.y - dragStateRef.current.startY;

			const hasMovement =
				Math.abs(deltaX) > MIN_DRAG_DISTANCE ||
				Math.abs(deltaY) > MIN_DRAG_DISTANCE;

			if (!hasMovement) {
				editor.timeline.discardPreview();
			} else {
				editor.timeline.commitPreview();
			}

			dragStateRef.current = null;
			setIsDragging(false);
			setSnapLines([]);
			currentTarget.releasePointerCapture(pointerId);
		},
		[isDragging, canvasRef, editor],
	);

	return {
		onPointerDown: handlePointerDown,
		onPointerMove: handlePointerMove,
		onPointerUp: handlePointerUp,
		onDoubleClick: handleDoubleClick,
		snapLines,
		editingText,
		commitTextEdit,
		cancelTextEdit,
	};
}
