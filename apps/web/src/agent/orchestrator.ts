import type {
	AgentContext,
	ChatMessage,
	ToolCall,
	ToolDefinition,
	ToolResult,
} from "@/agent/types";
import { toolRegistry } from "@/agent/tools/registry";
import "@/agent/tools";
import { useChatStore } from "@/stores/chat-store";
import { useAgentStore } from "@/stores/agent-store";

const MAX_ITERATIONS = 20;

const WRITE_TOOLS = new Set([
	"split",
	"delete_timeline_elements",
	"move_timeline_elements",
	"duplicate_elements",
	"add_media_to_timeline",
	"update_timeline_element_timing",
	"add_text",
	"update_text",
	"apply_effect",
	"update_effect",
	"update_clip",
	"undo",
	"redo",
	"toggle_track_mute",
	"toggle_track_visibility",
	"upsert_keyframe",
	"remove_keyframe",
	"update_keyframe_curve",
]);

const PLAN_ONLY_TOOLS = new Set([
	"submit_plan",
	"ask_user",
	"request_plan_approval",
]);

const EXECUTE_ONLY_TOOLS = new Set(["update_plan_step"]);

interface APIResponse {
	content: string;
	toolCalls?: ToolCall[];
}

export async function run(
	messages: ChatMessage[],
	context: AgentContext,
): Promise<void> {
	const agentStore = useAgentStore.getState();
	const chatStore = useChatStore.getState();

	agentStore.setContext(context);
	agentStore.setStatus("sending");

	const workingMessages = [...messages];

	try {
		let iterations = 0;
		let hitCap = false;

		while (iterations < MAX_ITERATIONS) {
			iterations++;

			const liveMode = useAgentStore.getState().mode;
			const liveContext: AgentContext = { ...context, mode: liveMode };

			const response = await fetch("/api/agent/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					messages: workingMessages,
					context: liveContext,
				}),
			});

			if (!response.ok) {
				let detail = "";
				try {
					const errBody = await response.json();
					detail = errBody?.error ?? JSON.stringify(errBody);
				} catch {
					detail = response.statusText;
				}
				throw new Error(`API error ${response.status}: ${detail}`);
			}

			const data: APIResponse = await response.json();

			if (!data.toolCalls || data.toolCalls.length === 0) {
				if (!data.content || data.content.trim().length === 0) {
					throw new Error("Empty response from provider");
				}
				chatStore.addMessage({
					role: "assistant",
					content: data.content,
				});
				break;
			}

			agentStore.setStatus("processing");

			chatStore.addMessage({
				role: "assistant",
				content: data.content,
				toolCalls: data.toolCalls,
			});
			workingMessages.push({
				id: "",
				role: "assistant",
				content: data.content,
				toolCalls: data.toolCalls,
				timestamp: Date.now(),
			});

			const toolResults = await resolveToolCalls(data.toolCalls, context);

			for (const tr of toolResults) {
				const content = tr.error
					? `Error in ${tr.name}: ${tr.error}`
					: JSON.stringify(tr.result);

				chatStore.addMessage({
					role: "tool_result",
					content,
					toolCallId: tr.toolCallId,
				});
				workingMessages.push({
					id: "",
					role: "tool_result",
					content,
					toolCallId: tr.toolCallId,
					timestamp: Date.now(),
				});
			}

			if (iterations >= MAX_ITERATIONS) {
				hitCap = true;
			}
		}

		if (hitCap) {
			chatStore.addMessage({
				role: "assistant",
				content:
					"I've reached the maximum number of reasoning steps. Please continue the conversation for further assistance.",
			});
		}

		agentStore.setStatus("idle");
		chatStore.setLoading(false);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Unknown orchestrator error";
		console.error("[orchestrator] Error:", message);
		chatStore.setError(message);
		agentStore.setStatus("error");
	}
}

// ---------------------------------------------------------------------------
// Arg validation
// ---------------------------------------------------------------------------

