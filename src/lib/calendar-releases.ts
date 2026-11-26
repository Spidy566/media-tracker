import { monthRange } from "@/lib/calendar-dates";
import { TMDB_GENRE_NAMES } from "@/lib/genres";
import { igdbFetch } from "@/lib/igdb";
import { getIgdbCoverUrl } from "@/lib/igdb-helpers";
import { tmdbFetch } from "@/lib/tmdb";
import type { CalendarApiResponse, CalendarItem } from "@/types/calendar";

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
  results: TmdbDiscoverItem[];
}

interface IgdbReleaseDateItem {
  id: number;
  date: number;
  date_format: number;
  platform?: number;
  game: {
    id: number;
    name: string;
    summary?: string;
    cover?: { id: number; url: string };
    genres?: { id: number; name: string }[];
    hypes?: number;
    total_rating_count?: number;
  };
}

async function fetchTmdbMonthlyReleases(
  mediaType: "movie" | "tv",
  monthStart: string,
  monthEnd: string,
  langParam: string,
  pageCount: number,
  revalidateSeconds: number,
): Promise<{ source: "movies" | "tv"; items: CalendarItem[] }> {
  const isMovie = mediaType === "movie";
  const dateField = isMovie ? "primary_release_date" : "first_air_date";
  const extra = isMovie ? "&include_adult=false" : "&include_null_first_air_dates=false";

  const pages = await Promise.all(
    Array.from({ length: pageCount }, (_, i) => {
      const endpoint = `/discover/${mediaType}?${dateField}.gte=${monthStart}&${dateField}.lte=${monthEnd}&sort_by=popularity.desc${extra}${langParam}&page=${i + 1}`;
      return tmdbFetch(endpoint, { next: { revalidate: revalidateSeconds } });
    }),
  );

  const items: CalendarItem[] = [];
  for (const pageData of pages) {
    const results = (pageData as TmdbDiscoverResponse)?.results || [];
    for (const item of results) {
      const dateStr = (isMovie ? item.release_date : item.first_air_date) || null;
      const genres = (item.genre_ids || [])
        .map((id) => TMDB_GENRE_NAMES[id])
        .filter((g): g is string => typeof g === "string");

      items.push({
        externalId: `tmdb:${mediaType}:${item.id}`,
        mediaType,
        title: (isMovie ? item.title : item.name) || "Untitled",
        releaseDate: dateStr,
        datePrecision: "day",
        releaseYear: dateStr ? Number.parseInt(dateStr.slice(0, 4), 10) : null,
        posterUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
        summary: item.overview || null,
        genres,
        popularity: item.popularity ?? 0,
      });
    }
  }

  return { source: isMovie ? "movies" : "tv", items };
}

async function fetchIgdbMonthlyReleases(
  month: string,
  depth: "top" | "all",
  isFutureMonth: boolean,
  revalidateSeconds: number,
): Promise<{ source: "games"; items: CalendarItem[] }> {
  const [yearStr, monthStr] = month.split("-");
  const y = Number.parseInt(yearStr, 10);
  const m = Number.parseInt(monthStr, 10);
  const lastDay = new Date(y, m, 0).getDate();
  const startSec = Math.floor(Date.UTC(y, m - 1, 1, 0, 0, 0) / 1000);
  const endSec = Math.floor(Date.UTC(y, m - 1, lastDay, 23, 59, 59) / 1000);

  const fields =
    "fields date, date_format, platform, game.name, game.summary, game.cover.url, game.genres.name, game.hypes, game.total_rating_count;";
  const bodyDay = `${fields} where date >= ${startSec} & date <= ${endSec} & date_format = 0 & game.cover != null; sort date asc; limit 500;`;
  const bodyMonth = `${fields} where date >= ${startSec} & date <= ${endSec} & date_format = 1 & game.cover != null; sort date asc; limit 500;`;

  const [dayData, monthData] = await Promise.all([
    igdbFetch("/release_dates", bodyDay, {
      next: { revalidate: revalidateSeconds },
    }) as Promise<IgdbReleaseDateItem[]>,
    igdbFetch("/release_dates", bodyMonth, {
      next: { revalidate: revalidateSeconds },
    }) as Promise<IgdbReleaseDateItem[]>,
  ]);

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
        const hypesDiff = (b.game.hypes ?? 0) - (a.game.hypes ?? 0);
        if (hypesDiff !== 0) return hypesDiff;
      }
      return (b.game.total_rating_count ?? 0) - (a.game.total_rating_count ?? 0);
    });

    return unique.slice(0, limitCount).map((item) => {
      const dateObj = new Date(item.date * 1000);
      const genres = Array.isArray(item.game.genres)
        ? item.game.genres.map((g) => g.name).filter(Boolean)
        : [];
      return {
        externalId: `igdb:${item.game.id}`,
        mediaType: "game",
        title: item.game.name,
        releaseDate: precision === "day" ? dateObj.toISOString().split("T")[0] : null,
        datePrecision: precision,
        releaseYear: dateObj.getUTCFullYear(),
        posterUrl: getIgdbCoverUrl(item.game.cover?.url, "cover_big"),
        summary: item.game.summary || null,
        genres,
        popularity: (item.game.hypes ?? 0) * 10 + (item.game.total_rating_count ?? 0),
      };
    });
  };

  const gameLimit = depth === "top" ? 40 : 120;
  const dayItems = dedupeAndSort(Array.isArray(dayData) ? dayData : [], "day", gameLimit);
  const monthItems = dedupeAndSort(Array.isArray(monthData) ? monthData : [], "month", gameLimit);

  return { source: "games", items: [...dayItems, ...monthItems] };
}

