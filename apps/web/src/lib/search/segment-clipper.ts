import { arrayBufferToBase64 } from "@/lib/zk-encryption";
import { initFFmpeg } from "@/lib/mediabunny-utils";
import { generateUUID } from "@/lib/utils";

interface SegmentClipRequest {
  videoFile: File;
  startTimeSeconds: number;
  endTimeSeconds: number;
}

interface SegmentClipResult {
  base64: string;
  mimeType: string;
}

const getFileExtension = (fileName: string): string => {
  const parts = fileName.split(".");
  if (parts.length <= 1) return "mp4";
  const extension = parts.pop();
  return extension && extension.length > 0 ? extension : "mp4";
};

const toArrayBuffer = (data: Uint8Array): ArrayBuffer =>
  data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);

const extractVideoSegmentBase64 = async (
  request: SegmentClipRequest
): Promise<SegmentClipResult> => {
  const durationSeconds = Math.max(0.5, request.endTimeSeconds - request.startTimeSeconds);
  const ffmpeg = await initFFmpeg();
  const id = generateUUID();
  const inputExtension = getFileExtension(request.videoFile.name);
  const inputName = `segment-input-${id}.${inputExtension}`;
  const outputName = `segment-output-${id}.webm`;
  const mimeType = "video/webm";

  try {
    await ffmpeg.writeFile(
      inputName,
      new Uint8Array(await request.videoFile.arrayBuffer())
    );

    await ffmpeg.exec([
      "-ss",
      request.startTimeSeconds.toString(),
      "-t",
      durationSeconds.toString(),
      "-i",
      inputName,
      "-vf",
      "scale=640:-2",
      "-c:v",
      "libvpx",
      "-b:v",
      "800k",
      "-c:a",
      "libvorbis",
      outputName,
    ]);

    const data = await ffmpeg.readFile(outputName);
    if (!(data instanceof Uint8Array)) {
      throw new Error("Failed to read clip output");
    }
    const buffer = toArrayBuffer(data);
    const base64 = arrayBufferToBase64(buffer);

    return { base64, mimeType };
  } finally {
    try {
      await ffmpeg.deleteFile(inputName);
    } catch {}
    try {
      await ffmpeg.deleteFile(outputName);
    } catch {}
  }
};

export type { SegmentClipRequest, SegmentClipResult };
export { extractVideoSegmentBase64 };
