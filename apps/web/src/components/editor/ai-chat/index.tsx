"use client";

import { useCallback, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";
import { useAIChatStore, type ToolCall } from "@/stores/ai-chat-store";
import { executeToolCall } from "@/lib/ai-chat/tool-executor";
import { useTimelineStore } from "@/stores/timeline-store";
import { usePlaybackStore } from "@/stores/playback-store";

interface GeminiMessage {
  role: "user" | "model" | "function";
  parts: Array<
    | { text: string }
    | { functionCall: { name: string; args: Record<string, unknown> } }
    | { functionResponse: { name: string; response: Record<string, unknown> } }
  >;
}

export function AIChatSheet() {
  const {
    isOpen,
    setOpen,
    messages,
    isLoading,
    error,
    addUserMessage,
    addAssistantMessage,
    addToolResults,
    setLoading,
    setError,
    clearMessages,
  } = useAIChatStore();

  // Register keyboard shortcut (Cmd/Ctrl + I)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "i") {
        e.preventDefault();
        setOpen(!isOpen);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, setOpen]);

  const buildGeminiMessages = useCallback((): GeminiMessage[] => {
    const geminiMessages: GeminiMessage[] = [];

    for (const msg of messages) {
      if (msg.role === "user") {
        geminiMessages.push({
          role: "user",
          parts: [{ text: msg.content }],
        });
      } else if (msg.role === "assistant") {
        const parts: GeminiMessage["parts"] = [];
        if (msg.content) {
          parts.push({ text: msg.content });
        }
        if (msg.toolCalls) {
          for (const call of msg.toolCalls) {
            parts.push({
              functionCall: {
                name: call.name,
                args: call.args,
              },
            });
          }
        }
        if (parts.length > 0) {
          geminiMessages.push({ role: "model", parts });
        }
      } else if (msg.role === "tool" && msg.toolResults) {
        // Function responses go as separate messages
        for (const result of msg.toolResults) {
          geminiMessages.push({
            role: "function",
            parts: [
              {
                functionResponse: {
                  name: result.name,
                  response: {
                    success: result.success,
                    result: result.result,
                  },
                },
              },
            ],
          });
        }
      }
    }

    return geminiMessages;
  }, [messages]);

  const getTimelineContext = useCallback(() => {
    const timelineStore = useTimelineStore.getState();
    const playbackStore = usePlaybackStore.getState();

    const tracks = timelineStore.tracks;
    const elementCount = tracks.reduce((sum, t) => sum + t.elements.length, 0);
    const selectedCount = timelineStore.selectedElements.length;

    return `Playhead: ${playbackStore.currentTime.toFixed(1)}s, Duration: ${timelineStore.getTotalDuration().toFixed(1)}s, Tracks: ${tracks.length}, Elements: ${elementCount}, Selected: ${selectedCount}`;
  }, []);

  const handleSend = useCallback(
    async (content: string) => {
      addUserMessage(content);
      setLoading(true);
      setError(null);

      try {
        // Build messages including the new user message
        const existingMessages = buildGeminiMessages();
        const allMessages: GeminiMessage[] = [
          ...existingMessages,
          { role: "user", parts: [{ text: content }] },
        ];

        // Initial API call
        let response = await fetch("/api/ai-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: allMessages,
            timelineContext: getTimelineContext(),
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to get AI response");
        }

        let data = await response.json();
        const conversationMessages = [...allMessages];

        // Handle function call loop
        while (data.type === "function_calls") {
          const functionCalls = data.functionCalls as Array<{
            name: string;
            args: Record<string, unknown>;
          }>;

          // Add assistant message with tool calls
          const toolCalls: ToolCall[] = functionCalls.map((fc) => ({
            name: fc.name,
            args: fc.args,
          }));
          addAssistantMessage(data.text || "", toolCalls);

          // Execute the function calls
          const results = functionCalls.map((fc) => {
            const result = executeToolCall(fc.name, fc.args);
            return {
              name: fc.name,
              result: result.result || result.error,
              success: result.success,
            };
          });

          // Add tool results to UI
          addToolResults(results);

          // Build function call part for conversation
          const functionCallParts = functionCalls.map((fc) => ({
            functionCall: { name: fc.name, args: fc.args },
          }));

          // Add model's function call to conversation
          conversationMessages.push({
            role: "model",
            parts: data.text
              ? [{ text: data.text }, ...functionCallParts]
              : functionCallParts,
          });

          // Add function responses to conversation
          for (const result of results) {
            conversationMessages.push({
              role: "function",
              parts: [
                {
                  functionResponse: {
                    name: result.name,
                    response: {
                      success: result.success,
                      result: result.result,
                    },
                  },
                },
              ],
            });
          }

          // Continue conversation with function results
          response = await fetch("/api/ai-chat", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: conversationMessages }),
          });

          if (!response.ok) {
            throw new Error("Failed to continue AI conversation");
          }

          data = await response.json();
        }

        // Final text response
        if (data.text) {
          addAssistantMessage(data.text);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An error occurred";
        setError(errorMessage);
        addAssistantMessage(`Error: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    },
    [
      addUserMessage,
      addAssistantMessage,
      addToolResults,
      setLoading,
      setError,
      buildGeminiMessages,
      getTimelineContext,
    ]
  );

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="w-[400px] sm:w-[450px] p-0 flex flex-col"
      >
        <SheetHeader className="p-4 pb-2 border-b shrink-0">
          <div className="flex items-center justify-between pr-8">
            <SheetTitle className="text-lg">AI Editor</SheetTitle>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={clearMessages}
                title="Clear chat"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          <SheetDescription className="text-xs">
            Control your video editor with natural language
          </SheetDescription>
        </SheetHeader>

        <ChatMessages messages={messages} isLoading={isLoading} />

        {error && (
          <div className="px-4 py-2 text-sm text-red-500 bg-red-500/10">
            {error}
          </div>
        )}

        <ChatInput onSend={handleSend} isLoading={isLoading} />
      </SheetContent>
    </Sheet>
  );
}
