"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, Film, Gamepad2, Layers, PlayCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MediaCard, type MediaStatus } from "@/components/media-card";
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
    mediaType: "movie" | "tv" | "game";
    title: string;
    releaseYear: number | null;
    posterUrl: string | null;
    creator: string | null;
    genres: string[];
  };
}

const FEED_SKELETON_IDS = Array.from({ length: 12 }, (_, i) => `feed-skel-${i + 1}`);

export default function HomePage() {
  const router = useRouter();
  const { users, currentUser } = useActiveUser();
  const queryClient = useQueryClient();

  // null = All Squad, or a specific user's ID
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [mediaFilter, setMediaFilter] = useState<"all" | "movie_tv" | "game">("all");

  const { data, isLoading } = useQuery<{ entries: Entry[] }>({
    queryKey: ["entries", selectedUserId],
    queryFn: async () => {
      const url = selectedUserId ? `/api/entries?userId=${selectedUserId}` : "/api/entries";
      const res = await fetch(url);
      return res.json();
    },
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
      queryClient.invalidateQueries({ queryKey: ["entries"] });
    },
  });

  const rawEntries = data?.entries || [];

  const entries = rawEntries.filter((e) => {
    if (mediaFilter === "movie_tv")
      return e.media.mediaType === "movie" || e.media.mediaType === "tv";
    if (mediaFilter === "game") return e.media.mediaType === "game";
    return true;
  });

  const activeNow = entries.filter((e) => e.status === "doing");
  const queue = entries.filter((e) => e.status === "want_to");
  const completed = entries.filter((e) => e.status === "done");

  // Filter squad list: friends ONLY (excluding the logged in user)
  const squadFriends = users.filter((u) => u.id !== currentUser?.id);
  const isViewingMyList = selectedUserId === currentUser?.id;
  const activeFriend = squadFriends.find((u) => u.id === selectedUserId);

  const navigateToMedia = (media: Entry["media"]) => {
    const parts = media.externalId.split(":");
    const rawId = parts[parts.length - 1];
    router.push(`/media/${media.mediaType}/${rawId}`);
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full space-y-8">
      {/* Top Filter Bar: Friends & Media Types */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        {/* Friend Tabs: All Squad -> My List -> Individual Squad Friends */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedUserId(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer shrink-0 ${
              selectedUserId === null
                ? "bg-zinc-100 text-zinc-950 font-semibold"
                : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
            }`}
          >
            All Squad
          </button>

          {currentUser && (
            <button
              type="button"
              onClick={() => setSelectedUserId(currentUser.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer shrink-0 ${
                isViewingMyList
                  ? "bg-zinc-100 text-zinc-950 font-semibold"
                  : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
              }`}
            >
              My List
            </button>
          )}

          {squadFriends.map((friend) => {
            const isSelected = selectedUserId === friend.id;

            return (
              <button
                key={friend.id}
                type="button"
                onClick={() => setSelectedUserId(friend.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer shrink-0 ${
                  isSelected
                    ? "bg-zinc-100 text-zinc-950 font-semibold"
                    : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
                }`}
              >
                {friend.displayName}
              </button>
            );
          })}
        </div>

        {/* Media Type Switcher */}
        <div className="flex items-center bg-zinc-900 border border-zinc-800 p-1 rounded-lg shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMediaFilter("all")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
              mediaFilter === "all"
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All</span>
          </button>
          <button
            type="button"
            onClick={() => setMediaFilter("movie_tv")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
              mediaFilter === "movie_tv"
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Movies & TV</span>
          </button>
          <button
            type="button"
            onClick={() => setMediaFilter("game")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
              mediaFilter === "game"
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>Games</span>
          </button>
        </div>
      </div>

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="space-y-6">
          <div className="h-4 w-36 bg-zinc-900 rounded animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {FEED_SKELETON_IDS.map((id) => (
              <div
                key={id}
                className="aspect-2/3 bg-zinc-900 rounded-lg animate-pulse border border-zinc-800/60"
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && entries.length === 0 && (
        <div className="text-center py-20 border border-dashed border-zinc-800 rounded-xl">
          <p className="text-sm font-semibold text-zinc-200">
            {activeFriend
              ? `${activeFriend.displayName} hasn't tracked anything yet`
              : isViewingMyList
                ? "Your list is empty"
                : "No titles tracked in the squad yet"}
          </p>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            Hit the search bar above (⌘K) to log your first title.
          </p>
        </div>
      )}

      {/* SHELF 1: IN PROGRESS */}
      {!isLoading && activeNow.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <PlayCircle className="w-4 h-4 text-sky-400" />
            <h2 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
              {activeFriend
                ? `${activeFriend.displayName} is Playing & Watching`
                : isViewingMyList
                  ? "You are Playing & Watching"
                  : "Currently In Progress"}
            </h2>
            <span className="text-[11px] text-zinc-500 font-mono">({activeNow.length})</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {activeNow.map((entry) => (
              <MediaCard
                key={entry.id}
                title={entry.media.title}
                mediaType={entry.media.mediaType}
                posterUrl={entry.media.posterUrl}
                releaseYear={entry.media.releaseYear}
                subtitle={!selectedUserId ? entry.user.displayName : undefined}
                currentStatus={currentUser?.id === entry.user.id ? entry.status : null}
                onQuickStatus={(status) => setQuickStatus({ media: entry.media, status })}
                onClick={() => navigateToMedia(entry.media)}
              />
            ))}
          </div>
        </section>
      )}

      {/* SHELF 2: QUEUE / BACKLOG */}
      {!isLoading && queue.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
              {activeFriend
                ? `${activeFriend.displayName}'s Queue`
                : isViewingMyList
                  ? "Your Queue"
                  : "Squad Queue & Backlog"}
            </h2>
            <span className="text-[11px] text-zinc-500 font-mono">({queue.length})</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {queue.map((entry) => (
              <MediaCard
                key={entry.id}
                title={entry.media.title}
                mediaType={entry.media.mediaType}
                posterUrl={entry.media.posterUrl}
                releaseYear={entry.media.releaseYear}
                subtitle={!selectedUserId ? entry.user.displayName : undefined}
                currentStatus={currentUser?.id === entry.user.id ? entry.status : null}
                onQuickStatus={(status) => setQuickStatus({ media: entry.media, status })}
                onClick={() => navigateToMedia(entry.media)}
              />
            ))}
          </div>
        </section>
      )}

      {/* SHELF 3: COMPLETED */}
      {!isLoading && completed.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <h2 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
              {activeFriend
                ? `${activeFriend.displayName}'s Finished Titles`
                : isViewingMyList
                  ? "Your Finished Titles"
                  : "Completed"}
            </h2>
            <span className="text-[11px] text-zinc-500 font-mono">({completed.length})</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {completed.map((entry) => (
              <MediaCard
                key={entry.id}
                title={entry.media.title}
                mediaType={entry.media.mediaType}
                posterUrl={entry.media.posterUrl}
                releaseYear={entry.media.releaseYear}
                rating={entry.rating}
                subtitle={!selectedUserId ? entry.user.displayName : undefined}
                currentStatus={currentUser?.id === entry.user.id ? entry.status : null}
                onQuickStatus={(status) => setQuickStatus({ media: entry.media, status })}
                onClick={() => navigateToMedia(entry.media)}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
