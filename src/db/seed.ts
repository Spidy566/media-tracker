import "dotenv/config";
import { sql } from "drizzle-orm";
import { mediaItems, userMediaEntries, users } from "@/db/schema";
import { db } from "@/lib/db";

/* -------------------------------------------------------------------------- */
/*  Safety                                                                    */
/* -------------------------------------------------------------------------- */

if (process.env.NODE_ENV === "production" && process.env.ALLOW_PROD_SEED !== "true") {
  console.error("❌ Refusing to seed in production. Set ALLOW_PROD_SEED=true to override.");
  process.exit(1);
}

/* -------------------------------------------------------------------------- */
/*  Data                                                                      */
/* -------------------------------------------------------------------------- */

type MediaType = "movie" | "tv" | "game";
type Status = "want_to" | "doing" | "done";

const SQUAD = [
  { username: "spidy", displayName: "Spidy" },
  { username: "dave", displayName: "Dave" },
  { username: "alex", displayName: "Alex" },
].map((u) => ({
  ...u,
  avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${u.username}`,
}));

const tmdb = (path: string) => `https://image.tmdb.org/t/p/w780/${path}`;
const igdb = (id: string) => `https://images.igdb.com/igdb/image/upload/t_cover_big/${id}.jpg`;

const CATALOG: {
  externalId: string;
  mediaType: MediaType;
  title: string;
  releaseYear: number;
  posterUrl: string;
  creator: string;
  summary: string;
  genres: string[];
}[] = [
  {
    externalId: "tmdb:movie:693134",
    mediaType: "movie",
    title: "Dune: Part Two",
    releaseYear: 2024,
    posterUrl: tmdb("1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg"),
    creator: "Denis Villeneuve",
    summary:
      "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.",
    genres: ["Sci-Fi", "Adventure"],
  },
  {
    externalId: "tmdb:movie:872585",
    mediaType: "movie",
    title: "Oppenheimer",
    releaseYear: 2023,
    posterUrl: tmdb("8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg"),
    creator: "Christopher Nolan",
    summary:
      "The story of J. Robert Oppenheimer's role in the development of the atomic bomb during World War II.",
    genres: ["Drama", "History"],
  },
  {
    externalId: "tmdb:movie:569094",
    mediaType: "movie",
    title: "Spider-Man: Across the Spider-Verse",
    releaseYear: 2023,
    posterUrl: tmdb("8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg"),
    creator: "Joaquim Dos Santos, Kemp Powers & Justin K. Thompson",
    summary:
      "Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People charged with protecting its very existence.",
    genres: ["Animation", "Action", "Adventure", "Sci-Fi"],
  },
  {
    externalId: "tmdb:movie:414906",
    mediaType: "movie",
    title: "The Batman",
    releaseYear: 2022,
    posterUrl: tmdb("74xTEgt7R36Fpooo50r9T25onhq.jpg"),
    creator: "Matt Reeves",
    summary:
      "In his second year of fighting crime, Batman uncovers corruption in Gotham City that connects to his own family while facing the Riddler.",
    genres: ["Crime", "Mystery", "Thriller"],
  },
  {
    externalId: "tmdb:tv:95396",
    mediaType: "tv",
    title: "Severance",
    releaseYear: 2022,
    posterUrl: tmdb("pPHpeI2X1qEd1CS1SeyrdhZ4qnT.jpg"), // verified against TMDB page
    creator: "Dan Erickson",
    summary:
      "Mark leads a team of office workers whose memories have been surgically divided between their work and personal lives.",
    genres: ["Sci-Fi", "Mystery", "Drama"],
  },
  {
    externalId: "igdb:119133",
    mediaType: "game",
    title: "Elden Ring",
    releaseYear: 2022,
    posterUrl: igdb("co4jni"),
    creator: "FromSoftware",
    summary:
      "Rise, Tarnished, and be guided by grace to brandish the power of the Elden Ring and become an Elden Lord in the Lands Between.",
    genres: ["RPG", "Action", "Adventure"],
  },
  {
    externalId: "igdb:119171",
    mediaType: "game",
    title: "Baldur's Gate 3",
    releaseYear: 2023,
    posterUrl: igdb("co670h"),
    creator: "Larian Studios",
    summary:
      "Gather your party and return to the Forgotten Realms in a tale of fellowship and betrayal, sacrifice and survival, and the lure of absolute power.",
    genres: ["RPG", "Strategy", "Adventure"],
  },
  {
    externalId: "igdb:1877",
    mediaType: "game",
    title: "Cyberpunk 2077",
    releaseYear: 2020,
    posterUrl: igdb("co85q3"), // UNVERIFIED cover ID
    creator: "CD Projekt Red",
    summary:
      "An open-world, action-adventure RPG set in the megalopolis of Night City, where you play as a cyberpunk mercenary wrapped up in a do-or-die fight for survival.",
    genres: ["RPG", "Shooter", "Action"],
  },
];

const ENTRIES: {
  username: string;
  externalId: string;
  status: Status;
  rating?: number;
  reviewNote?: string;
}[] = [
  // Spidy
  { username: "spidy", externalId: "tmdb:movie:693134", status: "doing" },
  { username: "spidy", externalId: "igdb:119133", status: "doing" },
  {
    username: "spidy",
    externalId: "tmdb:movie:872585",
    status: "done",
    rating: 5, // <-- Scaled to 5
    reviewNote: "Nolan's sound design in IMAX was unreal. Cillian Murphy gave a masterclass.",
  },
  {
    username: "spidy",
    externalId: "tmdb:movie:569094",
    status: "done",
    rating: 5, // <-- Scaled to 5
    reviewNote:
      "Visual masterpiece. The soundtrack and animation transitions alone deserve every award.",
  },

  // Dave
  { username: "dave", externalId: "igdb:119171", status: "doing" },
  {
    username: "dave",
    externalId: "igdb:119133",
    status: "done",
    rating: 5, // <-- Scaled to 5
    reviewNote: "Hardest boss fights I've ever experienced, but completely worth 120 hours.",
  },
  {
    username: "dave",
    externalId: "tmdb:movie:414906",
    status: "done",
    rating: 4, // <-- Scaled to 4
    reviewNote: "Genuinely gritty detective noir take that worked really well.",
  },

  // Alex
  {
    username: "alex",
    externalId: "igdb:1877",
    status: "done",
    rating: 4, // <-- Scaled to 4
    reviewNote: "Phantom Liberty fixed everything. Night City looks unbelievable on max settings.",
  },
  {
    username: "alex",
    externalId: "tmdb:movie:693134",
    status: "done",
    rating: 5, // <-- Scaled to 5
    reviewNote:
      "Denis Villeneuve does not miss. The cinematography during the desert battle was breathtaking.",
  },
  {
    username: "alex",
    externalId: "tmdb:tv:95396",
    status: "done",
    rating: 5, // <-- Scaled to 5
    reviewNote: "The season finale was one of the most tense hours of television ever made.",
  },
];

/* -------------------------------------------------------------------------- */
/*  Seed                                                                      */
/* -------------------------------------------------------------------------- */

function required<T>(map: Map<string, T>, key: string, label: string): T {
  const value = map.get(key);
  if (value === undefined) throw new Error(`Missing seeded ${label}: ${key}`);
  return value;
}

async function seed() {
  // Validate data up front so we fail before touching the DB.
  const catalogIds = new Set(CATALOG.map((c) => c.externalId));
  const usernames = new Set(SQUAD.map((u) => u.username));
  for (const e of ENTRIES) {
    if (!catalogIds.has(e.externalId))
      throw new Error(`Entry references unknown media: ${e.externalId}`);
    if (!usernames.has(e.username)) throw new Error(`Entry references unknown user: ${e.username}`);
    if (e.rating !== undefined && (e.rating < 1 || e.rating > 5)) {
      throw new Error(`Rating out of range (1-5) for ${e.username}/${e.externalId}`);
    }
  }

  const reset = process.argv.includes("--reset");

  await db.transaction(async (tx) => {
    if (reset) {
      console.log("🧹 Clearing existing data...");
      // Children first, so foreign keys don't block the deletes.
      await tx.delete(userMediaEntries);
      await tx.delete(mediaItems);
      await tx.delete(users);
    }

    console.log("🌱 Seeding squad users...");
    const insertedUsers = await tx
      .insert(users)
      .values(SQUAD)
      .onConflictDoUpdate({
        target: users.username,
        set: {
          displayName: sql`excluded.display_name`,
          avatarUrl: sql`excluded.avatar_url`,
        },
      })
      .returning({ id: users.id, username: users.username });
    const userIds = new Map(insertedUsers.map((u) => [u.username, u.id]));

    console.log("🎬 Seeding movie, series & game catalog...");
    const insertedItems = await tx
      .insert(mediaItems)
      .values(CATALOG)
      .onConflictDoUpdate({
        target: mediaItems.externalId,
        set: {
          title: sql`excluded.title`,
          releaseYear: sql`excluded.release_year`,
          posterUrl: sql`excluded.poster_url`,
          creator: sql`excluded.creator`,
          summary: sql`excluded.summary`,
          genres: sql`excluded.genres`,
        },
      })
      .returning({ id: mediaItems.id, externalId: mediaItems.externalId });
    const itemIds = new Map(insertedItems.map((m) => [m.externalId, m.id]));

    console.log("⭐ Seeding squad reviews and backlog tracking...");
    const now = new Date();
    const rows = ENTRIES.map((e) => ({
      userId: required(userIds, e.username, "user"),
      mediaItemId: required(itemIds, e.externalId, "media"),
      status: e.status,
      rating: e.rating ?? null,
      reviewNote: e.reviewNote ?? null,
      updatedAt: now,
    }));

    await tx
      .insert(userMediaEntries)
      .values(rows)
      .onConflictDoUpdate({
        target: [userMediaEntries.userId, userMediaEntries.mediaItemId],
        set: {
          status: sql`excluded.status`,
          rating: sql`excluded.rating`,
          reviewNote: sql`excluded.review_note`,
          updatedAt: now,
        },
      });
  });

  console.log(
    `✅ Seed complete: ${SQUAD.length} users, ${CATALOG.length} media items, ${ENTRIES.length} entries.`,
  );
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  });
