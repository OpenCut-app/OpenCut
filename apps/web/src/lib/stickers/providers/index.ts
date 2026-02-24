import { hasProvider, registerProvider } from "../registry";
import type { StickerProvider } from "@/types/stickers";
import { emojiProvider } from "./emoji";
import { flagsProvider } from "./flags";
import { iconsProvider } from "./icons";
import { shapesProvider } from "./shapes";

const defaultProviders: StickerProvider[] = [
	iconsProvider,
	emojiProvider,
	flagsProvider,
	shapesProvider,
];

export function registerDefaultStickerProviders({
	providersToRegister = defaultProviders,
}: {
	providersToRegister?: StickerProvider[];
} = {}): void {
	for (const provider of providersToRegister) {
		if (hasProvider({ providerId: provider.id })) {
			continue;
		}
		registerProvider({ provider });
	}
}
