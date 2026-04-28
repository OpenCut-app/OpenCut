"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePreviewViewport } from "@/preview/components/preview-viewport";
import { useEditor } from "@/editor/use-editor";
import type { TextElement } from "@/timeline";
import { DEFAULTS } from "@/timeline/defaults";
import {
	getElementLocalTime,
} from "@/animation";
import { resolveTransformAtTime } from "@/rendering/animation-values";
import { resolveTextLayout } from "@/text/primitives";

export function TextEditOverlay({
	trackId,
	elementId,
	element,
	onCommit,
}: {
	trackId: string;
	elementId: string;
	element: TextElement;
	onCommit: () => void;
}) {
	const editor = useEditor();
	const viewport = usePreviewViewport();
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
		({ event }: { event: React.KeyboardEvent }) => {
			const { key } = event;
			if (key === "Escape") {
				event.preventDefault();
				onCommit();
				return;
			}
		},
		[onCommit],
	);

	const canvasSize = editor.project.getActive().settings.canvasSize;

	if (!canvasSize) return null;

	const currentTime = editor.playback.getCurrentTime();
	const localTime = getElementLocalTime({
		timelineTime: currentTime,
		elementStartTime: element.startTime,
		elementDuration: element.duration,
	});
	const transform = resolveTransformAtTime({
		baseTransform: element.transform,
		animations: element.animations,
		localTime,
	});

	const { x: posX, y: posY } = viewport.positionToOverlay({
		positionX: transform.position.x,
		positionY: transform.position.y,
	});

	const { x: displayScaleX } = viewport.getDisplayScale();
	const resolvedTextLayout = resolveTextLayout({
		text: {
			content: element.content,
			fontSize: element.fontSize,
			fontFamily: element.fontFamily,
			fontWeight: element.fontWeight,
			fontStyle: element.fontStyle,
			textAlign: element.textAlign,
			textDecoration: element.textDecoration,
			letterSpacing: element.letterSpacing,
			lineHeight: element.lineHeight,
		},
		canvasHeight: canvasSize.height,
	});

	const lineHeight = element.lineHeight ?? DEFAULTS.text.lineHeight;
	const canvasLetterSpacing = element.letterSpacing ?? 0;
	const lineHeightPx = resolvedTextLayout.lineHeightPx;

	const bg = element.background;
	const shouldShowBackground =
		bg.enabled && bg.color && bg.color !== "transparent";
	const fontSizeRatio = resolvedTextLayout.fontSizeRatio;
	const canvasPaddingX = shouldShowBackground
		? (bg.paddingX ?? DEFAULTS.text.background.paddingX) * fontSizeRatio
		: 0;
	const canvasPaddingY = shouldShowBackground
		? (bg.paddingY ?? DEFAULTS.text.background.paddingY) * fontSizeRatio
		: 0;

	return (
		<div
			className="absolute"
			style={{
				left: posX,
				top: posY,
				transform: `translate(-50%, -50%) scale(${transform.scaleX * displayScaleX}, ${transform.scaleY * displayScaleX}) rotate(${transform.rotate}deg)`,
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
					fontSize: resolvedTextLayout.scaledFontSize,
					fontFamily: element.fontFamily,
					fontWeight: element.fontWeight === "bold" ? "bold" : "normal",
					fontStyle: element.fontStyle === "italic" ? "italic" : "normal",
					textAlign: element.textAlign,
					letterSpacing: `${canvasLetterSpacing}px`,
					lineHeight,
					color: element.color,
					caretColor: element.color,
					backgroundColor: shouldShowBackground ? bg.color : "transparent",
					minHeight: lineHeightPx,
					textDecoration: element.textDecoration ?? "none",
					padding: shouldShowBackground
						? `${canvasPaddingY}px ${canvasPaddingX}px`
						: 0,
					minWidth: 1,
				}}
				onInput={handleInput}
				onBlur={onCommit}
				onKeyDown={(event) => handleKeyDown({ event })}
			>
				{element.content || ""}
			</div>
		</div>
	);
}
