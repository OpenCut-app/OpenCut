import type { Config } from "drizzle-kit";
import * as dotenv from "dotenv";
import { keys } from "./src/keys";

const { NODE_ENV, DATABASE_URL } = keys();

// Load the right env file based on environment
if (NODE_ENV === "production") {
  dotenv.config({ path: ".env.production" });
} else {
  dotenv.config({ path: ".env.local" });
}

export default {
  schema: "./src/schema.ts",
  dialect: "postgresql",
  migrations: {
    table: "drizzle_migrations",
  },
  dbCredentials: {
    url: DATABASE_URL,
  },
  out: "./migrations",
  strict: NODE_ENV === "production",
} satisfies Config;
