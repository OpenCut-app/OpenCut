import type { TimelineTrack, TimelineElement } from "@/types/timeline";
import type { MediaAsset } from "@/types/assets";
import { isMainTrack } from "@/lib/timeline";
import {
	DEFAULT_LINE_HEIGHT,
	FONT_SIZE_SCALE_REFERENCE,
} from "@/constants/text-constants";

export interface ElementBounds {
	cx: number;
	cy: number;
	width: number;
	height: number;
	rotation: number;
}

export interface ElementWithBounds {
	trackId: string;
	elementId: string;
	element: TimelineElement;
	bounds: ElementBounds;
}

function getVisualElementBounds({
	canvasWidth,
	canvasHeight,
	sourceWidth,
	sourceHeight,
	transform,
}: {
	canvasWidth: number;
	canvasHeight: number;
	sourceWidth: number;
	sourceHeight: number;
	transform: {
		scale: number;
		position: { x: number; y: number };
		rotate: number;
	};
}): ElementBounds {
	const containScale = Math.min(
		canvasWidth / sourceWidth,
		canvasHeight / sourceHeight,
	);
	const scaledWidth = sourceWidth * containScale * transform.scale;
	const scaledHeight = sourceHeight * containScale * transform.scale;
	const cx = canvasWidth / 2 + transform.position.x;
	const cy = canvasHeight / 2 + transform.position.y;

	return {
		cx,
		cy,
		width: scaledWidth,
		height: scaledHeight,
		rotation: transform.rotate,
	};
}

export function getElementBounds({
	element,
	canvasSize,
	mediaAsset,
}: {
	element: TimelineElement;
	canvasSize: { width: number; height: number };
	mediaAsset?: MediaAsset | null;
}): ElementBounds | null {
	if (element.type === "audio") return null;
	if ("hidden" in element && element.hidden) return null;

	const { width: canvasWidth, height: canvasHeight } = canvasSize;

	if (element.type === "video" || element.type === "image") {
		const sourceWidth = mediaAsset?.width ?? canvasWidth;
		const sourceHeight = mediaAsset?.height ?? canvasHeight;
		return getVisualElementBounds({
			canvasWidth,
			canvasHeight,
			sourceWidth,
			sourceHeight,
			transform: element.transform,
		});
	}

	if (element.type === "sticker") {
		return getVisualElementBounds({
			canvasWidth,
			canvasHeight,
			sourceWidth: 200,
			sourceHeight: 200,
			transform: element.transform,
		});
	}

	if (element.type === "text") {
		const scaledFontSize =
			element.fontSize * (canvasHeight / FONT_SIZE_SCALE_REFERENCE);
		const letterSpacing = element.letterSpacing ?? 0;
		const lineHeight = element.lineHeight ?? DEFAULT_LINE_HEIGHT;
		const lineHeightPx = scaledFontSize * lineHeight;

		let measuredWidth = 100;
		let measuredHeight = scaledFontSize;

		const canvas = document.createElement("canvas");
		canvas.width = 4096;
		canvas.height = 4096;
		const ctx = canvas.getContext("2d");

		if (ctx) {
			const fontWeight = element.fontWeight === "bold" ? "bold" : "normal";
			const fontStyle = element.fontStyle === "italic" ? "italic" : "normal";
			const fontFamily = `"${element.fontFamily.replace(/"/g, '\\"')}"`;
			ctx.font = `${fontStyle} ${fontWeight} ${scaledFontSize}px ${fontFamily}, sans-serif`;
			ctx.textAlign = element.textAlign as CanvasTextAlign;
			if ("letterSpacing" in ctx) {
				(
					ctx as CanvasRenderingContext2D & { letterSpacing: string }
				).letterSpacing = `${letterSpacing}px`;
			}

			const lines = element.content.split("\n");
			const lineMetrics = lines.map((line) => ctx.measureText(line));

			let top = Number.POSITIVE_INFINITY;
			let bottom = Number.NEGATIVE_INFINITY;
			let maxWidth = 0;

			for (let i = 0; i < lineMetrics.length; i++) {
				const metrics = lineMetrics[i];
				const y = i * lineHeightPx;
				top = Math.min(
					top,
					y - (metrics.actualBoundingBoxAscent ?? scaledFontSize * 0.8),
				);
				bottom = Math.max(
					bottom,
					y + (metrics.actualBoundingBoxDescent ?? scaledFontSize * 0.2),
				);
				maxWidth = Math.max(maxWidth, metrics.width);
			}

			measuredWidth = maxWidth;
			measuredHeight = bottom - top;
		}

		const width = measuredWidth * element.transform.scale;
		const height = measuredHeight * element.transform.scale;
		return {
			cx: canvasWidth / 2 + element.transform.position.x,
			cy: canvasHeight / 2 + element.transform.position.y,
			width,
			height,
			rotation: element.transform.rotate,
		};
	}

	return null;
}

export function getVisibleElementsWithBounds({
	tracks,
	currentTime,
	canvasSize,
	mediaAssets,
}: {
	tracks: TimelineTrack[];
	currentTime: number;
	canvasSize: { width: number; height: number };
	mediaAssets: MediaAsset[];
}): ElementWithBounds[] {
	const mediaMap = new Map(mediaAssets.map((m) => [m.id, m]));
	const visibleTracks = tracks.filter(
		(track) => !("hidden" in track && track.hidden),
	);
	const orderedTracks = [
		...visibleTracks.filter((track) => !isMainTrack(track)),
		...visibleTracks.filter((track) => isMainTrack(track)),
	].reverse();

	const result: ElementWithBounds[] = [];

	for (const track of orderedTracks) {
		const elements = track.elements
			.filter((element) => !("hidden" in element && element.hidden))
			.filter(
				(element) =>
					currentTime >= element.startTime &&
					currentTime < element.startTime + element.duration,
			)
			.slice()
			.sort((a, b) => {
				if (a.startTime !== b.startTime) return a.startTime - b.startTime;
				return a.id.localeCompare(b.id);
			});

		for (const element of elements) {
			const mediaAsset =
				element.type === "video" || element.type === "image"
					? mediaMap.get(element.mediaId)
					: undefined;
			const bounds = getElementBounds({
				element,
				canvasSize,
				mediaAsset,
			});
			if (bounds) {
				result.push({
					trackId: track.id,
					elementId: element.id,
					element,
					bounds,
				});
			}
		}
	}

	return result;
}
