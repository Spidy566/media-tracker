import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "@/lib/db";

async function runMigrations() {
  console.log("⏳ Running database migrations...");

  try {
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("✅ All migrations applied successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

runMigrations();
