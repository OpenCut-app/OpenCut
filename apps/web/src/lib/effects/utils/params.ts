import type { ParamValues } from "@/lib/params";

/**
 * Type-safe parameter getters for effect uniforms.
 * These eliminate the need for `as number` / `as string` casts throughout effect definitions.
 */

/** Get a number parameter with fallback default */
export function getNumberParam(
	params: ParamValues,
	key: string,
	defaultValue = 0,
): number {
	const value = params[key];
	if (typeof value === "number") {
		return value;
	}
	if (typeof value === "string") {
		const parsed = Number.parseFloat(value);
		return Number.isFinite(parsed) ? parsed : defaultValue;
	}
	return defaultValue;
}

/** Get a string parameter with fallback default */
export function getStringParam(
	params: ParamValues,
	key: string,
	defaultValue = "",
): string {
	const value = params[key];
	if (typeof value === "string") {
		return value;
	}
	if (typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}
	return defaultValue;
}

/** Get a boolean parameter with fallback default */
export function getBooleanParam(
	params: ParamValues,
	key: string,
	defaultValue = false,
): boolean {
	const value = params[key];
	if (typeof value === "boolean") {
		return value;
	}
	return defaultValue;
}
