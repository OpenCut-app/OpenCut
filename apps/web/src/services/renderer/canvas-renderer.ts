import type { FrameRate } from "opencut-wasm";
import type { AnyBaseNode } from "./nodes/base-node";
import { buildFrameDescriptor } from "./compositor/frame-descriptor";
import { wasmCompositor } from "./compositor/wasm-compositor";
import { resolveRenderTree } from "./resolve";

export type CanvasRendererParams = {
        width: number;
        height: number;
        fps: FrameRate;
};

export class CanvasRenderer {
        canvas: OffscreenCanvas | HTMLCanvasElement;
        context: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;
        width: number;
        height: number;
        fps: FrameRate;

        constructor({ width, height, fps }: CanvasRendererParams) {
                this.width = width;
                this.height = height;
                this.fps = fps;

                try {
                        this.canvas = new OffscreenCanvas(width, height);
                } catch {
                        this.canvas = document.createElement("canvas");
                        this.canvas.width = width;
                        this.canvas.height = height;
                }

                const context = this.canvas.getContext("2d");
                if (!context) {
                        throw new Error("Failed to get canvas context");
                }

                this.context = context as
                        | OffscreenCanvasRenderingContext2D
                        | CanvasRenderingContext2D;
        }

        getOutputCanvas(): HTMLCanvasElement | null {
                wasmCompositor.ensureInitialized({
                        width: this.width,
                        height: this.height,
                });
                return wasmCompositor.getCanvas();
        }

        setSize({ width, height }: { width: number; height: number }) {
                this.width = width;
                this.height = height;

                if (this.canvas instanceof OffscreenCanvas) {
                        this.canvas = new OffscreenCanvas(width, height);
                } else {
                        this.canvas.width = width;
                        this.canvas.height = height;
                }

                const context = this.canvas.getContext("2d");
                if (!context) {
                        throw new Error("Failed to get canvas context");
                }
                this.context = context as
                        | OffscreenCanvasRenderingContext2D
                        | CanvasRenderingContext2D;
        }

        async render({ node, time }: { node: AnyBaseNode; time: number }) {
                await resolveRenderTree({ node, renderer: this, time });
                const { frame, textures } = await buildFrameDescriptor({
                        node,
                        renderer: this,
                });
                wasmCompositor.ensureInitialized({
                        width: this.width,
                        height: this.height,
                });
                wasmCompositor.syncTextures(textures);
                wasmCompositor.render(frame);
        }

        async renderToCanvas({
                node,
                time,
                targetCanvas,
        }: {
                node: AnyBaseNode;
                time: number;
                targetCanvas: HTMLCanvasElement;
        }) {
                await this.render({ node, time });

                const ctx = targetCanvas.getContext("2d");
                if (!ctx) {
                        throw new Error("Failed to get target canvas context");
                }

                const compositorCanvas = wasmCompositor.getCanvas();
                if (!compositorCanvas) return;

                ctx.drawImage(
                        compositorCanvas,
                        0,
                        0,
                        targetCanvas.width,
                        targetCanvas.height,
                );
        }
}