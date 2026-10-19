import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { monthRange } from "@/lib/calendar-dates";
import { igdbFetch } from "@/lib/igdb";
import { getIgdbCoverUrl } from "@/lib/igdb-helpers";
import { tmdbFetch } from "@/lib/tmdb";

interface TmdbDiscoverItem {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  release_date?: string;
  first_air_date?: string;
  overview?: string;
  genre_ids?: number[];
  popularity?: number;
}

interface TmdbDiscoverResponse {
  page: number;
  results: TmdbDiscoverItem[];
  total_pages: number;
  total_results: number;
}

export interface CalendarItem {
  externalId: string;
  mediaType: "movie" | "tv" | "game";
  title: string;
  releaseDate: string | null;
  datePrecision: "day" | "month";
  releaseYear: number | null;
  posterUrl: string | null;
  summary: string | null;
  genres: string[];
  popularity: number;
}

export interface CalendarApiResponse {
  month: string;
  releases: CalendarItem[];
  partial: boolean;
  failedSources: string[];
  gamesSkipped: boolean;
}

export const TMDB_GENRES: Record<number, string> = {
  // Movie genres
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Science Fiction",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
  // TV genres
  10759: "Action & Adventure",
  10762: "Kids",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
};

interface IgdbReleaseDateItem {
  id: number;
  date: number;
  date_format: number;
  platform?: number;
  game: {
    id: number;
    name: string;
    summary?: string;
    cover?: {
      id: number;
      url: string;
    };
    genres?: {
      id: number;
      name: string;
    }[];
    hypes?: number;
    total_rating_count?: number;
  };
}

const querySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Month must match YYYY-MM")
    .refine((val) => {
      const [yearStr, monthStr] = val.split("-");
      const year = Number.parseInt(yearStr, 10);
      const month = Number.parseInt(monthStr, 10);
      if (month < 1 || month > 12) return false;

      const currentYear = new Date().getUTCFullYear();
      const minYear = 1990;
      const maxYear = currentYear + 3;

      if (year < minYear || year > maxYear) return false;
      return true;
    }, "Month must fall between 1990-01 and three years from now"),
  type: z.enum(["all", "movie", "tv", "game"]).default("all"),
  lang: z.string().default("all"),
  depth: z.enum(["top", "all"]).default("top"),
});

