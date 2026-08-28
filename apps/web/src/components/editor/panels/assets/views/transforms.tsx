"use client";

import { useEffect, useRef, useCallback } from "react";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { DraggableItem } from "@/components/editor/panels/assets/draggable-item";
import {
	transformsRegistry,
	TRANSFORM_TARGET_ELEMENT_TYPES,
} from "@/lib/transforms";
import { getAllPresets } from "@/lib/transforms/presets/registry";
import { transformPreviewService } from "@/services/renderer/transform-preview";
import { useEditor } from "@/hooks/use-editor";
import { useElementSelection } from "@/hooks/timeline/element/use-element-selection";
import { isTransformableElement } from "@/lib/timeline";
import type { TransformDefinition } from "@/lib/transforms/types";
import type { TransformPreset } from "@/lib/transforms/presets/types";
import { HugeiconsIcon } from "@hugeicons/react";
import { MagicWand05Icon } from "@hugeicons/core-free-icons";

/**
 * Transforms library grid. Repurposes the "transitions" assets-panel tab
 * slot (previously a "coming soon" placeholder) since there is no
 * dedicated tab for the spatial/visual transform library — it is the
 * closest semantic match to clip-transforms/effects. See
 * `stores/assets-panel-store.tsx` TAB_KEYS and `assets/index.tsx`.
 *
 * Unlike effects (which can be standalone timeline elements), transforms
 * only attach to an existing transformable clip, so clicking an item adds
 * it to the currently selected element rather than inserting a new one.
 */
export function TransformsView() {
	const transforms = transformsRegistry
		.getAll()
		.filter((definition) => definition.category !== "transition");
	const presets = getAllPresets();

	return (
		<PanelView title="Transforms">
			{presets.length > 0 && (
				<div className="flex flex-col gap-2 pb-4">
					<p className="text-xs text-muted-foreground font-medium px-0.5">
						Animated Presets
					</p>
					<PresetsGrid presets={presets} />
				</div>
			)}
			<TransformsGrid transforms={transforms} />
		</PanelView>
	);
}

function PresetsGrid({ presets }: { presets: TransformPreset[] }) {
	return (
		<div
			className="grid gap-2"
			style={{ gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))" }}
		>
			{presets.map((preset) => (
				<PresetItem key={preset.type} preset={preset} />
			))}
		</div>
	);
}

/**
 * Applies a keyframe-animated transform preset (e.g. Ken Burns) to the
 * currently selected clip. Unlike a single `TransformItem`, this adds one
 * or more `ClipTransform` instances AND writes animation channels
 * (`clipTransforms.<id>.params.<key>`) driven by the preset's keyframe
 * data — see `ApplyTransformPresetCommand`.
 */
function PresetItem({ preset }: { preset: TransformPreset }) {
	const editor = useEditor();
	const { selectedElements } = useElementSelection();

	const handleApplyToSelectedClip = useCallback(() => {
		const target = selectedElements[0];
		if (!target) return;

		const elementsWithTracks = editor.timeline.getElementsWithTracks({
			elements: [target],
		});
		const elementWithTrack = elementsWithTracks[0];
		if (
			!elementWithTrack ||
			!isTransformableElement(elementWithTrack.element)
		) {
			return;
		}

		editor.timeline.applyTransformPreset({
			trackId: target.trackId,
			elementId: target.elementId,
			presetType: preset.type,
		});
	}, [editor, selectedElements, preset.type]);

	const preview = (
		<div className="flex size-full items-center justify-center bg-muted/40">
			<HugeiconsIcon
				icon={MagicWand05Icon}
				className="size-6 text-muted-foreground"
			/>
		</div>
	);

	return (
		<DraggableItem
			name={preset.name}
			preview={preview}
			dragData={{
				id: preset.type,
				name: preset.name,
				type: "effect",
				effectType: preset.type,
				targetElementTypes: TRANSFORM_TARGET_ELEMENT_TYPES,
			}}
			isDraggable={false}
			onAddToTimeline={handleApplyToSelectedClip}
			aspectRatio={1}
			isRounded
			variant="card"
			containerClassName="w-full"
		/>
	);
}

function TransformsGrid({ transforms }: { transforms: TransformDefinition[] }) {
	return (
		<div
			className="grid gap-2"
			style={{ gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))" }}
		>
			{transforms.map((transform) => (
				<TransformItem key={transform.type} transform={transform} />
			))}
		</div>
	);
}

function TransformPreviewCanvas({ transformType }: { transformType: string }) {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const render = () => {
			if (canvasRef.current) {
				transformPreviewService.renderPreview({
					transformType,
					params: {},
					targetCanvas: canvasRef.current,
				});
			}
		};

		render();
		return transformPreviewService.onPreviewImageReady({ callback: render });
	}, [transformType]);

	return <canvas ref={canvasRef} className="size-full" />;
}

function TransformItem({ transform }: { transform: TransformDefinition }) {
	const editor = useEditor();
	const { selectedElements } = useElementSelection();

	const handleAddToSelectedClip = useCallback(() => {
		// currentTime is unused — transforms attach to the selected clip,
		// not inserted at the playhead like standalone effect elements.
		const target = selectedElements[0];
		if (!target) return;

		const elementsWithTracks = editor.timeline.getElementsWithTracks({
			elements: [target],
		});
		const elementWithTrack = elementsWithTracks[0];
		if (
			!elementWithTrack ||
			!isTransformableElement(elementWithTrack.element)
		) {
			return;
		}

		editor.timeline.addClipTransform({
			trackId: target.trackId,
			elementId: target.elementId,
			transformType: transform.type,
		});
	}, [editor, selectedElements, transform.type]);

	const preview = <TransformPreviewCanvas transformType={transform.type} />;

	// Not draggable-onto-timeline: transforms only attach to an existing
	// transformable clip (no standalone track type), unlike effects. The
	// timeline drag/drop handler (use-timeline-drag-drop.ts) has no case
	// for "attach to selected element" — extending it is out of scope
	// here, so this card is click-to-add only. `dragData` is required by
	// DraggableItem's props but is never read because `isDraggable={false}`
	// disables the drag handlers entirely.
	return (
		<DraggableItem
			name={transform.name}
			preview={preview}
			dragData={{
				id: transform.type,
				name: transform.name,
				type: "effect",
				effectType: transform.type,
				targetElementTypes: TRANSFORM_TARGET_ELEMENT_TYPES,
			}}
			isDraggable={false}
			onAddToTimeline={handleAddToSelectedClip}
			aspectRatio={1}
			isRounded
			variant="card"
			containerClassName="w-full"
		/>
	);
}
