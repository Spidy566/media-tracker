"use client";

import { useMutation } from "@tanstack/react-query";
import { Ban, Bookmark, Check, Play, Star, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import type { MediaStatus } from "@/db/schema";
import { logEntryApi } from "@/lib/api-entries";
import type { Entry } from "@/types/entry";

const STAR_VALUES = [1, 2, 3, 4, 5];

interface MediaLogCardProps {
  media: Entry["media"] & { summary: string | null };
  initialEntry: Entry | null;
}

const STATUS_BUTTONS: Array<{
  status: MediaStatus;
  label: string;
  title: string;
  icon: typeof Bookmark;
  activeClass: string;
}> = [
  {
    status: "want_to",
    label: "Queue",
    title: "Add to Queue",
    icon: Bookmark,
    activeClass: "bg-status-queue/20 text-status-queue border-status-queue/40 shadow-xs",
  },
  {
    status: "doing",
    label: "In Progress",
    title: "Currently In Progress",
    icon: Play,
    activeClass: "bg-status-doing/20 text-status-doing border-status-doing/40 shadow-xs",
  },
  {
    status: "done",
    label: "Done",
    title: "Mark as Completed",
    icon: Check,
    activeClass: "bg-status-done/20 text-status-done border-status-done/40 shadow-xs",
  },
  {
    status: "dropped",
    label: "Dropped",
    title: "Mark as Dropped",
    icon: Ban,
    activeClass: "bg-status-dropped/20 text-status-dropped border-status-dropped/40 shadow-xs",
  },
];

export function MediaLogCard({ media, initialEntry }: MediaLogCardProps) {
  const router = useRouter();

  const [rating, setRating] = useState<number | null>(initialEntry?.rating ?? null);
  const [note, setNote] = useState<string>(initialEntry?.reviewNote ?? "");
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

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
        status: status || activeStatus || (newRating !== undefined ? "done" : "want_to"),
        rating: newRating !== undefined ? newRating : rating,
        reviewNote: newNote !== undefined ? newNote : note || null,
      });
    },
    onSuccess: () => {
      router.refresh();
      setIsEditingNote(false);
      toast.success("Updated your log", { description: media.title });
    },
    onError: (err: Error) => {
      if (err.message !== "Unauthorized") {
        toast.error("Failed to update log");
      }
    },
  });

  // Delete mutation
  const { mutate: removeEntry } = useMutation({
    mutationFn: async () => {
      if (!initialEntry) return;
      const res = await fetch(`/api/entries?id=${initialEntry.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to remove entry");
      }
      return res.json();
    },
    onSuccess: () => {
      router.refresh();
      setRating(null);
      setNote("");
      setIsConfirmingDelete(false);
      toast.info("Removed from your library", { description: media.title });
    },
    onError: (err: Error) => {
      setIsConfirmingDelete(false);
      toast.error(err.message || "Failed to remove entry");
    },
  });

  return (
    <div className="bg-card border border-border rounded-3xl p-5 shadow-lg space-y-4">
      <span className="text-xs font-semibold text-muted-foreground block">Your log</span>
      {/* Status Switcher */}
      <div className="grid grid-cols-4 gap-1 bg-muted/60 p-1 rounded-2xl border border-border">
        {STATUS_BUTTONS.map(({ status, label, title, icon: Icon, activeClass }) => (
          <button
            key={status}
            type="button"
            title={title}
            onClick={() => updateEntry({ status })}
            className={`flex flex-col items-center py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeStatus === status ? activeClass : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-3.5 h-3.5 mb-1 stroke-[2.2]" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* 5-Star Rating Selector */}
      <div className="pt-3 border-t border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-muted-foreground">Your Rating</span>
          {rating ? (
            <span className="text-xs font-semibold text-rating">
              ★ <span className="font-mono">{rating} / 5</span>
            </span>
          ) : (
            <span className="text-xs font-medium text-muted-foreground">Not rated</span>
          )}
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
                    ? "fill-rating text-rating"
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
        <div className="pt-2 border-t border-border">
          {isConfirmingDelete ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => removeEntry()}
                className="flex-1 text-xs font-semibold py-1.5 px-3 rounded-xl bg-destructive text-destructive-foreground hover:opacity-90 transition cursor-pointer"
              >
                Confirm Removal
              </button>
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
                className="text-xs font-semibold py-1.5 px-3 rounded-xl bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsConfirmingDelete(true)}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-destructive hover:opacity-80 cursor-pointer transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove from Library</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
