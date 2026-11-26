import { type NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { igdbFetch } from "@/lib/igdb";
import { mapIgdbGameToSearchResult, mapTmdbItemToSearchResult } from "@/lib/media-discover";
import { tmdbFetch } from "@/lib/tmdb";
import type { IGDBGameItem } from "@/types/igdb";
import type { UnifiedSearchResult } from "@/types/search";
import type { TMDBResponse } from "@/types/tmdb";

export type { UnifiedSearchResult };

export async function GET(request: NextRequest) {
  const authResult = await requireUser(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const query = request.nextUrl.searchParams.get("q");

  if (!query?.trim()) {
    return NextResponse.json({ results: [] });
  }

  const cleanQuery = query.trim();

  // Run searches across TMDB (Movies & TV) and IGDB (Games) in parallel
  const [moviesRes, tvRes, gamesRes] = await Promise.allSettled([
    tmdbFetch(`/search/movie?query=${encodeURIComponent(cleanQuery)}&include_adult=false`),
    tmdbFetch(`/search/tv?query=${encodeURIComponent(cleanQuery)}&include_adult=false`),
    (async () => {
      const safeQuery = cleanQuery.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      const apicalypse = `search "${safeQuery}"; fields name,cover.url,first_release_date,summary,genres.name,involved_companies.company.name; limit 10;`;
      return igdbFetch("/games", apicalypse);
    })(),
  ]);

  const results: UnifiedSearchResult[] = [];

  // Parse Movies
  if (moviesRes.status === "fulfilled" && moviesRes.value?.results) {
    const movieData = moviesRes.value as TMDBResponse;
    results.push(
      ...movieData.results.slice(0, 8).map((m) => mapTmdbItemToSearchResult(m, "movie")),
    );
  }

  // Parse TV Shows
  if (tvRes.status === "fulfilled" && tvRes.value?.results) {
    const tvData = tvRes.value as TMDBResponse;
    results.push(
      ...tvData.results.slice(0, 8).map((show) => mapTmdbItemToSearchResult(show, "tv")),
    );
  }

  // Parse Games
  if (gamesRes.status === "fulfilled" && Array.isArray(gamesRes.value)) {
    const gameData = gamesRes.value as IGDBGameItem[];
    results.push(...gameData.slice(0, 8).map(mapIgdbGameToSearchResult));
  }

  return NextResponse.json({ results });
}
