/**
 * Generates font sprite atlas for the font picker.
 *
 * Downloads Google Fonts from Fontsource, renders each font name as a sprite,
 * packs them into chunk images, and outputs a JSON atlas + AVIF images.
 *
 * Run: npx tsx scripts/generate-font-sprites.ts
 * Deps: @napi-rs/canvas sharp (install as devDependencies)
 */

import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import sharp from "sharp";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const FONT_SIZE = 24;
const ROW_HEIGHT = 40;
const CANVAS_WIDTH = 1200;
const MAX_CHUNK_HEIGHT = 800;
const PADDING_X = 14;
const WIDTH_BUFFER = 8;
const CONCURRENT_DOWNLOADS = 30;

const OUTPUT_DIR = join(__dirname, "..", "public", "fonts");
const CACHE_DIR = join(__dirname, "..", ".font-cache");
const FONTSOURCE_API = "https://api.fontsource.org/v1/fonts";

interface FontsourceFont {
	id: string;
	family: string;
	subsets: string[];
	weights: number[];
	styles: string[];
	category: string;
	type: string;
}

interface MeasuredFont {
	family: string;
	width: number;
	styles: string[];
}

interface PackedFont {
	family: string;
	x: number;
	y: number;
	w: number;
}

interface AtlasEntry {
	x: number;
	y: number;
	w: number;
	ch: number;
	s: string[];
}

async function fetchFontList(): Promise<FontsourceFont[]> {
	console.log("Fetching font list from Fontsource...");
	const response = await fetch(FONTSOURCE_API);
	if (!response.ok) throw new Error(`Fontsource API error: ${response.status}`);

	const data: FontsourceFont[] = await response.json();
	const filtered = data.filter(
		(font) =>
			font.type === "google" &&
			font.subsets.includes("latin") &&
			font.weights.includes(400),
	);

	console.log(
		`  ${filtered.length} Google fonts with Latin subset + 400 weight`,
	);
	return filtered;
}

async function downloadFont({ id }: { id: string }): Promise<Buffer | null> {
	const cachePath = join(CACHE_DIR, `${id}.woff2`);

	if (existsSync(cachePath)) {
		return readFile(cachePath);
	}

	// Fontsource CDN serves woff2 for all Google fonts
	const url = `https://cdn.jsdelivr.net/fontsource/fonts/${id}@latest/latin-400-normal.woff2`;
	try {
		const response = await fetch(url);
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		const buffer = Buffer.from(await response.arrayBuffer());
		await writeFile(cachePath, buffer);
		return buffer;
	} catch {
		return null;
	}
}

async function downloadAllFonts({
	fonts,
	concurrency,
}: {
	fonts: FontsourceFont[];
	concurrency: number;
}): Promise<Map<string, Buffer>> {
	console.log(
		`Downloading ${fonts.length} font files (${concurrency} concurrent)...`,
	);
	const results = new Map<string, Buffer>();
	let nextIndex = 0;
	let completed = 0;

	async function worker() {
		while (nextIndex < fonts.length) {
			const index = nextIndex++;
			const font = fonts[index];
			const buffer = await downloadFont({ id: font.id });
			if (buffer) results.set(font.id, buffer);
			completed++;
			if (completed % 100 === 0 || completed === fonts.length) {
				process.stdout.write(`\r  ${completed}/${fonts.length}`);
			}
		}
	}

	await Promise.all(Array.from({ length: concurrency }, () => worker()));
	console.log(`\n  Downloaded ${results.size}/${fonts.length} fonts`);
	return results;
}

