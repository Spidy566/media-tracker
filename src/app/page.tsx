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

  // Filter entries if we're on "My Stash" and a specific status is chosen
  const displayedEntries =
    activeTab === "me" && statusFilter !== "all"
      ? entries.filter((e) => e.status === statusFilter)
      : entries;

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        {activeTab === "me" && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-6">
            {(
              [
                { key: "all", label: "All" },
                { key: "want_to", label: "Backlog" },
                { key: "doing", label: "In Progress" },
                { key: "done", label: "Completed" },
                { key: "dropped", label: "Dropped" },
              ] as const
            ).map(({ key, label }) => (
              <Button
                key={key}
                size="xs"
                variant={statusFilter === key ? "default" : "outline"}
                onClick={() => setStatusFilter(key)}
                className="text-xs shrink-0"
              >
                {label} ({statusCounts[key]})
              </Button>
            ))}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {activeTab === "squad" ? "The Squad Lounge" : "My Personal Stash"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {activeTab === "squad"
              ? "Live activity from you and the homies."
              : `Everything tracked by ${currentUser?.displayName || "you"}.`}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as "squad" | "me")}>
          <TabsList className="grid grid-cols-2 w-52">
            <TabsTrigger value="squad">Squad</TabsTrigger>
            <TabsTrigger value="me">My Stash</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading && (
        <p className="text-muted-foreground py-10 text-center">Loading squad stash...</p>
      )}

      {!isLoading && displayedEntries.length === 0 && (
        <div className="text-center py-16 border border-dashed rounded-xl">
          <p className="font-medium">No activity yet.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Use the search bar above to log your first title!
          </p>
        </div>
      )}

      <div className="space-y-4">
        {displayedEntries.map((entry) => {
          const isMe = currentUser?.id === entry.user.id;

          return (
            <div
              key={entry.id}
              className="border bg-card rounded-xl p-4 shadow-xs flex gap-4 items-start"
            >
              {entry.media.posterUrl ? (
                <Image
                  src={entry.media.posterUrl}
                  alt={entry.media.title}
                  width={64}
                  height={96}
                  className="rounded-md object-cover aspect-2/3 w-16"
                />
              ) : (
                <div className="w-16 aspect-2/3 bg-muted rounded-md flex items-center justify-center text-xs text-muted-foreground">
                  No Art
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap text-sm">
                  <span className="font-semibold text-primary">{entry.user.displayName}</span>
                  <span className="text-muted-foreground">{statusTextMap[entry.status]}</span>
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {entry.media.mediaType}
                  </Badge>
                </div>

                <h2 className="font-bold text-base mt-0.5 truncate">
                  {entry.media.title}
                  {entry.media.releaseYear && (
                    <span className="text-xs font-normal text-muted-foreground ml-1.5">
                      ({entry.media.releaseYear})
                    </span>
                  )}
                </h2>

                {entry.rating && (
                  <div className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-500 font-bold px-2 py-0.5 rounded text-xs mt-1">
                    ★ {entry.rating}/10
                  </div>
                )}

                {entry.reviewNote && (
                  <p className="text-sm mt-2 text-foreground/90 italic bg-muted/40 p-2 rounded border-l-2 border-primary/50">
                    &ldquo;{entry.reviewNote}&rdquo;
                  </p>
                )}
              </div>

              {!isMe && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="text-xs shrink-0"
                  disabled={isPending}
                  onClick={() => stealToBacklog(entry.media)}
                >
                  + Steal
                </Button>
              )}
              {isMe && (
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7"
                    onClick={() => setEditingEntry(entry)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-destructive hover:bg-destructive/10 h-7"
                    disabled={isDeleting}
                    onClick={() => deleteEntry(entry.id)}
                  >
                    Delete
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
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
