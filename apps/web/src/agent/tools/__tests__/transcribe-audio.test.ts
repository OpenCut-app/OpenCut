import { beforeEach, describe, expect, jest, mock, test } from "bun:test";
import type { AgentContext } from "@/agent/types";
import { providerToolSchemas } from "@/agent/tools/schemas";
import { toolRegistry } from "@/agent/tools/registry";

const mockResolveAssetFile = jest.fn<(assetId?: string) => File | null>();
const mockGetAssetHasAudio =
	jest.fn<(assetId: string) => boolean | undefined>();
const mockExtractAssetAudio =
	jest.fn<(args: { file: File; assetType: string }) => Promise<Blob>>();
const mockDecodeAudioToFloat32 =
	jest.fn<
		(args: {
			audioBlob: Blob;
		}) => Promise<{ samples: Float32Array; sampleRate: number }>
	>();
const mockFetch = jest.fn<typeof fetch>();

mock.module("@/agent/context", () => ({
	EditorContextAdapter: {
		resolveAssetFile: mockResolveAssetFile,
		getAssetHasAudio: mockGetAssetHasAudio,
	},
}));

mock.module("@/lib/media/mediabunny", () => ({
	extractAssetAudio: mockExtractAssetAudio,
}));

mock.module("@/lib/media/audio", () => ({
	decodeAudioToFloat32: mockDecodeAudioToFloat32,
}));

await import("@/agent/tools/transcribe-audio.tool");

function makeContext(overrides: Partial<AgentContext> = {}): AgentContext {
	return {
		projectId: "proj-1",
		activeSceneId: "scene-A",
		mediaAssets: [],
		playbackTimeMs: 0,
		...overrides,
	};
}

function fakeVideoAsset(
	overrides: Partial<{
		id: string;
		name: string;
		type: string;
		duration: number;
	}> = {},
) {
	return {
		id: "v1",
		name: "clip.mp4",
		type: "video",
		duration: 30,
		...overrides,
	};
}

function fakeTranscriptResult() {
	return {
		transcriptId: "tr_deepgram_123",
		assetId: "v1",
		assetName: "clip.mp4",
		provider: "deepgram",
		language: "es",
		model: "nova-3",
		fullText: "Hola mundo.",
		duration: 30,
		confidence: 0.98,
		timingGranularity: "word",
		wordCount: 2,
		utteranceCount: 1,
		words: [
			{ text: "Hola", start: 1, end: 1.3, confidence: 0.99 },
			{ text: "mundo.", start: 1.3, end: 1.8, confidence: 0.97 },
		],
		utterances: [
			{
				text: "Hola mundo.",
				start: 1,
				end: 1.8,
				confidence: 0.98,
				words: [
					{ text: "Hola", start: 1, end: 1.3, confidence: 0.99 },
					{ text: "mundo.", start: 1.3, end: 1.8, confidence: 0.97 },
				],
			},
		],
		segments: [{ text: "Hola mundo.", start: 1, end: 1.8 }],
	};
}

describe("transcribe_audio tool", () => {
	beforeEach(() => {
		mockResolveAssetFile.mockClear();
		mockGetAssetHasAudio.mockClear();
		mockExtractAssetAudio.mockClear();
		mockDecodeAudioToFloat32.mockClear();
		mockFetch.mockClear();
		mockDecodeAudioToFloat32.mockResolvedValue({
			samples: new Float32Array([0, 0.25, -0.5]),
			sampleRate: 3,
		});
		globalThis.fetch = mockFetch;
	});

	test("is registered and exposed to the provider without provider/model args", () => {
		expect(toolRegistry.has("transcribe_audio")).toBe(true);
		const schema = providerToolSchemas.find(
			(tool) => tool.name === "transcribe_audio",
		);
		expect(schema).toBeDefined();
		expect(schema?.parameters.map((param) => param.key)).toEqual([
			"assetId",
			"language",
		]);
	});

	test("transcribes a single media asset through the Deepgram route", async () => {
		const file = new File([], "clip.mp4", { type: "video/mp4" });
		const audioBlob = new Blob([new Uint8Array([1, 2, 3])], {
			type: "audio/wav",
		});
		mockResolveAssetFile.mockReturnValue(file);
		mockGetAssetHasAudio.mockReturnValue(true);
		mockExtractAssetAudio.mockResolvedValue(audioBlob);
		mockFetch.mockResolvedValue(
			new Response(JSON.stringify(fakeTranscriptResult()), { status: 200 }),
		);

		const tool = toolRegistry.get("transcribe_audio");
		const result = await tool.execute(
			{},
			makeContext({ mediaAssets: [fakeVideoAsset()] }),
		);

		expect(result).toEqual(fakeTranscriptResult());
		expect(mockExtractAssetAudio).toHaveBeenCalledWith({
			file,
			assetType: "video",
		});
		expect(mockFetch).toHaveBeenCalledWith(
			"/api/transcription/deepgram",
			expect.objectContaining({ method: "POST" }),
		);
	});

	test("returns Deepgram route errors without local fallback", async () => {
		const file = new File([], "clip.mp4", { type: "video/mp4" });
		mockResolveAssetFile.mockReturnValue(file);
		mockGetAssetHasAudio.mockReturnValue(true);
		mockExtractAssetAudio.mockResolvedValue(
			new Blob([], { type: "audio/wav" }),
		);
		mockFetch.mockResolvedValue(
			new Response(JSON.stringify({ error: "missing key" }), { status: 501 }),
		);

		const tool = toolRegistry.get("transcribe_audio");
		const result = await tool.execute(
			{},
			makeContext({ mediaAssets: [fakeVideoAsset()] }),
		);

		expect(result).toEqual({ error: "missing key" });
	});

	test("returns extraction errors before calling Deepgram", async () => {
		const file = new File([], "clip.mov", { type: "video/quicktime" });
		mockResolveAssetFile.mockReturnValue(file);
		mockGetAssetHasAudio.mockReturnValue(true);
		mockExtractAssetAudio.mockRejectedValue(
			new Error("Could not extract audio"),
		);

		const tool = toolRegistry.get("transcribe_audio");
		const result = await tool.execute(
			{},
			makeContext({ mediaAssets: [fakeVideoAsset({ name: "clip.mov" })] }),
		);

		expect(result).toEqual({ error: "Could not extract audio" });
		expect(mockFetch).not.toHaveBeenCalled();
	});
});
