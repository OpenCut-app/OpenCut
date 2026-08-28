import { generateUUID } from "@/utils/id";
import { buildDefaultParamValues } from "@/lib/registry";
import { transformsRegistry } from "./registry";
import type { ParamValues } from "@/lib/params";
import type { ClipTransform } from "@/lib/transforms/types";
import { TRANSFORMABLE_ELEMENT_TYPES } from "@/lib/timeline";

export { transformsRegistry } from "./registry";
export { registerDefaultTransforms } from "./definitions";
export { registerDefaultPresets } from "./presets";

export const TRANSFORM_TARGET_ELEMENT_TYPES = TRANSFORMABLE_ELEMENT_TYPES;

export function buildDefaultTransformInstance({
	transformType,
}: {
	transformType: string;
}): ClipTransform {
	const definition = transformsRegistry.get(transformType);
	const params: ParamValues = buildDefaultParamValues(definition.params);

	return {
		id: generateUUID(),
		type: transformType,
		params,
		enabled: true,
	};
}
