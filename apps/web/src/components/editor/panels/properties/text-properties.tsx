import { Textarea } from "@/components/ui/textarea";
import { FontPicker } from "@/components/ui/font-picker";
import type { TextElement } from "@/types/timeline";
import { Slider } from "@/components/ui/slider";
import { NumberField } from "@/components/ui/number-field";
import { useRef } from "react";
import { Section, SectionContent, SectionHeader } from "./section";
import { ColorPicker } from "@/components/ui/color-picker";
import { uppercase } from "@/utils/string";
import { clamp } from "@/utils/math";
import { useEditor } from "@/hooks/use-editor";
import { DEFAULT_COLOR } from "@/constants/project-constants";
import {
	DEFAULT_TEXT_ELEMENT,
	MAX_FONT_SIZE,
	MIN_FONT_SIZE,
} from "@/constants/text-constants";
import { usePropertyDraft } from "./hooks/use-property-draft";
import { TransformSection, BlendingSection } from "./sections";
import {
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
} from "@/components/ui/select";
import { OcFontWeightIcon } from "@opencut/ui/icons";
import { Label } from "@/components/ui/label";

export function TextProperties({
	element,
	trackId,
}: {
	element: TextElement;
	trackId: string;
}) {
	return (
		<div className="flex h-full flex-col">
			<ContentSection element={element} trackId={trackId} />
			<TransformSection element={element} trackId={trackId} />
			<BlendingSection element={element} trackId={trackId} />
			<FontSection element={element} trackId={trackId} />
			<ColorSection element={element} trackId={trackId} />
		</div>
	);
}

function ContentSection({
	element,
	trackId,
}: {
	element: TextElement;
	trackId: string;
}) {
	const editor = useEditor();

	const content = usePropertyDraft({
		displayValue: element.content,
		parse: (input) => input,
		onPreview: (value) =>
			editor.timeline.previewElements({
				updates: [
					{ trackId, elementId: element.id, updates: { content: value } },
				],
			}),
		onCommit: () => editor.timeline.commitPreview(),
	});

	return (
		<Section collapsible sectionKey="text:content" hasBorderTop={false}>
			<SectionHeader title="Content" />
			<SectionContent>
				<Textarea
					placeholder="Name"
					value={content.displayValue}
					className="min-h-20"
					onFocus={content.onFocus}
					onChange={content.onChange}
					onBlur={content.onBlur}
				/>
			</SectionContent>
		</Section>
	);
}

function FontSection({
	element,
	trackId,
}: {
	element: TextElement;
	trackId: string;
}) {
	const editor = useEditor();

	const fontSize = usePropertyDraft({
		displayValue: element.fontSize.toString(),
		parse: (input) => {
			const parsed = parseFloat(input);
			if (Number.isNaN(parsed)) return null;
			return clamp({ value: parsed, min: MIN_FONT_SIZE, max: MAX_FONT_SIZE });
		},
		onPreview: (value) =>
			editor.timeline.previewElements({
				updates: [
					{ trackId, elementId: element.id, updates: { fontSize: value } },
				],
			}),
		onCommit: () => editor.timeline.commitPreview(),
	});

	return (
		<Section collapsible sectionKey="text:font">
			<SectionHeader title="Font" />
			<SectionContent>
				<div className="flex flex-col gap-2">
					<FontPicker
						defaultValue={element.fontFamily}
						onValueChange={(value) =>
							editor.timeline.updateElements({
								updates: [
									{
										trackId,
										elementId: element.id,
										updates: { fontFamily: value },
									},
								],
							})
						}
					/>
					<Select value={element.fontWeight}>
						<SelectTrigger className="w-full" icon={<OcFontWeightIcon />}>
							<SelectValue placeholder="Select weight" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="100">Thin</SelectItem>
							<SelectItem value="200">Extra Light</SelectItem>
							<SelectItem value="300">Light</SelectItem>
							<SelectItem value="400">Normal</SelectItem>
							<SelectItem value="500">Medium</SelectItem>
							<SelectItem value="600">Semi Bold</SelectItem>
							<SelectItem value="700">Bold</SelectItem>
							<SelectItem value="800">Extra Bold</SelectItem>
							<SelectItem value="900">Black</SelectItem>
						</SelectContent>
					</Select>

					<Label>Font size</Label>
					<div className="flex items-center gap-2">
						<Slider
							value={[element.fontSize]}
							min={MIN_FONT_SIZE}
							max={MAX_FONT_SIZE}
							step={1}
							onValueChange={([value]) =>
								editor.timeline.previewElements({
									updates: [
										{
											trackId,
											elementId: element.id,
											updates: { fontSize: value },
										},
									],
								})
							}
							onValueCommit={() => editor.timeline.commitPreview()}
							className="w-full"
						/>
						<NumberField
							className="w-18 shrink-0"
							value={fontSize.displayValue}
							min={MIN_FONT_SIZE}
							max={MAX_FONT_SIZE}
							onFocus={fontSize.onFocus}
							onChange={fontSize.onChange}
							onBlur={fontSize.onBlur}
							onReset={() =>
								editor.timeline.updateElements({
									updates: [
										{
											trackId,
											elementId: element.id,
											updates: {
												fontSize: DEFAULT_TEXT_ELEMENT.fontSize,
											},
										},
									],
								})
							}
							isDefault={element.fontSize === DEFAULT_TEXT_ELEMENT.fontSize}
						/>
					</div>
				</div>
			</SectionContent>
		</Section>
	);
}

function ColorSection({
	element,
	trackId,
}: {
	element: TextElement;
	trackId: string;
}) {
	const editor = useEditor();
	const lastSelectedColor = useRef(DEFAULT_COLOR);

	return (
		<Section collapsible sectionKey="text:color" hasBorderBottom={false}>
			<SectionHeader title="Color" />
			<SectionContent>
				<div className="flex flex-col gap-6">
					<ColorPicker
						value={uppercase({
							string: (element.color || "FFFFFF").replace("#", ""),
						})}
						onChange={(color) =>
							editor.timeline.previewElements({
								updates: [
									{
										trackId,
										elementId: element.id,
										updates: { color: `#${color}` },
									},
								],
							})
						}
						onChangeEnd={() => editor.timeline.commitPreview()}
					/>
					<ColorPicker
						value={
							element.backgroundColor === "transparent"
								? lastSelectedColor.current.replace("#", "")
								: element.backgroundColor.replace("#", "")
						}
						onChange={(color) => {
							const hexColor = `#${color}`;
							if (color !== "transparent") {
								lastSelectedColor.current = hexColor;
							}
							editor.timeline.previewElements({
								updates: [
									{
										trackId,
										elementId: element.id,
										updates: { backgroundColor: hexColor },
									},
								],
							});
						}}
						onChangeEnd={() => editor.timeline.commitPreview()}
						className={
							element.backgroundColor === "transparent"
								? "pointer-events-none opacity-50"
								: ""
						}
					/>
				</div>
			</SectionContent>
		</Section>
	);
}
