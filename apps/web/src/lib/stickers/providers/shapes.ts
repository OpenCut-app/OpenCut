import { buildStickerId, parseStickerId } from "../sticker-id";
import type {
	StickerItem,
	StickerProvider,
	StickerSearchResult,
} from "../types";

const SHAPES_PROVIDER_ID = "shapes";

const SHAPES = [
	{ key: "circle", name: "Circle" },
	{ key: "square", name: "Square" },
	{ key: "triangle", name: "Triangle" },
	{ key: "star", name: "Star" },
	{ key: "hexagon", name: "Hexagon" },
	{ key: "diamond", name: "Diamond" },
] as const;

function buildShapeUrl({ shapeKey }: { shapeKey: string }): string {
	return `/shapes/${shapeKey}.svg`;
}

function toStickerItem({
	shape,
}: {
	shape: (typeof SHAPES)[number];
}): StickerItem {
	return {
		id: buildStickerId({
			providerId: SHAPES_PROVIDER_ID,
			providerValue: shape.key,
		}),
		provider: SHAPES_PROVIDER_ID,
		name: shape.name,
		previewUrl: buildShapeUrl({ shapeKey: shape.key }),
		metadata: { shape: shape.key },
	};
}

function filterShapesByQuery({
	query,
}: {
	query: string;
}): Array<(typeof SHAPES)[number]> {
	const normalizedQuery = query.trim().toLowerCase();
	if (!normalizedQuery) {
		return [...SHAPES];
	}

	return SHAPES.filter((shape) =>
		shape.name.toLowerCase().includes(normalizedQuery),
	);
}

function paginateShapes({
	shapes,
	options,
}: {
	shapes: Array<(typeof SHAPES)[number]>;
	options?: { page?: number; limit?: number };
}): { items: Array<(typeof SHAPES)[number]>; hasMore: boolean; total: number } {
	const page = Math.max(1, options?.page ?? 1);
	const limit = Math.max(1, options?.limit ?? SHAPES.length);
	const startIndex = (page - 1) * limit;
	const endIndex = startIndex + limit;
	const pagedItems = shapes.slice(startIndex, endIndex);
	return {
		items: pagedItems,
		hasMore: endIndex < shapes.length,
		total: shapes.length,
	};
}

export const shapesProvider: StickerProvider = {
	id: SHAPES_PROVIDER_ID,
	async search({
		query,
		options,
	}: {
		query: string;
		options?: { limit?: number };
	}): Promise<StickerSearchResult> {
		const filteredShapes = filterShapesByQuery({ query });
		const paged = paginateShapes({
			shapes: filteredShapes,
			options: { page: 1, limit: options?.limit ?? SHAPES.length },
		});
		return {
			items: paged.items.map((shape) => toStickerItem({ shape })),
			total: paged.total,
			hasMore: paged.hasMore,
		};
	},
	async browse({
		options,
	}: {
		options?: { page?: number; limit?: number };
	}): Promise<StickerSearchResult> {
		const paged = paginateShapes({
			shapes: [...SHAPES],
			options,
		});
		return {
			items: paged.items.map((shape) => toStickerItem({ shape })),
			total: paged.total,
			hasMore: paged.hasMore,
		};
	},
	resolveUrl({
		stickerId,
	}: {
		stickerId: string;
		options?: { width?: number; height?: number };
	}): string {
		const { providerValue } = parseStickerId({ stickerId });
		return buildShapeUrl({ shapeKey: providerValue });
	},
};
