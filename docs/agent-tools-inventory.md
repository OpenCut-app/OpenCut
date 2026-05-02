# NeuralCut — Agent Tools Inventory

Complete inventory of all tools, skills, effects, masks, and animatable properties available to the video editor agent.

**Source of truth**: `apps/web/src/agent/tools/schemas.ts` — the `providerToolSchemas` array defines what gets sent to the LLM.  
**Execution**: `apps/web/src/agent/context.ts` (EditorContextAdapter).  
**Orchestration**: `apps/web/src/agent/orchestrator.ts` — dispatches tool calls, up to 20 iterations.

---

## 31 Provider-Facing Tools

### Context & Perception (read-only)

| Tool | Description | Schema | Implementation |
|------|-------------|--------|----------------|
| `load_context` | Loads media into Gemini multimodal context. Accepts `targetType` (asset or timeline_element) with `assetId`/`id` or `trackId`+`elementId`. Enables visual/audio Q&A about media content. | `schemas.ts:14` | `load-context.tool.ts` |
| `list_project_assets` | Lists project media assets with id, type, duration, and timeline usage status. Supports `filter` (all/used/unused) and `type` (all/video/audio/image). | `schemas.ts:27` | `list-project-assets.tool.ts` |
| `list_timeline` | Returns the full timeline structure: tracks with position/layer/stacking metadata and elements with id, type, start/end times, and flags for masks/effects/hidden. | `schemas.ts:37` | `list-timeline.tool.ts` |
| `get_element` | Returns full type-specific metadata for a single timeline element: transform, opacity, masks, effects, text styles, audio properties, keyframes, etc. | `schemas.ts:209` | `get-element.tool.ts` |
| `list_effects` | Lists all registered effects with id, name, description. Optional `query` filter for search. | `schemas.ts:138` | `list-effects.tool.ts` |
| `get_effect` | Returns detailed metadata for a specific effect: all parameters with types, ranges, defaults, and descriptions. | `schemas.ts:145` | `get-effect.tool.ts` |
| `list_keyframes` | Returns all keyframes for a timeline element, grouped by property path. Each keyframe includes id, time, value, interpolation. | `schemas.ts:239` | `list-keyframes.tool.ts` |
| `list_animatable_properties` | Returns which property paths support animation for a given element, with value type (number or color) and current static value. | `schemas.ts:287` | `list-animatable-properties.tool.ts` |

### Timeline Editing — Structural

| Tool | Description | Schema | Implementation |
|------|-------------|--------|----------------|
| `split` | Splits all timeline elements intersecting given times (in seconds). Does NOT delete or move content. Idempotent at boundaries. | `schemas.ts:44` | `split.tool.ts` |
| `delete_timeline_elements` | Deletes one or more elements by `elementId`. For range deletion, compose with `split` first. Validates all IDs exist before mutating. | `schemas.ts:51` | `delete-timeline-elements.tool.ts` |
| `move_timeline_elements` | Moves one or more elements to a new start time (seconds). Optional `targetTrackId` to move to another track. Preserves relative offsets for multi-element moves. | `schemas.ts:58` | `move-timeline-elements.tool.ts` |
| `duplicate_elements` | Duplicates timeline elements. Copies placed on new tracks above originals. | `schemas.ts:202` | `duplicate-elements.tool.ts` |
| `add_media_to_timeline` | Adds an existing project asset to the timeline. Requires `assetId`, `startTime`, `trackType` (main/overlay/audio). Optional `duration`. Validates asset-track compatibility and source duration limits. | `schemas.ts:69` | `add-media-to-timeline.tool.ts` |
| `update_timeline_element_timing` | Updates an element's start, end, or duration. At least one must be provided. Rejects conflicting end+duration and duration beyond source limits. | `schemas.ts:81` | `update-timeline-element-timing.tool.ts` |

### Text

| Tool | Description | Schema | Implementation |
|------|-------------|--------|----------------|
| `add_text` | Adds visual text to timeline. Supports `position` (top/center/bottom), `style` presets (plain/subtitle/hook/label), and overrides: color, fontSize, fontFamily, fontWeight, fontStyle, textAlign, letterSpacing, positionX/Y, background. | `schemas.ts:93` | `add-text.tool.ts` |
| `update_text` | Updates properties of existing text elements by `elementIds`. Non-text elements are skipped. Supports all the same style overrides as `add_text`. Bulk-apply same overrides to multiple text elements. | `schemas.ts:116` | `update-text.tool.ts` |

