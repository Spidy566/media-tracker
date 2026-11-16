import { count } from "drizzle-orm";
import { notFound } from "next/navigation";
import { mediaItems, userMediaEntries, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { type DbStats, DevClient } from "./dev-client";

export const metadata = {
  title: "Architecture & Playground — Tracklist Dev",
  description:
    "Interactive architecture, pipeline explorer, and component playground for Tracklist.",
};

export const dynamic = "force-dynamic";

export default async function DevPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const currentUser = await getCurrentUser();

  // 1. Query live counts from PostgreSQL
  const [usersCountRow] = await db.select({ count: count() }).from(users);
  const totalUsers = usersCountRow?.count ?? 0;

  const mediaTypeCounts = await db
    .select({ mediaType: mediaItems.mediaType, count: count() })
    .from(mediaItems)
    .groupBy(mediaItems.mediaType);

  const [mediaTotalRow] = await db.select({ count: count() }).from(mediaItems);
  const totalMedia = mediaTotalRow?.count ?? 0;

  const mediaCountMap = {
    movie: 0,
    tv: 0,
    game: 0,
  };
  for (const row of mediaTypeCounts) {
    if (row.mediaType in mediaCountMap) {
      mediaCountMap[row.mediaType as keyof typeof mediaCountMap] = row.count;
    }
  }

  const statusCounts = await db
    .select({ status: userMediaEntries.status, count: count() })
    .from(userMediaEntries)
    .groupBy(userMediaEntries.status);

  const [entriesTotalRow] = await db.select({ count: count() }).from(userMediaEntries);
  const totalEntries = entriesTotalRow?.count ?? 0;

  const statusCountMap = {
    want_to: 0,
    doing: 0,
    done: 0,
    dropped: 0,
  };
  for (const row of statusCounts) {
    if (row.status in statusCountMap) {
      statusCountMap[row.status as keyof typeof statusCountMap] = row.count;
    }
  }

  const dbStats: DbStats = {
    users: {
      total: totalUsers,
    },
    mediaItems: {
      total: totalMedia,
      byType: mediaCountMap,
    },
    userMediaEntries: {
      total: totalEntries,
      byStatus: statusCountMap,
    },
  };

  return <DevClient dbStats={dbStats} currentUser={currentUser} />;
}
