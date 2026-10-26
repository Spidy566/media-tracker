import { desc, eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import type { UnifiedSearchResult } from "@/app/api/search/route";
import { mediaItems, userMediaEntries, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { igdbFetch } from "@/lib/igdb";
import { getIgdbCoverUrl } from "@/lib/igdb-helpers";
import { normalizeBackdropUrl, normalizePosterUrl } from "@/lib/image-url";
import { tmdbFetch } from "@/lib/tmdb";
import type { Entry } from "@/types/entry";
import type { IGDBGameItem } from "@/types/igdb";
import type { TMDBResponse } from "@/types/tmdb";
import { DashboardClient } from "./dashboard-client";

const getTrendingMovies = unstable_cache(
  async (): Promise<UnifiedSearchResult[]> => {
    try {
      const data: TMDBResponse = await tmdbFetch("/trending/movie/week");
      if (!data?.results) return [];
      return data.results.slice(0, 10).map((item) => ({
        externalId: `tmdb:movie:${item.id}`,
        mediaType: "movie",
        title: item.title || "Untitled",
        releaseYear: item.release_date ? Number.parseInt(item.release_date.slice(0, 4), 10) : null,
        posterUrl: normalizePosterUrl(
          item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
        ),
        creator: null,
        summary: item.overview || null,
        genres: [],
      }));
    } catch (error) {
      console.error("Failed to fetch trending movies:", error);
      return [];
    }
  },
  ["trending-movies-week-v2"],
  { revalidate: 3600 },
);

const getTrendingTv = unstable_cache(
  async (): Promise<UnifiedSearchResult[]> => {
    try {
      const data: TMDBResponse = await tmdbFetch("/trending/tv/week");
      if (!data?.results) return [];
      return data.results.slice(0, 10).map((item) => ({
        externalId: `tmdb:tv:${item.id}`,
        mediaType: "tv",
        title: item.name || "Untitled",
        releaseYear: item.first_air_date
          ? Number.parseInt(item.first_air_date.slice(0, 4), 10)
          : null,
        posterUrl: normalizePosterUrl(
          item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
        ),
        creator: null,
        summary: item.overview || null,
        genres: [],
      }));
    } catch (error) {
      console.error("Failed to fetch trending TV:", error);
      return [];
    }
  },
  ["trending-tv-week-v2"],
  { revalidate: 3600 },
);

const getTrendingGames = unstable_cache(
  async (): Promise<UnifiedSearchResult[]> => {
    try {
      const now = Math.floor(Date.now() / 1000);
      const conditions = [
        "cover != null",
        "cover.url != null",
        `first_release_date <= ${now}`,
        "rating_count != null",
      ];
      const apicalypse = `fields name,cover.url,first_release_date,summary,genres.name,rating; where ${conditions.join(" & ")}; sort rating_count desc; limit 10; offset 0;`;
      const games: IGDBGameItem[] = await igdbFetch("/games", apicalypse);
      if (!Array.isArray(games)) return [];
      return games.map((g) => ({
        externalId: `igdb:${g.id}`,
        mediaType: "game",
        title: g.name || "Untitled Game",
        releaseYear: g.first_release_date
          ? new Date(g.first_release_date * 1000).getUTCFullYear()
          : null,
        posterUrl: getIgdbCoverUrl(g.cover?.url, "cover_big"),
        creator: null,
        summary: g.summary || null,
        genres: Array.isArray(g.genres) ? g.genres.map((gen) => gen.name) : [],
      }));
    } catch (error) {
      console.error("Failed to fetch trending games:", error);
      return [];
    }
  },
  ["trending-games-week-v2"],
  { revalidate: 3600 },
);

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
        backdropUrl: normalizeBackdropUrl(e.media.backdropUrl),
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

  // 3. 5-8 Most recently updated entries for Activity row
  const recentEntries = userEntries.slice(0, 8);

  // 4. Trending items
  const [trendingMovies, trendingTv, trendingGames] = await Promise.all([
    getTrendingMovies(),
    getTrendingTv(),
    getTrendingGames(),
  ]);

  return (
    <DashboardClient
      currentUser={currentUser}
      libraryCounts={libraryCounts}
      activeItems={activeItems}
      recentEntries={recentEntries}
      trendingMovies={trendingMovies}
      trendingTv={trendingTv}
      trendingGames={trendingGames}
      initialEntries={userEntries}
    />
  );
}
