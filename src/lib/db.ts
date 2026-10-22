import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/lib/env";

const globalForDb = globalThis as unknown as {
  conn: Pool | undefined;
};

const useSsl =
  env.DATABASE_URL.includes("sslmode=require") || env.NODE_ENV === "production";

const pool =
  globalForDb.conn ??
  new Pool({
    connectionString: env.DATABASE_URL,
    max: 10,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  });

if (env.NODE_ENV !== "production") {
  globalForDb.conn = pool;
}

export const db = drizzle({ client: pool });
