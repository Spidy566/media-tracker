"use client";

import { Compass, Film, Gamepad2, Tv } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { UnifiedSearchResult } from "@/app/api/search/route";
import { MediaCard, type MediaStatus } from "@/components/media-card";
import { ScrollRow } from "@/components/scroll-row";
import { cn, getMediaHref } from "@/lib/utils";

interface TrendingSectionProps {
  trendingMovies: UnifiedSearchResult[];
  trendingTv: UnifiedSearchResult[];
  trendingGames: UnifiedSearchResult[];
  onQuickStatus: (media: UnifiedSearchResult, status: MediaStatus) => void;
}

export function TrendingSection({
  trendingMovies,
  trendingTv,
  trendingGames,
  onQuickStatus,
}: TrendingSectionProps) {
  const router = useRouter();
  const [activeTrendingTab, setActiveTrendingTab] = useState<"movies" | "tv" | "games">("movies");

  const currentTrendingItems =
    activeTrendingTab === "movies"
      ? trendingMovies
      : activeTrendingTab === "tv"
        ? trendingTv
        : trendingGames;

  return (
    <section aria-label="Trending This Week" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div className="flex items-center gap-3">
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2.5 font-sans">
            <Compass className="size-4.5 text-brand" />
            <span>Trending This Week</span>
          </h2>

          {/* Sub-tabs */}
          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl border border-border">
            <button
              type="button"
              onClick={() => setActiveTrendingTab("movies")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5",
                activeTrendingTab === "movies"
                  ? "bg-card text-foreground shadow-xs border border-border/80"
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
                "px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5",
                activeTrendingTab === "tv"
                  ? "bg-card text-foreground shadow-xs border border-border/80"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Tv className="size-3" />
              <span>TV</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTrendingTab("games")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5",
                activeTrendingTab === "games"
                  ? "bg-card text-foreground shadow-xs border border-border/80"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Gamepad2 className="size-3" />
              <span>Games</span>
            </button>
          </div>
        </div>

        <Link
          href={`/explore?type=${activeTrendingTab === "movies" ? "movie" : activeTrendingTab === "tv" ? "tv" : "game"}`}
          className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition flex items-center gap-1 self-start sm:self-auto"
        >
          <span>Explore all</span>
          <span className="text-muted-foreground">&rarr;</span>
        </Link>
      </div>

      <ScrollRow>
        {currentTrendingItems.map((item) => (
          <div key={item.externalId} className="w-40 sm:w-48 shrink-0 snap-start select-none">
            <MediaCard
              title={item.title}
              mediaType={item.mediaType}
              posterUrl={item.posterUrl}
              releaseYear={item.releaseYear}
              allowedStatuses={["want_to", "doing", "done"]}
              onQuickStatus={(status) => onQuickStatus(item, status)}
              onClick={() => router.push(getMediaHref(item))}
            />
          </div>
        ))}
      </ScrollRow>
    </section>
  );
}