### Effects

| Tool | Description | Schema | Implementation |
|------|-------------|--------|----------------|
| `apply_effect` | Adds an effect as a standalone element on an effect track. Requires `effectType`, `start`, `end`. Optional `params` with effect-specific values. | `schemas.ts:152` | `apply-effect.tool.ts` |
| `update_effect` | Updates parameters of an existing effect element. Only provided params are changed. Returns full merged params after update. | `schemas.ts:164` | `update-effect.tool.ts` |

### Clip Properties (universal element editor)

| Tool | Description | Schema | Implementation |
|------|-------------|--------|----------------|
| `update_clip` | Universal property updater for any element type. Supports: `name`, `mask` (add/update/remove), `trimStart`/`trimEnd`, `opacity` (0-100), `positionX`/`positionY`, `rotation`, `scaleX`/`scaleY`, `blendMode`, `hidden`, `volume` (0-100, video/audio only), `muted` (video/audio only). | `schemas.ts:216` | `update-clip.tool.ts` |

### Keyframes & Animation

| Tool | Description | Schema | Implementation |
|------|-------------|--------|----------------|
| `upsert_keyframe` | Adds or updates a keyframe on an element. Numeric properties use `value`; color properties use `colorValue` (hex). Supports `interpolation` (linear/hold/bezier). Optional `keyframeId` for updates. | `schemas.ts:246` | `upsert-keyframe.tool.ts` |
| `remove_keyframe` | Removes a specific keyframe by `elementId`, `propertyPath`, `keyframeId`. Last keyframe removal reverts property to static value. | `schemas.ts:261` | `remove-keyframe.tool.ts` |
| `update_keyframe_curve` | Updates curve interpolation of an existing keyframe. Supports linear/bezier/step. Bezier: optional `rightHandle`/`leftHandle` as `{dt, dv}`. `tangentMode`: auto/aligned/broken/flat. | `schemas.ts:272` | `update-keyframe-curve.tool.ts` |

### Track Controls

| Tool | Description | Schema | Implementation |
|------|-------------|--------|----------------|
| `toggle_track_mute` | Toggles mute on a track (video/audio tracks only). | `schemas.ts:181` | `toggle-track-mute.tool.ts` |
| `toggle_track_visibility` | Toggles visibility on a track. Hidden tracks not rendered. | `schemas.ts:188` | `toggle-track-visibility.tool.ts` |

### History

| Tool | Description | Schema | Implementation |
|------|-------------|--------|----------------|
| `undo` | Undoes the last editing action. Returns remaining undo depth. | `schemas.ts:195` | `undo.tool.ts` |
| `redo` | Redoes the last undone action. Only works after an undo. Returns whether there are more actions to redo. | `schemas.ts:174` | `redo.tool.ts` |

### Skills (recipe-based editing)

| Tool | Description | Schema | Implementation |
|------|-------------|--------|----------------|
| `list_skills` | Lists available editing skill recipes — pre-built workflows for common patterns like viral shorts, pitch videos. Returns skill id, name, and description. | `schemas.ts:294` | `skills/list-skills.tool.ts` |
| `load_skill` | Loads full instructions for a specific skill by id. Contains recipe with sections, timing rules, text styles, effect parameters, and quality checklist. | `schemas.ts:301` | `skills/load-skill.tool.ts` |

### Plan Mode (structured workflow)

| Tool | Description | Schema | Implementation |
|------|-------------|--------|----------------|
| `submit_plan` | Submits a structured editing plan with steps. Use ONLY in plan mode after analyzing footage. Each step describes a specific action with tools to use. User reviews and approves before execution. | `schemas.ts:308` | `submit-plan.tool.ts` |
| `ask_user` | Asks the user a question during plan mode. Use when clarification is needed about intent, preferences, or content details. Optionally provides quick-reply options. | `schemas.ts:319` | `ask-user.tool.ts` |
| `request_plan_approval` | Requests user approval to switch from plan mode to execute mode. Shows modal with 'Continue planning' and 'Start editing' options. Requires explicit user approval. | `schemas.ts:329` | `request-plan-approval.tool.ts` |
| `update_plan_step` | Updates the status of a plan step during execution. Call after completing each step to track progress. Use status 'done', 'skipped', or 'in_progress'. | `schemas.ts:336` | `update-plan-step.tool.ts` |

