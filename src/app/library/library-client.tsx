"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bookmark, Check, Play, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { MediaCard, type MediaStatus } from "@/components/media-card";
import { logEntryApi } from "@/lib/api-entries";
import type { Entry } from "@/types/entry";

interface LibraryClientProps {
  initialEntries: Entry[];
}

export function LibraryClient({ initialEntries }: LibraryClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<MediaStatus>("want_to");
  const [mediaFilter, setMediaFilter] = useState<"all" | "movie" | "tv" | "game">("all");

  const { mutate: setQuickStatus } = useMutation({
    mutationFn: async ({ media, status }: { media: Entry["media"]; status: MediaStatus }) => {
      return logEntryApi({
        media,
        status,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-entries"] });
      router.refresh(); // Refresh server component data
      toast.success("Status updated");
    },
  });

  const filteredEntries = initialEntries.filter((e) => {
    if (e.status !== activeTab) return false;
    if (mediaFilter !== "all" && e.media.mediaType !== mediaFilter) return false;
    return true;
  });

  const counts = {
    want_to: initialEntries.filter((e) => e.status === "want_to").length,
    doing: initialEntries.filter((e) => e.status === "doing").length,
    done: initialEntries.filter((e) => e.status === "done").length,
    dropped: initialEntries.filter((e) => e.status === "dropped").length,
  };

  return (
    <div className="space-y-6">
      {/* Capsule Status Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border">
        <div className="flex items-center gap-1.5 bg-muted/60 border border-border p-1 rounded-full">
          <button
            type="button"
            onClick={() => setActiveTab("want_to")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
              activeTab === "want_to"
                ? "bg-foreground text-background shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Queue ({counts.want_to})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("doing")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
              activeTab === "doing"
                ? "bg-foreground text-background shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>In Progress ({counts.doing})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("done")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
              activeTab === "done"
                ? "bg-foreground text-background shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            <span>Done ({counts.done})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("dropped")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
              activeTab === "dropped"
                ? "bg-foreground text-background shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Dropped ({counts.dropped})</span>
          </button>
        </div>

        {/* Media Type Filter */}
        <div className="flex items-center gap-1 text-xs">
          {(["all", "movie", "tv", "game"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setMediaFilter(t)}
              className={`px-3 py-1 rounded-full capitalize font-medium transition cursor-pointer ${
                mediaFilter === t
                  ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "all" ? "All Media" : t === "tv" ? "TV Shows" : `${t}s`}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filteredEntries.length === 0 ? (
        <div className="text-center py-24 border border-dashed border-border rounded-3xl">
          <p className="text-sm font-semibold text-foreground">No titles in this section</p>
          <p className="text-xs text-muted-foreground mt-1">
            Press ⌘K to search and start building your collection.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredEntries.map((entry) => {
            const parts = entry.media.externalId.split(":");
            const rawId = parts[parts.length - 1];

            return (
              <MediaCard
                key={entry.id}
                title={entry.media.title}
                mediaType={entry.media.mediaType}
                posterUrl={entry.media.posterUrl}
                releaseYear={entry.media.releaseYear}
                rating={entry.rating}
                currentStatus={entry.status}
                onQuickStatus={(status) => setQuickStatus({ media: entry.media, status })}
                onClick={() => router.push(`/media/${entry.media.mediaType}/${rawId}`)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
