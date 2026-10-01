import { type NextRequest, NextResponse } from "next/server";
import { igdbFetch } from "@/lib/igdb";
import { getIgdbCoverUrl } from "@/lib/igdb-helpers";
import { tmdbFetch } from "@/lib/tmdb";
import type { IGDBGameItem } from "@/types/igdb";
import type { TMDBResponse } from "@/types/tmdb";

export interface CalendarItem {
  externalId: string;
  mediaType: "movie" | "tv" | "game";
  title: string;
  releaseDate: string | null;
  releaseYear: number | null;
  posterUrl: string | null;
  summary: string | null;
  genres: string[];
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const type = searchParams.get("type") || "all"; // all | movie_tv | game
  const lang = searchParams.get("lang") || "all"; // all | en | ta | ja | ko | hi | etc.
  const today = new Date().toISOString().split("T")[0];
  const nowUnix = Math.floor(Date.now() / 1000);

  try {
    const results: CalendarItem[] = [];
    const seenIds = new Set<string>();

    // ─────────────────────────────────────────────────────────────
    // 1. GENERIC TMDB ENGINE (Works for ANY language on Earth)
    // ─────────────────────────────────────────────────────────────
    if (type === "all" || type === "movie_tv") {
      const langFilter = lang !== "all" ? `&with_original_language=${lang}` : "";

      const endpoints = [
        // Confirmed future dates (Pages 1 & 2)
        `/discover/movie?primary_release_date.gte=${today}&sort_by=primary_release_date.asc&page=1&include_adult=false${langFilter}`,
        `/discover/movie?primary_release_date.gte=${today}&sort_by=primary_release_date.asc&page=2&include_adult=false${langFilter}`,
        // High-anticipation in-production & announced titles (Pages 1 & 2)
        `/discover/movie?sort_by=popularity.desc&page=1&include_adult=false${langFilter}`,
        `/discover/movie?sort_by=popularity.desc&page=2&include_adult=false${langFilter}`,
        // Upcoming TV & Series
        `/discover/tv?first_air_date.gte=${today}&sort_by=popularity.desc&page=1&include_adult=false${langFilter}`,
      ];

      const responses = await Promise.allSettled(endpoints.map((ep) => tmdbFetch(ep)));

      for (const res of responses) {
        if (res.status === "fulfilled" && res.value?.results) {
          const data = res.value as TMDBResponse;
          for (const item of data.results) {
            const mediaType = item.title ? "movie" : "tv";
            const externalId = `tmdb:${mediaType}:${item.id}`;
            if (seenIds.has(externalId)) continue;

            const date = item.release_date || item.first_air_date;
            const isFuture = date && date >= today;
            const isTBA = !date;

            // Only include upcoming or announced titles
            if (isFuture || isTBA) {
              seenIds.add(externalId);
              results.push({
                externalId,
                mediaType,
                title: item.title || item.name || "Untitled",
                releaseDate: date || null,
                releaseYear: date ? parseInt(date.slice(0, 4), 10) : null,
                posterUrl: item.poster_path
                  ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
                  : null,
                summary: item.overview || null,
                genres: [],
              });
            }
          }
        }
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 2. GENERIC IGDB GAMES ENGINE (Only when games make sense)
    // ─────────────────────────────────────────────────────────────
    const includeGames = (type === "all" || type === "game") && (lang === "all" || lang === "en");

    if (includeGames) {
      const apicalypse = `where (first_release_date > ${nowUnix} | release_dates.date > ${nowUnix}) & cover != null; sort hypes desc; limit 20; fields name,cover.url,first_release_date,release_dates.date,summary,genres.name,hypes;`;
      const games: IGDBGameItem[] = await igdbFetch("/games", apicalypse);

      for (const g of games || []) {
        const externalId = `igdb:${g.id}`;
        if (seenIds.has(externalId)) continue;

        const rawDate =
          g.first_release_date ||
          (g as { release_dates?: { date: number }[] }).release_dates?.[0]?.date;

        if (rawDate && rawDate > nowUnix) {
          seenIds.add(externalId);
          const date = new Date(rawDate * 1000);
          results.push({
            externalId,
            mediaType: "game",
            title: g.name,
            releaseDate: date.toISOString().split("T")[0],
            releaseYear: date.getFullYear(),
            posterUrl: getIgdbCoverUrl(g.cover?.url, "cover_big"),
            summary: g.summary || null,
            genres: g.genres?.map((gen) => gen.name) || [],
          });
        }
      }
    }

    // Sort: Confirmed dates chronologically, TBAs at the end
    results.sort((a, b) => {
      if (!a.releaseDate && !b.releaseDate) return 0;
      if (!a.releaseDate) return 1;
      if (!b.releaseDate) return -1;
      return a.releaseDate.localeCompare(b.releaseDate);
    });

    return NextResponse.json({ releases: results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load calendar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
