import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";

export function getMouseTimeFromClientX({
	clientX,
	containerRect,
	zoomLevel,
	scrollLeft,
}: {
	clientX: number;
	containerRect: DOMRect;
	zoomLevel: number;
	scrollLeft: number;
}): number {
	const mouseX = clientX - containerRect.left + scrollLeft;
	return Math.max(
		0,
		mouseX / (TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel),
	);
}
