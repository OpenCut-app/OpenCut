import type { AgentContext, ToolDefinition } from "@/agent/types";
import { toolRegistry } from "@/agent/tools/registry";
import { requestPlanApprovalSchema } from "@/agent/tools/schemas";
import { useAgentStore } from "@/stores/agent-store";
import { usePlanStore } from "@/stores/plan-store";
import type { AgentMode } from "@/agent/types";

const requestPlanApprovalTool: ToolDefinition = {
	...requestPlanApprovalSchema,
	execute: async (
		_args: Record<string, unknown>,
		_context: AgentContext,
	): Promise<{ approved: boolean; mode: AgentMode } | { error: string }> => {
		const planStore = usePlanStore.getState();
		if (!planStore.plan) {
			return {
				error: "No plan has been submitted yet. Call submit_plan first.",
			};
		}

		useAgentStore.getState().setMode("plan");
		planStore.updatePlanStatus("awaiting_approval");

		return new Promise((resolve) => {
			useAgentStore.getState().setPendingModeTransition({
				targetMode: "execute",
				resolve: (approved) => {
					useAgentStore.getState().setPendingModeTransition(null);
					if (approved) {
						useAgentStore.getState().setMode("execute");
						usePlanStore.getState().updatePlanStatus("executing");
					} else {
						useAgentStore.getState().setMode("plan");
						usePlanStore.getState().updatePlanStatus("awaiting_approval");
					}
					resolve({
						approved,
						mode: approved ? "execute" : "plan",
					});
				},
			});
		});
	},
};

toolRegistry.register(requestPlanApprovalSchema.name, requestPlanApprovalTool);
