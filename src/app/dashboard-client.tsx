"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Compass,
  Film,
  Gamepad2,
  Info,
  LogIn,
  Play,
  Plus,
  Star,
  Tv,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { UnifiedSearchResult } from "@/app/api/search/route";
import type { MediaStatus } from "@/components/media-card";
import { PosterImage } from "@/components/poster-image";
import { logEntryApi } from "@/lib/api-entries";
import { openAuthModal } from "@/lib/auth-events";
import { getHeroTitleSizeClass } from "@/lib/typography";
import { cn } from "@/lib/utils";
import type { Entry, EntryUser } from "@/types/entry";

interface DashboardClientProps {
  currentUser: EntryUser | null;
  users?: EntryUser[];
  initialEntries: Entry[];
  squadActivity: Entry[];
  trendingMovies: UnifiedSearchResult[];
  trendingTv: UnifiedSearchResult[];
  trendingGames: UnifiedSearchResult[];
}

function getMediaHref(media: Entry["media"] | UnifiedSearchResult) {
  const parts = media.externalId.split(":");
  const rawId = parts[parts.length - 1];
  return `/media/${media.mediaType}/${rawId}`;
}

function getMediaTypeIcon(type: "movie" | "tv" | "game") {
  switch (type) {
    case "movie":
      return <Film className="w-3.5 h-3.5" />;
    case "tv":
      return <Tv className="w-3.5 h-3.5" />;
    case "game":
      return <Gamepad2 className="w-3.5 h-3.5" />;
  }
}

function getStatusVerb(status: string) {
  switch (status) {
    case "done":
      return "finished";
    case "doing":
      return "started";
    case "want_to":
      return "queued";
    case "dropped":
      return "dropped";
    default:
      return "logged";
  }
}

function getStatusDotColor(status: string) {
  switch (status) {
    case "done":
      return "bg-status-done";
    case "doing":
      return "bg-status-doing";
    case "want_to":
      return "bg-status-queue";
    case "dropped":
      return "bg-status-dropped";
    default:
      return "bg-muted-foreground";
  }
}

function ShelfScrollRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const rowRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!rowRef.current) return;
    const amount = direction === "left" ? -350 : 350;
    rowRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  return (
    <div className="relative group/shelf">
      <div
        ref={rowRef}
        className={cn(
          "overflow-x-auto snap-x snap-mandatory flex gap-4 scroll-smooth no-scrollbar pb-3",
          className,
        )}
      >
        {children}
      </div>

      {/* Right-edge fade on scroll rows so clipped cards read as scrollable */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-0 bottom-3 w-12 sm:w-20 bg-linear-to-l from-background via-background/80 to-transparent z-10"
      />

      <button
        type="button"
        onClick={() => scroll("left")}
        aria-label="Scroll left"
        className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 size-9 rounded-full bg-card/95 hover:bg-card border border-border shadow-md items-center justify-center text-muted-foreground hover:text-foreground z-20 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronLeft className="size-4.5" />
      </button>

      <button
        type="button"
        onClick={() => scroll("right")}
        aria-label="Scroll right"
        className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 size-9 rounded-full bg-card/95 hover:bg-card border border-border shadow-md items-center justify-center text-muted-foreground hover:text-foreground z-20 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronRight className="size-4.5" />
      </button>
    </div>
  );
}

