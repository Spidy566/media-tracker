"use client";

import { Dices, Play, RefreshCw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PosterImage } from "@/components/poster-image";
import { getMediaTypeLabel } from "@/lib/media-formatters";
import { getMediaHref } from "@/lib/utils";
import type { Entry } from "@/types/entry";

interface QueueRouletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: Entry[];
  onStartDoing: (entry: Entry) => void;
}

export function QueueRouletteModal({
  isOpen,
  onClose,
  entries,
  onStartDoing,
}: QueueRouletteModalProps) {
  const router = useRouter();
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);

  // Spin roulette logic
  const spin = useCallback(() => {
    if (entries.length === 0) return;
    setIsSpinning(true);

    let counter = 0;
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * entries.length);
      setSelectedEntry(entries[randomIndex]);
      counter++;

      if (counter > 14) {
        clearInterval(interval);
        const finalIndex = Math.floor(Math.random() * entries.length);
        setSelectedEntry(entries[finalIndex]);
        setIsSpinning(false);
      }
    }, 70);
  }, [entries]);

  useEffect(() => {
    if (isOpen && entries.length > 0) {
      spin();
    }
  }, [isOpen, entries.length, spin]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
      <div className="relative w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
        >
          <X className="size-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-xl bg-brand/15 text-brand flex items-center justify-center">
            <Dices className="size-4.5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground font-sans">Queue Roulette</h3>
            <p className="text-xs text-muted-foreground">
              Don&apos;t know what to watch or play? Let fate decide.
            </p>
          </div>
        </div>

        {/* Selected Result */}
        {entries.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            Your queue is empty! Add a few movies, TV series, or games to use the roulette.
          </div>
        ) : selectedEntry ? (
          <div className="flex flex-col items-center text-center gap-3 py-2">
            <div className="relative aspect-2/3 w-36 rounded-2xl overflow-hidden shadow-xl border border-border">
              <PosterImage
                src={selectedEntry.media.posterUrl}
                title={selectedEntry.media.title}
                mediaType={selectedEntry.media.mediaType}
                sizes="150px"
                className="object-cover"
              />
            </div>

            <div className="flex flex-col gap-1 items-center">
              <span className="text-[10px] uppercase font-bold font-mono tracking-wider px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground">
                {getMediaTypeLabel(selectedEntry.media.mediaType)} ·{" "}
                {selectedEntry.media.releaseYear || "TBA"}
              </span>
              <h4 className="text-lg font-bold text-foreground tracking-tight font-sans">
                {selectedEntry.media.title}
              </h4>
              {selectedEntry.media.summary && (
                <p className="text-xs text-muted-foreground line-clamp-2 max-w-xs mt-1">
                  {selectedEntry.media.summary}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 w-full pt-3">
              <button
                type="button"
                disabled={isSpinning}
                onClick={spin}
                className="flex-1 py-2 px-3 rounded-xl border border-border bg-secondary hover:bg-muted text-foreground text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`size-3.5 ${isSpinning ? "animate-spin" : ""}`} />
                Spin again
              </button>

              <button
                type="button"
                disabled={isSpinning}
                onClick={() => {
                  onStartDoing(selectedEntry);
                  onClose();
                  router.push(getMediaHref(selectedEntry.media));
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-brand text-brand-foreground text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-brand/90 transition cursor-pointer active:scale-[0.98] shadow-sm disabled:opacity-50"
              >
                <Play className="size-3.5 fill-current" />
                Let&apos;s start!
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
