"use client";

import { useState, useCallback } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { QuestionExchangeIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { usePlanStore } from "@/stores/plan-store";

export function AskUserPrompt() {
	const pendingQuestion = usePlanStore((s) => s.pendingQuestion);
	const answerQuestion = usePlanStore((s) => s.answerQuestion);
	const [freeForm, setFreeForm] = useState("");

	const handleOptionClick = useCallback(
		(label: string) => {
			answerQuestion(label);
			setFreeForm("");
		},
		[answerQuestion],
	);

	const handleFreeFormSubmit = useCallback(() => {
		const trimmed = freeForm.trim();
		if (!trimmed) return;
		answerQuestion(trimmed);
		setFreeForm("");
	}, [freeForm, answerQuestion]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				handleFreeFormSubmit();
			}
		},
		[handleFreeFormSubmit],
	);

	if (!pendingQuestion || pendingQuestion.answer) return null;

	return (
		<div className="flex flex-col gap-2 rounded-md border border-blue-500/30 bg-blue-500/5 px-3 py-2.5">
			<div className="flex items-center gap-2">
				<HugeiconsIcon
					icon={QuestionExchangeIcon}
					className="size-4 shrink-0 text-blue-400"
					strokeWidth={1.5}
				/>
				<span className="text-xs font-medium text-blue-400">
					Agent question
				</span>
			</div>
			<p className="text-xs text-foreground/90">{pendingQuestion.question}</p>

			{pendingQuestion.options && pendingQuestion.options.length > 0 && (
				<div className="flex flex-wrap gap-1.5">
					{pendingQuestion.options.map((opt) => (
						<Button
							key={opt.label}
							variant="outline"
							size="sm"
							onClick={() => handleOptionClick(opt.label)}
							className="text-xs"
							title={opt.description}
						>
							{opt.label}
						</Button>
					))}
				</div>
			)}

			<div className="flex items-center gap-1.5">
				<input
					type="text"
					value={freeForm}
					onChange={(e) => setFreeForm(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder="Type your answer..."
					className="border-border bg-input flex-1 rounded-md border px-2 py-1 text-xs outline-none focus:border-blue-500/50"
				/>
				<Button
					variant="secondary"
					size="sm"
					onClick={handleFreeFormSubmit}
					disabled={!freeForm.trim()}
					className="text-xs"
				>
					Send
				</Button>
			</div>
		</div>
	);
}
