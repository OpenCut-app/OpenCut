import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const keys = () =>
  createEnv({
    server: {
      NODE_ENV: z
        .enum(["development", "production", "test"])
        .default("development"),
      DATABASE_URL: z
        .string()
        .startsWith("postgres://")
        .or(z.string().startsWith("postgresql://")),
    },
    runtimeEnv: {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL,
    },
  });
