"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, Check, Play, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { MediaCard, type MediaStatus } from "@/components/media-card";
import { useActiveUser } from "@/hooks/use-active-user";

interface Entry {
  id: string;
  status: MediaStatus;
  rating: number | null;
  reviewNote: string | null;
  updatedAt: string;
  media: {
    id: string;
    externalId: string;
    mediaType: "movie" | "tv" | "game";
    title: string;
    releaseYear: number | null;
    posterUrl: string | null;
    creator: string | null;
    genres: string[];
  };
}

const LIBRARY_SKELETON_KEYS = [
  "lib-skel-1",
  "lib-skel-2",
  "lib-skel-3",
  "lib-skel-4",
  "lib-skel-5",
  "lib-skel-6",
  "lib-skel-7",
  "lib-skel-8",
  "lib-skel-9",
  "lib-skel-10",
  "lib-skel-11",
  "lib-skel-12",
];

export default function LibraryPage() {
  const router = useRouter();
  const { currentUser } = useActiveUser();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<MediaStatus>("want_to");
  const [mediaFilter, setMediaFilter] = useState<"all" | "movie" | "tv" | "game">("all");

  const { data, isLoading } = useQuery<{ entries: Entry[] }>({
    queryKey: ["my-entries", currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return { entries: [] };
      const res = await fetch(`/api/entries?userId=${currentUser.id}`);
      return res.json();
    },
    enabled: Boolean(currentUser),
  });

  const { mutate: setQuickStatus } = useMutation({
    mutationFn: async ({ media, status }: { media: Entry["media"]; status: MediaStatus }) => {
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
      queryClient.invalidateQueries({ queryKey: ["my-entries"] });
      toast.success("Status updated");
    },
  });

  const entries = data?.entries || [];

  const filteredEntries = entries.filter((e) => {
    if (e.status !== activeTab) return false;
    if (mediaFilter !== "all" && e.media.mediaType !== mediaFilter) return false;
    return true;
  });

  const counts = {
    want_to: entries.filter((e) => e.status === "want_to").length,
    doing: entries.filter((e) => e.status === "doing").length,
    done: entries.filter((e) => e.status === "done").length,
    dropped: entries.filter((e) => e.status === "dropped").length,
  };

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          Your Library
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          Everything you have logged, bookmarked, or completed.
        </p>
      </div>

      {/* Capsule Status Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-zinc-800/80">
        <div className="flex items-center gap-1.5 bg-zinc-900/80 border border-zinc-800/80 p-1 rounded-full">
          <button
            type="button"
            onClick={() => setActiveTab("want_to")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
              activeTab === "want_to"
                ? "bg-zinc-800 text-white shadow-xs"
                : "text-zinc-400 hover:text-zinc-200"
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
                ? "bg-zinc-800 text-white shadow-xs"
                : "text-zinc-400 hover:text-zinc-200"
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
                ? "bg-zinc-800 text-white shadow-xs"
                : "text-zinc-400 hover:text-zinc-200"
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
                ? "bg-zinc-800 text-white shadow-xs"
                : "text-zinc-400 hover:text-zinc-200"
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
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {t === "all" ? "All Media" : t === "tv" ? "TV Shows" : `${t}s`}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {LIBRARY_SKELETON_KEYS.map((id) => (
            <div
              key={id}
              className="aspect-2/3 bg-zinc-900 rounded-2xl animate-pulse border border-zinc-800/60"
            />
          ))}
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-24 border border-dashed border-zinc-800 rounded-3xl">
          <p className="text-sm font-semibold text-zinc-300">No titles in this section</p>
          <p className="text-xs text-zinc-500 mt-1">
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
    </main>
  );
}
