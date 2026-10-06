"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { MediaCard, type MediaStatus } from "@/components/media-card";
import type { Entry } from "@/types/entry";

interface SquadClientProps {
  entries: Entry[];
}

export function SquadClient({ entries }: SquadClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"all" | MediaStatus>("done");
  const [mediaFilter, setMediaFilter] = useState<"all" | "movie" | "tv" | "game">("all");

  const { mutate: quickTrack } = useMutation({
    mutationFn: async ({ media, status }: { media: Entry["media"]; status: MediaStatus }) => {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          media,
          status,
        }),
      });
      if (!res.ok) throw new Error("Failed to track");
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["my-entries"] });
      toast.success("Saved to your stash", {
        description: variables.media.title,
      });
    },
  });

  const completedCount = entries.filter((e) => e.status === "done").length;
  const activeCount = entries.filter((e) => e.status === "doing").length;
  const queueCount = entries.filter((e) => e.status === "want_to").length;

  const filteredEntries = entries.filter((e) => {
    if (activeTab !== "all" && e.status !== activeTab) return false;
    if (mediaFilter !== "all" && e.media.mediaType !== mediaFilter) return false;
    return true;
  });

  const navigateToMedia = (media: Entry["media"]) => {
    const parts = media.externalId.split(":");
    const rawId = parts[parts.length - 1];
    router.push(`/media/${media.mediaType}/${rawId}`);
  };

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border">
        <div className="flex items-center gap-1.5 bg-muted/50 border border-border p-1 rounded-full">
          <button
            type="button"
            onClick={() => setActiveTab("done")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
              activeTab === "done"
                ? "bg-foreground text-background shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Completed ({completedCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("doing")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
              activeTab === "doing"
                ? "bg-foreground text-background shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            In Progress ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("want_to")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
              activeTab === "want_to"
                ? "bg-foreground text-background shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            In Queue ({queueCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
              activeTab === "all"
                ? "bg-foreground text-background shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Titles ({entries.length})
          </button>
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
              {t === "all" ? "All Media" : t === "tv" ? "TV" : `${t}s`}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filteredEntries.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-border rounded-3xl">
          <p className="text-sm font-semibold text-foreground">No titles in this section</p>
          <p className="text-xs text-muted-foreground mt-1">
            This squad member hasn&apos;t added any items here yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredEntries.map((entry) => (
            <div key={entry.id} className="flex flex-col gap-2">
              <MediaCard
                title={entry.media.title}
                mediaType={entry.media.mediaType}
                posterUrl={entry.media.posterUrl}
                releaseYear={entry.media.releaseYear}
                rating={entry.rating}
                onQuickStatus={(status) => quickTrack({ media: entry.media, status })}
                onClick={() => navigateToMedia(entry.media)}
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
        </div>
      )}
    </div>
  );
}
