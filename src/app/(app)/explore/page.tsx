import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { type MediaStatus, mediaItems, userMediaEntries } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTrendingGames, getTrendingTmdb } from "@/lib/media-discover";
import type { UnifiedSearchResult } from "@/types/search";
import { ExploreClient } from "./explore-client";

export const metadata = {
  title: "Explore — Tracklist",
  description: "Explore the catalog and discover related movies, TV shows, and games.",
};

export default async function ExplorePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const [movies, tvShows, games, userEntries] = await Promise.all([
    getTrendingTmdb("movie", 28),
    getTrendingTmdb("tv", 28),
    getTrendingGames(28),
    db
      .select({
        id: userMediaEntries.id,
        status: userMediaEntries.status,
        externalId: mediaItems.externalId,
      })
      .from(userMediaEntries)
      .innerJoin(mediaItems, eq(userMediaEntries.mediaItemId, mediaItems.id))
      .where(eq(userMediaEntries.userId, user.id)),
  ]);

  // Construct initial tracked map for fast client lookup
  const initialTrackedMap: Record<string, { id: string; status: MediaStatus }> = {};
  for (const entry of userEntries) {
    initialTrackedMap[entry.externalId] = {
      id: entry.id,
      status: entry.status as MediaStatus,
    };
  }

  // Interleave movies, games, and tv shows for a diverse, balanced dense wall
  const maxLength = Math.max(movies.length, tvShows.length, games.length);
  const initialTitles: UnifiedSearchResult[] = [];

  for (let i = 0; i < maxLength; i++) {
    if (movies[i]) initialTitles.push(movies[i]);
    if (games[i]) initialTitles.push(games[i]);
    if (tvShows[i]) initialTitles.push(tvShows[i]);
  }

  return <ExploreClient initialTitles={initialTitles} initialTrackedMap={initialTrackedMap} />;
}
