"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { useState } from "react";
import { TrackDialog } from "@/components/track-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useActiveUser } from "@/hooks/use-active-user";

interface Entry {
  id: string;
  status: "want_to" | "doing" | "done" | "dropped";
  rating: number | null;
  reviewNote: string | null;
  updatedAt: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  media: {
    id: string;
    externalId: string;
    mediaType: "movie" | "tv" | "game" | "book";
    title: string;
    releaseYear: number | null;
    posterUrl: string | null;
    creator: string | null;
    genres: string[];
  };
}

export default function HomePage() {
  const { currentUser } = useActiveUser();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"squad" | "me">("squad");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "want_to" | "doing" | "done" | "dropped"
  >("all");
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);

  const { data, isLoading } = useQuery<{ entries: Entry[] }>({
    queryKey: ["entries", activeTab, activeTab === "me" ? currentUser?.id : null],
    queryFn: async () => {
      const url =
        activeTab === "me" && currentUser
          ? `/api/entries?userId=${currentUser.id}`
          : "/api/entries";
      const res = await fetch(url);
      return res.json();
    },
    enabled: activeTab === "squad" || Boolean(currentUser),
  });

  // The 1-click "Steal to Backlog" button
  const { mutate: stealToBacklog, isPending } = useMutation({
    mutationFn: async (media: Entry["media"]) => {
      if (!currentUser) return;
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          media,
          status: "want_to",
        }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
    },
  });

  // Delete entry mutation
  const { mutate: deleteEntry, isPending: isDeleting } = useMutation({
    mutationFn: async (entryId: string) => {
      if (!currentUser) return;
      const res = await fetch(`/api/entries?id=${entryId}&userId=${currentUser.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      // Refresh the feed automatically
      queryClient.invalidateQueries({ queryKey: ["entries"] });
    },
  });

  const entries = data?.entries || [];

  // Count items per status for the active user
  const statusCounts = {
    all: entries.length,
    want_to: entries.filter((e) => e.status === "want_to").length,
    doing: entries.filter((e) => e.status === "doing").length,
    done: entries.filter((e) => e.status === "done").length,
    dropped: entries.filter((e) => e.status === "dropped").length,
  };

  // Filter entries if we're on "My Stash" and a specific status is chosen
  const displayedEntries =
    activeTab === "squad"
      ? entries.filter((e) => e.user.id !== currentUser?.id)
      : statusFilter !== "all"
        ? entries.filter((e) => e.status === statusFilter)
        : entries;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
      {/* Top Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <span>{activeTab === "squad" ? "Squad Lounge" : "My Stash"}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/70">
              {displayedEntries.length} {displayedEntries.length === 1 ? "title" : "titles"}
            </span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {activeTab === "squad"
              ? "Live activity and ratings from the homies."
              : `Everything tracked by ${currentUser?.displayName || "you"}.`}
          </p>
        </div>

        {/* Tab & Status Filter Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <Tabs
            value={activeTab}
            onValueChange={(val) => {
              setActiveTab(val as "squad" | "me");
              setStatusFilter("all");
            }}
          >
            <TabsList className="bg-white/5 border border-white/10 p-1 h-9 rounded-xl">
              <TabsTrigger
                value="squad"
                className="text-xs px-3.5 rounded-lg data-[state=active]:bg-[#ff4b72] data-[state=active]:text-white font-semibold transition"
              >
                Squad Feed
              </TabsTrigger>
              <TabsTrigger
                value="me"
                className="text-xs px-3.5 rounded-lg data-[state=active]:bg-[#ff4b72] data-[state=active]:text-white font-semibold transition"
              >
                My Stash
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Sub-Filters (When viewing My Stash) */}
      {activeTab === "me" && (
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6">
          {(
            [
              { key: "all", label: "All Titles" },
              { key: "want_to", label: "Backlog" },
              { key: "doing", label: "In Progress" },
              { key: "done", label: "Completed" },
              { key: "dropped", label: "Dropped" },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatusFilter(key)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition shrink-0 ${
                statusFilter === key
                  ? "bg-white text-black border-white shadow-sm"
                  : "bg-white/5 border-white/10 text-muted-foreground hover:text-white hover:bg-white/10"
              }`}
            >
              {label} <span className="opacity-50 ml-1">({statusCounts[key]})</span>
            </button>
          ))}
        </div>
      )}

      {/* Loading Skeleton Grid */}
      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="aspect-2/3 bg-white/5 rounded-xl animate-pulse border border-white/5"
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && displayedEntries.length === 0 && (
        <div className="text-center py-28 border border-dashed border-white/10 rounded-2xl">
          <p className="text-base font-bold text-white">
            {activeTab === "squad" ? "No squad activity yet" : "Your stash is empty"}
          </p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {activeTab === "squad"
              ? "When your friends log movies, TV shows, or games, they will appear here!"
              : "Hit the search bar above or Explore to log your first title."}
          </p>
        </div>
      )}

      {/* Watcharr / Yamtrack Style Poster Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {displayedEntries.map((entry, index) => {
          const isMe = currentUser?.id === entry.user.id;

          return (
            <div
              key={entry.id}
              className="group relative aspect-2/3 rounded-xl overflow-hidden bg-[#141820] border border-white/10 hover:border-white/30 transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:z-10 flex flex-col justify-between"
            >
              {/* Poster Image */}
              {entry.media.posterUrl ? (
                <Image
                  src={entry.media.posterUrl}
                  alt={entry.media.title}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                  className="object-cover transition duration-300 group-hover:brightness-90"
                  priority={index < 4}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-white/5">
                  <span className="font-bold text-xs text-white/80 line-clamp-2">
                    {entry.media.title}
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-1 uppercase">
                    {entry.media.mediaType}
                  </span>
                </div>
              )}

              {/* Top Floating Badges */}
              <div className="relative z-10 p-2.5 flex items-start justify-between gap-1">
                {/* User tag (Squad feed) or Status badge (My Stash) */}
                {activeTab === "squad" ? (
                  <span className="bg-black/75 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-md border border-white/10 flex items-center gap-1 shadow-sm">
                    {entry.user.displayName}
                  </span>
                ) : (
                  <span className="bg-black/75 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-md border border-white/10 uppercase tracking-wider">
                    {entry.status.replace("_", " ")}
                  </span>
                )}

                {/* Rating Badge */}
                {entry.rating && (
                  <span className="bg-black/85 backdrop-blur-md text-amber-400 font-black text-xs px-2 py-0.5 rounded-md border border-amber-500/30 flex items-center gap-1 shadow-sm">
                    ★ {entry.rating}
                  </span>
                )}
              </div>

              {/* Bottom Info Gradient */}
              <div className="relative z-10 p-3 bg-linear-to-t from-black/95 via-black/70 to-transparent pt-8">
                <h3 className="font-bold text-xs text-white leading-snug line-clamp-1 group-hover:line-clamp-2 transition">
                  {entry.media.title}
                </h3>
                <div className="flex items-center gap-1.5 text-[10px] text-white/60 mt-0.5">
                  <span>{entry.media.releaseYear || "TBA"}</span>
                  <span>•</span>
                  <span className="uppercase">{entry.media.mediaType}</span>
                </div>

                {/* Review Note Preview if present */}
                {entry.reviewNote && (
                  <p className="text-[10px] text-white/90 italic mt-1.5 line-clamp-1 border-l border-[#ff4b72] pl-1.5 bg-black/40 rounded-r py-0.5">
                    &ldquo;{entry.reviewNote}&rdquo;
                  </p>
                )}

                {/* Action Buttons (Slide-up on Hover) */}
                <div className="pt-2 mt-1 border-t border-white/10 flex items-center justify-between gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {!isMe && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={(e) => {
                        e.stopPropagation();
                        stealToBacklog(entry.media);
                      }}
                      className="w-full text-center py-1 rounded bg-[#ff4b72] hover:bg-[#ff335e] text-white text-[11px] font-bold transition shadow-sm"
                    >
                      + Steal
                    </button>
                  )}

                  {isMe && (
                    <div className="flex items-center gap-1 w-full">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingEntry(entry);
                        }}
                        className="flex-1 py-1 rounded bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold transition text-center"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteEntry(entry.id);
                        }}
                        className="py-1 px-2 rounded bg-red-500/20 hover:bg-red-500/30 text-red-400 text-[11px] font-bold transition"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Modal */}
      {editingEntry && currentUser && (
        <TrackDialog
          media={{
            externalId: editingEntry.media.externalId,
            mediaType: editingEntry.media.mediaType as "movie" | "tv" | "game",
            title: editingEntry.media.title,
            releaseYear: editingEntry.media.releaseYear,
            posterUrl: editingEntry.media.posterUrl,
            creator: editingEntry.media.creator,
            summary: null,
            genres: editingEntry.media.genres,
          }}
          userId={currentUser.id}
          initialStatus={editingEntry.status}
          initialRating={editingEntry.rating}
          initialNote={editingEntry.reviewNote}
          onClose={() => setEditingEntry(null)}
        />
      )}
    </main>
  );
}
