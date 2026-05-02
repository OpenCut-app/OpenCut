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
	): Promise<
		| { success: boolean; step: number; stepId: string; status: string }
		| { error: string }
	> => {
		const { stepId, status, result } = args as {
			step?: number;
			stepId?: string;
			status: string;
			result?: string;
		};

		const stepNumber = args.step as number | undefined;

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

		let resolvedStepId: string | undefined;

		if (stepNumber !== undefined && stepNumber !== null) {
			const index = Math.floor(stepNumber) - 1;
			if (index < 0 || index >= plan.steps.length) {
				return {
					error: `Step ${stepNumber} out of range. Plan has ${plan.steps.length} steps (1-${plan.steps.length}).`,
				};
			}
			resolvedStepId = plan.steps[index].id;
		} else if (stepId && typeof stepId === "string") {
			resolvedStepId = stepId;
		} else {
			return { error: "Pass step (1-based number) or stepId" };
		}

		const step = plan.steps.find((s) => s.id === resolvedStepId);
		if (!step) {
			return {
				error: `Step not found. Use step number (1-${plan.steps.length}) instead.`,
			};
		}

		planStore.updateStepStatus(resolvedStepId, status as PlanStepStatus, result);

		return {
			success: true,
			step: plan.steps.findIndex((s) => s.id === resolvedStepId) + 1,
			stepId: resolvedStepId,
			status,
		};
	},
};

toolRegistry.register(updatePlanStepSchema.name, updatePlanStepTool);
