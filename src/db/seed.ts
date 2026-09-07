import { db } from "@/lib/db";
import { users } from "@/db/schema";

async function seed() {
  console.log("🌱 Seeding squad users...");

  const squad = [
    { username: "spidy", displayName: "Spidy", avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=spidy" },
    { username: "dave", displayName: "Dave", avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=dave" },
    { username: "alex", displayName: "Alex", avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=alex" },
  ];

  for (const member of squad) {
    await db
      .insert(users)
      .values(member)
      .onConflictDoNothing({ target: users.username });
  }

  console.log("✅ Squad seeded successfully!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});