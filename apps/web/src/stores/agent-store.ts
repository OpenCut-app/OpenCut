import { create } from "zustand";
import type {
	AgentContext,
	AgentMode,
	ExecutionState,
	ToolCall,
} from "@/agent/types";

export type PermissionMode = "ask" | "skip";

export interface PendingToolApproval {
	toolCall: ToolCall;
	resolve: (approved: boolean) => void;
}

export interface PendingModeTransition {
	targetMode: AgentMode;
	resolve: (approved: boolean) => void;
}

const DEFAULT_CONTEXT: AgentContext = {
	projectId: null,
	activeSceneId: null,
	mediaAssets: [],
	playbackTimeMs: 0,
};

interface AgentState {
	status: ExecutionState;
	activeTool: string | null;
	context: AgentContext;
	permissionMode: PermissionMode;
	pendingApproval: PendingToolApproval | null;
	mode: AgentMode;
	pendingModeTransition: PendingModeTransition | null;
	setStatus: (status: ExecutionState) => void;
	setActiveTool: (tool: string | null) => void;
	setContext: (context: AgentContext) => void;
	setPermissionMode: (mode: PermissionMode) => void;
	setPendingApproval: (pending: PendingToolApproval | null) => void;
	setMode: (mode: AgentMode) => void;
	setPendingModeTransition: (transition: PendingModeTransition | null) => void;
	reset: () => void;
}

export const useAgentStore = create<AgentState>()((set) => ({
	status: "idle",
	activeTool: null,
	context: DEFAULT_CONTEXT,
	permissionMode: "skip",
	pendingApproval: null,
	mode: "execute",
	pendingModeTransition: null,
	setStatus: (status) => set({ status }),
	setActiveTool: (tool) => set({ activeTool: tool }),
	setContext: (context) => set({ context }),
	setPermissionMode: (mode) => set({ permissionMode: mode }),
	setPendingApproval: (pending) => set({ pendingApproval: pending }),
	setMode: (mode) => set({ mode }),
	setPendingModeTransition: (transition) =>
		set({ pendingModeTransition: transition }),
	reset: () =>
		set({
			status: "idle",
			activeTool: null,
			context: DEFAULT_CONTEXT,
			pendingApproval: null,
			mode: "execute",
			pendingModeTransition: null,
		}),
}));
