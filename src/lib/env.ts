import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid PostgreSQL connection string"),
  TMDB_API_KEY: z.string().min(1, "TMDB_API_KEY is required"),
  TWITCH_CLIENT_ID: z.string().min(1, "TWITCH_CLIENT_ID is required for IGDB access"),
  TWITCH_CLIENT_SECRET: z.string().min(1, "TWITCH_CLIENT_SECRET is required for IGDB access"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  throw new Error("Missing or invalid environment variables. Check your .env file.");
}

export const env = parsed.data;
