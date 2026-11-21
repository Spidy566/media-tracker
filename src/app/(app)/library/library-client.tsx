"use client";

import { useMutation } from "@tanstack/react-query";
import { ArrowUpDown, Ban, Bookmark, Check, Play, Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { MediaCard, type MediaStatus } from "@/components/media-card";
import { MediaGrid } from "@/components/media-grid";
import { logEntryApi } from "@/lib/api-entries";
import { getStatusVerb } from "@/lib/media-formatters";
import { getMediaHref } from "@/lib/utils";
import type { Entry } from "@/types/entry";

interface LibraryClientProps {
  initialEntries: Entry[];
}

type SortOption = "updated" | "rating" | "year" | "title";

const STATUS_TABS: Array<{ status: MediaStatus; label: string; icon: typeof Bookmark }> = [
  { status: "want_to", label: "Queue", icon: Bookmark },
  { status: "doing", label: "In Progress", icon: Play },
  { status: "done", label: "Done", icon: Check },
  { status: "dropped", label: "Dropped", icon: Ban },
];

const SORT_OPTIONS: Array<{ key: SortOption; label: string }> = [
  { key: "updated", label: "Recently Updated" },
  { key: "rating", label: "Highest Rated" },
  { key: "year", label: "Release Year" },
  { key: "title", label: "Title (A–Z)" },
];

const EMPTY_STATES: Record<MediaStatus, { title: string; subtitle: string }> = {
  want_to: {
    title: "Your Queue is empty",
    subtitle: "Find movies, TV series, or games in Explore to add to your queue.",
  },
  doing: {
    title: "Nothing in progress",
    subtitle: "Start watching or playing something from your queue.",
  },
  done: {
    title: "No completed titles yet",
    subtitle: "Titles you mark as finished will appear here.",
  },
  dropped: {
    title: "No dropped titles",
    subtitle: "Titles you decided not to finish will appear here.",
  },
};

export function LibraryClient({ initialEntries }: LibraryClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusParam = searchParams.get("status") as MediaStatus | null;
  const initialTab: MediaStatus =
    statusParam && ["want_to", "doing", "done", "dropped"].includes(statusParam)
      ? statusParam
      : "want_to";

  const [activeTab, setActiveTab] = useState<MediaStatus>(initialTab);
  const [mediaFilter, setMediaFilter] = useState<"all" | "movie" | "tv" | "game">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("updated");

  useEffect(() => {
    if (statusParam && ["want_to", "doing", "done", "dropped"].includes(statusParam)) {
      setActiveTab(statusParam);
    }
  }, [statusParam]);

  const { mutate: setQuickStatus } = useMutation({
    mutationFn: async ({ media, status }: { media: Entry["media"]; status: MediaStatus }) => {
      return logEntryApi({
        media,
        status,
      });
    },
    onSuccess: (_, variables) => {
      router.refresh();
      toast.success(getStatusVerb(variables.status), {
        description: variables.media.title,
      });
    },
    onError: (err: Error) => {
      if (err.message !== "Unauthorized") {
        toast.error("Failed to update status");
      }
    },
  });

  const filteredEntries = useMemo(() => {
    let result = initialEntries.filter((e) => {
      if (e.status !== activeTab) return false;
      if (mediaFilter !== "all" && e.media.mediaType !== mediaFilter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = e.media.title.toLowerCase().includes(query);
        const matchesCreator = e.media.creator?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesCreator) return false;
      }
      return true;
    });

    // Sorting
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
  }, [initialEntries, activeTab, mediaFilter, searchQuery, sortBy]);

  const counts = {
    want_to: initialEntries.filter((e) => e.status === "want_to").length,
    doing: initialEntries.filter((e) => e.status === "doing").length,
    done: initialEntries.filter((e) => e.status === "done").length,
    dropped: initialEntries.filter((e) => e.status === "dropped").length,
  };

  const isFilterMismatch = counts[activeTab] > 0 && filteredEntries.length === 0;

  return (
    <div className="space-y-6">
      {/* 1. Status Tabs & Media Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border">
        {/* Capsule Status Tabs */}
        <div className="flex items-center gap-1.5 bg-muted/60 border border-border p-1 rounded-full overflow-x-auto scrollbar-none">
          {STATUS_TABS.map(({ status, label, icon: Icon }) => (
            <button
              key={status}
              type="button"
              onClick={() => {
                setActiveTab(status);
                router.replace(`/library?status=${status}`, { scroll: false });
              }}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer shrink-0 ${
                activeTab === status
                  ? "bg-foreground text-background shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-3.5" />
              <span>
                {label}{" "}
                <span className="font-mono tabular-nums">({counts[status]})</span>
              </span>
            </button>
          ))}
        </div>

        {/* Media Type Filter */}
        <div className="flex items-center gap-1 text-xs">
          {(["all", "movie", "tv", "game"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setMediaFilter(t)}
              className={`px-3 py-1 rounded-full capitalize font-semibold transition cursor-pointer ${
                mediaFilter === t
                  ? "bg-muted text-foreground border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "all" ? "All Media" : t === "tv" ? "TV Series" : `${t}s`}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Search & Sort Controls Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Instant Title Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your library..."
            className="w-full h-9 pl-9 pr-8 rounded-xl bg-card border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Sort Dropdown / Selector */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <ArrowUpDown className="size-3.5 text-muted-foreground shrink-0" />
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono mr-1 hidden sm:inline">
            Sort
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="h-9 px-3 rounded-xl bg-card border border-border text-xs text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition cursor-pointer"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. Grid or Empty State */}
      {filteredEntries.length === 0 ? (
        <div className="text-center py-24 border border-dashed border-border rounded-3xl p-6">
          <p className="text-sm font-semibold text-foreground font-sans">
            {searchQuery
              ? `No titles match "${searchQuery}"`
              : isFilterMismatch
                ? `No ${mediaFilter === "tv" ? "TV Series" : `${mediaFilter}s`} in this section`
                : EMPTY_STATES[activeTab].title}
          </p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {searchQuery
              ? "Try adjusting your search terms or clearing the filter."
              : isFilterMismatch
                ? "You have other titles in this status. Switch to All Media to see them."
                : EMPTY_STATES[activeTab].subtitle}
          </p>
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="mt-4 text-xs font-semibold px-4 py-1.5 rounded-xl bg-muted text-foreground border border-border hover:bg-secondary transition cursor-pointer"
            >
              Clear Search
            </button>
          ) : isFilterMismatch ? (
            <button
              type="button"
              onClick={() => setMediaFilter("all")}
              className="mt-4 text-xs font-semibold px-4 py-1.5 rounded-xl bg-muted text-foreground border border-border hover:bg-secondary transition cursor-pointer"
            >
              View All Media
            </button>
          ) : null}
        </div>
      ) : (
        <MediaGrid>
          {filteredEntries.map((entry) => (
            <MediaCard
              key={entry.id}
              title={entry.media.title}
              mediaType={entry.media.mediaType}
              posterUrl={entry.media.posterUrl}
              releaseYear={entry.media.releaseYear}
              rating={entry.rating}
              currentStatus={entry.status}
              onQuickStatus={(status) => setQuickStatus({ media: entry.media, status })}
              onClick={() => router.push(getMediaHref(entry.media))}
            />
          ))}
        </MediaGrid>
      )}
    </div>
  );
}
