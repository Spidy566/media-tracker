"use client";

import { useState } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { useActiveUser } from "@/hooks/use-active-user";
import { TrackDialog } from "@/components/track-dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SlidersHorizontal, ChevronLeft, ChevronRight, X, AlertCircle } from "lucide-react";
import type { UnifiedSearchResult } from "@/app/api/search/route";

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

export default function ExplorePage() {
  const { currentUser } = useActiveUser();

  // Filters
  const [mediaType, setMediaType] = useState<"game" | "movie" | "tv">("game");
  const [sort, setSort] = useState("popular");
  const [genre, setGenre] = useState<string>("");
  const [year, setYear] = useState<string>("");
  const [page, setPage] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Selected item for logging
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
    staleTime: 1000 * 60 * 5, // Cache for 5 mins
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

  return (
    <div className="min-h-screen bg-[#0e1015] text-[#e1e7ed]">
      {/* Sub-Header Toolbar */}
      <div className="border-b border-white/10 bg-[#12151c]/90 backdrop-blur-md sticky top-14 z-20 px-6 py-2.5">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="border-white/10 bg-white/5 hover:bg-white/10 text-xs h-8 flex gap-2 font-medium"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#ff4b72]" />
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
              <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10 w-36 text-[#ff4b72] font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#181c24] border-white/10 text-white">
                <SelectItem value="popular">Popularity</SelectItem>
                <SelectItem value="top_rated">Highest Rated</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto flex">
        {/* Collapsible Left Filter Sidebar */}
        {sidebarOpen && (
          <aside className="w-64 shrink-0 border-r border-white/10 p-5 space-y-6 bg-[#12151c]/60 min-h-[calc(100vh-7rem)]">
            {/* Category Switcher */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                Category
              </label>
              <div className="grid grid-cols-3 gap-1 bg-black/50 p-1 rounded-lg border border-white/5">
                {(["game", "movie", "tv"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => handleMediaTypeChange(t)}
                    className={`text-xs py-1.5 rounded capitalize font-medium transition ${
                      mediaType === t
                        ? "bg-[#ff4b72] text-white shadow-xs"
                        : "text-muted-foreground hover:text-white"
                    }`}
                  >
                    {t === "tv" ? "TV Shows" : t + "s"}
                  </button>
                ))}
              </div>
            </div>

            {/* Release Status */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                Release Status
              </label>
              <div className="grid grid-cols-2 gap-1 bg-black/50 p-1 rounded-lg border border-white/5">
                <button
                  onClick={() => handleSortChange("popular")}
                  className={`text-xs py-1.5 rounded font-medium transition ${
                    sort !== "upcoming"
                      ? "bg-white/15 text-white"
                      : "text-muted-foreground hover:text-white"
                  }`}
                >
                  Released
                </button>
                <button
                  onClick={() => handleSortChange("upcoming")}
                  className={`text-xs py-1.5 rounded font-medium transition ${
                    sort === "upcoming"
                      ? "bg-[#ff4b72] text-white"
                      : "text-muted-foreground hover:text-white"
                  }`}
                >
                  Upcoming
                </button>
              </div>
            </div>

            {/* Genre Filter */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                Genre
              </label>
              <Select
                value={genre || "all"}
                onValueChange={(val) => {
                  setGenre(val === "all" ? "" : val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs bg-black/40 border-white/10 w-full text-foreground">
                  <SelectValue placeholder="All Genres" />
                </SelectTrigger>
                <SelectContent className="bg-[#181c24] border-white/10 text-white max-h-56">
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
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                Release Year
              </label>
              <Select
                value={year || "any"}
                onValueChange={(val) => {
                  setYear(val === "any" ? "" : val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs bg-black/40 border-white/10 w-full text-foreground">
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent className="bg-[#181c24] border-white/10 text-white max-h-56">
                  <SelectItem value="any">All Years</SelectItem>
                  {Array.from({ length: 30 }, (_, i) => 2026 - i).map((y) => (
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
                className="w-full text-xs text-[#ff4b72] hover:text-[#ff4b72]/80 hover:bg-[#ff4b72]/10 flex items-center justify-center gap-1.5 h-8 mt-4 border border-[#ff4b72]/20"
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
            <div className="bg-destructive/15 border border-destructive/30 text-destructive p-4 rounded-xl flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm font-medium">
                  {(error as Error)?.message || "Failed to load titles from external API."}
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs h-7">
                Retry
              </Button>
            </div>
          )}

          {/* Loading Skeletons */}
          {isLoading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Array.from({ length: 18 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[2/3] bg-white/5 rounded-lg animate-pulse border border-white/5"
                />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !isError && results.length === 0 && (
            <div className="text-center py-28 text-muted-foreground border border-dashed border-white/10 rounded-2xl">
              <p className="text-base font-semibold text-white">No titles match your filters</p>
              <p className="text-xs mt-1 text-muted-foreground">Try clearing your filters or changing categories.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                className="mt-4 text-xs h-8 border-white/10 bg-white/5 text-white"
              >
                Reset All Filters
              </Button>
            </div>
          )}

          {/* Poster Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {results.map((item) => (
              <div
                key={item.externalId}
                onClick={() => setSelectedMedia(item)}
                className="group relative cursor-pointer aspect-[2/3] rounded-lg overflow-hidden border border-white/10 bg-[#161a22] transition-all duration-200 hover:scale-[1.03] hover:shadow-2xl hover:border-[#ff4b72]/60 hover:z-10"
              >
                {item.posterUrl ? (
                  <Image
                    src={item.posterUrl}
                    alt={item.title}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                    className="object-cover transition-opacity duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center text-xs text-muted-foreground bg-black/40">
                    <span className="font-semibold text-white/80 line-clamp-3">{item.title}</span>
                    <span className="text-[10px] text-muted-foreground mt-2 uppercase">{item.mediaType}</span>
                  </div>
                )}

                {/* Backloggd-style Dark Gradient Overlay on Hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                  <p className="text-xs font-bold leading-tight line-clamp-2 text-white">
                    {item.title}
                  </p>
                  <p className="text-[10px] text-white/70 mt-1 font-medium">
                    {item.releaseYear || "TBA"}
                  </p>
                  <button className="mt-2.5 text-[10px] uppercase font-bold tracking-wider bg-[#ff4b72] text-white py-1 px-2.5 rounded shadow-sm w-fit transition hover:bg-[#ff335e]">
                    + Log
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {!isLoading && results.length > 0 && (
            <div className="flex items-center justify-center gap-4 mt-12 py-6 border-t border-white/10">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => {
                  setPage((p) => Math.max(1, p - 1));
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="border-white/10 bg-white/5 hover:bg-white/10 text-xs h-8 flex gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </Button>

              <span className="text-xs text-muted-foreground font-medium">
                Page <strong className="text-white">{page}</strong> of {data?.totalPages || 1}
              </span>

              <Button
                variant="outline"
                size="sm"
                disabled={page >= (data?.totalPages || 1)}
                onClick={() => {
                  setPage((p) => p + 1);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="border-white/10 bg-white/5 hover:bg-white/10 text-xs h-8 flex gap-1"
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