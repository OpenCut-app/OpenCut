"use client";

import { PanelView } from "@/components/editor/panels/assets/views/base-view";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { FPS_PRESETS } from "@/constants/project-constants";
import { useEditor } from "@/hooks/use-editor";
import { useEditorStore } from "@/stores/editor-store";
import { dimensionToAspectRatio } from "@/utils/geometry";
import {
	Section,
	SectionContent,
	SectionHeader,
} from "@/components/editor/panels/properties/section";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";

export function SettingsView() {
	const [open, setOpen] = useState(false);

	return (
		<PanelView contentClassName="px-0" hideHeader>
			<div className="flex flex-col">
				<Section hasBorderTop={false}>
					<SectionContent>
						<ProjectInfoContent />
					</SectionContent>
				</Section>
				<Popover open={open} onOpenChange={setOpen}>
					<Section className="cursor-pointer">
						<PopoverTrigger asChild>
							<div>
								<SectionHeader title="Background">
									<div className="size-4 rounded-sm bg-red-500" />
								</SectionHeader>
							</div>
						</PopoverTrigger>
					</Section>
					<PopoverContent>
						<div className="size-4 rounded-sm bg-red-500" />
					</PopoverContent>
				</Popover>
			</div>
		</PanelView>
	);
}

function ProjectInfoContent() {
	const editor = useEditor();
	const activeProject = editor.project.getActive();
	const { canvasPresets } = useEditorStore();

	const findPresetIndexByAspectRatio = ({
		presets,
		targetAspectRatio,
	}: {
		presets: Array<{ width: number; height: number }>;
		targetAspectRatio: string;
	}) => {
		for (let index = 0; index < presets.length; index++) {
			const preset = presets[index];
			const presetAspectRatio = dimensionToAspectRatio({
				width: preset.width,
				height: preset.height,
			});
			if (presetAspectRatio === targetAspectRatio) {
				return index;
			}
		}
		return -1;
	};

	const currentCanvasSize = activeProject.settings.canvasSize;
	const currentAspectRatio = dimensionToAspectRatio(currentCanvasSize);
	const originalCanvasSize = activeProject.settings.originalCanvasSize ?? null;
	const presetIndex = findPresetIndexByAspectRatio({
		presets: canvasPresets,
		targetAspectRatio: currentAspectRatio,
	});
	const originalPresetValue = "original";
	const selectedPresetValue =
		presetIndex !== -1 ? presetIndex.toString() : originalPresetValue;

	const handleAspectRatioChange = ({ value }: { value: string }) => {
		if (value === originalPresetValue) {
			const canvasSize = originalCanvasSize ?? currentCanvasSize;
			editor.project.updateSettings({
				settings: { canvasSize },
			});
			return;
		}
		const index = parseInt(value, 10);
		const preset = canvasPresets[index];
		if (preset) {
			editor.project.updateSettings({ settings: { canvasSize: preset } });
		}
	};

	const handleFpsChange = (value: string) => {
		const fps = parseFloat(value);
		editor.project.updateSettings({ settings: { fps } });
	};

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-2">
				<Label>Name</Label>
				<span className="leading-none text-sm">
					{activeProject.metadata.name}
				</span>
			</div>
			<div className="flex flex-col gap-2">
				<Label>Aspect ratio</Label>
				<Select
					value={selectedPresetValue}
					onValueChange={(value) => handleAspectRatioChange({ value })}
				>
					<SelectTrigger className="w-fit">
						<SelectValue placeholder="Select an aspect ratio" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={originalPresetValue}>Original</SelectItem>
						{canvasPresets.map((preset, index) => {
							const label = dimensionToAspectRatio({
								width: preset.width,
								height: preset.height,
							});
							return (
								<SelectItem key={label} value={index.toString()}>
									{label}
								</SelectItem>
							);
						})}
					</SelectContent>
				</Select>
			</div>
			<div className="flex flex-col gap-2">
				<Label>Frame rate</Label>
				<Select
					value={activeProject.settings.fps.toString()}
					onValueChange={handleFpsChange}
				>
					<SelectTrigger className="w-fit">
						<SelectValue placeholder="Select a frame rate" />
					</SelectTrigger>
					<SelectContent>
						{FPS_PRESETS.map((preset) => (
							<SelectItem key={preset.value} value={preset.value}>
								{preset.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		</div>
	);
}
