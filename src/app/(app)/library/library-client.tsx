"use client";

import { useMutation } from "@tanstack/react-query";
import { Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { MediaCard, type MediaStatus } from "@/components/media-card";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchModal } from "@/hooks/use-search-modal";
import { deleteEntryApi, logEntryApi } from "@/lib/api-entries";
import { cn, getMediaHref } from "@/lib/utils";
import type { Entry } from "@/types/entry";

interface LibraryClientProps {
  initialEntries: Entry[];
}

type TabType = "all" | "want_to" | "doing" | "done";
type SortOption = "updated" | "rating" | "year" | "title";
type MediumFilter = "all" | "movie" | "tv" | "game";

const PAGE_SIZE = 48;

const STATUS_TABS: Array<{ id: TabType; label: string }> = [
  { id: "all", label: "All" },
  { id: "want_to", label: "Queue" },
  { id: "doing", label: "In Progress" },
  { id: "done", label: "Done" },
];

const MEDIUM_OPTIONS: Array<{ value: MediumFilter; label: string }> = [
  { value: "all", label: "All Media" },
  { value: "movie", label: "Movies" },
  { value: "tv", label: "TV Series" },
  { value: "game", label: "Games" },
];

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: "updated", label: "Recently updated" },
  { value: "year", label: "Release year" },
  { value: "rating", label: "Highest rated" },
  { value: "title", label: "Title (A–Z)" },
];

