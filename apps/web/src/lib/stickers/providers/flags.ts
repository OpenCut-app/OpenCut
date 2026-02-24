import { buildStickerId, parseStickerId } from "../sticker-id";
import type {
	StickerItem,
	StickerProvider,
	StickerSearchResult,
} from "../types";

const FLAGS_PROVIDER_ID = "flags";
const FLAGS_DATASET_URL = "/countries.json";
const DEFAULT_SEARCH_LIMIT = 100;
const DEFAULT_FLAGS_BASE_URL = "/flags";

type CountryRecord = {
	name: string;
	code: string;
	languages?: string[];
	flag_colors?: string[];
	region?: string;
};

let countriesPromise: Promise<CountryRecord[]> | null = null;

function getFlagsBaseUrl(): string {
	return DEFAULT_FLAGS_BASE_URL.replace(/\/$/, "");
}

function buildFlagUrl({ code }: { code: string }): string {
	const normalizedCode = code.toUpperCase();
	return `${getFlagsBaseUrl()}/${encodeURIComponent(normalizedCode)}.svg`;
}

async function loadCountries(): Promise<CountryRecord[]> {
	if (countriesPromise) {
		return countriesPromise;
	}

	countriesPromise = fetch(FLAGS_DATASET_URL)
		.then(async (response) => {
			if (!response.ok) {
				throw new Error(`Failed to load countries: ${response.status}`);
			}
			return (await response.json()) as CountryRecord[];
		})
		.catch((error) => {
			console.error("Failed to load countries dataset:", error);
			return [];
		});

	return countriesPromise;
}

function toStickerItem({ country }: { country: CountryRecord }): StickerItem {
	const normalizedCode = country.code.toUpperCase();
	return {
		id: buildStickerId({
			providerId: FLAGS_PROVIDER_ID,
			providerValue: normalizedCode,
		}),
		provider: FLAGS_PROVIDER_ID,
		name: country.name,
		previewUrl: buildFlagUrl({ code: normalizedCode }),
		metadata: {
			code: normalizedCode,
			region: country.region ?? null,
			languages: country.languages ?? [],
			flagColors: country.flag_colors ?? [],
		},
	};
}

function normalizeQuery({ query }: { query: string }): string {
	return query.trim().toLowerCase();
}

function filterCountriesByQuery({
	countries,
	query,
}: {
	countries: CountryRecord[];
	query: string;
}): CountryRecord[] {
	if (!query) {
		return countries;
	}

	return countries.filter((country) => {
		const normalizedName = country.name.toLowerCase();
		const normalizedCode = country.code.toLowerCase();
		const normalizedRegion = country.region?.toLowerCase() ?? "";
		return (
			normalizedName.includes(query) ||
			normalizedCode.includes(query) ||
			normalizedRegion.includes(query)
		);
	});
}

function paginateCountries({
	countries,
	options,
}: {
	countries: CountryRecord[];
	options?: { page?: number; limit?: number };
}): { items: CountryRecord[]; hasMore: boolean; total: number } {
	const page = Math.max(1, options?.page ?? 1);
	const limit = Math.max(1, options?.limit ?? DEFAULT_SEARCH_LIMIT);
	const startIndex = (page - 1) * limit;
	const endIndex = startIndex + limit;
	const pagedItems = countries.slice(startIndex, endIndex);
	return {
		items: pagedItems,
		hasMore: endIndex < countries.length,
		total: countries.length,
	};
}

export const flagsProvider: StickerProvider = {
	id: FLAGS_PROVIDER_ID,
	async search({
		query,
		options,
	}: {
		query: string;
		options?: { limit?: number };
	}): Promise<StickerSearchResult> {
		const countries = await loadCountries();
		const normalizedQuery = normalizeQuery({ query });
		const filteredCountries = filterCountriesByQuery({
			countries,
			query: normalizedQuery,
		});
		const paged = paginateCountries({
			countries: filteredCountries,
			options: {
				page: 1,
				limit: options?.limit ?? DEFAULT_SEARCH_LIMIT,
			},
		});
		return {
			items: paged.items.map((country) => toStickerItem({ country })),
			total: paged.total,
			hasMore: paged.hasMore,
		};
	},
	async browse({
		options,
	}: {
		options?: { page?: number; limit?: number };
	}): Promise<StickerSearchResult> {
		const countries = await loadCountries();
		const paged = paginateCountries({ countries, options });
		return {
			items: paged.items.map((country) => toStickerItem({ country })),
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
		return buildFlagUrl({ code: providerValue });
	},
};
