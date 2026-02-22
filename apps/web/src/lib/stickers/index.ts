import { STICKER_CATEGORIES } from "@/constants/sticker-constants";
import type { StickerCategory } from "@/types/stickers";
import { getAllProviders, getProvider } from "./registry";
import { resolveStickerId } from "./resolver";
import { registerDefaultStickerProviders } from "./providers";
import type { StickerProvider, StickerSearchResult } from "./types";

const DEFAULT_SEARCH_LIMIT = 100;

function mergeSearchResults({
	results,
}: {
	results: StickerSearchResult[];
}): StickerSearchResult {
	const deduplicatedItems = new Map<
		string,
		StickerSearchResult["items"][number]
	>();
	let total = 0;
	let hasMore = false;

	for (const result of results) {
		total += result.total;
		hasMore = hasMore || result.hasMore;
		for (const item of result.items) {
			if (!deduplicatedItems.has(item.id)) {
				deduplicatedItems.set(item.id, item);
			}
		}
	}

	return {
		items: Array.from(deduplicatedItems.values()),
		total,
		hasMore,
	};
}

function getProviderByCategory({
	category,
}: {
	category: StickerCategory;
}): StickerProvider | null {
	if (category === "all") {
		return null;
	}

	try {
		return getProvider({ providerId: category });
	} catch {
		return null;
	}
}

export async function searchStickers({
	query,
	category,
	limit = DEFAULT_SEARCH_LIMIT,
}: {
	query: string;
	category: StickerCategory;
	limit?: number;
}): Promise<StickerSearchResult> {
	registerDefaultStickerProviders({});

	const effectiveCategory = category in STICKER_CATEGORIES ? category : "all";
	if (effectiveCategory !== "all") {
		const provider = getProviderByCategory({ category: effectiveCategory });
		if (!provider) {
			return {
				items: [],
				total: 0,
				hasMore: false,
			};
		}
		return provider.search({
			query,
			options: { limit },
		});
	}

	const providers = getAllProviders();
	if (providers.length === 0) {
		return {
			items: [],
			total: 0,
			hasMore: false,
		};
	}

	const perProviderLimit = Math.max(1, Math.ceil(limit / providers.length));
	const settledResults = await Promise.allSettled(
		providers.map((provider) =>
			provider.search({
				query,
				options: { limit: perProviderLimit },
			}),
		),
	);

	const fulfilledResults = settledResults
		.filter(
			(result): result is PromiseFulfilledResult<StickerSearchResult> =>
				result.status === "fulfilled",
		)
		.map((result) => result.value);

	return mergeSearchResults({
		results: fulfilledResults,
	});
}

export async function browseStickers({
	category,
	page = 1,
	limit = DEFAULT_SEARCH_LIMIT,
}: {
	category: StickerCategory;
	page?: number;
	limit?: number;
}): Promise<StickerSearchResult> {
	registerDefaultStickerProviders({});

	const effectiveCategory = category in STICKER_CATEGORIES ? category : "all";
	if (effectiveCategory !== "all") {
		const provider = getProviderByCategory({ category: effectiveCategory });
		if (!provider) {
			return {
				items: [],
				total: 0,
				hasMore: false,
			};
		}
		return provider.browse({
			options: { page, limit },
		});
	}

	const providers = getAllProviders();
	if (providers.length === 0) {
		return {
			items: [],
			total: 0,
			hasMore: false,
		};
	}

	const perProviderLimit = Math.max(1, Math.ceil(limit / providers.length));
	const settledResults = await Promise.allSettled(
		providers.map((provider) =>
			provider.browse({
				options: { page, limit: perProviderLimit },
			}),
		),
	);

	const fulfilledResults = settledResults
		.filter(
			(result): result is PromiseFulfilledResult<StickerSearchResult> =>
				result.status === "fulfilled",
		)
		.map((result) => result.value);

	return mergeSearchResults({
		results: fulfilledResults,
	});
}

export { resolveStickerId };
export type {
	StickerItem,
	StickerProvider,
	StickerResolveOptions,
	StickerSearchResult,
} from "./types";
