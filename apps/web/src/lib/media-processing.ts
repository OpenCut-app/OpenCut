import { toast } from "sonner";
import {
  getFileType,
  getMediaDuration,
  getImageDimensions,
} from "@/stores/media-store";
import { MediaFile } from "@/types/media";
import { generateThumbnail, getVideoInfo } from "./mediabunny-utils";

export interface ProcessedMediaItem extends Omit<MediaFile, "id"> {}

export async function processMediaFiles(
  files: FileList | File[],
  onProgress?: (progress: number) => void
): Promise<ProcessedMediaItem[]> {
  const fileArray = Array.from(files);
  const processedItems: ProcessedMediaItem[] = [];

  const total = fileArray.length;
  let completed = 0;

  for (const file of fileArray) {
    const fileType = getFileType(file);

    if (!fileType) {
      toast.error(`Unsupported file type: ${file.name}`);
      continue;
    }

    const url = URL.createObjectURL(file);
    let thumbnailUrl: string | undefined;
    let duration: number | undefined;
    let width: number | undefined;
    let height: number | undefined;
    let fps: number | undefined;

    try {
      if (fileType === "image") {
        const dimensions = await getImageDimensions(file);
        width = dimensions.width;
        height = dimensions.height;
      } else if (fileType === "video") {
        try {
          const videoInfo = await getVideoInfo({ videoFile: file });
          duration = videoInfo.duration;
          width = videoInfo.width;
          height = videoInfo.height;
          fps = videoInfo.fps;

          thumbnailUrl = await generateThumbnail({
            videoFile: file,
            timeInSeconds: 1,
          });
        } catch (error) {
          console.warn("Video processing failed", error);
        }
      } else if (fileType === "audio") {
        // For audio, we don't set width/height/fps (they'll be undefined)
        duration = await getMediaDuration(file);
      }

      processedItems.push({
        name: file.name,
        type: fileType,
        file,
        url,
        thumbnailUrl,
        duration,
        width,
        height,
        fps,
      });

      await new Promise((resolve) => setTimeout(resolve, 0));

      completed += 1;
      if (onProgress) {
        const percent = Math.round((completed / total) * 100);
        onProgress(percent);
      }
    } catch (error) {
      console.error("Error processing file:", file.name, error);
      toast.error(`Failed to process ${file.name}`);
      URL.revokeObjectURL(url); // Clean up on error
    }
  }

  return processedItems;
}
