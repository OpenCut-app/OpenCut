"use client";

import { useRef, useEffect, useCallback } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { BubbleChatIncomeIcon } from "@hugeicons/core-free-icons";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useChatStore } from "@/stores/chat-store";
import { useAgentStore } from "@/stores/agent-store";
import { usePlanStore } from "@/stores/plan-store";
import { MessageBubble } from "./message-bubble";
import { ChatInput } from "./chat-input";
import { ToolPermissionRequest } from "./tool-permission-request";
import { PlanPanel } from "./plan-panel";
import { ModeTransitionModal } from "./mode-transition-modal";
import { AskUserPrompt } from "./ask-user-prompt";
import { run as orchestratorRun } from "@/agent/orchestrator";
import { EditorContextAdapter } from "@/agent/context";

export function ChatPanel() {
	const messages = useChatStore((s) => s.messages);
	const loading = useChatStore((s) => s.loading);
	const error = useChatStore((s) => s.error);
	const sendMessage = useChatStore((s) => s.sendMessage);
	const setError = useChatStore((s) => s.setError);
	const pendingApproval = useAgentStore((s) => s.pendingApproval);
	const pendingTransition = useAgentStore((s) => s.pendingModeTransition);
	const plan = usePlanStore((s) => s.plan);

	const scrollRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	});

	const handleSend = useCallback(
		async (content: string) => {
			sendMessage(content);
			const { messages } = useChatStore.getState();
			const context = EditorContextAdapter.getContext();
			await orchestratorRun(messages, context);
		},
		[sendMessage],
	);

	const handleRetry = useCallback(async () => {
		const store = useChatStore.getState();
		store.setError(null);
		store.setLoading(true);
		const context = EditorContextAdapter.getContext();
		await orchestratorRun(store.messages, context);
	}, []);

	return (
		<div className="flex h-full flex-col">
			{plan && (
				<div className="max-h-48 shrink-0 overflow-hidden border-b">
					<PlanPanel />
				</div>
			)}

			{messages.length === 0 && !loading && !error ? (
				<div className="flex flex-1 flex-col items-center justify-center gap-3 p-4">
					<HugeiconsIcon
						icon={BubbleChatIncomeIcon}
						className="text-muted-foreground/75 size-10"
						strokeWidth={1}
					/>
					<div className="flex flex-col gap-2 text-center">
						<p className="text-lg font-medium">No messages yet</p>
						<p className="text-muted-foreground text-sm text-balance">
							Ask the assistant anything about your project
						</p>
					</div>
				</div>
			) : (
				<ScrollArea className="flex-1 p-3" ref={scrollRef}>
					<div className="flex flex-col gap-2">
						{messages.map((msg) => (
							<MessageBubble key={msg.id} message={msg} messages={messages} />
						))}
						{loading && (
							<div className="flex items-center gap-2 px-3 py-2">
								<Spinner className="text-muted-foreground size-4" />
								<span className="text-muted-foreground text-xs">
									Thinking...
								</span>
							</div>
						)}
						<AskUserPrompt />
						{pendingApproval && (
							<ToolPermissionRequest pending={pendingApproval} />
						)}
					</div>
				</ScrollArea>
			)}

			{error && (
				<div className="border-destructive/30 bg-destructive/5 mx-3 flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
					<span className="text-destructive flex-1 text-xs">{error}</span>
					<Button
						variant="text"
						size="sm"
						onClick={handleRetry}
						className="text-destructive text-xs font-medium"
					>
						Retry
					</Button>
					<Button
						variant="text"
						size="sm"
						onClick={() => setError(null)}
						className="text-muted-foreground text-xs"
					>
						Dismiss
					</Button>
				</div>
			)}

			<ChatInput onSend={handleSend} disabled={loading} />

			{pendingTransition && <ModeTransitionModal />}
		</div>
	);
}
