"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ChevronLeft, ChevronRight, SlidersHorizontal, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { UnifiedSearchResult } from "@/app/api/search/route";
import { MediaCard } from "@/components/media-card";
import { TrackDialog } from "@/components/track-dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActiveUser } from "@/hooks/use-active-user";

const GENRES = [
  "Action",
  "Adventure",
  "Animation",
  "Comedy",
  "Crime",
  "Horror",
  "Sci-Fi",
  "RPG",
  "Shooter",
  "Strategy",
];

const EXPLORE_SKELETON_IDS = Array.from({ length: 18 }, (_, i) => `explore-skel-${i + 1}`);

export default function ExplorePage() {
  const router = useRouter();
  const { currentUser } = useActiveUser();

  const [mediaType, setMediaType] = useState<"game" | "movie" | "tv">("game");
  const [sort, setSort] = useState("popular");
  const [genre, setGenre] = useState<string>("");
  const [year, setYear] = useState<string>("");
  const [page, setPage] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [selectedMedia, setSelectedMedia] = useState<UnifiedSearchResult | null>(null);

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

  const queryClient = useQueryClient();

  const { mutate: setQuickStatus } = useMutation({
    mutationFn: async ({
      media,
      status,
    }: {
      media: UnifiedSearchResult;
      status: "want_to" | "doing" | "done";
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
    },
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Sub-Header Toolbar */}
      <div className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-14 z-20 px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs h-8 flex gap-2 font-medium cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400" />
              <span>{sidebarOpen ? "Hide Filters" : "Show Filters"}</span>
            </Button>

            <span className="text-xs text-zinc-400 font-medium hidden sm:inline">
              {data?.totalResults
                ? `${data.totalResults.toLocaleString()} Titles Available`
                : "Explore Catalog"}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-400 hidden sm:inline">Sort:</span>
            <Select value={sort} onValueChange={handleSortChange}>
              <SelectTrigger className="h-8 text-xs bg-zinc-900 border-zinc-800 w-36 text-zinc-200 font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
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
          <aside className="w-64 shrink-0 border-r border-zinc-800/80 p-5 space-y-6 bg-zinc-950/50 min-h-[calc(100vh-7rem)]">
            {/* Category Switcher */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                Category
              </span>
              <div className="grid grid-cols-3 gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                {(["game", "movie", "tv"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleMediaTypeChange(t)}
                    className={`text-xs py-1.5 rounded capitalize font-medium transition cursor-pointer ${
                      mediaType === t
                        ? "bg-zinc-800 text-zinc-100 shadow-xs border border-zinc-700/60"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {t === "tv" ? "TV Shows" : `${t}s`}
                  </button>
                ))}
              </div>
            </div>

            {/* Release Status */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                Release Status
              </span>
              <div className="grid grid-cols-2 gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                <button
                  type="button"
                  onClick={() => handleSortChange("popular")}
                  className={`text-xs py-1.5 rounded font-medium transition cursor-pointer ${
                    sort !== "upcoming"
                      ? "bg-zinc-800 text-zinc-100 shadow-xs border border-zinc-700/60"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Released
                </button>
                <button
                  type="button"
                  onClick={() => handleSortChange("upcoming")}
                  className={`text-xs py-1.5 rounded font-medium transition cursor-pointer ${
                    sort === "upcoming"
                      ? "bg-zinc-800 text-zinc-100 shadow-xs border border-zinc-700/60"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Upcoming
                </button>
              </div>
            </div>

            {/* Genre Filter */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                Genre
              </span>
              <Select
                value={genre || "all"}
                onValueChange={(val) => {
                  setGenre(val === "all" ? "" : val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs bg-zinc-900 border-zinc-800 w-full text-zinc-200">
                  <SelectValue placeholder="All Genres" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200 max-h-56">
                  <SelectItem value="all">All Genres</SelectItem>
                  {GENRES.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Release Year */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                Release Year
              </span>
              <Select
                value={year || "any"}
                onValueChange={(val) => {
                  setYear(val === "any" ? "" : val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs bg-zinc-900 border-zinc-800 w-full text-zinc-200">
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200 max-h-56">
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
                className="w-full text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 flex items-center justify-center gap-1.5 h-8 mt-4 border border-zinc-800 cursor-pointer"
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
            <div className="bg-red-950/30 border border-red-900/50 text-red-400 p-4 rounded-xl flex items-center justify-between mb-6">
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
                className="text-xs h-7 border-red-800 bg-red-950/50 hover:bg-red-900/50 text-red-300"
              >
                Retry
              </Button>
            </div>
          )}

          {/* Loading Skeletons */}
          {isLoading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {EXPLORE_SKELETON_IDS.map((id) => (
                <div
                  key={id}
                  className="aspect-2/3 bg-zinc-900 rounded-lg animate-pulse border border-zinc-800/60"
                />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !isError && results.length === 0 && (
            <div className="text-center py-28 border border-dashed border-zinc-800 rounded-2xl">
              <p className="text-base font-semibold text-zinc-200">No titles match your filters</p>
              <p className="text-xs mt-1 text-zinc-500">
                Try clearing your filters or changing categories.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                className="mt-4 text-xs h-8 border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
              >
                Reset All Filters
              </Button>
            </div>
          )}

          {/* Poster Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
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
          </div>

          {/* Pagination Controls */}
          {!isLoading && results.length > 0 && (
            <div className="flex items-center justify-center gap-4 mt-12 py-6 border-t border-zinc-800/80">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => {
                  setPage((p) => Math.max(1, p - 1));
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs h-8 flex gap-1 cursor-pointer disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </Button>

              <span className="text-xs text-zinc-400 font-medium">
                Page <strong className="text-zinc-200">{page}</strong> of {data?.totalPages || 1}
              </span>

              <Button
                variant="outline"
                size="sm"
                disabled={page >= (data?.totalPages || 1)}
                onClick={() => {
                  setPage((p) => p + 1);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs h-8 flex gap-1 cursor-pointer disabled:opacity-40"
              >
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </main>
      </div>

      {/* Quick-Log Modal */}
      {selectedMedia && currentUser && (
        <TrackDialog
          media={selectedMedia}
          userId={currentUser.id}
          onClose={() => setSelectedMedia(null)}
        />
      )}
    </div>
  );
}
