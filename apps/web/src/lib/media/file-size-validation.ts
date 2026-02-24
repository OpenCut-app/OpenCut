import { webEnv } from "@/env/web";
import type { MediaType } from "@/types/assets";

const MB_IN_BYTES = 1024 * 1024;

const LIMIT_CAP_MB: Record<MediaType, number> = {
	image: 200,
	video: 2048,
	audio: 500,
};

const LIMIT_DEFAULT_MB: Record<MediaType, number> = {
	image: 50,
	video: 500,
	audio: 100,
};

const LIMITS_MB: Record<MediaType, number> = {
	image: Math.min(webEnv.NEXT_PUBLIC_MAX_IMAGE_UPLOAD_MB, LIMIT_CAP_MB.image),
	video: Math.min(webEnv.NEXT_PUBLIC_MAX_VIDEO_UPLOAD_MB, LIMIT_CAP_MB.video),
	audio: Math.min(webEnv.NEXT_PUBLIC_MAX_AUDIO_UPLOAD_MB, LIMIT_CAP_MB.audio),
};

export function getFileSizeLimitBytes({
	mediaType,
}: {
	mediaType: MediaType;
}): number {
	return LIMITS_MB[mediaType] * MB_IN_BYTES;
}

export function formatFileSize({
	bytes,
}: {
	bytes: number;
}): string {
	if (bytes < MB_IN_BYTES) {
		const kb = bytes / 1024;
		return `${kb.toFixed(kb >= 100 ? 0 : 1)} KB`;
	}

	const mb = bytes / MB_IN_BYTES;
	if (mb < 1024) {
		return `${mb.toFixed(mb >= 100 ? 0 : 1)} MB`;
	}

	const gb = mb / 1024;
	return `${gb.toFixed(gb >= 100 ? 0 : 1)} GB`;
}

export function getFileSizeLimitError({
	fileName,
	fileSize,
	mediaType,
}: {
	fileName: string;
	fileSize: number;
	mediaType: MediaType;
}): string | null {
	const limitBytes = getFileSizeLimitBytes({ mediaType });
	if (fileSize <= limitBytes) return null;

	return `${fileName} is ${formatFileSize({ bytes: fileSize })}. ${mediaType} files must be ${formatFileSize({ bytes: limitBytes })} or smaller.`;
}

export const mediaUploadLimitDefaultsMb = LIMIT_DEFAULT_MB;
export const mediaUploadLimitCapsMb = LIMIT_CAP_MB;
