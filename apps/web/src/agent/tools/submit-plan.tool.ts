import type { AgentContext, ToolDefinition } from "@/agent/types";
import { toolRegistry } from "@/agent/tools/registry";
import { submitPlanSchema } from "@/agent/tools/schemas";
import { usePlanStore, createPlanFromSteps } from "@/stores/plan-store";
import { useAgentStore } from "@/stores/agent-store";

type SubmittedStep = { description: string; tools: string[] };

const submitPlanTool: ToolDefinition = {
	...submitPlanSchema,
	execute: async (
		args: Record<string, unknown>,
		_context: AgentContext,
	): Promise<
		| {
				planId: string;
				stepCount: number;
				nextAction: "request_plan_approval";
		  }
		| { error: string }
	> => {
		const { summary, steps, questions } = args as {
			summary: string;
			steps: unknown;
			questions?: string[];
		};

		if (!summary || typeof summary !== "string") {
			return { error: "summary is required and must be a string" };
		}

		const normalizedSteps = normalizeSteps(steps);
		if (normalizedSteps.length === 0) {
			return {
				error: "steps must be a non-empty array or a numbered list string",
			};
		}

		for (const [i, step] of normalizedSteps.entries()) {
			if (!step.description || typeof step.description !== "string") {
				return { error: `Step ${i + 1} must have a description string` };
			}
			if (!Array.isArray(step.tools)) {
				return { error: `Step ${i + 1} must have a tools array` };
			}
		}

		const plan = createPlanFromSteps(summary, normalizedSteps, questions);
		usePlanStore.getState().setPlan(plan);
		useAgentStore.getState().setMode("plan");

		return {
			planId: plan.id,
			stepCount: plan.steps.length,
			nextAction: "request_plan_approval",
		};
	},
};

toolRegistry.register(submitPlanSchema.name, submitPlanTool);

function normalizeSteps(steps: unknown): SubmittedStep[] {
	if (Array.isArray(steps)) {
		return steps
			.map((step) => {
				if (typeof step === "string") {
					return { description: step, tools: [] };
				}
				if (typeof step !== "object" || step === null) return null;
				const raw = step as { description?: unknown; tools?: unknown };
				return {
					description:
						typeof raw.description === "string" ? raw.description : "",
					tools: Array.isArray(raw.tools)
						? raw.tools.filter(
								(tool): tool is string => typeof tool === "string",
							)
						: [],
				};
			})
			.filter((step): step is SubmittedStep => step !== null);
	}

	if (typeof steps !== "string") return [];

	return steps
		.split("\n")
		.map((line) => line.replace(/^\s*\d+[.)-]?\s*/, "").trim())
		.filter(Boolean)
		.map((description) => ({ description, tools: [] }));
}
