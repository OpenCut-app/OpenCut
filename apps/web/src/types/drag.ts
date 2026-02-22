interface BaseDragData {
	id: string;
	name: string;
}

export interface MediaDragData extends BaseDragData {
	type: "media";
	mediaType: "image" | "video" | "audio";
}

export interface TextDragData extends BaseDragData {
	type: "text";
	content: string;
}

export interface StickerDragData extends BaseDragData {
	type: "sticker";
	stickerId: string;
}

export type TimelineDragData = MediaDragData | TextDragData | StickerDragData;
