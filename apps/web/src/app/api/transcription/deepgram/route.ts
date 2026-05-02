import { type NextRequest, NextResponse } from "next/server";

type DeepgramWord = {
	word?: string;
	punctuated_word?: string;
	start?: number;
	end?: number;
	confidence?: number;
	speaker?: number;
};

type DeepgramUtterance = {
	transcript?: string;
	start?: number;
	end?: number;
	confidence?: number;
	speaker?: number;
	words?: DeepgramWord[];
};

type DeepgramResponse = {
	metadata?: { request_id?: string };
	results?: {
		channels?: Array<{
			alternatives?: Array<{
				transcript?: string;
				confidence?: number;
				words?: DeepgramWord[];
			}>;
		}>;
		utterances?: DeepgramUtterance[];
	};
};

const DEEPGRAM_MODEL = "nova-3";

export async function POST(request: NextRequest) {
	const apiKey = process.env.DEEPGRAM_API_KEY;
	if (!apiKey) {
		return NextResponse.json(
			{ error: "Server configuration error: missing DEEPGRAM_API_KEY" },
			{ status: 501 },
		);
	}

	const formData = await request.formData();
	const file = formData.get("file");
	const assetId = formData.get("assetId");
	const assetName = formData.get("assetName");
	const duration = formData.get("duration");
	const language = formData.get("language");
	const audioSize = formData.get("audioSize");
	const audioType = formData.get("audioType");
	const audioPeak = formData.get("audioPeak");
	const audioRms = formData.get("audioRms");
	const extractedDuration = formData.get("extractedDuration");

	if (!(file instanceof File)) {
		return NextResponse.json({ error: "File is required" }, { status: 400 });
	}
	if (typeof assetId !== "string" || typeof assetName !== "string") {
		return NextResponse.json(
			{ error: "assetId and assetName are required" },
			{ status: 400 },
		);
	}

	const url = new URL("https://api.deepgram.com/v1/listen");
	url.searchParams.set("model", DEEPGRAM_MODEL);
	url.searchParams.set("smart_format", "true");
	url.searchParams.set("punctuate", "true");
	url.searchParams.set("utterances", "true");
	if (typeof language === "string" && language.length > 0) {
		url.searchParams.set("language", language);
	} else {
		url.searchParams.set("detect_language", "true");
	}

	try {
		const response = await fetch(url, {
			method: "POST",
			headers: {
				Authorization: `Token ${apiKey}`,
				"Content-Type": resolveContentType(file),
			},
			body: Buffer.from(await file.arrayBuffer()),
		});
		const data = (await response.json()) as DeepgramResponse & {
			error?: string;
		};

		if (!response.ok) {
			return NextResponse.json(
				{ error: data.error ?? "Deepgram transcription failed" },
				{ status: response.status },
			);
		}

		const normalized = normalizeDeepgramResponse({
			data,
			assetId,
			assetName,
			duration: parseFiniteNumber(duration) ?? 0,
			language: typeof language === "string" ? language : "auto",
			model: DEEPGRAM_MODEL,
		});

		if (isEmptyTranscript(normalized)) {
			const diagnostics = formatAudioDiagnostics({
				audioSize,
				audioType,
				audioPeak,
				audioRms,
				extractedDuration,
			});
			return NextResponse.json(
				{
					error: `Deepgram returned no speech. ${diagnostics}`,
				},
				{ status: 422 },
			);
		}

		return NextResponse.json(normalized);
	} catch (error) {
		console.error("[transcription/deepgram] Deepgram error:", error);
		return NextResponse.json(
			{ error: "Deepgram transcription failed" },
			{ status: 502 },
		);
	}
}

function isEmptyTranscript(transcript: {
	fullText: string;
	wordCount: number;
	utteranceCount: number;
}): boolean {
	return (
		transcript.fullText.trim().length === 0 &&
		transcript.wordCount === 0 &&
		transcript.utteranceCount === 0
	);
}

function formatAudioDiagnostics({
	audioSize,
	audioType,
	audioPeak,
	audioRms,
	extractedDuration,
}: {
	audioSize: FormDataEntryValue | null;
	audioType: FormDataEntryValue | null;
	audioPeak: FormDataEntryValue | null;
	audioRms: FormDataEntryValue | null;
	extractedDuration: FormDataEntryValue | null;
}): string {
	const size = typeof audioSize === "string" ? audioSize : "unknown";
	const type = typeof audioType === "string" ? audioType : "unknown";
	const peak = typeof audioPeak === "string" ? audioPeak : "unknown";
	const rms = typeof audioRms === "string" ? audioRms : "unknown";
	const duration =
		typeof extractedDuration === "string" ? extractedDuration : "unknown";
	return `Extracted audio diagnostics: type=${type}, size=${size} bytes, duration=${duration}s, peak=${peak}, rms=${rms}.`;
}

function normalizeDeepgramResponse({
	data,
	assetId,
	assetName,
	duration,
	language,
	model,
}: {
	data: DeepgramResponse;
	assetId: string;
	assetName: string;
	duration: number;
	language: string;
	model: string;
}) {
	const alternative = data.results?.channels?.[0]?.alternatives?.[0];
	const fullText = alternative?.transcript ?? "";
	const words = normalizeWords(alternative?.words ?? []);
	const utterances = (data.results?.utterances ?? []).map((utterance) => ({
		text: utterance.transcript ?? "",
		start: utterance.start ?? utterance.words?.[0]?.start ?? 0,
		end: utterance.end ?? utterance.words?.at(-1)?.end ?? 0,
		confidence: utterance.confidence,
		speaker: utterance.speaker,
		words: normalizeWords(utterance.words ?? []),
	}));
	const segments =
		utterances.length > 0
			? utterances.map((utterance) => ({
					text: utterance.text,
					start: utterance.start,
					end: utterance.end,
				}))
			: [
					{
						text: fullText,
						start: words[0]?.start ?? 0,
						end: words.at(-1)?.end ?? 0,
					},
				];

	return {
		transcriptId: `tr_deepgram_${data.metadata?.request_id ?? `${assetId}_${Date.now().toString(36)}`}`,
		assetId,
		assetName,
		provider: "deepgram",
		language,
		model,
		fullText,
		duration,
		confidence: alternative?.confidence,
		timingGranularity: "word",
		wordCount: words.length,
		utteranceCount: utterances.length,
		words,
		utterances,
		segments,
	};
}

function normalizeWords(words: DeepgramWord[]) {
	return words
		.filter(
			(word) => typeof word.start === "number" && typeof word.end === "number",
		)
		.map((word) => ({
			text: word.punctuated_word ?? word.word ?? "",
			start: word.start ?? 0,
			end: word.end ?? 0,
			confidence: word.confidence,
			speaker: word.speaker,
		}));
}

function resolveContentType(file: File): string {
	if (file.type && file.type !== "application/octet-stream") return file.type;
	return inferMimeTypeFromName(file.name) ?? "application/octet-stream";
}

function parseFiniteNumber(value: FormDataEntryValue | null): number | null {
	if (typeof value !== "string") return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function inferMimeTypeFromName(name: string): string | null {
	const extension = name.split(".").pop()?.toLowerCase();
	return extension ? (MIME_BY_EXTENSION[extension] ?? null) : null;
}

const MIME_BY_EXTENSION: Record<string, string> = {
	flac: "audio/flac",
	m4a: "audio/mp4",
	mov: "video/quicktime",
	mp3: "audio/mpeg",
	mp4: "video/mp4",
	mpeg: "video/mpeg",
	mpg: "video/mpeg",
	wav: "audio/wav",
	webm: "video/webm",
};