---

## 2 Internal Tools (NOT exposed to the LLM)

| Tool | Description | Implementation |
|------|-------------|----------------|
| `transcribe_video` | Transcribes audio using Whisper (local). Returns structured transcript with segments/timestamps. Registered in toolRegistry but excluded from `providerToolSchemas` (`schemas.ts:296-297`). Used internally by the agent orchestrator. | `transcribe-video.tool.ts` |
| `echo_context` | Debug tool that returns a summary of the current editor context. Registered in toolRegistry but not in `providerToolSchemas`. | `mock.tool.ts` |

---

## 2 Built-in Skills

Defined in `apps/web/src/agent/skills/builtin/`.

| Skill ID | Name | Description |
|----------|------|-------------|
| `viral-short` | Viral Short | Creates a short-form viral video with hook, clips, text overlays, and effects |
| `pitch-video` | Pitch Video | Creates a professional pitch video with intro, key points, transitions, and outro |

---

## 29 Registered Effects

Defined in `apps/web/src/lib/effects/definitions/index.ts`.

### Color (13)

| Effect Type | Definition | Description |
|-------------|------------|-------------|
| `blur` | `blur.ts` | Gaussian blur |
| `brightness-contrast` | `brightness-contrast.ts` | Brightness and contrast adjustment |
| `grayscale` | `grayscale.ts` | Grayscale conversion |
| `saturation` | `saturation.ts` | Saturation adjustment |
| `sepia` | `sepia.ts` | Sepia tone |
| `invert` | `invert.ts` | Color inversion |
| `vignette` | `vignette.ts` | Vignette darkening |
| `hue-rotate` | `hue-rotate.ts` | Hue rotation |
| `color-temperature` | `color-temperature.ts` | Warm/cool temperature shift |
| `tint` | `tint.ts` | Color tint overlay |
| `posterize` | `posterize.ts` | Posterize (reduce color levels) |
| `duotone` | `duotone.ts` | Duotone color mapping |
| `cross-process` | `cross-process.ts` | Cross-process film look |

### Distortion (7)

| Effect Type | Definition | Description |
|-------------|------------|-------------|
| `pixelate` | `pixelate.ts` | Pixelation |
| `chromatic-aberration` | `chromatic-aberration.ts` | Chromatic aberration (RGB split) |
| `glitch` | `glitch.ts` | Glitch distortion |
| `wave` | `wave.ts` | Wave distortion |
| `mirror` | `mirror.ts` | Mirror reflection |
| `kaleidoscope` | `kaleidoscope.ts` | Kaleidoscope pattern |
| `fisheye` | `fisheye.ts` | Fisheye lens distortion |

### Light (4)

| Effect Type | Definition | Description |
|-------------|------------|-------------|
| `sharpen` | `sharpen.ts` | Sharpening |
| `glow` | `glow.ts` | Glow effect (multi-pass) |
| `exposure` | `exposure.ts` | Exposure adjustment |
| `shadows-highlights` | `shadows-highlights.ts` | Shadow/highlight recovery |

### Edges (2)

| Effect Type | Definition | Description |
|-------------|------------|-------------|
| `edge-detection` | `edge-detection.ts` | Edge detection outline |
| `emboss` | `emboss.ts` | Emboss relief effect |

### Style (4)

| Effect Type | Definition | Description |
|-------------|------------|-------------|
| `film-grain` | `film-grain.ts` | Film grain noise |
| `halftone` | `halftone.ts` | Halftone dot pattern |
| `scanlines` | `scanlines.ts` | CRT scanlines |
| `color-key` | `color-key.ts` | Chroma key / green screen |

---

## 7 Mask Types

