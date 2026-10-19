"use client";

import { useMutation } from "@tanstack/react-query";
import {
  ArrowRight,
  Bookmark,
  Check,
  Compass,
  Film,
  Gamepad2,
  Info,
  LogIn,
  Pause,
  Play,
  Star,
  Tv,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { UnifiedSearchResult } from "@/app/api/search/route";
import { BANNER_HEIGHT, BannerVignette } from "@/components/backdrop-vignette";
import type { MediaStatus } from "@/components/media-card";
import { PosterImage } from "@/components/poster-image";
import { usePosters } from "@/components/providers/poster-provider";
import { ScrollRow } from "@/components/scroll-row";
import { logEntryApi } from "@/lib/api-entries";
import { openAuthModal } from "@/lib/auth-events";
import type { HomeSection } from "@/lib/home-prefs";
import { getHeroTitleSizeClass } from "@/lib/typography";
import { cn } from "@/lib/utils";
import type { Entry, EntryUser } from "@/types/entry";

interface DashboardClientProps {
  currentUser: EntryUser | null;
  users?: EntryUser[];
  initialEntries: Entry[];
  heroEntries: Entry[];
  squadActivity: Entry[];
  trendingMovies: UnifiedSearchResult[];
  trendingTv: UnifiedSearchResult[];
  trendingGames: UnifiedSearchResult[];
  hiddenSections?: HomeSection[];
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

export function DashboardClient({
  currentUser,
  initialEntries,
  heroEntries,
  squadActivity,
  trendingMovies,
  trendingTv,
  trendingGames,
  hiddenSections = [],
}: DashboardClientProps) {
  const router = useRouter();
  const { hidePosters } = usePosters();

  const [activeTrendingTab, setActiveTrendingTab] = useState<"movies" | "tv" | "games">("movies");
  const [selectedHeroIndex, setSelectedHeroIndex] = useState(0);
  const [timerVersion, setTimerVersion] = useState(0);
  const [isManuallyPaused, setIsManuallyPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocusWithin, setIsFocusWithin] = useState(false);
  const [isTabHidden, setIsTabHidden] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

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
      router.refresh();
      const statusLabel =
        variables.status === "done"
          ? "Marked as completed"
          : variables.status === "doing"
            ? "Moved to In Progress"
            : variables.status === "dropped"
              ? "Marked as Dropped"
              : "Added to Queue";
      toast.success(statusLabel, { description: variables.media.title });
    },
    onError: (err: Error) => {
      if (err.message !== "Unauthorized") {
        toast.error("Failed to update status");
      }
    },
  });

  const myActive = initialEntries.filter((e) => e.status === "doing");
  const myQueue = initialEntries.filter((e) => e.status === "want_to");
  const myCompleted = initialEntries.filter((e) => e.status === "done");

  // Track prefers-reduced-motion media query
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  // Pause autoplay when the tab is hidden
  useEffect(() => {
    const handleVisibility = () => {
      setIsTabHidden(document.hidden);
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // Ensure selectedHeroIndex is within bounds if heroEntries change
  const activeSlideIndex = heroEntries.length > 0 ? selectedHeroIndex % heroEntries.length : 0;
  const heroEntry = heroEntries[activeSlideIndex] ?? null;
  const isHeroActive = heroEntry?.status === "doing";

  const isPaused =
    isManuallyPaused || isHovered || isFocusWithin || isTabHidden || prefersReducedMotion;

  // Exclude active hero item from Up Next in Queue
  const displayedQueue = myQueue.filter((e) => e.id !== heroEntry?.id);

  const handleHeroOneTap = () => {
    if (!heroEntry) return;
    const targetStatus: MediaStatus = isHeroActive ? "done" : "doing";
    setQuickStatus({
      media: heroEntry.media,
      status: targetStatus,
    });
  };

  const jumpToSlide = (idx: number) => {
    setSelectedHeroIndex(idx);
    setTimerVersion((v) => v + 1);
  };

  const nextSlide = () => {
    if (heroEntries.length <= 1) return;
    setSelectedHeroIndex((prev) => (prev + 1) % heroEntries.length);
    setTimerVersion((v) => v + 1);
  };

  const prevSlide = () => {
    if (heroEntries.length <= 1) return;
    setSelectedHeroIndex((prev) => (prev - 1 + heroEntries.length) % heroEntries.length);
    setTimerVersion((v) => v + 1);
  };

  const handleAnimationEnd = () => {
    if (heroEntries.length <= 1 || isPaused) return;
    nextSlide();
  };

  const handleHeroKeyDown = (e: React.KeyboardEvent) => {
    if (heroEntries.length <= 1) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      nextSlide();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      prevSlide();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Section visibility based on hiddenSections preference
  const isSquadVisible = !hiddenSections.includes("squad");
  const isJumpVisible = !hiddenSections.includes("jump");
  const isQueueVisible = !hiddenSections.includes("queue");
  const isTrendingVisible = !hiddenSections.includes("trending");
  const allSectionsHidden =
    !isSquadVisible && !isJumpVisible && !isQueueVisible && !isTrendingVisible;

  // Trending items based on active tab
  const currentTrendingItems =
    activeTrendingTab === "movies"
      ? trendingMovies
      : activeTrendingTab === "tv"
        ? trendingTv
        : trendingGames;

  return (
    <div className="min-h-full bg-background text-foreground flex flex-col">
      {/* 1. Hero Carousel (Hotstar style, no bottom border) */}
      {heroEntry && (
        <section
          // biome-ignore lint/a11y/noNoninteractiveTabindex: carousel container requires tabIndex for arrow key navigation
          tabIndex={0}
          aria-roledescription="carousel"
          aria-label="Featured media"
          aria-live={isPaused ? "polite" : "off"}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onFocus={() => setIsFocusWithin(true)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) {
              setIsFocusWithin(false);
            }
          }}
          onKeyDown={handleHeroKeyDown}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className={cn(
            "relative w-full overflow-hidden select-none bg-background focus:outline-none",
            BANNER_HEIGHT,
          )}
        >
          {/* Stacked slides with 700ms crossfade opacity */}
          {heroEntries.map((entry, idx) => {
            const isSelected = idx === activeSlideIndex;
            const backdrop = entry.media.backdropUrl;
            const glow = entry.media.backdropUrl || entry.media.posterUrl;

            return (
              <div
                key={entry.id}
                aria-hidden={!isSelected}
                className={cn(
                  "absolute inset-0 transition-opacity duration-700 ease-in-out pointer-events-none",
                  isSelected ? "opacity-100 z-0" : "opacity-0 -z-10",
                )}
              >
                {/* Ambient glow (hidden in stealth mode) */}
                {!hidePosters && glow && (
                  <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
                    <PosterImage
                      src={glow}
                      title=""
                      fallback="none"
                      sizes="10vw"
                      className="w-full h-full object-cover blur-3xl scale-150 opacity-10 dark:opacity-25"
                    />
                  </div>
                )}

                {/* Visible full-width backdrop artwork */}
                {!hidePosters && backdrop && (
                  <div className="absolute inset-0 w-full">
                    <PosterImage
                      src={backdrop}
                      title={entry.media.title}
                      mediaType={entry.media.mediaType}
                      priority={idx === 0}
                      loading={idx === 0 ? "eager" : "lazy"}
                      sizes="100vw"
                      className="object-cover opacity-80"
                      style={{ objectPosition: "center 25%" }}
                      fallback="none"
                    />
                  </div>
                )}
              </div>
            );
          })}

          {/* Vignette overlay & bottom fade shared with detail page banner */}
          <BannerVignette />

          {/* Left scrim limited to left 55% of the hero (from-background/85 via-background/50 to-transparent, lg and up only) */}
          <div
            aria-hidden="true"
            className="hidden lg:block absolute inset-y-0 left-0 w-[55%] bg-linear-to-r from-background/85 via-background/50 to-transparent pointer-events-none z-10"
          />

          {/* Mobile bottom-to-top scrim so text stays readable on smaller screens */}
          <div
            aria-hidden="true"
            className="lg:hidden absolute inset-0 bg-linear-to-t from-background via-background/60 to-transparent pointer-events-none z-10"
          />

          {/* Hero Content Overlay (contained in left half, never overlapping right subject) */}
          <div className="relative max-w-7xl mx-auto px-4 sm:px-8 h-full flex flex-col justify-end pb-8 sm:pb-10 pt-6 z-20 pointer-events-none">
            <div className="max-w-xl lg:max-w-2xl pointer-events-auto">
              {/* Animated text block: short fade and 8px translate */}
              <div key={heroEntry.id} className="animate-hero-text">
                {/* Quiet inline counts line above badge row */}
                <div className="text-xs sm:text-sm text-muted-foreground mb-3 font-normal hero-text-shadow">
                  {myCompleted.length} done · {myActive.length} active · {myQueue.length} queued
                </div>

                {/* Status and Type row */}
                <div className="flex items-center gap-2 mb-3 hero-text-shadow">
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
                  <p className="mt-3 text-xs sm:text-sm text-muted-foreground line-clamp-2 max-w-xl leading-relaxed font-normal hero-text-shadow">
                    {heroEntry.media.summary}
                  </p>
                )}

                {/* Primary Action Buttons */}
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
                          {heroEntry.media.mediaType === "game"
                            ? "Start Playing"
                            : "Start Watching"}
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
              </div>

              {/* Segmented Progress Bar: shown only when heroEntries.length > 1 */}
              {heroEntries.length > 1 && (
                <div className="mt-6 flex items-center gap-3 max-w-md">
                  <div className="flex-1 flex items-center gap-2">
                    {heroEntries.map((entry, idx) => {
                      const isCompleted = idx < activeSlideIndex;
                      const isActive = idx === activeSlideIndex;

                      return (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => jumpToSlide(idx)}
                          aria-label={`Show ${entry.media.title}`}
                          className="relative flex-1 py-2 group cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-full"
                        >
                          <div className="h-1 w-full rounded-full bg-foreground/25 overflow-hidden">
                            {isCompleted ? (
                              <div className="h-full w-full bg-brand rounded-full" />
                            ) : isActive ? (
                              prefersReducedMotion ? (
                                <div className="h-full w-full bg-brand rounded-full" />
                              ) : (
                                <div
                                  key={`${activeSlideIndex}-${timerVersion}`}
                                  className="h-full bg-brand rounded-full animate-hero-progress"
                                  style={{
                                    animationPlayState: isPaused ? "paused" : "running",
                                  }}
                                  onAnimationEnd={handleAnimationEnd}
                                />
                              )
                            ) : (
                              <div className="h-full w-0 bg-brand rounded-full" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {!prefersReducedMotion && (
                    <button
                      type="button"
                      onClick={() => setIsManuallyPaused((p) => !p)}
                      aria-label={isManuallyPaused ? "Play slideshow" : "Pause slideshow"}
                      className="size-7 rounded-full bg-card/60 hover:bg-card border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition cursor-pointer shrink-0 shadow-xs focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      {isManuallyPaused ? (
                        <Play className="size-3 fill-current" />
                      ) : (
                        <Pause className="size-3 fill-current" />
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Logged-in Empty Hero fallback (no bottom border) */}
      {!heroEntry && currentUser && (
        <section
          className={cn(
            "relative w-full px-4 sm:px-8 bg-background flex items-center",
            BANNER_HEIGHT,
          )}
        >
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

      {/* Logged-out Hero fallback (no bottom border) */}
      {!currentUser && (
        <section
          className={cn(
            "relative w-full px-4 sm:px-8 bg-background flex items-center",
            BANNER_HEIGHT,
          )}
        >
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
        {allSectionsHidden ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Everything is hidden.{" "}
            <Link
              href="/settings"
              className="font-semibold text-foreground underline underline-offset-4 hover:opacity-80"
            >
              Turn sections back on in Settings.
            </Link>
          </div>
        ) : (
          <>
            {/* 2. Squad Activity */}
            {isSquadVisible && (
              <section className="space-y-4">
                {squadActivity.length > 0 ? (
                  <ScrollRow
                    title={
                      <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                        Squad Activity
                      </h2>
                    }
                    action={
                      <span className="text-xs text-muted-foreground">
                        {squadActivity.length} recent
                      </span>
                    }
                  >
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

                        {/* Middle content: Poster + Title + Rating + Review */}
                        <div className="flex gap-3 items-start min-w-0">
                          <div className="relative w-14 h-20 rounded-md overflow-hidden bg-muted border border-border/50 shrink-0">
                            <Link
                              href={getMediaHref(activity.media)}
                              className="absolute inset-0 z-10"
                            />
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
                  </ScrollRow>
                ) : (
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-4">
                      Squad Activity
                    </h2>
                    <div className="p-6 rounded-lg bg-card border border-border text-center text-sm text-muted-foreground max-w-xl">
                      No recent squad activity yet. When your squad logs movies, shows, or games,
                      their latest milestones will appear here.
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* 3. Jump Back In Shelf (ScrollRow, no underline rule) */}
            {isJumpVisible && myActive.length > 0 && (
              <section className="space-y-4">
                <ScrollRow
                  title={
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                        Jump Back In
                      </h2>
                      <span className="text-xs text-muted-foreground ml-1">
                        ({myActive.length})
                      </span>
                    </div>
                  }
                  action={
                    <Link
                      href="/library"
                      className="text-xs font-semibold text-muted-foreground hover:text-foreground transition flex items-center gap-1"
                    >
                      <span>View library</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  }
                >
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
                </ScrollRow>
              </section>
            )}

            {/* 4. Up Next in Queue Shelf (ScrollRow, no underline rule) */}
            {isQueueVisible && displayedQueue.length > 0 && (
              <section className="space-y-4">
                <ScrollRow
                  title={
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-status-queue" />
                      <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                        Up Next in Queue
                      </h2>
                      <span className="text-xs text-muted-foreground ml-1">
                        ({displayedQueue.length})
                      </span>
                    </div>
                  }
                  action={
                    <Link
                      href="/library"
                      className="text-xs font-semibold text-muted-foreground hover:text-foreground transition flex items-center gap-1"
                    >
                      <span>View all</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  }
                >
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
                </ScrollRow>
              </section>
            )}

            {/* 5. Trending This Week Shelf (ScrollRow, no underline rule) */}
            {isTrendingVisible && (
              <section className="space-y-4 pt-2">
                <ScrollRow
                  title={
                    <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                      Trending This Week
                    </h2>
                  }
                  action={
                    <div className="flex items-center gap-1.5 p-1 bg-muted rounded-lg border border-border">
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
                  }
                >
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

                      {/* Title & Year only */}
                      <div className="mt-2 space-y-0.5">
                        <Link
                          href={getMediaHref(item)}
                          className="text-xs sm:text-sm font-semibold text-foreground hover:opacity-80 transition line-clamp-2 leading-snug block"
                        >
                          {item.title}
                        </Link>
                        {item.releaseYear && (
                          <span className="text-xs text-muted-foreground block">
                            {item.releaseYear}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </ScrollRow>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
