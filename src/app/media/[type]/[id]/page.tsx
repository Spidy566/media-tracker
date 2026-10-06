import { eq } from "drizzle-orm";
import { ArrowLeft, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { mediaItems, userMediaEntries, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { igdbFetch } from "@/lib/igdb";
import { getIgdbCoverUrl } from "@/lib/igdb-helpers";
import { tmdbFetch } from "@/lib/tmdb";
import type { Entry } from "@/types/entry";
import type { IGDBGameItem } from "@/types/igdb";
import { MediaLogCard } from "./media-log-card";

const isStealthMode = process.env.NEXT_PUBLIC_STEALTH_MODE === "true";

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
      const tmdbData = await tmdbFetch(`/${type}/${id}?append_to_response=videos,credits`);
      title = tmdbData.title || tmdbData.name || "Untitled";
      const dateStr = tmdbData.release_date || tmdbData.first_air_date;
      releaseYear = dateStr ? new Date(dateStr).getFullYear() : null;
      posterUrl = tmdbData.poster_path
        ? `https://image.tmdb.org/t/p/w780${tmdbData.poster_path}`
        : null;
      backdropUrl = tmdbData.backdrop_path
        ? `https://image.tmdb.org/t/p/w1280${tmdbData.backdrop_path}`
        : null;
      summary = tmdbData.overview || null;
      genres = tmdbData.genres?.map((g: { name: string }) => g.name) || [];

      const director =
        tmdbData.credits?.crew?.find((c: { job: string; name: string }) => c.job === "Director")
          ?.name ||
        tmdbData.created_by?.[0]?.name ||
        null;
      creator = director;

      const trailer = tmdbData.videos?.results?.find(
        (v: { site: string; type: string; key: string }) =>
          v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser"),
      );
      trailerUrl = trailer?.key ? `https://www.youtube.com/embed/${trailer.key}` : null;
    } else {
      const apicalypse = `where id = ${id}; fields name,summary,cover.url,screenshots.url,videos.video_id,first_release_date,genres.name,involved_companies.company.name; limit 1;`;
      const [game]: IGDBGameItem[] = await igdbFetch("/games", apicalypse);

      if (!game) notFound();

      title = game.name;
      releaseYear = game.first_release_date
        ? new Date(game.first_release_date * 1000).getFullYear()
        : null;
      posterUrl = getIgdbCoverUrl(game.cover?.url, "cover_big");
      const screenshots = (game as { screenshots?: { url: string }[] }).screenshots;
      backdropUrl = screenshots?.[0]?.url
        ? `https:${screenshots[0].url.replace("t_thumb", "t_1080p")}`
        : null;
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
    creator,
    summary,
    genres,
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* 1. Backdrop */}
      <div className="relative w-full h-64 sm:h-96 overflow-hidden bg-muted border-b border-border">
        {backdropUrl && !isStealthMode ? (
          <Image
            src={backdropUrl}
            alt={title}
            fill
            priority
            className="object-cover object-top opacity-30 dark:opacity-40"
          />
        ) : null}
        <div className="absolute inset-0 bg-linear-to-t from-background via-background/70 to-transparent" />

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8 pt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-card/80 hover:bg-muted text-xs font-bold text-foreground backdrop-blur-md border border-border transition shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </Link>
        </div>
      </div>

      {/* 2. Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-8 -mt-28 sm:-mt-36 relative z-10">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Left: Poster & Interactive Log Card */}
          <div className="w-56 sm:w-64 shrink-0 mx-auto md:mx-0 space-y-4">
            <div className="relative aspect-2/3 w-full rounded-3xl overflow-hidden bg-muted border border-border shadow-2xl">
              {posterUrl && !isStealthMode ? (
                <Image src={posterUrl} alt={title} fill priority className="object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                  <span className="font-bold text-xs text-muted-foreground uppercase tracking-wider font-mono">
                    No Poster Art
                  </span>
                </div>
              )}
            </div>

            <MediaLogCard media={mediaData} initialEntry={myEntry} />
          </div>

          {/* Right: Details & Squad Activity */}
          <div className="flex-1 space-y-8 min-w-0">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
                <span>{releaseYear || "TBA"}</span>
                <span>•</span>
                <span className="uppercase font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted border border-border text-foreground">
                  {type === "tv" ? "TV Series" : type}
                </span>
                {creator && (
                  <>
                    <span>•</span>
                    <span className="text-foreground font-semibold">{creator}</span>
                  </>
                )}
              </div>

              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
                {title}
              </h1>

              <div className="flex flex-wrap gap-1.5 mt-3">
                {genres.map((g) => (
                  <span
                    key={g}
                    className="text-xs font-semibold px-3 py-1 rounded-full bg-muted/60 border border-border text-muted-foreground"
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>

            {summary && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
                  Synopsis
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground max-w-2xl">{summary}</p>
              </div>
            )}

            {/* Squad Activity */}
            <div className="space-y-4 bg-card border border-border rounded-3xl p-6 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground font-mono">
                    Squad Activity
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-muted-foreground">
                  {squadEntries.length} logged
                </span>
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
                      className="p-3.5 rounded-2xl bg-muted/40 border border-border space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/squad/${entry.user.username}`}
                          className="flex items-center gap-2 hover:opacity-80 transition"
                        >
                          <div className="w-7 h-7 rounded-full bg-foreground text-background flex items-center justify-center font-black text-xs">
                            {entry.user.displayName[0]}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-foreground block">
                              {entry.user.displayName}
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground uppercase">
                              {entry.status === "want_to"
                                ? "In Queue"
                                : entry.status === "doing"
                                  ? "In Progress"
                                  : "Completed"}
                            </span>
                          </div>
                        </Link>

                        {entry.rating && (
                          <span className="text-xs font-black text-amber-500 font-mono bg-background px-2 py-0.5 rounded-full border border-border shadow-xs">
                            ★ {entry.rating} / 5
                          </span>
                        )}
                      </div>

                      {entry.reviewNote && (
                        <p className="text-xs text-foreground/90 italic p-2.5 rounded-xl bg-background border border-border leading-relaxed">
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
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
                  Trailer
                </h3>
                <div className="aspect-video w-full max-w-2xl rounded-3xl overflow-hidden border border-border bg-black shadow-lg">
                  <iframe
                    src={trailerUrl}
                    title={`${title} Trailer`}
                    className="w-full h-full"
                    allowFullScreen
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
