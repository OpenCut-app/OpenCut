"use client";

import { useCallback } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	CheckListIcon,
	Edit02Icon,
	ReloadIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { useAgentStore } from "@/stores/agent-store";
import { usePlanStore } from "@/stores/plan-store";

export function PlanApprovalCard() {
	const pendingTransition = useAgentStore((s) => s.pendingModeTransition);
	const plan = usePlanStore((s) => s.plan);

	const handleKeepPlanning = useCallback(() => {
		if (!pendingTransition) return;
		pendingTransition.resolve(false);
	}, [pendingTransition]);

	const handleGoEdit = useCallback(() => {
		if (!pendingTransition) return;
		pendingTransition.resolve(true);
	}, [pendingTransition]);

	if (!pendingTransition || !plan) return null;

	return (
		<div className="border-primary/30 bg-primary/5 flex flex-col gap-3 rounded-lg border p-3 shadow-sm">
			<div className="flex items-start gap-2">
				<div className="bg-primary/15 text-primary mt-0.5 rounded-md p-1.5">
					<HugeiconsIcon
						icon={CheckListIcon}
						className="size-4"
						strokeWidth={2}
					/>
				</div>
				<div className="flex min-w-0 flex-1 flex-col gap-1">
					<div className="flex items-center justify-between gap-2">
						<span className="text-sm font-semibold">Plan ready</span>
						<span className="text-primary text-[10px] font-medium uppercase tracking-wide">
							Plan mode
						</span>
					</div>
					<p className="text-muted-foreground text-xs leading-relaxed">
						{plan.summary}
					</p>
				</div>
			</div>

			<div className="bg-background/70 rounded-md border p-2">
				<ul className="flex flex-col gap-1.5">
					{plan.steps.map((step, index) => (
						<li key={step.id} className="flex items-start gap-2 text-xs">
							<span className="bg-primary/10 text-primary mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] font-medium">
								{index + 1}
							</span>
							<span className="leading-relaxed">{step.description}</span>
						</li>
					))}
				</ul>
			</div>

			<div className="flex items-center gap-2">
				<Button size="sm" onClick={handleGoEdit} className="h-8 flex-1 text-xs">
					<HugeiconsIcon icon={Edit02Icon} className="mr-1.5 size-3.5" />
					Go edit
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={handleKeepPlanning}
					className="h-8 flex-1 text-xs"
				>
					<HugeiconsIcon icon={ReloadIcon} className="mr-1.5 size-3.5" />
					Keep planning
				</Button>
			</div>

			<p className="text-muted-foreground text-[10px]">
				Go edit switches to edit mode and lets the agent execute the plan. Keep
				planning keeps writes blocked.
			</p>
		</div>
	);
}
