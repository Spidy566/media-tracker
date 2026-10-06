"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bookmark, Check, Play, Star, Trash2, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import type { MediaStatus } from "@/components/media-card";
import { useActiveUser } from "@/hooks/use-active-user";
import type { Entry } from "@/types/entry";

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
  squadEntries: Entry[];
}

const STAR_VALUES = [1, 2, 3, 4, 5];
const isStealthMode = process.env.NEXT_PUBLIC_STEALTH_MODE === "true";

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

  const myEntry = media?.squadEntries?.find((e) => e.user.id === currentUser?.id);
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
      queryClient.invalidateQueries({ queryKey: ["my-entries"] });
      queryClient.invalidateQueries({ queryKey: ["squad-entries"] });
      setIsEditingNote(false);
      toast.success("Updated your log", { description: media?.title });
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
      queryClient.invalidateQueries({ queryKey: ["my-entries"] });
      queryClient.invalidateQueries({ queryKey: ["squad-entries"] });
      setRating(null);
      setNote("");
      toast.info("Removed from your library", { description: media?.title });
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-12 animate-pulse space-y-6">
        <div className="h-72 bg-muted rounded-3xl" />
        <div className="h-8 w-64 bg-muted rounded-xl" />
      </div>
    );
  }

  if (isError || !media) {
    return (
      <div className="max-w-md mx-auto py-24 text-center space-y-4">
        <h2 className="text-xl font-bold text-foreground">Title Not Found</h2>
        <p className="text-xs text-muted-foreground">
          Unable to fetch details for this media title.
        </p>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-xs font-semibold px-4 py-2 rounded-full bg-foreground text-background cursor-pointer"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* ─────────────────────────────────────────────────────────────
          1. CINEMATIC BACKDROP BANNER
      ───────────────────────────────────────────────────────────── */}
      <div className="relative w-full h-64 sm:h-96 overflow-hidden bg-muted border-b border-border">
        {media.backdropUrl && !isStealthMode ? (
          <Image
            src={media.backdropUrl}
            alt={media.title}
            fill
            priority
            className="object-cover object-top opacity-30 dark:opacity-40"
          />
        ) : null}
        <div className="absolute inset-0 bg-linear-to-t from-background via-background/70 to-transparent" />

        {/* Back Button */}
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8 pt-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-card/80 hover:bg-muted text-xs font-bold text-foreground backdrop-blur-md border border-border transition cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. MAIN CONTENT CONTAINER
      ───────────────────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-8 -mt-28 sm:-mt-36 relative z-10">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Left Column: Poster & Personal Tracking Card */}
          <div className="w-56 sm:w-64 shrink-0 mx-auto md:mx-0 space-y-4">
            {/* Poster Frame */}
            <div className="relative aspect-2/3 w-full rounded-3xl overflow-hidden bg-muted border border-border shadow-2xl">
              {media.posterUrl && !isStealthMode ? (
                <Image
                  src={media.posterUrl}
                  alt={media.title}
                  fill
                  priority
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                  <span className="font-bold text-xs text-muted-foreground uppercase tracking-wider font-mono">
                    No Poster Art
                  </span>
                </div>
              )}
            </div>

            {/* Tactile Log Box */}
            <div className="bg-card border border-border rounded-3xl p-5 shadow-lg space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono block">
                Your Log
              </span>

              {/* Status Switcher (3 Buttons) */}
              <div className="grid grid-cols-3 gap-1 bg-muted/60 p-1 rounded-2xl border border-border">
                <button
                  type="button"
                  title="Add to Queue"
                  onClick={() => updateEntry({ status: "want_to" })}
                  className={`flex flex-col items-center py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    activeStatus === "want_to"
                      ? "bg-amber-400 text-black shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5 mb-1 stroke-[2.2]" />
                  <span>Queue</span>
                </button>

                <button
                  type="button"
                  title="Currently In Progress"
                  onClick={() => updateEntry({ status: "doing" })}
                  className={`flex flex-col items-center py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    activeStatus === "doing"
                      ? "bg-sky-400 text-black shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Play className="w-3.5 h-3.5 mb-1 stroke-[2.2]" />
                  <span>Active</span>
                </button>

                <button
                  type="button"
                  title="Mark as Completed"
                  onClick={() => updateEntry({ status: "done" })}
                  className={`flex flex-col items-center py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    activeStatus === "done"
                      ? "bg-emerald-500 text-black shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Check className="w-3.5 h-3.5 mb-1 stroke-[2.2]" />
                  <span>Done</span>
                </button>
              </div>

              {/* 5-Star Rating Selector */}
              <div className="pt-3 border-t border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-muted-foreground">Your Rating</span>
                  <span className="text-xs font-black text-amber-500 font-mono">
                    {currentRating ? `★ ${currentRating} / 5` : "Not rated"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-1 bg-muted/40 p-2 rounded-2xl border border-border">
                  {STAR_VALUES.map((star) => (
                    <button
                      key={star}
                      type="button"
                      aria-label={`Rate ${star} out of 5 stars`}
                      onClick={() => {
                        const next = currentRating === star ? null : star;
                        setRating(next);
                        updateEntry({ newRating: next });
                      }}
                      className="p-1 cursor-pointer transition hover:scale-110"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          currentRating && currentRating >= star
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground/30 hover:text-muted-foreground"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Review Note */}
              <div className="pt-3 border-t border-border">
                {!isEditingNote && currentNote ? (
                  <div className="space-y-1.5 p-3 rounded-2xl bg-muted/40 border border-border">
                    <p className="text-xs text-foreground italic leading-relaxed">
                      &ldquo;{currentNote}&rdquo;
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsEditingNote(true)}
                      className="text-[11px] font-semibold text-muted-foreground hover:text-foreground underline cursor-pointer"
                    >
                      Edit note
                    </button>
                  </div>
                ) : isEditingNote ? (
                  <div className="space-y-2">
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Your one-line thought..."
                      rows={3}
                      className="w-full text-xs bg-background border border-border rounded-xl p-2.5 text-foreground placeholder:text-muted-foreground outline-none resize-none"
                    />
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIsEditingNote(false)}
                        className="text-xs px-2.5 py-1 rounded-lg text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => updateEntry({ newNote: note })}
                        className="text-xs font-bold px-3 py-1 rounded-lg bg-foreground text-background hover:opacity-90"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditingNote(true)}
                    className="text-xs font-semibold text-muted-foreground hover:text-foreground transition cursor-pointer block"
                  >
                    + Add a review note
                  </button>
                )}
              </div>

              {/* Remove Entry */}
              {myEntry && (
                <button
                  type="button"
                  onClick={() => removeEntry()}
                  className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-600 pt-2 border-t border-border cursor-pointer transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove from Stash</span>
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Title, Synopsis, Squad Activity, Trailer */}
          <div className="flex-1 space-y-8 min-w-0">
            {/* Header Metadata */}
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
                <span>{media.releaseYear || "TBA"}</span>
                <span>•</span>
                <span className="uppercase font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted border border-border text-foreground">
                  {media.mediaType === "tv" ? "TV Series" : media.mediaType}
                </span>
                {media.creator && (
                  <>
                    <span>•</span>
                    <span className="text-foreground font-semibold">{media.creator}</span>
                  </>
                )}
              </div>

              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
                {media.title}
              </h1>

              {/* Genre Pills */}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {media.genres.map((g) => (
                  <span
                    key={g}
                    className="text-xs font-semibold px-3 py-1 rounded-full bg-muted/60 border border-border text-muted-foreground"
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>

            {/* Synopsis */}
            {media.summary && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
                  Synopsis
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground max-w-2xl">
                  {media.summary}
                </p>
              </div>
            )}

            {/* SQUAD ACTIVITY BOX */}
            <div className="space-y-4 bg-card border border-border rounded-3xl p-6 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground font-mono">
                    Squad Activity
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-muted-foreground">
                  {media.squadEntries.length} logged
                </span>
              </div>

              {media.squadEntries.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No one in the squad has logged this title yet. Be the first!
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {media.squadEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-3.5 rounded-2xl bg-muted/40 border border-border space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/squad/${entry.user.username}`}
                          className="flex items-center gap-2 hover:opacity-80 transition"
                        >
                          <div className="w-7 h-7 rounded-full bg-foreground text-background flex items-center justify-center font-black text-xs">
                            {entry.user.displayName[0]}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-foreground block">
                              {entry.user.displayName}
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground uppercase">
                              {entry.status === "want_to"
                                ? "In Queue"
                                : entry.status === "doing"
                                  ? "In Progress"
                                  : "Completed"}
                            </span>
                          </div>
                        </Link>

                        {entry.rating && (
                          <span className="text-xs font-black text-amber-500 font-mono bg-background px-2 py-0.5 rounded-full border border-border shadow-xs">
                            ★ {entry.rating} / 5
                          </span>
                        )}
                      </div>

                      {entry.reviewNote && (
                        <p className="text-xs text-foreground/90 italic p-2.5 rounded-xl bg-background border border-border leading-relaxed">
                          &ldquo;{entry.reviewNote}&rdquo;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* YouTube Trailer */}
            {media.trailerUrl && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
                  Trailer
                </h3>
                <div className="aspect-video w-full max-w-2xl rounded-3xl overflow-hidden border border-border bg-black shadow-lg">
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
