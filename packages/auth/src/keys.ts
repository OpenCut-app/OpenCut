import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const keys = () =>
  createEnv({
    server: {
      BETTER_AUTH_SECRET: z.string(),
      UPSTASH_REDIS_REST_URL: z.string().url(),
      UPSTASH_REDIS_REST_TOKEN: z.string(),
    },
    client: {
      NEXT_PUBLIC_BETTER_AUTH_URL: z.string().url(),
    },
    runtimeEnv: {
      NEXT_PUBLIC_BETTER_AUTH_URL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
      UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
      UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    },
  });
