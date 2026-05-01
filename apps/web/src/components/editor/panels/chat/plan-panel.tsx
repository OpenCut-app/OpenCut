"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
	CheckmarkCircle02Icon,
	CancelCircleIcon,
	Loading03Icon,
	MinusSignIcon,
	PlanChartIcon,
} from "@hugeicons/core-free-icons";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePlanStore } from "@/stores/plan-store";
import { useAgentStore } from "@/stores/agent-store";
import { cn } from "@/utils/ui";
import type { PlanStep, PlanStepStatus } from "@/agent/types";

const STATUS_CONFIG: Record<
	PlanStepStatus,
	{ icon: typeof CheckmarkCircle02Icon; className: string }
> = {
	pending: {
		icon: MinusSignIcon,
		className: "text-muted-foreground",
	},
	in_progress: {
		icon: Loading03Icon,
		className: "text-blue-400 animate-spin",
	},
	done: {
		icon: CheckmarkCircle02Icon,
		className: "text-emerald-400",
	},
	skipped: {
		icon: CancelCircleIcon,
		className: "text-muted-foreground/50",
	},
};

function StepItem({ step }: { step: PlanStep }) {
	const config = STATUS_CONFIG[step.status];

	return (
		<div
			className={cn(
				"flex items-start gap-2 rounded-md px-2 py-1.5 text-xs",
				step.status === "skipped" && "opacity-50",
			)}
		>
			<HugeiconsIcon
				icon={config.icon}
				className={cn("mt-0.5 size-3.5 shrink-0", config.className)}
				strokeWidth={2}
			/>
			<div className="flex flex-col gap-0.5">
				<span
					className={cn(
						step.status === "done" && "text-muted-foreground line-through",
					)}
				>
					{step.description}
				</span>
				{step.result && (
					<span className="text-muted-foreground text-[10px]">
						{step.result}
					</span>
				)}
			</div>
		</div>
	);
}

export function PlanPanel() {
	const plan = usePlanStore((s) => s.plan);
	const mode = useAgentStore((s) => s.mode);

	if (!plan) {
		return (
			<div className="flex h-full flex-col items-center justify-center gap-2 p-4">
				<HugeiconsIcon
					icon={PlanChartIcon}
					className="text-muted-foreground/50 size-8"
					strokeWidth={1}
				/>
				<p className="text-muted-foreground text-center text-xs">
					{mode === "plan"
						? "Analyzing footage to build a plan..."
						: "No active plan"}
				</p>
			</div>
		);
	}

	const doneCount = plan.steps.filter((s) => s.status === "done").length;
	const totalCount = plan.steps.length;
	const progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

	return (
		<div className="flex h-full flex-col">
			<div className="flex items-center justify-between border-b px-3 py-2">
				<div className="flex flex-col">
					<span className="text-xs font-medium">Plan</span>
					<span className="text-muted-foreground text-[10px]">
						{plan.summary}
					</span>
				</div>
				<div className="flex items-center gap-1.5">
					<div className="bg-muted h-1.5 w-16 overflow-hidden rounded-full">
						<div
							className="bg-emerald-400 h-full rounded-full transition-all duration-300"
							style={{ width: `${progress}%` }}
						/>
					</div>
					<span className="text-muted-foreground text-[10px] tabular-nums">
						{doneCount}/{totalCount}
					</span>
				</div>
			</div>

			<ScrollArea className="flex-1 p-2">
				<div className="flex flex-col gap-0.5">
					{plan.steps.map((step) => (
						<StepItem key={step.id} step={step} />
					))}
				</div>
			</ScrollArea>

			{plan.questions && plan.questions.length > 0 && (
				<div className="border-t px-3 py-2">
					<span className="text-muted-foreground text-[10px] font-medium uppercase">
						Open questions
					</span>
					<ul className="mt-1 flex flex-col gap-0.5">
						{plan.questions.map((q) => (
							<li key={q} className="text-muted-foreground text-[11px]">
								{q}
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
}
