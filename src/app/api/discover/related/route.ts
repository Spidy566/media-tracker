import { type NextRequest, NextResponse } from "next/server";
import type { UnifiedSearchResult } from "@/app/api/search/route";
import { requireUser } from "@/lib/auth";
import { igdbFetch } from "@/lib/igdb";
import { getIgdbCoverUrl } from "@/lib/igdb-helpers";
import { normalizePosterUrl } from "@/lib/image-url";
import { tmdbFetch } from "@/lib/tmdb";
import type { IGDBGameItem } from "@/types/igdb";
import type { TMDBResponse } from "@/types/tmdb";

export async function GET(request: NextRequest) {
  const authResult = await requireUser(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { searchParams } = request.nextUrl;
  const externalId = searchParams.get("externalId");

  if (!externalId?.trim()) {
    return NextResponse.json({ error: "Missing externalId parameter" }, { status: 400 });
  }

  const parts = externalId.split(":");
  const source = parts[0];

  try {
    if (source === "tmdb") {
      const type = parts[1] as "movie" | "tv";
      const id = parts[2];

      if (!id || !/^\d+$/.test(id)) {
        return NextResponse.json({ error: "Invalid TMDB ID" }, { status: 400 });
      }

      // Fetch /similar and /recommendations in parallel
      const [similarRes, recsRes] = await Promise.allSettled([
        tmdbFetch(`/${type}/${id}/similar`),
        tmdbFetch(`/${type}/${id}/recommendations`),
      ]);

      const seenIds = new Set<string>();
      const results: UnifiedSearchResult[] = [];

      const processList = (res: PromiseSettledResult<unknown>) => {
        if (res.status === "fulfilled" && res.value) {
          const data = res.value as TMDBResponse;
          const items = Array.isArray(data?.results) ? data.results : [];
          for (const item of items) {
            const extId = `tmdb:${type}:${item.id}`;
            if (!seenIds.has(extId) && item.poster_path) {
              seenIds.add(extId);
              const dateStr = item.release_date || item.first_air_date;
              results.push({
                externalId: extId,
                mediaType: type,
                title: item.title || item.name || "Untitled",
                releaseYear: dateStr ? parseInt(dateStr.slice(0, 4), 10) || null : null,
                posterUrl: normalizePosterUrl(
                  item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
                ),
                creator: null,
                summary: item.overview || null,
                genres: [],
              });
            }
          }
        }
      };

      processList(recsRes);
      processList(similarRes);

      // Fall back to same genre if empty
      if (results.length === 0) {
        try {
          const detailRes = (await tmdbFetch(`/${type}/${id}`)) as {
            genres?: { id: number; name: string }[];
          };
          if (detailRes?.genres && detailRes.genres.length > 0) {
            const genreId = detailRes.genres[0].id;
            const genreRes = (await tmdbFetch(
              `/discover/${type}?with_genres=${genreId}&sort_by=popularity.desc`,
            )) as TMDBResponse;
            processList({ status: "fulfilled", value: genreRes });
          }
        } catch {
          // ignore genre fallback error
        }
      }

      return NextResponse.json({ results: results.slice(0, 24) });
    }

    if (source === "igdb") {
      const id = parts[1];
      if (!id || !/^\d+$/.test(id)) {
        return NextResponse.json({ error: "Invalid IGDB ID" }, { status: 400 });
      }

      // Query game with similar_games
      const apicalypse = `where id = ${id}; fields name,genres,similar_games.id,similar_games.name,similar_games.cover.url,similar_games.first_release_date,similar_games.summary,similar_games.genres.name; limit 1;`;
      const games = await igdbFetch("/games", apicalypse);

      const game = Array.isArray(games) && games.length > 0 ? games[0] : null;
      const rawSimilar = Array.isArray(game?.similar_games) ? game.similar_games : [];

      const results: UnifiedSearchResult[] = [];
      const seenIds = new Set<string>();

      for (const sim of rawSimilar) {
        const extId = `igdb:${sim.id}`;
        if (!seenIds.has(extId) && sim.cover?.url) {
          seenIds.add(extId);
          results.push({
            externalId: extId,
            mediaType: "game",
            title: sim.name || "Untitled Game",
            releaseYear: sim.first_release_date
              ? new Date(sim.first_release_date * 1000).getUTCFullYear()
              : null,
            posterUrl: getIgdbCoverUrl(sim.cover.url, "cover_big"),
            creator: null,
            summary: sim.summary || null,
            genres: Array.isArray(sim.genres)
              ? sim.genres.map((g: { name: string }) => g.name)
              : [],
          });
        }
      }

      // If similar_games has fewer than 16 items, fetch games with matching genres to fill wall
      if (results.length < 16 && game?.genres?.length) {
        const genreIds = game.genres.slice(0, 2).join(",");
        const genreApicalypse = `where genres = (${genreIds}) & cover != null & rating_count >= 10; fields name,cover.url,first_release_date,summary,genres.name; sort rating_count desc; limit 20;`;
        try {
          const genreGames = (await igdbFetch("/games", genreApicalypse)) as IGDBGameItem[];
          if (Array.isArray(genreGames)) {
            for (const g of genreGames) {
              const extId = `igdb:${g.id}`;
              if (!seenIds.has(extId) && extId !== `igdb:${id}` && g.cover?.url) {
                seenIds.add(extId);
                results.push({
                  externalId: extId,
                  mediaType: "game",
                  title: g.name || "Untitled Game",
                  releaseYear: g.first_release_date
                    ? new Date(g.first_release_date * 1000).getUTCFullYear()
                    : null,
                  posterUrl: getIgdbCoverUrl(g.cover.url, "cover_big"),
                  creator: null,
                  summary: g.summary || null,
                  genres: Array.isArray(g.genres) ? g.genres.map((gen) => gen.name) : [],
                });
                if (results.length >= 24) break;
              }
            }
          }
        } catch {
          // ignore genre fallback errors
        }
      }

      return NextResponse.json({ results: results.slice(0, 24) });
    }

    return NextResponse.json({ error: "Unsupported media source" }, { status: 400 });
  } catch (error) {
    console.error("Related discover error:", error);
    return NextResponse.json({ error: "Failed to fetch related titles" }, { status: 500 });
  }
}
