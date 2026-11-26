import { type NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { GENRE_MAP } from "@/lib/genres";
import { igdbFetch } from "@/lib/igdb";
import { mapIgdbGameToSearchResult, mapTmdbItemToSearchResult } from "@/lib/media-discover";
import { tmdbFetch } from "@/lib/tmdb";
import type { IGDBGameItem } from "@/types/igdb";
import type { UnifiedSearchResult } from "@/types/search";
import type { TMDBResponse } from "@/types/tmdb";

export { GENRE_MAP };

export async function GET(request: NextRequest) {
  const authResult = await requireUser(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { searchParams } = request.nextUrl;
  const type = (searchParams.get("type") || "game") as "movie" | "tv" | "game";
  const sort = searchParams.get("sort") || "popular";
  const genre = searchParams.get("genre");
  const year = searchParams.get("year");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));

  if (genre) {
    const isMismatch =
      (type === "movie" && !GENRE_MAP[genre]?.tmdbMovie) ||
      (type === "tv" && !GENRE_MAP[genre]?.tmdbTv) ||
      (type === "game" && !GENRE_MAP[genre]?.igdb);
    if (isMismatch) {
      return NextResponse.json(
        { error: `Invalid genre "${genre}" for type "${type}"` },
        { status: 400 },
      );
    }
  }

  try {
    if (type === "movie" || type === "tv") {
      return await fetchTmdbDiscover(type, sort, genre, year, page);
    }
    return await fetchIgdbDiscover(sort, genre, year, page);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load titles";
    console.error("Discover API error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function fetchTmdbDiscover(
  type: "movie" | "tv",
  sort: string,
  genre: string | null,
  year: string | null,
  page: number,
) {
  let sortBy = "popularity.desc";
  let extraFilters = "";
  const today = new Date().toISOString().split("T")[0];

  if (sort === "top_rated") {
    sortBy = "vote_average.desc";
    extraFilters += "&vote_count.gte=200";
  } else if (sort === "upcoming") {
    sortBy = type === "movie" ? "primary_release_date.asc" : "first_air_date.asc";
    extraFilters +=
      type === "movie"
        ? `&primary_release_date.gte=${today}&vote_count.gte=0`
        : `&first_air_date.gte=${today}&vote_count.gte=0`;
  }

  if (genre && GENRE_MAP[genre]) {
    const genreId = type === "movie" ? GENRE_MAP[genre].tmdbMovie : GENRE_MAP[genre].tmdbTv;
    if (genreId) extraFilters += `&with_genres=${genreId}`;
  }

  if (year && /^\d{4}$/.test(year)) {
    extraFilters +=
      type === "movie" ? `&primary_release_year=${year}` : `&first_air_date_year=${year}`;
  }

  const endpoint = `/discover/${type}?sort_by=${sortBy}&page=${Math.min(page, 500)}&include_adult=false${extraFilters}`;
  const data: TMDBResponse = await tmdbFetch(endpoint);
  const rawResults = Array.isArray(data?.results) ? data.results : [];

  const results: UnifiedSearchResult[] = rawResults.map((item) =>
    mapTmdbItemToSearchResult(item, type),
  );

  return NextResponse.json({
    results,
    page: data.page || 1,
    totalPages: Math.min(data.total_pages || 1, 500),
    totalResults: data.total_results || 0,
  });
}

async function fetchIgdbDiscover(
  sort: string,
  genre: string | null,
  year: string | null,
  page: number,
) {
  const limit = 24;
  const offset = (page - 1) * limit;
  const now = Math.floor(Date.now() / 1000);
  const conditions: string[] = ["cover != null", "cover.url != null"];

  let sortClause = "sort rating_count desc;";

  if (sort === "top_rated") {
    conditions.push("rating != null", "rating_count >= 15");
    sortClause = "sort rating desc;";
  } else if (sort === "upcoming") {
    conditions.push(`first_release_date > ${now}`);
    sortClause = "sort first_release_date asc;";
  } else {
    conditions.push(`first_release_date <= ${now}`, "rating_count != null");
    sortClause = "sort rating_count desc;";
  }

  if (genre && GENRE_MAP[genre]?.igdb) {
    conditions.push(`genres = (${GENRE_MAP[genre].igdb})`);
  }

  if (year && /^\d{4}$/.test(year)) {
    const startYear = Math.floor(new Date(`${year}-01-01T00:00:00Z`).getTime() / 1000);
    const endYear = Math.floor(new Date(`${year}-12-31T23:59:59Z`).getTime() / 1000);
    conditions.push(`first_release_date >= ${startYear}`, `first_release_date <= ${endYear}`);
  }

  const whereClause = `where ${conditions.join(" & ")};`;
  const apicalypse = `fields name,cover.url,first_release_date,summary,genres.name,rating; ${whereClause} ${sortClause} limit ${limit}; offset ${offset};`;

  const [games, countRes] = await Promise.all([
    igdbFetch("/games", apicalypse) as Promise<IGDBGameItem[]>,
    igdbFetch("/games/count", whereClause) as Promise<{ count: number }>,
  ]);
  const rawGames: IGDBGameItem[] = Array.isArray(games) ? games : [];
  const totalCount =
    countRes?.count && typeof countRes.count === "number" ? countRes.count : rawGames.length;
  const totalPages = Math.min(50, Math.max(1, Math.ceil(totalCount / limit)));

  const results: UnifiedSearchResult[] = rawGames.map(mapIgdbGameToSearchResult);

  return NextResponse.json({
    results,
    page,
    totalPages,
    totalResults: totalCount,
  });
}
