import type { ElementWithBounds } from "./element-bounds";

function pointInRotatedRect({
	px,
	py,
	cx,
	cy,
	width,
	height,
	rotation,
}: {
	px: number;
	py: number;
	cx: number;
	cy: number;
	width: number;
	height: number;
	rotation: number;
}): boolean {
	const angleRad = (rotation * Math.PI) / 180;
	const cos = Math.cos(-angleRad);
	const sin = Math.sin(-angleRad);
	const dx = px - cx;
	const dy = py - cy;
	const localX = dx * cos - dy * sin;
	const localY = dx * sin + dy * cos;
	const halfW = width / 2;
	const halfH = height / 2;
	return (
		localX >= -halfW && localX <= halfW && localY >= -halfH && localY <= halfH
	);
}

export function hitTest({
	canvasX,
	canvasY,
	elementsWithBounds,
}: {
	canvasX: number;
	canvasY: number;
	elementsWithBounds: ElementWithBounds[];
}): ElementWithBounds | null {
	for (let i = elementsWithBounds.length - 1; i >= 0; i--) {
		const { bounds } = elementsWithBounds[i];
		if (
			pointInRotatedRect({
				px: canvasX,
				py: canvasY,
				cx: bounds.cx,
				cy: bounds.cy,
				width: bounds.width,
				height: bounds.height,
				rotation: bounds.rotation,
			})
		) {
			return elementsWithBounds[i];
		}
	}
	return null;
}
