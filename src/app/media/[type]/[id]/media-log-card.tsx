"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bookmark, Check, Play, Star, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import type { MediaStatus } from "@/components/media-card";
import { logEntryApi } from "@/lib/api-entries";
import type { Entry } from "@/types/entry";

const STAR_VALUES = [1, 2, 3, 4, 5];

interface MediaLogCardProps {
  media: Entry["media"] & { summary: string | null };
  initialEntry: Entry | null;
}

export function MediaLogCard({ media, initialEntry }: MediaLogCardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [rating, setRating] = useState<number | null>(initialEntry?.rating ?? null);
  const [note, setNote] = useState<string>(initialEntry?.reviewNote ?? "");
  const [isEditingNote, setIsEditingNote] = useState(false);

  const activeStatus = initialEntry?.status || null;

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
      return logEntryApi({
        media,
        status: status || activeStatus || "want_to",
        rating: newRating !== undefined ? newRating : rating,
        reviewNote: newNote !== undefined ? newNote : note || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-entries"] });
      router.refresh();
      setIsEditingNote(false);
      toast.success("Updated your log", { description: media.title });
    },
  });

  // Delete mutation
  const { mutate: removeEntry } = useMutation({
    mutationFn: async () => {
      if (!initialEntry) return;
      const res = await fetch(`/api/entries?id=${initialEntry.id}`, {
        method: "DELETE",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-entries"] });
      router.refresh();
      setRating(null);
      setNote("");
      toast.info("Removed from your library", { description: media.title });
    },
  });

  return (
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
            {rating ? `★ ${rating} / 5` : "Not rated"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-1 bg-muted/40 p-2 rounded-2xl border border-border">
          {STAR_VALUES.map((star) => (
            <button
              key={star}
              type="button"
              aria-label={`Rate ${star} out of 5 stars`}
              onClick={() => {
                const next = rating === star ? null : star;
                setRating(next);
                updateEntry({ newRating: next });
              }}
              className="p-1 cursor-pointer transition hover:scale-110"
            >
              <Star
                className={`w-4 h-4 ${
                  rating && rating >= star
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
        {!isEditingNote && note ? (
          <div className="space-y-1.5 p-3 rounded-2xl bg-muted/40 border border-border">
            <p className="text-xs text-foreground italic leading-relaxed">&ldquo;{note}&rdquo;</p>
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
      {initialEntry && (
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
  );
}
