import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/lib/env";

const globalForDb = globalThis as unknown as {
  conn: Pool | undefined;
};

const pool =
  globalForDb.conn ??
  new Pool({
    connectionString: env.DATABASE_URL,
  });

if (env.NODE_ENV !== "production") {
  globalForDb.conn = pool;
}

export const db = drizzle({ client: pool });
