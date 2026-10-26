import { eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { redirect } from "next/navigation";
import type { UnifiedSearchResult } from "@/app/api/search/route";
import type { MediaStatus } from "@/components/discover/poster-card";
import { mediaItems, userMediaEntries } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { igdbFetch } from "@/lib/igdb";
import { getIgdbCoverUrl } from "@/lib/igdb-helpers";
import { normalizePosterUrl } from "@/lib/image-url";
import { tmdbFetch } from "@/lib/tmdb";
import type { IGDBGameItem } from "@/types/igdb";
import type { TMDBResponse } from "@/types/tmdb";
import { DiscoverClient } from "./discover-client";

export const metadata = {
  title: "Discover — Tracklist",
  description: "Explore the Cosmos poster wall and discover related movies, TV shows, and games.",
};

const getDiscoverMovies = unstable_cache(
  async (): Promise<UnifiedSearchResult[]> => {
    try {
      const data: TMDBResponse = await tmdbFetch("/trending/movie/week");
      if (!data?.results) return [];
      return data.results.slice(0, 28).map((item) => ({
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
      console.error("Failed to fetch discover movies:", error);
      return [];
    }
  },
  ["discover-movies-week-dense"],
  { revalidate: 3600 },
);

const getDiscoverTv = unstable_cache(
  async (): Promise<UnifiedSearchResult[]> => {
    try {
      const data: TMDBResponse = await tmdbFetch("/trending/tv/week");
      if (!data?.results) return [];
      return data.results.slice(0, 28).map((item) => ({
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
      console.error("Failed to fetch discover TV:", error);
      return [];
    }
  },
  ["discover-tv-week-dense"],
  { revalidate: 3600 },
);

const getDiscoverGames = unstable_cache(
  async (): Promise<UnifiedSearchResult[]> => {
    try {
      const now = Math.floor(Date.now() / 1000);
      const conditions = [
        "cover != null",
        "cover.url != null",
        `first_release_date <= ${now}`,
        "rating_count != null",
      ];
      const apicalypse = `fields name,cover.url,first_release_date,summary,genres.name,rating; where ${conditions.join(" & ")}; sort rating_count desc; limit 28; offset 0;`;
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
      console.error("Failed to fetch discover games:", error);
      return [];
    }
  },
  ["discover-games-week-dense"],
  { revalidate: 3600 },
);

export default async function DiscoverPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const [movies, tvShows, games, userEntries] = await Promise.all([
    getDiscoverMovies(),
    getDiscoverTv(),
    getDiscoverGames(),
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

  return <DiscoverClient initialTitles={initialTitles} initialTrackedMap={initialTrackedMap} />;
}
