import type { AgentContext, ToolDefinition } from "@/agent/types";
import { toolRegistry } from "@/agent/tools/registry";
import { askUserSchema } from "@/agent/tools/schemas";
import { usePlanStore } from "@/stores/plan-store";
import { nanoid } from "nanoid";

const askUserTool: ToolDefinition = {
	...askUserSchema,
	execute: async (
		args: Record<string, unknown>,
		_context: AgentContext,
	): Promise<{ questionId: string; answer: string } | { error: string }> => {
		const { question, options } = args as {
			question: string;
			options?: Array<{ label: string; description?: string }>;
		};

		if (!question || typeof question !== "string") {
			return { error: "question is required and must be a string" };
		}

		const questionId = nanoid();
		const planStore = usePlanStore.getState();

		planStore.setPendingQuestion({
			id: questionId,
			question,
			options: options && Array.isArray(options) ? options : undefined,
		});

		return new Promise((resolve) => {
			const unsubscribe = usePlanStore.subscribe((state) => {
				if (state.pendingQuestion?.answer) {
					unsubscribe();
					const answer = state.pendingQuestion.answer;
					usePlanStore.getState().setPendingQuestion(null);
					resolve({ questionId, answer });
				}
			});
		});
	},
};

toolRegistry.register(askUserSchema.name, askUserTool);