// Helper to generate pagination items with ellipsis
function getPaginationRange(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  pages.push(1);

  if (start > 2) {
    pages.push("...");
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (end < total - 1) {
    pages.push("...");
  }

  pages.push(total);
  return pages;
}

export function LibraryClient({ initialEntries }: LibraryClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const { openSearch } = useSearchModal();

  // Read initial filter & page values from URL params
  const statusParam = searchParams.get("status") as TabType | null;
  const initialTab: TabType =
    statusParam && ["all", "want_to", "doing", "done"].includes(statusParam) ? statusParam : "all";

  const mediumParam = searchParams.get("medium") as MediumFilter | null;
  const initialMedium: MediumFilter =
    mediumParam && ["all", "movie", "tv", "game"].includes(mediumParam) ? mediumParam : "all";

  const sortParam = searchParams.get("sort") as SortOption | null;
  const initialSort: SortOption =
    sortParam && ["updated", "year", "rating", "title"].includes(sortParam) ? sortParam : "updated";

  const initialQuery = searchParams.get("q") || "";
  const pageParam = searchParams.get("page");
  const parsedPage = pageParam ? Number.parseInt(pageParam, 10) : 1;
  const initialPage = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [mediumFilter, setMediumFilter] = useState<MediumFilter>(initialMedium);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [sortBy, setSortBy] = useState<SortOption>(initialSort);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [fadingEntryIds, setFadingEntryIds] = useState<Set<string>>(new Set());

  // Keep local entries in sync when initialEntries changes
  useEffect(() => {
    setEntries(initialEntries);
  }, [initialEntries]);

  // Sync state with URL params when user hits Browser Back/Forward
  useEffect(() => {
    if (statusParam && ["all", "want_to", "doing", "done"].includes(statusParam)) {
      setActiveTab(statusParam);
    } else if (!statusParam) {
      setActiveTab("all");
    }

    if (mediumParam && ["all", "movie", "tv", "game"].includes(mediumParam)) {
      setMediumFilter(mediumParam);
    } else if (!mediumParam) {
      setMediumFilter("all");
    }

    if (sortParam && ["updated", "year", "rating", "title"].includes(sortParam)) {
      setSortBy(sortParam);
    } else if (!sortParam) {
      setSortBy("updated");
    }

    setSearchQuery(searchParams.get("q") || "");

    const newPageRaw = searchParams.get("page");
    const newPageParsed = newPageRaw ? Number.parseInt(newPageRaw, 10) : 1;
    setCurrentPage(Number.isNaN(newPageParsed) || newPageParsed < 1 ? 1 : newPageParsed);
  }, [searchParams, statusParam, mediumParam, sortParam]);

  // Sync active filters and page to URL search params
  const updateUrlParams = useCallback(
    (
      newTab: TabType,
      newMedium: MediumFilter,
      newSort: SortOption,
      newQuery: string,
      newPage = 1,
    ) => {
      const params = new URLSearchParams();
      if (newTab !== "all") params.set("status", newTab);
      if (newMedium !== "all") params.set("medium", newMedium);
      if (newSort !== "updated") params.set("sort", newSort);
      if (newQuery.trim()) params.set("q", newQuery.trim());
      if (newPage > 1) params.set("page", String(newPage));

      const queryString = params.toString();
      const targetUrl = queryString ? `/library?${queryString}` : "/library";
      router.replace(targetUrl, { scroll: false });
    },
    [router],
  );

  // Reset page to 1 whenever tab, medium, sort, or search changes
  const handleTabChange = (tabId: TabType) => {
    setActiveTab(tabId);
    setCurrentPage(1);
    updateUrlParams(tabId, mediumFilter, sortBy, searchQuery, 1);
  };

  const handleMediumChange = (newMedium: MediumFilter) => {
    setMediumFilter(newMedium);
    setCurrentPage(1);
    updateUrlParams(activeTab, newMedium, sortBy, searchQuery, 1);
  };

  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort);
    setCurrentPage(1);
    updateUrlParams(activeTab, mediumFilter, newSort, searchQuery, 1);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
    updateUrlParams(activeTab, mediumFilter, sortBy, query, 1);
  };

  const handleClearFilters = () => {
    setMediumFilter("all");
    setSearchQuery("");
    setCurrentPage(1);
    updateUrlParams(activeTab, "all", sortBy, "", 1);
  };

  // Global '/' keyboard shortcut to focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName;
      if (e.key === "/" && targetTag !== "INPUT" && targetTag !== "TEXTAREA") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Quick status progression mutation with optimistic update and interactive Undo toast
  const { mutate: setQuickStatus } = useMutation({
    mutationFn: async ({
      media,
      status,
    }: {
      media: Entry["media"];
      status: MediaStatus;
      previousStatus?: MediaStatus | null;
    }) => {
      return logEntryApi({ media, status });
    },
    onMutate: async ({ media, status }) => {
      const targetLabel =
        status === "want_to"
          ? "Queue"
          : status === "doing"
            ? "In Progress"
            : status === "done"
              ? "Done"
              : "Dropped";

      // If activeTab is not "all" and the new status no longer matches activeTab, fade out the card
      const matchesCurrentTab = activeTab === "all" || activeTab === status;
      const matched = entries.find((e) => e.media.externalId === media.externalId);

      if (matched && !matchesCurrentTab) {
        setFadingEntryIds((prev) => new Set(prev).add(matched.id));
        setTimeout(() => {
          setEntries((prev) =>
            prev.map((e) =>
              e.media.externalId === media.externalId
                ? { ...e, status, updatedAt: new Date().toISOString() }
                : e,
            ),
          );
          setFadingEntryIds((prev) => {
            const next = new Set(prev);
            next.delete(matched.id);
            return next;
          });
        }, 300);
      } else {
        setEntries((prev) =>
          prev.map((e) =>
            e.media.externalId === media.externalId
              ? { ...e, status, updatedAt: new Date().toISOString() }
              : e,
          ),
        );
      }

      return { targetLabel };
    },
    onSuccess: (_, variables, context) => {
      router.refresh();
      toast(`Moved to ${context?.targetLabel || "status"}.`, {
        duration: 5000,
        action: variables.previousStatus
          ? {
              label: "Undo",
              onClick: () => {
                setQuickStatus({
                  media: variables.media,
                  status: variables.previousStatus as MediaStatus,
                });
              },
            }
          : undefined,
      });
    },
    onError: (err: Error) => {
      if (err.message !== "Unauthorized") {
        toast.error("Failed to update status");
      }
    },
  });

  // Remove from library mutation with optimistic update and Undo toast
  const { mutate: removeEntry } = useMutation({
    mutationFn: async (entry: Entry) => {
      return deleteEntryApi(entry.id);
    },
    onMutate: async (entry) => {
      setFadingEntryIds((prev) => new Set(prev).add(entry.id));
      setTimeout(() => {
        setEntries((prev) => prev.filter((e) => e.id !== entry.id));
        setFadingEntryIds((prev) => {
          const next = new Set(prev);
          next.delete(entry.id);
          return next;
        });
      }, 300);
    },
    onSuccess: (_, entry) => {
      router.refresh();
      toast("Removed from library.", {
        duration: 5000,
        action: {
          label: "Undo",
          onClick: () => {
            setQuickStatus({
              media: entry.media,
              status: entry.status,
            });
          },
        },
      });
    },
    onError: (err: Error) => {
      if (err.message !== "Unauthorized") {
        toast.error("Failed to remove from library");
      }
    },
  });

  // Calculate live tab counts based on currently selected medium filter
  const tabCounts = useMemo(() => {
    const mediumFiltered = entries.filter((e) => {
      if (mediumFilter === "all") return true;
      return e.media.mediaType === mediumFilter;
    });

    return {
      all: mediumFiltered.length,
      want_to: mediumFiltered.filter((e) => e.status === "want_to").length,
      doing: mediumFiltered.filter((e) => e.status === "doing").length,
      done: mediumFiltered.filter((e) => e.status === "done").length,
    };
  }, [entries, mediumFilter]);

  // Calculate live medium counts based on currently selected tab
  const mediumCounts = useMemo(() => {
    const tabFiltered = entries.filter((e) => {
      if (activeTab === "all") return true;
      return e.status === activeTab;
    });

    return {
      all: tabFiltered.length,
      movie: tabFiltered.filter((e) => e.media.mediaType === "movie").length,
      tv: tabFiltered.filter((e) => e.media.mediaType === "tv").length,
      game: tabFiltered.filter((e) => e.media.mediaType === "game").length,
    };
  }, [entries, activeTab]);

  // Filter and sort entries across whole library
  const filteredEntries = useMemo(() => {
    let result = entries.filter((e) => {
      if (activeTab !== "all" && e.status !== activeTab) return false;
      if (mediumFilter !== "all" && e.media.mediaType !== mediumFilter) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = e.media.title.toLowerCase().includes(query);
        const matchesCreator = e.media.creator?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesCreator) return false;
      }

      return true;
    });

    result = [...result].sort((a, b) => {
      if (sortBy === "rating") {
        return (b.rating ?? 0) - (a.rating ?? 0);
      }
      if (sortBy === "year") {
        return (b.media.releaseYear ?? 0) - (a.media.releaseYear ?? 0);
      }
      if (sortBy === "title") {
        return a.media.title.localeCompare(b.media.title);
      }
      // default: updated
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return result;
  }, [entries, activeTab, mediumFilter, searchQuery, sortBy]);

  // Calculate total pages for current filtered set
  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));

  // Auto-correct out-of-range page (e.g. when items are removed or filters shrink the set)
  useEffect(() => {
    if (currentPage > totalPages && totalPages >= 1) {
      setCurrentPage(totalPages);
      updateUrlParams(activeTab, mediumFilter, sortBy, searchQuery, totalPages);
    }
  }, [currentPage, totalPages, activeTab, mediumFilter, sortBy, searchQuery, updateUrlParams]);

  // Paginated items slice (24 items per page)
  const paginatedEntries = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredEntries.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredEntries, currentPage]);

  // Handle page change: smooth scroll to top of grid (below sticky toolbar)
  const handlePageChange = (newPage: number) => {
    const validPage = Math.max(1, Math.min(newPage, totalPages));
    setCurrentPage(validPage);
    updateUrlParams(activeTab, mediumFilter, sortBy, searchQuery, validPage);

    // Scroll to top of grid (just below the sticky header/toolbar)
    if (gridContainerRef.current) {
      const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const rect = gridContainerRef.current.getBoundingClientRect();
      const targetScrollY = window.scrollY + rect.top - 180; // offset for sticky navbar + toolbar

      window.scrollTo({
        top: Math.max(0, targetScrollY),
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    }
  };

  const hasActiveFilters = mediumFilter !== "all" || searchQuery.trim().length > 0;

  // Pagination display figures
  const startItem = filteredEntries.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(currentPage * PAGE_SIZE, filteredEntries.length);
  const paginationRange = useMemo(
    () => getPaginationRange(currentPage, totalPages),
    [currentPage, totalPages],
  );

  return (
    <div className="space-y-6">
      {/* Sticky Top Toolbar with Dark Glass Backdrop */}
      <div className="sticky top-20 z-20 bg-background/95 backdrop-blur-md pb-3 pt-1 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 space-y-3 border-b border-border">
        {/* Row 2: Status Underline Tabs (Radix UI Tabs) */}
        <Tabs
          value={activeTab}
          onValueChange={(val) => handleTabChange(val as TabType)}
          className="w-full"
        >
          <TabsList variant="line">
            {STATUS_TABS.map((tab) => {
              const count = tabCounts[tab.id];

              return (
                <TabsTrigger key={tab.id} value={tab.id}>
                  <span>{tab.label}</span>
                  <span className="tab-count text-xs font-mono tabular-nums">{count}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        {/* Row 3: Filter & Search Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Left Side: Medium Select & Clear Filters Link */}
          <div className="flex items-center gap-2.5">
            <Select
              value={mediumFilter}
              onValueChange={(val) => handleMediumChange(val as MediumFilter)}
            >
              <SelectTrigger aria-label="Filter by Medium">
                <SelectValue placeholder="All Media" />
              </SelectTrigger>
              <SelectContent align="start">
                {MEDIUM_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} count={mediumCounts[opt.value]}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-xs text-muted-foreground hover:text-foreground transition cursor-pointer underline underline-offset-4"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Right Side: Search Input + Sort Select */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-56">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none z-10" />
              <Input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search library (/)"
                className="pl-9 pr-7"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => handleSearchChange("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-2.5 p-0.5 rounded text-muted-foreground hover:text-foreground transition cursor-pointer z-10"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <Select value={sortBy} onValueChange={(val) => handleSortChange(val as SortOption)}>
              <SelectTrigger aria-label="Sort library">
                <SelectValue placeholder="Recently updated" />
              </SelectTrigger>
              <SelectContent align="end">
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Grid Anchor for Scroll-to-Top on Page Change */}
      <div ref={gridContainerRef} className="scroll-mt-48" />

      {/* Row 4: Empty States OR 48-Item Paginated Grid (with min-height to prevent vertical collapse) */}
      <div className="min-h-[50vh]">
        {filteredEntries.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            {/* Situation A: Brand new library (Zero items overall) */}
            {initialEntries.length === 0 && (
              <div className="flex flex-col items-center gap-3">
                <span className="size-10 grid place-items-center rounded-full bg-muted text-muted-foreground">
                  <Plus className="size-5" />
                </span>
                <h3 className="text-sm font-semibold text-foreground">Your Library is empty</h3>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Add your first movie, show, or game to start tracking.
                </p>
                <button
                  type="button"
                  onClick={openSearch}
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand hover:bg-brand/90 text-brand-foreground text-xs font-semibold transition cursor-pointer shadow-sm"
                >
                  <Plus className="size-4 stroke-2" />
                  <span>Add something</span>
                </button>
              </div>
            )}

            {/* Situation B: Search/Filter returned nothing */}
            {initialEntries.length > 0 && searchQuery.trim().length > 0 && (
              <div className="flex flex-col items-center gap-3">
                <h3 className="text-sm font-semibold text-foreground">
                  No results for &ldquo;{searchQuery}&rdquo;
                </h3>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Try searching catalog or clearing your active filters.
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="px-3.5 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-medium text-foreground transition cursor-pointer"
                  >
                    Clear filters
                  </button>
                  <button
                    type="button"
                    onClick={openSearch}
                    className="px-3.5 py-1.5 rounded-lg bg-brand hover:bg-brand/90 text-brand-foreground text-xs font-semibold transition cursor-pointer"
                  >
                    Search all of Tracklist
                  </button>
                </div>
              </div>
            )}

            {/* Situation C: Specific tab is empty */}
            {initialEntries.length > 0 && !searchQuery.trim() && (
              <div className="flex flex-col items-center gap-3">
                <span className="size-8 grid place-items-center rounded-full bg-card border border-border text-xs">
                  {activeTab === "want_to" && (
                    <span className="size-2.5 rounded-full bg-status-queue" />
                  )}
                  {activeTab === "doing" && (
                    <span className="size-2.5 rounded-full bg-status-doing" />
                  )}
                  {activeTab === "done" && (
                    <span className="size-2.5 rounded-full bg-status-done" />
                  )}
                </span>

                <h3 className="text-sm font-semibold text-foreground">
                  {activeTab === "want_to" && "Your queue is empty"}
                  {activeTab === "doing" && "Nothing in progress right now"}
                  {activeTab === "done" && "Nothing finished yet"}
                  {activeTab === "all" && "No titles match the selected medium"}
                </h3>

                <p className="text-xs text-muted-foreground max-w-xs">
                  {activeTab === "want_to" && "Find movies, TV series, or games to queue up next."}
                  {activeTab === "doing" &&
                    "Pick something from your Queue and start watching or playing."}
                  {activeTab === "done" &&
                    "Titles you complete will appear here with your ratings."}
                  {activeTab === "all" && "Try switching back to Medium: All."}
                </p>

                {activeTab === "doing" && (
                  <button
                    type="button"
                    onClick={() => handleTabChange("want_to")}
                    className="mt-2 px-4 py-2 rounded-lg bg-card hover:bg-muted border border-border text-xs font-medium text-foreground transition cursor-pointer"
                  >
                    Go to Queue
                  </button>
                )}

                {activeTab === "done" && (
                  <button
                    type="button"
                    onClick={() => handleTabChange("doing")}
                    className="mt-2 px-4 py-2 rounded-lg bg-card hover:bg-muted border border-border text-xs font-medium text-foreground transition cursor-pointer"
                  >
                    Go to In Progress
                  </button>
                )}

                {activeTab === "want_to" && (
                  <Link
                    href="/explore"
                    className="mt-2 px-4 py-2 rounded-lg bg-brand hover:bg-brand/90 text-brand-foreground text-xs font-semibold transition cursor-pointer"
                  >
                    Browse and add
                  </Link>
                )}

                {activeTab === "all" && mediumFilter !== "all" && (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="mt-2 px-4 py-2 rounded-lg border border-border bg-card hover:bg-muted text-xs font-medium text-foreground transition cursor-pointer"
                  >
                    Reset Medium to All
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          /* The Responsive Poster Grid: 48 items per page (locked to 2, 3, 4, 6, 8 columns) */
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4 pt-1">
              {paginatedEntries.map((entry) => (
                <div
                  key={entry.id}
                  className={cn(
                    "transition-opacity duration-300",
                    fadingEntryIds.has(entry.id) && "opacity-0 pointer-events-none",
                  )}
                >
                  <MediaCard
                    title={entry.media.title}
                    mediaType={entry.media.mediaType}
                    posterUrl={entry.media.posterUrl}
                    releaseYear={entry.media.releaseYear}
                    currentStatus={entry.status}
                    activeTab={activeTab}
                    href={getMediaHref(entry.media)}
                    onQuickStatus={(status) =>
                      setQuickStatus({
                        media: entry.media,
                        status,
                        previousStatus: entry.status,
                      })
                    }
                    onRemove={() => removeEntry(entry)}
                  />
                </div>
              ))}
            </div>

            {/* Classic Numbered Pagination Controls (Centered: 40px above, 64px below) */}
            {totalPages > 1 && (
              <div className="mt-10 mb-16 flex flex-col items-center justify-center gap-3">
                {/* Muted Footer Count Text */}
                <span className="text-xs text-muted-foreground font-mono tabular-nums">
                  Showing {startItem}–{endItem} of {filteredEntries.length}
                </span>

                <Pagination>
                  <PaginationContent>
                    {/* Mobile View (<640px): Prev, "Page X of Y", Next */}
                    <div className="flex sm:hidden items-center gap-3">
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage <= 1}
                        />
                      </PaginationItem>
                      <span className="text-xs text-foreground font-mono tabular-nums">
                        Page {currentPage} of {totalPages}
                      </span>
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage >= totalPages}
                        />
                      </PaginationItem>
                    </div>

                    {/* Desktop View (>=640px): Numbered Buttons with Prev/Next and Ellipsis */}
                    <div className="hidden sm:flex items-center gap-1.5">
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage <= 1}
                        />
                      </PaginationItem>

                      {paginationRange.map((page, index) => {
                        if (page === "...") {
                          const ellipsisKey = index < 3 ? "ellipsis-left" : "ellipsis-right";
                          return (
                            <PaginationItem key={ellipsisKey}>
                              <PaginationEllipsis />
                            </PaginationItem>
                          );
                        }

                        const isCurrent = page === currentPage;
                        return (
                          <PaginationItem key={page}>
                            <PaginationLink
                              isActive={isCurrent}
                              aria-label={`Page ${page}`}
                              onClick={() => handlePageChange(page)}
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}

                      <PaginationItem>
                        <PaginationNext
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage >= totalPages}
                        />
                      </PaginationItem>
                    </div>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
