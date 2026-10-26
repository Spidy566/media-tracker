"use client";

import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { UnifiedSearchResult } from "@/app/api/search/route";
import { AnchorChip } from "@/components/discover/anchor-chip";
import { CosmosSpinner } from "@/components/discover/cosmos-spinner";
import { useDiscover } from "@/components/discover/discover-context";
import type { MediaStatus } from "@/components/discover/poster-card";
import { PosterWall } from "@/components/discover/poster-wall";
import { deleteEntryApi, logEntryApi } from "@/lib/api-entries";

interface TrackedItem {
  id: string;
  status: MediaStatus;
}

interface DiscoverClientProps {
  initialTitles: UnifiedSearchResult[];
  initialTrackedMap?: Record<string, TrackedItem>;
}

export function DiscoverClient({ initialTitles, initialTrackedMap = {} }: DiscoverClientProps) {
  const { isIslandMode, setSearchPlaceholder } = useDiscover();

  const [displayedTitles, setDisplayedTitles] = useState<UnifiedSearchResult[]>(initialTitles);
  const [, setPreviousWalls] = useState<UnifiedSearchResult[][]>([]);
  const [anchoredItem, setAnchoredItem] = useState<UnifiedSearchResult | null>(null);
  const [isLoadingRelated, setIsLoadingRelated] = useState(false);
  const [trackedMap, setTrackedMap] = useState<Record<string, TrackedItem>>(initialTrackedMap);

  // Clear Anchor and restore previous wall
  const handleClearAnchor = useCallback(() => {
    setAnchoredItem(null);
    setSearchPlaceholder(null);

    setPreviousWalls((prev) => {
      if (prev.length > 0) {
        const lastWall = prev[prev.length - 1];
        setDisplayedTitles(lastWall);
        return prev.slice(0, -1);
      }
      setDisplayedTitles(initialTitles);
      return [];
    });
  }, [initialTitles, setSearchPlaceholder]);

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

  // Anchor selection flow
  const handleAnchor = useCallback(
    async (item: UnifiedSearchResult) => {
      if (anchoredItem?.externalId === item.externalId) {
        // Clicking same anchor again clears it
        handleClearAnchor();
        return;
      }

      setAnchoredItem(item);
      // Update search placeholder to relevant anchor suggestion
      setSearchPlaceholder(`Try '${item.title}'`);
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

        // Save current wall into history stack
        setPreviousWalls((prev) => [...prev, displayedTitles]);

        // Anchor is first, followed by related items
        const newWall = [item, ...related.filter((r) => r.externalId !== item.externalId)];
        setDisplayedTitles(newWall);
      } catch (err) {
        console.error("Related fetch error:", err);
        toast.error("Failed to load related titles");
      } finally {
        setIsLoadingRelated(false);
      }
    },
    [anchoredItem, displayedTitles, handleClearAnchor, setSearchPlaceholder],
  );

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
    statusMutation.mutate({ item, status });
  };

  const handleRemoveTracked = (item: UnifiedSearchResult) => {
    removeMutation.mutate(item);
  };

  return (
    <main className="relative w-full flex-1">
      {/* Loading overlay for related titles fetch */}
      {isLoadingRelated && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <CosmosSpinner size={48} />
          <span className="text-[13px] text-neutral-200 font-medium tracking-wide mt-4">
            Finding related titles for {anchoredItem?.title}...
          </span>
        </div>
      )}

      {/* Main Poster Wall (Flat dense grid or 2D canvas in Island state) */}
      <PosterWall
        items={displayedTitles}
        anchoredItem={anchoredItem}
        isIslandMode={isIslandMode}
        trackedMap={trackedMap}
        onAnchor={handleAnchor}
        onStatusChange={handleStatusChange}
        onRemoveTracked={handleRemoveTracked}
      />

      {/* Floating Bottom-Center Anchor Chip */}
      {anchoredItem && <AnchorChip item={anchoredItem} onClear={handleClearAnchor} />}
    </main>
  );
}
