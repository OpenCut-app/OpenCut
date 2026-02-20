import { z } from "zod";

const webEnvSchema = z.object({
	NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
	DATABASE_URL: z.string().min(1),
	UPSTASH_REDIS_REST_URL: z.string().min(1),
	UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
	FREESOUND_API_KEY: z.string().min(1),
	FREESOUND_CLIENT_ID: z.string().min(1).optional(),
	MARBLE_WORKSPACE_KEY: z.string().min(1).optional(),
	MODAL_TRANSCRIPTION_URL: z.string().min(1).optional(),
	NEXT_PUBLIC_AUTH_API_BASE_URL: z.string().min(1).optional(),
});

export const webEnv = webEnvSchema.parse({
	...process.env,
	NODE_ENV: process.env.NODE_ENV ?? "development",
});

