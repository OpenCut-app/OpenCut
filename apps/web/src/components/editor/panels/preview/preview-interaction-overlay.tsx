import { usePreviewInteraction } from "@/hooks/use-preview-interaction";
import { TransformHandles } from "./transform-handles";
import { SnapGuides } from "./snap-guides";
import { TextEditOverlay } from "./text-edit-overlay";

export function PreviewInteractionOverlay({
	canvasRef,
	containerRef,
}: {
	canvasRef: React.RefObject<HTMLCanvasElement | null>;
	containerRef: React.RefObject<HTMLDivElement | null>;
}) {
	const {
		onPointerDown,
		onPointerMove,
		onPointerUp,
		onDoubleClick,
		snapLines,
		editingText,
		commitTextEdit,
		cancelTextEdit,
	} = usePreviewInteraction({ canvasRef });

	return (
		<div className="absolute inset-0">
			{/* biome-ignore lint/a11y/noStaticElementInteractions: canvas overlay, pointer-only interaction */}
			<div
				className="absolute inset-0 pointer-events-auto"
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={onPointerUp}
				onDoubleClick={onDoubleClick}
			/>
			{editingText ? (
				<TextEditOverlay
					canvasRef={canvasRef}
					containerRef={containerRef}
					trackId={editingText.trackId}
					elementId={editingText.elementId}
					element={editingText.element}
					onCommit={commitTextEdit}
					onCancel={cancelTextEdit}
				/>
			) : (
				<TransformHandles canvasRef={canvasRef} containerRef={containerRef} />
			)}
			<SnapGuides
				lines={snapLines}
				canvasRef={canvasRef}
				containerRef={containerRef}
			/>
		</div>
	);
}
