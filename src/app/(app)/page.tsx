import { desc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { mediaItems, userMediaEntries, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { HOME_HIDDEN_COOKIE, parseHiddenSections } from "@/lib/home-prefs";
import { normalizeBackdropUrl, normalizePosterUrl } from "@/lib/image-url";
import { getTrendingGames, getTrendingTmdb } from "@/lib/media-discover";
import type { Entry } from "@/types/entry";
import { DashboardClient } from "./dashboard-client";

export default async function HomePage() {
  const currentUser = await getCurrentUser();

  let userEntries: Entry[] = [];

  if (currentUser) {
    const rawEntries = await db
      .select({
        id: userMediaEntries.id,
        status: userMediaEntries.status,
        rating: userMediaEntries.rating,
        reviewNote: userMediaEntries.reviewNote,
        updatedAt: userMediaEntries.updatedAt,
        user: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
        media: {
          id: mediaItems.id,
          externalId: mediaItems.externalId,
          mediaType: mediaItems.mediaType,
          title: mediaItems.title,
          releaseYear: mediaItems.releaseYear,
          posterUrl: mediaItems.posterUrl,
          backdropUrl: mediaItems.backdropUrl,
          summary: mediaItems.summary,
          creator: mediaItems.creator,
          genres: mediaItems.genres,
        },
      })
      .from(userMediaEntries)
      .innerJoin(users, eq(userMediaEntries.userId, users.id))
      .innerJoin(mediaItems, eq(userMediaEntries.mediaItemId, mediaItems.id))
      .where(eq(userMediaEntries.userId, currentUser.id))
      .orderBy(desc(userMediaEntries.updatedAt));

    userEntries = rawEntries.map((e) => ({
      ...e,
      updatedAt: e.updatedAt.toISOString(),
      media: {
        ...e.media,
        posterUrl: normalizePosterUrl(e.media.posterUrl),
        backdropUrl:
          normalizeBackdropUrl(e.media.backdropUrl) || normalizePosterUrl(e.media.posterUrl),
      },
    }));
  }

  // 1. Library Counts for Stats Strip
  const libraryCounts = {
    doingCount: userEntries.filter((e) => e.status === "doing").length,
    queueCount: userEntries.filter((e) => e.status === "want_to").length,
    doneCount: userEntries.filter((e) => e.status === "done").length,
    totalCount: userEntries.length,
  };

  // 2. Priority "Continue" row items (in progress)
  const activeItems = userEntries.filter((e) => e.status === "doing");

  // 3. Up Next in Queue row items
  const queueItems = userEntries.filter((e) => e.status === "want_to").slice(0, 12);

  // 4. 5-8 Most recently updated entries for Activity row
  const recentEntries = userEntries.slice(0, 8);

  // 5. Trending items
  const [trendingMovies, trendingTv, trendingGames] = await Promise.all([
    getTrendingTmdb("movie", 10),
    getTrendingTmdb("tv", 10),
    getTrendingGames(10),
  ]);

  const cookieStore = await cookies();
  const hiddenCookie = cookieStore.get(HOME_HIDDEN_COOKIE)?.value;
  const hiddenSections = parseHiddenSections(hiddenCookie);

  return (
    <DashboardClient
      currentUser={currentUser}
      libraryCounts={libraryCounts}
      activeItems={activeItems}
      queueItems={queueItems}
      recentEntries={recentEntries}
      trendingMovies={trendingMovies}
      trendingTv={trendingTv}
      trendingGames={trendingGames}
      initialEntries={userEntries}
      hiddenSections={hiddenSections}
    />
  );
}
