import { desc, eq, ne } from "drizzle-orm";
import { cookies } from "next/headers";
import type { UnifiedSearchResult } from "@/app/api/search/route";
import { mediaItems, userMediaEntries, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { HOME_HIDDEN_COOKIE, parseHiddenSections } from "@/lib/home-prefs";
import { igdbFetch } from "@/lib/igdb";
import { getIgdbCoverUrl } from "@/lib/igdb-helpers";
import { ensureMediaBackdrop } from "@/lib/media-backdrop";
import { tmdbFetch } from "@/lib/tmdb";
import type { Entry } from "@/types/entry";
import type { IGDBGameItem } from "@/types/igdb";
import type { TMDBResponse } from "@/types/tmdb";
import { DashboardClient } from "./dashboard-client";

export default async function HomePage() {
  // 1. Read hidden sections preference from cookie
  const cookieStore = await cookies();
  const hiddenCookie = cookieStore.get(HOME_HIDDEN_COOKIE)?.value;
  const hiddenSections = parseHiddenSections(hiddenCookie);
  const isSquadHidden = hiddenSections.includes("squad");
  const isTrendingHidden = hiddenSections.includes("trending");

  // 2. Get current logged-in user from the secure cookie
  const currentUser = await getCurrentUser();

  // 3. Query squad members directly from Postgres
  const squadUsers = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .orderBy(users.displayName);

  // 4. Query current user's tracked entries directly from Postgres
  let userEntries: Entry[] = [];
  const heroEntries: Entry[] = [];

  if (currentUser) {
    const rawEntries = await db
      .select({
        id: userMediaEntries.id,
        status: userMediaEntries.status,
        rating: userMediaEntries.rating,
        reviewNote: userMediaEntries.reviewNote,
        updatedAt: userMediaEntries.updatedAt,
        user: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
        media: {
          id: mediaItems.id,
          externalId: mediaItems.externalId,
          mediaType: mediaItems.mediaType,
          title: mediaItems.title,
          releaseYear: mediaItems.releaseYear,
          posterUrl: mediaItems.posterUrl,
          backdropUrl: mediaItems.backdropUrl,
          summary: mediaItems.summary,
          creator: mediaItems.creator,
          genres: mediaItems.genres,
        },
      })
      .from(userMediaEntries)
      .innerJoin(users, eq(userMediaEntries.userId, users.id))
      .innerJoin(mediaItems, eq(userMediaEntries.mediaItemId, mediaItems.id))
      .where(eq(userMediaEntries.userId, currentUser.id))
      .orderBy(desc(userMediaEntries.updatedAt));

    userEntries = rawEntries.map((e) => ({
      ...e,
      updatedAt: e.updatedAt.toISOString(),
    }));

    // Hero entries: in-progress first, then queue, deduplicated, up to 5
    const doing = userEntries.filter((e) => e.status === "doing");
    const wantTo = userEntries.filter((e) => e.status === "want_to");
    const seenMediaIds = new Set<string>();

    for (const entry of [...doing, ...wantTo]) {
      if (!seenMediaIds.has(entry.media.externalId)) {
        seenMediaIds.add(entry.media.externalId);
        heroEntries.push(entry);
        if (heroEntries.length >= 5) break;
      }
    }

    const backdrops = await Promise.all(
      heroEntries.map((candidate) => ensureMediaBackdrop(candidate.media)),
    );

    heroEntries.forEach((candidate, idx) => {
      const resolved = backdrops[idx];
      if (resolved && !candidate.media.backdropUrl) {
        candidate.media.backdropUrl = resolved;
      }
    });
  }

  // 5. Query squad activity: skipped if squad section is hidden
  let squadActivity: Entry[] = [];

  if (!isSquadHidden) {
    const squadCondition = currentUser ? ne(userMediaEntries.userId, currentUser.id) : undefined;

    const rawSquadActivity = await db
      .select({
        id: userMediaEntries.id,
        status: userMediaEntries.status,
        rating: userMediaEntries.rating,
        reviewNote: userMediaEntries.reviewNote,
        updatedAt: userMediaEntries.updatedAt,
        user: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
        media: {
          id: mediaItems.id,
          externalId: mediaItems.externalId,
          mediaType: mediaItems.mediaType,
          title: mediaItems.title,
          releaseYear: mediaItems.releaseYear,
          posterUrl: mediaItems.posterUrl,
          backdropUrl: mediaItems.backdropUrl,
          summary: mediaItems.summary,
          creator: mediaItems.creator,
          genres: mediaItems.genres,
        },
      })
      .from(userMediaEntries)
      .innerJoin(users, eq(userMediaEntries.userId, users.id))
      .innerJoin(mediaItems, eq(userMediaEntries.mediaItemId, mediaItems.id))
      .where(squadCondition)
      .orderBy(desc(userMediaEntries.updatedAt))
      .limit(8);

    squadActivity = rawSquadActivity.map((e) => ({
      ...e,
      updatedAt: e.updatedAt.toISOString(),
    }));
  }

  // 6. Fetch trending Movies, TV, and Games: skipped if trending section is hidden
  let trendingMovies: UnifiedSearchResult[] = [];
  let trendingTv: UnifiedSearchResult[] = [];
  let trendingGames: UnifiedSearchResult[] = [];

  if (!isTrendingHidden) {
    const fetchTrendingMovies = async (): Promise<UnifiedSearchResult[]> => {
      try {
        const data: TMDBResponse = await tmdbFetch("/trending/movie/week");
        if (!data?.results) return [];
        return data.results.slice(0, 10).map((item) => ({
          externalId: `tmdb:movie:${item.id}`,
          mediaType: "movie",
          title: item.title || "Untitled",
          releaseYear: item.release_date ? parseInt(item.release_date.slice(0, 4), 10) : null,
          posterUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
          creator: null,
          summary: item.overview || null,
          genres: [],
        }));
      } catch (error) {
        console.error("Failed to fetch trending movies:", error);
        return [];
      }
    };

    const fetchTrendingTv = async (): Promise<UnifiedSearchResult[]> => {
      try {
        const data: TMDBResponse = await tmdbFetch("/trending/tv/week");
        if (!data?.results) return [];
        return data.results.slice(0, 10).map((item) => ({
          externalId: `tmdb:tv:${item.id}`,
          mediaType: "tv",
          title: item.name || "Untitled",
          releaseYear: item.first_air_date ? parseInt(item.first_air_date.slice(0, 4), 10) : null,
          posterUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
          creator: null,
          summary: item.overview || null,
          genres: [],
        }));
      } catch (error) {
        console.error("Failed to fetch trending TV:", error);
        return [];
      }
    };

    const fetchTrendingGames = async (): Promise<UnifiedSearchResult[]> => {
      try {
        const now = Math.floor(Date.now() / 1000);
        const conditions = [
          "cover != null",
          "cover.url != null",
          `first_release_date <= ${now}`,
          "rating_count != null",
        ];
        const apicalypse = `fields name,cover.url,first_release_date,summary,genres.name,rating; where ${conditions.join(" & ")}; sort rating_count desc; limit 10; offset 0;`;
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
        console.error("Failed to fetch trending games:", error);
        return [];
      }
    };

    [trendingMovies, trendingTv, trendingGames] = await Promise.all([
      fetchTrendingMovies(),
      fetchTrendingTv(),
      fetchTrendingGames(),
    ]);
  }

  return (
    <DashboardClient
      currentUser={currentUser}
      users={squadUsers}
      initialEntries={userEntries}
      heroEntries={heroEntries}
      squadActivity={squadActivity}
      trendingMovies={trendingMovies}
      trendingTv={trendingTv}
      trendingGames={trendingGames}
      hiddenSections={hiddenSections}
    />
  );
}
