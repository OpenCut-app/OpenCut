"use client";

import { useSnapIndicatorPosition } from "@/hooks/timeline/use-snap-indicator-position";
import type { SnapPoint } from "@/lib/timeline/snap-utils";
import type { TimelineTrack } from "@/types/timeline";

interface SnapIndicatorProps {
	snapPoint: SnapPoint | null;
	zoomLevel: number;
	isVisible: boolean;
	tracks: TimelineTrack[];
	timelineRef: React.RefObject<HTMLDivElement | null>;
	trackLabelsRef?: React.RefObject<HTMLDivElement | null>;
	tracksScrollRef: React.RefObject<HTMLDivElement | null>;
}

export function SnapIndicator({
	snapPoint,
	zoomLevel,
	isVisible,
	tracks,
	timelineRef,
	trackLabelsRef,
	tracksScrollRef,
}: SnapIndicatorProps) {
	const { leftPosition, topPosition, height } = useSnapIndicatorPosition({
		snapPoint,
		zoomLevel,
		tracks,
		timelineRef,
		trackLabelsRef,
		tracksScrollRef,
	});

	if (!isVisible || !snapPoint) {
		return null;
	}

	return (
		<div
			className="pointer-events-none absolute"
			style={{
				left: `${leftPosition}px`,
				top: topPosition,
				height: `${height}px`,
				width: "2px",
			}}
		>
			<div className={"bg-primary/40 h-full w-0.5 opacity-80"} />
		</div>
	);
}