export function DashboardClient({
  currentUser,
  initialEntries,
  squadActivity,
  trendingMovies,
  trendingTv,
  trendingGames,
}: DashboardClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTrendingTab, setActiveTrendingTab] = useState<"movies" | "tv" | "games">("movies");

  // Status mutation for 1-click status transitions
  const { mutate: setQuickStatus, isPending } = useMutation({
    mutationFn: async ({
      media,
      status,
    }: {
      media: Entry["media"] | UnifiedSearchResult;
      status: MediaStatus;
    }) => {
      return logEntryApi({
        media,
        status,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["my-entries"] });
      router.refresh();
      const statusLabel =
        variables.status === "done"
          ? "Marked as completed"
          : variables.status === "doing"
            ? "Moved to In Progress"
            : "Added to Queue";
      toast.success(statusLabel, { description: variables.media.title });
    },
    onError: () => {
      toast.error("Failed to update status");
    },
  });

  const myActive = initialEntries.filter((e) => e.status === "doing");
  const myQueue = initialEntries.filter((e) => e.status === "want_to");
  const myCompleted = initialEntries.filter((e) => e.status === "done");

  // Hero switcher: up to 3 in-progress items falling back to queue
  const heroCandidates = [...myActive, ...myQueue].slice(0, 3);
  const [selectedHeroIndex, setSelectedHeroIndex] = useState(0);

  const heroEntry = heroCandidates[selectedHeroIndex] || heroCandidates[0] || null;
  const isHeroActive = heroEntry?.status === "doing";

  // STRICT RULE: heroBackdrop must only use backdropUrl, NEVER posterUrl
  const heroBackdrop = heroEntry?.media.backdropUrl ?? null;
  const glowSource = heroEntry?.media.backdropUrl || heroEntry?.media.posterUrl || null;

  // Exclude the hero item from Up Next in Queue
  const displayedQueue = myQueue.filter((e) => e.id !== heroEntry?.id);

  const handleHeroOneTap = () => {
    if (!heroEntry) return;
    const targetStatus: MediaStatus = isHeroActive ? "done" : "doing";
    setQuickStatus({
      media: heroEntry.media,
      status: targetStatus,
    });
  };

  // Trending items based on active tab
  const currentTrendingItems =
    activeTrendingTab === "movies"
      ? trendingMovies
      : activeTrendingTab === "tv"
        ? trendingTv
        : trendingGames;

  return (
    <div className="min-h-full bg-background text-foreground flex flex-col">
      {/* 1. Hero Banner: h-[26rem] mobile, h-[30rem] desktop */}
      {heroEntry && (
        <section className="relative w-full h-104 sm:h-120 overflow-hidden select-none bg-background border-b border-border">
          {/* Ambient Glow: blurred copy of backdrop/poster with low opacity */}
          <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
            <PosterImage
              src={glowSource}
              title=""
              fallback="none"
              sizes="10vw"
              className="w-full h-full object-cover blur-3xl scale-150 opacity-10 dark:opacity-25"
            />
          </div>

          {/* Visible Backdrop positioned right (if present) */}
          {heroBackdrop && (
            <div className="absolute inset-0">
              <PosterImage
                src={heroBackdrop}
                title={heroEntry.media.title}
                mediaType={heroEntry.media.mediaType}
                priority
                sizes="100vw"
                className="object-cover object-right opacity-80 transition duration-700"
                fallback="none"
              />
            </div>
          )}

          {/* Left readable gradient (~60% width) + bottom fade */}
          <div className="absolute inset-0 bg-linear-to-r from-background via-background/70 to-transparent w-full md:w-3/5" />
          <div className="absolute bottom-0 inset-x-0 h-28 sm:h-36 bg-linear-to-t from-background via-background/40 to-transparent" />

          {/* Hero Content Overlay (contained in left half, never overlapping subject) */}
          <div className="relative max-w-7xl mx-auto px-4 sm:px-8 h-full flex flex-col justify-end pb-8 sm:pb-10 pt-6">
            <div className="max-w-xl lg:max-w-2xl">
              {/* Quiet inline counts line above badge row */}
              <div className="text-xs sm:text-sm text-muted-foreground mb-3 font-normal">
                {myCompleted.length} done · {myActive.length} active · {myQueue.length} queued
              </div>

              {/* Status and Type row (regular sans, no boxed mono tags) */}
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
                  <span
                    className={cn(
                      "size-1.5 rounded-full shrink-0",
                      isHeroActive ? "bg-status-doing" : "bg-status-queue",
                    )}
                  />
                  <span>{isHeroActive ? "In progress" : "Up next in queue"}</span>
                </span>

                <span className="text-muted-foreground/40">•</span>

                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground capitalize">
                  {getMediaTypeIcon(heroEntry.media.mediaType)}
                  <span>
                    {heroEntry.media.mediaType === "tv" ? "TV series" : heroEntry.media.mediaType}
                  </span>
                </span>

                {heroEntry.media.releaseYear && (
                  <>
                    <span className="text-muted-foreground/40">•</span>
                    <span className="text-xs text-muted-foreground">
                      {heroEntry.media.releaseYear}
                    </span>
                  </>
                )}
              </div>

              {/* Cinematic Title */}
              <h1
                className={cn(
                  "font-display leading-none text-balance max-w-3xl text-foreground drop-shadow-sm",
                  getHeroTitleSizeClass(heroEntry.media.title),
                )}
              >
                {heroEntry.media.title}
              </h1>

              {/* Summary Snippet */}
              {heroEntry.media.summary && (
                <p className="mt-3 text-xs sm:text-sm text-muted-foreground line-clamp-2 max-w-xl leading-relaxed font-normal">
                  {heroEntry.media.summary}
                </p>
              )}

              {/* Primary Action Buttons (Hero CTAs: rounded-md with solid lime and dark text) */}
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleHeroOneTap}
                  disabled={isPending}
                  className="h-10 px-5 rounded-md bg-brand hover:opacity-90 text-brand-foreground font-semibold text-sm flex items-center gap-2 transition hover:scale-102 active:scale-98 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {isHeroActive ? (
                    <>
                      <Check className="w-4 h-4 stroke-3" />
                      <span>Mark as Done</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current stroke-0" />
                      <span>
                        {heroEntry.media.mediaType === "game" ? "Start Playing" : "Start Watching"}
                      </span>
                    </>
                  )}
                </button>

                <Link
                  href={getMediaHref(heroEntry.media)}
                  className="h-10 px-4 rounded-md bg-card/90 hover:bg-accent border border-border text-foreground font-semibold text-sm flex items-center gap-2 transition backdrop-blur-md"
                >
                  <Info className="w-4 h-4 text-muted-foreground" />
                  <span>Details</span>
                </Link>
              </div>

              {/* Up to 3 selectable thumbnails (without the "Switch:" label) */}
              {heroCandidates.length > 1 && (
                <div className="mt-5 pt-3 border-t border-border/40 flex items-center gap-2.5">
                  {heroCandidates.map((candidate, idx) => {
                    const isSelected = idx === selectedHeroIndex;
                    return (
                      <button
                        key={candidate.id}
                        type="button"
                        onClick={() => setSelectedHeroIndex(idx)}
                        title={candidate.media.title}
                        className={cn(
                          "relative w-10 sm:w-11 aspect-2/3 rounded-md overflow-hidden border transition-all cursor-pointer shadow-xs",
                          isSelected
                            ? "border-brand ring-2 ring-brand/40 scale-105"
                            : "border-border/60 opacity-60 hover:opacity-100 hover:border-border",
                        )}
                      >
                        <PosterImage
                          src={candidate.media.posterUrl}
                          title={candidate.media.title}
                          mediaType={candidate.media.mediaType}
                          releaseYear={candidate.media.releaseYear}
                          sizes="44px"
                          compact
                          className="object-cover"
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Logged-in Empty Hero fallback */}
      {!heroEntry && currentUser && (
        <section className="relative w-full h-88 sm:h-104 px-4 sm:px-8 border-b border-border bg-background flex items-center">
          <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-foreground">
                Your queue is empty
              </h1>
              <p className="text-sm text-muted-foreground mt-3 max-w-xl">
                Browse trending releases below or explore the full catalog to build your media
                shelf.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/explore"
                className="h-10 px-6 rounded-md bg-brand hover:opacity-90 text-brand-foreground font-semibold text-sm flex items-center gap-2 transition"
              >
                <Compass className="w-4 h-4" />
                <span>Explore Catalog</span>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Logged-out Hero fallback */}
      {!currentUser && (
        <section className="relative w-full h-88 sm:h-104 px-4 sm:px-8 border-b border-border bg-background flex items-center">
          <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-foreground">
                Sign in to start tracking
              </h1>
              <p className="text-sm text-muted-foreground mt-3 max-w-xl">
                Keep track of movies, TV shows, and video games in one shared space with your squad.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={openAuthModal}
                className="h-10 px-6 rounded-md bg-brand hover:opacity-90 text-brand-foreground font-semibold text-sm flex items-center gap-2 transition cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign in</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-12 w-full">
        {/* 2. Squad Activity */}
        <section className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Squad Activity
            </h2>
            <span className="text-xs text-muted-foreground">{squadActivity.length} recent</span>
          </div>

          {squadActivity.length > 0 ? (
            <ShelfScrollRow>
              {squadActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="w-[18rem] sm:w-[20rem] shrink-0 snap-start p-3.5 rounded-lg bg-card border border-border hover:border-border/80 transition-all flex flex-col justify-between gap-3 shadow-xs"
                >
                  {/* Top user row with avatar & status verb + dot */}
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <Link
                      href={`/squad/${activity.user.username}`}
                      className="flex items-center gap-2 min-w-0 group hover:opacity-85 transition"
                    >
                      <div className="size-7 rounded-full bg-muted border border-border flex items-center justify-center font-semibold text-xs text-foreground shrink-0 shadow-xs">
                        {activity.user.displayName[0]?.toUpperCase()}
                      </div>
                      <span className="text-xs font-semibold text-foreground truncate max-w-28">
                        {activity.user.displayName}
                      </span>
                    </Link>

                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                      <span
                        className={cn(
                          "size-1.5 rounded-full shrink-0",
                          getStatusDotColor(activity.status),
                        )}
                      />
                      <span className="capitalize">{getStatusVerb(activity.status)}</span>
                    </span>
                  </div>

                  {/* Middle content: Bigger poster (w-14) + Title + Rating + Review */}
                  <div className="flex gap-3 items-start min-w-0">
                    <div className="relative w-14 h-20 rounded-md overflow-hidden bg-muted border border-border/50 shrink-0">
                      <Link href={getMediaHref(activity.media)} className="absolute inset-0 z-10" />
                      <PosterImage
                        src={activity.media.posterUrl}
                        title={activity.media.title}
                        mediaType={activity.media.mediaType}
                        releaseYear={activity.media.releaseYear}
                        sizes="56px"
                        compact
                        className="object-cover"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <Link
                        href={getMediaHref(activity.media)}
                        className="text-xs sm:text-sm font-semibold text-foreground hover:opacity-80 transition line-clamp-1 leading-snug"
                      >
                        {activity.media.title}
                      </Link>

                      {activity.rating && (
                        <div className="flex items-center gap-0.5 mt-1 text-rating">
                          {[1, 2, 3, 4, 5].slice(0, activity.rating).map((starNum) => (
                            <Star
                              key={`${activity.id}-star-${starNum}`}
                              className="size-3 fill-current text-rating stroke-none"
                            />
                          ))}
                        </div>
                      )}

                      {activity.reviewNote && (
                        <p className="mt-1 text-[11px] text-muted-foreground italic line-clamp-2 leading-relaxed">
                          &ldquo;{activity.reviewNote}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </ShelfScrollRow>
          ) : (
            <div className="p-6 rounded-lg bg-card border border-border text-center text-sm text-muted-foreground max-w-xl">
              No recent squad activity yet. When your squad logs movies, shows, or games, their
              latest milestones will appear here.
            </div>
          )}
        </section>

        {/* 3. Jump Back In Shelf (Smaller heading with subtle divider) */}
        {myActive.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-baseline justify-between border-b border-border/40 pb-2.5">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  Jump Back In
                </h2>
                <span className="text-xs text-muted-foreground ml-1">({myActive.length})</span>
              </div>
              <Link
                href="/library"
                className="text-xs font-semibold text-muted-foreground hover:text-foreground transition flex items-center gap-1"
              >
                <span>View library</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Sparse State: 1-2 items layout */}
            {myActive.length <= 2 ? (
              <div className="flex flex-wrap gap-4">
                {myActive.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex gap-4 p-4 rounded-lg bg-card border border-border hover:border-border/80 transition-all w-full sm:w-100 shadow-xs"
                  >
                    <div className="relative w-20 sm:w-24 aspect-2/3 rounded-md overflow-hidden bg-muted shrink-0 border border-border/50">
                      <Link href={getMediaHref(entry.media)} className="absolute inset-0 z-10" />
                      <PosterImage
                        src={entry.media.posterUrl}
                        title={entry.media.title}
                        mediaType={entry.media.mediaType}
                        releaseYear={entry.media.releaseYear}
                        sizes="96px"
                        className="object-cover"
                      />
                    </div>

                    <div className="flex flex-col justify-between min-w-0 flex-1 py-0.5">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-muted-foreground capitalize">
                            {entry.media.mediaType}
                            {entry.media.releaseYear ? ` • ${entry.media.releaseYear}` : ""}
                          </span>
                        </div>
                        <Link
                          href={getMediaHref(entry.media)}
                          className="text-sm sm:text-base font-semibold tracking-tight text-foreground hover:opacity-80 transition line-clamp-2 leading-snug"
                        >
                          {entry.media.title}
                        </Link>
                        {entry.media.summary && (
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {entry.media.summary}
                          </p>
                        )}
                      </div>

                      <div className="pt-3">
                        <button
                          type="button"
                          onClick={() => setQuickStatus({ media: entry.media, status: "done" })}
                          className="h-8 px-3 rounded-md bg-brand hover:opacity-90 text-brand-foreground text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Check className="size-3.5 stroke-3" />
                          <span>Mark as Done</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                <Link
                  href="/explore"
                  className="flex flex-col items-center justify-center gap-2 p-5 rounded-lg border-2 border-dashed border-border hover:border-border/80 hover:bg-muted/40 transition text-center min-h-30 w-full sm:w-60 group cursor-pointer"
                >
                  <div className="size-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground group-hover:text-brand-text group-hover:scale-105 transition-all">
                    <Plus className="size-4.5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-foreground block">
                      Add from Explore
                    </span>
                    <span className="text-xs text-muted-foreground">Discover new titles</span>
                  </div>
                </Link>
              </div>
            ) : (
              /* Regular Horizontal Scroll Shelf for 3+ items */
              <ShelfScrollRow>
                {myActive.map((entry) => (
                  <div
                    key={entry.id}
                    className="w-42 shrink-0 snap-start group flex flex-col select-none"
                  >
                    <div className="relative aspect-2/3 w-full rounded-lg overflow-hidden bg-card border border-border shadow-xs">
                      <Link
                        href={getMediaHref(entry.media)}
                        className="absolute inset-0 z-0 cursor-pointer"
                        aria-label={`View ${entry.media.title}`}
                      />

                      <PosterImage
                        src={entry.media.posterUrl}
                        title={entry.media.title}
                        mediaType={entry.media.mediaType}
                        releaseYear={entry.media.releaseYear}
                        sizes="168px"
                        className="object-cover transition duration-300 group-hover:scale-105 pointer-events-none"
                      />

                      {/* Quick action button visible on hover AND on touch screens */}
                      <div className="absolute inset-0 bg-linear-to-t from-background/90 via-background/40 to-transparent opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity flex items-end justify-between p-3 pointer-events-none">
                        <span className="text-xs text-foreground capitalize">
                          {entry.media.mediaType}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setQuickStatus({ media: entry.media, status: "done" });
                          }}
                          title="Mark Completed"
                          className="pointer-events-auto p-1.5 rounded-full bg-brand text-brand-foreground hover:opacity-90 transition shadow-xs cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5 stroke-3" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 space-y-0.5">
                      <Link
                        href={getMediaHref(entry.media)}
                        className="text-xs sm:text-sm font-semibold text-foreground hover:opacity-80 transition line-clamp-2 leading-snug block"
                      >
                        {entry.media.title}
                      </Link>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="capitalize">{entry.media.mediaType}</span>
                        {entry.media.releaseYear && (
                          <>
                            <span>•</span>
                            <span>{entry.media.releaseYear}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </ShelfScrollRow>
            )}
          </section>
        )}

        {/* 4. Up Next in Queue Shelf (Excludes heroEntry, hidden if empty) */}
        {displayedQueue.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-baseline justify-between border-b border-border/40 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-status-queue" />
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  Up Next in Queue
                </h2>
                <span className="text-xs text-muted-foreground ml-1">
                  ({displayedQueue.length})
                </span>
              </div>
              <Link
                href="/library"
                className="text-xs font-semibold text-muted-foreground hover:text-foreground transition flex items-center gap-1"
              >
                <span>View all</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Sparse State: 1-2 items layout */}
            {displayedQueue.length <= 2 ? (
              <div className="flex flex-wrap gap-4">
                {displayedQueue.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex gap-4 p-4 rounded-lg bg-card border border-border hover:border-border/80 transition-all w-full sm:w-100 shadow-xs"
                  >
                    <div className="relative w-20 sm:w-24 aspect-2/3 rounded-md overflow-hidden bg-muted shrink-0 border border-border/50">
                      <Link href={getMediaHref(entry.media)} className="absolute inset-0 z-10" />
                      <PosterImage
                        src={entry.media.posterUrl}
                        title={entry.media.title}
                        mediaType={entry.media.mediaType}
                        releaseYear={entry.media.releaseYear}
                        sizes="96px"
                        className="object-cover"
                      />
                    </div>

                    <div className="flex flex-col justify-between min-w-0 flex-1 py-0.5">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-muted-foreground capitalize">
                            {entry.media.mediaType}
                            {entry.media.releaseYear ? ` • ${entry.media.releaseYear}` : ""}
                          </span>
                        </div>
                        <Link
                          href={getMediaHref(entry.media)}
                          className="text-sm sm:text-base font-semibold tracking-tight text-foreground hover:opacity-80 transition line-clamp-2 leading-snug"
                        >
                          {entry.media.title}
                        </Link>
                        {entry.media.summary && (
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {entry.media.summary}
                          </p>
                        )}
                      </div>

                      <div className="pt-3">
                        <button
                          type="button"
                          onClick={() => setQuickStatus({ media: entry.media, status: "doing" })}
                          className="h-8 px-3 rounded-md bg-status-doing/15 hover:bg-status-doing hover:text-background border border-status-doing/30 text-xs font-semibold text-status-doing transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Play className="size-3.5 fill-current stroke-0" />
                          <span>Start</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                <Link
                  href="/explore"
                  className="flex flex-col items-center justify-center gap-2 p-5 rounded-lg border-2 border-dashed border-border hover:border-border/80 hover:bg-muted/40 transition text-center min-h-30 w-full sm:w-60 group cursor-pointer"
                >
                  <div className="size-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground group-hover:text-brand-text group-hover:scale-105 transition-all">
                    <Plus className="size-4.5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-foreground block">
                      Add to Queue
                    </span>
                    <span className="text-xs text-muted-foreground">Discover new titles</span>
                  </div>
                </Link>
              </div>
            ) : (
              /* Regular Horizontal Scroll Shelf for 3+ items */
              <ShelfScrollRow>
                {displayedQueue.map((entry) => (
                  <div
                    key={entry.id}
                    className="w-42 shrink-0 snap-start group flex flex-col select-none"
                  >
                    <div className="relative aspect-2/3 w-full rounded-lg overflow-hidden bg-card border border-border shadow-xs">
                      <Link
                        href={getMediaHref(entry.media)}
                        className="absolute inset-0 z-0 cursor-pointer"
                        aria-label={`View ${entry.media.title}`}
                      />

                      <PosterImage
                        src={entry.media.posterUrl}
                        title={entry.media.title}
                        mediaType={entry.media.mediaType}
                        releaseYear={entry.media.releaseYear}
                        sizes="168px"
                        className="object-cover transition duration-300 group-hover:scale-105 pointer-events-none"
                      />

                      {/* Quick action button visible on hover AND on touch screens */}
                      <div className="absolute inset-0 bg-linear-to-t from-background/90 via-background/40 to-transparent opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity flex items-end justify-between p-3 pointer-events-none">
                        <span className="text-xs text-foreground capitalize">
                          {entry.media.mediaType}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setQuickStatus({ media: entry.media, status: "doing" });
                          }}
                          title="Start Watching/Playing"
                          className="pointer-events-auto p-1.5 rounded-full bg-status-doing/20 text-status-doing hover:bg-status-doing hover:text-background border border-status-doing/30 transition shadow-xs cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current stroke-0" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 space-y-0.5">
                      <Link
                        href={getMediaHref(entry.media)}
                        className="text-xs sm:text-sm font-semibold text-foreground hover:opacity-80 transition line-clamp-2 leading-snug block"
                      >
                        {entry.media.title}
                      </Link>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="capitalize">{entry.media.mediaType}</span>
                        {entry.media.releaseYear && (
                          <>
                            <span>•</span>
                            <span>{entry.media.releaseYear}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </ShelfScrollRow>
            )}
          </section>
        )}

        {/* 5. Trending This Week Shelf */}
        <section className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Trending This Week
            </h2>

            {/* Segmented Pill Tabs for Movies / TV / Games */}
            <div className="flex items-center gap-1.5 p-1 bg-muted rounded-lg border border-border self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setActiveTrendingTab("movies")}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer",
                  activeTrendingTab === "movies"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Movies
              </button>
              <button
                type="button"
                onClick={() => setActiveTrendingTab("tv")}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer",
                  activeTrendingTab === "tv"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                TV Series
              </button>
              <button
                type="button"
                onClick={() => setActiveTrendingTab("games")}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer",
                  activeTrendingTab === "games"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Games
              </button>
            </div>
          </div>

          {/* Trending Shelf (10 items, no media type tag, allowed 2-line title) */}
          <ShelfScrollRow>
            {currentTrendingItems.slice(0, 10).map((item) => (
              <div
                key={item.externalId}
                className="w-42 shrink-0 snap-start group flex flex-col select-none"
              >
                <div className="relative aspect-2/3 w-full rounded-lg overflow-hidden bg-card border border-border shadow-xs">
                  <Link
                    href={getMediaHref(item)}
                    className="absolute inset-0 z-0 cursor-pointer"
                    aria-label={`View ${item.title}`}
                  />

                  <PosterImage
                    src={item.posterUrl}
                    title={item.title}
                    releaseYear={item.releaseYear}
                    sizes="168px"
                    className="object-cover transition duration-300 group-hover:scale-105 pointer-events-none"
                  />

                  {/* Bookmark Button Overlay visible on hover AND on touch */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setQuickStatus({ media: item, status: "want_to" });
                      }}
                      title="Add to Queue"
                      className="p-1.5 rounded-full bg-card/90 text-foreground hover:bg-status-queue/20 hover:text-status-queue border border-border transition shadow-xs cursor-pointer backdrop-blur-md"
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Title (Allowed 2 lines) & Year only (in regular sans) */}
                <div className="mt-2 space-y-0.5">
                  <Link
                    href={getMediaHref(item)}
                    className="text-xs sm:text-sm font-semibold text-foreground hover:opacity-80 transition line-clamp-2 leading-snug block"
                  >
                    {item.title}
                  </Link>
                  {item.releaseYear && (
                    <span className="text-xs text-muted-foreground block">{item.releaseYear}</span>
                  )}
                </div>
              </div>
            ))}
          </ShelfScrollRow>
        </section>
      </main>
    </div>
  );
}
