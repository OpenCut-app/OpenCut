export interface FontOption {
	value: string;
	label: string;
	category: "system" | "google" | "custom";
	weights?: number[];
	hasClassName?: boolean;
}

export interface GoogleFontMeta {
	family: string;
	category: string;
}

export interface FontAtlasEntry {
	x: number;
	y: number;
	w: number;
	ch: number;
	s: string[];
}

export interface FontAtlas {
	fonts: Record<string, FontAtlasEntry>;
}
