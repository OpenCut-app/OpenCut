import { describe, expect, test } from "bun:test";
import {
	formatFileSize,
	getFileSizeLimitBytes,
	getFileSizeLimitError,
} from "@/lib/media/file-size-validation";

const MB = 1024 * 1024;

describe("media file size validation", () => {
	test("uses the configured default upload limits", () => {
		expect(getFileSizeLimitBytes({ mediaType: "image" })).toBe(50 * MB);
		expect(getFileSizeLimitBytes({ mediaType: "video" })).toBe(500 * MB);
		expect(getFileSizeLimitBytes({ mediaType: "audio" })).toBe(100 * MB);
	});

	test("returns no error when file size is at the limit", () => {
		expect(
			getFileSizeLimitError({
				fileName: "clip.mp4",
				fileSize: 500 * MB,
				mediaType: "video",
			}),
		).toBeNull();
	});

	test("returns a clear message when file exceeds limit", () => {
		expect(
			getFileSizeLimitError({
				fileName: "huge.wav",
				fileSize: 101 * MB,
				mediaType: "audio",
			}),
		).toBe("huge.wav is 101 MB. audio files must be 100 MB or smaller.");
	});

	test("formats small values using KB", () => {
		expect(formatFileSize({ bytes: 1500 })).toBe("1.5 KB");
	});
});
