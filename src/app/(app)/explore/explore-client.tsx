"use client";

import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { Film, Gamepad2, Layers, Tv } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { UnifiedSearchResult } from "@/app/api/search/route";
import { AnchorChip } from "@/components/explore/anchor-chip";
import { ExploreSpinner } from "@/components/explore/explore-spinner";
import { MediaCard, type MediaStatus } from "@/components/media-card";
import { MediaGrid } from "@/components/media-grid";
import { deleteEntryApi, logEntryApi } from "@/lib/api-entries";
import { getGenresForType } from "@/lib/genres";
import { getMediaHref } from "@/lib/utils";

type MediaTypeFilter = "all" | "movie" | "tv" | "game";
type SortOption = "popular" | "top_rated" | "upcoming";

interface TrackedItem {
  id: string;
  status: MediaStatus;
}

interface ExploreClientProps {
  initialTitles: UnifiedSearchResult[];
  initialTrackedMap?: Record<string, TrackedItem>;
}

export function ExploreClient({ initialTitles, initialTrackedMap = {} }: ExploreClientProps) {
  const [mediaType, setMediaType] = useState<MediaTypeFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("popular");
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  const [anchoredItem, setAnchoredItem] = useState<UnifiedSearchResult | null>(null);
  const [anchoredTitles, setAnchoredTitles] = useState<UnifiedSearchResult[]>([]);
  const [isLoadingRelated, setIsLoadingRelated] = useState(false);
  const [trackedMap, setTrackedMap] = useState<Record<string, TrackedItem>>(initialTrackedMap);

  // Clear Anchor and return to active wall
  const handleClearAnchor = useCallback(() => {
    setAnchoredItem(null);
    setAnchoredTitles([]);
  }, []);

  // Global Escape key listener to clear anchor
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && anchoredItem) {
        e.preventDefault();
        handleClearAnchor();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [anchoredItem, handleClearAnchor]);

  // Infinite query for type/sort/genre exploration
  const {
    data: discoverData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["discover", mediaType, sortBy, selectedGenre],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams({
        type: mediaType,
        sort: sortBy,
        page: String(pageParam),
      });
      if (selectedGenre) {
        params.set("genre", selectedGenre);
      }
      const res = await fetch(`/api/discover?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to load titles");
      }
      return res.json() as Promise<{
        results: UnifiedSearchResult[];
        page: number;
        totalPages: number;
        totalResults: number;
      }>;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    enabled: mediaType !== "all" && !anchoredItem,
    staleTime: 1000 * 60 * 5,
  });

  // Calculate displayed titles
  const displayedTitles = useMemo(() => {
    if (anchoredItem && anchoredTitles.length > 0) {
      return anchoredTitles;
    }
    if (mediaType === "all") {
      return initialTitles;
    }
    return discoverData?.pages.flatMap((page) => page.results) ?? [];
  }, [anchoredItem, anchoredTitles, mediaType, initialTitles, discoverData]);

  // Anchor selection flow
  const handleAnchor = useCallback(
    async (item: UnifiedSearchResult) => {
      if (anchoredItem?.externalId === item.externalId) {
        handleClearAnchor();
        return;
      }

      setAnchoredItem(item);
      setIsLoadingRelated(true);

      try {
        const res = await fetch(
          `/api/discover/related?externalId=${encodeURIComponent(item.externalId)}`,
        );

        if (!res.ok) {
          throw new Error("Failed to load related media");
        }

        const data = await res.json();
        const related = Array.isArray(data?.results) ? (data.results as UnifiedSearchResult[]) : [];

        if (related.length === 0) {
          toast("No related titles found", {
            description: `Couldn't find similar items for "${item.title}".`,
          });
          setIsLoadingRelated(false);
          return;
        }

        const newWall = [item, ...related.filter((r) => r.externalId !== item.externalId)];
        setAnchoredTitles(newWall);
      } catch (err) {
        console.error("Related fetch error:", err);
        toast.error("Failed to load related titles");
      } finally {
        setIsLoadingRelated(false);
      }
    },
    [anchoredItem, handleClearAnchor],
  );

  const handleMediaTypeChange = (type: MediaTypeFilter) => {
    setMediaType(type);
    setSelectedGenre(null);
    if (anchoredItem) {
      handleClearAnchor();
    }
  };

  const handleSortChange = (sort: SortOption) => {
    setSortBy(sort);
    if (anchoredItem) {
      handleClearAnchor();
    }
  };

  const handleGenreChange = (genre: string | null) => {
    setSelectedGenre(genre);
    if (anchoredItem) {
      handleClearAnchor();
    }
  };

  const availableGenres = useMemo(() => {
    if (mediaType === "all") return [];
    return getGenresForType(mediaType);
  }, [mediaType]);

  // Status mutation (Want to, Doing, Done, Dropped)
  const statusMutation = useMutation({
    mutationFn: async ({ item, status }: { item: UnifiedSearchResult; status: MediaStatus }) => {
      return logEntryApi({
        media: {
          externalId: item.externalId,
          mediaType: item.mediaType as "movie" | "tv" | "game",
          title: item.title,
          releaseYear: item.releaseYear,
          posterUrl: item.posterUrl,
          creator: item.creator,
          summary: item.summary,
          genres: item.genres,
        },
        status,
      });
    },
    onSuccess: (data, variables) => {
      const entryId = data?.entry?.id || variables.item.externalId;
      setTrackedMap((prev) => ({
        ...prev,
        [variables.item.externalId]: {
          id: entryId,
          status: variables.status,
        },
      }));

      const statusLabels: Record<MediaStatus, string> = {
        want_to: "Added to Queue",
        doing: "Marked as In Progress",
        done: "Marked as Completed",
        dropped: "Marked as Dropped",
      };

      toast.success(statusLabels[variables.status], {
        description: variables.item.title,
      });
    },
    onError: (err) => {
      console.error("Failed to update status:", err);
      toast.error("Failed to update status");
    },
  });

  // Remove tracking mutation
  const removeMutation = useMutation({
    mutationFn: async (item: UnifiedSearchResult) => {
      const tracked = trackedMap[item.externalId];
      if (!tracked?.id) {
        throw new Error("Item not currently tracked");
      }
      return deleteEntryApi(tracked.id);
    },
    onSuccess: (_, item) => {
      setTrackedMap((prev) => {
        const next = { ...prev };
        delete next[item.externalId];
        return next;
      });
      toast.success("Removed from library", {
        description: item.title,
      });
    },
    onError: (err) => {
      console.error("Failed to remove tracked entry:", err);
      toast.error("Failed to remove from library");
    },
  });

  const handleStatusChange = (item: UnifiedSearchResult, status: MediaStatus) => {
    if (trackedMap[item.externalId]?.status === status) {
      removeMutation.mutate(item);
      return;
    }
    statusMutation.mutate({ item, status });
  };

  const isInitialLoading = mediaType !== "all" && !anchoredItem && isLoading;

  return (
    <main className="relative w-full flex-1">
      {/* ─────────────────────────────────────────────────────────────
          1. STICKY FILTER BAR (Tactile dark style matching /calendar)
          ───────────────────────────────────────────────────────────── */}
      <div className="sticky top-16 z-20 bg-background/85 backdrop-blur-md border-b border-border transition-colors">
        {/* Thin top loading bar during filter changes or related fetching */}
        {(isFetching || isLoadingRelated) && (
          <div
            aria-hidden="true"
            className="absolute top-0 inset-x-0 h-0.5 bg-brand/20 overflow-hidden"
          >
            <div className="h-full bg-brand animate-hero-progress w-full" />
          </div>
        )}

        <div className="w-full px-4 sm:px-6 md:px-8 lg:px-12 py-3 space-y-2.5">
          {/* Row 1: Media Type segmented control + Sort pills (when specific type selected) */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto scrollbar-none pb-0.5">
              {/* Media type segmented control */}
              <div className="flex items-center bg-card border border-border p-1 rounded-xl shrink-0 shadow-2xs">
                <button
                  type="button"
                  onClick={() => handleMediaTypeChange("all")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    mediaType === "all"
                      ? "bg-muted text-foreground font-semibold shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Layers className="size-3.5" />
                  <span>All</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleMediaTypeChange("movie")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    mediaType === "movie"
                      ? "bg-muted text-foreground font-semibold shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Film className="size-3.5" />
                  <span>Movies</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleMediaTypeChange("tv")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    mediaType === "tv"
                      ? "bg-muted text-foreground font-semibold shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Tv className="size-3.5" />
                  <span>TV</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleMediaTypeChange("game")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    mediaType === "game"
                      ? "bg-muted text-foreground font-semibold shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Gamepad2 className="size-3.5" />
                  <span>Games</span>
                </button>
              </div>

              {/* Sort pills: Popular, Top Rated, Upcoming */}
              {mediaType !== "all" && (
                <div className="flex items-center gap-1.5 shrink-0 animate-in fade-in duration-200">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono mr-1 hidden sm:inline">
                    Sort
                  </span>
                  {(
                    [
                      { id: "popular", label: "Popular" },
                      { id: "top_rated", label: "Top Rated" },
                      { id: "upcoming", label: "Upcoming" },
                    ] as const
                  ).map((s) => {
                    const isSelected = sortBy === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSortChange(s.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer shrink-0 border ${
                          isSelected
                            ? "bg-foreground text-background border-foreground font-semibold shadow-2xs"
                            : "bg-card/70 text-muted-foreground hover:text-foreground border-border hover:bg-card"
                        }`}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Total count badge (when available) */}
            {mediaType !== "all" && discoverData?.pages[0]?.totalResults !== undefined && (
              <div className="hidden md:flex items-center text-xs text-muted-foreground font-mono tabular-nums shrink-0">
                <span>{discoverData.pages[0].totalResults.toLocaleString()} titles</span>
              </div>
            )}
          </div>

          {/* Row 2: Genre filter pills (when specific type is selected) */}
          {mediaType !== "all" && availableGenres.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 animate-in fade-in duration-200">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono mr-1 shrink-0 hidden sm:inline">
                Genre
              </span>
              <button
                type="button"
                onClick={() => handleGenreChange(null)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer shrink-0 border ${
                  selectedGenre === null
                    ? "bg-foreground text-background border-foreground font-semibold shadow-2xs"
                    : "bg-card/60 text-muted-foreground hover:text-foreground border-border hover:bg-card"
                }`}
              >
                All Genres
              </button>
              {availableGenres.map((g) => {
                const isSelected = selectedGenre === g;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => handleGenreChange(isSelected ? null : g)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer shrink-0 border ${
                      isSelected
                        ? "bg-foreground text-background border-foreground font-semibold shadow-2xs"
                        : "bg-card/60 text-muted-foreground hover:text-foreground border-border hover:bg-card"
                    }`}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Loading overlay for related titles fetch */}
      {isLoadingRelated && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <ExploreSpinner size={48} />
          <span className="text-[13px] text-foreground font-medium tracking-wide mt-4">
            Finding related titles for {anchoredItem?.title}...
          </span>
        </div>
      )}

      {/* Main Poster Wall or Loading/Empty state */}
      {isInitialLoading ? (
        <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
          <ExploreSpinner size={40} />
          <span className="text-xs text-muted-foreground mt-4 font-mono tracking-wide">
            Loading {mediaType === "movie" ? "movies" : mediaType === "tv" ? "TV series" : "games"}
            ...
          </span>
        </div>
      ) : displayedTitles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center px-4">
          <p className="text-base font-semibold text-foreground">No titles found</p>
          <p className="text-xs text-muted-foreground mt-1.5 max-w-sm">
            No items matched your selected filters. Try choosing a different genre or sort option.
          </p>
        </div>
      ) : (
        <div className="w-full px-4 sm:px-6 md:px-8 lg:px-12 pt-6 pb-28 sm:pb-24">
          <MediaGrid>
            {displayedTitles.map((item) => {
              const isAnchored = anchoredItem?.externalId === item.externalId;
              const currentStatus = trackedMap[item.externalId]?.status ?? null;

              return (
                <MediaCard
                  key={item.externalId}
                  title={item.title}
                  mediaType={item.mediaType as "movie" | "tv" | "game"}
                  posterUrl={item.posterUrl}
                  releaseYear={item.releaseYear}
                  currentStatus={currentStatus}
                  isAnchored={isAnchored}
                  onAnchor={() => handleAnchor(item)}
                  href={getMediaHref(item)}
                  allowedStatuses={["want_to", "doing", "done"]}
                  onQuickStatus={(status) => handleStatusChange(item, status)}
                  onRemove={currentStatus ? () => removeMutation.mutate(item) : undefined}
                />
              );
            })}
          </MediaGrid>

          {/* Pagination / Load More button */}
          {mediaType !== "all" && !anchoredItem && hasNextPage && (
            <div className="flex justify-center pt-8 pb-4">
              <button
                type="button"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="px-6 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-foreground text-xs font-semibold transition disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-2xs"
              >
                {isFetchingNextPage ? (
                  <>
                    <ExploreSpinner size={16} />
                    <span>Loading more...</span>
                  </>
                ) : (
                  <span>Load More</span>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Floating Bottom-Center Anchor Chip */}
      {anchoredItem && <AnchorChip item={anchoredItem} onClear={handleClearAnchor} />}
    </main>
  );
}
