import { useEditor } from "@/hooks/use-editor";
import { usePropertyDraft } from "../hooks/use-property-draft";
import { clamp } from "@/utils/math";
import { NumberField } from "@/components/ui/number-field";
import {
	DEFAULT_BLEND_MODE,
	DEFAULT_OPACITY,
} from "@/constants/timeline-constants";
import { OcCheckerboardIcon } from "@opencut/ui/icons";
import { Fragment, useRef } from "react";
import { Section, SectionContent, SectionHeader } from "../section";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { BlendMode } from "@/types/rendering";
import type { ElementType } from "@/types/timeline";
import { HugeiconsIcon } from "@hugeicons/react";
import { RainDropIcon } from "@hugeicons/core-free-icons";

type BlendingElement = {
	id: string;
	opacity: number;
	type: ElementType;
	blendMode?: BlendMode;
};

const BLEND_MODE_GROUPS = [
	[{ value: "normal", label: "Normal" }],
	[
		{ value: "darken", label: "Darken" },
		{ value: "multiply", label: "Multiply" },
		{ value: "color-burn", label: "Color Burn" },
	],
	[
		{ value: "lighten", label: "Lighten" },
		{ value: "screen", label: "Screen" },
		{ value: "plus-lighter", label: "Plus Lighter" },
		{ value: "color-dodge", label: "Color Dodge" },
	],
	[
		{ value: "overlay", label: "Overlay" },
		{ value: "soft-light", label: "Soft Light" },
		{ value: "hard-light", label: "Hard Light" },
	],
	[
		{ value: "difference", label: "Difference" },
		{ value: "exclusion", label: "Exclusion" },
	],
	[
		{ value: "hue", label: "Hue" },
		{ value: "saturation", label: "Saturation" },
		{ value: "color", label: "Color" },
		{ value: "luminosity", label: "Luminosity" },
	],
];

export function BlendingSection({
	element,
	trackId,
}: {
	element: BlendingElement;
	trackId: string;
}) {
	const editor = useEditor();
	const blendMode = element.blendMode ?? DEFAULT_BLEND_MODE;
	const didSelectRef = useRef(false);
	const committedBlendModeRef = useRef(blendMode);
	if (!editor.timeline.isPreviewActive()) {
		committedBlendModeRef.current = blendMode;
	}

	const previewBlendMode = (value: BlendMode) =>
		editor.timeline.previewElements({
			updates: [
				{ trackId, elementId: element.id, updates: { blendMode: value } },
			],
		});

	const commitBlendMode = (value: string) => {
		if (editor.timeline.isPreviewActive()) {
			editor.timeline.commitPreview();
		} else {
			editor.timeline.updateElements({
				updates: [
					{
						trackId,
						elementId: element.id,
						updates: { blendMode: value as BlendMode },
					},
				],
			});
		}
		didSelectRef.current = true;
	};

	const handleBlendModeOpenChange = (isOpen: boolean) => {
		if (!isOpen) {
			if (!didSelectRef.current) editor.timeline.discardPreview();
			didSelectRef.current = false;
		}
	};

	const opacity = usePropertyDraft({
		displayValue: Math.round(element.opacity * 100).toString(),
		parse: (input) => {
			const parsed = parseFloat(input);
			if (Number.isNaN(parsed)) return null;
			return clamp({ value: parsed, min: 0, max: 100 }) / 100;
		},
		onPreview: (value) =>
			editor.timeline.previewElements({
				updates: [
					{ trackId, elementId: element.id, updates: { opacity: value } },
				],
			}),
		onCommit: () => editor.timeline.commitPreview(),
	});

	return (
		<Section collapsible sectionKey={`${element.type}:blending`}>
			<SectionHeader title="Blending" />
			<SectionContent>
				<div className="flex items-start gap-2">
					<div className="w-1/2 space-y-1.5">
						<NumberField
							className="w-full"
							icon={
								<OcCheckerboardIcon className="size-3.5 text-muted-foreground" />
							}
							value={opacity.displayValue}
							min={0}
							max={100}
							onFocus={opacity.onFocus}
							onChange={opacity.onChange}
							onBlur={opacity.onBlur}
							onScrub={opacity.scrubTo}
							onScrubEnd={opacity.commitScrub}
							onReset={() =>
								editor.timeline.updateElements({
									updates: [
										{
											trackId,
											elementId: element.id,
											updates: { opacity: DEFAULT_OPACITY },
										},
									],
								})
							}
							isDefault={element.opacity === DEFAULT_OPACITY}
							dragSensitivity="slow"
						/>
					</div>
					<div className="w-1/2 space-y-1.5">
						<Select
							value={committedBlendModeRef.current}
							onOpenChange={handleBlendModeOpenChange}
							onValueChange={commitBlendMode}
						>
							<SelectTrigger
								icon={<HugeiconsIcon icon={RainDropIcon} />}
								className="w-full"
							>
								<SelectValue placeholder="Select blend mode" />
							</SelectTrigger>
							<SelectContent className="w-36">
								{BLEND_MODE_GROUPS.map((group, groupIndex) => (
									<Fragment key={group[0]?.value ?? `group-${groupIndex}`}>
										{group.map((option) => (
											<SelectItem
												key={option.value}
												value={option.value}
												onPointerEnter={() =>
													previewBlendMode(option.value as BlendMode)
												}
											>
												{option.label}
											</SelectItem>
										))}
										{groupIndex < BLEND_MODE_GROUPS.length - 1 ? (
											<SelectSeparator />
										) : null}
									</Fragment>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
			</SectionContent>
		</Section>
	);
}
