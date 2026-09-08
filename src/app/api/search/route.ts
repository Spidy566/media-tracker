import { type NextRequest, NextResponse } from "next/server";
import { igdbFetch } from "@/lib/igdb";
import { getIgdbCoverUrl } from "@/lib/igdb-helpers";
import { tmdbFetch } from "@/lib/tmdb";
import type { IGDBGame } from "@/types/igdb";
import type { TMDBSearchResponse } from "@/types/tmdb";

export interface UnifiedSearchResult {
  externalId: string;
  mediaType: "movie" | "tv" | "game";
  title: string;
  releaseYear: number | null;
  posterUrl: string | null;
  creator: string | null;
  summary: string | null;
  genres: string[];
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ results: [] });
  }

  const cleanQuery = query.trim();

  // Run searches across TMDB (Movies & TV) and IGDB (Games) in parallel
  const [moviesRes, tvRes, gamesRes] = await Promise.allSettled([
    // 1. Search TMDB Movies
    tmdbFetch(`/search/movie?query=${encodeURIComponent(cleanQuery)}&include_adult=false`),
    // 2. Search TMDB TV Shows
    tmdbFetch(`/search/tv?query=${encodeURIComponent(cleanQuery)}&include_adult=false`),
    // 3. Search IGDB Games
    (async () => {
      const safeQuery = cleanQuery.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      const apicalypse = `search "${safeQuery}"; fields name,cover.url,first_release_date,summary,genres.name,involved_companies.company.name; limit 10;`;
      return igdbFetch("/games", apicalypse);
    })(),
  ]);

  const results: UnifiedSearchResult[] = [];

  // Parse Movies
  if (moviesRes.status === "fulfilled" && moviesRes.value?.results) {
    const movieData = moviesRes.value as TMDBSearchResponse;
    for (const m of movieData.results.slice(0, 8)) {
      results.push({
        externalId: `tmdb:movie:${m.id}`,
        mediaType: "movie",
        title: m.title,
        releaseYear: m.release_date ? new Date(m.release_date).getFullYear() : null,
        posterUrl: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
        creator: null,
        summary: m.overview || null,
        genres: [],
      });
    }
  }

  // Parse TV Shows
  if (tvRes.status === "fulfilled" && tvRes.value?.results) {
    for (const show of tvRes.value.results.slice(0, 8)) {
      results.push({
        externalId: `tmdb:tv:${show.id}`,
        mediaType: "tv",
        title: show.name,
        releaseYear: show.first_air_date ? new Date(show.first_air_date).getFullYear() : null,
        posterUrl: show.poster_path ? `https://image.tmdb.org/t/p/w500${show.poster_path}` : null,
        creator: null,
        summary: show.overview || null,
        genres: [],
      });
    }
  }

  // Parse Games
  if (gamesRes.status === "fulfilled" && Array.isArray(gamesRes.value)) {
    const gameData = gamesRes.value as (IGDBGame & {
      involved_companies?: { company: { name: string } }[];
    })[];
    for (const g of gameData.slice(0, 8)) {
      results.push({
        externalId: `igdb:${g.id}`,
        mediaType: "game",
        title: g.name,
        releaseYear: g.first_release_date
          ? new Date(g.first_release_date * 1000).getFullYear()
          : null,
        posterUrl: getIgdbCoverUrl(g.cover?.url, "cover_big"),
        creator: g.involved_companies?.[0]?.company?.name || null,
        summary: g.summary || null,
        genres: g.genres?.map((gen) => gen.name) || [],
      });
    }
  }

  return NextResponse.json({ results });
}
