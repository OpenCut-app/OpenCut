export function screenToCanvas({
	clientX,
	clientY,
	canvas,
}: {
	clientX: number;
	clientY: number;
	canvas: HTMLCanvasElement;
}): { x: number; y: number } {
	const rect = canvas.getBoundingClientRect();
	const scaleX = canvas.width / rect.width;
	const scaleY = canvas.height / rect.height;
	return {
		x: (clientX - rect.left) * scaleX,
		y: (clientY - rect.top) * scaleY,
	};
}

export function canvasToOverlay({
	canvasX,
	canvasY,
	canvasRect,
	containerRect,
	canvasSize,
}: {
	canvasX: number;
	canvasY: number;
	canvasRect: DOMRect;
	containerRect: DOMRect;
	canvasSize: { width: number; height: number };
}): { x: number; y: number } {
	const scaleX = canvasRect.width / canvasSize.width;
	const scaleY = canvasRect.height / canvasSize.height;
	return {
		x: canvasRect.left - containerRect.left + canvasX * scaleX,
		y: canvasRect.top - containerRect.top + canvasY * scaleY,
	};
}

export function positionToOverlay({
	positionX,
	positionY,
	canvasRect,
	containerRect,
	canvasSize,
}: {
	positionX: number;
	positionY: number;
	canvasRect: DOMRect;
	containerRect: DOMRect;
	canvasSize: { width: number; height: number };
}): { x: number; y: number } {
	const scaleX = canvasRect.width / canvasSize.width;
	const scaleY = canvasRect.height / canvasSize.height;
	const centerScreenX =
		canvasRect.left - containerRect.left + (canvasSize.width / 2) * scaleX;
	const centerScreenY =
		canvasRect.top - containerRect.top + (canvasSize.height / 2) * scaleY;
	return {
		x: centerScreenX + positionX * scaleX,
		y: centerScreenY + positionY * scaleY,
	};
}

export function getDisplayScale({
	canvasRect,
	canvasSize,
}: {
	canvasRect: DOMRect;
	canvasSize: { width: number; height: number };
}): { x: number; y: number } {
	return {
		x: canvasRect.width / canvasSize.width,
		y: canvasRect.height / canvasSize.height,
	};
}

export function screenPixelsToLogicalThreshold({
	canvas,
	screenPixels,
}: {
	canvas: HTMLCanvasElement;
	screenPixels: number;
}): { x: number; y: number } {
	const canvasRect = canvas.getBoundingClientRect();
	return {
		x: screenPixels * (canvas.width / canvasRect.width),
		y: screenPixels * (canvas.height / canvasRect.height),
	};
}