Defined in `apps/web/src/lib/masks/types.ts`. All masks share base params: `feather`, `inverted`, `strokeColor`, `strokeWidth`, `strokeAlign`. Most also have `centerX`, `centerY`, `rotation`, `width`, `height`, `scale`.

| Mask Type | Definition | Description |
|-----------|------------|-------------|
| `rectangle` | `rectangle.ts` | Rectangular mask |
| `ellipse` | `ellipse.ts` | Elliptical/circular mask |
| `heart` | `heart.ts` | Heart-shaped mask |
| `diamond` | `diamond.ts` | Diamond-shaped mask |
| `star` | `star.ts` | Star-shaped mask |
| `split` | `split.ts` | Split-screen mask (line-based) |
| `cinematic-bars` | `cinematic-bars.ts` | Cinematic letterbox bars |

---

## 14 Animatable Properties

Defined in `apps/web/src/lib/animation/types.ts` (lines 3-18).

| Property Path | Type | Constraints | Supported Elements |
|---------------|------|-------------|-------------------|
| `transform.positionX` | number | — | Visual (video, image, text, sticker, graphic) |
| `transform.positionY` | number | — | Visual |
| `transform.scaleX` | number | min: `MIN_TRANSFORM_SCALE` | Visual |
| `transform.scaleY` | number | min: `MIN_TRANSFORM_SCALE` | Visual |
| `transform.rotate` | number | -360 to 360 | Visual |
| `opacity` | number | 0 to 1 | Visual |
| `volume` | number | `VOLUME_DB_MIN` to `VOLUME_DB_MAX` | Elements with audio (video, audio) |
| `color` | color | hex string | Text |
| `background.color` | color | hex string | Text |
| `background.paddingX` | number | min: 0 | Text |
| `background.paddingY` | number | min: 0 | Text |
| `background.offsetX` | number | — | Text |
| `background.offsetY` | number | — | Text |
| `background.cornerRadius` | number | `CORNER_RADIUS_MIN` to `CORNER_RADIUS_MAX` | Text |

Dynamic path types for extension:
- `params.{key}` — graphic element params
- `effects.{idx}.params.{key}` — per-element effect params

---

## Architecture Files

| File | Purpose |
|------|---------|
| `apps/web/src/agent/types.ts` | Agent type definitions: `ToolDefinition`, `ToolSchema`, `AgentContext`, `ChatMessage`, `ToolCall`, `ToolResult` |
| `apps/web/src/agent/tools/schemas.ts` | Single source of truth for all tool schemas + `providerToolSchemas` array |
| `apps/web/src/agent/tools/index.ts` | Barrel that registers all tools via side-effect imports |
| `apps/web/src/agent/tools/registry.ts` | Generic `DefinitionRegistry<string, ToolDefinition>` |
| `apps/web/src/agent/skills/index.ts` | Barrel that registers all skills via side-effect imports |
| `apps/web/src/agent/skills/registry.ts` | Skill definition registry |
| `apps/web/src/agent/orchestrator.ts` | Agent loop: sends to LLM, resolves tool calls, up to 20 iterations |
| `apps/web/src/agent/context.ts` | `EditorContextAdapter` — the ONLY file that imports EditorCore. All tool execution logic. |
| `apps/web/src/agent/system-prompt.ts` | Builds system prompt from context + tool summaries |
| `apps/web/src/agent/tools/resolve-element-ids.ts` | Helper to resolve element IDs from various formats |
| `apps/web/src/agent/context-mapper.ts` | Maps editor state to `AgentContext` (testable without WASM) |

## Design Principles

1. **Tools are small, actionable, composable** — no "make me a reel" mega-tools.
2. **Tools receive structured data, not free-form instructions.**
3. **Tools use existing editor commands** to preserve undo/redo.
4. **Agent must call `list_project_assets` and `list_timeline` before editing** when it lacks concrete IDs.
5. **Gemini handles multimodal understanding**; editing is deterministic via tools.
6. **`split` does NOT delete** — compose `split` + `delete_timeline_elements` for range removal.
7. **Plan mode** enables structured workflow: submit_plan → request_plan_approval → update_plan_step for execution tracking.
8. **Skills** provide pre-built recipes for common editing patterns, composable with standard tools.