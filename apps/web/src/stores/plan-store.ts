import { create } from "zustand";
import { nanoid } from "nanoid";
import type {
	AgentQuestion,
	Plan,
	PlanStepStatus,
	PlanStatus,
} from "@/agent/types";

interface PlanState {
	plan: Plan | null;
	pendingQuestion: AgentQuestion | null;
	modeTransitionPending: boolean;

	setPlan: (plan: Plan) => void;
	updatePlanStatus: (status: PlanStatus) => void;
	updateStepStatus: (
		stepId: string,
		status: PlanStepStatus,
		result?: string,
	) => void;
	clearPlan: () => void;

	setPendingQuestion: (question: AgentQuestion | null) => void;
	answerQuestion: (answer: string) => void;

	setModeTransitionPending: (pending: boolean) => void;
}

export const usePlanStore = create<PlanState>()((set, get) => ({
	plan: null,
	pendingQuestion: null,
	modeTransitionPending: false,

	setPlan: (plan) => set({ plan }),

	updatePlanStatus: (status) => {
		const current = get().plan;
		if (!current) return;
		set({ plan: { ...current, status } });
	},

	updateStepStatus: (stepId, status, result) => {
		const current = get().plan;
		if (!current) return;
		set({
			plan: {
				...current,
				steps: current.steps.map((s) =>
					s.id === stepId
						? { ...s, status, ...(result !== undefined && { result }) }
						: s,
				),
			},
		});
	},

	clearPlan: () => set({ plan: null, pendingQuestion: null }),

	setPendingQuestion: (question) => set({ pendingQuestion: question }),

	answerQuestion: (answer) => {
		const current = get().pendingQuestion;
		if (!current) return;
		set({ pendingQuestion: { ...current, answer } });
	},

	setModeTransitionPending: (pending) =>
		set({ modeTransitionPending: pending }),
}));

export function createPlanFromSteps(
	summary: string,
	steps: Array<{ description: string; tools: string[] }>,
	questions?: string[],
): Plan {
	return {
		id: nanoid(),
		summary,
		steps: steps.map((s) => ({
			id: nanoid(),
			description: s.description,
			tools: s.tools,
			status: "pending" as PlanStepStatus,
		})),
		questions,
		status: "awaiting_approval" as PlanStatus,
		createdAt: Date.now(),
	};
}
