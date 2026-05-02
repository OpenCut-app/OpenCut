import type { AgentContext, ToolDefinition } from "@/agent/types";
import { EditorContextAdapter } from "@/agent/context";
import { toolRegistry } from "@/agent/tools/registry";
import { transcribeAudioSchema } from "@/agent/tools/schemas";
import { decodeAudioToFloat32 } from "@/lib/media/audio";
import { extractAssetAudio } from "@/lib/media/mediabunny";
import type { TranscriptionLanguage } from "@/lib/transcription/types";

type TimingGranularity = "word";

type TranscriptWord = {
	text: string;
	start: number;
	end: number;
	confidence?: number;
};

type TranscriptUtterance = {
	text: string;
	start: number;
	end: number;
	confidence?: number;
	speaker?: number;
	words: TranscriptWord[];
};

export type TranscribeAudioResult = {
	transcriptId: string;
	assetId: string;
	assetName: string;
	provider: "deepgram";
	language: string;
	model?: string;
	fullText: string;
	duration: number;
	confidence?: number;
	timingGranularity: TimingGranularity;
	wordCount: number;
	utteranceCount: number;
	words: TranscriptWord[];
	utterances: TranscriptUtterance[];
	segments: Array<{ text: string; start: number; end: number }>;
};

type TranscribeAudioArgs = {
	assetId?: string;
	language?: TranscriptionLanguage;
};

const transcribeAudioTool: ToolDefinition = {
	...transcribeAudioSchema,
	execute: async (
		args: Record<string, unknown>,
		context: AgentContext,
	): Promise<TranscribeAudioResult | { error: string }> => {
		const typedArgs = args as TranscribeAudioArgs;
		const target = resolveTargetAsset({
			assetId: typedArgs.assetId,
			context,
		});

		if ("error" in target) return target;

		const file = EditorContextAdapter.resolveAssetFile(target.asset.id);
		if (!file) {
			return { error: `Could not access file for asset ${target.asset.id}` };
		}

		const hasAudio = EditorContextAdapter.getAssetHasAudio(target.asset.id);
		if (hasAudio === false) {
			return { error: "Asset has no audio track" };
		}

		try {
			const audioBlob = await extractAssetAudio({
				file,
				assetType: target.asset.type,
			});
			const diagnostics = await analyzeAudioBlob({ audioBlob });

			return transcribeWithDeepgram({
				audioBlob,
				diagnostics,
				assetId: target.asset.id,
				assetName: target.asset.name,
				duration: target.asset.duration,
				language: typedArgs.language,
			});
		} catch (error) {
			return {
				error:
					error instanceof Error
						? error.message
						: "Could not extract audio from asset",
			};
		}
	},
};

async function transcribeWithDeepgram({
	audioBlob,
	diagnostics,
	assetId,
	assetName,
	duration,
	language,
}: {
	audioBlob: Blob;
	diagnostics: AudioDiagnostics;
	assetId: string;
	assetName: string;
	duration: number;
	language?: TranscriptionLanguage;
}): Promise<TranscribeAudioResult | { error: string }> {
	const formData = new FormData();
	formData.set("file", audioBlob, `${assetName.replace(/\.[^.]+$/, "")}.wav`);
	formData.set("assetId", assetId);
	formData.set("assetName", assetName);
	formData.set("duration", String(duration));
	formData.set("audioSize", String(audioBlob.size));
	formData.set("audioType", audioBlob.type || "unknown");
	formData.set("audioPeak", String(diagnostics.peak));
	formData.set("audioRms", String(diagnostics.rms));
	formData.set("extractedDuration", String(diagnostics.duration));
	if (language && language !== "auto") formData.set("language", language);

	const response = await fetch("/api/transcription/deepgram", {
		method: "POST",
		body: formData,
	});
	const data = (await response.json()) as TranscribeAudioResult & {
		error?: string;
	};

	if (!response.ok) {
		return { error: data.error ?? "Deepgram transcription failed" };
	}

	return data;
}

type AudioDiagnostics = {
	duration: number;
	peak: number;
	rms: number;
};

async function analyzeAudioBlob({
	audioBlob,
}: {
	audioBlob: Blob;
}): Promise<AudioDiagnostics> {
	const { samples, sampleRate } = await decodeAudioToFloat32({ audioBlob });
	let peak = 0;
	let sumSquares = 0;

	for (const sample of samples) {
		const abs = Math.abs(sample);
		if (abs > peak) peak = abs;
		sumSquares += sample * sample;
	}

	return {
		duration: samples.length / sampleRate,
		peak,
		rms: samples.length > 0 ? Math.sqrt(sumSquares / samples.length) : 0,
	};
}

function resolveTargetAsset({
	assetId,
	context,
}: {
	assetId?: string;
	context: AgentContext;
}): { asset: AgentContext["mediaAssets"][number] } | { error: string } {
	if (context.mediaAssets.length === 0) {
		return { error: "No active media asset" };
	}

	const mediaCandidates = context.mediaAssets.filter(
		(asset) => asset.type === "video" || asset.type === "audio",
	);
	if (mediaCandidates.length === 0) {
		return { error: "Asset has no audio track" };
	}

	if (!assetId) {
		if (mediaCandidates.length > 1) {
			return {
				error: `Multiple video/audio assets found: ${mediaCandidates.map((asset) => asset.name).join(", ")}. Specify which one with assetId.`,
			};
		}
		return { asset: mediaCandidates[0] };
	}

	const target = resolveAssetByIdOrName({ assetId, mediaCandidates });
	if ("error" in target) return target;
	return { asset: target.asset };
}

function resolveAssetByIdOrName({
	assetId,
	mediaCandidates,
}: {
	assetId: string;
	mediaCandidates: AgentContext["mediaAssets"];
}): { asset: AgentContext["mediaAssets"][number] } | { error: string } {
	const idMatch = mediaCandidates.find((asset) => asset.id === assetId);
	if (idMatch) return { asset: idMatch };

	const exactNameMatches = mediaCandidates.filter(
		(asset) => asset.name === assetId,
	);
	if (exactNameMatches.length === 1) return { asset: exactNameMatches[0] };
	if (exactNameMatches.length > 1) {
		return {
			error: `Ambiguous asset name "${assetId}" matches multiple assets (${exactNameMatches.map((asset) => asset.name).join(", ")}). Specify the internal id: ${exactNameMatches.map((asset) => asset.id).join(", ")}.`,
		};
	}

	const lower = assetId.toLowerCase();
	const caseInsensitiveMatches = mediaCandidates.filter(
		(asset) => asset.name.toLowerCase() === lower,
	);
	if (caseInsensitiveMatches.length === 1) {
		return { asset: caseInsensitiveMatches[0] };
	}
	if (caseInsensitiveMatches.length > 1) {
		return {
			error: `Ambiguous asset name "${assetId}" matches multiple assets (${caseInsensitiveMatches.map((asset) => asset.name).join(", ")}). Specify the internal id: ${caseInsensitiveMatches.map((asset) => asset.id).join(", ")}.`,
		};
	}

	return {
		error: `No asset found with id or name "${assetId}". Available ids: [${mediaCandidates.map((asset) => asset.id).join(", ")}]. Available names: [${mediaCandidates.map((asset) => asset.name).join(", ")}].`,
	};
}

toolRegistry.register(transcribeAudioSchema.name, transcribeAudioTool);
