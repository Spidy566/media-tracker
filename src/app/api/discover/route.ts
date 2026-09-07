import { NextRequest, NextResponse } from "next/server";
import { tmdbFetch } from "@/lib/tmdb";
import { igdbFetch } from "@/lib/igdb";
import { getIgdbCoverUrl } from "@/lib/igdb-helpers";
import type { UnifiedSearchResult } from "@/app/api/search/route";

// Real Genre IDs for TMDB & IGDB
export const GENRE_MAP: Record<string, { tmdbMovie?: number; tmdbTv?: number; igdb?: number }> = {
  Action: { tmdbMovie: 28, tmdbTv: 10759, igdb: 4 },
  Adventure: { tmdbMovie: 12, tmdbTv: 10759, igdb: 31 },
  Animation: { tmdbMovie: 16, tmdbTv: 16, igdb: 32 },
  Comedy: { tmdbMovie: 35, tmdbTv: 35, igdb: 9 },
  Crime: { tmdbMovie: 80, tmdbTv: 80, igdb: 10 },
  Horror: { tmdbMovie: 27, tmdbTv: 9648, igdb: 19 },
  "Sci-Fi": { tmdbMovie: 878, tmdbTv: 10765, igdb: 18 },
  RPG: { igdb: 12 },
  Shooter: { igdb: 5 },
  Strategy: { igdb: 15 },
};

function parseReleaseYear(dateStr?: string | null): number | null {
  if (!dateStr || typeof dateStr !== "string" || dateStr.trim().length === 0) return null;
  const year = parseInt(dateStr.slice(0, 4), 10);
  return isNaN(year) ? null : year;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const type = (searchParams.get("type") || "game") as "movie" | "tv" | "game";
  const sort = searchParams.get("sort") || "popular"; // popular, top_rated, upcoming
  const genre = searchParams.get("genre");
  const year = searchParams.get("year");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));

  try {
    if (type === "movie" || type === "tv") {
      return await fetchTmdbDiscover(type, sort, genre, year, page);
    } else {
      return await fetchIgdbDiscover(sort, genre, year, page);
    }
  } catch (error: any) {
    console.error("Discover API error:", error?.message || error);
    return NextResponse.json(
      { error: "Failed to load titles. Check API keys and network." },
      { status: 500 }
    );
  }
}

// -------------------------------------------------------------
// TMDB Discover (Movies & TV)
// -------------------------------------------------------------
async function fetchTmdbDiscover(
  type: "movie" | "tv",
  sort: string,
  genre: string | null,
  year: string | null,
  page: number
) {
  let sortBy = "popularity.desc";
  let extraFilters = "";

  const today = new Date().toISOString().split("T")[0];

  if (sort === "top_rated") {
    sortBy = "vote_average.desc";
    extraFilters += "&vote_count.gte=200";
  } else if (sort === "upcoming") {
    sortBy = type === "movie" ? "primary_release_date.asc" : "first_air_date.asc";
    extraFilters += type === "movie" 
      ? `&primary_release_date.gte=${today}&vote_count.gte=0` 
      : `&first_air_date.gte=${today}&vote_count.gte=0`;
  }

  // Map genre name to TMDB ID
  if (genre && GENRE_MAP[genre]) {
    const genreId = type === "movie" ? GENRE_MAP[genre].tmdbMovie : GENRE_MAP[genre].tmdbTv;
    if (genreId) extraFilters += `&with_genres=${genreId}`;
  }

  if (year && /^\d{4}$/.test(year)) {
    extraFilters += type === "movie" 
      ? `&primary_release_year=${year}` 
      : `&first_air_date_year=${year}`;
  }

  const endpoint = `/discover/${type}?sort_by=${sortBy}&page=${Math.min(page, 500)}&include_adult=false${extraFilters}`;
  const data = await tmdbFetch(endpoint);

  const rawResults = Array.isArray(data?.results) ? data.results : [];

  const results: UnifiedSearchResult[] = rawResults.map((item: any) => ({
    externalId: `tmdb:${type}:${item.id}`,
    mediaType: type,
    title: item.title || item.name || "Untitled",
    releaseYear: parseReleaseYear(item.release_date || item.first_air_date),
    posterUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
    creator: null,
    summary: item.overview || null,
    genres: [],
  }));

  return NextResponse.json({
    results,
    page: data?.page || 1,
    totalPages: Math.min(data?.total_pages || 1, 500),
    totalResults: data?.total_results || 0,
  });
}

// -------------------------------------------------------------
// IGDB Discover (Games)
// -------------------------------------------------------------
async function fetchIgdbDiscover(
  sort: string,
  genre: string | null,
  year: string | null,
  page: number
) {
  const limit = 24;
  const offset = (page - 1) * limit;
  const now = Math.floor(Date.now() / 1000);

  // Conditions that prevent IGDB 400 errors
  const conditions: string[] = ["cover != null", "cover.url != null"];

  let sortClause = "sort rating_count desc;";

  if (sort === "top_rated") {
    conditions.push("rating != null", "rating_count >= 15");
    sortClause = "sort rating desc;";
  } else if (sort === "upcoming") {
    conditions.push(`first_release_date > ${now}`);
    sortClause = "sort first_release_date asc;";
  } else {
    // Popular / Trending
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

  const games = await igdbFetch("/games", apicalypse);

  const rawGames = Array.isArray(games) ? games : [];

  const results: UnifiedSearchResult[] = rawGames.map((g: any) => ({
    externalId: `igdb:${g.id}`,
    mediaType: "game",
    title: g.name || "Untitled Game",
    releaseYear: g.first_release_date ? new Date(g.first_release_date * 1000).getFullYear() : null,
    posterUrl: getIgdbCoverUrl(g.cover?.url, "cover_big"),
    creator: null,
    summary: g.summary || null,
    genres: Array.isArray(g.genres) ? g.genres.map((gen: any) => gen.name) : [],
  }));

  return NextResponse.json({
    results,
    page,
    totalPages: 50,
    totalResults: 1200,
  });
}