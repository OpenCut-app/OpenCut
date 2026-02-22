"use client";

import { useCallback, useEffect, useRef } from "react";
import { useEditor } from "@/hooks/use-editor";
import type { TextElement } from "@/types/timeline";
import {
	positionToOverlay,
	getDisplayScale,
} from "@/lib/preview/preview-coords";
import {
	DEFAULT_LINE_HEIGHT,
	FONT_SIZE_SCALE_REFERENCE,
} from "@/constants/text-constants";

const TEXT_BACKGROUND_PADDING = "4px 8px";
const TEXT_EDIT_VERTICAL_OFFSET_EM = 0.06;

export function TextEditOverlay({
	canvasRef,
	containerRef,
	trackId,
	elementId,
	element,
	onCommit,
	onCancel,
}: {
	canvasRef: React.RefObject<HTMLCanvasElement | null>;
	containerRef: React.RefObject<HTMLDivElement | null>;
	trackId: string;
	elementId: string;
	element: TextElement;
	onCommit: () => void;
	onCancel: () => void;
}) {
	const editor = useEditor();
	const divRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const div = divRef.current;
		if (!div) return;
		div.focus();
		const range = document.createRange();
		range.selectNodeContents(div);
		const selection = window.getSelection();
		selection?.removeAllRanges();
		selection?.addRange(range);
	}, []);

	const handleInput = useCallback(() => {
		const div = divRef.current;
		if (!div) return;
		const text = div.innerText;
		editor.timeline.previewElements({
			updates: [{ trackId, elementId, updates: { content: text } }],
		});
	}, [editor.timeline, trackId, elementId]);

	const handleKeyDown = useCallback(
		(event: React.KeyboardEvent) => {
			const { key } = event;
			if (key === "Escape") {
				event.preventDefault();
				onCancel();
				return;
			}
		},
		[onCancel],
	);

	const canvasRect = canvasRef.current?.getBoundingClientRect();
	const containerRect = containerRef.current?.getBoundingClientRect();
	const canvasSize = editor.project.getActive().settings.canvasSize;

	if (!canvasRect || !containerRect || !canvasSize) return null;

	const { x: posX, y: posY } = positionToOverlay({
		positionX: element.transform.position.x,
		positionY: element.transform.position.y,
		canvasRect,
		containerRect,
		canvasSize,
	});

	const { x: displayScaleX } = getDisplayScale({
		canvasRect,
		canvasSize,
	});

	const displayFontSize =
		element.fontSize *
		(canvasSize.height / FONT_SIZE_SCALE_REFERENCE) *
		displayScaleX;

	const verticalAlignmentOffset =
		displayFontSize * TEXT_EDIT_VERTICAL_OFFSET_EM;

	const lineHeight = element.lineHeight ?? DEFAULT_LINE_HEIGHT;
	const fontWeight = element.fontWeight === "bold" ? "bold" : "normal";
	const fontStyle = element.fontStyle === "italic" ? "italic" : "normal";
	const letterSpacing = element.letterSpacing ?? 0;
	const backgroundColor =
		element.backgroundColor === "transparent"
			? "transparent"
			: element.backgroundColor;

	return (
		<div
			className="absolute"
			style={{
				left: posX,
				top: posY - verticalAlignmentOffset,
				transform: `translate(-50%, -50%) scale(${element.transform.scale}) rotate(${element.transform.rotate}deg)`,
				transformOrigin: "center center",
			}}
		>
			{/* biome-ignore lint/a11y/useSemanticElements: contenteditable required for multiline, IME, paste */}
			<div
				ref={divRef}
				contentEditable
				suppressContentEditableWarning
				tabIndex={0}
				role="textbox"
				aria-label="Edit text"
				className="cursor-text select-text outline-none whitespace-pre"
				style={{
					fontSize: displayFontSize,
					fontFamily: element.fontFamily,
					fontWeight,
					fontStyle,
					textAlign: element.textAlign,
					letterSpacing: `${letterSpacing}px`,
					lineHeight,
					color: element.color,
					backgroundColor,
					minHeight: displayFontSize * lineHeight,
					textDecoration: element.textDecoration ?? "none",
					padding:
						backgroundColor === "transparent" ? 0 : TEXT_BACKGROUND_PADDING,
					minWidth: 1,
				}}
				onInput={handleInput}
				onBlur={onCommit}
				onKeyDown={handleKeyDown}
			>
				{element.content || ""}
			</div>
		</div>
	);
}
