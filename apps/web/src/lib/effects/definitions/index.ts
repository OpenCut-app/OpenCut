import { effectsRegistry } from "../registry";
import { blurEffectDefinition } from "./blur";
import { blushEffectDefinition } from "./blush";
import { brightnessEffectDefinition } from "./brightness";
import { chromaticAberrationEffectDefinition } from "./chromatic-aberration";
import { colorBalanceEffectDefinition } from "./color-balance";
import { contrastEffectDefinition } from "./contrast";
import { exposureEffectDefinition } from "./exposure";
import { eyeEnhanceEffectDefinition } from "./eye-enhance";
import { faceBrightenEffectDefinition } from "./face-brighten";
import { filmGrainEffectDefinition } from "./film-grain";
import { gammaEffectDefinition } from "./gamma";
import { glitchEffectDefinition } from "./glitch";
import { hueShiftEffectDefinition } from "./hue-shift";
import { neonGlowEffectDefinition } from "./neon-glow";
import { oilPaintEffectDefinition } from "./oil-paint";
import { pixelateEffectDefinition } from "./pixelate";
import { saturationEffectDefinition } from "./saturation";
import { sharpenEffectDefinition } from "./sharpen";
import { sketchEffectDefinition } from "./sketch";
import { skinSmoothEffectDefinition } from "./skin-smooth";
import { slimFaceEffectDefinition } from "./slim-face";
import { teethWhitenEffectDefinition } from "./teeth-whiten";
import { temperatureEffectDefinition } from "./temperature";
import { vignetteEffectDefinition } from "./vignette";

const defaultEffects = [
	// Artistic
	blurEffectDefinition,
	vignetteEffectDefinition,
	filmGrainEffectDefinition,
	sharpenEffectDefinition,
	pixelateEffectDefinition,
	chromaticAberrationEffectDefinition,
	glitchEffectDefinition,
	neonGlowEffectDefinition,
	sketchEffectDefinition,
	oilPaintEffectDefinition,
	// Beauty
	skinSmoothEffectDefinition,
	faceBrightenEffectDefinition,
	eyeEnhanceEffectDefinition,
	teethWhitenEffectDefinition,
	blushEffectDefinition,
	slimFaceEffectDefinition,
	// Color & Tone
	brightnessEffectDefinition,
	contrastEffectDefinition,
	saturationEffectDefinition,
	hueShiftEffectDefinition,
	temperatureEffectDefinition,
	exposureEffectDefinition,
	gammaEffectDefinition,
	colorBalanceEffectDefinition,
];

export function registerDefaultEffects(): void {
	for (const definition of defaultEffects) {
		if (effectsRegistry.has(definition.type)) {
			continue;
		}
		effectsRegistry.register(definition.type, definition);
	}
}
