import type { ToolSchema } from "@/agent/types";

/**
 * Single source of truth for agent tool schemas.
 *
 * Both the server route (provider-facing schema list) and the client tool
 * definitions (`*.tool.ts`) import from here. This guarantees that the
 * description and parameters the model sees are exactly what the executor
 * validates against — no drift possible.
 *
 * Pure data: no side effects, no EditorCore imports. Safe for server use.
 */

export const loadContextSchema: ToolSchema = {
	name: "load_context",
	description:
		"Loads Gemini multimodal context for a project asset or timeline element. For media: targetType='asset' with assetId. For timeline elements (text, clips): targetType='timeline_element' with elementId — trackId is optional, the element will be found across all tracks automatically.",
	parameters: [
		{ key: "targetType", type: "string", required: true },
		{ key: "id", type: "string", required: false },
		{ key: "assetId", type: "string", required: false },
		{ key: "trackId", type: "string", required: false },
		{ key: "elementId", type: "string", required: false },
	],
};

export const transcribeAudioSchema: ToolSchema = {
	name: "transcribe_audio",
	description:
		"Transcribes a video or audio asset with precise word-level timing. Returns full text, per-word start/end times, confidence scores, and utterance segments. Use this when you need exact spoken words, timestamps for subtitles, or silence detection. Pass assetId to target a specific asset, or omit to auto-select the first video/audio asset.",
	parameters: [
		{ key: "assetId", type: "string", required: false },
		{ key: "language", type: "string", required: false },
	],
};

export const listProjectAssetsSchema: ToolSchema = {
	name: "list_project_assets",
	description:
		"Lists project media assets with stable ids, type, duration, and whether each asset is used in the active timeline.",
	parameters: [
		{ key: "filter", type: "string", required: false },
		{ key: "type", type: "string", required: false },
	],
};

export const listTimelineSchema: ToolSchema = {
	name: "list_timeline",
	description:
		"Lists the active timeline as structured tracks and editable elements with layer metadata. Element start/end values are in seconds. Tracks include position (top-to-bottom timeline row), visualLayer (higher renders above lower, null for audio), isVisualLayer, and stacking. Use this to understand which clips visually cover others and to discover ids before load_context.",
	parameters: [],
};

export const splitSchema: ToolSchema = {
	name: "split",
	description:
		"Splits timeline elements at one or more requested timeline times in seconds without deleting, trimming, or moving content. Use one time for a single cut, or multiple times to isolate ranges before separate edit/delete operations.",
	parameters: [{ key: "times", type: "number[]", required: true }],
};

export const deleteTimelineElementsSchema: ToolSchema = {
	name: "delete_timeline_elements",
	description:
		"Deletes one or more timeline elements by elementId. Use list_timeline first to discover exact elementIds. To delete a time range, split at the range boundaries first, then delete the isolated elementIds.",
	parameters: [{ key: "elementIds", type: "string[]", required: true }],
};

export const moveTimelineElementsSchema: ToolSchema = {
	name: "move_timeline_elements",
	description:
		"Moves one or more existing timeline elements to a new timeline start time in seconds. For multiple elements, the earliest selected element is moved to start and the others preserve their relative offsets. Optionally pass targetTrackId to move them to another compatible track.",
	parameters: [
		{ key: "elementIds", type: "string[]", required: true },
		{ key: "start", type: "number", required: true },
		{ key: "targetTrackId", type: "string", required: false },
	],
};

export const addMediaToTimelineSchema: ToolSchema = {
	name: "add_media_to_timeline",
	description:
		"Adds an existing project media asset to the active timeline. Use list_project_assets first to discover assetId. startTime and optional duration are in timeline seconds. trackType must be main, overlay, or audio.",
	parameters: [
		{ key: "assetId", type: "string", required: true },
		{ key: "startTime", type: "number", required: true },
		{ key: "trackType", type: "string", required: true },
		{ key: "duration", type: "number", required: false },
	],
};

export const updateTimelineElementTimingSchema: ToolSchema = {
	name: "update_timeline_element_timing",
	description:
		"Updates an existing timeline element's timing. Use list_timeline first to discover elementId. start, end, and duration are timeline seconds; pass at least one of start, end, or duration.",
	parameters: [
		{ key: "elementId", type: "string", required: true },
		{ key: "start", type: "number", required: false },
		{ key: "end", type: "number", required: false },
		{ key: "duration", type: "number", required: false },
	],
};

