import { formatTimestamp } from "./transcript-utils";

export interface ToolSummary {
	label: string;
	description: string;
}

export function formatToolCall(
	name: string,
	args: Record<string, unknown>,
): ToolSummary {
	const formatter = TOOL_CALL_FORMATTERS[name];
	if (formatter) return formatter(args);

	return {
		label: formatToolName(name),
		description: summarizeArgs(args),
	};
}

export function formatToolResult(
	name: string,
	raw: string,
): ToolSummary | null {
	try {
		const parsed = JSON.parse(raw);
		if (parsed && typeof parsed === "object" && "error" in parsed) {
			return {
				label: formatToolName(name),
				description: String(parsed.error),
			};
		}
		const formatter = TOOL_RESULT_FORMATTERS[name];
		if (formatter) return formatter(parsed);
		return null;
	} catch {
		return null;
	}
}

function formatToolName(name: string): string {
	return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatSeconds(s: unknown): string {
	if (typeof s !== "number" || !Number.isFinite(s)) return "?";
	return formatTimestamp(s);
}

function summarizeArgs(args: Record<string, unknown>): string {
	const entries = Object.entries(args);
	if (entries.length === 0) return "No arguments";
	return entries
		.map(([key, val]) => {
			if (Array.isArray(val)) {
				return `${key}: [${val.length} items]`;
			}
			if (typeof val === "object" && val !== null) {
				return `${key}: {...}`;
			}
			return `${key}: ${String(val)}`;
		})
		.join(", ");
}

const TOOL_CALL_FORMATTERS: Record<
	string,
	(args: Record<string, unknown>) => ToolSummary
> = {
	split: (args) => {
		const times = args.times as number[] | undefined;
		if (!times || times.length === 0)
			return { label: "Split", description: "No times specified" };
		const formatted = times.map((t) => formatSeconds(t)).join(", ");
		return {
			label: "Split",
			description: `at ${formatted}`,
		};
	},
	delete_timeline_elements: (args) => {
		const elementIds = args.elementIds as string[] | undefined;
		const count = elementIds?.length ?? 0;
		return {
			label: "Delete",
			description:
				count > 0
					? `${count} element${count !== 1 ? "s" : ""}`
					: "No elements specified",
		};
	},
	move_timeline_elements: (args) => {
		const elementIds = args.elementIds as string[] | undefined;
		const count = elementIds?.length ?? 0;
		const start = formatSeconds(args.start);
		return {
			label: "Move",
			description: `${count} element${count !== 1 ? "s" : ""} to ${start}`,
		};
	},
	add_media_to_timeline: (args) => ({
		label: "Add Media",
		description: `${String(args.assetId ?? "asset")} to ${String(args.trackType ?? "timeline")} at ${formatSeconds(args.startTime)}${typeof args.duration === "number" ? ` for ${formatSeconds(args.duration)}` : ""}`,
	}),
	update_timeline_element_timing: (args) => {
		const parts = [
			typeof args.start === "number"
				? `start ${formatSeconds(args.start)}`
				: null,
			typeof args.end === "number" ? `end ${formatSeconds(args.end)}` : null,
			typeof args.duration === "number"
				? `duration ${formatSeconds(args.duration)}`
				: null,
		].filter(Boolean);
		return {
			label: "Update Timing",
			description: parts.length > 0 ? parts.join(", ") : "No timing changes",
		};
	},
	add_text: (args) => {
		const parts: string[] = [];
		if (args.color) parts.push(String(args.color));
		if (args.fontSize) parts.push(`size ${args.fontSize}`);
		if (args.fontFamily) parts.push(String(args.fontFamily));
		if ((args.background as Record<string, unknown> | undefined)?.enabled)
			parts.push("bg");
		return {
			label: "Add Text",
			description: `${String(args.text ?? "text")} · ${formatSeconds(args.start)}-${formatSeconds(args.end)}${parts.length > 0 ? ` · ${parts.join(" ")}` : ""}`,
		};
	},
	update_text: (args) => {
		const raw = args.elementIds;
		const ids = Array.isArray(raw)
			? raw.length
			: typeof raw === "string"
				? raw.split(",").filter((id) => id.trim().length > 0).length
				: 0;
		const overrides: string[] = [];
		if (args.content) overrides.push("text");
		if (args.color) overrides.push(String(args.color));
		if (args.fontSize) overrides.push(`size ${args.fontSize}`);
		if (args.fontFamily) overrides.push(String(args.fontFamily));
		if ((args.background as Record<string, unknown> | undefined)?.enabled)
			overrides.push("bg");
		return {
			label: "Update Text",
			description: `${ids} element${ids !== 1 ? "s" : ""}${overrides.length > 0 ? ` · ${overrides.join(" ")}` : ""}`,
		};
	},
	load_context: (args) => {
		const targetType = String(args.targetType ?? "unknown");
		const id = args.id ?? args.assetId ?? args.elementId;
		if (targetType === "asset") {
			return {
				label: "Load Asset",
				description: id ? String(id) : "Loading asset...",
			};
		}
		return {
			label: "Load Context",
			description: id ? `${targetType} ${String(id)}` : targetType,
		};
	},
	list_keyframes: (args) => ({
		label: "List Keyframes",
		description: `for ${String(args.elementId ?? "element")}`,
	}),
	upsert_keyframe: (args) => {
		const path = String(args.propertyPath ?? "?");
		const time = formatSeconds(args.time);
		const val = args.value ?? args.colorValue ?? "?";
		return {
			label: "Add Keyframe",
			description: `${path} = ${String(val)} at ${time}`,
		};
	},
	remove_keyframe: (args) => ({
		label: "Remove Keyframe",
		description: `${String(args.propertyPath ?? "?")} keyframe ${String(args.keyframeId ?? "")}`,
	}),
	update_keyframe_curve: (args) => ({
		label: "Update Curve",
		description: `${String(args.interpolation ?? "curve")} on ${String(args.keyframeId ?? "")}`,
	}),
	list_animatable_properties: (args) => ({
		label: "Animatable Props",
		description: `for ${String(args.elementId ?? "element")}`,
	}),
	list_timeline: () => ({
		label: "List Timeline",
		description: "Fetching timeline tracks",
	}),
	list_project_assets: (args) => {
		const type = args.type ?? "all";
		const filter = args.filter ?? "all";
		const parts: string[] = [];
		if (type !== "all") parts.push(String(type));
		if (filter !== "all") parts.push(String(filter));
		return {
			label: "List Assets",
			description:
				parts.length > 0 ? parts.join(", ") : "Fetching project assets",
		};
	},
	transcribe_video: (args) => {
		const lang = args.language ? String(args.language) : null;
		return {
			label: "Transcribe",
			description: lang ? `language: ${lang}` : "Transcribing audio",
		};
	},
	transcribe_audio: (args) => {
		const lang = args.language ? String(args.language) : null;
		return {
			label: "Transcribe Audio",
			description: lang ? `language: ${lang}` : "Getting precise audio context",
		};
	},
};

const TOOL_RESULT_FORMATTERS: Record<
	string,
	(parsed: unknown) => ToolSummary | null
> = {
	split: (parsed) => {
		const data = parsed as {
			success?: boolean;
			affectedElements?: string[];
		} | null;
		if (!data) return null;
		const count = data.affectedElements?.length ?? 0;
		return {
			label: "Split",
			description: data.success
				? `${count} element${count !== 1 ? "s" : ""} affected`
				: "Failed",
		};
	},
	delete_timeline_elements: (parsed) => {
		const data = parsed as {
			success?: boolean;
			deletedElements?: string[];
		} | null;
		if (!data) return null;
		const count = data.deletedElements?.length ?? 0;
		return {
			label: "Deleted",
			description: data.success
				? `${count} element${count !== 1 ? "s" : ""}`
				: "Failed",
		};
	},
	move_timeline_elements: (parsed) => {
		const data = parsed as {
			success?: boolean;
			movedElements?: unknown[];
		} | null;
		if (!data) return null;
		const count = data.movedElements?.length ?? 0;
		return {
			label: "Moved",
			description: data.success
				? `${count} element${count !== 1 ? "s" : ""}`
				: "Failed",
		};
	},
	add_media_to_timeline: (parsed) => {
		const data = parsed as {
			elementId?: string;
			trackId?: string;
		} | null;
		if (!data) return null;
		return {
			label: "Media Added",
			description: data.trackId ? `track ${data.trackId}` : "Inserted",
		};
	},
	update_timeline_element_timing: (parsed) => {
		const data = parsed as {
			success?: boolean;
			start?: number;
			end?: number;
			duration?: number;
		} | null;
		if (!data) return null;
		return {
			label: "Timing Updated",
			description: data.success
				? `${formatSeconds(data.start)}-${formatSeconds(data.end)} (${formatSeconds(data.duration)})`
				: "Failed",
		};
	},
	add_text: (parsed) => {
		const data = parsed as {
			elementId?: string;
			trackId?: string;
		} | null;
		if (!data) return null;
		return {
			label: "Text Added",
			description: data.trackId ? `track ${data.trackId}` : "Inserted",
		};
	},
	update_text: (parsed) => {
		const data = parsed as {
			success?: boolean;
			updated?: Array<{ elementId: string }>;
			skipped?: string[];
		} | null;
		if (!data) return null;
		const count = data.updated?.length ?? 0;
		const skipped = data.skipped?.length ?? 0;
		return {
			label: "Text Updated",
			description: data.success
				? `${count} updated${skipped > 0 ? `, ${skipped} skipped` : ""}`
				: "Failed",
		};
	},
	load_context: (parsed) => {
		const data = parsed as {
			status?: string;
			cached?: boolean;
			context?: { kind?: string; assetName?: string };
		} | null;
		if (!data) return null;
		const assetName = data.context?.assetName;
		const cached = data.cached ? " (cached)" : "";
		return {
			label: "Load Context",
			description: assetName
				? `${assetName}${cached}`
				: `${data.status ?? "loaded"}${cached}`,
		};
	},
	list_timeline: (parsed) => {
		const data = parsed as { tracks?: unknown[] } | null;
		if (!data) return null;
		const count = data.tracks?.length ?? 0;
		return {
			label: "Timeline",
			description: `${count} track${count !== 1 ? "s" : ""}`,
		};
	},
	list_project_assets: (parsed) => {
		const data = parsed as { assets?: unknown[] } | null;
		if (!data) return null;
		const count = data.assets?.length ?? 0;
		return {
			label: "Assets",
			description: `${count} asset${count !== 1 ? "s" : ""}`,
		};
	},
	transcribe_video: (parsed) => {
		const data = parsed as {
			assetName?: string;
			language?: string;
			segmentCount?: number;
			duration?: number;
		} | null;
		if (!data) return null;
		return {
			label: "Transcript",
			description: `${data.assetName ?? "audio"} · ${data.segmentCount ?? 0} segments`,
		};
	},
	transcribe_audio: (parsed) => {
		const data = parsed as {
			assetName?: string;
			wordCount?: number;
			utteranceCount?: number;
			timingGranularity?: string;
		} | null;
		if (!data) return null;
		return {
			label: "Audio Context",
			description: `${data.assetName ?? "audio"} · ${data.wordCount ?? 0} words · ${data.timingGranularity ?? "timed"}`,
		};
	},
	list_keyframes: (parsed) => {
		const data = parsed as { keyframes?: unknown[] } | null;
		if (!data) return null;
		const count = data.keyframes?.length ?? 0;
		return {
			label: "Keyframes",
			description: `${count} keyframe${count !== 1 ? "s" : ""}`,
		};
	},
	upsert_keyframe: (parsed) => {
		const data = parsed as {
			success?: boolean;
			propertyPath?: string;
			time?: number;
		} | null;
		if (!data) return null;
		return {
			label: "Keyframe Set",
			description: data.success
				? `${data.propertyPath ?? "?"} at ${formatSeconds(data.time)}`
				: "Failed",
		};
	},
	remove_keyframe: (parsed) => {
		const data = parsed as { success?: boolean } | null;
		if (!data) return null;
		return {
			label: "Keyframe Removed",
			description: data.success ? "Done" : "Failed",
		};
	},
	update_keyframe_curve: (parsed) => {
		const data = parsed as {
			success?: boolean;
			applied?: Record<string, unknown>;
		} | null;
		if (!data) return null;
		return {
			label: "Curve Updated",
			description: data.success
				? Object.keys(data.applied ?? {}).join(", ") || "applied"
				: "Failed",
		};
	},
	list_animatable_properties: (parsed) => {
		const data = parsed as {
			elementType?: string;
			properties?: unknown[];
		} | null;
		if (!data) return null;
		const count = data.properties?.length ?? 0;
		return {
			label: "Animatable",
			description: `${data.elementType ?? "element"} · ${count} propert${count !== 1 ? "ies" : "y"}`,
		};
	},
};
