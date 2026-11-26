import { unstable_cache } from "next/cache";
import { igdbFetch } from "@/lib/igdb";
import { getIgdbCoverUrl } from "@/lib/igdb-helpers";
import { normalizePosterUrl } from "@/lib/image-url";
import { tmdbFetch } from "@/lib/tmdb";
import type { IGDBGameItem } from "@/types/igdb";
import type { UnifiedSearchResult } from "@/types/search";
import type { TMDBMediaItem, TMDBResponse } from "@/types/tmdb";

function parseReleaseYear(dateStr?: string | null): number | null {
  if (!dateStr?.trim()) return null;
  const year = Number.parseInt(dateStr.slice(0, 4), 10);
  return Number.isNaN(year) ? null : year;
}

/** Map a TMDB movie or TV item into a normalized UnifiedSearchResult. */
export function mapTmdbItemToSearchResult(
  item: TMDBMediaItem,
  type: "movie" | "tv",
): UnifiedSearchResult {
  const title =
    (type === "movie" ? item.title : item.name) || item.title || item.name || "Untitled";
  const dateStr = type === "movie" ? item.release_date : item.first_air_date;
  return {
    externalId: `tmdb:${type}:${item.id}`,
    mediaType: type,
    title,
    releaseYear: parseReleaseYear(dateStr || item.release_date || item.first_air_date),
    posterUrl: normalizePosterUrl(
      item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
    ),
    creator: null,
    summary: item.overview || null,
    genres: [],
  };
}

/** Map an IGDB game item into a normalized UnifiedSearchResult. */
export function mapIgdbGameToSearchResult(game: IGDBGameItem): UnifiedSearchResult {
  return {
    externalId: `igdb:${game.id}`,
    mediaType: "game",
    title: game.name || "Untitled Game",
    releaseYear: game.first_release_date
      ? new Date(game.first_release_date * 1000).getUTCFullYear()
      : null,
    posterUrl: getIgdbCoverUrl(game.cover?.url, "cover_big"),
    creator: game.involved_companies?.[0]?.company?.name || null,
    summary: game.summary || null,
    genres: Array.isArray(game.genres) ? game.genres.map((gen) => gen.name) : [],
  };
}

/** Fetch weekly trending movies or TV shows from TMDB with a 1-hour cache. */
export const getTrendingTmdb = unstable_cache(
  async (type: "movie" | "tv", limit = 10): Promise<UnifiedSearchResult[]> => {
    try {
      const data: TMDBResponse = await tmdbFetch(`/trending/${type}/week`);
      if (!data?.results) return [];
      return data.results.slice(0, limit).map((item) => mapTmdbItemToSearchResult(item, type));
    } catch (error) {
      console.error(`Failed to fetch trending ${type}:`, error);
      return [];
    }
  },
  ["trending-tmdb-week-v2"],
  { revalidate: 3600 },
);

/** Fetch popular released games from IGDB with a 1-hour cache. */
export const getTrendingGames = unstable_cache(
  async (limit = 10): Promise<UnifiedSearchResult[]> => {
    try {
      const now = Math.floor(Date.now() / 1000);
      const conditions = [
        "cover != null",
        "cover.url != null",
        `first_release_date <= ${now}`,
        "rating_count != null",
      ];
      const apicalypse = `fields name,cover.url,first_release_date,summary,genres.name,rating; where ${conditions.join(" & ")}; sort rating_count desc; limit ${limit}; offset 0;`;
      const games: IGDBGameItem[] = await igdbFetch("/games", apicalypse);
      if (!Array.isArray(games)) return [];
      return games.map(mapIgdbGameToSearchResult);
    } catch (error) {
      console.error("Failed to fetch trending games:", error);
      return [];
    }
  },
  ["trending-games-week-v2"],
  { revalidate: 3600 },
);