export const addTextSchema: ToolSchema = {
	name: "add_text",
	description:
		"Adds visual text to the active timeline. start and end are seconds. position must be exactly one of: 'top', 'center', or 'bottom'. style: 'plain', 'subtitle' (white on black bg), 'hook' (large bold), or 'label'. Override defaults with color (hex), fontSize, fontFamily, fontWeight, fontStyle, textAlign, letterSpacing, positionX/positionY (-50 to 50), or background.",
	parameters: [
		{ key: "text", type: "string", required: true },
		{ key: "start", type: "number", required: true },
		{ key: "end", type: "number", required: true },
		{ key: "position", type: "string", required: true },
		{ key: "style", type: "string", required: false },
		{ key: "color", type: "string", required: false },
		{ key: "fontSize", type: "number", required: false },
		{ key: "fontFamily", type: "string", required: false },
		{ key: "fontWeight", type: "string", required: false },
		{ key: "fontStyle", type: "string", required: false },
		{ key: "textAlign", type: "string", required: false },
		{ key: "letterSpacing", type: "number", required: false },
		{ key: "positionX", type: "number", required: false },
		{ key: "positionY", type: "number", required: false },
		{ key: "background", type: "object", required: false },
	],
};

export const updateTextSchema: ToolSchema = {
	name: "update_text",
	description:
		"Updates visual properties of existing text elements. Pass elementIds (from list_timeline) and any properties to change. All listed elements receive the same overrides — use for bulk styling. Non-text elements in the list are skipped.",
	parameters: [
		// "array" (not "string[]") so the orchestrator validator stays
		// tolerant of CSV-string fallback handled by resolveElementIds.
		{ key: "elementIds", type: "array", required: true },
		{ key: "content", type: "string", required: false },
		{ key: "color", type: "string", required: false },
		{ key: "fontSize", type: "number", required: false },
		{ key: "fontFamily", type: "string", required: false },
		{ key: "fontWeight", type: "string", required: false },
		{ key: "fontStyle", type: "string", required: false },
		{ key: "textAlign", type: "string", required: false },
		{ key: "letterSpacing", type: "number", required: false },
		{ key: "positionX", type: "number", required: false },
		{ key: "positionY", type: "number", required: false },
		{ key: "background", type: "object", required: false },
	],
};

export const listEffectsSchema: ToolSchema = {
	name: "list_effects",
	description:
		"Lists all available effects that can be applied to visual timeline elements. Returns each effect's id, name, and description of what it does. Use this to discover effects before calling get_effect for parameter details.",
	parameters: [{ key: "query", type: "string", required: false }],
};

export const getEffectSchema: ToolSchema = {
	name: "get_effect",
	description:
		"Returns detailed metadata for a specific effect, including all configurable parameters with their types, ranges, defaults, and descriptions. Use this after list_effects to understand how to configure an effect before calling apply_effect.",
	parameters: [{ key: "effectType", type: "string", required: true }],
};

export const applyEffectSchema: ToolSchema = {
	name: "apply_effect",
	description:
		"Adds an effect element to the timeline on an effect track, like dragging an effect from the effects panel. The effect covers the time range from start to end (in seconds). Use list_effects to discover available effects, get_effect to learn their parameters, then apply_effect with the desired params. Default parameter values are used when params are omitted.",
	parameters: [
		{ key: "effectType", type: "string", required: true },
		{ key: "start", type: "number", required: true },
		{ key: "end", type: "number", required: true },
		{ key: "params", type: "object", required: false },
	],
};

export const updateEffectSchema: ToolSchema = {
	name: "update_effect",
	description:
		"Updates parameters of an existing effect element on the timeline. Use list_timeline to find the elementId of the effect, then pass the params you want to change. Only the provided parameters are updated; others keep their current values. Use get_effect to discover valid parameter keys and ranges.",
	parameters: [
		{ key: "elementId", type: "string", required: true },
		{ key: "params", type: "object", required: true },
	],
};

export const redoSchema: ToolSchema = {
	name: "redo",
	description:
		"Redoes the last undone action. Only works after an undo. Returns whether there are more actions to redo.",
	parameters: [],
};

export const toggleTrackMuteSchema: ToolSchema = {
	name: "toggle_track_mute",
	description:
		"Toggles mute on a timeline track. Use list_timeline to discover trackIds. Only works on tracks that support audio (video and audio tracks). Returns the new muted state.",
	parameters: [{ key: "trackId", type: "string", required: true }],
};

export const toggleTrackVisibilitySchema: ToolSchema = {
	name: "toggle_track_visibility",
	description:
		"Toggles visibility on a timeline track. Hidden tracks are not rendered in the preview. Use list_timeline to discover trackIds. Returns the new hidden state.",
	parameters: [{ key: "trackId", type: "string", required: true }],
};

