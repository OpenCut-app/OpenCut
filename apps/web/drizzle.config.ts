import type { Config } from "drizzle-kit";
import * as dotenv from "dotenv";

// Load the right env file based on environment
if (process.env.NODE_ENV === "production") {
  dotenv.config({ path: ".env.production" });
} else {
  dotenv.config({ path: ".env.local" });
}

export default {
  schema: "../../packages/db/src/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  out: "./migrations",
  strict: process.env.NODE_ENV === "production",
} satisfies Config;
