"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { useState } from "react";
import { TrackDialog } from "@/components/track-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

const statusTextMap = {
  want_to: "wants to check out",
  doing: "is currently watching / playing",
  done: "completed",
  dropped: "dropped",
};

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

  // Calculate stats for current view
  const totalEntries = entries.length;
  const gamesCount = entries.filter((e) => e.media.mediaType === "game").length;
  const moviesCount = entries.filter((e) => e.media.mediaType === "movie").length;
  const tvCount = entries.filter((e) => e.media.mediaType === "tv").length;

  // Calculate average rating (ignoring unrated items)
  const ratedEntries = entries.filter((e) => typeof e.rating === "number");
  const avgRating =
    ratedEntries.length > 0
      ? (ratedEntries.reduce((sum, e) => sum + (e.rating || 0), 0) / ratedEntries.length).toFixed(1)
      : null;

  // Filter entries if we're on "My Stash" and a specific status is chosen
  const displayedEntries =
    activeTab === "squad"
      ? entries.filter((e) => e.user.id !== currentUser?.id)
      : statusFilter !== "all"
        ? entries.filter((e) => e.status === statusFilter)
        : entries;

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 flex-1 w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {activeTab === "squad" ? "The Squad Lounge" : "My Personal Stash"}
          </h1>
          <p className="text-muted-foreground text-xs mt-1">
            {activeTab === "squad"
              ? "Live activity and ratings from you and the homies."
              : `All titles tracked by ${currentUser?.displayName || "you"}.`}
          </p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(val) => {
            setActiveTab(val as "squad" | "me");
            setStatusFilter("all");
          }}
        >
          <TabsList className="bg-white/5 border border-white/10 p-1 h-9">
            <TabsTrigger
              value="squad"
              className="text-xs px-3 data-[state=active]:bg-[#ff4b72] data-[state=active]:text-white"
            >
              Squad Feed
            </TabsTrigger>
            <TabsTrigger
              value="me"
              className="text-xs px-3 data-[state=active]:bg-[#ff4b72] data-[state=active]:text-white"
            >
              My Stash
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Sleek Stats Bar */}
      {!isLoading && totalEntries > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 p-4 rounded-xl border border-white/10 bg-[#141820]/80">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Total Logged
            </span>
            <span className="text-xl sm:text-2xl font-black text-white mt-0.5">{totalEntries}</span>
          </div>

          <div className="flex flex-col border-x border-white/10 px-3 sm:px-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Breakdown
            </span>
            <div className="flex items-center gap-2 mt-1 text-xs font-semibold text-white/90">
              {gamesCount > 0 && <span>🎮 {gamesCount}</span>}
              {moviesCount > 0 && <span>🎬 {moviesCount}</span>}
              {tvCount > 0 && <span>📺 {tvCount}</span>}
            </div>
          </div>

          <div className="flex flex-col pl-2 sm:pl-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Avg Score
            </span>
            <span className="text-xl sm:text-2xl font-black text-amber-400 mt-0.5">
              {avgRating ? `★ ${avgRating}` : "—"}
            </span>
          </div>
        </div>
      )}

      {/* Status Filter Pills (Only on "My Stash") */}
      {activeTab === "me" && (
        <div className="flex items-center gap-1.5 flex-wrap mb-6">
          {(
            [
              { key: "all", label: "All" },
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
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${
                statusFilter === key
                  ? "bg-white text-black border-white"
                  : "bg-white/5 border-white/10 text-muted-foreground hover:text-white hover:bg-white/10"
              }`}
            >
              {label} <span className="opacity-60 ml-1">({statusCounts[key]})</span>
            </button>
          ))}
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 rounded-xl bg-white/5 animate-pulse border border-white/5"
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && displayedEntries.length === 0 && (
        <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl">
          <p className="font-semibold text-white">
            {activeTab === "squad" ? "No squad activity yet." : "Your stash is empty."}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {activeTab === "squad"
              ? "When friends log movies or games, their activity will appear here!"
              : "Use the search bar or Explore to add your first title."}
          </p>
        </div>
      )}

      {/* Entries List */}
      <div className="space-y-3">
        {displayedEntries.map((entry) => {
          const isMe = currentUser?.id === entry.user.id;

          return (
            <div
              key={entry.id}
              className="border border-white/10 bg-[#141820]/60 hover:bg-[#141820] transition rounded-xl p-4 flex gap-4 items-start"
            >
              {entry.media.posterUrl ? (
                <Image
                  src={entry.media.posterUrl}
                  alt={entry.media.title}
                  width={64}
                  height={96}
                  className="rounded-lg object-cover aspect-2/3 w-16 shrink-0 border border-white/10"
                />
              ) : (
                <div className="w-16 aspect-2/3 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center text-[10px] text-muted-foreground shrink-0 uppercase font-bold">
                  No Art
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="font-bold text-white">{entry.user.displayName}</span>
                  <span className="text-muted-foreground">{statusTextMap[entry.status]}</span>
                  <Badge
                    variant="outline"
                    className="text-[10px] uppercase border-white/15 bg-white/5 text-white/80"
                  >
                    {entry.media.mediaType}
                  </Badge>
                </div>

                <h2 className="font-bold text-base text-white mt-1 truncate">
                  {entry.media.title}
                  {entry.media.releaseYear && (
                    <span className="text-xs font-normal text-muted-foreground ml-1.5">
                      ({entry.media.releaseYear})
                    </span>
                  )}
                </h2>

                {entry.rating && (
                  <div className="inline-flex items-center gap-1 bg-amber-500/15 text-amber-400 font-bold px-2 py-0.5 rounded text-xs mt-1.5">
                    ★ {entry.rating} / 10
                  </div>
                )}

                {entry.reviewNote && (
                  <p className="text-xs mt-2.5 text-white/80 italic bg-white/5 p-2.5 rounded-lg border-l-2 border-[#ff4b72]">
                    &ldquo;{entry.reviewNote}&rdquo;
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="shrink-0 flex items-center gap-1 self-center">
                {!isMe && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 border-white/10 bg-white/5 hover:bg-white/10 text-white"
                    disabled={isPending}
                    onClick={() => stealToBacklog(entry.media)}
                  >
                    + Steal
                  </Button>
                )}

                {isMe && (
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 border-white/10 bg-white/5 hover:bg-white/10 text-white"
                      onClick={() => setEditingEntry(entry)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-7 text-destructive hover:bg-destructive/15"
                      disabled={isDeleting}
                      onClick={() => deleteEntry(entry.id)}
                    >
                      Delete
                    </Button>
                  </div>
                )}
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
