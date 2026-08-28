const HEX_COLOR_REGEX = /^#?([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/;
const DEFAULT_RGB: [number, number, number] = [0, 1, 0.533]; // #00ff88

/** Convert hex color string (#RRGGBB or #RGB) to normalized RGB array [0..1, 0..1, 0..1] */
export function hexToRgb(hex: string): [number, number, number] {
	if (!hex || !HEX_COLOR_REGEX.test(hex)) {
		return DEFAULT_RGB;
	}
	let hexString = hex.replace("#", "");
	// Expand shorthand (#RGB -> #RRGGBB)
	if (hexString.length === 3) {
		hexString =
			hexString[0] +
			hexString[0] +
			hexString[1] +
			hexString[1] +
			hexString[2] +
			hexString[2];
	}
	return [
		Number.parseInt(hexString.slice(0, 2), 16) / 255,
		Number.parseInt(hexString.slice(2, 4), 16) / 255,
		Number.parseInt(hexString.slice(4, 6), 16) / 255,
	];
}
