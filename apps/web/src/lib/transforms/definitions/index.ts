import { transformsRegistry } from "@/lib/transforms/registry";
import { scaleTransformDefinition } from "./spatial/scale";
import { rotateTransformDefinition } from "./spatial/rotate";
import { translateTransformDefinition } from "./spatial/translate";
import { flipTransformDefinition } from "./spatial/flip";
import { cropTransformDefinition } from "./spatial/crop";
import { lensDistortionTransformDefinition } from "./visual/lens-distortion";
import { perspectiveTransformDefinition } from "./visual/perspective";
import { waveTransformDefinition } from "./visual/wave";
import { fadeTransitionDefinition } from "./transitions/fade";
import { wipeTransitionDefinition } from "./transitions/wipe";
import { slideTransitionDefinition } from "./transitions/slide";
import { zoomTransitionDefinition } from "./transitions/zoom";

const defaultTransforms = [
	// Spatial (Canvas2D matrix ops)
	scaleTransformDefinition,
	rotateTransformDefinition,
	translateTransformDefinition,
	flipTransformDefinition,
	cropTransformDefinition,
	// Visual (single-pass WebGL)
	lensDistortionTransformDefinition,
	perspectiveTransformDefinition,
	waveTransformDefinition,
	// Transitions — registered for completeness; NOT wired into the
	// per-clip render pipeline (dual-source clip-to-clip compositing is
	// out of scope for visual-node.ts). See types.ts TransitionRenderer doc.
	fadeTransitionDefinition,
	wipeTransitionDefinition,
	slideTransitionDefinition,
	zoomTransitionDefinition,
];

export function registerDefaultTransforms(): void {
	for (const definition of defaultTransforms) {
		if (transformsRegistry.has(definition.type)) {
			continue;
		}
		transformsRegistry.register(definition.type, definition);
	}
}