export const undoSchema: ToolSchema = {
	name: "undo",
	description:
		"Undoes the last editing action performed by any tool. Use this to revert mistakes. Returns the remaining undo stack depth. Consecutive calls undo earlier actions.",
	parameters: [],
};

export const duplicateElementsSchema: ToolSchema = {
	name: "duplicate_elements",
	description:
		"Duplicates one or more timeline elements. The copies are placed on new tracks above the originals. Use list_timeline to discover elementIds first.",
	parameters: [{ key: "elementIds", type: "string[]", required: true }],
};

export const getElementSchema: ToolSchema = {
	name: "get_element",
	description:
		"Returns full metadata for a single timeline element. Use list_timeline to discover elementIds, then get_element for deep inspection. Returns type-specific properties: video/image/graphic elements include transform, opacity, blendMode, masks, hidden, and applied effects. Text elements include content, font styles, background, transform. Audio elements include volume, muted. Effect elements include effectType and all parameter values.",
	parameters: [{ key: "elementId", type: "string", required: true }],
};

export const updateClipSchema: ToolSchema = {
	name: "update_clip",
	description:
		"Updates properties of any timeline element (video, image, graphic, text, sticker, audio, effect). Use list_timeline to discover elementId, then get_element to inspect current values. Only provide the properties you want to change. mask: { action: 'add', maskType } to add, { action: 'update', params: {...} } to modify, { action: 'remove' } to delete. Mask types: rectangle, ellipse, heart, diamond, star, split, cinematic-bars. Only video/image/graphic support masks. name: rename the element. trimStart/trimEnd: seconds to trim from the source start/end (slip trim without moving the clip). opacity: 0-100. positionX/positionY: position offset. rotation: degrees. scaleX/scaleY: scale factor. blendMode: normal, darken, multiply, screen, etc. hidden: boolean. volume: 0-100 (video/audio only). muted: boolean (video/audio only).",
	parameters: [
		{ key: "elementId", type: "string", required: true },
		{ key: "name", type: "string", required: false },
		{ key: "mask", type: "object", required: false },
		{ key: "trimStart", type: "number", required: false },
		{ key: "trimEnd", type: "number", required: false },
		{ key: "opacity", type: "number", required: false },
		{ key: "positionX", type: "number", required: false },
		{ key: "positionY", type: "number", required: false },
		{ key: "rotation", type: "number", required: false },
		{ key: "scaleX", type: "number", required: false },
		{ key: "scaleY", type: "number", required: false },
		{ key: "blendMode", type: "string", required: false },
		{ key: "hidden", type: "boolean", required: false },
		{ key: "volume", type: "number", required: false },
		{ key: "muted", type: "boolean", required: false },
	],
};

export const listKeyframesSchema: ToolSchema = {
	name: "list_keyframes",
	description:
		"Returns all keyframes for a timeline element, grouped by animated property. Each keyframe includes an id, time (seconds from element start), value, and interpolation type. Use this to inspect existing animations before modifying them. Use list_timeline to discover elementIds.",
	parameters: [{ key: "elementId", type: "string", required: true }],
};

export const upsertKeyframeSchema: ToolSchema = {
	name: "upsert_keyframe",
	description:
		"Adds or updates a keyframe on a timeline element's animated property. time is seconds from element start. For numeric properties (opacity, position, scale, rotation, volume, padding, cornerRadius), pass value as a number. For color properties (color, background.color), pass colorValue as a hex string like '#ff0000'. interpolation can be linear, hold, or bezier. Use list_animatable_properties to discover valid propertyPaths for an element. Use list_keyframes to get existing keyframeId for updates.",
	parameters: [
		{ key: "elementId", type: "string", required: true },
		{ key: "propertyPath", type: "string", required: true },
		{ key: "time", type: "number", required: true },
		{ key: "value", type: "number", required: false },
		{ key: "colorValue", type: "string", required: false },
		{ key: "interpolation", type: "string", required: false },
		{ key: "keyframeId", type: "string", required: false },
	],
};

export const removeKeyframeSchema: ToolSchema = {
	name: "remove_keyframe",
	description:
		"Removes a specific keyframe from a timeline element. Use list_keyframes to discover keyframeIds. When the last keyframe on a property is removed, the property reverts to its static value.",
	parameters: [
		{ key: "elementId", type: "string", required: true },
		{ key: "propertyPath", type: "string", required: true },
		{ key: "keyframeId", type: "string", required: true },
	],
};

