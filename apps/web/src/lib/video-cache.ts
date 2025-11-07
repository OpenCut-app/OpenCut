import {
  Input,
  ALL_FORMATS,
  BlobSource,
  CanvasSink,
  WrappedCanvas,
} from "mediabunny";

interface VideoSinkData {
  sink: CanvasSink;
  iterator: AsyncGenerator<WrappedCanvas, void, unknown> | null;
  currentFrame: WrappedCanvas | null;
  lastTime: number;
}
export class VideoCache {
  private sinks = new Map<string, VideoSinkData>();
  private initPromises = new Map<string, Promise<void>>();

  async getFrameAt(
    mediaId: string,
    file: File,
    time: number
  ): Promise<WrappedCanvas | null> {
    await this.ensureSink(mediaId, file);

    const sinkData = this.sinks.get(mediaId);
    if (!sinkData) return null;

    if (
      sinkData.currentFrame &&
      this.isFrameValid(sinkData.currentFrame, time)
    ) {
      return sinkData.currentFrame;
    }

    if (
      sinkData.iterator &&
      sinkData.currentFrame &&
      time >= sinkData.lastTime &&
      time < sinkData.lastTime + 2.0
    ) {
      const frame = await this.iterateToTime(sinkData, time);
      if (frame) return frame;
    }

    return await this.seekToTime(sinkData, time);
  }

  private isFrameValid(frame: WrappedCanvas, time: number): boolean {
    return time >= frame.timestamp && time < frame.timestamp + frame.duration;
  }
  private async iterateToTime(
    sinkData: VideoSinkData,
    targetTime: number
  ): Promise<WrappedCanvas | null> {
    if (!sinkData.iterator) return null;

    try {
      while (true) {
        const { value: frame, done } = await sinkData.iterator.next();

        if (done || !frame) break;

        sinkData.currentFrame = frame;
        sinkData.lastTime = frame.timestamp;

        if (this.isFrameValid(frame, targetTime)) {
          return frame;
        }

        if (frame.timestamp > targetTime + 1.0) break;
      }
    } catch (error) {
      console.warn("Iterator failed, will restart:", error);
      sinkData.iterator = null;
    }

    return null;
  }
  private async seekToTime(
    sinkData: VideoSinkData,
    time: number
  ): Promise<WrappedCanvas | null> {
    try {
      if (sinkData.iterator) {
        await sinkData.iterator.return();
        sinkData.iterator = null;
      }

      sinkData.iterator = sinkData.sink.canvases(time);
      sinkData.lastTime = time;

      const { value: frame } = await sinkData.iterator.next();

      if (frame) {
        sinkData.currentFrame = frame;
        return frame;
      }
    } catch (error) {
      console.warn("Failed to seek video:", error);
    }

    return null;
  }
  private async ensureSink(mediaId: string, file: File): Promise<void> {
    if (this.sinks.has(mediaId)) return;

    if (this.initPromises.has(mediaId)) {
      await this.initPromises.get(mediaId);
      return;
    }

    const initPromise = this.initializeSink(mediaId, file);
    this.initPromises.set(mediaId, initPromise);

    try {
      await initPromise;
    } finally {
      this.initPromises.delete(mediaId);
    }
  }
  private async initializeSink(mediaId: string, file: File): Promise<void> {
    try {
      const input = new Input({
        source: new BlobSource(file),
        formats: ALL_FORMATS,
      });

      const videoTrack = await input.getPrimaryVideoTrack();
      if (!videoTrack) {
        throw new Error("No video track found");
      }

      const canDecode = await videoTrack.canDecode();
      if (!canDecode) {
        throw new Error("Video codec not supported for decoding");
      }

      const sink = new CanvasSink(videoTrack, {
        poolSize: 3,
        fit: "contain",
      });

      this.sinks.set(mediaId, {
        sink,
        iterator: null,
        currentFrame: null,
        lastTime: -1,
      });
    } catch (error) {
      console.error(`Failed to initialize video sink for ${mediaId}:`, error);
      throw error;
    }
  }

  clearVideo(mediaId: string): void {
    const sinkData = this.sinks.get(mediaId);
    if (sinkData) {
      if (sinkData.iterator) {
        sinkData.iterator.return();
      }

      this.sinks.delete(mediaId);
    }

    this.initPromises.delete(mediaId);
  }

  clearAll(): void {
    for (const [mediaId] of this.sinks) {
      this.clearVideo(mediaId);
    }
  }

  getStats() {
    return {
      totalSinks: this.sinks.size,
      activeSinks: Array.from(this.sinks.values()).filter((s) => s.iterator)
        .length,
      cachedFrames: Array.from(this.sinks.values()).filter(
        (s) => s.currentFrame
      ).length,
    };
  }
}
export const videoCache = new VideoCache();
