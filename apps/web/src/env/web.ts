import { z } from "zod";

const webEnvSchema = z.object({
	NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
	NEXT_PUBLIC_MAX_IMAGE_UPLOAD_MB: z.coerce.number().positive().max(200).default(50),
	NEXT_PUBLIC_MAX_VIDEO_UPLOAD_MB: z.coerce
		.number()
		.positive()
		.max(2048)
		.default(500),
	NEXT_PUBLIC_MAX_AUDIO_UPLOAD_MB: z.coerce.number().positive().max(500).default(100),
});

export const webEnv = webEnvSchema.parse({
	...process.env,
	NODE_ENV: process.env.NODE_ENV ?? "development",
	NEXT_PUBLIC_MAX_IMAGE_UPLOAD_MB:
		process.env.NEXT_PUBLIC_MAX_IMAGE_UPLOAD_MB ?? "50",
	NEXT_PUBLIC_MAX_VIDEO_UPLOAD_MB:
		process.env.NEXT_PUBLIC_MAX_VIDEO_UPLOAD_MB ?? "500",
	NEXT_PUBLIC_MAX_AUDIO_UPLOAD_MB:
		process.env.NEXT_PUBLIC_MAX_AUDIO_UPLOAD_MB ?? "100",
});
