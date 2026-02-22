"use client";

import { useTransformHandles } from "@/hooks/use-transform-handles";
import { useEditor } from "@/hooks/use-editor";
import { isVisualElement } from "@/lib/timeline/element-utils";
import { SnapGuides } from "./snap-guides";
import { canvasToOverlay, getDisplayScale } from "@/lib/preview/preview-coords";
import type { ElementBounds } from "@/lib/preview/element-bounds";
import { cn } from "@/utils/ui";
import { HugeiconsIcon } from "@hugeicons/react";
import { Rotate01Icon } from "@hugeicons/core-free-icons";

const HANDLE_SIZE = 10;
const ROTATION_HANDLE_OFFSET = 24;
const ROTATION_HANDLE_RADIUS = 10;
const CORNER_HIT_AREA_SIZE = 18;

type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";
const CORNERS: Corner[] = [
	"top-left",
	"top-right",
	"bottom-left",
	"bottom-right",
];

function getCornerPosition({
	bounds,
	corner,
}: {
	bounds: ElementBounds;
	corner: Corner;
}): { x: number; y: number } {
	const halfW = bounds.width / 2;
	const halfH = bounds.height / 2;
	const angleRad = (bounds.rotation * Math.PI) / 180;
	const cos = Math.cos(angleRad);
	const sin = Math.sin(angleRad);

	const localX =
		corner === "top-left" || corner === "bottom-left" ? -halfW : halfW;
	const localY =
		corner === "top-left" || corner === "top-right" ? -halfH : halfH;

	return {
		x: bounds.cx + (localX * cos - localY * sin),
		y: bounds.cy + (localX * sin + localY * cos),
	};
}

function getRotationHandlePosition({ bounds }: { bounds: ElementBounds }): {
	x: number;
	y: number;
} {
	const angleRad = (bounds.rotation * Math.PI) / 180;
	const cos = Math.cos(angleRad);
	const sin = Math.sin(angleRad);
	const localY = -bounds.height / 2 - ROTATION_HANDLE_OFFSET;
	return {
		x: bounds.cx - localY * sin,
		y: bounds.cy + localY * cos,
	};
}

function getOverlayContext({
	canvasRef,
	containerRef,
}: {
	canvasRef: React.RefObject<HTMLCanvasElement | null>;
	containerRef: React.RefObject<HTMLDivElement | null>;
}): {
	canvasRect: DOMRect;
	containerRect: DOMRect;
} | null {
	const canvasRect = canvasRef.current?.getBoundingClientRect();
	const containerRect = containerRef.current?.getBoundingClientRect();
	if (!canvasRect || !containerRect) return null;
	return { canvasRect, containerRect };
}

export function TransformHandles({
	canvasRef,
	containerRef,
}: {
	canvasRef: React.RefObject<HTMLCanvasElement | null>;
	containerRef: React.RefObject<HTMLDivElement | null>;
}) {
	const {
		selectedWithBounds,
		hasVisualSelection,
		snapLines,
		handleCornerPointerDown,
		handleRotationPointerDown,
		handlePointerMove,
		handlePointerUp,
	} = useTransformHandles({ canvasRef });

	const editor = useEditor();
	const canvasSize = editor.project.getActive().settings.canvasSize;

	if (!hasVisualSelection || !selectedWithBounds) return null;

	const overlayContext = getOverlayContext({ canvasRef, containerRef });
	if (!overlayContext) return null;

	const { bounds, element } = selectedWithBounds;
	if (!isVisualElement(element)) return null;

	const { canvasRect, containerRect } = overlayContext;
	const displayScale = getDisplayScale({ canvasRect, canvasSize });

	const toOverlay = ({
		canvasX,
		canvasY,
	}: {
		canvasX: number;
		canvasY: number;
	}) =>
		canvasToOverlay({
			canvasX,
			canvasY,
			canvasRect,
			containerRect,
			canvasSize,
		});

	const center = toOverlay({ canvasX: bounds.cx, canvasY: bounds.cy });
	const outlineWidth = bounds.width * displayScale.x;
	const outlineHeight = bounds.height * displayScale.y;

	const rotationHandle = getRotationHandlePosition({ bounds });
	const rotationHandleScreen = toOverlay({
		canvasX: rotationHandle.x,
		canvasY: rotationHandle.y,
	});

	return (
		<div className="pointer-events-none absolute inset-0" aria-hidden>
			<SnapGuides
				lines={snapLines}
				canvasRef={canvasRef}
				containerRef={containerRef}
			/>
			<BoundingBoxOutline
				center={center}
				outlineWidth={outlineWidth}
				outlineHeight={outlineHeight}
				rotation={bounds.rotation}
			/>
			{CORNERS.map((corner) => {
				const cornerPosition = getCornerPosition({ bounds, corner });
				const screen = toOverlay({
					canvasX: cornerPosition.x,
					canvasY: cornerPosition.y,
				});
				return (
					<CornerHandle
						key={corner}
						corner={corner}
						screen={screen}
						onPointerDown={(event) =>
							handleCornerPointerDown({ event, corner })
						}
						onPointerMove={(event) => handlePointerMove({ event })}
						onPointerUp={(event) => handlePointerUp({ event })}
					/>
				);
			})}
			<RotationHandle
				screen={rotationHandleScreen}
				onPointerDown={(event) => handleRotationPointerDown({ event })}
				onPointerMove={(event) => handlePointerMove({ event })}
				onPointerUp={(event) => handlePointerUp({ event })}
			/>
		</div>
	);
}

