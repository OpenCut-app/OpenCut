import {
	POPULAR_COLLECTIONS,
	getIconSvgUrl,
	searchIcons,
} from "@/lib/iconify-api";
import { buildStickerId, parseStickerId } from "../sticker-id";
import type {
	StickerItem,
	StickerProvider,
	StickerSearchResult,
} from "../types";

const ICONS_PROVIDER_ID = "icons";
const DEFAULT_SEARCH_LIMIT = 100;

const ICONS_PREFIXES = Array.from(
	new Set(
		[...POPULAR_COLLECTIONS.general, ...POPULAR_COLLECTIONS.brands].map(
			(collection) => collection.prefix,
		),
	),
);

const DEFAULT_ICONS_BROWSE = [
	"mdi:home",
	"mdi:star",
	"mdi:heart",
	"mdi:check-circle",
	"mdi:account",
	"mdi:camera",
	"mdi:music",
	"mdi:map-marker",
	"mdi:calendar",
	"mdi:lightning-bolt",
	"mdi:cog",
	"mdi:rocket",
];

function getDisplayNameFromIconName({
	iconName,
}: {
	iconName: string;
}): string {
	const [, rawName = iconName] = iconName.split(":");
	return rawName.replaceAll("-", " ").replaceAll("_", " ");
}

function toStickerItem({ iconName }: { iconName: string }): StickerItem {
	return {
		id: buildStickerId({
			providerId: ICONS_PROVIDER_ID,
			providerValue: iconName,
		}),
		provider: ICONS_PROVIDER_ID,
		name: getDisplayNameFromIconName({ iconName }),
		previewUrl: getIconSvgUrl(iconName, { width: 64, height: 64 }),
		metadata: { iconName },
	};
}

function computeHasMore({
	total,
	limit,
	start = 0,
}: {
	total: number;
	limit: number;
	start?: number;
}): boolean {
	return start + limit < total;
}

export const iconsProvider: StickerProvider = {
	id: ICONS_PROVIDER_ID,
	async search({
		query,
		options,
	}: {
		query: string;
		options?: { limit?: number };
	}): Promise<StickerSearchResult> {
		const limit = options?.limit ?? DEFAULT_SEARCH_LIMIT;
		const searchResult = await searchIcons(query, limit, ICONS_PREFIXES);
		return {
			items: searchResult.icons.map((iconName) => toStickerItem({ iconName })),
			total: searchResult.total,
			hasMore: computeHasMore({
				total: searchResult.total,
				limit: searchResult.limit,
				start: searchResult.start,
			}),
		};
	},
	async browse({
		options,
	}: {
		options?: { page?: number; limit?: number };
	}): Promise<StickerSearchResult> {
		const limit = options?.limit ?? DEFAULT_ICONS_BROWSE.length;
		const items = DEFAULT_ICONS_BROWSE.slice(0, limit).map((iconName) =>
			toStickerItem({ iconName }),
		);
		return {
			items,
			total: items.length,
			hasMore: false,
		};
	},
	resolveUrl({
		stickerId,
		options,
	}: {
		stickerId: string;
		options?: { width?: number; height?: number };
	}): string {
		const { providerValue } = parseStickerId({ stickerId });
		return getIconSvgUrl(providerValue, {
			width: options?.width,
			height: options?.height,
		});
	},
};
