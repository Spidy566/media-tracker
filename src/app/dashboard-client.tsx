"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Calendar,
  Clock,
  Compass,
  PlayCircle,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { UnifiedSearchResult } from "@/app/api/search/route";
import { MediaCard, type MediaStatus } from "@/components/media-card";
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

export function DashboardClient({
  currentUser,
  users,
  initialEntries,
  trendingResults,
}: DashboardClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Quick bookmark mutation
  const { mutate: setQuickStatus } = useMutation({
    mutationFn: async ({
      media,
      status,
    }: {
      media: Entry["media"] | UnifiedSearchResult;
      status: MediaStatus;
    }) => {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          media,
          status,
        }),
      });
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["my-entries"] });
      router.refresh(); // Tells Next.js server component to re-fetch freshly updated data
      toast.success("Added to your library", { description: variables.media.title });
    },
  });

  const myActive = initialEntries.filter((e) => e.status === "doing");
  const myQueue = initialEntries.filter((e) => e.status === "want_to");
  const myCompleted = initialEntries.filter((e) => e.status === "done");

  const navigateToMedia = (media: Entry["media"] | UnifiedSearchResult) => {
    const parts = media.externalId.split(":");
    const rawId = parts[parts.length - 1];
    router.push(`/media/${media.mediaType}/${rawId}`);
  };

  const isBrandNew = initialEntries.length === 0;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
      {/* 1. Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
            {getTimeGreeting()}, {currentUser?.displayName || "Friend"}
          </h1>
          <p className="text-sm font-medium text-muted-foreground mt-1">
            Track your movies, TV shows, and games. Bookmark titles with 1 click.
          </p>
        </div>

        <div className="flex items-center gap-5 bg-card border border-border p-3 px-6 rounded-2xl shadow-xs shrink-0">
          <div>
            <span className="text-2xl font-black text-foreground">{myCompleted.length}</span>
            <span className="text-xs font-semibold text-muted-foreground block">Completed</span>
          </div>
          <div className="w-px h-7 bg-border" />
          <div>
            <span className="text-2xl font-black text-emerald-500">{myActive.length}</span>
            <span className="text-xs font-semibold text-muted-foreground block">Active</span>
          </div>
          <div className="w-px h-7 bg-border" />
          <div>
            <span className="text-2xl font-black text-amber-500">{myQueue.length}</span>
            <span className="text-xs font-semibold text-muted-foreground block">Queue</span>
          </div>
        </div>
      </div>

      {/* 2. Welcome Hero (if 0 items) */}
      {isBrandNew && (
        <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Get Started
            </span>
            <h2 className="text-xl font-bold text-foreground">Your library is currently empty</h2>
            <p className="text-xs text-muted-foreground max-w-xl">
              Hover over any poster below to bookmark it to your Queue (🔖), mark it In Progress
              (▶), or Completed (✓). Or search for any title across TMDB and IGDB.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/explore"
              className="text-xs font-bold px-4 py-2.5 rounded-full bg-foreground text-background hover:opacity-90 transition shadow-xs flex items-center gap-2"
            >
              <Compass className="w-4 h-4" />
              <span>Explore Catalog</span>
            </Link>
            <Link
              href="/calendar"
              className="text-xs font-bold px-4 py-2.5 rounded-full bg-muted text-foreground hover:bg-muted/80 transition flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              <span>Release Calendar</span>
            </Link>
          </div>
        </div>
      )}

      {/* 3. Jump Back In */}
      {myActive.length > 0 && (
        <section className="bg-card border border-border rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PlayCircle className="w-4 h-4 text-emerald-500" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                Jump Back In
              </h2>
              <span className="text-xs text-muted-foreground font-mono">({myActive.length})</span>
            </div>

            <Link
              href="/library"
              className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 transition"
            >
              <span>View Library</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {myActive.map((entry) => (
              <MediaCard
                key={entry.id}
                title={entry.media.title}
                mediaType={entry.media.mediaType}
                posterUrl={entry.media.posterUrl}
                releaseYear={entry.media.releaseYear}
                currentStatus={entry.status}
                onQuickStatus={(status) => setQuickStatus({ media: entry.media, status })}
                onClick={() => navigateToMedia(entry.media)}
              />
            ))}
          </div>
        </section>
      )}

      {/* 4. Up Next in Queue */}
      {myQueue.length > 0 && (
        <section className="bg-card border border-border rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                Up Next in Queue
              </h2>
              <span className="text-xs text-muted-foreground font-mono">({myQueue.length})</span>
            </div>

            <Link
              href="/library"
              className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 transition"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {myQueue.slice(0, 6).map((entry) => (
              <MediaCard
                key={entry.id}
                title={entry.media.title}
                mediaType={entry.media.mediaType}
                posterUrl={entry.media.posterUrl}
                releaseYear={entry.media.releaseYear}
                currentStatus={entry.status}
                onQuickStatus={(status) => setQuickStatus({ media: entry.media, status })}
                onClick={() => navigateToMedia(entry.media)}
              />
            ))}
          </div>
        </section>
      )}

      {/* 5. Trending Worldwide */}
      <section className="bg-card border border-border rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-foreground">Trending This Week</h2>
              <p className="text-xs text-muted-foreground">
                Most popular movies & blockbusters worldwide
              </p>
            </div>
          </div>

          <Link
            href="/explore"
            className="text-xs font-bold text-muted-foreground hover:text-foreground flex items-center gap-1 transition"
          >
            <span>Explore All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {trendingResults.slice(0, 12).map((item) => (
            <MediaCard
              key={item.externalId}
              title={item.title}
              mediaType={item.mediaType}
              posterUrl={item.posterUrl}
              releaseYear={item.releaseYear}
              onQuickStatus={(status) => setQuickStatus({ media: item, status })}
              onClick={() => navigateToMedia(item)}
            />
          ))}
        </div>
      </section>

      {/* 6. The Squad */}
      <section className="bg-card border border-border rounded-3xl p-6 shadow-xs space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
          The Squad
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {users.map((friend) => (
            <Link
              key={friend.id}
              href={`/squad/${friend.username}`}
              className="flex items-center gap-3 p-3 rounded-2xl bg-muted/40 hover:bg-muted border border-border transition-all cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center font-black text-sm shrink-0 group-hover:scale-105 transition">
                {friend.displayName[0]}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-sm font-bold text-foreground block truncate group-hover:text-emerald-500 transition">
                  {friend.displayName}
                </span>
                <span className="text-xs text-muted-foreground font-mono block truncate">
                  @{friend.username}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
