import { sql } from "drizzle-orm";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "@/lib/db";

async function runMigrations() {
  console.log("⏳ Running database migrations...");

  try {
    // If the database was initialized prior to Drizzle migration tracking,
    // ensure migration 0000 is marked as applied so it doesn't try to re-create existing tables.
    const migrations = readMigrationFiles({ migrationsFolder: "./drizzle" });
    if (migrations.length > 0) {
      await db.execute(sql`
        CREATE SCHEMA IF NOT EXISTS "drizzle";
        CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
          id SERIAL PRIMARY KEY,
          hash text NOT NULL,
          created_at bigint
        );
      `);

      const existingUsers = await db.execute(sql`
        SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users';
      `);

      if (existingUsers.rows.length > 0) {
        const check0000 = await db.execute(sql`
          SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE created_at = ${migrations[0].folderMillis};
        `);
        if (check0000.rows.length === 0) {
          await db.execute(sql`
            INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
            VALUES (${migrations[0].hash}, ${migrations[0].folderMillis});
          `);
          console.log("ℹ️ Recorded initial schema baseline (0000).");
        }
      }
    }

    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("✅ All migrations applied successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

runMigrations();
