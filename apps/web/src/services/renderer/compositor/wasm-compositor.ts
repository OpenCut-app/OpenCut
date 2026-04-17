import {
        getCompositorCanvas,
        initCompositor,
        releaseTexture,
        renderFrame,
        resizeCompositor,
        uploadTexture,
} from "opencut-wasm";
import type { FrameDescriptor } from "./types";
import { isGpuAvailable } from "../gpu-renderer";

function ensureOffscreenCanvas({
        source,
        width,
        height,
        label,
}: {
        source: CanvasImageSource;
        width: number;
        height: number;
        label: string;
}): OffscreenCanvas {
        if (source instanceof OffscreenCanvas) {
                return source;
        }

        if (typeof OffscreenCanvas === "undefined") {
                throw new Error(`OffscreenCanvas is required for ${label}`);
        }

        const canvas = new OffscreenCanvas(width, height);
        const context = canvas.getContext("2d");
        if (!context) {
                throw new Error(`Failed to get 2d context for ${label}`);
        }
        context.clearRect(0, 0, width, height);
        context.drawImage(source, 0, 0, width, height);
        return canvas;
}

export type TextureUploadDescriptor = {
        id: string;
        source: CanvasImageSource;
        width: number;
        height: number;
};

class WasmCompositor {
        private canvas: HTMLCanvasElement | null = null;
        private initializedSize: { width: number; height: number } | null = null;
        private retainedTextureIds = new Set<string>();
        private uploadedTextures = new Map<string, { source: CanvasImageSource; width: number; height: number }>();

        ensureInitialized({ width, height }: { width: number; height: number }) {
                if (!isGpuAvailable()) return;

                if (!this.canvas) {
                        initCompositor(width, height);
                        this.canvas = getCompositorCanvas();
                        this.initializedSize = { width, height };
                        return;
                }

                if (
                        !this.initializedSize ||
                        this.initializedSize.width !== width ||
                        this.initializedSize.height !== height
                ) {
                        resizeCompositor(width, height);
                        this.initializedSize = { width, height };
                }
        }

        getCanvas(): HTMLCanvasElement | null {
                if (!isGpuAvailable()) return null;
                if (!this.canvas) {
                        throw new Error("Compositor is not initialized");
                }
                return this.canvas;
        }

        syncTextures(textures: TextureUploadDescriptor[]) {
                if (!isGpuAvailable()) return;

                const nextIds = new Set(textures.map((texture) => texture.id));
                for (const previousId of this.retainedTextureIds) {
                        if (!nextIds.has(previousId)) {
                                releaseTexture(previousId);
                                this.uploadedTextures.delete(previousId);
                        }
                }

                for (const texture of textures) {
                        const previousTexture = this.uploadedTextures.get(texture.id);
                        if (
                                previousTexture?.source === texture.source &&
                                previousTexture.width === texture.width &&
                                previousTexture.height === texture.height
                        ) {
                                continue;
                        }

                        const sourceCanvas = ensureOffscreenCanvas({
                                source: texture.source,
                                width: texture.width,
                                height: texture.height,
                                label: `texture upload ${texture.id}`,
                        });
                        uploadTexture({
                                id: texture.id,
                                source: sourceCanvas,
                                width: texture.width,
                                height: texture.height,
                        });
                        this.uploadedTextures.set(texture.id, {
                                source: texture.source,
                                width: texture.width,
                                height: texture.height,
                        });
                }

                this.retainedTextureIds = nextIds;
        }

        render(frame: FrameDescriptor) {
                if (!isGpuAvailable()) return;

                renderFrame(frame);
        }
}

export const wasmCompositor = new WasmCompositor();