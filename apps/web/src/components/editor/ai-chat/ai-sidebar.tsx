"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Trash2, ArrowUp, Square, ChevronDown } from "lucide-react";
import { useStickToBottomContext } from "use-stick-to-bottom";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
  PromptInputAction,
} from "@/components/ui/prompt-input";
import {
  ChatContainerRoot,
  ChatContainerContent,
  ChatContainerScrollAnchor,
} from "@/components/ui/chat-container";
import { PromptSuggestion } from "@/components/ui/prompt-suggestion";
import { Markdown } from "@/components/ui/markdown";
import { Loader } from "@/components/ui/loader";
import { cn } from "@/lib/utils";
import {
  useAIChatStore,
  type ToolCall,
  type ToolResult,
  type ChatMessage,
} from "@/stores/ai-chat-store";
import { executeToolCall } from "@/lib/ai-chat/tool-executor";
import { useTimelineStore } from "@/stores/timeline-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { CheckCircle, XCircle, Wrench } from "lucide-react";

interface GeminiMessage {
  role: "user" | "model" | "function";
  parts: Array<
    | { text: string }
    | { functionCall: { name: string; args: Record<string, unknown> } }
    | { functionResponse: { name: string; response: Record<string, unknown> } }
  >;
}

export function AISidebar() {
  const {
    isOpen,
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

  const [inputValue, setInputValue] = useState("");

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
        const existingMessages = buildGeminiMessages();
        const allMessages: GeminiMessage[] = [
          ...existingMessages,
          { role: "user", parts: [{ text: content }] },
        ];

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

        while (data.type === "function_calls") {
          const functionCalls = data.functionCalls as Array<{
            name: string;
            args: Record<string, unknown>;
          }>;

          const toolCalls: ToolCall[] = functionCalls.map((fc) => ({
            name: fc.name,
            args: fc.args,
          }));
          addAssistantMessage(data.text || "", toolCalls);

          const results = functionCalls.map((fc) => {
            const result = executeToolCall(fc.name, fc.args);
            return {
              name: fc.name,
              result: result.result || result.error,
              success: result.success,
            };
          });

          addToolResults(results);

          const functionCallParts = functionCalls.map((fc) => ({
            functionCall: { name: fc.name, args: fc.args },
          }));

          conversationMessages.push({
            role: "model",
            parts: data.text
              ? [{ text: data.text }, ...functionCallParts]
              : functionCallParts,
          });

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
    ],
  );

  const handleSubmit = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !isLoading) {
      handleSend(trimmed);
      setInputValue("");
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-sm font-medium">Copilot</h2>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={clearMessages}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <ChatContainerRoot className="relative flex-1 min-h-0">
        <ChatContainerContent className="p-4 gap-3">
          {messages.length === 0 && !isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4">
              <Image
                src="/logo.svg"
                alt="OpenCut"
                width={48}
                height={48}
                className="opacity-50"
              />
              <p className="text-sm text-muted-foreground">
                Make changes across your entire video
              </p>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <MessageItem key={message.id} message={message} />
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl px-3 py-2">
                    <Loader variant="typing" size="sm" />
                  </div>
                </div>
              )}
            </>
          )}
          <ChatContainerScrollAnchor />
        </ChatContainerContent>

        <ScrollToBottomButton />
      </ChatContainerRoot>

      {/* Error */}
      {error && (
        <div className="px-4 py-2 text-sm text-destructive bg-destructive/10">
          {error}
        </div>
      )}

      {/* Suggestions */}
      {messages.length === 0 && !isLoading && (
        <div className="flex flex-wrap gap-2 px-4 pb-3">
          <PromptSuggestion onClick={() => handleSend("Add a title")}>
            Add a title
          </PromptSuggestion>
          <PromptSuggestion onClick={() => handleSend("Speed up 2x")}>
            Speed up 2x
          </PromptSuggestion>
          <PromptSuggestion onClick={() => handleSend("What's on timeline?")}>
            What's on timeline?
          </PromptSuggestion>
        </div>
      )}

      {/* Input */}
      <div className="p-4">
        <PromptInput
          value={inputValue}
          onValueChange={setInputValue}
          onSubmit={handleSubmit}
          isLoading={isLoading}
        >
          <PromptInputTextarea
            placeholder="Ask anything..."
            className="min-h-[40px]"
          />
          <PromptInputActions className="justify-end px-2 pb-2">
            <PromptInputAction tooltip={isLoading ? "Stop" : "Send"}>
              <Button
                size="icon"
                className="h-8 w-8 rounded-full"
                disabled={isLoading || !inputValue.trim()}
                onClick={handleSubmit}
              >
                {isLoading ? (
                  <Square className="h-3 w-3 fill-current" />
                ) : (
                  <ArrowUp className="h-4 w-4" />
                )}
              </Button>
            </PromptInputAction>
          </PromptInputActions>
        </PromptInput>
      </div>
    </div>
  );
}

const ScrollToBottomButton = () => {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

  if (isAtBottom) return null;

  return (
    <Button
      type="button"
      size="icon"
      variant="secondary"
      className="absolute bottom-3 right-3 h-9 w-9 rounded-full shadow"
      onClick={() => {
        void scrollToBottom();
      }}
    >
      <ChevronDown className="h-4 w-4" />
    </Button>
  );
};

function MessageItem({ message }: { message: ChatMessage }) {
  if (message.role === "tool") {
    return <ToolResultsDisplay results={message.toolResults || []} />;
  }

  const isUser = message.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3 py-2",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted",
        )}
      >
        {message.content && (
          <div className="text-sm">
            {isUser ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              <Markdown id={message.id}>{message.content}</Markdown>
            )}
          </div>
        )}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <ToolCallsDisplay calls={message.toolCalls} />
        )}
      </div>
    </div>
  );
}

function ToolCallsDisplay({ calls }: { calls: ToolCall[] }) {
  return (
    <div className="mt-2 space-y-1">
      {calls.map((call, i) => (
        <div
          key={i}
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <Wrench className="h-3 w-3" />
          <span>{call.name.replace(/_/g, " ")}</span>
        </div>
      ))}
    </div>
  );
}

function ToolResultsDisplay({ results }: { results: ToolResult[] }) {
  if (results.length === 0) return null;

  return (
    <div className="space-y-1 ml-4">
      {results.map((result, i) => (
        <div
          key={i}
          className={cn(
            "flex items-center gap-1.5 text-xs",
            result.success ? "text-green-600" : "text-destructive",
          )}
        >
          {result.success ? (
            <CheckCircle className="h-3 w-3" />
          ) : (
            <XCircle className="h-3 w-3" />
          )}
          <span>{result.name.replace(/_/g, " ")}</span>
        </div>
      ))}
    </div>
  );
}
