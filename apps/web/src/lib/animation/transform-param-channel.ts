import type { ParamValues } from "@/lib/params";
import type { ClipTransform } from "@/lib/transforms/types";
import type {
	ElementAnimations,
	NumberAnimationChannel,
	TransformParamPath,
} from "@/lib/animation/types";
import {
	getChannel,
	removeKeyframe,
	setChannel,
	upsertKeyframe,
} from "./keyframes";
import { getChannelValueAtTime } from "./interpolation";

export const TRANSFORM_PARAM_PATH_PREFIX = "clipTransforms.";
export const TRANSFORM_PARAM_PATH_SUFFIX = ".params.";

export function buildTransformParamPath({
	transformId,
	paramKey,
}: {
	transformId: string;
	paramKey: string;
}): TransformParamPath {
	return `${TRANSFORM_PARAM_PATH_PREFIX}${transformId}${TRANSFORM_PARAM_PATH_SUFFIX}${paramKey}`;
}

export function isTransformParamPath(
	propertyPath: string,
): propertyPath is TransformParamPath {
	return (
		propertyPath.startsWith(TRANSFORM_PARAM_PATH_PREFIX) &&
		propertyPath.includes(TRANSFORM_PARAM_PATH_SUFFIX)
	);
}

export function parseTransformParamPath({
	propertyPath,
}: {
	propertyPath: string;
}): { transformId: string; paramKey: string } | null {
	if (!isTransformParamPath(propertyPath)) {
		return null;
	}

	const withoutPrefix = propertyPath.slice(TRANSFORM_PARAM_PATH_PREFIX.length);
	const separatorIndex = withoutPrefix.indexOf(TRANSFORM_PARAM_PATH_SUFFIX);
	if (separatorIndex <= 0) {
		return null;
	}

	const transformId = withoutPrefix.slice(0, separatorIndex);
	const paramKey = withoutPrefix.slice(
		separatorIndex + TRANSFORM_PARAM_PATH_SUFFIX.length,
	);
	if (!transformId || !paramKey) {
		return null;
	}

	return { transformId, paramKey };
}

export function resolveTransformParamsAtTime({
	transform,
	animations,
	localTime,
}: {
	transform: ClipTransform;
	animations: ElementAnimations | undefined;
	localTime: number;
}): ParamValues {
	const resolved: ParamValues = {};

	for (const [paramKey, staticValue] of Object.entries(transform.params)) {
		const path = buildTransformParamPath({
			transformId: transform.id,
			paramKey,
		});
		const channel = getChannel({ animations, propertyPath: path });
		if (channel && channel.keyframes.length > 0) {
			resolved[paramKey] = getChannelValueAtTime({
				channel,
				time: localTime,
				fallbackValue: staticValue,
			}) as number | string | boolean;
		} else {
			resolved[paramKey] = staticValue;
		}
	}

	return resolved;
}

const EMPTY_NUMBER_CHANNEL: NumberAnimationChannel = {
	valueKind: "number",
	keyframes: [],
};

export function upsertTransformParamKeyframe({
	animations,
	transformId,
	paramKey,
	time,
	value,
	interpolation,
	keyframeId,
}: {
	animations: ElementAnimations | undefined;
	transformId: string;
	paramKey: string;
	time: number;
	value: number;
	interpolation?: "linear" | "hold";
	keyframeId?: string;
}): ElementAnimations | undefined {
	const path = buildTransformParamPath({ transformId, paramKey });
	const channel = getChannel({ animations, propertyPath: path });
	const targetChannel =
		channel && channel.valueKind === "number" ? channel : EMPTY_NUMBER_CHANNEL;
	const updatedChannel = upsertKeyframe({
		channel: targetChannel,
		time,
		value,
		interpolation: interpolation ?? "linear",
		keyframeId,
	});

	return (
		setChannel({
			animations,
			propertyPath: path,
			channel: updatedChannel,
		}) ?? { channels: {} }
	);
}

export function removeTransformParamKeyframe({
	animations,
	transformId,
	paramKey,
	keyframeId,
}: {
	animations: ElementAnimations | undefined;
	transformId: string;
	paramKey: string;
	keyframeId: string;
}): ElementAnimations | undefined {
	const path = buildTransformParamPath({ transformId, paramKey });
	const channel = getChannel({ animations, propertyPath: path });
	const updatedChannel = removeKeyframe({ channel, keyframeId });
	return setChannel({
		animations,
		propertyPath: path,
		channel: updatedChannel,
	});
}