export async function GET(request: NextRequest) {
  const authResult = await requireUser(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { searchParams } = request.nextUrl;

  const rawParams = {
    month: searchParams.get("month") ?? "",
    type: searchParams.get("type") || "all",
    lang: searchParams.get("lang") || "all",
    depth: searchParams.get("depth") || "top",
  };

  const parsed = querySchema.safeParse(rawParams);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsed.error.format() },
      { status: 400 },
    );
  }

  const { month, type, lang, depth } = parsed.data;

  // Determine caching duration:
  // 3600 for current and future months, 86400 for past months
  const now = new Date();
  const currentYm = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const isPastMonth = month < currentYm;
  const isFutureMonth = month > currentYm;
  const revalidateSeconds = isPastMonth ? 86400 : 3600;

  const { start: monthStart, end: monthEnd } = monthRange(month);
  const langParam = lang !== "all" ? `&with_original_language=${encodeURIComponent(lang)}` : "";

  // Check game skipping rule:
  // Games skipped when lang is not all or en (IGDB has no language filter)
  const isLanguageAllowedForGames = lang === "all" || lang === "en";
  const shouldFetchGames = (type === "all" || type === "game") && isLanguageAllowedForGames;
  const gamesSkipped = (type === "all" || type === "game") && !isLanguageAllowedForGames;

  const tasks: Promise<{ source: "movies" | "tv" | "games"; items: CalendarItem[] }>[] = [];

  // 1. Movies (TMDB)
  if (type === "all" || type === "movie") {
    const moviePageCount = depth === "top" ? 2 : 5;
    tasks.push(
      (async () => {
        const pagePromises = Array.from({ length: moviePageCount }, (_, i) => {
          const page = i + 1;
          const endpoint = `/discover/movie?primary_release_date.gte=${monthStart}&primary_release_date.lte=${monthEnd}&sort_by=popularity.desc&include_adult=false${langParam}&page=${page}`;
          return tmdbFetch(endpoint, { next: { revalidate: revalidateSeconds } });
        });

        const pages = await Promise.all(pagePromises);
        const items: CalendarItem[] = [];

        for (const pageData of pages) {
          const results = (pageData as TmdbDiscoverResponse)?.results || [];
          for (const item of results) {
            const dateStr = item.release_date || null;
            const genres = (item.genre_ids || [])
              .map((id: number) => TMDB_GENRES[id])
              .filter((g: string | undefined): g is string => typeof g === "string");

            items.push({
              externalId: `tmdb:movie:${item.id}`,
              mediaType: "movie",
              title: item.title || "Untitled",
              releaseDate: dateStr,
              datePrecision: "day",
              releaseYear: dateStr ? Number.parseInt(dateStr.slice(0, 4), 10) : null,
              posterUrl: item.poster_path
                ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
                : null,
              summary: item.overview || null,
              genres,
              popularity: item.popularity ?? 0,
            });
          }
        }
        return { source: "movies" as const, items };
      })(),
    );
  }

  // 2. TV (TMDB)
  if (type === "all" || type === "tv") {
    const tvPageCount = depth === "top" ? 1 : 3;
    tasks.push(
      (async () => {
        const pagePromises = Array.from({ length: tvPageCount }, (_, i) => {
          const page = i + 1;
          const endpoint = `/discover/tv?first_air_date.gte=${monthStart}&first_air_date.lte=${monthEnd}&sort_by=popularity.desc&include_null_first_air_dates=false${langParam}&page=${page}`;
          return tmdbFetch(endpoint, { next: { revalidate: revalidateSeconds } });
        });

        const pages = await Promise.all(pagePromises);
        const items: CalendarItem[] = [];

        for (const pageData of pages) {
          const results = (pageData as TmdbDiscoverResponse)?.results || [];
          for (const item of results) {
            const dateStr = item.first_air_date || null;
            const genres = (item.genre_ids || [])
              .map((id: number) => TMDB_GENRES[id])
              .filter((g: string | undefined): g is string => typeof g === "string");

            items.push({
              externalId: `tmdb:tv:${item.id}`,
              mediaType: "tv",
              title: item.name || "Untitled",
              releaseDate: dateStr,
              datePrecision: "day",
              releaseYear: dateStr ? Number.parseInt(dateStr.slice(0, 4), 10) : null,
              posterUrl: item.poster_path
                ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
                : null,
              summary: item.overview || null,
              genres,
              popularity: item.popularity ?? 0,
            });
          }
        }
        return { source: "tv" as const, items };
      })(),
    );
  }

  // 3. Games (IGDB)
  if (shouldFetchGames) {
    tasks.push(
      (async () => {
        const [yearStr, monthStr] = month.split("-");
        const y = Number.parseInt(yearStr, 10);
        const m = Number.parseInt(monthStr, 10);
        const lastDay = new Date(y, m, 0).getDate();
        const startSec = Math.floor(Date.UTC(y, m - 1, 1, 0, 0, 0) / 1000);
        const endSec = Math.floor(Date.UTC(y, m - 1, lastDay, 23, 59, 59) / 1000);

        const bodyDay = `fields date, date_format, platform, game.name, game.summary, game.cover.url, game.genres.name, game.hypes, game.total_rating_count; where date >= ${startSec} & date <= ${endSec} & date_format = 0 & game.cover != null; sort date asc; limit 500;`;
        const bodyMonth = `fields date, date_format, platform, game.name, game.summary, game.cover.url, game.genres.name, game.hypes, game.total_rating_count; where date >= ${startSec} & date <= ${endSec} & date_format = 1 & game.cover != null; sort date asc; limit 500;`;

        const [dayData, monthData] = await Promise.all([
          igdbFetch("/release_dates", bodyDay, {
            next: { revalidate: revalidateSeconds },
          }) as Promise<IgdbReleaseDateItem[]>,
          igdbFetch("/release_dates", bodyMonth, {
            next: { revalidate: revalidateSeconds },
          }) as Promise<IgdbReleaseDateItem[]>,
        ]);

        // Helper to dedupe by game.id keeping earliest date
        const dedupeAndSort = (
          entries: IgdbReleaseDateItem[],
          precision: "day" | "month",
          limitCount: number,
        ): CalendarItem[] => {
          const gameMap = new Map<number, IgdbReleaseDateItem>();
          for (const item of entries) {
            if (!item.game?.id) continue;
            const existing = gameMap.get(item.game.id);
            if (!existing || item.date < existing.date) {
              gameMap.set(item.game.id, item);
            }
          }

          const unique = Array.from(gameMap.values());
          unique.sort((a, b) => {
            if (isFutureMonth) {
              const hypesA = a.game.hypes ?? 0;
              const hypesB = b.game.hypes ?? 0;
              if (hypesB !== hypesA) return hypesB - hypesA;
            }
            const ratingA = a.game.total_rating_count ?? 0;
            const ratingB = b.game.total_rating_count ?? 0;
            return ratingB - ratingA;
          });

          const trimmed = unique.slice(0, limitCount);
          return trimmed.map((item) => {
            const dateObj = new Date(item.date * 1000);
            const releaseDate = precision === "day" ? dateObj.toISOString().split("T")[0] : null;
            const releaseYear = dateObj.getUTCFullYear();
            const genres = Array.isArray(item.game.genres)
              ? item.game.genres.map((g) => g.name).filter(Boolean)
              : [];
            const popularity = (item.game.hypes ?? 0) * 10 + (item.game.total_rating_count ?? 0);

            return {
              externalId: `igdb:${item.game.id}`,
              mediaType: "game" as const,
              title: item.game.name,
              releaseDate,
              datePrecision: precision,
              releaseYear,
              posterUrl: getIgdbCoverUrl(item.game.cover?.url, "cover_big"),
              summary: item.game.summary || null,
              genres,
              popularity,
            };
          });
        };

        const gameLimit = depth === "top" ? 40 : 120;
        const dayItems = dedupeAndSort(Array.isArray(dayData) ? dayData : [], "day", gameLimit);
        const monthItems = dedupeAndSort(
          Array.isArray(monthData) ? monthData : [],
          "month",
          gameLimit,
        );

        return { source: "games" as const, items: [...dayItems, ...monthItems] };
      })(),
    );
  }

  // Execute sources with Promise.allSettled
  const settled = await Promise.allSettled(tasks);
  const failedSources: string[] = [];
  const allItems: CalendarItem[] = [];

  for (let i = 0; i < settled.length; i++) {
    const res = settled[i];
    if (res.status === "fulfilled") {
      allItems.push(...res.value.items);
    } else {
      console.error("Calendar source failed:", res.reason);
      // Map index to source name
      let sourceName = "unknown";
      if (type === "all") {
        sourceName = i === 0 ? "movies" : i === 1 ? "tv" : "games";
      } else {
        sourceName = type === "movie" ? "movies" : type === "tv" ? "tv" : "games";
      }
      failedSources.push(sourceName);
    }
  }

  // If all requested sources failed, return 502
  if (tasks.length > 0 && failedSources.length === tasks.length) {
    return NextResponse.json({ error: "All calendar sources failed to load" }, { status: 502 });
  }

  // Deduplicate by externalId
  const uniqueItemsMap = new Map<string, CalendarItem>();
  for (const item of allItems) {
    if (!uniqueItemsMap.has(item.externalId)) {
      uniqueItemsMap.set(item.externalId, item);
    }
  }
  const uniqueItems = Array.from(uniqueItemsMap.values());

  // Sort by date asc (items with null date at the end), then popularity desc
  uniqueItems.sort((a, b) => {
    if (!a.releaseDate && !b.releaseDate) {
      return b.popularity - a.popularity;
    }
    if (!a.releaseDate) return 1;
    if (!b.releaseDate) return -1;
    const dateCmp = a.releaseDate.localeCompare(b.releaseDate);
    if (dateCmp !== 0) return dateCmp;
    return b.popularity - a.popularity;
  });

  const responseBody: CalendarApiResponse = {
    month,
    releases: uniqueItems,
    partial: failedSources.length > 0,
    failedSources,
    gamesSkipped,
  };

  return NextResponse.json(responseBody, {
    headers: {
      "Cache-Control": `public, s-maxage=${revalidateSeconds}, stale-while-revalidate=86400`,
    },
  });
}
