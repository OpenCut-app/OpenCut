export interface SnapLine {
	type: "horizontal" | "vertical";
	position: number;
}

const ROTATION_SNAP_STEP_DEGREES = 90;
const ROTATION_SNAP_THRESHOLD_DEGREES = 5;
export const MIN_SCALE = 0.01;
export const SNAP_THRESHOLD_SCREEN_PIXELS = 8;

export interface SnapResult {
	snappedPosition: { x: number; y: number };
	activeLines: SnapLine[];
}

export function snapPosition({
	proposedPosition,
	canvasSize,
	elementSize,
	snapThreshold,
}: {
	proposedPosition: { x: number; y: number };
	canvasSize: { width: number; height: number };
	elementSize: { width: number; height: number };
	snapThreshold: { x: number; y: number };
}): SnapResult {
	const centerX = 0;
	const centerY = 0;
	const left = -canvasSize.width / 2;
	const right = canvasSize.width / 2;
	const top = -canvasSize.height / 2;
	const bottom = canvasSize.height / 2;

	const halfWidth = elementSize.width / 2;
	const halfHeight = elementSize.height / 2;
	const activeLines: SnapLine[] = [];

	type AxisSnapCandidate = {
		snappedPosition: number;
		line: SnapLine;
		distance: number;
	};

	function getClosestAxisSnap({
		candidates,
		threshold,
	}: {
		candidates: AxisSnapCandidate[];
		threshold: number;
	}): AxisSnapCandidate | null {
		const snapCandidatesWithinThreshold = candidates.filter(
			(candidate) => candidate.distance <= threshold,
		);
		if (snapCandidatesWithinThreshold.length === 0) {
			return null;
		}
		return snapCandidatesWithinThreshold.reduce((closest, current) =>
			current.distance < closest.distance ? current : closest,
		);
	}

	const verticalTargets = [left, centerX, right];
	const horizontalTargets = [top, centerY, bottom];

	const xCandidates: AxisSnapCandidate[] = [];
	for (const targetX of verticalTargets) {
		xCandidates.push({
			snappedPosition: targetX,
			line: { type: "vertical", position: targetX },
			distance: Math.abs(proposedPosition.x - targetX),
		});
		xCandidates.push({
			snappedPosition: targetX + halfWidth,
			line: { type: "vertical", position: targetX },
			distance: Math.abs(proposedPosition.x - halfWidth - targetX),
		});
		xCandidates.push({
			snappedPosition: targetX - halfWidth,
			line: { type: "vertical", position: targetX },
			distance: Math.abs(proposedPosition.x + halfWidth - targetX),
		});
	}
	const yCandidates: AxisSnapCandidate[] = [];
	for (const targetY of horizontalTargets) {
		yCandidates.push({
			snappedPosition: targetY,
			line: { type: "horizontal", position: targetY },
			distance: Math.abs(proposedPosition.y - targetY),
		});
		yCandidates.push({
			snappedPosition: targetY + halfHeight,
			line: { type: "horizontal", position: targetY },
			distance: Math.abs(proposedPosition.y - halfHeight - targetY),
		});
		yCandidates.push({
			snappedPosition: targetY - halfHeight,
			line: { type: "horizontal", position: targetY },
			distance: Math.abs(proposedPosition.y + halfHeight - targetY),
		});
	}

	const closestX = getClosestAxisSnap({
		candidates: xCandidates,
		threshold: snapThreshold.x,
	});
	const closestY = getClosestAxisSnap({
		candidates: yCandidates,
		threshold: snapThreshold.y,
	});

	const x = closestX?.snappedPosition ?? proposedPosition.x;
	const y = closestY?.snappedPosition ?? proposedPosition.y;
	if (closestX) {
		activeLines.push(closestX.line);
	}
	if (closestY) {
		activeLines.push(closestY.line);
	}

	return {
		snappedPosition: { x, y },
		activeLines,
	};
}

export interface ScaleSnapResult {
	snappedScale: number;
	activeLines: SnapLine[];
}

