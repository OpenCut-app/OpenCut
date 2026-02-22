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

const EMOJI_PROVIDER_ID = "emoji";
const DEFAULT_SEARCH_LIMIT = 100;

const EMOJI_PREFIXES = POPULAR_COLLECTIONS.emoji.map(
	(collection) => collection.prefix,
);

const DEFAULT_EMOJI_BROWSE = [
	"noto:grinning-face",
	"noto:smiling-face-with-heart-eyes",
	"noto:fire",
	"noto:rocket",
	"noto:party-popper",
	"noto:clapping-hands",
	"noto:sparkles",
	"noto:red-heart",
	"noto:thumbs-up",
	"noto:eyes",
	"noto:thinking-face",
	"noto:hundred-points",
];

function getDisplayNameFromIconName({
	iconName,
}: {
	iconName: string;
}): string {
	const parts = iconName.split(":");
	const rawName = parts[parts.length - 1] ?? iconName;
	return rawName.replaceAll("-", " ").replaceAll("_", " ");
}

function toStickerItem({ iconName }: { iconName: string }): StickerItem {
	return {
		id: buildStickerId({
			providerId: EMOJI_PROVIDER_ID,
			providerValue: iconName,
		}),
		provider: EMOJI_PROVIDER_ID,
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

export const emojiProvider: StickerProvider = {
	id: EMOJI_PROVIDER_ID,
	async search({
		query,
		options,
	}: {
		query: string;
		options?: { limit?: number };
	}): Promise<StickerSearchResult> {
		const limit = options?.limit ?? DEFAULT_SEARCH_LIMIT;
		const searchResult = await searchIcons(query, limit, EMOJI_PREFIXES);
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
		const limit = options?.limit ?? DEFAULT_EMOJI_BROWSE.length;
		const items = DEFAULT_EMOJI_BROWSE.slice(0, limit).map((iconName) =>
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
