import type {
	AgentContext,
	AgentTimelineTrack,
	ToolDefinition,
} from "@/agent/types";
import { EditorContextAdapter } from "@/agent/context";
import { toolRegistry } from "@/agent/tools/registry";
import { loadContextSchema } from "@/agent/tools/schemas";

type LoadContextTargetType = "asset" | "timeline_element";

export type LoadContextArgs = {
	targetType?: LoadContextTargetType;
	id?: string;
	assetId?: string;
	trackId?: string;
	elementId?: string;
};

export type LoadContextResult = {
	targetType: LoadContextTargetType;
	id: string;
	status: "loaded" | "processing";
	cached: boolean;
	provider: "gemini";
	context: TextContext | MediaContext;
};

type TextContext = {
	kind: "text";
	trackId: string;
	elementId: string;
	type: string;
	name?: string;
	content: string;
	start: number;
	end: number;
};

type MediaContext = {
	kind: "media";
	assetId: string;
	assetName: string;
	assetType: string;
	duration: number;
	fileUri: string;
	mimeType: string;
	fileName?: string;
	displayName?: string;
	element?: {
		trackId: string;
		elementId: string;
		type: string;
		start: number;
		end: number;
	};
};

type UploadedGeminiFile = {
	provider: "gemini";
	status: "loaded" | "processing";
	fileName?: string;
	fileUri: string;
	mimeType: string;
	displayName?: string;
};

const assetContextCache = new Map<string, UploadedGeminiFile>();
const textContextCache = new Map<string, TextContext>();

const loadContextTool: ToolDefinition = {
	...loadContextSchema,
	execute: async (
		args: Record<string, unknown>,
		context: AgentContext,
	): Promise<LoadContextResult | { error: string }> => {
		const typedArgs = args as LoadContextArgs;

		if (typedArgs.targetType === "asset") {
			return loadAssetContext(typedArgs, context);
		}

		if (typedArgs.targetType === "timeline_element") {
			return loadTimelineElementContext(typedArgs, context);
		}

		return { error: "Unsupported context target type" };
	},
};

async function loadAssetContext(
	args: LoadContextArgs,
	context: AgentContext,
	element?: TimelineElementRef,
): Promise<LoadContextResult | { error: string }> {
	const assetId = args.assetId ?? args.id ?? element?.assetId;
	if (!assetId) {
		return { error: "Asset id is required" };
	}

	const asset = context.mediaAssets.find(
		(mediaAsset) => mediaAsset.id === assetId,
	);
	if (!asset) {
		return { error: "Asset not found" };
	}

	if (!isSupportedMediaAssetType(asset.type)) {
		return { error: "Unsupported asset type" };
	}

	const cached = assetContextCache.get(asset.id);
	if (cached) {
		return {
			targetType: "asset",
			id: asset.id,
			status: cached.status,
			cached: true,
			provider: "gemini",
			context: toMediaContext({ asset, uploaded: cached, element }),
		};
	}

	const file = EditorContextAdapter.resolveAssetFile(asset.id);
	if (!file) {
		return { error: `Could not access file for asset ${asset.id}` };
	}

	const uploaded = await uploadFileToGemini({ file, asset });
	if ("error" in uploaded) {
		return uploaded;
	}

	assetContextCache.set(asset.id, uploaded);

	return {
		targetType: "asset",
		id: asset.id,
		status: uploaded.status,
		cached: false,
		provider: "gemini",
		context: toMediaContext({ asset, uploaded, element }),
	};
}

async function loadTimelineElementContext(
	args: LoadContextArgs,
	context: AgentContext,
): Promise<LoadContextResult | { error: string }> {
	const elementId = args.elementId ?? args.id;

	if (!elementId) {
		return { error: "elementId (or id) is required for timeline_element target" };
	}

	let resolved: ReturnType<typeof findTimelineElement> = null;

	if (args.trackId) {
		resolved = findTimelineElement(context.timelineTracks, args.trackId, elementId);
	} else {
		resolved = findTimelineElementAcrossTracks(context.timelineTracks, elementId);
	}

	if (!resolved) {
		return { error: "Timeline element not found" };
	}

	const { track, element } = resolved;
	const trackId = track.trackId;

	if (element.content !== undefined) {
		const cacheKey = `${trackId}:${elementId}`;
		const cached = textContextCache.get(cacheKey);
		if (cached) {
			return {
				targetType: "timeline_element",
				id: elementId,
				status: "loaded",
				cached: true,
				provider: "gemini",
				context: cached,
			};
		}

		const textContext: TextContext = {
			kind: "text",
			trackId,
			elementId,
			type: element.type,
			...(element.name ? { name: element.name } : {}),
			content: element.content,
			start: element.start,
			end: element.end,
		};

		textContextCache.set(cacheKey, textContext);

		return {
			targetType: "timeline_element",
			id: elementId,
			status: "loaded",
			cached: false,
			provider: "gemini",
			context: textContext,
		};
	}

	if (element.assetId) {
		return loadAssetContext(
			{ targetType: "asset", assetId: element.assetId },
			context,
			{
				assetId: element.assetId,
				trackId,
				elementId,
				type: element.type,
				start: element.start,
				end: element.end,
			},
		);
	}

	return { error: "Timeline element has no loadable context" };
}

