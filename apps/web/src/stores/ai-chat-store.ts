import { create } from "zustand";

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

export interface ToolResult {
  name: string;
  result: unknown;
  success: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  timestamp: number;
}

interface AIChatState {
  isOpen: boolean;
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
}

interface AIChatActions {
  toggleOpen: () => void;
  setOpen: (open: boolean) => void;
  addUserMessage: (content: string) => void;
  addAssistantMessage: (content: string, toolCalls?: ToolCall[]) => void;
  addToolResults: (results: ToolResult[]) => void;
  updateLastAssistantMessage: (content: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearMessages: () => void;
}

type AIChatStore = AIChatState & AIChatActions;

const generateId = () =>
  `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

export const useAIChatStore = create<AIChatStore>((set, get) => ({
  // State
  isOpen: false,
  messages: [],
  isLoading: false,
  error: null,

  // Actions
  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),

  setOpen: (open) => set({ isOpen: open }),

  addUserMessage: (content) => {
    const message: ChatMessage = {
      id: generateId(),
      role: "user",
      content,
      timestamp: Date.now(),
    };
    set((state) => ({
      messages: [...state.messages, message],
      error: null,
    }));
  },

  addAssistantMessage: (content, toolCalls) => {
    const message: ChatMessage = {
      id: generateId(),
      role: "assistant",
      content,
      toolCalls,
      timestamp: Date.now(),
    };
    set((state) => ({
      messages: [...state.messages, message],
    }));
  },

  addToolResults: (results) => {
    const message: ChatMessage = {
      id: generateId(),
      role: "tool",
      content: "",
      toolResults: results,
      timestamp: Date.now(),
    };
    set((state) => ({
      messages: [...state.messages, message],
    }));
  },

  updateLastAssistantMessage: (content) => {
    set((state) => {
      const messages = [...state.messages];
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === "assistant") {
          messages[i] = { ...messages[i], content };
          break;
        }
      }
      return { messages };
    });
  },

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  clearMessages: () => set({ messages: [], error: null }),
}));
