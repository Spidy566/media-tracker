"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle, ChevronLeft, ChevronRight, SlidersHorizontal, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import type { UnifiedSearchResult } from "@/app/api/search/route";
import { MediaCard } from "@/components/media-card";
import { MediaGrid } from "@/components/media-grid";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { logEntryApi } from "@/lib/api-entries";

const GENRES_BY_TYPE: Record<"movie" | "tv" | "game", string[]> = {
  movie: ["Action", "Adventure", "Animation", "Comedy", "Crime", "Horror", "Sci-Fi"],
  tv: ["Action & Adventure", "Animation", "Comedy", "Crime", "Sci-Fi"],
  game: ["Action", "Adventure", "Horror", "Sci-Fi", "RPG", "Shooter", "Strategy"],
};

const EXPLORE_SKELETON_IDS = Array.from({ length: 18 }, (_, i) => `explore-skel-${i + 1}`);

export default function ExplorePage() {
  const router = useRouter();

  const [mediaType, setMediaType] = useState<"game" | "movie" | "tv">("game");
  const [sort, setSort] = useState("popular");
  const [genre, setGenre] = useState<string>("");
  const [year, setYear] = useState<string>("");
  const [page, setPage] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery<{
    results: UnifiedSearchResult[];
    page: number;
    totalPages: number;
    totalResults: number;
    error?: string;
  }>({
    queryKey: ["discover", mediaType, sort, genre, year, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        type: mediaType,
        sort,
        page: page.toString(),
        ...(genre ? { genre } : {}),
        ...(year ? { year } : {}),
      });
      const res = await fetch(`/api/discover?${params}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to load media");
      }
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });

  const results = data?.results || [];

  const handleMediaTypeChange = (newType: "game" | "movie" | "tv") => {
    setMediaType(newType);
    setGenre("");
    setPage(1);
  };

  const handleSortChange = (newSort: string) => {
    setSort(newSort);
    setPage(1);
  };

  const clearAllFilters = () => {
    setGenre("");
    setYear("");
    setSort("popular");
    setPage(1);
  };

  const hasActiveFilters = Boolean(genre || year || sort !== "popular");

  const { mutate: setQuickStatus } = useMutation({
    mutationFn: async ({
      media,
      status,
    }: {
      media: UnifiedSearchResult;
      status: "want_to" | "doing" | "done";
    }) => {
      return logEntryApi({
        media,
        status,
      });
    },
    onSuccess: (_, variables) => {
      router.refresh();

      const statusLabels = {
        want_to: "Added to Queue",
        doing: "Marked as In Progress",
        done: "Marked as Completed",
      };

      toast.success(statusLabels[variables.status], {
        description: variables.media.title,
      });
    },
    onError: (err: Error) => {
      if (err.message !== "Unauthorized") {
        toast.error("Failed to update status");
      }
    },
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sub-Header Toolbar */}
      <div className="border-b border-border bg-background/80 backdrop-blur-md sticky top-16 z-20 px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="border-border bg-card hover:bg-accent text-foreground text-xs h-8 flex gap-2 font-medium cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{sidebarOpen ? "Hide Filters" : "Show Filters"}</span>
            </Button>

            <span className="text-xs text-muted-foreground font-medium hidden sm:inline">
              {data?.totalResults
                ? `${data.totalResults.toLocaleString()} Titles Available`
                : "Explore Catalog"}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground hidden sm:inline">Sort:</span>
            <Select value={sort} onValueChange={handleSortChange}>
              <SelectTrigger className="h-8 text-xs bg-card border-border w-36 text-foreground font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-popover-foreground">
                <SelectItem value="popular">Popularity</SelectItem>
                <SelectItem value="top_rated">Highest Rated</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex">
        {/* Collapsible Left Filter Sidebar */}
        {sidebarOpen && (
          <aside className="w-64 shrink-0 border-r border-border p-5 space-y-6 bg-card/30 min-h-[calc(100vh-7rem)]">
            {/* Category Switcher */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                Category
              </span>
              <div className="grid grid-cols-3 gap-1 bg-card p-1 rounded-lg border border-border">
                {(["game", "movie", "tv"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleMediaTypeChange(t)}
                    className={`text-xs py-1.5 rounded capitalize font-medium transition cursor-pointer ${
                      mediaType === t
                        ? "bg-muted text-foreground shadow-xs border border-border"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t === "tv" ? "TV Shows" : `${t}s`}
                  </button>
                ))}
              </div>
            </div>

            {/* Release Status */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                Release Status
              </span>
              <div className="grid grid-cols-2 gap-1 bg-card p-1 rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => handleSortChange("popular")}
                  className={`text-xs py-1.5 rounded font-medium transition cursor-pointer ${
                    sort !== "upcoming"
                      ? "bg-muted text-foreground shadow-xs border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Released
                </button>
                <button
                  type="button"
                  onClick={() => handleSortChange("upcoming")}
                  className={`text-xs py-1.5 rounded font-medium transition cursor-pointer ${
                    sort === "upcoming"
                      ? "bg-muted text-foreground shadow-xs border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Upcoming
                </button>
              </div>
            </div>

            {/* Genre Filter */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                Genre
              </span>
              <Select
                value={genre || "all"}
                onValueChange={(val) => {
                  setGenre(val === "all" ? "" : val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs bg-card border-border w-full text-foreground">
                  <SelectValue placeholder="All Genres" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-popover-foreground max-h-56">
                  <SelectItem value="all">All Genres</SelectItem>
                  {GENRES_BY_TYPE[mediaType].map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Release Year */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                Release Year
              </span>
              <Select
                value={year || "any"}
                onValueChange={(val) => {
                  setYear(val === "any" ? "" : val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs bg-card border-border w-full text-foreground">
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-popover-foreground max-h-56">
                  <SelectItem value="any">All Years</SelectItem>
                  {Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="w-full text-xs text-muted-foreground hover:text-foreground hover:bg-accent flex items-center justify-center gap-1.5 h-8 mt-4 border border-border cursor-pointer"
              >
                <X className="w-3.5 h-3.5" /> Reset Filters
              </Button>
            )}
          </aside>
        )}

        {/* Main Content Grid */}
        <main className="flex-1 p-6">
          {/* Error Banner */}
          {isError && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-xl flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm font-medium">
                  {(error as Error)?.message || "Failed to load titles."}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="text-xs h-7 border-destructive/30 bg-destructive/15 hover:bg-destructive/25 text-destructive cursor-pointer"
              >
                Retry
              </Button>
            </div>
          )}

          {/* Loading Skeletons */}
          {isLoading && (
            <MediaGrid>
              {EXPLORE_SKELETON_IDS.map((id) => (
                <div
                  key={id}
                  className="aspect-2/3 bg-muted rounded-lg animate-pulse border border-border/50"
                />
              ))}
            </MediaGrid>
          )}

          {/* Empty State */}
          {!isLoading && !isError && results.length === 0 && (
            <div className="text-center py-28 border border-dashed border-border rounded-2xl">
              <p className="text-base font-semibold text-foreground">
                No titles match your filters
              </p>
              <p className="text-xs mt-1 text-muted-foreground">
                Try clearing your filters or changing categories.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                className="mt-4 text-xs h-8 border-border bg-card text-foreground hover:bg-accent cursor-pointer"
              >
                Reset All Filters
              </Button>
            </div>
          )}

          {/* Poster Cards Grid */}
          <MediaGrid>
            {results.map((item) => {
              const parts = item.externalId.split(":");
              const rawId = parts[parts.length - 1];

              return (
                <MediaCard
                  key={item.externalId}
                  title={item.title}
                  mediaType={item.mediaType}
                  posterUrl={item.posterUrl}
                  releaseYear={item.releaseYear}
                  onQuickStatus={(status) => setQuickStatus({ media: item, status })}
                  onClick={() => router.push(`/media/${item.mediaType}/${rawId}`)}
                />
              );
            })}
          </MediaGrid>

          {/* Pagination Controls */}
          {!isLoading && results.length > 0 && (
            <div className="flex items-center justify-center gap-4 mt-12 py-6 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => {
                  setPage((p) => Math.max(1, p - 1));
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="border-border bg-card hover:bg-accent text-foreground text-xs h-8 flex gap-1 cursor-pointer disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </Button>

              <span className="text-xs text-muted-foreground font-medium">
                Page <strong className="text-foreground">{page}</strong> of {data?.totalPages || 1}
              </span>

              <Button
                variant="outline"
                size="sm"
                disabled={page >= (data?.totalPages || 1)}
                onClick={() => {
                  setPage((p) => p + 1);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="border-border bg-card hover:bg-accent text-foreground text-xs h-8 flex gap-1 cursor-pointer disabled:opacity-40"
              >
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
