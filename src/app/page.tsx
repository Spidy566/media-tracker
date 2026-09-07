"use client";

import Image from "next/image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useActiveUser } from "@/hooks/use-active-user";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

  const { data, isLoading } = useQuery<{ entries: Entry[] }>({
    queryKey: ["entries"],
    queryFn: async () => {
      const res = await fetch("/api/entries");
      return res.json();
    },
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

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">The Squad Lounge</h1>
        <p className="text-muted-foreground text-sm">
          Live activity from you and the homies.
        </p>
      </div>

      {isLoading && <p className="text-muted-foreground py-10 text-center">Loading squad stash...</p>}

      {!isLoading && entries.length === 0 && (
        <div className="text-center py-16 border border-dashed rounded-xl">
          <p className="font-medium">No activity yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Use the search bar above to log your first title!</p>
        </div>
      )}

      <div className="space-y-4">
        {entries.map((entry) => {
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
                  className="rounded-md object-cover aspect-[2/3] w-16"
                />
              ) : (
                <div className="w-16 aspect-[2/3] bg-muted rounded-md flex items-center justify-center text-xs text-muted-foreground">
                  No Art
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap text-sm">
                  <span className="font-semibold text-primary">
                    {entry.user.displayName}
                  </span>
                  <span className="text-muted-foreground">
                    {statusTextMap[entry.status]}
                  </span>
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
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs text-destructive hover:bg-destructive/10 shrink-0"
                  disabled={isDeleting}
                  onClick={() => deleteEntry(entry.id)}
                >
                  Delete
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}