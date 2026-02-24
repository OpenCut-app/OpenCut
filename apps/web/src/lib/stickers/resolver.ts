import { getProvider } from "./registry";
import { parseStickerId } from "./sticker-id";
import { registerDefaultStickerProviders } from "./providers";
import type { StickerResolveOptions } from "@/types/stickers";

export function resolveStickerId({
	stickerId,
	options,
}: {
	stickerId: string;
	options?: StickerResolveOptions;
}): string {
	registerDefaultStickerProviders();

	const parsedStickerId = parseStickerId({ stickerId });
	return getProvider({
		providerId: parsedStickerId.providerId,
	}).resolveUrl({
		stickerId,
		options,
	});
}
