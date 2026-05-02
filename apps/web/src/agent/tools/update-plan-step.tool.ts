import type { AgentContext, ToolDefinition } from "@/agent/types";
import { toolRegistry } from "@/agent/tools/registry";
import { updatePlanStepSchema } from "@/agent/tools/schemas";
import { usePlanStore } from "@/stores/plan-store";
import type { PlanStepStatus } from "@/agent/types";

const VALID_STATUSES: PlanStepStatus[] = [
	"pending",
	"in_progress",
	"done",
	"skipped",
];

const updatePlanStepTool: ToolDefinition = {
	...updatePlanStepSchema,
	execute: async (
		args: Record<string, unknown>,
		_context: AgentContext,
	):
		| { success: boolean; stepId: string; status: string }
		| { error: string } => {
		const { stepId, status, result } = args as {
			stepId: string;
			status: string;
			result?: string;
		};

		if (!stepId || typeof stepId !== "string") {
			return { error: "stepId is required" };
		}

		if (!VALID_STATUSES.includes(status as PlanStepStatus)) {
			return {
				error: `Invalid status: ${status}. Must be one of: ${VALID_STATUSES.join(", ")}`,
			};
		}

		const planStore = usePlanStore.getState();
		const plan = planStore.plan;
		if (!plan) {
			return { error: "No active plan" };
		}

		const step = plan.steps.find((s) => s.id === stepId);
		if (!step) {
			return {
				error: `Step not found: ${stepId}. Available: ${plan.steps.map((s) => s.id).join(", ")}`,
			};
		}

		planStore.updateStepStatus(stepId, status as PlanStepStatus, result);

		return { success: true, stepId, status };
	},
};

toolRegistry.register(updatePlanStepSchema.name, updatePlanStepTool);
