/**
 * Client-only barrel for agent tools. Importing this file registers every
 * tool with `toolRegistry` via side effects.
 *
 * IMPORTANT: do NOT import this from server code. Tool modules transitively
 * import EditorContextAdapter, which touches WASM/EditorCore (browser-only).
 * Server code should import schemas from `./schemas` instead.
 *
 * To add a new tool: declare its schema in `./schemas.ts`, create the
 * `*.tool.ts` file, then add a single side-effect import below.
 */

import "@/agent/tools/load-context.tool";
import "@/agent/tools/list-project-assets.tool";
import "@/agent/tools/list-timeline.tool";
import "@/agent/tools/get-element.tool";
import "@/agent/tools/split.tool";
import "@/agent/tools/delete-timeline-elements.tool";
import "@/agent/tools/move-timeline-elements.tool";
import "@/agent/tools/duplicate-elements.tool";
import "@/agent/tools/add-media-to-timeline.tool";
import "@/agent/tools/update-timeline-element-timing.tool";
import "@/agent/tools/add-text.tool";
import "@/agent/tools/update-text.tool";
import "@/agent/tools/list-effects.tool";
import "@/agent/tools/get-effect.tool";
import "@/agent/tools/apply-effect.tool";
import "@/agent/tools/update-effect.tool";
import "@/agent/tools/update-clip.tool";
import "@/agent/tools/undo.tool";
import "@/agent/tools/redo.tool";
import "@/agent/tools/toggle-track-mute.tool";
import "@/agent/tools/toggle-track-visibility.tool";
import "@/agent/tools/list-keyframes.tool";
import "@/agent/tools/upsert-keyframe.tool";
import "@/agent/tools/remove-keyframe.tool";
import "@/agent/tools/update-keyframe-curve.tool";
import "@/agent/tools/list-animatable-properties.tool";
import "@/agent/skills/list-skills.tool";
import "@/agent/skills/load-skill.tool";
import "@/agent/tools/submit-plan.tool";
import "@/agent/tools/ask-user.tool";
import "@/agent/tools/request-plan-approval.tool";
import "@/agent/tools/update-plan-step.tool";
