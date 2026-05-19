import { toast } from "sonner";
import { getMediaTypeFromFile } from "@/media/media-utils";
import { formatStorageBytes } from "@/services/storage/quota";
import { storageService } from "@/services/storage/service";
import type { MediaAsset } from "@/media/types";
import { readVideoFile } from "./mediabunny";
import type { VideoFileData } from "./mediabunny";
import { renderThumbnailDataUrl } from "./thumbnail";
import { convertVideoToH264 } from "./ffmpeg-convert";

export interface ProcessedMediaAsset extends Omit<MediaAsset, "id"> {}

const getUnsupportedVideoDescription = ({
	codec,
}: {
	codec: VideoFileData["codec"];
}): string => {
	const codecLabel = codec ? codec.toUpperCase() : "this video codec";

	return codec === "hevc"
		? `${codecLabel} cannot be decoded in this browser, so this clip may not preview correctly. Convert it to H.264 MP4 or try importing it in Safari.`
		: `${codecLabel} cannot be decoded in this browser, so this clip may not preview correctly. Convert it to H.264 MP4 and reimport it.`;
};

const getStorageLimitDescription = ({
	fileSize,
	availableBytes,
}: {
	fileSize: number;
	availableBytes: number | null;
}): string => {
	const fileSizeLabel = formatStorageBytes({ bytes: fileSize });

	if (availableBytes === null) {
		return `File size is ${fileSizeLabel}.`;
	}

	return `File size is ${fileSizeLabel}, but only ${formatStorageBytes({
		bytes: availableBytes,
	})} is safely available in browser storage.`;
};

async function generateImageThumbnail({
	imageFile,
}: {
	imageFile: File;
}): Promise<{ thumbnailUrl: string; width: number; height: number }> {
	return new Promise((resolve, reject) => {
		const image = new window.Image();
		const objectUrl = URL.createObjectURL(imageFile);

		image.addEventListener("load", () => {
			try {
				const thumbnailUrl = renderThumbnailDataUrl({
					width: image.naturalWidth,
					height: image.naturalHeight,
					draw: ({ context, width, height }) => {
						context.drawImage(image, 0, 0, width, height);
					},
				});
				resolve({
					thumbnailUrl,
					width: image.naturalWidth,
					height: image.naturalHeight,
				});
			} catch (error) {
				reject(
					error instanceof Error ? error : new Error("Could not render image"),
				);
			} finally {
				URL.revokeObjectURL(objectUrl);
				image.remove();
			}
		});

		image.addEventListener("error", () => {
			URL.revokeObjectURL(objectUrl);
			image.remove();
			reject(new Error("Could not load image"));
		});

		image.src = objectUrl;
	});
}

export async function processMediaAssets({
	files,
	onProgress,
}: {
	files: FileList | File[];
	onProgress?: ({ progress }: { progress: number }) => void;
}): Promise<ProcessedMediaAsset[]> {
	const fileArray = Array.from(files);
	const processedAssets: ProcessedMediaAsset[] = [];

	const total = fileArray.length;
	let completed = 0;

	for (const file of fileArray) {
		const fileType = getMediaTypeFromFile({ file });

		if (!fileType) {
			toast.error(`Unsupported file type: ${file.name}`);
			continue;
		}

		const storageCheck = await storageService.canStoreFile({
			size: file.size,
		});

		if (!storageCheck.canStore) {
			toast.error(`Not enough browser storage for ${file.name}`, {
				description: getStorageLimitDescription({
					fileSize: file.size,
					availableBytes: storageCheck.availableBytes,
				}),
			});
			continue;
		}

		const url = URL.createObjectURL(file);
		let thumbnailUrl: string | undefined;
		let duration: number | undefined;
		let width: number | undefined;
		let height: number | undefined;
		let fps: number | undefined;
		let hasAudio: boolean | undefined;

		try {
			if (fileType === "image") {
				const result = await generateImageThumbnail({ imageFile: file });
				thumbnailUrl = result.thumbnailUrl;
				width = result.width;
				height = result.height;
			} else if (fileType === "video") {
				let currentFile = file;
				let currentUrl = url;
				try {
					let videoData = await readVideoFile({ file: currentFile });

					if (!videoData.canDecode) {
						toast.info(`Converting ${file.name} to a compatible format…`);
						const convertedFile = await convertVideoToH264({
							file: currentFile,
						});

						const convertedStorageCheck = await storageService.canStoreFile({
							size: convertedFile.size,
						});
						if (!convertedStorageCheck.canStore) {
							throw new Error(
								getStorageLimitDescription({
									fileSize: convertedFile.size,
									availableBytes: convertedStorageCheck.availableBytes,
								}),
							);
						}

						URL.revokeObjectURL(currentUrl);
						currentFile = convertedFile;
						currentUrl = URL.createObjectURL(currentFile);
						videoData = await readVideoFile({ file: currentFile });

						if (!videoData.canDecode) {
							// Conversion produced a file the browser still can't decode
							// via mediabunny/WebCodecs. The HTMLVideoElement fallback in
							// VideoCache will handle preview rendering, so warn but
							// continue importing.
							toast.warning(`${file.name} converted, preview may be limited`, {
								description: getUnsupportedVideoDescription({
									codec: videoData.codec,
								}),
							});
						} else {
							toast.success(`${file.name} converted successfully`);
						}
					}

					duration = videoData.duration;
					width = videoData.width;
					height = videoData.height;
					fps = Number.isFinite(videoData.fps)
						? Math.round(videoData.fps)
						: undefined;
					hasAudio = videoData.hasAudio;
					thumbnailUrl = videoData.thumbnailUrl ?? undefined;

					processedAssets.push({
						name: currentFile.name,
						type: fileType,
						file: currentFile,
						url: currentUrl,
						thumbnailUrl,
						duration,
						width,
						height,
						fps,
						hasAudio,
					});

					await new Promise((resolve) => setTimeout(resolve, 0));

					completed += 1;
					if (onProgress) {
						const percent = Math.round((completed / total) * 100);
						onProgress({ progress: percent });
					}
					continue;
				} catch (error) {
					const message =
						error instanceof Error
							? error.message
							: "Could not process video";

					toast.error(`Couldn't process ${file.name}`, {
						description: message,
					});
					URL.revokeObjectURL(currentUrl);
					continue;
				}
			} else if (fileType === "audio") {
				duration = await getMediaDuration({ file });
			}

			processedAssets.push({
				name: file.name,
				type: fileType,
				file,
				url,
				thumbnailUrl,
				duration,
				width,
				height,
				fps,
				hasAudio,
			});

			await new Promise((resolve) => setTimeout(resolve, 0));

			completed += 1;
			if (onProgress) {
				const percent = Math.round((completed / total) * 100);
				onProgress({ progress: percent });
			}
		} catch (error) {
			console.error("Error processing file:", file.name, error);
			toast.error(`Failed to process ${file.name}`);
			URL.revokeObjectURL(url);
		}
	}

	return processedAssets;
}

const getMediaDuration = ({ file }: { file: File }): Promise<number> => {
	return new Promise((resolve, reject) => {
		const element = document.createElement(
			file.type.startsWith("video/") ? "video" : "audio",
		) as HTMLVideoElement;
		const objectUrl = URL.createObjectURL(file);

		element.addEventListener("loadedmetadata", () => {
			resolve(element.duration);
			URL.revokeObjectURL(objectUrl);
			element.remove();
		});

		element.addEventListener("error", () => {
			reject(new Error("Could not load media"));
			URL.revokeObjectURL(objectUrl);
			element.remove();
		});

		element.src = objectUrl;
		element.load();
	});
};
