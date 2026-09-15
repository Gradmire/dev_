import type { Config } from "drizzle-kit";
import { config } from "dotenv";
import { SUPABASE_ROOT_CA } from "./src/db/supabase-ca";

config({ path: ".env.local" });

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
    // Migrations carry no personal data, but they do carry the credentials
    // that reach all of it, and drizzle-kit defaults to the same unverified
    // connection the app used to. Same pinned root — see src/db/index.ts.
    ssl: { ca: SUPABASE_ROOT_CA },
  },
  verbose: true,
  strict: true,
} satisfies Config;
