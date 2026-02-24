import type { FontAtlas } from "@/types/fonts";
import { SYSTEM_FONTS } from "@/constants/font-constants";

const GOOGLE_FONTS_CSS = "https://fonts.googleapis.com/css2";

const fullLoaded = new Set<string>();

let cachedAtlas: FontAtlas | null = null;
let atlasFetchPromise: Promise<FontAtlas | null> | null = null;

function encodeFamily(family: string): string {
	return family.replace(/ /g, "+");
}

export function getCachedFontAtlas(): FontAtlas | null {
	return cachedAtlas;
}

export function clearFontAtlasCache(): void {
	cachedAtlas = null;
	atlasFetchPromise = null;
}

async function fetchAtlas(): Promise<FontAtlas | null> {
	if (cachedAtlas) return cachedAtlas;
	if (atlasFetchPromise) return atlasFetchPromise;

	atlasFetchPromise = fetch("/fonts/font-atlas.json")
		.then(async (response) => {
			if (!response.ok) return null;
			const data: FontAtlas = await response.json();
			cachedAtlas = data;
			return data;
		})
		.catch(() => null);

	return atlasFetchPromise;
}

function preloadChunkImages({ atlas }: { atlas: FontAtlas }): void {
	const maxChunk = Math.max(
		...Object.values(atlas.fonts).map((entry) => entry.ch),
	);
	for (let i = 0; i <= maxChunk; i++) {
		const img = new Image();
		img.src = `/fonts/font-chunk-${i}.avif`;
	}
}

export function prefetchFontAtlas(): Promise<FontAtlas | null> {
	return fetchAtlas().then((atlas) => {
		if (atlas) preloadChunkImages({ atlas });
		return atlas;
	});
}

export async function loadFullFont({
	family,
	weights = [400, 700],
}: {
	family: string;
	weights?: number[];
}): Promise<void> {
	if (fullLoaded.has(family)) return;

	const url = `${GOOGLE_FONTS_CSS}?family=${encodeFamily(family)}:wght@${weights.join(";")}&display=swap`;
	const link = document.createElement("link");
	link.rel = "stylesheet";
	link.href = url;
	document.head.appendChild(link);
	await new Promise<void>((resolve) => {
		link.addEventListener("load", () => resolve(), { once: true });
		link.addEventListener("error", () => resolve(), { once: true });
	});
	await Promise.all(
		weights.map((weight) =>
			document.fonts.load(`${weight} 16px "${family.replace(/"/g, '\\"')}"`),
		),
	);
	fullLoaded.add(family);
}

export async function loadFonts({
	families,
}: {
	families: string[];
}): Promise<void> {
	const googleFonts = families.filter((family) => !SYSTEM_FONTS.has(family));
	await Promise.all(googleFonts.map((family) => loadFullFont({ family })));
}
