"use client";

import { useState } from "react";
import type { ParamValues } from "@/lib/params";
import type { ClipTransform } from "@/lib/transforms/types";
import type { TransformableElement } from "@/lib/timeline";
import { transformsRegistry } from "@/lib/transforms";
import { useEditor } from "@/hooks/use-editor";
import { useElementPreview } from "@/hooks/use-element-preview";
import {
	Section,
	SectionContent,
	SectionHeader,
	SectionTitle,
	SectionFields,
} from "@/components/section";
import { PropertyParamField } from "../components/property-param-field";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	Delete02Icon,
	ViewIcon,
	ViewOffSlashIcon,
	ArrowExpandIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/utils/ui";
import { Separator } from "@/components/ui/separator";
import { useAssetsPanelStore } from "@/stores/assets-panel-store";

/**
 * Clip Transforms tab — lists spatial/visual clip transforms attached to
 * the element and lets the user reorder, toggle, edit params, and remove
 * them. Mirrors ClipEffectsTab (tabs/effects-tab.tsx) 1:1. Named
 * "Clip Transforms" (not "Transform") to avoid colliding with the
 * existing position/scale/rotate "Transform" tab (tabs/transform-tab.tsx).
 */
export function ClipTransformsTab({
	element,
	trackId,
}: {
	element: TransformableElement;
	trackId: string;
}) {
	const [dragIndex, setDragIndex] = useState<number | null>(null);
	const [dropIndex, setDropIndex] = useState<number | null>(null);
	const editor = useEditor();
	const { renderElement, previewUpdates, commit } = useElementPreview({
		trackId,
		elementId: element.id,
		fallback: element,
	});

	const transforms: ClipTransform[] = element.clipTransforms ?? [];

	const getRenderParams = ({
		transformId,
	}: {
		transformId: string;
	}): ParamValues => {
		return (
			(renderElement as TransformableElement).clipTransforms?.find(
				(t) => t.id === transformId,
			)?.params ??
			transforms.find((t) => t.id === transformId)?.params ??
			{}
		);
	};

	const buildPreviewParam =
		(transformId: string) =>
		(key: string) =>
		(value: number | string | boolean) => {
			const updatedTransforms = (
				(renderElement as TransformableElement).clipTransforms ?? []
			).map((existing) =>
				existing.id !== transformId
					? existing
					: { ...existing, params: { ...existing.params, [key]: value } },
			);
			previewUpdates({ clipTransforms: updatedTransforms });
		};

	const handleDragStart = ({ index }: { index: number }) => setDragIndex(index);

	const handleDragOver = ({
		event,
		index,
	}: {
		event: React.DragEvent;
		index: number;
	}) => {
		event.preventDefault();
		if (index !== dropIndex) setDropIndex(index);
	};

	const handleDrop = ({ toIndex }: { toIndex: number }) => {
		if (dragIndex !== null && dragIndex !== toIndex) {
			editor.timeline.reorderClipTransforms({
				trackId,
				elementId: element.id,
				fromIndex: dragIndex,
				toIndex,
			});
		}
		setDragIndex(null);
		setDropIndex(null);
	};

	const handleDragEnd = () => {
		setDragIndex(null);
		setDropIndex(null);
	};

	return (
		<div className="flex flex-col h-full">
			<div className="border-b px-3.5 h-11 shrink-0 flex items-center">
				<SectionTitle>Clip Transforms</SectionTitle>
			</div>
			{transforms.length === 0 ? (
				<EmptyView />
			) : (
				<ul className="flex flex-col">
					{transforms.map((transform, index) => {
						const resolvedDragIndex = dragIndex ?? -1;
						const isDragging = dragIndex === index;
						const isDropTarget =
							dropIndex === index && dragIndex !== null && dragIndex !== index;
						const showTopDropIndicator =
							isDropTarget && index < resolvedDragIndex;
						const showBottomDropIndicator =
							isDropTarget && index > resolvedDragIndex;

						return (
							<li
								key={transform.id}
								draggable
								onDragStart={() => handleDragStart({ index })}
								onDragOver={(event) => handleDragOver({ event, index })}
								onDrop={() => handleDrop({ toIndex: index })}
								onDragEnd={handleDragEnd}
								className={cn(
									"group list-none",
									isDragging && "opacity-40",
									showTopDropIndicator && "border-t-2 border-primary",
									showBottomDropIndicator && "border-b-2 border-primary",
								)}
							>
								<ClipTransformSection
									transform={transform}
									renderParams={getRenderParams({ transformId: transform.id })}
									previewParam={buildPreviewParam(transform.id)}
									onCommit={commit}
									onToggle={() =>
										editor.timeline.toggleClipTransform({
											trackId,
											elementId: element.id,
											transformId: transform.id,
										})
									}
									onRemove={() =>
										editor.timeline.removeClipTransform({
											trackId,
											elementId: element.id,
											transformId: transform.id,
										})
									}
								/>
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}

function EmptyView() {
	const setActiveTab = useAssetsPanelStore((s) => s.setActiveTab);

	return (
		<div className="flex flex-col h-full items-center justify-center gap-4 text-center">
			<HugeiconsIcon
				icon={ArrowExpandIcon}
				className="size-10 text-muted-foreground"
				strokeWidth={1}
			/>
			<div className="flex flex-col gap-2">
				<h3 className="font-medium text-foreground">No clip transforms</h3>
				<p className="text-muted-foreground text-sm text-balance max-w-44">
					Add spatial or visual transforms to this layer from the Assets panel.
				</p>
			</div>
			<Button
				variant="default"
				size="sm"
				onClick={() => setActiveTab("transitions")}
			>
				Open transforms
			</Button>
		</div>
	);
}

function ClipTransformSection({
	transform,
	renderParams,
	previewParam,
	onCommit,
	onToggle,
	onRemove,
}: {
	transform: ClipTransform;
	renderParams: ParamValues;
	previewParam: (key: string) => (value: number | string | boolean) => void;
	onCommit: () => void;
	onToggle?: () => void;
	onRemove?: () => void;
}) {
	const definition = transformsRegistry.get(transform.type);

	return (
		<Section
			sectionKey={onToggle ? `clip-transform:${transform.id}` : undefined}
			showTopBorder={false}
		>
			<SectionHeader
				className={cn(onToggle && "cursor-move")}
				trailing={
					onToggle && (
						<div className="flex items-center gap-1">
							<Button
								variant={transform.enabled ? "secondary" : "ghost"}
								size="icon"
								aria-label={`Toggle ${definition.name}`}
								onClick={onToggle}
							>
								<HugeiconsIcon
									icon={transform.enabled ? ViewIcon : ViewOffSlashIcon}
								/>
							</Button>
							<Button
								variant="ghost"
								size="icon"
								aria-label={`Remove ${definition.name}`}
								onClick={onRemove}
							>
								<HugeiconsIcon icon={Delete02Icon} />
							</Button>
						</div>
					)
				}
			>
				<SectionTitle
					className={cn(
						onToggle && !transform.enabled && "text-muted-foreground",
					)}
				>
					{definition.name}
				</SectionTitle>
			</SectionHeader>
			<SectionContent
				className={cn("p-0", onToggle && !transform.enabled && "opacity-50")}
			>
				<SectionFields>
					{definition.params.map((param) => (
						<div key={param.key} className="flex flex-col gap-3.5">
							<div className="px-4">
								<PropertyParamField
									param={param}
									value={renderParams[param.key] ?? param.default}
									onPreview={previewParam(param.key)}
									onCommit={onCommit}
								/>
							</div>
							<Separator />
						</div>
					))}
				</SectionFields>
			</SectionContent>
		</Section>
	);
}
