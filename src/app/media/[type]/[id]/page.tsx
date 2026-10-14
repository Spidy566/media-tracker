import { eq } from "drizzle-orm";
import { Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PosterImage } from "@/components/poster-image";
import { mediaItems, userMediaEntries, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { igdbFetch } from "@/lib/igdb";
import { getIgdbCoverUrl, selectIgdbBackdrop } from "@/lib/igdb-helpers";
import { selectTmdbBackdrop, selectTmdbTrailer, tmdbFetch } from "@/lib/tmdb";
import { getHeroTitleSizeClass } from "@/lib/typography";
import { cn } from "@/lib/utils";
import type { Entry } from "@/types/entry";
import type { IGDBGameItem } from "@/types/igdb";
import { MediaDetailBanner } from "./media-detail-banner";
import { MediaLogCard } from "./media-log-card";
import { TrailerEmbed } from "./trailer-embed";

export default async function MediaDetailPage({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}) {
  const { type, id } = await params;

  if (type !== "movie" && type !== "tv" && type !== "game") {
    notFound();
  }
  if (!/^\d+$/.test(id)) {
    notFound();
  }

  const externalId = type === "game" ? `igdb:${id}` : `tmdb:${type}:${id}`;
  const currentUser = await getCurrentUser();

  // 1. Fetch metadata from TMDB or IGDB
  let title = "Untitled";
  let releaseYear: number | null = null;
  let posterUrl: string | null = null;
  let backdropUrl: string | null = null;
  let summary: string | null = null;
  let genres: string[] = [];
  let creator: string | null = null;
  let trailerUrl: string | null = null;

  try {
    if (type === "movie" || type === "tv") {
      const tmdbData = await tmdbFetch(
        `/${type}/${id}?append_to_response=videos,credits,images&include_image_language=en,null`,
      );
      title = tmdbData.title || tmdbData.name || "Untitled";
      const dateStr = tmdbData.release_date || tmdbData.first_air_date;
      releaseYear = dateStr ? new Date(dateStr).getFullYear() : null;
      posterUrl = tmdbData.poster_path
        ? `https://image.tmdb.org/t/p/w780${tmdbData.poster_path}`
        : null;
      backdropUrl = selectTmdbBackdrop(tmdbData.images, tmdbData.backdrop_path);
      summary = tmdbData.overview || null;
      genres = tmdbData.genres?.map((g: { name: string }) => g.name) || [];

      const director =
        tmdbData.credits?.crew?.find((c: { job: string; name: string }) => c.job === "Director")
          ?.name ||
        tmdbData.created_by?.[0]?.name ||
        null;
      creator = director;

      trailerUrl = selectTmdbTrailer(tmdbData.videos?.results);
    } else {
      const apicalypse = `where id = ${id}; fields name,summary,cover.url,artworks.url,artworks.width,artworks.height,screenshots.url,screenshots.width,screenshots.height,videos.video_id,first_release_date,genres.name,involved_companies.company.name; limit 1;`;
      const [game]: IGDBGameItem[] = await igdbFetch("/games", apicalypse);

      if (!game) notFound();

      title = game.name;
      releaseYear = game.first_release_date
        ? new Date(game.first_release_date * 1000).getFullYear()
        : null;
      posterUrl = getIgdbCoverUrl(game.cover?.url, "cover_big");
      const artworks = (game as { artworks?: { url?: string; width?: number; height?: number }[] })
        .artworks;
      const screenshots = (
        game as { screenshots?: { url?: string; width?: number; height?: number }[] }
      ).screenshots;
      backdropUrl = await selectIgdbBackdrop(artworks, screenshots);

      if (id === "119133") {
        console.log(`[Elden Ring Backdrop] Selected URL: ${backdropUrl}`);
        if (backdropUrl) {
          try {
            const headRes = await fetch(backdropUrl, { method: "HEAD" });
            console.log(
              `[Elden Ring Backdrop] HTTP status: ${headRes.status}, Content-Length: ${headRes.headers.get("content-length")}, Content-Type: ${headRes.headers.get("content-type")}`,
            );
          } catch (headErr) {
            console.error("[Elden Ring Backdrop] Failed to check backdrop:", headErr);
          }
        }
      }
      summary = game.summary || null;
      genres = game.genres?.map((g) => g.name) || [];
      creator = game.involved_companies?.[0]?.company?.name || null;

      const videos = (game as { videos?: { video_id: string }[] }).videos;
      trailerUrl = videos?.[0]?.video_id
        ? `https://www.youtube.com/embed/${videos[0].video_id}`
        : null;
    }
  } catch (err) {
    console.error("Failed to fetch media details:", err);
    notFound();
  }

  // 2. Fetch squad activity from database
  const [savedItem] = await db
    .select()
    .from(mediaItems)
    .where(eq(mediaItems.externalId, externalId))
    .limit(1);

  // Keep home and detail in sync: update stored value if live backdrop differs
  if (savedItem && backdropUrl && savedItem.backdropUrl !== backdropUrl) {
    try {
      db.update(mediaItems)
        .set({ backdropUrl })
        .where(eq(mediaItems.id, savedItem.id))
        .catch((err) => console.warn("Failed to persist backdropUrl:", err));
    } catch (err) {
      console.warn("Failed to trigger backdrop update:", err);
    }
  }

  let squadEntries: Entry[] = [];
  if (savedItem) {
    const rawSquad = await db
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
          creator: mediaItems.creator,
          genres: mediaItems.genres,
        },
      })
      .from(userMediaEntries)
      .innerJoin(users, eq(userMediaEntries.userId, users.id))
      .innerJoin(mediaItems, eq(userMediaEntries.mediaItemId, mediaItems.id))
      .where(eq(userMediaEntries.mediaItemId, savedItem.id));

    squadEntries = rawSquad.map((e) => ({
      ...e,
      updatedAt: e.updatedAt.toISOString(),
    }));
  }

  const myEntry = squadEntries.find((e) => e.user.id === currentUser?.id) || null;

  const mediaData = {
    id: savedItem?.id || externalId,
    externalId,
    mediaType: type as "movie" | "tv" | "game",
    title,
    releaseYear,
    posterUrl,
    backdropUrl,
    creator,
    summary,
    genres,
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <MediaDetailBanner backdropUrl={backdropUrl} posterUrl={posterUrl} title={title}>
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Left: Poster & Interactive Log Card */}
          <div className="w-56 sm:w-64 shrink-0 mx-auto lg:mx-0 space-y-4">
            <div className="relative aspect-2/3 w-full rounded-2xl overflow-hidden bg-muted border border-border shadow-xl">
              <PosterImage
                src={posterUrl}
                title={title}
                mediaType={type}
                priority
                className="object-cover"
              />
            </div>

            <MediaLogCard media={mediaData} initialEntry={myEntry} />
          </div>

          {/* Right: Details & Squad Activity */}
          <div className="flex-1 space-y-8 min-w-0">
            <div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
                <span>{releaseYear || "TBA"}</span>
                <span>•</span>
                <span className="capitalize text-muted-foreground">
                  {type === "tv" ? "TV series" : type}
                </span>
                {creator && (
                  <>
                    <span>•</span>
                    <span className="text-foreground font-medium">{creator}</span>
                  </>
                )}
              </div>

              <h1
                className={cn(
                  "font-display leading-[1.02] text-balance max-w-3xl text-foreground",
                  getHeroTitleSizeClass(title),
                )}
              >
                {title}
              </h1>

              <div className="flex flex-wrap gap-1.5 mt-2">
                {genres.map((g) => (
                  <span
                    key={g}
                    className="text-xs font-medium px-3 py-1 rounded-full bg-card border border-border text-muted-foreground"
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>

            {summary && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground">Synopsis</h3>
                <p className="text-sm leading-relaxed text-muted-foreground max-w-2xl">{summary}</p>
              </div>
            )}

            {/* Squad Activity */}
            <div className="space-y-4 bg-card border border-border rounded-2xl p-6 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                    Squad activity
                  </h3>
                </div>
                <span className="text-xs text-muted-foreground">{squadEntries.length} logged</span>
              </div>

              {squadEntries.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No one in the squad has logged this title yet. Be the first!
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {squadEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-3.5 rounded-lg bg-background border border-border space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/squad/${entry.user.username}`}
                          className="flex items-center gap-2 hover:opacity-80 transition"
                        >
                          <div className="w-7 h-7 rounded-full bg-foreground text-background flex items-center justify-center font-semibold text-xs">
                            {entry.user.displayName[0]}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-foreground block">
                              {entry.user.displayName}
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span
                                className={cn(
                                  "size-1.5 rounded-full shrink-0",
                                  entry.status === "want_to"
                                    ? "bg-status-queue"
                                    : entry.status === "doing"
                                      ? "bg-status-doing"
                                      : "bg-status-done",
                                )}
                              />
                              <span>
                                {entry.status === "want_to"
                                  ? "Queued"
                                  : entry.status === "doing"
                                    ? "Started"
                                    : "Finished"}
                              </span>
                            </span>
                          </div>
                        </Link>

                        {entry.rating && (
                          <span className="text-xs font-semibold text-rating bg-card px-2 py-0.5 rounded-full border border-border shadow-xs">
                            ★ <span className="font-mono">{entry.rating} / 5</span>
                          </span>
                        )}
                      </div>

                      {entry.reviewNote && (
                        <p className="text-xs text-foreground/90 italic p-2.5 rounded-md bg-card border border-border leading-relaxed">
                          &ldquo;{entry.reviewNote}&rdquo;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {trailerUrl && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Trailer
                </h3>
                <TrailerEmbed trailerUrl={trailerUrl} title={title} />
              </div>
            )}
          </div>
        </div>
      </MediaDetailBanner>
    </div>
  );
}