export const updateKeyframeCurveSchema: ToolSchema = {
	name: "update_keyframe_curve",
	description:
		"Updates the curve/interpolation of an existing scalar keyframe. interpolation can be linear, bezier, or step. For bezier curves, optionally pass rightHandle and leftHandle as {dt, dv} offsets from the keyframe point. tangentMode can be auto, aligned, broken, or flat. Use list_keyframes to discover keyframeIds.",
	parameters: [
		{ key: "elementId", type: "string", required: true },
		{ key: "propertyPath", type: "string", required: true },
		{ key: "keyframeId", type: "string", required: true },
		{ key: "interpolation", type: "string", required: false },
		{ key: "rightHandle", type: "object", required: false },
		{ key: "leftHandle", type: "object", required: false },
		{ key: "tangentMode", type: "string", required: false },
	],
};

export const listAnimatablePropertiesSchema: ToolSchema = {
	name: "list_animatable_properties",
	description:
		"Returns the list of property paths that support animation for a given timeline element. Each property includes its path, value type (number or color), and current static value. Use this before calling upsert_keyframe to discover which properties can be animated.",
	parameters: [{ key: "elementId", type: "string", required: true }],
};

export const listSkillsSchema: ToolSchema = {
	name: "list_skills",
	description:
		"Lists available editing skill recipes — pre-built workflows for common editing patterns like viral shorts, pitch videos, and more. Each skill contains a structured recipe with specific tool sequences, timing, and styling rules. Returns skill id, name, and short description. Use this to discover relevant skills, then call load_skill to get full instructions and apply them.",
	parameters: [{ key: "query", type: "string", required: false }],
};

export const loadSkillSchema: ToolSchema = {
	name: "load_skill",
	description:
		"Loads the full instructions for a specific skill by its id. After loading, follow the skill's instructions to accomplish the user's request using the standard editing tools (split, add_text, apply_effect, upsert_keyframe, etc.). Each skill contains a complete recipe with sections, timing rules, text styles, effect parameters, and a quality checklist. Always call list_skills first to discover available skills.",
	parameters: [{ key: "skillId", type: "string", required: true }],
};

export const submitPlanSchema: ToolSchema = {
	name: "submit_plan",
	description:
		"Submits a structured editing plan with numbered steps for user approval. Returns step IDs — use update_plan_step with the step number (1, 2, 3...) to track progress. Each step needs a description and tools array.",
	parameters: [
		{ key: "summary", type: "string", required: true },
		{ key: "steps", type: "array", required: true },
		{ key: "questions", type: "array", required: false },
	],
};

export const askUserSchema: ToolSchema = {
	name: "ask_user",
	description:
		"Asks the user a question before or during planning. Use when you need clarification about their intent, preferences, or content details before finalizing the plan. Optionally provide quick-reply options for common answers. The user can also type a free-form response.",
	parameters: [
		{ key: "question", type: "string", required: true },
		{ key: "options", type: "array", required: false },
	],
};

export const requestPlanApprovalSchema: ToolSchema = {
	name: "request_plan_approval",
	description:
		"Requests user approval to switch from planning to editing for an already submitted plan. Usually you do not need this because submit_plan already waits for approval. The user sees a plan card with Keep planning and Go edit options.",
	parameters: [],
};

export const updatePlanStepSchema: ToolSchema = {
	name: "update_plan_step",
	description:
		"Updates the status of a plan step during execution. Prefer using step (1-based number matching plan order) over stepId. The plan panel updates in real-time. Use status 'in_progress' when starting, 'done' for successful completion, or 'skipped' if unnecessary.",
	parameters: [
		{ key: "step", type: "number", required: false },
		{ key: "stepId", type: "string", required: false },
		{ key: "status", type: "string", required: true },
		{ key: "result", type: "string", required: false },
	],
};

/**
 * The exact list of schemas exposed to the LLM.
 * Excludes internal-only tools (transcribe_video, mock).
 */
export const providerToolSchemas: ToolSchema[] = [
	loadContextSchema,
	transcribeAudioSchema,
	listProjectAssetsSchema,
	listTimelineSchema,
	getElementSchema,
	splitSchema,
	deleteTimelineElementsSchema,
	moveTimelineElementsSchema,
	duplicateElementsSchema,
	addMediaToTimelineSchema,
	updateTimelineElementTimingSchema,
	addTextSchema,
	updateTextSchema,
	listEffectsSchema,
	getEffectSchema,
	applyEffectSchema,
	updateEffectSchema,
	updateClipSchema,
	undoSchema,
	redoSchema,
	toggleTrackMuteSchema,
	toggleTrackVisibilitySchema,
	listKeyframesSchema,
	upsertKeyframeSchema,
	removeKeyframeSchema,
	updateKeyframeCurveSchema,
	listAnimatablePropertiesSchema,
	listSkillsSchema,
	loadSkillSchema,
	submitPlanSchema,
	askUserSchema,
	requestPlanApprovalSchema,
	updatePlanStepSchema,
];
