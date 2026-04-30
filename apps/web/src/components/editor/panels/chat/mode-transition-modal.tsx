"use client";

import { useCallback } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlanChartIcon, Edit02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { useAgentStore } from "@/stores/agent-store";
import { usePlanStore } from "@/stores/plan-store";
import { cn } from "@/utils/ui";

export function ModeTransitionModal() {
	const pendingTransition = useAgentStore((s) => s.pendingModeTransition);
	const plan = usePlanStore((s) => s.plan);

	const handleContinuePlanning = useCallback(() => {
		if (!pendingTransition) return;
		pendingTransition.resolve(false);
	}, [pendingTransition]);

	const handleStartEditing = useCallback(() => {
		if (!pendingTransition) return;
		pendingTransition.resolve(true);
	}, [pendingTransition]);

	if (!pendingTransition) return null;

	const doneCount = plan?.steps.filter((s) => s.status === "done").length ?? 0;
	const totalCount = plan?.steps.length ?? 0;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
			<div className="bg-background mx-4 max-w-sm rounded-lg border p-5 shadow-xl">
				<div className="flex flex-col gap-4">
					<div className="flex flex-col gap-1.5">
						<h3 className="text-sm font-semibold">Plan ready for execution</h3>
						{plan && (
							<p className="text-muted-foreground text-xs">
								{plan.summary} — {totalCount} step{totalCount !== 1 ? "s" : ""}
								{doneCount > 0 && ` (${doneCount} already done)`}
							</p>
						)}
					</div>

					{plan && (
						<div className="bg-muted/50 max-h-40 overflow-auto rounded-md p-2">
							<ul className="flex flex-col gap-1">
								{plan.steps.map((step) => (
									<li
										key={step.id}
										className="text-muted-foreground flex items-center gap-1.5 text-xs"
									>
										<span
											className={cn(
												"size-1.5 shrink-0 rounded-full",
												step.status === "done"
													? "bg-emerald-400"
													: step.status === "skipped"
														? "bg-muted-foreground/30"
														: "bg-muted-foreground/60",
											)}
										/>
										<span
											className={cn(step.status === "done" && "line-through")}
										>
											{step.description}
										</span>
									</li>
								))}
							</ul>
						</div>
					)}

					<div className="flex flex-col gap-2">
						<Button
							variant="default"
							size="sm"
							onClick={handleStartEditing}
							className="w-full"
						>
							<HugeiconsIcon
								icon={Edit02Icon}
								className="mr-2 size-4"
								strokeWidth={1.5}
							/>
							Start editing
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={handleContinuePlanning}
							className="w-full"
						>
							<HugeiconsIcon
								icon={PlanChartIcon}
								className="mr-2 size-4"
								strokeWidth={1.5}
							/>
							Continue planning
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
