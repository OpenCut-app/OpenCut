"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { ChatMessage, ToolCall, ToolResult } from "@/stores/ai-chat-store";
import { CheckCircle, XCircle, Wrench, User, Bot } from "lucide-react";

interface ChatMessagesProps {
  messages: ChatMessage[];
  isLoading: boolean;
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 text-center">
        <div className="text-muted-foreground space-y-2">
          <Bot className="h-12 w-12 mx-auto opacity-50" />
          <p className="text-sm">Ask me to help edit your video</p>
          <p className="text-xs opacity-75">
            Try: &quot;Add a title that says Hello World&quot;
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="flex gap-1">
            <span
              className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <span
              className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <span
              className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </div>
          <span className="text-xs">Thinking...</span>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === "tool") {
    return <ToolResultsDisplay results={message.toolResults || []} />;
  }

  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-2", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
          <Bot className="h-3 w-3 text-primary" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-3 py-2",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        )}
      >
        {message.content && (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        )}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <ToolCallsDisplay calls={message.toolCalls} />
        )}
      </div>
      {isUser && (
        <div className="shrink-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
          <User className="h-3 w-3 text-primary-foreground" />
        </div>
      )}
    </div>
  );
}

function ToolCallsDisplay({ calls }: { calls: ToolCall[] }) {
  return (
    <div className="mt-2 space-y-1">
      {calls.map((call, i) => (
        <div
          key={i}
          className="flex items-center gap-1.5 text-xs text-muted-foreground bg-background/50 rounded px-2 py-1"
        >
          <Wrench className="h-3 w-3" />
          <span className="font-mono">{formatToolName(call.name)}</span>
        </div>
      ))}
    </div>
  );
}

function ToolResultsDisplay({ results }: { results: ToolResult[] }) {
  if (results.length === 0) return null;

  return (
    <div className="space-y-1 px-8">
      {results.map((result, i) => (
        <div
          key={i}
          className={cn(
            "flex items-center gap-1.5 text-xs rounded px-2 py-1",
            result.success
              ? "text-green-600 bg-green-500/10"
              : "text-red-600 bg-red-500/10"
          )}
        >
          {result.success ? (
            <CheckCircle className="h-3 w-3" />
          ) : (
            <XCircle className="h-3 w-3" />
          )}
          <span className="font-mono">{formatToolName(result.name)}</span>
          {!result.success && result.result && (
            <span className="opacity-75">- {String(result.result)}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function formatToolName(name: string): string {
  return name.replace(/_/g, " ");
}
