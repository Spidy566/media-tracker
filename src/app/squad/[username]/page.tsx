"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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

const SQUAD_SKELETON_KEYS = [
  "squad-skel-1",
  "squad-skel-2",
  "squad-skel-3",
  "squad-skel-4",
  "squad-skel-5",
  "squad-skel-6",
];

export default function SquadMemberPage() {
  const router = useRouter();
  const params = useParams();
  const username = params.username as string;
  const { currentUser } = useActiveUser();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"all" | MediaStatus>("done");
  const [mediaFilter, setMediaFilter] = useState<"all" | "movie" | "tv" | "game">("all");

  // Fetch friend's profile
  const { data: userData, isLoading: isUserLoading } = useQuery<{
    user: { displayName: string; username: string; id: string };
  }>({
    queryKey: ["squad-user", username],
    queryFn: async () => {
      const res = await fetch(`/api/users?username=${username}`);
      if (!res.ok) throw new Error("User not found");
      return res.json();
    },
  });

  // Fetch friend's library entries
  const { data: entriesData, isLoading: isEntriesLoading } = useQuery<{ entries: Entry[] }>({
    queryKey: ["squad-entries", username],
    queryFn: async () => {
      const res = await fetch(`/api/entries?username=${username}`);
      if (!res.ok) throw new Error("Failed to load entries");
      return res.json();
    },
  });

  // Bookmark a friend's recommendation directly to your own stash
  const { mutate: quickTrack } = useMutation({
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["my-entries"] });
      toast.success("Saved to your stash", {
        description: variables.media.title,
      });
    },
  });

  const member = userData?.user;
  const allEntries = entriesData?.entries || [];

  const completedEntries = allEntries.filter((e) => e.status === "done");
  const activeEntries = allEntries.filter((e) => e.status === "doing");
  const queueEntries = allEntries.filter((e) => e.status === "want_to");

  const filteredEntries = allEntries.filter((e) => {
    if (activeTab !== "all" && e.status !== activeTab) return false;
    if (mediaFilter !== "all" && e.media.mediaType !== mediaFilter) return false;
    return true;
  });

  const navigateToMedia = (media: Entry["media"]) => {
    const parts = media.externalId.split(":");
    const rawId = parts[parts.length - 1];
    router.push(`/media/${media.mediaType}/${rawId}`);
  };

  if (!isUserLoading && !member) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="text-xl font-bold text-foreground">Squad Member Not Found</h1>
        <p className="text-xs text-muted-foreground">
          The user @{username} does not exist in this squad.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-foreground text-background text-xs font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
      {/* Back button */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          1. SQUAD MEMBER HERO
      ───────────────────────────────────────────────────────────── */}
      <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-black text-2xl shadow-md shrink-0">
            {member ? member.displayName[0] : "?"}
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              {member?.displayName || username}
            </h1>
            <p className="text-xs font-mono text-muted-foreground mt-0.5">@{username}</p>
          </div>
        </div>

        {/* Counter Pills */}
        <div className="flex items-center gap-5 bg-muted/40 border border-border p-3 px-6 rounded-2xl shrink-0">
          <div>
            <span className="text-2xl font-black text-foreground">{completedEntries.length}</span>
            <span className="text-xs font-semibold text-muted-foreground block">Completed</span>
          </div>
          <div className="w-px h-7 bg-border" />
          <div>
            <span className="text-2xl font-black text-emerald-500">{activeEntries.length}</span>
            <span className="text-xs font-semibold text-muted-foreground block">Active</span>
          </div>
          <div className="w-px h-7 bg-border" />
          <div>
            <span className="text-2xl font-black text-amber-500">{queueEntries.length}</span>
            <span className="text-xs font-semibold text-muted-foreground block">In Queue</span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. FILTER TABS
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border">
        {/* Status Switcher */}
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
            Completed ({completedEntries.length})
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
            In Progress ({activeEntries.length})
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
            In Queue ({queueEntries.length})
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
            All Titles ({allEntries.length})
          </button>
        </div>

        {/* Media Type Filter */}
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

      {/* ─────────────────────────────────────────────────────────────
          3. MEMBER ENTRIES GRID & REVIEWS
      ───────────────────────────────────────────────────────────── */}
      {isEntriesLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {SQUAD_SKELETON_KEYS.map((key) => (
            <div key={key} className="aspect-2/3 bg-muted rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredEntries.length === 0 ? (
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

              {/* Show friend's review note if available */}
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
    </main>
  );
}
