import type { TransformableElement } from "@/lib/timeline";
import { buildDefaultParamValues } from "@/lib/registry";
import { transformsRegistry } from "@/lib/transforms/registry";
import { getPreset } from "@/lib/transforms/presets/registry";
import type { TransformPresetKeyframe } from "@/lib/transforms/presets/types";
import type { ClipTransform } from "@/lib/transforms/types";
import { buildTransformParamPath } from "@/lib/animation/transform-param-channel";
import {
	upsertKeyframe,
	setChannel,
	getChannel,
} from "@/lib/animation/keyframes";
import type {
	ElementAnimations,
	NumberAnimationChannel,
} from "@/lib/animation/types";
import { generateUUID } from "@/utils/id";

const EMPTY_NUMBER_CHANNEL: NumberAnimationChannel = {
	valueKind: "number",
	keyframes: [],
};

/**
 * Converts one preset param's normalized (0..1) keyframes into an
 * animation channel written at `clipTransforms.<transformId>.params.<key>`,
 * mapping normalized time -> absolute seconds via the target clip's
 * duration. Mirrors `upsertTransformParamKeyframe` but builds a whole
 * channel in one pass instead of one keyframe at a time, since a preset
 * always supplies its full keyframe list up front.
 */
export function applyKeyframesToChannel({
	animations,
	transformId,
	paramKey,
	keyframes,
	clipDuration,
}: {
	animations: ElementAnimations | undefined;
	transformId: string;
	paramKey: string;
	keyframes: TransformPresetKeyframe[];
	clipDuration: number;
}): ElementAnimations | undefined {
	const path = buildTransformParamPath({ transformId, paramKey });
	const channel = getChannel({ animations, propertyPath: path });
	let targetChannel =
		channel && channel.valueKind === "number" ? channel : EMPTY_NUMBER_CHANNEL;

	for (const keyframe of keyframes) {
		// Preset easing (e.g. "ease-out-cubic") has no bezier equivalent in
		// dev's animation system — only "linear" | "hold" interpolation is
		// supported, so every preset keyframe is written as "linear".
		const boundedTime = Math.max(
			0,
			Math.min(keyframe.normalizedTime * clipDuration, clipDuration),
		);
		const updated = upsertKeyframe({
			channel: targetChannel,
			time: boundedTime,
			value: keyframe.value,
			interpolation: "linear",
			keyframeId: generateUUID(),
		});
		if (updated && updated.valueKind === "number") {
			targetChannel = updated;
		}
	}

	return (
		setChannel({
			animations,
			propertyPath: path,
			channel: targetChannel,
		}) ?? { channels: {} }
	);
}

/**
 * Pure preset-application logic, extracted from `ApplyTransformPresetCommand`
 * so it can be unit tested without going through `EditorCore`/command
 * execution. Builds new `ClipTransform` instances for each preset entry
 * (default params merged with preset static params) and writes animation
 * channels for any keyframed params.
 */
export function applyPresetToElement({
	element,
	presetType,
}: {
	element: TransformableElement;
	presetType: string;
}): { element: TransformableElement; transformIds: string[] } {
	const preset = getPreset(presetType);
	const clipDuration = element.duration;

	let animations = element.animations;
	const newTransforms: ClipTransform[] = [];
	const transformIds: string[] = [];

	for (const entry of preset.transforms) {
		const definition = transformsRegistry.get(entry.transformType);
		const defaultParams = buildDefaultParamValues(definition.params);
		const transformId = generateUUID();
		transformIds.push(transformId);

		newTransforms.push({
			id: transformId,
			type: entry.transformType,
			params: { ...defaultParams, ...entry.params },
			enabled: true,
		});

		for (const [paramKey, keyframes] of Object.entries(
			entry.animatedParams ?? {},
		)) {
			animations = applyKeyframesToChannel({
				animations,
				transformId,
				paramKey,
				keyframes,
				clipDuration,
			});
		}
	}

	const currentTransforms = element.clipTransforms ?? [];
	return {
		element: {
			...element,
			clipTransforms: [...currentTransforms, ...newTransforms],
			animations,
		},
		transformIds,
	};
}
