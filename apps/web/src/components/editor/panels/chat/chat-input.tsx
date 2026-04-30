"use client";

import { useState, useCallback, type KeyboardEvent } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	Sent02Icon,
	FlashIcon,
	Shield01Icon,
	PlanChartIcon,
	Edit02Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useAgentStore, type PermissionMode } from "@/stores/agent-store";
import { usePlanStore } from "@/stores/plan-store";
import { cn } from "@/utils/ui";
import type { AgentMode } from "@/agent/types";

interface ChatInputProps {
	onSend: (content: string) => void;
	disabled: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
	const [value, setValue] = useState("");
	const permissionMode = useAgentStore((s) => s.permissionMode);
	const setPermissionMode = useAgentStore((s) => s.setPermissionMode);
	const pendingApproval = useAgentStore((s) => s.pendingApproval);
	const mode = useAgentStore((s) => s.mode);
	const setMode = useAgentStore((s) => s.setMode);
	const pendingTransition = useAgentStore((s) => s.pendingModeTransition);
	const plan = usePlanStore((s) => s.plan);

	const handleSend = useCallback(
		(forcedMode?: AgentMode) => {
			const trimmed = value.trim();
			if (!trimmed || disabled) return;
			const targetMode = forcedMode ?? mode;
			if (targetMode !== mode) {
				setMode(targetMode);
			}
			onSend(trimmed);
			setValue("");
		},
		[value, disabled, onSend, mode, setMode],
	);

	const handleKeyDown = useCallback(
		(e: KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				handleSend("execute");
			}
			if (e.key === "Enter" && e.shiftKey) {
				e.preventDefault();
				handleSend("plan");
			}
		},
		[handleSend],
	);

	const toggleMode = useCallback(() => {
		const next: AgentMode = mode === "execute" ? "plan" : "execute";
		setMode(next);
	}, [mode, setMode]);

	const togglePermission = useCallback(() => {
		const next: PermissionMode = permissionMode === "skip" ? "ask" : "skip";
		setPermissionMode(next);
	}, [permissionMode, setPermissionMode]);

	const isAsk = permissionMode === "ask";
	const isPlanMode = mode === "plan";

	return (
		<div className="border-t p-3">
			<div className="flex items-end gap-2">
				<textarea
					value={value}
					onChange={(e) => setValue(e.target.value)}
					onKeyDown={handleKeyDown}
					disabled={disabled || !!pendingTransition}
					placeholder={
						isPlanMode
							? "Describe what you want (plan mode)..."
							: "Ask the assistant..."
					}
					rows={1}
					className="border-border bg-input focus-visible:border-primary/50 focus-visible:ring-primary/20 flex-1 resize-none rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
				/>
				<Button
					variant={isPlanMode ? "default" : "secondary"}
					size="icon"
					onClick={toggleMode}
					disabled={!!pendingApproval || !!pendingTransition}
					aria-label={isPlanMode ? "Plan mode active" : "Switch to plan mode"}
					title={
						isPlanMode
							? "Plan mode (Shift+Enter to send in plan mode)"
							: "Edit mode (Enter to send)"
					}
				>
					<HugeiconsIcon
						icon={isPlanMode ? PlanChartIcon : Edit02Icon}
						className={cn("size-4", isPlanMode && "text-blue-400")}
						strokeWidth={1.5}
					/>
				</Button>
				<Button
					variant={isAsk ? "default" : "secondary"}
					size="icon"
					onClick={togglePermission}
					disabled={!!pendingApproval || !!pendingTransition}
					aria-label={isAsk ? "Ask permissions" : "Skip permissions"}
					title={isAsk ? "Ask permissions" : "Skip permissions"}
				>
					<HugeiconsIcon
						icon={isAsk ? Shield01Icon : FlashIcon}
						className={cn("size-4", isAsk && "text-amber-300")}
						strokeWidth={1.5}
					/>
				</Button>
				<Button
					variant="secondary"
					size="icon"
					onClick={() => handleSend()}
					disabled={disabled || !value.trim() || !!pendingTransition}
					aria-label="Send message"
				>
					{disabled ? (
						<Spinner className="size-4" />
					) : (
						<HugeiconsIcon icon={Sent02Icon} className="size-4" />
					)}
				</Button>
			</div>
			<div className="mt-1.5 flex items-center justify-between">
				<span className="text-muted-foreground text-[10px]">
					Enter = edit mode <span className="text-muted-foreground/60">|</span>{" "}
					Shift+Enter = plan mode
				</span>
				{plan && (
					<span className="text-[10px] tabular-nums">
						<span
							className={cn(isPlanMode ? "text-blue-400" : "text-emerald-400")}
						>
							{isPlanMode ? "PLANNING" : "EXECUTING"}
						</span>
					</span>
				)}
			</div>
		</div>
	);
}
