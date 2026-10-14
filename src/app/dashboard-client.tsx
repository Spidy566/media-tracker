"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Bookmark, Check, Compass, Film, Gamepad2, Info, Play, Tv } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { UnifiedSearchResult } from "@/app/api/search/route";
import type { MediaStatus } from "@/components/media-card";
import { MediaGrid } from "@/components/media-grid";
import { PosterImage } from "@/components/poster-image";
import { logEntryApi } from "@/lib/api-entries";
import type { Entry, EntryUser } from "@/types/entry";

interface DashboardClientProps {
  currentUser: EntryUser | null;
  users: EntryUser[];
  initialEntries: Entry[];
  trendingResults: UnifiedSearchResult[];
}

function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
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

export function DashboardClient({
  currentUser,
  users,
  initialEntries,
  trendingResults,
}: DashboardClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

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

  // Hero item: most recent in-progress title, fallback to first queue item
  const heroEntry = myActive[0] || myQueue[0] || null;
  const isHeroActive = heroEntry?.status === "doing";
  const heroBackdrop = heroEntry?.media.backdropUrl || heroEntry?.media.posterUrl;

  const handleHeroOneTap = () => {
    if (!heroEntry) return;
    // Schema has no episode/hours progress; one-tap advances status
    const targetStatus: MediaStatus = isHeroActive ? "done" : "doing";
    setQuickStatus({
      media: heroEntry.media,
      status: targetStatus,
    });
  };

  return (
    <div className="min-h-full bg-background text-foreground flex flex-col">
      {/* 1. Full-Width Cinematic Hero Banner */}
      {heroEntry && (
        <section className="relative w-full h-125 sm:h-140 lg:h-155 overflow-hidden select-none bg-background">
          {/* Backdrop Image */}
          {heroBackdrop && (
            <div className="absolute inset-0">
              <PosterImage
                src={heroBackdrop}
                title={heroEntry.media.title}
                mediaType={heroEntry.media.mediaType}
                priority
                sizes="100vw"
                className="object-cover object-center opacity-40 scale-102 transition duration-1000"
                fallback="none"
              />
            </div>
          )}

          {/* Cinematic Vignettes & Gradient Fades */}
          <div className="absolute inset-0 bg-linear-to-t from-background via-background/70 to-transparent" />
          <div className="absolute inset-0 bg-linear-to-r from-background via-background/60 to-transparent" />
          <div className="absolute inset-x-0 top-0 h-28 bg-linear-to-b from-background/80 to-transparent" />

          {/* Hero Content Overlay */}
          <div className="relative max-w-7xl mx-auto px-4 sm:px-8 h-full flex flex-col justify-end pb-12 sm:pb-16 pt-10">
            {/* Top Toolbar (Greeting) */}
            <div className="absolute top-6 left-4 sm:left-8 right-4 sm:right-8 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xs sm:text-sm font-semibold tracking-wide text-muted-foreground">
                  {getTimeGreeting()}, {currentUser?.displayName || "Friend"}
                </span>
                <span className="text-muted-foreground/50 hidden sm:inline">•</span>
                <span className="text-xs text-muted-foreground hidden sm:inline font-mono">
                  {myCompleted.length} done · {myActive.length} active · {myQueue.length} queued
                </span>
              </div>
            </div>

            {/* Media Meta Pill */}
            <div className="flex items-center gap-2 mb-3">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider uppercase border shadow-xs ${
                  isHeroActive
                    ? "bg-status-doing/15 text-status-doing border-status-doing/30"
                    : "bg-status-queue/15 text-status-queue border-status-queue/30"
                }`}
              >
                {isHeroActive ? "In Progress" : "Up Next in Queue"}
              </span>

              <span className="inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-wider text-muted-foreground bg-card/90 border border-border px-2.5 py-1 rounded-md backdrop-blur-md">
                {getMediaTypeIcon(heroEntry.media.mediaType)}
                <span>{heroEntry.media.mediaType}</span>
              </span>

              {heroEntry.media.releaseYear && (
                <span className="text-xs font-mono text-muted-foreground px-1">
                  {heroEntry.media.releaseYear}
                </span>
              )}
            </div>

            {/* Cinematic Big Title */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-foreground max-w-4xl leading-[1.08] drop-shadow-md">
              {heroEntry.media.title}
            </h1>

            {/* Summary Snippet */}
            {heroEntry.media.summary && (
              <p className="mt-3 text-sm sm:text-base text-muted-foreground line-clamp-2 max-w-2xl leading-relaxed drop-shadow-xs font-normal">
                {heroEntry.media.summary}
              </p>
            )}

            {/* Primary Action Row */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleHeroOneTap}
                disabled={isPending}
                className="h-11 px-6 rounded-full bg-brand hover:opacity-90 text-brand-foreground font-semibold text-sm flex items-center gap-2 transition hover:scale-102 active:scale-98 cursor-pointer shadow-sm disabled:opacity-50"
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
                className="h-11 px-5 rounded-full bg-card/90 hover:bg-accent border border-border text-foreground font-semibold text-sm flex items-center gap-2 transition backdrop-blur-md"
              >
                <Info className="w-4 h-4 text-muted-foreground" />
                <span>Details</span>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Hero Fallback when 0 items exist */}
      {!heroEntry && (
        <section className="relative w-full py-16 px-4 sm:px-8 border-b border-border bg-linear-to-b from-card/50 to-background">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
                {getTimeGreeting()}, {currentUser?.displayName || "Friend"}
              </h1>
              <p className="text-sm text-muted-foreground mt-2 max-w-xl">
                Your queue is currently empty. Bookmark titles from the trending shelf below or
                explore the catalog to build your shelf.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/explore"
                className="h-10 px-5 rounded-full bg-brand hover:opacity-90 text-brand-foreground font-bold text-xs flex items-center gap-2 transition"
              >
                <Compass className="w-4 h-4" />
                <span>Explore Catalog</span>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Main Content: Poster-First Rows (No Bordered Card Boxes) */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-10 space-y-14 w-full">
        {/* 2. Jump Back In Poster Row */}
        {myActive.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-baseline justify-between border-b border-border pb-3">
              <div className="flex items-center gap-3">
                <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground">
                  Jump Back In
                </h2>
                <span className="text-xs font-mono font-bold text-status-doing">
                  {myActive.length} active
                </span>
              </div>
              <Link
                href="/library"
                className="text-xs font-semibold text-muted-foreground hover:text-foreground transition flex items-center gap-1"
              >
                <span>View Library</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <MediaGrid>
              {myActive.map((entry) => (
                <div key={entry.id} className="group flex flex-col select-none">
                  {/* Poster Art */}
                  <div className="relative aspect-2/3 w-full rounded-xl overflow-hidden bg-card border border-border/50 shadow-xs">
                    <Link
                      href={getMediaHref(entry.media)}
                      className="absolute inset-0 z-0 cursor-pointer"
                      aria-label={`View ${entry.media.title}`}
                    />

                    <PosterImage
                      src={entry.media.posterUrl}
                      title={entry.media.title}
                      mediaType={entry.media.mediaType}
                      sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 16vw"
                      className="object-cover transition duration-300 group-hover:scale-105 pointer-events-none"
                    />

                    {/* Gradient on hover with quick action */}
                    <div className="absolute inset-0 bg-linear-to-t from-background/90 via-background/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3 pointer-events-none">
                      <span className="text-[10px] font-mono text-foreground uppercase">
                        {entry.media.mediaType}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setQuickStatus({ media: entry.media, status: "done" });
                        }}
                        title="Mark Completed"
                        className="pointer-events-auto p-1.5 rounded-full bg-status-done/20 text-status-done hover:bg-status-done hover:text-background border border-status-done/30 transition shadow-xs cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5 stroke-3" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Metadata below poster */}
                  <div className="mt-2.5 space-y-0.5">
                    <Link
                      href={getMediaHref(entry.media)}
                      className="text-sm font-bold text-foreground hover:opacity-80 transition truncate block"
                    >
                      {entry.media.title}
                    </Link>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
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
            </MediaGrid>
          </section>
        )}

        {/* 3. Up Next in Queue Poster Row */}
        {myQueue.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-baseline justify-between border-b border-border pb-3">
              <div className="flex items-center gap-3">
                <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground">
                  Up Next in Queue
                </h2>
                <span className="text-xs font-mono text-muted-foreground">({myQueue.length})</span>
              </div>
              <Link
                href="/library"
                className="text-xs font-semibold text-muted-foreground hover:text-foreground transition flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <MediaGrid>
              {myQueue.slice(0, 6).map((entry) => (
                <div key={entry.id} className="group flex flex-col select-none">
                  {/* Poster Art */}
                  <div className="relative aspect-2/3 w-full rounded-xl overflow-hidden bg-card border border-border/50 shadow-xs">
                    <Link
                      href={getMediaHref(entry.media)}
                      className="absolute inset-0 z-0 cursor-pointer"
                      aria-label={`View ${entry.media.title}`}
                    />

                    <PosterImage
                      src={entry.media.posterUrl}
                      title={entry.media.title}
                      mediaType={entry.media.mediaType}
                      sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 16vw"
                      className="object-cover transition duration-300 group-hover:scale-105 pointer-events-none"
                    />

                    {/* Gradient on hover with quick start action */}
                    <div className="absolute inset-0 bg-linear-to-t from-background/90 via-background/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3 pointer-events-none">
                      <span className="text-[10px] font-mono text-foreground uppercase">
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

                  {/* Title & Metadata */}
                  <div className="mt-2.5 space-y-0.5">
                    <Link
                      href={getMediaHref(entry.media)}
                      className="text-sm font-bold text-foreground hover:opacity-80 transition truncate block"
                    >
                      {entry.media.title}
                    </Link>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
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
            </MediaGrid>
          </section>
        )}

        {/* 4. Trending This Week Poster Row */}
        <section className="space-y-4">
          <div className="flex items-baseline justify-between border-b border-border pb-3">
            <div className="flex items-center gap-3">
              <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground">
                Trending This Week
              </h2>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Popular movies and blockbusters
              </span>
            </div>
            <Link
              href="/explore"
              className="text-xs font-semibold text-muted-foreground hover:text-foreground transition flex items-center gap-1"
            >
              <span>Explore Catalog</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <MediaGrid>
            {trendingResults.slice(0, 12).map((item) => (
              <div key={item.externalId} className="group flex flex-col select-none">
                {/* Poster Art */}
                <div className="relative aspect-2/3 w-full rounded-xl overflow-hidden bg-card border border-border/50 shadow-xs">
                  <Link
                    href={getMediaHref(item)}
                    className="absolute inset-0 z-0 cursor-pointer"
                    aria-label={`View ${item.title}`}
                  />

                  <PosterImage
                    src={item.posterUrl}
                    title={item.title}
                    mediaType={item.mediaType}
                    sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 16vw"
                    className="object-cover transition duration-300 group-hover:scale-105 pointer-events-none"
                  />

                  {/* Bookmark Button Overlay */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
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

                {/* Title & Metadata */}
                <div className="mt-2.5 space-y-0.5">
                  <Link
                    href={getMediaHref(item)}
                    className="text-sm font-bold text-foreground hover:opacity-80 transition truncate block"
                  >
                    {item.title}
                  </Link>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                    <span className="capitalize">{item.mediaType}</span>
                    {item.releaseYear && (
                      <>
                        <span>•</span>
                        <span>{item.releaseYear}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </MediaGrid>
        </section>

        {/* 5. The Squad (Small, Refined Avatar Row) */}
        <section className="pt-4 border-t border-border space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-bold">
              The Squad
            </h3>
            <span className="text-xs text-muted-foreground font-mono">{users.length} members</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {users.map((friend) => (
              <Link
                key={friend.id}
                href={`/squad/${friend.username}`}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-card/60 hover:bg-accent border border-border transition-all group"
              >
                <div className="w-6 h-6 rounded-full bg-muted text-foreground border border-border flex items-center justify-center font-semibold text-xs shrink-0 group-hover:scale-105 transition">
                  {friend.displayName[0]?.toUpperCase()}
                </div>
                <div className="flex items-baseline gap-1.5 min-w-0">
                  <span className="text-xs font-semibold text-foreground group-hover:opacity-80 transition truncate max-w-28">
                    {friend.displayName}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono hidden sm:inline">
                    @{friend.username}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
