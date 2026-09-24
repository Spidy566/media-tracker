"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bookmark, Check, Play, Trash2 } from "lucide-react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import type { MediaStatus } from "@/components/media-card";
import { useActiveUser } from "@/hooks/use-active-user";

interface SquadMemberEntry {
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
}

interface MediaDetail {
  externalId: string;
  mediaType: "movie" | "tv" | "game";
  title: string;
  releaseYear: number | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  summary: string | null;
  genres: string[];
  creator: string | null;
  trailerUrl: string | null;
  squadEntries: SquadMemberEntry[];
}

export default function MediaDetailPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const { currentUser } = useActiveUser();

  const type = params.type as string;
  const id = params.id as string;

  const [rating, setRating] = useState<number | null>(null);
  const [note, setNote] = useState<string>("");
  const [isEditingNote, setIsEditingNote] = useState(false);

  const {
    data: media,
    isLoading,
    isError,
  } = useQuery<MediaDetail>({
    queryKey: ["media-detail", type, id],
    queryFn: async () => {
      const res = await fetch(`/api/media/${type}/${id}`);
      if (!res.ok) throw new Error("Failed to load details");
      return res.json();
    },
  });

  // Current user's entry for this item (if any)
  const myEntry = media?.squadEntries?.find((e) => e.user.id === currentUser?.id);

  // Sync state with existing entry
  const activeStatus = myEntry?.status || null;
  const currentRating = rating ?? myEntry?.rating ?? null;
  const currentNote = note || myEntry?.reviewNote || "";

  // Save / Update mutation
  const { mutate: updateEntry, isPending } = useMutation({
    mutationFn: async ({
      status,
      newRating,
      newNote,
    }: {
      status?: MediaStatus;
      newRating?: number | null;
      newNote?: string | null;
    }) => {
      if (!currentUser || !media) return;
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          media: {
            externalId: media.externalId,
            mediaType: media.mediaType,
            title: media.title,
            releaseYear: media.releaseYear,
            posterUrl: media.posterUrl,
            creator: media.creator,
            summary: media.summary,
            genres: media.genres,
          },
          status: status || activeStatus || "want_to",
          rating: newRating !== undefined ? newRating : currentRating,
          reviewNote: newNote !== undefined ? newNote : currentNote || null,
        }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-detail", type, id] });
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      setIsEditingNote(false);
    },
  });

  // Delete mutation
  const { mutate: removeEntry } = useMutation({
    mutationFn: async () => {
      if (!myEntry || !currentUser) return;
      const res = await fetch(`/api/entries?id=${myEntry.id}&userId=${currentUser.id}`, {
        method: "DELETE",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-detail", type, id] });
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      setRating(null);
      setNote("");
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 animate-pulse space-y-6">
        <div className="h-64 bg-zinc-900 rounded-xl" />
        <div className="h-8 w-60 bg-zinc-900 rounded" />
      </div>
    );
  }

  if (isError || !media) {
    return (
      <div className="max-w-md mx-auto py-24 text-center space-y-4">
        <p className="text-zinc-300 font-semibold">Title not found</p>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-xs text-zinc-400 hover:text-white underline cursor-pointer"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-16">
      {/* Cinematic Backdrop with Gradient Fade */}
      <div className="relative w-full h-72 sm:h-96 overflow-hidden bg-zinc-900 border-b border-zinc-800/80">
        {media.backdropUrl ? (
          <Image
            src={media.backdropUrl}
            alt={media.title}
            fill
            priority
            className="object-cover object-top opacity-35"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />

        {/* Back Button */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 text-xs font-medium text-zinc-300 backdrop-blur-md border border-zinc-800 transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
        </div>
      </div>

      {/* Main Content Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 -mt-36 relative z-10">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Left Column: Poster & Quick Action Card */}
          <div className="w-48 sm:w-56 shrink-0 mx-auto md:mx-0 space-y-4">
            <div className="relative aspect-2/3 w-full rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 shadow-2xl">
              {media.posterUrl ? (
                <Image
                  src={media.posterUrl}
                  alt={media.title}
                  fill
                  priority
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-zinc-500">
                  No Poster
                </div>
              )}
            </div>

            {/* Letterboxd-Style Tracking Panel */}
            <div className="bg-zinc-900/90 backdrop-blur-md rounded-xl p-3 border border-zinc-800 space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                Your Log
              </span>

              {/* Status Selector */}
              <div className="grid grid-cols-3 gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800/80">
                <button
                  type="button"
                  title="Queue"
                  onClick={() => updateEntry({ status: "want_to" })}
                  className={`flex flex-col items-center py-2 rounded-md text-[11px] font-medium transition cursor-pointer ${
                    activeStatus === "want_to"
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5 mb-0.5" />
                  <span>Queue</span>
                </button>

                <button
                  type="button"
                  title="In Progress"
                  onClick={() => updateEntry({ status: "doing" })}
                  className={`flex flex-col items-center py-2 rounded-md text-[11px] font-medium transition cursor-pointer ${
                    activeStatus === "doing"
                      ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Play className="w-3.5 h-3.5 mb-0.5" />
                  <span>Active</span>
                </button>

                <button
                  type="button"
                  title="Finished"
                  onClick={() => updateEntry({ status: "done" })}
                  className={`flex flex-col items-center py-2 rounded-md text-[11px] font-medium transition cursor-pointer ${
                    activeStatus === "done"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Check className="w-3.5 h-3.5 mb-0.5" />
                  <span>Done</span>
                </button>
              </div>

              {/* Star Rating (1-10) */}
              <div className="pt-2 border-t border-zinc-800/60">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-zinc-400">Score</span>
                  <span className="text-xs font-bold text-amber-400">
                    {currentRating ? `★ ${currentRating}/10` : "Not rated"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-1">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => {
                        const next = currentRating === star ? null : star;
                        setRating(next);
                        updateEntry({ newRating: next });
                      }}
                      className={`p-1 text-[11px] font-bold rounded transition cursor-pointer ${
                        currentRating && currentRating >= star
                          ? "text-amber-400 hover:text-amber-300"
                          : "text-zinc-600 hover:text-zinc-400"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Quick Note */}
              <div className="pt-2 border-t border-zinc-800/60">
                {!isEditingNote && currentNote ? (
                  <div className="space-y-1">
                    <p className="text-xs text-zinc-300 italic">&ldquo;{currentNote}&rdquo;</p>
                    <button
                      type="button"
                      onClick={() => setIsEditingNote(true)}
                      className="text-[10px] text-zinc-500 hover:text-zinc-300 underline cursor-pointer"
                    >
                      Edit note
                    </button>
                  </div>
                ) : isEditingNote ? (
                  <div className="space-y-1.5">
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="One line thought..."
                      rows={2}
                      className="w-full text-xs bg-zinc-950 border border-zinc-800 rounded p-1.5 text-zinc-200 outline-none focus:border-zinc-600"
                    />
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setIsEditingNote(false)}
                        className="text-[10px] px-2 py-0.5 rounded text-zinc-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => updateEntry({ newNote: note })}
                        className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-white hover:bg-zinc-700"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditingNote(true)}
                    className="text-[11px] text-zinc-500 hover:text-zinc-300 transition cursor-pointer block"
                  >
                    + Add a short note
                  </button>
                )}
              </div>

              {/* Remove Entry button if already tracked */}
              {myEntry && (
                <button
                  type="button"
                  onClick={() => removeEntry()}
                  className="w-full flex items-center justify-center gap-1 text-[10px] text-red-400 hover:text-red-300 pt-2 border-t border-zinc-800/60 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remove from Tracklist</span>
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Title, Metadata, Synopsis, Squad Activity & Trailer */}
          <div className="flex-1 space-y-8 min-w-0">
            {/* Title & Metadata Header */}
            <div>
              <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
                <span>{media.releaseYear || "TBA"}</span>
                <span>•</span>
                <span className="uppercase font-mono text-[10px] tracking-wider px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                  {media.mediaType}
                </span>
                {media.creator && (
                  <>
                    <span>•</span>
                    <span className="text-zinc-300">{media.creator}</span>
                  </>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                {media.title}
              </h1>

              {/* Genres */}
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {media.genres.map((g) => (
                  <span
                    key={g}
                    className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400"
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>

            {/* Synopsis */}
            {media.summary && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Synopsis
                </h3>
                <p className="text-sm text-zinc-300 leading-relaxed max-w-2xl">{media.summary}</p>
              </div>
            )}

            {/* SQUAD ACTIVITY BOX (Killer feature) */}
            <div className="space-y-3 bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <span>Squad Activity</span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  ({media.squadEntries.length})
                </span>
              </h3>

              {media.squadEntries.length === 0 ? (
                <p className="text-xs text-zinc-500">
                  No one in the squad has logged this yet. Be the first!
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {media.squadEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-start gap-3 p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80"
                    >
                      <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300 shrink-0">
                        {entry.user.displayName[0]}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-semibold text-zinc-200 truncate">
                            {entry.user.displayName}
                          </span>
                          {entry.rating && (
                            <span className="text-xs font-bold text-amber-400">
                              ★ {entry.rating}
                            </span>
                          )}
                        </div>

                        <span className="text-[10px] uppercase font-mono text-zinc-500 block">
                          {entry.status === "want_to"
                            ? "In Queue"
                            : entry.status === "doing"
                              ? "Currently Playing/Watching"
                              : "Completed"}
                        </span>

                        {entry.reviewNote && (
                          <p className="text-xs text-zinc-400 italic mt-1 bg-zinc-900 p-1.5 rounded border border-zinc-800/60">
                            &ldquo;{entry.reviewNote}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* YouTube Trailer (if present) */}
            {media.trailerUrl && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Trailer
                </h3>
                <div className="aspect-video w-full max-w-2xl rounded-xl overflow-hidden border border-zinc-800 bg-black">
                  <iframe
                    src={media.trailerUrl}
                    title={`${media.title} Trailer`}
                    className="w-full h-full"
                    allowFullScreen
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
