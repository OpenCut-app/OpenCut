import type { AgentContext, ToolDefinition } from "@/agent/types";
import { toolRegistry } from "@/agent/tools/registry";
import { submitPlanSchema } from "@/agent/tools/schemas";
import { usePlanStore, createPlanFromSteps } from "@/stores/plan-store";

const submitPlanTool: ToolDefinition = {
	...submitPlanSchema,
	execute: async (
		args: Record<string, unknown>,
		_context: AgentContext,
	): Promise<{ planId: string; stepCount: number } | { error: string }> => {
		const { summary, steps, questions } = args as {
			summary: string;
			steps: Array<{ description: string; tools: string[] }>;
			questions?: string[];
		};

		if (!summary || typeof summary !== "string") {
			return { error: "summary is required and must be a string" };
		}

		if (!Array.isArray(steps) || steps.length === 0) {
			return { error: "steps must be a non-empty array" };
		}

		for (const [i, step] of steps.entries()) {
			if (!step.description || typeof step.description !== "string") {
				return { error: `Step ${i + 1} must have a description string` };
			}
			if (!Array.isArray(step.tools)) {
				return { error: `Step ${i + 1} must have a tools array` };
			}
		}

		const plan = createPlanFromSteps(summary, steps, questions);
		usePlanStore.getState().setPlan(plan);

		return { planId: plan.id, stepCount: plan.steps.length };
	},
};

toolRegistry.register(submitPlanSchema.name, submitPlanTool);
