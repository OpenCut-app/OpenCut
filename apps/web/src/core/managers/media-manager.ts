import type { EditorCore } from "@/core";
import { toast } from "sonner";
import type { MediaAsset } from "@/lib/media/types";
import { storageService } from "@/services/storage/service";
import { generateUUID } from "@/utils/id";
import { videoCache } from "@/services/video-cache/service";
import { BatchCommand, RemoveMediaAssetCommand } from "@/lib/commands";

const FRAME_CACHE_MAX_SIZE = 8;

interface CachedFrame {
	frame: ImageBitmap;
	assetId: string;
	timeMs: number;
	lastAccessed: number;
}

export class MediaManager {
	private assets: MediaAsset[] = [];
	private isLoading = false;
	private listeners = new Set<() => void>();
	private frameCache: CachedFrame[] = [];

	constructor(private editor: EditorCore) {}

	async addMediaAsset({
		projectId,
		asset,
	}: {
		projectId: string;
		asset: Omit<MediaAsset, "id">;
	}): Promise<MediaAsset | null> {
		const newAsset: MediaAsset = {
			...asset,
			id: generateUUID(),
		};

		this.assets = [...this.assets, newAsset];
		this.notify();

		try {
			await storageService.saveMediaAsset({ projectId, mediaAsset: newAsset });
			this.editor.project.ratchetFpsForImportedMedia({
				importedAssets: [newAsset],
			});
			return newAsset;
		} catch (error) {
			console.error("Failed to save media asset:", error);
			this.assets = this.assets.filter((asset) => asset.id !== newAsset.id);
			this.notify();

			if (storageService.isQuotaExceededError({ error })) {
				toast.error("Not enough browser storage", {
					description: error instanceof Error ? error.message : undefined,
				});
			}

			return null;
		}
	}

	removeMediaAsset({ projectId, id }: { projectId: string; id: string }): void {
		this.removeMediaAssets({ projectId, ids: [id] });
	}

	removeMediaAssets({
		projectId,
		ids,
	}: {
		projectId: string;
		ids: string[];
	}): void {
		const uniqueIds = [...new Set(ids)];
		if (uniqueIds.length === 0) {
			return;
		}

		const command =
			uniqueIds.length === 1
				? new RemoveMediaAssetCommand(projectId, uniqueIds[0])
				: new BatchCommand(
						uniqueIds.map((id) => new RemoveMediaAssetCommand(projectId, id)),
					);

		this.editor.command.execute({ command });
	}

	async loadProjectMedia({ projectId }: { projectId: string }): Promise<void> {
		this.isLoading = true;
		this.notify();

		try {
			const mediaAssets = await storageService.loadAllMediaAssets({
				projectId,
			});
			this.assets = mediaAssets;
			this.notify();
		} catch (error) {
			console.error("Failed to load media assets:", error);
		} finally {
			this.isLoading = false;
			this.notify();
		}
	}

	async clearProjectMedia({ projectId }: { projectId: string }): Promise<void> {
		this.assets.forEach((asset) => {
			if (asset.url) {
				URL.revokeObjectURL(asset.url);
			}
			if (asset.thumbnailUrl) {
				URL.revokeObjectURL(asset.thumbnailUrl);
			}
		});

		const mediaIds = this.assets.map((asset) => asset.id);
		this.assets = [];
		this.notify();

		try {
			await Promise.all(
				mediaIds.map((id) =>
					storageService.deleteMediaAsset({ projectId, id }),
				),
			);
		} catch (error) {
			console.error("Failed to clear media assets from storage:", error);
		}
	}

	clearAllAssets(): void {
		videoCache.clearAll();
		this.evictAllFrames();

		this.assets.forEach((asset) => {
			if (asset.url) {
				URL.revokeObjectURL(asset.url);
			}
			if (asset.thumbnailUrl) {
				URL.revokeObjectURL(asset.thumbnailUrl);
			}
		});

		this.assets = [];
		this.notify();
	}

	getAssets(): MediaAsset[] {
		return this.assets;
	}

	setAssets({ assets }: { assets: MediaAsset[] }): void {
		this.assets = assets;
		this.notify();
	}

	isLoadingMedia(): boolean {
		return this.isLoading;
	}

	/**
	 * Returns a cached ImageBitmap for the given asset and time, or decodes and
	 * caches a new one. The caller must NOT close the returned bitmap — the cache
	 * owns its lifetime. Old entries are evicted (and closed) when the cache
	 * exceeds FRAME_CACHE_MAX_SIZE.
	 */
	async getFrameAt({
		assetId,
		timeMs,
		decode,
	}: {
		assetId: string;
		timeMs: number;
		decode: () => Promise<ImageBitmap>;
	}): Promise<ImageBitmap> {
		const existing = this.frameCache.find(
			(c) => c.assetId === assetId && c.timeMs === timeMs,
		);
		if (existing) {
			existing.lastAccessed = Date.now();
			return existing.frame;
		}

		const frame = await decode();

		if (this.frameCache.length >= FRAME_CACHE_MAX_SIZE) {
			this.evictLruFrame();
		}

		this.frameCache.push({ frame, assetId, timeMs, lastAccessed: Date.now() });
		return frame;
	}

	evictFramesForAsset({ assetId }: { assetId: string }): void {
		const remaining: CachedFrame[] = [];
		for (const entry of this.frameCache) {
			if (entry.assetId === assetId) {
				entry.frame.close();
			} else {
				remaining.push(entry);
			}
		}
		this.frameCache = remaining;
	}

	private evictLruFrame(): void {
		if (this.frameCache.length === 0) return;
		let lruIndex = 0;
		for (let i = 1; i < this.frameCache.length; i++) {
			if (this.frameCache[i].lastAccessed < this.frameCache[lruIndex].lastAccessed) {
				lruIndex = i;
			}
		}
		this.frameCache[lruIndex].frame.close();
		this.frameCache.splice(lruIndex, 1);
	}

	private evictAllFrames(): void {
		for (const entry of this.frameCache) {
			entry.frame.close();
		}
		this.frameCache = [];
	}

	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	private notify(): void {
		this.listeners.forEach((fn) => {
			fn();
		});
	}
}
