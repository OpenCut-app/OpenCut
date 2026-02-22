import { forwardRef, useEffect, useRef, useState } from "react";
import { cn } from "@/utils/ui";
import { Input } from "./input";
import {
	Popover,
	PopoverClose,
	PopoverContent,
	PopoverTrigger,
} from "./popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./select";
import { Button } from "./button";
import { Cancel01Icon, ColorPickerIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	type ColorFormat,
	appendAlpha,
	extractColorFromText,
	formatColorValue,
	hexToHsv,
	hsvToHex,
	parseColorInput,
	parseHexAlpha,
} from "@/utils/color";

interface ColorPickerProps {
	value?: string;
	onChange?: (value: string) => void;
	onChangeEnd?: (value: string) => void;
	className?: string;
}

const ColorPicker = forwardRef<HTMLDivElement, ColorPickerProps>(
	({ className, value = "FFFFFF", onChange, onChangeEnd, ...props }, ref) => {
		const [isDragging, setIsDragging] = useState<
			"saturation" | "hue" | "opacity" | null
		>(null);
		const [internalHue, setInternalHue] = useState(0);
		const [inputValue, setInputValue] = useState(value);
		const [colorFormat, setColorFormat] = useState<ColorFormat>("hex");

		const saturationRef = useRef<HTMLButtonElement>(null);
		const hueRef = useRef<HTMLButtonElement>(null);
		const opacityRef = useRef<HTMLButtonElement>(null);
		const latestDragColorRef = useRef<string | null>(null);

		const isEyeDropperSupported =
			typeof window !== "undefined" && "EyeDropper" in window;

		const { rgb: rgbValue, alpha } = parseHexAlpha({ hex: value });
		const [h, s, v] = hexToHsv({ hex: rgbValue });

		const handleEyeDropper = async () => {
			if (!isEyeDropperSupported || !EyeDropper) return;
			try {
				const dropper = new EyeDropper();
				const result = await dropper.open();
				const hex = result.sRGBHex.replace("#", "").toLowerCase();
				const finalHex = appendAlpha({ rgbHex: hex, alpha });
				onChange?.(finalHex);
				onChangeEnd?.(finalHex);
			} catch {
				// user cancelled the picker
			}
		};
		const hueDiff = Math.abs(h - internalHue);
		const isSameHueWrapped = hueDiff < 1 || Math.abs(hueDiff - 360) < 1;
		const displayHue = s === 0 || isSameHueWrapped ? internalHue : h;

		useEffect(() => {
			setInputValue(formatColorValue({ hex: value, format: colorFormat }));
		}, [value, colorFormat]);

		useEffect(() => {
			const handleMouseMove = (e: MouseEvent) => {
				if (!isDragging) return;

				if (isDragging === "saturation" && saturationRef.current) {
					const rect = saturationRef.current.getBoundingClientRect();
					const x = Math.max(
						0,
						Math.min(1, (e.clientX - rect.left) / rect.width),
					);
					const y = Math.max(
						0,
						Math.min(1, (e.clientY - rect.top) / rect.height),
					);
					const newHex = appendAlpha({
						rgbHex: hsvToHex({ h: displayHue, s: x, v: 1 - y }),
						alpha,
					});
					latestDragColorRef.current = newHex;
					onChange?.(newHex);
				}

				if (isDragging === "hue" && hueRef.current) {
					const rect = hueRef.current.getBoundingClientRect();
					const x = Math.max(
						0,
						Math.min(1, (e.clientX - rect.left) / rect.width),
					);
					const newH = x * 360;
					setInternalHue(newH);
					if (s > 0) {
						const newHex = appendAlpha({
							rgbHex: hsvToHex({ h: newH, s, v }),
							alpha,
						});
						latestDragColorRef.current = newHex;
						onChange?.(newHex);
					}
				}

				if (isDragging === "opacity" && opacityRef.current) {
					const rect = opacityRef.current.getBoundingClientRect();
					const x = Math.max(
						0,
						Math.min(1, (e.clientX - rect.left) / rect.width),
					);
					const newHex = appendAlpha({ rgbHex: rgbValue, alpha: x });
					latestDragColorRef.current = newHex;
					onChange?.(newHex);
				}
			};

			const handleMouseUp = () => {
				if (latestDragColorRef.current !== null && onChangeEnd) {
					onChangeEnd(latestDragColorRef.current);
					latestDragColorRef.current = null;
				}
				setIsDragging(null);
			};

			if (isDragging) {
				document.addEventListener("mousemove", handleMouseMove);
				document.addEventListener("mouseup", handleMouseUp);
				return () => {
					document.removeEventListener("mousemove", handleMouseMove);
					document.removeEventListener("mouseup", handleMouseUp);
				};
			}
		}, [isDragging, displayHue, s, v, alpha, rgbValue, onChange, onChangeEnd]);

		const handleSaturationMouseDown = (e: React.MouseEvent) => {
			e.preventDefault();
			const saturationElement = saturationRef.current;
			if (!saturationElement) return;
			setIsDragging("saturation");
			const rect = saturationElement.getBoundingClientRect();
			const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
			const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
			const newHex = appendAlpha({
				rgbHex: hsvToHex({ h: displayHue, s: x, v: 1 - y }),
				alpha,
			});
			latestDragColorRef.current = newHex;
			onChange?.(newHex);
		};

		const handleHueMouseDown = (e: React.MouseEvent) => {
			e.preventDefault();
			const hueElement = hueRef.current;
			if (!hueElement) return;
			setIsDragging("hue");
			const rect = hueElement.getBoundingClientRect();
			const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
			const newH = x * 360;
			setInternalHue(newH);
			if (s > 0) {
				const newHex = appendAlpha({
					rgbHex: hsvToHex({ h: newH, s, v }),
					alpha,
				});
				latestDragColorRef.current = newHex;
				onChange?.(newHex);
			}
		};

		const handleOpacityMouseDown = (e: React.MouseEvent) => {
			e.preventDefault();
			const opacityElement = opacityRef.current;
			if (!opacityElement) return;
			setIsDragging("opacity");
			const rect = opacityElement.getBoundingClientRect();
			const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
			const newHex = appendAlpha({ rgbHex: rgbValue, alpha: x });
			latestDragColorRef.current = newHex;
			onChange?.(newHex);
		};

		const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
			setInputValue(
				colorFormat === "hex"
					? e.target.value.replace("#", "")
					: e.target.value,
			);
		};

		const commitInputValue = () => {
			const parsed = parseColorInput({
				input: inputValue,
				format: colorFormat,
			});
			if (parsed) {
				const nextHex = appendAlpha({ rgbHex: parsed, alpha });
				onChange?.(nextHex);
				onChangeEnd?.(nextHex);
				return;
			}

			const extracted = extractColorFromText({ text: inputValue });
			if (extracted) {
				const hasExplicitAlpha = extracted.length > 6;
				const finalHex = hasExplicitAlpha
					? extracted
					: appendAlpha({ rgbHex: extracted, alpha });
				onChange?.(finalHex);
				onChangeEnd?.(finalHex);
			}
		};

		const handleInputBlur = () => {
			commitInputValue();
		};

		const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter") {
				commitInputValue();
				e.currentTarget.blur();
			}
		};

		const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
			const pastedText = event.clipboardData.getData("text");
			const extractedHex = extractColorFromText({ text: pastedText });
			if (!extractedHex) return;

			event.preventDefault();
			const hasExplicitAlpha = extractedHex.length > 6;
			const finalHex = hasExplicitAlpha
				? extractedHex
				: appendAlpha({ rgbHex: extractedHex, alpha });
			onChange?.(finalHex);
			onChangeEnd?.(finalHex);
		};

		const saturationStyle = {
			background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${displayHue}, 100%, 50%))`,
		};

		const hueStyle = {
			background:
				"linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)",
		};

		const checkerboardStyle = {
			backgroundImage: `
        linear-gradient(45deg, rgba(0,0,0,0.1) 25%, transparent 25%),
        linear-gradient(-45deg, rgba(0,0,0,0.1) 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, rgba(0,0,0,0.1) 75%),
        linear-gradient(-45deg, transparent 75%, rgba(0,0,0,0.1) 75%)
      `,
			backgroundSize: "8px 8px",
			backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0px",
			backgroundColor: "#fff",
		};

		return (
			<Popover>
				<div
					ref={ref}
					className={cn(
						"bg-accent flex h-8 flex-1 items-center gap-2 rounded-md px-[0.45rem]",
						className,
					)}
					{...props}
				>
					<PopoverTrigger asChild>
						<button
							className="size-4.5 cursor-pointer border rounded-sm hover:ring-1 hover:ring-foreground/20"
							style={{ backgroundColor: `#${value}` }}
							type="button"
						/>
					</PopoverTrigger>
					<div className="flex flex-1 items-center">
						<Input
							className={cn(
								"!border-0 bg-transparent p-0 !ring-0 !ring-offset-0",
								colorFormat === "hex" && "uppercase",
							)}
							size="sm"
							containerClassName="w-full"
							value={inputValue}
							onChange={handleInputChange}
							onBlur={handleInputBlur}
							onKeyDown={handleInputKeyDown}
							onPaste={handlePaste}
						/>
					</div>
				</div>
				<PopoverContent
					className="w-64 px-0 select-none flex flex-col gap-3 py-2"
					side="left"
					sideOffset={8}
					onOpenAutoFocus={(event) => {
						event.preventDefault();
					}}
					onCloseAutoFocus={(event) => {
						event.preventDefault();
					}}
					onInteractOutside={(event) => {
						if (isDragging) event.preventDefault();
					}}
				>
					<header className="border-b flex justify-between items-center pb-2 px-2">
						<Select defaultValue="custom">
							<SelectTrigger variant="outline">
								<SelectValue placeholder="Select a mode" />
							</SelectTrigger>
							<SelectContent position="popper">
								<SelectItem value="custom">Custom</SelectItem>
								<SelectItem value="saved">Saved</SelectItem>
							</SelectContent>
						</Select>
						<div>
							{isEyeDropperSupported && (
								<Button
									variant="ghost"
									size="icon"
									type="button"
									onClick={handleEyeDropper}
								>
									<HugeiconsIcon icon={ColorPickerIcon} />
								</Button>
							)}
							<PopoverClose asChild>
								<Button variant="ghost" size="icon" type="button">
									<HugeiconsIcon icon={Cancel01Icon} />
								</Button>
							</PopoverClose>
						</div>
					</header>
					<div className="px-2 flex flex-col gap-3">
						<button
							ref={saturationRef}
							className="relative h-44 aspect-square w-full appearance-none border-0 bg-transparent p-0"
							style={saturationStyle}
							type="button"
							onMouseDown={handleSaturationMouseDown}
						>
							<ColorCircle
								size="sm"
								position={{ left: `${s * 100}%`, top: `${(1 - v) * 100}%` }}
								color={`#${value}`}
							/>
						</button>

						<button
							ref={hueRef}
							className="relative h-4 w-full rounded-lg appearance-none border-0 bg-transparent p-0"
							style={hueStyle}
							type="button"
							onMouseDown={handleHueMouseDown}
						>
							<ColorCircle
								size="md"
								position={{
									left: `calc(0.5rem + (100% - 1rem) * ${displayHue / 360})`,
									top: "50%",
								}}
							/>
						</button>

						<button
							ref={opacityRef}
							className="relative h-4 w-full overflow-hidden rounded-lg appearance-none border-0 p-0"
							style={checkerboardStyle}
							type="button"
							onMouseDown={handleOpacityMouseDown}
						>
							<div
								className="absolute inset-0 rounded-lg"
								style={{
									background: `linear-gradient(to right, transparent, #${rgbValue})`,
								}}
							/>
							<ColorCircle
								size="md"
								position={{
									left: `calc(0.5rem + (100% - 1rem) * ${alpha})`,
									top: "50%",
								}}
							/>
						</button>

						<div className="flex items-center gap-2">
							<Select
								value={colorFormat}
								onValueChange={(value) => setColorFormat(value as ColorFormat)}
							>
								<SelectTrigger variant="outline" className="min-w-18 max-w-18">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="hex">HEX</SelectItem>
									<SelectItem value="rgb">RGB</SelectItem>
									<SelectItem value="hsl">HSL</SelectItem>
									<SelectItem value="hsv">HSV</SelectItem>
								</SelectContent>
							</Select>

							<Input
								className={cn(
									"h-7 rounded-sm p-2.5",
									colorFormat === "hex" && "uppercase",
								)}
								type="text"
								value={inputValue}
								onChange={handleInputChange}
								onBlur={handleInputBlur}
								onKeyDown={handleInputKeyDown}
								onPaste={handlePaste}
							/>
						</div>
					</div>
				</PopoverContent>
			</Popover>
		);
	},
);
ColorPicker.displayName = "ColorPicker";

const ColorCircle = ({
	size,
	position,
	color,
}: {
	size: "sm" | "md";
	position: { left: string; top: string };
	color?: string;
}) => (
	<div
		className={`pointer-events-none absolute rounded-full border-3 border-white shadow-lg ${
			size === "sm" ? "size-3" : "size-4"
		}`}
		style={{
			left: position.left,
			top: position.top,
			transform: "translate(-50%, -50%)",
			backgroundColor: color,
		}}
	/>
);

export { ColorPicker };