function BoundingBoxOutline({
	center,
	outlineWidth,
	outlineHeight,
	rotation,
}: {
	center: { x: number; y: number };
	outlineWidth: number;
	outlineHeight: number;
	rotation: number;
}) {
	return (
		<div
			className="pointer-events-none absolute"
			style={{
				left: center.x - outlineWidth / 2,
				top: center.y - outlineHeight / 2,
				width: outlineWidth,
				height: outlineHeight,
				transform: `rotate(${rotation}deg)`,
				transformOrigin: "center center",
				border: "1px solid white",
				boxSizing: "border-box",
				opacity: 0.75,
			}}
		/>
	);
}

function CornerHandle({
	corner,
	screen,
	onPointerDown,
	onPointerMove,
	onPointerUp,
}: {
	corner: Corner;
	screen: { x: number; y: number };
	onPointerDown: (event: React.PointerEvent) => void;
	onPointerMove: (event: React.PointerEvent) => void;
	onPointerUp: (event: React.PointerEvent) => void;
}) {
	const isNesw = corner === "top-right" || corner === "bottom-left";

	return (
		<button
			type="button"
			className={cn(
				"absolute flex items-center justify-center outline-none",
				isNesw ? "cursor-nesw-resize" : "cursor-nwse-resize",
			)}
			style={{
				left: screen.x - CORNER_HIT_AREA_SIZE / 2,
				top: screen.y - CORNER_HIT_AREA_SIZE / 2,
				width: CORNER_HIT_AREA_SIZE,
				height: CORNER_HIT_AREA_SIZE,
				pointerEvents: "auto",
			}}
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={onPointerUp}
			onPointerLeave={onPointerUp}
			onKeyDown={(event) => event.key === "Enter" && event.preventDefault()}
			onKeyUp={(event) => event.key === "Enter" && event.preventDefault()}
		>
			<div
				className="rounded-sm bg-white"
				style={{ width: HANDLE_SIZE, height: HANDLE_SIZE }}
			/>
		</button>
	);
}

function RotationHandle({
	screen,
	onPointerDown,
	onPointerMove,
	onPointerUp,
}: {
	screen: { x: number; y: number };
	onPointerDown: (event: React.PointerEvent) => void;
	onPointerMove: (event: React.PointerEvent) => void;
	onPointerUp: (event: React.PointerEvent) => void;
}) {
	return (
		<button
			type="button"
			className="absolute flex items-center justify-center rounded-full bg-white text-black shadow-sm outline-none"
			style={{
				left: screen.x - ROTATION_HANDLE_RADIUS,
				top: screen.y - ROTATION_HANDLE_RADIUS,
				width: ROTATION_HANDLE_RADIUS * 2,
				height: ROTATION_HANDLE_RADIUS * 2,
				pointerEvents: "auto",
			}}
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={onPointerUp}
			onPointerLeave={onPointerUp}
			onKeyDown={(event) => event.key === "Enter" && event.preventDefault()}
			onKeyUp={(event) => event.key === "Enter" && event.preventDefault()}
		>
			<HugeiconsIcon icon={Rotate01Icon} className="size-3" strokeWidth={2.5} />
		</button>
	);
}