function measureFonts({
	fonts,
	fontBuffers,
}: {
	fonts: FontsourceFont[];
	fontBuffers: Map<string, Buffer>;
}): MeasuredFont[] {
	console.log("Registering fonts and measuring text...");
	const measured: MeasuredFont[] = [];
	const canvas = createCanvas(CANVAS_WIDTH, ROW_HEIGHT);
	const ctx = canvas.getContext("2d");

	for (const font of fonts) {
		const buffer = fontBuffers.get(font.id);
		if (!buffer) continue;

		try {
			const ok = GlobalFonts.register(buffer, font.family);
			if (!ok) continue;

			ctx.font = `${FONT_SIZE}px "${font.family}"`;
			const metrics = ctx.measureText(font.family);
			const width = Math.ceil(metrics.width) + WIDTH_BUFFER;

			const styles: string[] = [];
			for (const weight of font.weights) {
				if (font.styles.includes("normal")) styles.push(String(weight));
				if (font.styles.includes("italic")) styles.push(`${weight}i`);
			}

			measured.push({ family: font.family, width, styles });
		} catch {
			// skip fonts that fail to register
		}
	}

	measured.sort((a, b) => a.family.localeCompare(b.family));
	console.log(`  ${measured.length} fonts measured`);
	return measured;
}

function packIntoChunks({ measured }: { measured: MeasuredFont[] }): {
	atlas: Record<string, AtlasEntry>;
	chunks: PackedFont[][];
} {
	console.log("Packing into sprite chunks...");
	const atlas: Record<string, AtlasEntry> = {};
	const chunks: PackedFont[][] = [[]];
	let chunkIndex = 0;
	let cursorX = 0;
	let cursorY = 0;

	for (const font of measured) {
		// New row if doesn't fit horizontally
		if (cursorX + font.width > CANVAS_WIDTH) {
			cursorX = 0;
			cursorY += ROW_HEIGHT;
		}

		// New chunk if doesn't fit vertically
		if (cursorY + ROW_HEIGHT > MAX_CHUNK_HEIGHT) {
			chunkIndex++;
			chunks.push([]);
			cursorX = 0;
			cursorY = 0;
		}

		// Same data goes to BOTH the atlas and the chunk render list
		const x = cursorX;
		const y = cursorY;

		atlas[font.family] = {
			x,
			y,
			w: font.width,
			ch: chunkIndex,
			s: font.styles,
		};
		chunks[chunkIndex].push({ family: font.family, x, y, w: font.width });

		cursorX += font.width + PADDING_X;
	}

	console.log(`  ${chunks.length} chunks`);
	return { atlas, chunks };
}

async function renderChunks({
	chunks,
}: {
	chunks: PackedFont[][];
}): Promise<void> {
	console.log("Rendering sprite chunks...");

	for (let i = 0; i < chunks.length; i++) {
		const chunk = chunks[i];
		const chunkHeight = Math.max(...chunk.map((f) => f.y)) + ROW_HEIGHT;

		const canvas = createCanvas(CANVAS_WIDTH, chunkHeight);
		const ctx = canvas.getContext("2d");

		for (const font of chunk) {
			ctx.font = `${FONT_SIZE}px "${font.family}"`;
			ctx.fillStyle = "#000000";
			ctx.textBaseline = "middle";
			ctx.fillText(font.family, font.x, font.y + ROW_HEIGHT / 2);
		}

		const pngBuffer = canvas.toBuffer("image/png");
		await sharp(pngBuffer)
			.avif({ quality: 80 })
			.toFile(join(OUTPUT_DIR, `font-chunk-${i}.avif`));

		console.log(
			`  Chunk ${i}: ${chunk.length} fonts, ${CANVAS_WIDTH}×${chunkHeight}`,
		);
	}
}

async function main() {
	await mkdir(OUTPUT_DIR, { recursive: true });
	await mkdir(CACHE_DIR, { recursive: true });

	const fonts = await fetchFontList();
	const fontBuffers = await downloadAllFonts({
		fonts,
		concurrency: CONCURRENT_DOWNLOADS,
	});
	const measured = measureFonts({ fonts, fontBuffers });
	const { atlas, chunks } = packIntoChunks({ measured });
	await renderChunks({ chunks });

	// Write atlas JSON (compact for smaller file size)
	await writeFile(
		join(OUTPUT_DIR, "font-atlas.json"),
		JSON.stringify({ fonts: atlas }),
	);

	const totalFonts = Object.keys(atlas).length;
	console.log(
		`\nDone! ${totalFonts} fonts in ${chunks.length} chunks → ${OUTPUT_DIR}`,
	);
}

main().catch((error) => {
	console.error("Failed:", error);
	process.exit(1);
});
