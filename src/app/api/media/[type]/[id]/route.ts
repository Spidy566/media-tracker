import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { mediaItems, userMediaEntries, users } from "@/db/schema";
import { db } from "@/lib/db";
import { igdbFetch } from "@/lib/igdb";
import { getIgdbCoverUrl } from "@/lib/igdb-helpers";
import { tmdbFetch } from "@/lib/tmdb";
import type { IGDBGameItem } from "@/types/igdb";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> },
) {
  const { type, id } = await params;
  const externalId = type === "game" ? `igdb:${id}` : `tmdb:${type}:${id}`;

  try {
    // 1. Fetch squad tracking activity for this title from database
    const [savedItem] = await db
      .select()
      .from(mediaItems)
      .where(eq(mediaItems.externalId, externalId))
      .limit(1);

    let squadEntries: {
      id: string;
      status: string;
      rating: number | null;
      reviewNote: string | null;
      updatedAt: Date;
      user: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl: string | null;
      };
    }[] = [];

    if (savedItem) {
      squadEntries = await db
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
        })
        .from(userMediaEntries)
        .innerJoin(users, eq(userMediaEntries.userId, users.id))
        .where(eq(userMediaEntries.mediaItemId, savedItem.id));
    }

    // 2. Fetch rich metadata from external API (TMDB or IGDB)
    if (type === "movie" || type === "tv") {
      const tmdbData = await tmdbFetch(`/${type}/${id}?append_to_response=videos,credits`);

      const trailer = tmdbData.videos?.results?.find(
        (v: { site: string; type: string; key: string }) =>
          v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser"),
      );

      const director =
        tmdbData.credits?.crew?.find((c: { job: string; name: string }) => c.job === "Director")
          ?.name ||
        tmdbData.created_by?.[0]?.name ||
        null;

      return NextResponse.json({
        externalId,
        mediaType: type,
        title: tmdbData.title || tmdbData.name || "Untitled",
        releaseYear:
          tmdbData.release_date || tmdbData.first_air_date
            ? new Date(tmdbData.release_date || tmdbData.first_air_date).getFullYear()
            : null,
        posterUrl: tmdbData.poster_path
          ? `https://image.tmdb.org/t/p/w780${tmdbData.poster_path}`
          : null,
        backdropUrl: tmdbData.backdrop_path
          ? `https://image.tmdb.org/t/p/w1280${tmdbData.backdrop_path}`
          : null,
        summary: tmdbData.overview || null,
        genres: tmdbData.genres?.map((g: { name: string }) => g.name) || [],
        creator: director,
        trailerUrl: trailer?.key ? `https://www.youtube.com/embed/${trailer.key}` : null,
        squadEntries,
      });
    }

    // IGDB Games
    const apicalypse = `where id = ${id}; fields name,summary,storyline,cover.url,screenshots.url,videos.video_id,first_release_date,genres.name,involved_companies.company.name; limit 1;`;
    const [game]: IGDBGameItem[] = await igdbFetch("/games", apicalypse);

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    const screenshots = (game as { screenshots?: { url: string }[] }).screenshots;
    const backdropUrl = screenshots?.[0]?.url
      ? `https:${screenshots[0].url.replace("t_thumb", "t_1080p")}`
      : null;

    const videos = (game as { videos?: { video_id: string }[] }).videos;
    const trailerUrl = videos?.[0]?.video_id
      ? `https://www.youtube.com/embed/${videos[0].video_id}`
      : null;

    return NextResponse.json({
      externalId,
      mediaType: "game",
      title: game.name,
      releaseYear: game.first_release_date
        ? new Date(game.first_release_date * 1000).getFullYear()
        : null,
      posterUrl: getIgdbCoverUrl(game.cover?.url, "cover_big"),
      backdropUrl,
      summary: game.summary || null,
      genres: game.genres?.map((g) => g.name) || [],
      creator: game.involved_companies?.[0]?.company?.name || null,
      trailerUrl,
      squadEntries,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch media details";
    console.error("Media details error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
