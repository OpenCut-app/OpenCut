import { betterAuth, RateLimit } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@opencut/db";
import { keys } from "./keys";
import { Redis } from "@upstash/redis";

const {
  NEXT_PUBLIC_BETTER_AUTH_URL,
  BETTER_AUTH_SECRET,
  UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN,
} = keys();

const redis = new Redis({
  url: UPSTASH_REDIS_REST_URL,
  token: UPSTASH_REDIS_REST_TOKEN,
});

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
  }),
  secret: BETTER_AUTH_SECRET,
  user: {
    deleteUser: {
      enabled: true,
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  rateLimit: {
    storage: "secondary-storage",
    customStorage: {
      get: async (key) => {
        const value = await redis.get(key);
        return value as RateLimit | undefined;
      },
      set: async (key, value) => {
        await redis.set(key, value);
      },
    },
  },
  baseURL: NEXT_PUBLIC_BETTER_AUTH_URL,
  appName: "OpenCut",
  trustedOrigins: ["http://localhost:3000"],
});

export type Auth = typeof auth;
