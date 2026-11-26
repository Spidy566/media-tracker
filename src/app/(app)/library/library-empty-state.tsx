"use client";

import { Plus } from "lucide-react";
import Link from "next/link";

export type LibraryTabType = "all" | "want_to" | "doing" | "done";
export type LibraryMediumFilter = "all" | "movie" | "tv" | "game";

interface LibraryEmptyStateProps {
  totalEntries: number;
  activeTab: LibraryTabType;
  mediumFilter: LibraryMediumFilter;
  searchQuery: string;
  onOpenSearch: () => void;
  onClearFilters: () => void;
  onTabChange: (tab: LibraryTabType) => void;
}

/**
 * Empty state views for Library: brand new library, no search matches, or empty status tab.
 */
export function LibraryEmptyState({
  totalEntries,
  activeTab,
  mediumFilter,
  searchQuery,
  onOpenSearch,
  onClearFilters,
  onTabChange,
}: LibraryEmptyStateProps) {
  return (
    <div className="py-20 flex flex-col items-center justify-center text-center">
      {totalEntries === 0 && (
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
            onClick={onOpenSearch}
            className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand hover:bg-brand/90 text-brand-foreground text-xs font-semibold transition cursor-pointer shadow-sm"
          >
            <Plus className="size-4 stroke-2" />
            <span>Add something</span>
          </button>
        </div>
      )}

      {totalEntries > 0 && searchQuery.trim().length > 0 && (
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
              onClick={onClearFilters}
              className="px-3.5 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-medium text-foreground transition cursor-pointer"
            >
              Clear filters
            </button>
            <button
              type="button"
              onClick={onOpenSearch}
              className="px-3.5 py-1.5 rounded-lg bg-brand hover:bg-brand/90 text-brand-foreground text-xs font-semibold transition cursor-pointer"
            >
              Search all of Tracklist
            </button>
          </div>
        </div>
      )}

      {totalEntries > 0 && !searchQuery.trim() && (
        <div className="flex flex-col items-center gap-3">
          <span className="size-8 grid place-items-center rounded-full bg-card border border-border text-xs">
            {activeTab === "want_to" && <span className="size-2.5 rounded-full bg-status-queue" />}
            {activeTab === "doing" && <span className="size-2.5 rounded-full bg-status-doing" />}
            {activeTab === "done" && <span className="size-2.5 rounded-full bg-status-done" />}
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
            {activeTab === "done" && "Titles you complete will appear here with your ratings."}
            {activeTab === "all" && "Try switching back to Medium: All."}
          </p>

          {activeTab === "doing" && (
            <button
              type="button"
              onClick={() => onTabChange("want_to")}
              className="mt-2 px-4 py-2 rounded-lg bg-card hover:bg-muted border border-border text-xs font-medium text-foreground transition cursor-pointer"
            >
              Go to Queue
            </button>
          )}

          {activeTab === "done" && (
            <button
              type="button"
              onClick={() => onTabChange("doing")}
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
              onClick={onClearFilters}
              className="mt-2 px-4 py-2 rounded-lg border border-border bg-card hover:bg-muted text-xs font-medium text-foreground transition cursor-pointer"
            >
              Reset Medium to All
            </button>
          )}
        </div>
      )}
    </div>
  );
}
