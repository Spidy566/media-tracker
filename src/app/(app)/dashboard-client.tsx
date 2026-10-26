"use client";

import { useMutation } from "@tanstack/react-query";
import {
  ArrowUpRight,
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
import type { MediaStatus } from "@/components/media-card";
import { PosterImage } from "@/components/poster-image";
import { ScrollRow } from "@/components/scroll-row";
import { logEntryApi } from "@/lib/api-entries";
import { openSearchModal } from "@/lib/auth-events";
import { cn } from "@/lib/utils";
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
  recentEntries: Entry[];
  trendingMovies: UnifiedSearchResult[];
  trendingTv: UnifiedSearchResult[];
  trendingGames: UnifiedSearchResult[];
  initialEntries?: Entry[];
}

function getMediaHref(media: { externalId: string; mediaType: string }) {
  const parts = media.externalId.split(":");
  const rawId = parts[parts.length - 1];
  return `/media/${media.mediaType}/${rawId}`;
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
      return <Tv className="size-3.5" />;
    case "game":
      return <Gamepad2 className="size-3.5" />;
    default:
      return <Film className="size-3.5" />;
  }
}

function getStatusBadgeClasses(status: string) {
  switch (status) {
    case "doing":
      return "bg-[#D4580F]/20 text-[#D4580F] border-[#D4580F]/30";
    case "want_to":
      return "bg-[#3F6FD8]/20 text-[#3F6FD8] border-[#3F6FD8]/30";
    case "done":
      return "bg-[#1E9467]/20 text-[#1E9467] border-[#1E9467]/30";
    case "dropped":
      return "bg-[#6B6B76]/20 text-[#6B6B76] border-[#6B6B76]/30";
    default:
      return "bg-white/10 text-white/80 border-white/15";
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
  libraryCounts,
  activeItems,
  recentEntries,
  trendingMovies,
  trendingTv,
  trendingGames,
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
      <div className="w-full px-6 sm:px-8 md:px-10 lg:px-12 py-8 space-y-10 sm:space-y-12">
        {/* 1. TOP OVERVIEW PULSE (Stats Strip) */}
        <section aria-label="Library Overview Statistics">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* In Progress Card */}
            <Link
              href="/shelf?status=doing"
              className="group relative p-4 sm:p-5 rounded-2xl bg-[#141418]/90 hover:bg-[#1a1a20] border border-white/10 hover:border-white/20 backdrop-blur-md transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[12px] sm:text-[13px] font-medium text-neutral-400 group-hover:text-neutral-300 transition-colors flex items-center gap-2">
                  <span className="size-2 rounded-full bg-status-doing shadow-xs shadow-status-doing animate-pulse shrink-0" />
                  <span>In Progress</span>
                </span>
                <ArrowUpRight className="size-4 text-neutral-600 group-hover:text-white transition-colors" />
              </div>
              <div className="mt-3">
                <span className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
                  {libraryCounts.doingCount}
                </span>
                <span className="block text-[11px] sm:text-[12px] text-neutral-500 mt-0.5">
                  Currently active
                </span>
              </div>
            </Link>

            {/* In Queue Card */}
            <Link
              href="/shelf?status=want_to"
              className="group relative p-4 sm:p-5 rounded-2xl bg-[#141418]/90 hover:bg-[#1a1a20] border border-white/10 hover:border-white/20 backdrop-blur-md transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[12px] sm:text-[13px] font-medium text-neutral-400 group-hover:text-neutral-300 transition-colors flex items-center gap-2">
                  <span className="size-2 rounded-full bg-status-queue shadow-xs shadow-status-queue shrink-0" />
                  <span>In Queue</span>
                </span>
                <ArrowUpRight className="size-4 text-neutral-600 group-hover:text-white transition-colors" />
              </div>
              <div className="mt-3">
                <span className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
                  {libraryCounts.queueCount}
                </span>
                <span className="block text-[11px] sm:text-[12px] text-neutral-500 mt-0.5">
                  Up next to watch/play
                </span>
              </div>
            </Link>

            {/* Completed Card */}
            <Link
              href="/shelf?status=done"
              className="group relative p-4 sm:p-5 rounded-2xl bg-[#141418]/90 hover:bg-[#1a1a20] border border-white/10 hover:border-white/20 backdrop-blur-md transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[12px] sm:text-[13px] font-medium text-neutral-400 group-hover:text-neutral-300 transition-colors flex items-center gap-2">
                  <span className="size-2 rounded-full bg-status-done shadow-xs shadow-status-done shrink-0" />
                  <span>Completed</span>
                </span>
                <ArrowUpRight className="size-4 text-neutral-600 group-hover:text-white transition-colors" />
              </div>
              <div className="mt-3">
                <span className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
                  {libraryCounts.doneCount}
                </span>
                <span className="block text-[11px] sm:text-[12px] text-neutral-500 mt-0.5">
                  Finished library
                </span>
              </div>
            </Link>

            {/* Total Logged Card */}
            <Link
              href="/shelf"
              className="group relative p-4 sm:p-5 rounded-2xl bg-[#141418]/90 hover:bg-[#1a1a20] border border-white/10 hover:border-white/20 backdrop-blur-md transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[12px] sm:text-[13px] font-medium text-neutral-400 group-hover:text-neutral-300 transition-colors flex items-center gap-2">
                  <span className="size-2 rounded-full bg-brand shadow-xs shadow-brand/40 shrink-0" />
                  <span>Total Logged</span>
                </span>
                <ArrowUpRight className="size-4 text-neutral-600 group-hover:text-white transition-colors" />
              </div>
              <div className="mt-3">
                <span className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
                  {libraryCounts.totalCount}
                </span>
                <span className="block text-[11px] sm:text-[12px] text-neutral-500 mt-0.5">
                  Across all media
                </span>
              </div>
            </Link>
          </div>
        </section>

        {/* 2. "CONTINUE" / "JUMP BACK IN" ROW */}
        <section aria-label="Continue Watching or Playing">
          {activeItems.length > 0 ? (
            <ScrollRow
              title={
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2.5">
                  <Play className="size-4.5 fill-status-doing text-status-doing stroke-0" />
                  <span>Continue</span>
                  <span className="text-sm font-normal text-neutral-400">
                    ({activeItems.length})
                  </span>
                </h2>
              }
              action={
                <Link
                  href="/shelf?status=doing"
                  className="text-[13px] font-medium text-neutral-300 hover:text-white transition flex items-center gap-1"
                >
                  <span>View all in progress</span>
                  <span className="text-neutral-400">&rarr;</span>
                </Link>
              }
            >
              {activeItems.map((entry) => (
                <div
                  key={entry.id}
                  className="w-48 sm:w-50 shrink-0 snap-start flex flex-col group/card select-none"
                >
                  {/* Poster Thumbnail */}
                  <div className="relative aspect-2/3 w-full rounded-xl overflow-hidden bg-[#16161e] border border-white/10 shadow-sm">
                    <Link
                      href={getMediaHref(entry.media)}
                      className="absolute inset-0 z-10 cursor-pointer"
                      aria-label={`View details for ${entry.media.title}`}
                    />

                    <PosterImage
                      src={entry.media.posterUrl}
                      title={entry.media.title}
                      mediaType={entry.media.mediaType}
                      releaseYear={entry.media.releaseYear}
                      sizes="200px"
                      className="object-cover transition duration-300 group-hover/card:scale-105 pointer-events-none"
                    />

                    {/* Media Type Badge on Poster */}
                    <div className="absolute top-2.5 left-2.5 z-20 pointer-events-none">
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-black/70 text-neutral-200 border border-white/15 backdrop-blur-md flex items-center gap-1 capitalize">
                        {getMediaTypeIcon(entry.media.mediaType)}
                        <span>{getMediaTypeLabel(entry.media.mediaType)}</span>
                      </span>
                    </div>

                    {/* Hover Scrim with Quick Action */}
                    <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/20 to-black/30 opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 pointer-events-none z-20 flex flex-col justify-end p-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setQuickStatus({ media: entry.media, status: "done" });
                        }}
                        disabled={isPending}
                        title="Mark as completed"
                        className="pointer-events-auto w-full py-1.5 px-3 rounded-lg bg-brand hover:opacity-95 text-brand-foreground text-[12px] font-semibold transition cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                      >
                        <Check className="size-3.5 stroke-[2.5]" />
                        <span>Mark Done</span>
                      </button>
                    </div>
                  </div>

                  {/* Title & Metadata */}
                  <div className="mt-2.5 space-y-0.5">
                    <Link
                      href={getMediaHref(entry.media)}
                      className="text-[14px] sm:text-[15px] font-medium text-foreground hover:text-white transition line-clamp-1 leading-snug block"
                    >
                      {entry.media.title}
                    </Link>
                    <div className="flex items-center justify-between text-[12px] text-neutral-400">
                      <span>{entry.media.releaseYear || "TBA"}</span>
                      <button
                        type="button"
                        onClick={() => setQuickStatus({ media: entry.media, status: "done" })}
                        disabled={isPending}
                        className="text-neutral-400 hover:text-status-done text-[11px] font-medium flex items-center gap-1 transition cursor-pointer"
                      >
                        <Check className="size-3" />
                        <span>Done</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </ScrollRow>
          ) : (
            /* Tasteful empty prompt when nothing is in progress */
            <div className="w-full p-6 sm:p-7 rounded-2xl border border-white/10 bg-[#141418]/60 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-[15px] font-medium text-white">Nothing currently in progress</p>
                <p className="text-[13px] text-neutral-400 max-w-lg">
                  Pick something from your queue to start watching or playing, or explore new
                  titles.
                </p>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <Link
                  href="/shelf?status=want_to"
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-[13px] font-medium border border-white/10 transition cursor-pointer flex items-center gap-1.5"
                >
                  <Bookmark className="size-3.5" />
                  <span>Browse Queue</span>
                </Link>
                <Link
                  href="/discover"
                  className="px-4 py-2 rounded-xl bg-brand hover:bg-brand/90 text-brand-foreground text-[13px] font-semibold transition cursor-pointer flex items-center gap-1.5"
                >
                  <Compass className="size-3.5" />
                  <span>Discover</span>
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* 3. "LAST TRACKED" / RECENT ACTIVITY */}
        <section aria-label="Recent Activity">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2.5">
              <Clock className="size-4.5 text-neutral-400" />
              <span>Last Tracked</span>
            </h2>

            {recentEntries.length > 0 && (
              <Link
                href="/shelf"
                className="text-[13px] font-medium text-neutral-300 hover:text-white transition flex items-center gap-1"
              >
                <span>Full history</span>
                <span className="text-neutral-400">&rarr;</span>
              </Link>
            )}
          </div>

          {recentEntries.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
              {recentEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="group relative rounded-2xl bg-[#141418]/90 hover:bg-[#1a1a20] border border-white/10 hover:border-white/20 p-3.5 transition-all duration-200 flex gap-3.5 items-start"
                >
                  {/* Poster Thumbnail */}
                  <Link
                    href={getMediaHref(entry.media)}
                    className="w-16 h-24 shrink-0 rounded-xl overflow-hidden relative border border-white/10 bg-[#16161e] cursor-pointer"
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

                  {/* Information Details */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
                    <div>
                      {/* Status Badge + Relative Time */}
                      <div className="flex items-center justify-between gap-1.5 mb-1.5">
                        <span
                          className={cn(
                            "text-[10px] font-medium px-2 py-0.5 rounded-full border",
                            getStatusBadgeClasses(entry.status),
                          )}
                        >
                          {getStatusLabel(entry.status)}
                        </span>
                        <span className="text-[11px] text-neutral-500 font-mono">
                          {formatRelativeTime(entry.updatedAt)}
                        </span>
                      </div>

                      {/* Title */}
                      <Link
                        href={getMediaHref(entry.media)}
                        className="text-[14px] font-medium text-white hover:text-brand transition line-clamp-1 leading-snug block"
                        title={entry.media.title}
                      >
                        {entry.media.title}
                      </Link>

                      {/* Type and Year */}
                      <span className="text-[11px] text-neutral-400 capitalize block mt-0.5">
                        {entry.media.mediaType} • {entry.media.releaseYear || "TBA"}
                      </span>
                    </div>

                    {/* Star Rating and Note if present */}
                    <div className="mt-2 space-y-1">
                      {entry.rating ? (
                        <div className="flex items-center gap-1 text-amber-400 text-[11px] font-medium">
                          <Star className="size-3 fill-amber-400" />
                          <span>{entry.rating}/5</span>
                        </div>
                      ) : null}

                      {entry.reviewNote ? (
                        <p className="text-[11px] text-neutral-300 italic line-clamp-1 border-l-2 border-white/15 pl-1.5">
                          &ldquo;{entry.reviewNote}&rdquo;
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="w-full p-6 rounded-2xl border border-white/10 bg-[#141418]/60 text-center">
              <p className="text-[14px] text-neutral-400">
                No recent activity yet. Log your first movie, TV show, or game to start tracking.
              </p>
            </div>
          )}
        </section>

        {/* 4. "TRENDING & NEW RELEASES THIS WEEK" */}
        <section aria-label="Trending and New Releases">
          <ScrollRow
            title={
              <div className="flex flex-wrap items-center gap-4">
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
                  Trending This Week
                </h2>

                {/* Filter chips (Movies / TV / Games) */}
                <div className="flex items-center gap-1.5 p-1 bg-white/4 rounded-full border border-white/8">
                  <button
                    type="button"
                    onClick={() => setActiveTrendingTab("movies")}
                    className={cn(
                      "px-3.5 py-1 rounded-full text-[13px] font-medium transition-all cursor-pointer",
                      activeTrendingTab === "movies"
                        ? "bg-white/15 text-white border border-white/20 shadow-xs"
                        : "text-neutral-400 hover:text-white",
                    )}
                  >
                    Movies
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTrendingTab("tv")}
                    className={cn(
                      "px-3.5 py-1 rounded-full text-[13px] font-medium transition-all cursor-pointer",
                      activeTrendingTab === "tv"
                        ? "bg-white/15 text-white border border-white/20 shadow-xs"
                        : "text-neutral-400 hover:text-white",
                    )}
                  >
                    TV Series
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTrendingTab("games")}
                    className={cn(
                      "px-3.5 py-1 rounded-full text-[13px] font-medium transition-all cursor-pointer",
                      activeTrendingTab === "games"
                        ? "bg-white/15 text-white border border-white/20 shadow-xs"
                        : "text-neutral-400 hover:text-white",
                    )}
                  >
                    Games
                  </button>
                </div>
              </div>
            }
            action={
              <Link
                href="/discover"
                className="text-[13px] font-medium text-neutral-300 hover:text-white transition flex items-center gap-1"
              >
                <span>Explore all</span>
                <span className="text-neutral-400">&rarr;</span>
              </Link>
            }
          >
            {currentTrendingItems.slice(0, 10).map((item) => (
              <div
                key={item.externalId}
                className="w-48 sm:w-50 shrink-0 snap-start flex flex-col group/card select-none"
              >
                {/* Poster Container */}
                <div className="relative aspect-2/3 w-full rounded-xl overflow-hidden bg-[#16161e] border border-white/8 shadow-sm">
                  <Link
                    href={getMediaHref(item)}
                    className="absolute inset-0 z-10 cursor-pointer"
                    aria-label={`View ${item.title}`}
                  />

                  <PosterImage
                    src={item.posterUrl}
                    title={item.title}
                    mediaType={item.mediaType}
                    releaseYear={item.releaseYear}
                    sizes="200px"
                    className="object-cover transition duration-300 group-hover/card:scale-105 pointer-events-none"
                  />

                  {/* Poster Hover Scrim */}
                  <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/20 to-black/30 opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 pointer-events-none z-20 flex flex-col justify-between p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-black/60 text-neutral-200 border border-white/15 backdrop-blur-md capitalize">
                        {item.mediaType}
                      </span>
                    </div>

                    {/* Quick "+ Queue" Button */}
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setQuickStatus({ media: item, status: "want_to" });
                        }}
                        disabled={isPending}
                        title="Add to queue"
                        className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 hover:bg-brand hover:text-brand-foreground text-white backdrop-blur-md border border-white/25 text-[12px] font-medium transition cursor-pointer shadow-md"
                      >
                        <Bookmark className="size-3.5" />
                        <span>Queue</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Title & Metadata */}
                <div className="mt-2.5 space-y-0.5">
                  <Link
                    href={getMediaHref(item)}
                    className="text-[14px] sm:text-[15px] font-medium text-foreground hover:text-white transition line-clamp-1 leading-snug block"
                  >
                    {item.title}
                  </Link>
                  <div className="flex items-center gap-1.5 text-[13px] text-neutral-300 font-normal">
                    <span>{getMediaTypeLabel(item.mediaType)}</span>
                    {item.releaseYear && (
                      <>
                        <span className="text-neutral-500">•</span>
                        <span>{item.releaseYear}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* "+ Add something" card at the end of the trending row */}
            <button
              type="button"
              onClick={openSearchModal}
              className="w-48 sm:w-50 aspect-2/3 rounded-xl border border-dashed border-white/20 hover:border-brand/60 bg-white/2 hover:bg-white/5 transition-all duration-200 flex flex-col items-center justify-center gap-3 text-neutral-400 hover:text-white cursor-pointer group/add select-none shrink-0 snap-start"
            >
              <div className="size-11 rounded-full bg-white/6 group-hover/add:bg-brand/20 group-hover/add:text-brand flex items-center justify-center transition-colors">
                <Plus className="size-5 stroke-2" />
              </div>
              <div className="text-center px-3">
                <span className="text-[14px] font-medium block text-foreground group-hover/add:text-white">
                  + Add something
                </span>
                <span className="text-[13px] text-neutral-400 block mt-0.5">
                  Search full catalog
                </span>
              </div>
            </button>
          </ScrollRow>
        </section>
      </div>
    </div>
  );
}
