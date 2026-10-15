import { Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PosterImage } from "@/components/poster-image";
import { getCurrentUser } from "@/lib/auth";
import { getMediaDetails } from "@/lib/media-details";
import { getHeroTitleSizeClass } from "@/lib/typography";
import { cn } from "@/lib/utils";
import { CastSection } from "./cast-section";
import { CollectionSection } from "./collection-section";
import { CrewSection } from "./crew-section";
import { GameDetailsSection } from "./game-details-section";
import { MediaDetailBanner } from "./media-detail-banner";
import { MediaFactsStrip } from "./media-facts-strip";
import { MediaLogCard } from "./media-log-card";
import { MoreLikeThisSection } from "./more-like-this-section";
import { TrailerEmbed } from "./trailer-embed";
import { TvDetailsSection } from "./tv-details-section";
import { WatchProvidersSection } from "./watch-providers-section";

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

  const [details, currentUser] = await Promise.all([getMediaDetails(type, id), getCurrentUser()]);

  if (!details) {
    notFound();
  }

  const myEntry = details.squadEntries.find((e) => e.user.id === currentUser?.id) || null;

  const mediaData = {
    id: details.id,
    externalId: details.externalId,
    mediaType: details.mediaType,
    title: details.title,
    releaseYear: details.releaseYear,
    posterUrl: details.posterUrl,
    backdropUrl: details.backdropUrl,
    creator: details.creator,
    summary: details.summary,
    genres: details.genres,
  };

  const isGame = type === "game";

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <MediaDetailBanner
        backdropUrl={details.backdropUrl}
        posterUrl={details.posterUrl}
        title={details.title}
      >
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Left: Poster & Interactive Log Card */}
          <div className="w-56 sm:w-64 shrink-0 mx-auto lg:mx-0 space-y-4">
            <div className="relative aspect-2/3 w-full rounded-2xl overflow-hidden bg-muted border border-border shadow-xl">
              <PosterImage
                src={details.posterUrl}
                title={details.title}
                mediaType={type}
                priority
                className="object-cover"
              />
            </div>

            <MediaLogCard media={mediaData} initialEntry={myEntry} />
          </div>

          {/* Right: Details & Rich Sections */}
          <div className="flex-1 space-y-8 min-w-0">
            {/* Header: Type, Title, Genres, Facts Strip */}
            <div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
                <span>{details.releaseYear || "TBA"}</span>
                <span>•</span>
                <span className="capitalize text-muted-foreground">
                  {type === "tv" ? "TV series" : type}
                </span>
                {details.creator && (
                  <>
                    <span>•</span>
                    {details.directors && details.directors.length > 0 ? (
                      <Link
                        href={`/person/${details.directors[0].id}`}
                        className="text-foreground font-medium hover:opacity-70 transition"
                      >
                        {details.creator}
                      </Link>
                    ) : details.creators && details.creators.length > 0 ? (
                      <Link
                        href={`/person/${details.creators[0].id}`}
                        className="text-foreground font-medium hover:opacity-70 transition"
                      >
                        {details.creator}
                      </Link>
                    ) : (
                      <span className="text-foreground font-medium">{details.creator}</span>
                    )}
                  </>
                )}
              </div>

              <h1
                className={cn(
                  "font-display leading-[1.02] text-balance max-w-3xl text-foreground",
                  getHeroTitleSizeClass(details.title),
                )}
              >
                {details.title}
              </h1>

              {details.genres.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {details.genres.map((g) => (
                    <span
                      key={g}
                      className="text-xs font-medium px-3 py-1 rounded-full bg-card border border-border text-muted-foreground"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}

              {/* 1. Facts strip */}
              <div className="mt-3">
                <MediaFactsStrip details={details} />
              </div>
            </div>

            {/* 2 & 3. Tagline & Synopsis */}
            {(details.tagline || details.summary) && (
              <div className="space-y-2">
                {details.tagline && (
                  <p className="text-sm italic text-muted-foreground font-normal">
                    &ldquo;{details.tagline}&rdquo;
                  </p>
                )}
                {details.summary && (
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-semibold text-muted-foreground">Synopsis</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground max-w-2xl">
                      {details.summary}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 4. Squad Activity */}
            <div className="space-y-4 bg-card border border-border rounded-2xl p-6 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-xs font-semibold text-foreground">Squad activity</h3>
                </div>
                <span className="text-xs text-muted-foreground">
                  {details.squadEntries.length} logged
                </span>
              </div>

              {/* Squad summary line: Squad ★ x.x · TMDB/IGDB y.y */}
              {details.squadRatingAverage !== null && details.externalScore !== null && (
                <div className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1 border-t border-border/50">
                  <span>
                    Squad ★{" "}
                    <span className="font-mono text-foreground font-semibold">
                      {details.squadRatingAverage.toFixed(1)}
                    </span>
                  </span>
                  <span>·</span>
                  <span>
                    {isGame ? "IGDB" : "TMDB"} ★{" "}
                    <span className="font-mono text-foreground font-semibold">
                      {details.externalScore.toFixed(1)}
                    </span>
                  </span>
                </div>
              )}

              {details.squadEntries.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No one in the squad has logged this title yet. Be the first!
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {details.squadEntries.map((entry) => (
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

            {/* 5. Movies & TV: Where to watch, Crew, Cast, and TV Details */}
            {!isGame && (
              <>
                <WatchProvidersSection watchProviders={details.watchProviders} />
                <CrewSection
                  directors={details.directors}
                  writers={details.writers}
                  composer={details.composer}
                  composers={details.composers}
                  creators={details.creators}
                  mediaType={type as "movie" | "tv"}
                />
                <CastSection cast={details.cast} />
                {type === "tv" && (
                  <TvDetailsSection
                    tvNextEpisode={details.tvNextEpisode}
                    tvSeasons={details.tvSeasons}
                  />
                )}
              </>
            )}

            {/* 6. Games: How long to beat, platforms, modes, credits, screenshots */}
            {isGame && (
              <GameDetailsSection
                timeToBeat={details.timeToBeat}
                platforms={details.platforms}
                gameModes={details.gameModes}
                developer={details.developer}
                publisher={details.publisher}
                screenshots={details.screenshots}
              />
            )}

            {/* 7. Trailer (existing) */}
            {details.trailerUrl && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-foreground">Trailer</h3>
                <TrailerEmbed trailerUrl={details.trailerUrl} title={details.title} />
              </div>
            )}

            {/* 8. Collection or franchise row */}
            <CollectionSection
              collection={details.collection}
              franchise={details.franchise}
              mediaType={type as "movie" | "tv" | "game"}
            />

            {/* 9. More like this */}
            <MoreLikeThisSection recommendations={details.recommendations} />
          </div>
        </div>
      </MediaDetailBanner>
    </div>
  );
}