export function snapScale({
	proposedScale,
	position,
	baseWidth,
	baseHeight,
	canvasSize,
	snapThreshold,
}: {
	proposedScale: number;
	position: { x: number; y: number };
	baseWidth: number;
	baseHeight: number;
	canvasSize: { width: number; height: number };
	snapThreshold: { x: number; y: number };
}): ScaleSnapResult {
	const centerX = 0;
	const centerY = 0;
	const left = -canvasSize.width / 2;
	const right = canvasSize.width / 2;
	const top = -canvasSize.height / 2;
	const bottom = canvasSize.height / 2;

	const leftEdge = position.x - (baseWidth * proposedScale) / 2;
	const rightEdge = position.x + (baseWidth * proposedScale) / 2;
	const topEdge = position.y - (baseHeight * proposedScale) / 2;
	const bottomEdge = position.y + (baseHeight * proposedScale) / 2;

	interface SnapCandidate {
		scale: number;
		distance: number;
		lines: SnapLine[];
	}

	const candidates: SnapCandidate[] = [];

	const verticalTargets = [
		{ position: left, line: { type: "vertical" as const, position: left } },
		{
			position: centerX,
			line: { type: "vertical" as const, position: centerX },
		},
		{ position: right, line: { type: "vertical" as const, position: right } },
	];

	for (const target of verticalTargets) {
		const distanceLeft = Math.abs(leftEdge - target.position);
		if (distanceLeft <= snapThreshold.x) {
			const scale = (2 * (position.x - target.position)) / baseWidth;
			if (scale > MIN_SCALE) {
				candidates.push({
					scale,
					distance: distanceLeft,
					lines: [target.line],
				});
			}
		}
		const distanceRight = Math.abs(rightEdge - target.position);
		if (distanceRight <= snapThreshold.x) {
			const scale = (2 * (target.position - position.x)) / baseWidth;
			if (scale > MIN_SCALE) {
				candidates.push({
					scale,
					distance: distanceRight,
					lines: [target.line],
				});
			}
		}
	}

	const horizontalTargets = [
		{ position: top, line: { type: "horizontal" as const, position: top } },
		{
			position: centerY,
			line: { type: "horizontal" as const, position: centerY },
		},
		{
			position: bottom,
			line: { type: "horizontal" as const, position: bottom },
		},
	];

	for (const target of horizontalTargets) {
		const distanceTop = Math.abs(topEdge - target.position);
		if (distanceTop <= snapThreshold.y) {
			const scale = (2 * (position.y - target.position)) / baseHeight;
			if (scale > MIN_SCALE) {
				candidates.push({
					scale,
					distance: distanceTop,
					lines: [target.line],
				});
			}
		}
		const distanceBottom = Math.abs(bottomEdge - target.position);
		if (distanceBottom <= snapThreshold.y) {
			const scale = (2 * (target.position - position.y)) / baseHeight;
			if (scale > MIN_SCALE) {
				candidates.push({
					scale,
					distance: distanceBottom,
					lines: [target.line],
				});
			}
		}
	}

	if (candidates.length === 0) {
		return { snappedScale: proposedScale, activeLines: [] };
	}

	const best = candidates.reduce((acc, candidate) =>
		candidate.distance < acc.distance ? candidate : acc,
	);

	const snappedLeft = position.x - (baseWidth * best.scale) / 2;
	const snappedRight = position.x + (baseWidth * best.scale) / 2;
	const snappedTop = position.y - (baseHeight * best.scale) / 2;
	const snappedBottom = position.y + (baseHeight * best.scale) / 2;

	const activeLines: SnapLine[] = [];
	const seenKeys = new Set<string>();

	function addLine({ line }: { line: SnapLine }) {
		const key = `${line.type}-${line.position}`;
		if (!seenKeys.has(key)) {
			seenKeys.add(key);
			activeLines.push(line);
		}
	}

	for (const target of verticalTargets) {
		if (
			Math.abs(snappedLeft - target.position) <= 1 ||
			Math.abs(snappedRight - target.position) <= 1
		) {
			addLine({ line: target.line });
		}
	}
	for (const target of horizontalTargets) {
		if (
			Math.abs(snappedTop - target.position) <= 1 ||
			Math.abs(snappedBottom - target.position) <= 1
		) {
			addLine({ line: target.line });
		}
	}

	return {
		snappedScale: best.scale,
		activeLines,
	};
}

export interface RotationSnapResult {
	snappedRotation: number;
	isSnapped: boolean;
}

export function snapRotation({
	proposedRotation,
}: {
	proposedRotation: number;
}): RotationSnapResult {
	const nearestRotationSnap =
		Math.round(proposedRotation / ROTATION_SNAP_STEP_DEGREES) *
		ROTATION_SNAP_STEP_DEGREES;
	const distanceToNearestSnap = Math.abs(
		proposedRotation - nearestRotationSnap,
	);
	if (distanceToNearestSnap <= ROTATION_SNAP_THRESHOLD_DEGREES) {
		return { snappedRotation: nearestRotationSnap, isSnapped: true };
	}
	return { snappedRotation: proposedRotation, isSnapped: false };
}
