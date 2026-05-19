import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
	detectMediaRecorderSupport,
	isWebCodecsExportSupported,
} from "../media-recorder-support";

describe("isWebCodecsExportSupported", () => {
	const root = globalThis as {
		VideoEncoder?: unknown;
		AudioEncoder?: unknown;
	};
	let originalVideoEncoder: unknown;
	let originalAudioEncoder: unknown;

	beforeEach(() => {
		originalVideoEncoder = root.VideoEncoder;
		originalAudioEncoder = root.AudioEncoder;
	});

	afterEach(() => {
		if (originalVideoEncoder === undefined) delete root.VideoEncoder;
		else root.VideoEncoder = originalVideoEncoder;
		if (originalAudioEncoder === undefined) delete root.AudioEncoder;
		else root.AudioEncoder = originalAudioEncoder;
	});

	test("false when either WebCodecs encoder is missing", () => {
		delete root.VideoEncoder;
		delete root.AudioEncoder;
		expect(isWebCodecsExportSupported()).toBe(false);

		root.VideoEncoder = class {};
		delete root.AudioEncoder;
		expect(isWebCodecsExportSupported()).toBe(false);

		delete root.VideoEncoder;
		root.AudioEncoder = class {};
		expect(isWebCodecsExportSupported()).toBe(false);
	});

	test("true only when both encoders are defined", () => {
		root.VideoEncoder = class {};
		root.AudioEncoder = class {};
		expect(isWebCodecsExportSupported()).toBe(true);
	});
});

describe("detectMediaRecorderSupport", () => {
	const root = globalThis as {
		MediaRecorder?: unknown;
	};
	let originalMediaRecorder: unknown;

	beforeEach(() => {
		originalMediaRecorder = root.MediaRecorder;
	});

	afterEach(() => {
		if (originalMediaRecorder === undefined) delete root.MediaRecorder;
		else root.MediaRecorder = originalMediaRecorder;
	});

	test("unsupported when MediaRecorder is undefined", () => {
		delete root.MediaRecorder;
		expect(detectMediaRecorderSupport()).toEqual({
			supported: false,
			mimeType: null,
		});
	});

	test("returns the first supported mime type", () => {
		class FakeMediaRecorder {
			static isTypeSupported(mimeType: string): boolean {
				return mimeType === "video/webm;codecs=vp8,opus";
			}
		}
		root.MediaRecorder = FakeMediaRecorder;
		expect(detectMediaRecorderSupport()).toEqual({
			supported: true,
			mimeType: "video/webm;codecs=vp8,opus",
		});
	});

	test("unsupported when no candidate mime type matches", () => {
		class FakeMediaRecorder {
			static isTypeSupported(): boolean {
				return false;
			}
		}
		root.MediaRecorder = FakeMediaRecorder;
		expect(detectMediaRecorderSupport()).toEqual({
			supported: false,
			mimeType: null,
		});
	});
});
