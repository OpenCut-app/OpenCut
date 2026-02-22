// @ts-nocheck

"use client";

import Image from "next/image";
import { memo, useCallback, useMemo } from "react";
import { PanelView } from "@/components/editor/panels/assets/views/base-view";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	BLUR_INTENSITY_PRESETS,
	DEFAULT_BLUR_INTENSITY,
	DEFAULT_COLOR,
	FPS_PRESETS,
} from "@/constants/project-constants";
import { patternCraftGradients } from "@/data/colors/pattern-craft";
import { colors } from "@/data/colors/solid";
import { syntaxUIGradients } from "@/data/colors/syntax-ui";
import { useEditor } from "@/hooks/use-editor";
import { useEditorStore } from "@/stores/editor-store";
import { dimensionToAspectRatio } from "@/utils/geometry";
import { cn } from "@/utils/ui";
import {
	PropertyGroup,
	PropertyItem,
	PropertyItemLabel,
	PropertyItemValue,
} from "@/components/editor/panels/properties/section";

export function SettingsView() {
	return (
		<PanelView title="Project settings" contentClassName="px-0">
			<div className="flex flex-col gap-8">
				<ProjectInfoView />
				<BackgroundView />
			</div>
		</PanelView>
	);
}

function ProjectInfoView() {
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
			<PropertyItem direction="column">
				<PropertyItemLabel>Name</PropertyItemLabel>
				<PropertyItemValue>{activeProject.metadata.name}</PropertyItemValue>
			</PropertyItem>

			<PropertyItem direction="column">
				<PropertyItemLabel>Aspect ratio</PropertyItemLabel>
				<PropertyItemValue>
					<Select
						value={selectedPresetValue}
						onValueChange={(value) => handleAspectRatioChange({ value })}
					>
						<SelectTrigger>
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
				</PropertyItemValue>
			</PropertyItem>

			<PropertyItem direction="column">
				<PropertyItemLabel>Frame rate</PropertyItemLabel>
				<PropertyItemValue>
					<Select
						value={activeProject.settings.fps.toString()}
						onValueChange={handleFpsChange}
					>
						<SelectTrigger>
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
				</PropertyItemValue>
			</PropertyItem>
		</div>
	);
}

const BlurPreview = memo(
	({
		blur,
		isSelected,
		onSelect,
	}: {
		blur: { label: string; value: number };
		isSelected: boolean;
		onSelect: () => void;
	}) => (
		<button
			className={cn(
				"border-foreground/15 hover:border-primary relative aspect-square size-20 cursor-pointer overflow-hidden rounded-sm border",
				isSelected && "border-primary border-2",
			)}
			onClick={onSelect}
			type="button"
			aria-label={`Select ${blur.label} blur`}
		>
			<Image
				src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
				alt={`Blur preview ${blur.label}`}
				fill
				className="object-cover"
				style={{ filter: `blur(${blur.value}px)` }}
				loading="eager"
			/>
			<div className="absolute right-1 bottom-1 left-1 text-center">
				<span className="rounded bg-black/50 px-1 text-xs text-white">
					{blur.label}
				</span>
			</div>
		</button>
	),
);

BlurPreview.displayName = "BlurPreview";

const BackgroundPreviews = memo(
	({
		backgrounds,
		currentBackgroundColor,
		isColorBackground,
		handleColorSelect,
		useBackgroundColor = false,
	}: {
		backgrounds: string[];
		currentBackgroundColor: string;
		isColorBackground: boolean;
		handleColorSelect: ({ bg }: { bg: string }) => void;
		useBackgroundColor?: boolean;
	}) => {
		return useMemo(
			() =>
				backgrounds.map((bg, index) => (
					<button
						key={`${index}-${bg}`}
						className={cn(
							"border-foreground/15 hover:border-primary aspect-square size-20 cursor-pointer rounded-sm border",
							isColorBackground &&
								bg === currentBackgroundColor &&
								"border-primary border-2",
						)}
						style={
							useBackgroundColor
								? { backgroundColor: bg }
								: {
										background: bg,
										backgroundSize: "cover",
										backgroundPosition: "center",
										backgroundRepeat: "no-repeat",
									}
						}
						onClick={() => handleColorSelect({ bg })}
						type="button"
						aria-label={`Select background ${useBackgroundColor ? bg : index + 1}`}
					/>
				)),
			[
				backgrounds,
				isColorBackground,
				currentBackgroundColor,
				handleColorSelect,
				useBackgroundColor,
			],
		);
	},
);

BackgroundPreviews.displayName = "BackgroundPreviews";

function BackgroundView() {
	const editor = useEditor();
	const activeProject = editor.project.getActive();
	const blurLevels = useMemo(() => BLUR_INTENSITY_PRESETS, []);

	const handleBlurSelect = useCallback(
		async ({ blurIntensity }: { blurIntensity: number }) => {
			await editor.project.updateSettings({
				settings: { background: { type: "blur", blurIntensity } },
			});
		},
		[editor.project],
	);

	const handleColorSelect = useCallback(
		async ({ color }: { color: string }) => {
			await editor.project.updateSettings({
				settings: { background: { type: "color", color } },
			});
		},
		[editor.project],
	);

	const currentBlurIntensity =
		activeProject.settings.background.type === "blur"
			? activeProject.settings.background.blurIntensity
			: DEFAULT_BLUR_INTENSITY;

	const currentBackgroundColor =
		activeProject.settings.background.type === "color"
			? activeProject.settings.background.color
			: DEFAULT_COLOR;

	const isBlurBackground = activeProject.settings.background.type === "blur";
	const isColorBackground = activeProject.settings.background.type === "color";

	const blurPreviews = useMemo(
		() =>
			blurLevels.map((blur) => (
				<BlurPreview
					key={blur.value}
					blur={blur}
					isSelected={isBlurBackground && currentBlurIntensity === blur.value}
					onSelect={() => handleBlurSelect({ blurIntensity: blur.value })}
				/>
			)),
		[blurLevels, isBlurBackground, currentBlurIntensity, handleBlurSelect],
	);

	const backgroundSections = [
		{ title: "Colors", backgrounds: colors, useBackgroundColor: true },
		{ title: "Pattern craft", backgrounds: patternCraftGradients },
		{ title: "Syntax UI", backgrounds: syntaxUIGradients },
	];

	return (
		<div className="flex flex-col">
			<PropertyGroup title="Blur" hasBorderTop={false} defaultExpanded={false}>
				<div className="flex flex-wrap gap-2">{blurPreviews}</div>
			</PropertyGroup>

			{backgroundSections.map((section) => (
				<PropertyGroup
					key={section.title}
					title={section.title}
					defaultExpanded={false}
				>
					<div className="flex flex-wrap gap-2">
						<BackgroundPreviews
							backgrounds={section.backgrounds}
							currentBackgroundColor={currentBackgroundColor}
							isColorBackground={isColorBackground}
							handleColorSelect={({ bg }) => handleColorSelect({ color: bg })}
							useBackgroundColor={section.useBackgroundColor}
						/>
					</div>
				</PropertyGroup>
			))}
		</div>
	);
}