/**
 * Fetches and aggregates monthly releases across TMDB (Movies, TV) and IGDB (Games).
 */
export async function fetchMonthlyCalendarReleases(params: {
  month: string;
  type: "all" | "movie" | "tv" | "game";
  lang: string;
  depth: "top" | "all";
}): Promise<{ response: CalendarApiResponse; revalidateSeconds: number; allFailed: boolean }> {
  const { month, type, lang, depth } = params;

  const now = new Date();
  const currentYm = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const isPastMonth = month < currentYm;
  const isFutureMonth = month > currentYm;
  const revalidateSeconds = isPastMonth ? 86400 : 3600;

  const { start: monthStart, end: monthEnd } = monthRange(month);
  const langParam = lang !== "all" ? `&with_original_language=${encodeURIComponent(lang)}` : "";

  const isLanguageAllowedForGames = lang === "all" || lang === "en";
  const shouldFetchGames = (type === "all" || type === "game") && isLanguageAllowedForGames;
  const gamesSkipped = (type === "all" || type === "game") && !isLanguageAllowedForGames;

  const taskMeta: Array<{
    name: "movies" | "tv" | "games";
    promise: Promise<{ source: string; items: CalendarItem[] }>;
  }> = [];

  if (type === "all" || type === "movie") {
    taskMeta.push({
      name: "movies",
      promise: fetchTmdbMonthlyReleases(
        "movie",
        monthStart,
        monthEnd,
        langParam,
        depth === "top" ? 2 : 5,
        revalidateSeconds,
      ),
    });
  }

  if (type === "all" || type === "tv") {
    taskMeta.push({
      name: "tv",
      promise: fetchTmdbMonthlyReleases(
        "tv",
        monthStart,
        monthEnd,
        langParam,
        depth === "top" ? 1 : 3,
        revalidateSeconds,
      ),
    });
  }

  if (shouldFetchGames) {
    taskMeta.push({
      name: "games",
      promise: fetchIgdbMonthlyReleases(month, depth, isFutureMonth, revalidateSeconds),
    });
  }

  const settled = await Promise.allSettled(taskMeta.map((t) => t.promise));
  const failedSources: string[] = [];
  const allItems: CalendarItem[] = [];

  for (let i = 0; i < settled.length; i++) {
    const res = settled[i];
    if (res.status === "fulfilled") {
      allItems.push(...res.value.items);
    } else {
      console.error("Calendar source failed:", res.reason);
      failedSources.push(taskMeta[i].name);
    }
  }

  const allFailed = taskMeta.length > 0 && failedSources.length === taskMeta.length;

  const uniqueItemsMap = new Map<string, CalendarItem>();
  for (const item of allItems) {
    if (!uniqueItemsMap.has(item.externalId)) {
      uniqueItemsMap.set(item.externalId, item);
    }
  }
  const uniqueItems = Array.from(uniqueItemsMap.values());

  uniqueItems.sort((a, b) => {
    if (!a.releaseDate && !b.releaseDate) return b.popularity - a.popularity;
    if (!a.releaseDate) return 1;
    if (!b.releaseDate) return -1;
    const dateCmp = a.releaseDate.localeCompare(b.releaseDate);
    return dateCmp !== 0 ? dateCmp : b.popularity - a.popularity;
  });

  return {
    response: {
      month,
      releases: uniqueItems,
      partial: failedSources.length > 0,
      failedSources,
      gamesSkipped,
    },
    revalidateSeconds,
    allFailed,
  };
}