async function uploadFileToGemini({
	file,
	asset,
}: {
	file: File;
	asset: AgentContext["mediaAssets"][number];
}): Promise<UploadedGeminiFile | { error: string }> {
	const mimeType = resolveGeminiMimeType({
		fileName: file.name,
		displayName: asset.name,
		fileType: file.type,
		assetType: asset.type,
	});

	if (!mimeType) {
		return { error: `Unsupported MIME type for asset ${asset.id}` };
	}

	const formData = new FormData();
	formData.set("file", file);
	formData.set("displayName", asset.name);
	formData.set("mimeType", mimeType);

	const response = await fetch("/api/agent/context/load", {
		method: "POST",
		body: formData,
	});

	const data = (await response.json()) as Partial<UploadedGeminiFile> & {
		error?: string;
	};

	if (!response.ok) {
		return { error: data.error ?? "Failed to load context" };
	}

	if (!data.fileUri || !data.mimeType || !data.status) {
		return { error: "Invalid context load response" };
	}

	return {
		provider: "gemini",
		status: data.status,
		fileName: data.fileName,
		fileUri: data.fileUri,
		mimeType: data.mimeType,
		displayName: data.displayName,
	};
}

function resolveGeminiMimeType({
	fileName,
	displayName,
	fileType,
	assetType,
}: {
	fileName: string;
	displayName: string;
	fileType?: string;
	assetType: string;
}): string | null {
	if (fileType && fileType !== "application/octet-stream") {
		return fileType;
	}

	const mimeType = inferMimeTypeFromName(displayName) ?? inferMimeTypeFromName(fileName);
	if (mimeType) {
		return mimeType;
	}

	if (assetType === "image") {
		return "image/png";
	}

	return null;
}

function inferMimeTypeFromName(name: string): string | null {
	const extension = name.split(".").pop()?.toLowerCase();
	return extension ? (MIME_BY_EXTENSION[extension] ?? null) : null;
}

const MIME_BY_EXTENSION: Record<string, string> = {
	avi: "video/x-msvideo",
	flac: "audio/flac",
	gif: "image/gif",
	jpeg: "image/jpeg",
	jpg: "image/jpeg",
	m4a: "audio/mp4",
	mov: "video/quicktime",
	mp3: "audio/mpeg",
	mp4: "video/mp4",
	mpeg: "video/mpeg",
	mpg: "video/mpeg",
	png: "image/png",
	wav: "audio/wav",
	webm: "video/webm",
	webp: "image/webp",
};

function toMediaContext({
	asset,
	uploaded,
	element,
}: {
	asset: AgentContext["mediaAssets"][number];
	uploaded: UploadedGeminiFile;
	element?: TimelineElementRef;
}): MediaContext {
	return {
		kind: "media",
		assetId: asset.id,
		assetName: asset.name,
		assetType: asset.type,
		duration: asset.duration,
		fileUri: uploaded.fileUri,
		mimeType: uploaded.mimeType,
		...(uploaded.fileName ? { fileName: uploaded.fileName } : {}),
		...(uploaded.displayName ? { displayName: uploaded.displayName } : {}),
		...(element
			? {
					element: {
						trackId: element.trackId,
						elementId: element.elementId,
						type: element.type,
						start: element.start,
						end: element.end,
					},
				}
			: {}),
	};
}

function findTimelineElement(
	tracks: AgentTimelineTrack[] | undefined,
	trackId: string,
	elementId: string,
): {
	track: AgentTimelineTrack;
	element: AgentTimelineTrack["elements"][number];
} | null {
	const track = tracks?.find((candidate) => candidate.trackId === trackId);
	const element = track?.elements.find(
		(candidate) => candidate.elementId === elementId,
	);

	return track && element ? { track, element } : null;
}

function findTimelineElementAcrossTracks(
	tracks: AgentTimelineTrack[] | undefined,
	elementId: string,
): {
	track: AgentTimelineTrack;
	element: AgentTimelineTrack["elements"][number];
} | null {
	if (!tracks) return null;
	for (const track of tracks) {
		const element = track.elements.find(
			(candidate) => candidate.elementId === elementId,
		);
		if (element) return { track, element };
	}
	return null;
}

function isSupportedMediaAssetType(type: string): boolean {
	return type === "video" || type === "audio" || type === "image";
}

type TimelineElementRef = {
	assetId: string;
	trackId: string;
	elementId: string;
	type: string;
	start: number;
	end: number;
};

toolRegistry.register(loadContextSchema.name, loadContextTool);