/**
 * Validates tool arguments against the tool's parameter schema.
 * Returns an error string on failure, or null if args are valid.
 */
function validateToolArgs(
	toolDef: ToolDefinition,
	args: Record<string, unknown>,
): string | null {
	for (const param of toolDef.parameters) {
		if (!param.required) continue;

		const value = args[param.key];

		if (value === undefined || value === null) {
			return `Missing required argument: ${param.key}`;
		}

		const actualType = typeof value;
		if (param.type === "string" && actualType !== "string") {
			return `Argument "${param.key}" must be a string, got ${actualType}`;
		}
		if (param.type === "number" && actualType !== "number") {
			return `Argument "${param.key}" must be a number, got ${actualType}`;
		}
		if (param.type === "boolean" && actualType !== "boolean") {
			return `Argument "${param.key}" must be a boolean, got ${actualType}`;
		}
		if (
			param.type === "number[]" &&
			(!Array.isArray(value) ||
				!value.every((item) => typeof item === "number"))
		) {
			return `Argument "${param.key}" must be an array of numbers`;
		}
		if (
			param.type === "string[]" &&
			(!Array.isArray(value) ||
				!value.every((item) => typeof item === "string"))
		) {
			return `Argument "${param.key}" must be an array of strings`;
		}
	}

	return null;
}

// ---------------------------------------------------------------------------
// Tool resolution
// ---------------------------------------------------------------------------

async function resolveToolCalls(
	toolCalls: ToolCall[],
	context: AgentContext,
): Promise<ToolResult[]> {
	const agentStore = useAgentStore.getState();
	const results: ToolResult[] = [];
	const currentMode = useAgentStore.getState().mode;

	for (const tc of toolCalls) {
		useAgentStore.getState().setActiveTool(tc.name);

		if (currentMode === "plan" && WRITE_TOOLS.has(tc.name)) {
			results.push({
				toolCallId: tc.id,
				name: tc.name,
				result: null,
				error: `Cannot use '${tc.name}' in plan mode. This tool modifies the timeline. Use submit_plan to finalize your plan, then request_plan_approval to switch to execute mode.`,
			});
			continue;
		}

		if (currentMode === "plan" && EXECUTE_ONLY_TOOLS.has(tc.name)) {
			results.push({
				toolCallId: tc.id,
				name: tc.name,
				result: null,
				error: `Cannot use '${tc.name}' in plan mode. This tool is only available during execution.`,
			});
			continue;
		}

		if (currentMode === "execute" && PLAN_ONLY_TOOLS.has(tc.name)) {
			results.push({
				toolCallId: tc.id,
				name: tc.name,
				result: null,
				error: `Cannot use '${tc.name}' in execute mode. This tool is only available during planning.`,
			});
			continue;
		}

		const currentPermissionMode = useAgentStore.getState().permissionMode;
		if (currentPermissionMode === "ask" && WRITE_TOOLS.has(tc.name)) {
			const approved = await requestApproval(tc);
			if (!approved) {
				results.push({
					toolCallId: tc.id,
					name: tc.name,
					result: null,
					error: "User denied permission",
				});
				continue;
			}
		}

		try {
			const tool = toolRegistry.get(tc.name);

			const validationError = validateToolArgs(tool, tc.args);
			if (validationError) {
				results.push({
					toolCallId: tc.id,
					name: tc.name,
					result: null,
					error: validationError,
				});
				continue;
			}

			const result = await tool.execute(tc.args, context);
			results.push({ toolCallId: tc.id, name: tc.name, result });
		} catch (error) {
			results.push({
				toolCallId: tc.id,
				name: tc.name,
				result: null,
				error: error instanceof Error ? error.message : "Tool execution failed",
			});
		}
	}

	agentStore.setActiveTool(null);
	return results;
}

function requestApproval(toolCall: ToolCall): Promise<boolean> {
	return new Promise((resolve) => {
		const agentStore = useAgentStore.getState();
		agentStore.setPendingApproval({ toolCall, resolve });
	});
}
