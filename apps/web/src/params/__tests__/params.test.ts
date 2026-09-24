import { describe, expect, test } from "bun:test";
import {
	coerceParamValue,
	getParamValueKind,
	getParamDefaultInterpolation,
	getParamNumericRange,
} from "../index";
import type { ParamDefinition } from "../index";

describe("coerceParamValue", () => {
	describe("number params", () => {
		const numberParam: ParamDefinition = {
			key: "opacity",
			label: "Opacity",
			type: "number",
			default: 1,
			min: 0,
			max: 1,
			step: 0.01,
		};

		test("returns valid number within range", () => {
			expect(coerceParamValue({ param: numberParam, value: 0.5 })).toBe(0.5);
		});

		test("clamps to min", () => {
			expect(coerceParamValue({ param: numberParam, value: -1 })).toBe(0);
		});

		test("clamps to max", () => {
			expect(coerceParamValue({ param: numberParam, value: 2 })).toBe(1);
		});

		test("snaps to step", () => {
			expect(coerceParamValue({ param: numberParam, value: 0.123 })).toBe(0.12);
		});

		test("returns null for NaN", () => {
			expect(coerceParamValue({ param: numberParam, value: Number.NaN })).toBeNull();
		});

		test("returns null for non-number", () => {
			expect(coerceParamValue({ param: numberParam, value: "0.5" })).toBeNull();
			expect(coerceParamValue({ param: numberParam, value: true })).toBeNull();
			expect(coerceParamValue({ param: numberParam, value: null })).toBeNull();
			expect(coerceParamValue({ param: numberParam, value: undefined })).toBeNull();
		});

		test("handles integer step", () => {
			const intParam: ParamDefinition = {
				key: "count",
				label: "Count",
				type: "number",
				default: 0,
				min: 0,
				max: 100,
				step: 1,
			};
			expect(coerceParamValue({ param: intParam, value: 3.7 })).toBe(4);
			expect(coerceParamValue({ param: intParam, value: 3.2 })).toBe(3);
		});

		test("handles param without max (unbounded above)", () => {
			const unboundedParam: ParamDefinition = {
				key: "val",
				label: "Val",
				type: "number",
				default: 0,
				min: 0,
				step: 1,
			};
			expect(coerceParamValue({ param: unboundedParam, value: 9999 })).toBe(9999);
		});
	});

	describe("boolean params", () => {
		const boolParam: ParamDefinition = {
			key: "visible",
			label: "Visible",
			type: "boolean",
			default: true,
		};

		test("returns true for true", () => {
			expect(coerceParamValue({ param: boolParam, value: true })).toBe(true);
		});

		test("returns false for false", () => {
			expect(coerceParamValue({ param: boolParam, value: false })).toBe(false);
		});

		test("returns null for non-boolean", () => {
			expect(coerceParamValue({ param: boolParam, value: 1 })).toBeNull();
			expect(coerceParamValue({ param: boolParam, value: "true" })).toBeNull();
			expect(coerceParamValue({ param: boolParam, value: 0 })).toBeNull();
			expect(coerceParamValue({ param: boolParam, value: null })).toBeNull();
		});
	});

	describe("color params", () => {
		const colorParam: ParamDefinition = {
			key: "color",
			label: "Color",
			type: "color",
			default: "#ffffff",
		};

		test("returns string value", () => {
			expect(coerceParamValue({ param: colorParam, value: "#ff0000" })).toBe("#ff0000");
		});

		test("returns empty string (valid string)", () => {
			expect(coerceParamValue({ param: colorParam, value: "" })).toBe("");
		});

		test("returns null for non-string", () => {
			expect(coerceParamValue({ param: colorParam, value: 0xff0000 })).toBeNull();
			expect(coerceParamValue({ param: colorParam, value: true })).toBeNull();
		});
	});

	describe("text params", () => {
		const textParam: ParamDefinition = {
			key: "text",
			label: "Text",
			type: "text",
			default: "",
		};

		test("returns string value", () => {
			expect(coerceParamValue({ param: textParam, value: "hello" })).toBe("hello");
		});

		test("returns null for non-string", () => {
			expect(coerceParamValue({ param: textParam, value: 123 })).toBeNull();
		});
	});

	describe("select params", () => {
		const selectParam: ParamDefinition = {
			key: "align",
			label: "Alignment",
			type: "select",
			default: "left",
			options: [
				{ value: "left", label: "Left" },
				{ value: "center", label: "Center" },
				{ value: "right", label: "Right" },
			],
		};

		test("returns value if it matches an option", () => {
			expect(coerceParamValue({ param: selectParam, value: "center" })).toBe("center");
		});

		test("returns null if value is not in options", () => {
			expect(coerceParamValue({ param: selectParam, value: "justify" })).toBeNull();
		});

		test("returns null for non-string", () => {
			expect(coerceParamValue({ param: selectParam, value: 0 })).toBeNull();
		});
	});
});

