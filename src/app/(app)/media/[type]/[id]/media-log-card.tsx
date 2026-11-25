"use client";

import { useMutation } from "@tanstack/react-query";
import { Bookmark, Check, Play, Star, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import type { MediaStatus } from "@/db/schema";
import { deleteEntryApi, logEntryApi } from "@/lib/api-entries";
import { cn } from "@/lib/utils";
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
    title: "Add to Queue / Backlog",
    icon: Bookmark,
    activeClass: "bg-status-queue/15 text-status-queue border-status-queue/30 shadow-xs",
  },
  {
    status: "doing",
    label: "In Progress",
    title: "Currently Watching / Playing",
    icon: Play,
    activeClass: "bg-status-doing/15 text-status-doing border-status-doing/30 shadow-xs",
  },
  {
    status: "done",
    label: "Done",
    title: "Mark as Completed / Played",
    icon: Check,
    activeClass: "bg-status-done/15 text-status-done border-status-done/30 shadow-xs",
  },
];

export function MediaLogCard({ media, initialEntry }: MediaLogCardProps) {
  const router = useRouter();

  const [rating, setRating] = useState<number | null>(initialEntry?.rating ?? null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
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
  const { mutate: removeEntry, isPending: isDeleting } = useMutation({
    mutationFn: async () => {
      if (!initialEntry) return;
      return deleteEntryApi(initialEntry.id);
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
    <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-3.5">
      {/* 1. Status Pipeline Switcher (Letterboxd / Backloggd Style) */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
          Log status
        </span>
        <div className="grid grid-cols-3 gap-1 bg-muted/50 p-1 rounded-xl border border-border/80">
          {STATUS_BUTTONS.map(({ status, label, title, icon: Icon, activeClass }) => {
            const isActive = activeStatus === status;
            return (
              <button
                key={status}
                type="button"
                title={title}
                disabled={isPending}
                onClick={() => updateEntry({ status })}
                className={cn(
                  "flex flex-col items-center justify-center py-2 px-1 rounded-lg text-[11px] font-semibold transition border cursor-pointer select-none",
                  isActive
                    ? activeClass
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-card/60",
                )}
              >
                <Icon className={cn("size-3.5 mb-1", isActive ? "stroke-[2.4]" : "stroke-[2]")} />
                <span className="leading-none">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Interactive 5-Star Rating */}
      <div className="pt-3 border-t border-border/60">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Your Rating
          </span>
          {rating ? (
            <span className="text-xs font-mono font-semibold text-rating tabular-nums flex items-center gap-1">
              <span>★</span>
              <span>{rating} / 5</span>
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground">Rate</span>
          )}
        </div>

        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-muted/40 border border-border/80">
          {STAR_VALUES.map((star) => {
            const isLit =
              hoverRating !== null ? hoverRating >= star : rating !== null && rating >= star;
            return (
              <button
                key={star}
                type="button"
                disabled={isPending}
                aria-label={`Rate ${star} out of 5 stars`}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(null)}
                onClick={() => {
                  const next = rating === star ? null : star;
                  setRating(next);
                  updateEntry({ newRating: next });
                }}
                className="p-1 cursor-pointer transition-transform hover:scale-120 focus:outline-none"
              >
                <Star
                  className={cn(
                    "size-4 transition-colors",
                    isLit
                      ? "fill-rating text-rating"
                      : "text-muted-foreground/30 hover:text-muted-foreground",
                  )}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Review Note / Mini-review */}
      <div className="pt-3 border-t border-border/60">
        {!isEditingNote && note ? (
          <div className="space-y-1.5 p-3 rounded-xl bg-muted/40 border border-border/80">
            <p className="text-xs text-foreground italic leading-relaxed">&ldquo;{note}&rdquo;</p>
            <button
              type="button"
              onClick={() => setIsEditingNote(true)}
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground underline cursor-pointer"
            >
              Edit note
            </button>
          </div>
        ) : isEditingNote ? (
          <div className="space-y-2">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                  e.preventDefault();
                  updateEntry({ newNote: note });
                }
              }}
              placeholder="Your review note or thought (Press ⌘+Enter to save)..."
              rows={3}
              className="w-full text-xs bg-background border border-border rounded-xl p-2.5 text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground/30 transition resize-none"
            />
            <div className="flex justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setIsEditingNote(false)}
                className="text-xs px-2.5 py-1 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => updateEntry({ newNote: note })}
                className="text-xs font-semibold px-3 py-1 rounded-lg bg-foreground text-background hover:opacity-90 cursor-pointer disabled:opacity-50"
              >
                {isPending ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsEditingNote(true)}
            className="text-xs text-muted-foreground hover:text-foreground transition cursor-pointer flex items-center gap-1 font-medium"
          >
            <span>+ Add review note</span>
          </button>
        )}
      </div>

      {/* 4. Remove Entry from Library */}
      {initialEntry && (
        <div className="pt-2 border-t border-border/60">
          {isConfirmingDelete ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => removeEntry()}
                className="flex-1 text-xs font-semibold py-1.5 px-2.5 rounded-lg bg-destructive text-destructive-foreground hover:opacity-90 transition cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? "Removing..." : "Confirm Remove"}
              </button>
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
                className="text-xs font-medium py-1.5 px-2.5 rounded-lg bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsConfirmingDelete(true)}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-destructive cursor-pointer transition py-1"
            >
              <Trash2 className="size-3.5" />
              <span>Remove from Library</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
