"use client";

import { useState } from "react";
import { MediaCard } from "@/components/media-card";
import { MediaGrid } from "@/components/media-grid";
import type { MediaStatus } from "@/db/schema";
import { useEntryMutations } from "@/hooks/use-entry-mutations";
import { cn, getMediaHref } from "@/lib/utils";
import type { Entry } from "@/types/entry";

export interface FriendProfileClientProps {
  entries: Entry[];
}

export function FriendProfileClient({ entries }: FriendProfileClientProps) {
  const [activeTab, setActiveTab] = useState<"all" | MediaStatus>("done");
  const [mediaFilter, setMediaFilter] = useState<"all" | "movie" | "tv" | "game">("all");

  const { logEntry: quickTrack } = useEntryMutations();

  const statusTabs: Array<{ key: "all" | MediaStatus; label: string; count: number }> = [
    { key: "done", label: "Done", count: entries.filter((e) => e.status === "done").length },
    {
      key: "doing",
      label: "In Progress",
      count: entries.filter((e) => e.status === "doing").length,
    },
    {
      key: "want_to",
      label: "Queue",
      count: entries.filter((e) => e.status === "want_to").length,
    },
    { key: "all", label: "All Titles", count: entries.length },
  ];

  const filteredEntries = entries.filter((e) => {
    if (activeTab !== "all" && e.status !== activeTab) return false;
    if (mediaFilter !== "all" && e.media.mediaType !== mediaFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border">
        <div className="flex items-center gap-1.5 bg-muted/50 border border-border p-1 rounded-full">
          {statusTabs.map(({ key, label, count }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer",
                activeTab === key
                  ? "bg-foreground text-background shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label} ({count})
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 text-xs">
          {(["all", "movie", "tv", "game"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setMediaFilter(t)}
              className={`px-3 py-1 rounded-full capitalize font-semibold transition cursor-pointer ${
                mediaFilter === t
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground bg-muted/40"
              }`}
            >
              {t === "all" ? "All Media" : t === "tv" ? "TV Series" : `${t}s`}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filteredEntries.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-border rounded-3xl">
          <p className="text-sm font-semibold text-foreground">No titles in this section</p>
          <p className="text-xs text-muted-foreground mt-1">
            This friend hasn&apos;t added any items here yet.
          </p>
        </div>
      ) : (
        <MediaGrid>
          {filteredEntries.map((entry) => (
            <div key={entry.id} className="flex flex-col gap-2">
              <MediaCard
                title={entry.media.title}
                mediaType={entry.media.mediaType}
                posterUrl={entry.media.posterUrl}
                releaseYear={entry.media.releaseYear}
                href={getMediaHref(entry.media)}
                onQuickStatus={(status) => quickTrack({ media: entry.media, status })}
              />
              {entry.reviewNote && (
                <div className="p-2 rounded-xl bg-card border border-border shadow-2xs">
                  <p className="text-[11px] text-muted-foreground italic line-clamp-3">
                    &ldquo;{entry.reviewNote}&rdquo;
                  </p>
                </div>
              )}
            </div>
          ))}
        </MediaGrid>
      )}
    </div>
  );
}
