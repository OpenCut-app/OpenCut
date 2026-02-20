import { z } from "zod";

const webEnvSchema = z.object({
	NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export const webEnv = webEnvSchema.parse({
	...process.env,
	NODE_ENV: process.env.NODE_ENV ?? "development",
});

