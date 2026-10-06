import { desc, eq } from "drizzle-orm";
import type { UnifiedSearchResult } from "@/app/api/search/route";
import { mediaItems, userMediaEntries, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { tmdbFetch } from "@/lib/tmdb";
import type { TMDBResponse } from "@/types/tmdb";
import { DashboardClient } from "./dashboard-client";

export default async function HomePage() {
  // 1. Get current logged-in user from the secure cookie
  const currentUser = await getCurrentUser();

  // 2. Query squad members directly from Postgres
  const squadUsers = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .orderBy(users.displayName);

  // 3. Query current user's tracked entries directly from Postgres
  let userEntries: {
    id: string;
    status: "want_to" | "doing" | "done" | "dropped";
    rating: number | null;
    reviewNote: string | null;
    updatedAt: string;
    user: {
      id: string;
      username: string;
      displayName: string;
      avatarUrl: string | null;
    };
    media: {
      id: string;
      externalId: string;
      mediaType: "movie" | "tv" | "game";
      title: string;
      releaseYear: number | null;
      posterUrl: string | null;
      creator: string | null;
      genres: string[];
    };
  }[] = [];

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
    }));
  }

  // 4. Fetch trending movies directly from TMDB on the server
  let trendingResults: UnifiedSearchResult[] = [];
  try {
    const tmdbData: TMDBResponse = await tmdbFetch(
      "/discover/movie?sort_by=popularity.desc&page=1",
    );
    if (tmdbData?.results) {
      trendingResults = tmdbData.results.slice(0, 12).map((item) => ({
        externalId: `tmdb:movie:${item.id}`,
        mediaType: "movie",
        title: item.title || "Untitled",
        releaseYear: item.release_date ? parseInt(item.release_date.slice(0, 4), 10) : null,
        posterUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
        creator: null,
        summary: item.overview || null,
        genres: [],
      }));
    }
  } catch (error) {
    console.error("Failed to fetch trending:", error);
  }

  return (
    <DashboardClient
      currentUser={currentUser}
      users={squadUsers}
      initialEntries={userEntries}
      trendingResults={trendingResults}
    />
  );
}
