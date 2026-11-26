import { Star } from "lucide-react";
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
import { FriendsActivitySection } from "./friends-activity-section";
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

  const currentUser = await getCurrentUser();
  const details = await getMediaDetails(type, id, currentUser?.id);

  if (!details) {
    notFound();
  }

  const myEntry = details.squadEntries.find((e) => e.user.id === currentUser?.id) || null;
  const friendEntries = details.squadEntries.filter((e) => e.user.id !== currentUser?.id);

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
  const typeLabel = type === "movie" ? "Film" : type === "tv" ? "TV Series" : "Game";

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* 1. Cinematic Backdrop Banner (Letterboxd / Backloggd) */}
      <MediaDetailBanner
        backdropUrl={details.backdropUrl}
        posterUrl={details.posterUrl}
        title={details.title}
      >
        {/* 2. Responsive 2-Column Split: Sticky Sidebar + Main Editorial Column */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-10 items-start">
          {/* LEFT COLUMN: Poster, Letterboxd Stats Bar, Log Card & Where to Watch */}
          <div className="w-full lg:w-72 shrink-0 space-y-4 lg:sticky lg:top-20 lg:self-start">
            {/* Desktop Large Poster Artwork (2:3 aspect with hairline frame) */}
            <div className="hidden lg:block relative aspect-2/3 w-full rounded-2xl overflow-hidden bg-card border border-border shadow-2xl">
              <PosterImage
                src={details.posterUrl}
                title={details.title}
                mediaType={type}
                sizes="288px"
                priority
                className="object-cover"
              />
            </div>

            {/* Mobile Header Flow (Backloggd mobile layout: compact cover + title lockup) */}
            <div className="flex gap-4 items-start lg:hidden">
              <div className="w-28 sm:w-36 shrink-0 aspect-2/3 rounded-xl overflow-hidden bg-card border border-border shadow-lg relative">
                <PosterImage
                  src={details.posterUrl}
                  title={details.title}
                  mediaType={type}
                  sizes="(max-width: 640px) 112px, 144px"
                  priority
                  className="object-cover"
                />
              </div>

              <div className="flex-1 min-w-0 space-y-1.5 pt-1">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                  <span className="font-mono text-foreground/80">
                    {details.releaseYear || "TBA"}
                  </span>
                  <span>•</span>
                  <span>{typeLabel}</span>
                </div>

                <h1 className="font-display text-2xl sm:text-3xl uppercase tracking-tight text-foreground leading-[1.05] line-clamp-3">
                  {details.title}
                </h1>

                {details.creator && (
                  <p className="text-xs text-muted-foreground font-medium truncate">
                    {type === "movie"
                      ? `Directed by ${details.creator}`
                      : type === "tv"
                        ? `Created by ${details.creator}`
                        : `Developed by ${details.creator}`}
                  </p>
                )}

                {details.externalScore !== null && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-card border border-border text-xs text-foreground font-medium mt-1">
                    <Star className="size-3 text-rating fill-rating" />
                    <span className="font-mono font-semibold tabular-nums">
                      {details.externalScore}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {isGame ? "IGDB" : "TMDB"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Desktop Letterboxd Production Stats Bar (directly under poster) */}
            <div className="hidden lg:grid grid-cols-3 divide-x divide-border/60 bg-card border border-border rounded-xl py-2 px-1 text-center shadow-2xs select-none">
              <div className="px-2">
                <div className="font-mono font-semibold text-xs text-foreground flex items-center justify-center gap-1 tabular-nums">
                  <Star className="size-3 text-rating fill-rating" />
                  <span>{details.externalScore !== null ? details.externalScore : "—"}</span>
                </div>
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide block">
                  {isGame ? "IGDB" : "TMDB"}
                </span>
              </div>

              <div className="px-2">
                <div className="font-mono font-semibold text-xs text-foreground flex items-center justify-center gap-1 tabular-nums">
                  {details.squadRatingAverage !== null ? (
                    <>
                      <Star className="size-3 text-rating fill-rating" />
                      <span>{details.squadRatingAverage.toFixed(1)}</span>
                    </>
                  ) : (
                    <span>{friendEntries.length}</span>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide block">
                  {details.squadRatingAverage !== null ? "Friends ★" : "Friends' logs"}
                </span>
              </div>

              <div className="px-2">
                <div className="font-mono font-semibold text-xs text-foreground tabular-nums">
                  {details.releaseYear || "TBA"}
                </div>
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide block">
                  {typeLabel}
                </span>
              </div>
            </div>

            {/* Letterboxd / Backloggd Action Panel */}
            <MediaLogCard
              key={myEntry ? `${myEntry.id}-${myEntry.updatedAt}` : "new"}
              media={mediaData}
              initialEntry={myEntry}
            />

            {/* Desktop "Where to watch" panel (Letterboxd layout: lives directly under poster/action box) */}
            {!isGame && details.watchProviders && (
              <div className="hidden lg:block">
                <WatchProvidersSection watchProviders={details.watchProviders} />
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Editorial Title, Synopsis, Media Sections & Reviews */}
          <div className="flex-1 min-w-0 space-y-8">
            {/* Desktop Header: Year, Type, Creator, Hero Title, Tagline & Meta Pills */}
            <div className="space-y-3">
              {/* Desktop Context Row */}
              <div className="hidden lg:flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono font-medium text-foreground/80">
                  {details.releaseYear || "TBA"}
                </span>
                <span>•</span>
                <span className="font-medium text-foreground/80">{typeLabel}</span>
                {details.creator && (
                  <>
                    <span>•</span>
                    {details.directors && details.directors.length > 0 ? (
                      <Link
                        href={`/person/${details.directors[0].id}`}
                        className="text-foreground font-medium hover:text-brand transition"
                      >
                        Directed by {details.creator}
                      </Link>
                    ) : details.creators && details.creators.length > 0 ? (
                      <Link
                        href={`/person/${details.creators[0].id}`}
                        className="text-foreground font-medium hover:text-brand transition"
                      >
                        Created by {details.creator}
                      </Link>
                    ) : (
                      <span className="text-foreground font-medium">
                        {isGame ? `Developed by ${details.creator}` : details.creator}
                      </span>
                    )}
                  </>
                )}
              </div>

              {/* Display Hero Title (Desktop) */}
              <h1
                className={cn(
                  "hidden lg:block font-display leading-[0.96] tracking-tight text-balance text-foreground uppercase",
                  getHeroTitleSizeClass(details.title),
                )}
              >
                {details.title}
              </h1>

              {/* Tagline */}
              {details.tagline && (
                <p className="text-sm sm:text-base italic text-muted-foreground/85 font-normal">
                  &ldquo;{details.tagline}&rdquo;
                </p>
              )}

              {/* Genre Pills & Metadata Facts Strip */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {details.genres.map((genre) => (
                  <span
                    key={genre}
                    className="text-xs font-medium px-3 py-1 rounded-full bg-card border border-border text-muted-foreground hover:text-foreground transition select-none"
                  >
                    {genre}
                  </span>
                ))}
                <MediaFactsStrip details={details} />
              </div>
            </div>

            {/* Synopsis / Storyline */}
            {details.summary && (
              <div className="space-y-2">
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Overview
                </h2>
                <p className="text-sm sm:text-base leading-relaxed text-muted-foreground/90 max-w-3xl">
                  {details.summary}
                </p>
              </div>
            )}

            {/* Mobile "Where to Watch" (rendered on mobile when hidden in sidebar) */}
            {!isGame && details.watchProviders && (
              <div className="lg:hidden">
                <WatchProvidersSection watchProviders={details.watchProviders} />
              </div>
            )}

            {/* Games Section: How Long to Beat, Platforms, Modes, Credits, Screenshots */}
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

            {/* Movies & TV: Cast FIRST (Letterboxd priority), then Crew, then TV Seasons */}
            {!isGame && (
              <>
                <CastSection cast={details.cast} />
                <CrewSection
                  directors={details.directors}
                  writers={details.writers}
                  composer={details.composer}
                  composers={details.composers}
                  creators={details.creators}
                  mediaType={type as "movie" | "tv"}
                />
                {type === "tv" && (
                  <TvDetailsSection
                    tvNextEpisode={details.tvNextEpisode}
                    tvSeasons={details.tvSeasons}
                  />
                )}
              </>
            )}

            {/* Friends' Activity & Reviews (Letterboxd / Backloggd Style) */}
            <FriendsActivitySection friendEntries={friendEntries} />

            {/* Trailer Embed */}
            {details.trailerUrl && (
              <div className="space-y-3">
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Trailer
                </h2>
                <TrailerEmbed trailerUrl={details.trailerUrl} title={details.title} />
              </div>
            )}

            {/* Collection / Franchise */}
            <CollectionSection
              collection={details.collection}
              franchise={details.franchise}
              mediaType={type as "movie" | "tv" | "game"}
            />

            {/* Recommendations / More Like This */}
            <MoreLikeThisSection recommendations={details.recommendations} />
          </div>
        </div>
      </MediaDetailBanner>
    </div>
  );
}