describe("getParamValueKind", () => {
	test("returns 'number' for number params", () => {
		const param: ParamDefinition = {
			key: "x",
			label: "X",
			type: "number",
			default: 0,
			min: 0,
			max: 100,
			step: 1,
		};
		expect(getParamValueKind({ param })).toBe("number");
	});

	test("returns 'discrete' for boolean params", () => {
		const param: ParamDefinition = {
			key: "vis",
			label: "Visible",
			type: "boolean",
			default: true,
		};
		expect(getParamValueKind({ param })).toBe("discrete");
	});

	test("returns 'color' for color params", () => {
		const param: ParamDefinition = {
			key: "color",
			label: "Color",
			type: "color",
			default: "#fff",
		};
		expect(getParamValueKind({ param })).toBe("color");
	});

	test("returns 'discrete' for text params", () => {
		const param: ParamDefinition = {
			key: "text",
			label: "Text",
			type: "text",
			default: "",
		};
		expect(getParamValueKind({ param })).toBe("discrete");
	});

	test("returns 'discrete' for select params", () => {
		const param: ParamDefinition = {
			key: "align",
			label: "Alignment",
			type: "select",
			default: "left",
			options: [{ value: "left", label: "Left" }],
		};
		expect(getParamValueKind({ param })).toBe("discrete");
	});
});

describe("getParamDefaultInterpolation", () => {
	test("returns 'linear' for number params", () => {
		const param: ParamDefinition = {
			key: "x",
			label: "X",
			type: "number",
			default: 0,
			min: 0,
			max: 100,
			step: 1,
		};
		expect(getParamDefaultInterpolation({ param })).toBe("linear");
	});

	test("returns 'hold' for boolean params", () => {
		const param: ParamDefinition = {
			key: "vis",
			label: "Visible",
			type: "boolean",
			default: true,
		};
		expect(getParamDefaultInterpolation({ param })).toBe("hold");
	});

	test("returns 'hold' for text params", () => {
		const param: ParamDefinition = {
			key: "text",
			label: "Text",
			type: "text",
			default: "",
		};
		expect(getParamDefaultInterpolation({ param })).toBe("hold");
	});

	test("returns 'linear' for color params (first component)", () => {
		const param: ParamDefinition = {
			key: "color",
			label: "Color",
			type: "color",
			default: "#fff",
		};
		expect(getParamDefaultInterpolation({ param })).toBe("linear");
	});
});

describe("getParamNumericRange", () => {
	test("returns range for number params", () => {
		const param: ParamDefinition = {
			key: "opacity",
			label: "Opacity",
			type: "number",
			default: 1,
			min: 0,
			max: 1,
			step: 0.01,
		};
		expect(getParamNumericRange({ param })).toEqual({ min: 0, max: 1, step: 0.01 });
	});

	test("returns undefined for non-number params", () => {
		const boolParam: ParamDefinition = {
			key: "vis",
			label: "Visible",
			type: "boolean",
			default: true,
		};
		expect(getParamNumericRange({ param: boolParam })).toBeUndefined();
	});

	test("returns undefined for color params", () => {
		const colorParam: ParamDefinition = {
			key: "color",
			label: "Color",
			type: "color",
			default: "#fff",
		};
		expect(getParamNumericRange({ param: colorParam })).toBeUndefined();
	});

	test("handles number param without max", () => {
		const param: ParamDefinition = {
			key: "val",
			label: "Val",
			type: "number",
			default: 0,
			min: 0,
			step: 1,
		};
		expect(getParamNumericRange({ param })).toEqual({ min: 0, max: undefined, step: 1 });
	});
});
