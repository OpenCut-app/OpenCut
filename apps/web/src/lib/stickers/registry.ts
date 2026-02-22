import type { StickerProvider } from "@/types/stickers";

const providers = new Map<string, StickerProvider>();

export function registerProvider({
	provider,
}: {
	provider: StickerProvider;
}): void {
	providers.set(provider.id, provider);
}

export function hasProvider({ providerId }: { providerId: string }): boolean {
	return providers.has(providerId);
}

export function getProvider({
	providerId,
}: {
	providerId: string;
}): StickerProvider {
	const provider = providers.get(providerId);
	if (!provider) {
		throw new Error(`Unknown sticker provider: ${providerId}`);
	}
	return provider;
}

export function getAllProviders(): StickerProvider[] {
	return Array.from(providers.values());
}
