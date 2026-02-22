"use client";

import { useEditor } from "@/hooks/use-editor";
import type { SnapLine } from "@/lib/preview/preview-snap";
import { positionToOverlay } from "@/lib/preview/preview-coords";

export function SnapGuides({
	lines,
	canvasRef,
	containerRef,
}: {
	lines: SnapLine[];
	canvasRef: React.RefObject<HTMLCanvasElement | null>;
	containerRef: React.RefObject<HTMLDivElement | null>;
}) {
	const editor = useEditor();
	const canvasSize = editor.project.getActive().settings.canvasSize;
	const canvasRect = canvasRef.current?.getBoundingClientRect();
	const containerRect = containerRef.current?.getBoundingClientRect();

	if (!canvasRect || !containerRect || lines.length === 0) {
		return null;
	}

	const toOverlayX = (logicalX: number) =>
		positionToOverlay({
			positionX: logicalX,
			positionY: 0,
			canvasRect,
			containerRect,
			canvasSize,
		}).x;

	const toOverlayY = (logicalY: number) =>
		positionToOverlay({
			positionX: 0,
			positionY: logicalY,
			canvasRect,
			containerRect,
			canvasSize,
		}).y;

	return (
		<div className="pointer-events-none absolute inset-0" aria-hidden>
			{lines.map((line) => {
				if (line.type === "vertical") {
					return (
						<div
							key={`vertical-${line.position}`}
							className="absolute top-0 bottom-0 w-px bg-white/70"
							style={{ left: toOverlayX(line.position) }}
						/>
					);
				}
				return (
					<div
						key={`horizontal-${line.position}`}
						className="absolute left-0 right-0 h-px bg-white/70"
						style={{ top: toOverlayY(line.position) }}
					/>
				);
			})}
		</div>
	);
}
