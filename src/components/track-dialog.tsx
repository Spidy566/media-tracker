"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { useState } from "react";
import type { UnifiedSearchResult } from "@/app/api/search/route";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface TrackDialogProps {
  media: UnifiedSearchResult;
  userId: string;
  onClose: () => void;
  initialStatus?: "want_to" | "doing" | "done" | "dropped";
  initialRating?: number | null;
  initialNote?: string | null;
}

export function TrackDialog({
  media,
  userId,
  onClose,
  initialStatus = "want_to",
  initialRating = null,
  initialNote = "",
}: TrackDialogProps) {
  const [status, setStatus] = useState<"want_to" | "doing" | "done" | "dropped">(initialStatus);
  const [rating, setRating] = useState<number | null>(initialRating);
  const [note, setNote] = useState(initialNote || "");

  const queryClient = useQueryClient();

  const { mutate: saveEntry, isPending } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          media,
          status,
          rating,
          reviewNote: note.trim().length > 0 ? note.trim() : null,
        }),
      });

      if (!res.ok) throw new Error("Failed to save entry");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-card text-card-foreground w-full max-w-md rounded-xl p-6 shadow-2xl border flex flex-col gap-4">
        <div className="flex gap-4 items-start">
          {media.posterUrl ? (
            <Image
              src={media.posterUrl}
              alt={media.title}
              width={80}
              height={120}
              className="rounded-md object-cover aspect-2/3 w-20"
            />
          ) : (
            <div className="w-20 aspect-2/3 bg-muted rounded-md flex items-center justify-center text-xs text-muted-foreground">
              No Art
            </div>
          )}

          <div className="flex-1 min-w-0">
            <span className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">
              {media.mediaType}
            </span>
            <h2 className="text-lg font-bold truncate">{media.title}</h2>
            {media.releaseYear && (
              <p className="text-xs text-muted-foreground">{media.releaseYear}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
            <Select value={status} onValueChange={(val) => setStatus(val as typeof status)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="want_to">Want to Watch/Play</SelectItem>
                <SelectItem value="doing">Doing Right Now</SelectItem>
                <SelectItem value="done">Finished (Done)</SelectItem>
                <SelectItem value="dropped">Dropped</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Score (1-10)
            </label>
            <Select
              value={rating?.toString() ?? "none"}
              onValueChange={(val) => setRating(val === "none" ? null : Number(val))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Rating</SelectItem>
                {Array.from({ length: 10 }, (_, i) => 10 - i).map((n) => (
                  <SelectItem key={n} value={n.toString()}>
                    {n} / 10
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Quick Note (Optional)
          </label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What did you think? (Ending was crazy, etc.)"
            rows={2}
            className="text-sm"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={() => saveEntry()} disabled={isPending}>
            {isPending ? "Saving..." : "Save to Stash"}
          </Button>
        </div>
      </div>
    </div>
  );
}
