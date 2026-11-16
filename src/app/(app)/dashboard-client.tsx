"use client";

import { useMutation } from "@tanstack/react-query";
import {
  Bookmark,
  Check,
  Clock,
  Compass,
  Film,
  Gamepad2,
  Play,
  Plus,
  Star,
  Tv,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import type { UnifiedSearchResult } from "@/app/api/search/route";
import { MediaCard, type MediaStatus } from "@/components/media-card";
import { PosterImage } from "@/components/poster-image";
import { ScrollRow } from "@/components/scroll-row";
import { logEntryApi } from "@/lib/api-entries";
import { openSearchModal } from "@/lib/auth-events";
import type { HomeSection } from "@/lib/home-prefs";
import { cn, getMediaHref } from "@/lib/utils";
import type { Entry, EntryUser } from "@/types/entry";

export interface LibraryCounts {
  doingCount: number;
  queueCount: number;
  doneCount: number;
  totalCount: number;
}

interface DashboardClientProps {
  currentUser: EntryUser | null;
  libraryCounts: LibraryCounts;
  activeItems: Entry[];
  queueItems?: Entry[];
  recentEntries: Entry[];
  trendingMovies: UnifiedSearchResult[];
  trendingTv: UnifiedSearchResult[];
  trendingGames: UnifiedSearchResult[];
  initialEntries?: Entry[];
  hiddenSections?: HomeSection[];
}

function getMediaTypeLabel(type: string) {
  switch (type) {
    case "tv":
      return "TV Series";
    case "game":
      return "Game";
    default:
      return "Movie";
  }
}

function getMediaTypeIcon(type: string) {
  switch (type) {
    case "tv":
      return <Tv className="size-3" />;
    case "game":
      return <Gamepad2 className="size-3" />;
    default:
      return <Film className="size-3" />;
  }
}

function getStatusBadgeClasses(status: string) {
  switch (status) {
    case "doing":
      return "bg-status-doing/15 text-status-doing border-status-doing/30";
    case "want_to":
      return "bg-status-queue/15 text-status-queue border-status-queue/30";
    case "done":
      return "bg-status-done/15 text-status-done border-status-done/30";
    case "dropped":
      return "bg-status-dropped/15 text-status-dropped border-status-dropped/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "doing":
      return "In Progress";
    case "want_to":
      return "In Queue";
    case "done":
      return "Completed";
    case "dropped":
      return "Dropped";
    default:
      return status;
  }
}

function formatRelativeTime(dateInput: string | Date): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return "Yesterday";
  if (diffInDays < 7) return `${diffInDays}d ago`;
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) return `${diffInWeeks}w ago`;
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths}mo ago`;
  return `${Math.floor(diffInDays / 365)}y ago`;
}

export function DashboardClient({
  currentUser,
  libraryCounts,
  activeItems,
  queueItems = [],
  recentEntries,
  trendingMovies,
  trendingTv,
  trendingGames,
  hiddenSections = [],
}: DashboardClientProps) {
  const router = useRouter();
  const [activeTrendingTab, setActiveTrendingTab] = useState<"movies" | "tv" | "games">("movies");

  // Quick 1-click status mutation
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

  const currentTrendingItems =
    activeTrendingTab === "movies"
      ? trendingMovies
      : activeTrendingTab === "tv"
        ? trendingTv
        : trendingGames;

  return (
    <div className="w-full min-h-screen bg-background text-foreground flex flex-col pb-24">
      <div className="w-full px-4 sm:px-6 md:px-8 lg:px-12 py-8 space-y-10 sm:space-y-12">
        {/* 1. DASHBOARD HEADER + COMPACT PULSE STRIP */}
        <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground font-sans">
                Dashboard
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Welcome back{currentUser?.displayName ? `, ${currentUser.displayName}` : ""}.
              </p>
            </div>

            <button
              type="button"
              onClick={openSearchModal}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-card hover:bg-muted border border-border text-foreground text-xs font-semibold transition cursor-pointer shadow-2xs hover:border-border/80 self-start sm:self-auto shrink-0"
            >
              <Plus className="size-3.5 text-brand stroke-[2.5]" />
              <span>Log Media</span>
              <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-muted/60 border border-border rounded-md">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Live Counts Pulse Strip */}
          <div className="flex items-center gap-1 sm:gap-1.5 p-1 rounded-2xl bg-card border border-border overflow-x-auto scrollbar-none shadow-2xs self-start lg:self-auto shrink-0">
            <Link
              href="/library?status=doing"
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-muted/70 text-xs transition cursor-pointer shrink-0"
            >
              <span className="size-2 rounded-full bg-status-doing shadow-xs shadow-status-doing animate-pulse shrink-0" />
              <span className="text-muted-foreground font-medium">In Progress</span>
              <span className="text-foreground font-semibold font-mono tabular-nums">
                {libraryCounts.doingCount}
              </span>
            </Link>
            <div className="w-px h-3.5 bg-border shrink-0" />
            <Link
              href="/library?status=want_to"
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-muted/70 text-xs transition cursor-pointer shrink-0"
            >
              <span className="size-2 rounded-full bg-status-queue shadow-xs shadow-status-queue shrink-0" />
              <span className="text-muted-foreground font-medium">Queue</span>
              <span className="text-foreground font-semibold font-mono tabular-nums">
                {libraryCounts.queueCount}
              </span>
            </Link>
            <div className="w-px h-3.5 bg-border shrink-0" />
            <Link
              href="/library?status=done"
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-muted/70 text-xs transition cursor-pointer shrink-0"
            >
              <span className="size-2 rounded-full bg-status-done shadow-xs shadow-status-done shrink-0" />
              <span className="text-muted-foreground font-medium">Done</span>
              <span className="text-foreground font-semibold font-mono tabular-nums">
                {libraryCounts.doneCount}
              </span>
            </Link>
            <div className="w-px h-3.5 bg-border shrink-0" />
            <Link
              href="/library"
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-muted/70 text-xs transition cursor-pointer shrink-0"
            >
              <span className="size-2 rounded-full bg-brand shadow-xs shadow-brand/40 shrink-0" />
              <span className="text-muted-foreground font-medium">Total</span>
              <span className="text-foreground font-semibold font-mono tabular-nums">
                {libraryCounts.totalCount}
              </span>
            </Link>
          </div>
        </section>

        {/* 2. SECTION 1: JUMP BACK IN */}
        {!hiddenSections.includes("jump") && (
          <section aria-label="Continue Watching or Playing">
            {activeItems.length > 0 ? (
              <ScrollRow
                title={
                  <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2.5">
                    <Play className="size-4.5 fill-status-doing text-status-doing stroke-0" />
                    <span>Jump Back In</span>
                    <span className="text-sm font-normal text-muted-foreground font-mono tabular-nums">
                      ({activeItems.length})
                    </span>
                  </h2>
                }
                action={
                  <Link
                    href="/library?status=doing"
                    className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition flex items-center gap-1"
                  >
                    <span>View all</span>
                    <span className="text-muted-foreground">&rarr;</span>
                  </Link>
                }
              >
                {activeItems.map((entry) => (
                  <div
                    key={entry.id}
                    className="w-72 sm:w-88 aspect-16/10 rounded-2xl overflow-hidden bg-card border border-border group relative shrink-0 snap-start select-none shadow-xs hover:shadow-md transition-all duration-200"
                  >
                    {/* Click to details */}
                    <Link
                      href={getMediaHref(entry.media)}
                      className="absolute inset-0 z-10 cursor-pointer"
                      aria-label={`View details for ${entry.media.title}`}
                    />

                    {/* Backdrop / Poster Image */}
                    <PosterImage
                      src={entry.media.backdropUrl || entry.media.posterUrl}
                      title={entry.media.title}
                      mediaType={entry.media.mediaType}
                      releaseYear={entry.media.releaseYear}
                      className="object-cover transition duration-500 group-hover:scale-105 pointer-events-none"
                    />

                    {/* Dark bottom gradient scrim */}
                    <div className="absolute inset-0 bg-linear-to-t from-black/95 via-black/40 to-transparent pointer-events-none z-10" />

                    {/* Top-left: Media Type Pill + Release Year */}
                    <div className="absolute top-3 left-3 z-20 pointer-events-none flex items-center gap-1.5">
                      <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-black/60 text-foreground border border-white/10 backdrop-blur-md flex items-center gap-1">
                        {getMediaTypeIcon(entry.media.mediaType)}
                        <span>{getMediaTypeLabel(entry.media.mediaType)}</span>
                      </span>
                      {entry.media.releaseYear && (
                        <span className="text-[11px] font-mono tabular-nums text-white/80 bg-black/50 px-2 py-0.5 rounded-full backdrop-blur-md border border-white/10">
                          {entry.media.releaseYear}
                        </span>
                      )}
                    </div>

                    {/* Bottom Content & 1-click Mark Done */}
                    <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-4 z-20 flex items-end justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-sm sm:text-base font-semibold text-white truncate drop-shadow-sm group-hover:text-brand transition-colors">
                          {entry.media.title}
                        </h3>
                        <span className="text-[11px] text-neutral-300 font-mono flex items-center gap-1.5 mt-0.5">
                          <span className="size-1.5 rounded-full bg-status-doing shrink-0" />
                          <span>In Progress</span>
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setQuickStatus({ media: entry.media, status: "done" });
                        }}
                        disabled={isPending}
                        title="Mark as completed"
                        className="pointer-events-auto shrink-0 px-3 py-1.5 rounded-xl bg-brand hover:opacity-90 text-brand-foreground text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-md"
                      >
                        <Check className="size-3.5 stroke-[2.5]" />
                        <span>Mark Done</span>
                      </button>
                    </div>
                  </div>
                ))}
              </ScrollRow>
            ) : (
              /* Quiet, single-line empty banner */
              <div className="w-full p-4 sm:p-5 rounded-2xl border border-border bg-card/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground shrink-0">
                    <Play className="size-3.5 fill-current stroke-0" />
                  </div>
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    Nothing in progress right now. Jump back in from your queue or discover new
                    titles.
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <Link
                    href="/library?status=want_to"
                    className="px-3 py-1.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-medium border border-border transition cursor-pointer flex items-center gap-1"
                  >
                    <Bookmark className="size-3" />
                    <span>Browse Queue</span>
                  </Link>
                  <Link
                    href="/explore"
                    className="px-3 py-1.5 rounded-xl bg-card hover:bg-muted text-foreground text-xs font-medium border border-border transition cursor-pointer flex items-center gap-1"
                  >
                    <Compass className="size-3" />
                    <span>Explore</span>
                  </Link>
                </div>
              </div>
            )}
          </section>
        )}

        {/* 3. SECTION 2: UP NEXT IN QUEUE */}
        {!hiddenSections.includes("queue") && queueItems.length > 0 && (
          <section aria-label="Up Next in Queue">
            <ScrollRow
              title={
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2.5">
                  <Bookmark className="size-4.5 text-status-queue" />
                  <span>Up Next in Queue</span>
                  <span className="text-sm font-normal text-muted-foreground font-mono tabular-nums">
                    ({queueItems.length})
                  </span>
                </h2>
              }
              action={
                <Link
                  href="/library?status=want_to"
                  className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition flex items-center gap-1"
                >
                  <span>View all queue</span>
                  <span className="text-muted-foreground">&rarr;</span>
                </Link>
              }
            >
              {queueItems.map((entry) => (
                <div
                  key={entry.id}
                  className="w-40 sm:w-44 shrink-0 snap-start flex flex-col group select-none"
                >
                  <MediaCard
                    title={entry.media.title}
                    mediaType={entry.media.mediaType}
                    posterUrl={entry.media.posterUrl}
                    releaseYear={entry.media.releaseYear}
                    rating={entry.rating}
                    currentStatus={entry.status}
                    allowedStatuses={["doing", "done"]}
                    onClick={() => router.push(getMediaHref(entry.media))}
                    onQuickStatus={(status) => setQuickStatus({ media: entry.media, status })}
                  />
                </div>
              ))}
            </ScrollRow>
          </section>
        )}

        {/* 4. SECTION 3: RECENTLY LOGGED */}
        <section aria-label="Recently Logged Activity">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2.5">
              <Clock className="size-4.5 text-muted-foreground" />
              <span>Recently Logged</span>
            </h2>

            {recentEntries.length > 0 && (
              <Link
                href="/library"
                className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition flex items-center gap-1"
              >
                <span>Full history</span>
                <span className="text-muted-foreground">&rarr;</span>
              </Link>
            )}
          </div>

          {recentEntries.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {recentEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="group relative rounded-2xl bg-card hover:bg-muted/40 border border-border p-3.5 transition-all duration-200 flex gap-3.5 items-start shadow-2xs hover:shadow-xs"
                >
                  {/* Compact Poster */}
                  <Link
                    href={getMediaHref(entry.media)}
                    className="w-16 h-24 shrink-0 rounded-xl overflow-hidden relative border border-border bg-muted cursor-pointer"
                  >
                    <PosterImage
                      src={entry.media.posterUrl}
                      title={entry.media.title}
                      mediaType={entry.media.mediaType}
                      releaseYear={entry.media.releaseYear}
                      sizes="64px"
                      compact
                      className="object-cover transition duration-300 group-hover:scale-105"
                    />
                  </Link>

                  {/* Details */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
                    <div>
                      <div className="flex items-center justify-between gap-1.5 mb-1.5">
                        <span
                          className={cn(
                            "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                            getStatusBadgeClasses(entry.status),
                          )}
                        >
                          {getStatusLabel(entry.status)}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
                          {formatRelativeTime(entry.updatedAt)}
                        </span>
                      </div>

                      <Link
                        href={getMediaHref(entry.media)}
                        className="text-xs sm:text-sm font-semibold text-foreground hover:text-brand transition line-clamp-1 leading-snug block"
                        title={entry.media.title}
                      >
                        {entry.media.title}
                      </Link>

                      <span className="text-[11px] text-muted-foreground capitalize block mt-0.5 font-mono">
                        {entry.media.mediaType === "tv" ? "TV series" : entry.media.mediaType} •{" "}
                        <span className="tabular-nums">{entry.media.releaseYear || "TBA"}</span>
                      </span>
                    </div>

                    {(entry.rating || entry.reviewNote) && (
                      <div className="mt-2 space-y-1 pt-1.5 border-t border-border/50">
                        {entry.rating ? (
                          <div className="flex items-center gap-1 text-rating text-[11px] font-medium">
                            <Star className="size-3 fill-rating text-rating" />
                            <span className="font-mono tabular-nums">{entry.rating} / 5</span>
                          </div>
                        ) : null}

                        {entry.reviewNote ? (
                          <p className="text-[11px] text-muted-foreground italic line-clamp-1 border-l-2 border-border pl-1.5">
                            &ldquo;{entry.reviewNote}&rdquo;
                          </p>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="w-full p-6 rounded-2xl border border-border bg-card/60 text-center">
              <p className="text-xs sm:text-sm text-muted-foreground">
                No recent activity yet. Log your first movie, TV show, or game to start tracking.
              </p>
            </div>
          )}
        </section>

        {/* 5. SECTION 4: TRENDING THIS WEEK */}
        {!hiddenSections.includes("trending") && (
          <section aria-label="Trending This Week">
            <ScrollRow
              title={
                <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                  <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
                    Trending This Week
                  </h2>

                  {/* Segmented Tab Switcher */}
                  <div className="flex items-center bg-card border border-border p-1 rounded-xl shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setActiveTrendingTab("movies")}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer",
                        activeTrendingTab === "movies"
                          ? "bg-muted text-foreground font-semibold shadow-2xs"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Film className="size-3" />
                      <span>Movies</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTrendingTab("tv")}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer",
                        activeTrendingTab === "tv"
                          ? "bg-muted text-foreground font-semibold shadow-2xs"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Tv className="size-3" />
                      <span>TV Series</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTrendingTab("games")}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer",
                        activeTrendingTab === "games"
                          ? "bg-muted text-foreground font-semibold shadow-2xs"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Gamepad2 className="size-3" />
                      <span>Games</span>
                    </button>
                  </div>
                </div>
              }
              action={
                <Link
                  href="/explore"
                  className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition flex items-center gap-1"
                >
                  <span>Explore all</span>
                  <span className="text-muted-foreground">&rarr;</span>
                </Link>
              }
            >
              {currentTrendingItems.slice(0, 10).map((item) => (
                <div
                  key={item.externalId}
                  className="w-40 sm:w-44 shrink-0 snap-start flex flex-col group select-none"
                >
                  <MediaCard
                    title={item.title}
                    mediaType={item.mediaType}
                    posterUrl={item.posterUrl}
                    releaseYear={item.releaseYear}
                    allowedStatuses={["want_to", "doing", "done"]}
                    onClick={() => router.push(getMediaHref(item))}
                    onQuickStatus={(status) => setQuickStatus({ media: item, status })}
                  />
                </div>
              ))}

              {/* "+ Explore All" Card */}
              <Link
                href="/explore"
                className="w-40 sm:w-44 aspect-2/3 rounded-2xl border border-dashed border-border hover:border-brand/60 bg-card/40 hover:bg-muted transition-all duration-200 flex flex-col items-center justify-center gap-2.5 text-muted-foreground hover:text-foreground cursor-pointer group/add select-none shrink-0 snap-start"
              >
                <div className="size-10 rounded-full bg-muted group-hover/add:bg-brand/20 group-hover/add:text-brand flex items-center justify-center transition-colors">
                  <Compass className="size-4.5" />
                </div>
                <div className="text-center px-2">
                  <span className="text-xs font-semibold block text-foreground group-hover/add:text-brand">
                    Explore All
                  </span>
                  <span className="text-[11px] text-muted-foreground block mt-0.5">
                    Browse catalog
                  </span>
                </div>
              </Link>
            </ScrollRow>
          </section>
        )}
      </div>
    </div>
  );
}
