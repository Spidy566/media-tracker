"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Calendar, CheckCircle2, Clock, PlayCircle, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { UnifiedSearchResult } from "@/app/api/search/route";
import { MediaCard, type MediaStatus } from "@/components/media-card";
import { useActiveUser } from "@/hooks/use-active-user";

interface Entry {
  id: string;
  status: "want_to" | "doing" | "done" | "dropped";
  rating: number | null;
  reviewNote: string | null;
  updatedAt: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  media: {
    id: string;
    externalId: string;
    mediaType: "movie" | "tv" | "game";
    title: string;
    releaseYear: number | null;
    posterUrl: string | null;
    creator: string | null;
    genres: string[];
  };
}

const STATIC_SKELETON_KEYS = [
  "skel-card-1",
  "skel-card-2",
  "skel-card-3",
  "skel-card-4",
  "skel-card-5",
  "skel-card-6",
];

export default function HomePage() {
  const router = useRouter();
  const { users, currentUser } = useActiveUser();
  const queryClient = useQueryClient();

  const currentYear = new Date().getFullYear();

  // 1. Fetch current user's personal library
  const { data: myData, isLoading: isMyLoading } = useQuery<{ entries: Entry[] }>({
    queryKey: ["my-entries", currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return { entries: [] };
      const res = await fetch(`/api/entries?userId=${currentUser.id}`);
      return res.json();
    },
    enabled: Boolean(currentUser),
  });

  // 2. Fetch squad recent activity
  const { data: squadData } = useQuery<{ entries: Entry[] }>({
    queryKey: ["squad-entries"],
    queryFn: async () => {
      const res = await fetch("/api/entries");
      return res.json();
    },
  });

  // 3. Fetch trending titles for the "Trending This Week" shelf
  const { data: trendingData } = useQuery<{ results: UnifiedSearchResult[] }>({
    queryKey: ["trending-home"],
    queryFn: async () => {
      const res = await fetch("/api/discover?type=movie&sort=popular&page=1");
      return res.json();
    },
    staleTime: 1000 * 60 * 30, // 30 min cache
  });

  // 1-Click quick track mutation
  const { mutate: setQuickStatus } = useMutation({
    mutationFn: async ({
      media,
      status,
    }: {
      media: Entry["media"] | UnifiedSearchResult;
      status: MediaStatus;
    }) => {
      if (!currentUser) return;
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          media,
          status,
        }),
      });
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["my-entries"] });
      queryClient.invalidateQueries({ queryKey: ["squad-entries"] });

      const statusLabels = {
        want_to: "Added to Queue",
        doing: "Marked as In Progress",
        done: "Marked as Completed",
        dropped: "Marked as Dropped",
      };

      toast.success(statusLabels[variables.status], {
        description: variables.media.title,
      });
    },
  });

  const myEntries = myData?.entries || [];
  const allSquadEntries = squadData?.entries || [];
  const trendingResults = trendingData?.results?.slice(0, 6) || [];

  // Filter personal shelves
  const myActive = myEntries.filter((e) => e.status === "doing");
  const myQueue = myEntries.filter((e) => e.status === "want_to");
  const myCompleted = myEntries.filter((e) => e.status === "done");

  // Release Radar: unreleased or current-year titles in user's queue
  const releaseRadar = myQueue.filter(
    (e) => e.media.releaseYear && e.media.releaseYear >= currentYear,
  );

  // Recent Squad Finishes: titles friends marked "done", with their rating
  const squadFinishes = allSquadEntries
    .filter((e) => e.user.id !== currentUser?.id && e.status === "done")
    .slice(0, 6);

  // Taste breakdown counts
  const movieCount = myEntries.filter((e) => e.media.mediaType === "movie").length;
  const gameCount = myEntries.filter((e) => e.media.mediaType === "game").length;
  const tvCount = myEntries.filter((e) => e.media.mediaType === "tv").length;

  const otherFriends = users.filter((u) => u.id !== currentUser?.id);

  const navigateToMedia = (media: Entry["media"] | UnifiedSearchResult) => {
    const parts = media.externalId.split(":");
    const rawId = parts[parts.length - 1];
    router.push(`/media/${media.mediaType}/${rawId}`);
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full space-y-10">
      {/* ─────────────────────────────────────────────────────────────
          1. HERO GREETING & TASTE BREAKDOWN
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80">
        <div className="space-y-1.5">
          <h1 className="text-xl font-bold tracking-tight text-white">
            Welcome back, {currentUser?.displayName || "Friend"}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
            <span className="text-zinc-200 font-medium">{myActive.length} In Progress</span>
            <span>•</span>
            <span className="text-zinc-200 font-medium">{myQueue.length} in Queue</span>
            <span>•</span>
            <span className="text-zinc-200 font-medium">{myCompleted.length} Completed</span>
          </div>

          {/* Taste Breakdown Pills */}
          <div className="flex items-center gap-2 pt-1 text-[11px] text-zinc-400 font-medium">
            <span className="px-2 py-0.5 rounded-md bg-zinc-950/80 border border-zinc-800">
              🎬 {movieCount} Movies
            </span>
            <span className="px-2 py-0.5 rounded-md bg-zinc-950/80 border border-zinc-800">
              🎮 {gameCount} Games
            </span>
            <span className="px-2 py-0.5 rounded-md bg-zinc-950/80 border border-zinc-800">
              📺 {tvCount} TV Shows
            </span>
          </div>
        </div>

        {/* Squad Profile Pills */}
        <div className="flex flex-col sm:items-end gap-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
            The Squad
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {otherFriends.map((friend) => (
              <button
                key={friend.id}
                type="button"
                onClick={() => router.push(`/squad/${friend.username}`)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition cursor-pointer shrink-0"
              >
                <div className="w-4 h-4 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400">
                  {friend.displayName[0]}
                </div>
                <span>{friend.displayName}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. JUMP BACK IN (Currently Playing / Watching)
      ───────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PlayCircle className="w-4 h-4 text-sky-400" />
            <h2 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
              Jump Back In
            </h2>
            <span className="text-[11px] text-zinc-500 font-mono">({myActive.length})</span>
          </div>

          <Link
            href="/explore"
            className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition"
          >
            <span>Browse Catalog</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {isMyLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="aspect-2/3 bg-zinc-900 rounded-lg animate-pulse border border-zinc-800/60" />
          </div>
        ) : myActive.length === 0 ? (
          <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/20 text-xs text-zinc-400 flex items-center justify-between">
            <span>Nothing in progress right now. Pick a title from your queue to start!</span>
            <button
              type="button"
              onClick={() => router.push("/explore")}
              className="text-[11px] font-medium text-zinc-200 hover:text-white underline cursor-pointer"
            >
              Explore Titles
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {myActive.map((entry) => (
              <div key={entry.id} className="max-w-50">
                <MediaCard
                  title={entry.media.title}
                  mediaType={entry.media.mediaType}
                  posterUrl={entry.media.posterUrl}
                  releaseYear={entry.media.releaseYear}
                  currentStatus={entry.status}
                  onQuickStatus={(status) => setQuickStatus({ media: entry.media, status })}
                  onClick={() => navigateToMedia(entry.media)}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─────────────────────────────────────────────────────────────
          3. UP NEXT IN YOUR QUEUE (Top 6 Only)
      ───────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <h2 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
              Up Next in Your Queue
            </h2>
            <span className="text-[11px] text-zinc-500 font-mono">({myQueue.length})</span>
          </div>

          {myQueue.length > 6 && (
            <button
              type="button"
              onClick={() => router.push(`/squad/${currentUser?.username}?tab=queue`)}
              className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition cursor-pointer"
            >
              <span>View all {myQueue.length}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {isMyLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {STATIC_SKELETON_KEYS.map((key) => (
              <div
                key={key}
                className="aspect-2/3 bg-zinc-900 rounded-lg animate-pulse border border-zinc-800/60"
              />
            ))}
          </div>
        ) : myQueue.length === 0 ? (
          <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/20 text-xs text-zinc-400 flex items-center justify-between">
            <span>Your queue is empty. Press ⌘K to search and bookmark movies or games.</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {myQueue.slice(0, 6).map((entry) => (
              <div key={entry.id} className="max-w-50">
                <MediaCard
                  title={entry.media.title}
                  mediaType={entry.media.mediaType}
                  posterUrl={entry.media.posterUrl}
                  releaseYear={entry.media.releaseYear}
                  currentStatus={entry.status}
                  onQuickStatus={(status) => setQuickStatus({ media: entry.media, status })}
                  onClick={() => navigateToMedia(entry.media)}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─────────────────────────────────────────────────────────────
          4. RELEASE RADAR (Upcoming countdowns from your queue)
      ───────────────────────────────────────────────────────────── */}
      {releaseRadar.length > 0 && (
        <section className="space-y-3 p-4 rounded-2xl bg-zinc-900/30 border border-zinc-800/80">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <h2 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
              Release Radar
            </h2>
            <span className="text-[10px] text-emerald-400 font-mono px-1.5 py-0.5 rounded bg-emerald-500/10">
              {releaseRadar.length} Upcoming
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 -mt-1">Titles in your queue releasing soon.</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 pt-1">
            {releaseRadar.slice(0, 6).map((entry) => (
              <div key={entry.id} className="max-w-50">
                <MediaCard
                  title={entry.media.title}
                  mediaType={entry.media.mediaType}
                  posterUrl={entry.media.posterUrl}
                  releaseYear={entry.media.releaseYear}
                  subtitle={
                    entry.media.releaseYear === currentYear
                      ? "Coming this year"
                      : `Coming in ${entry.media.releaseYear}`
                  }
                  currentStatus={entry.status}
                  onQuickStatus={(status) => setQuickStatus({ media: entry.media, status })}
                  onClick={() => navigateToMedia(entry.media)}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. RECENT SQUAD FINISHES (Visual posters with ★ ratings)
      ───────────────────────────────────────────────────────────── */}
      {squadFinishes.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400" />
            <h2 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
              Recent Squad Finishes
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {squadFinishes.map((entry) => (
              <div key={entry.id} className="max-w-50">
                <MediaCard
                  title={entry.media.title}
                  mediaType={entry.media.mediaType}
                  posterUrl={entry.media.posterUrl}
                  releaseYear={entry.media.releaseYear}
                  rating={entry.rating}
                  subtitle={`by ${entry.user.displayName}`}
                  onQuickStatus={(status) => setQuickStatus({ media: entry.media, status })}
                  onClick={() => navigateToMedia(entry.media)}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          6. TRENDING THIS WEEK (Quick Inspiration Shelf)
      ───────────────────────────────────────────────────────────── */}
      {trendingResults.length > 0 && (
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-orange-400" />
              <h2 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                Trending This Week
              </h2>
            </div>

            <Link
              href="/explore"
              className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition"
            >
              <span>Explore More</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {trendingResults.map((item) => (
              <div key={item.externalId} className="max-w-50">
                <MediaCard
                  title={item.title}
                  mediaType={item.mediaType}
                  posterUrl={item.posterUrl}
                  releaseYear={item.releaseYear}
                  onQuickStatus={(status) => setQuickStatus({ media: item, status })}
                  onClick={() => navigateToMedia(item)}
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
