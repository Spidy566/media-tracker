"use client";

import { Check, Play } from "lucide-react";
import Link from "next/link";
import { PosterImage } from "@/components/poster-image";
import { ScrollRow } from "@/components/scroll-row";
import { getMediaTypeLabel, MediaTypeIcon } from "@/lib/media-formatters";
import { getMediaHref } from "@/lib/utils";
import type { Entry } from "@/types/entry";

interface JumpBackInSectionProps {
  activeItems: Entry[];
  onMarkDone: (entry: Entry) => void;
  isPending?: boolean;
}

export function JumpBackInSection({
  activeItems,
  onMarkDone,
  isPending = false,
}: JumpBackInSectionProps) {
  if (activeItems.length === 0) {
    return (
      <section aria-label="Jump Back In">
        <div className="flex items-center justify-between pb-3">
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2.5 font-sans">
            <Play className="size-4.5 fill-status-doing text-status-doing stroke-0" />
            <span>Jump Back In</span>
          </h2>
        </div>
        <div className="p-8 rounded-2xl bg-card border border-dashed border-border flex flex-col items-center justify-center text-center gap-2">
          <Play className="size-6 text-muted-foreground/60" />
          <p className="text-sm font-semibold text-foreground">Nothing currently in progress</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            Pick a title from your Queue or press{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono text-muted-foreground border border-border">
              ⌘K
            </kbd>{" "}
            to log what you are watching or playing.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Continue Watching or Playing">
      <ScrollRow
        title={
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2.5 font-sans">
            <Play className="size-4.5 fill-status-doing text-status-doing stroke-0" />
            <span>Jump Back In</span>
            <span className="text-sm font-normal text-muted-foreground font-mono tabular-nums">
              ({activeItems.length})
            </span>
          </h2>
        }
        action={
          <Link
            href="/library?status=doing"
            className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition flex items-center gap-1"
          >
            <span>View all</span>
            <span className="text-muted-foreground">&rarr;</span>
          </Link>
        }
      >
        {activeItems.map((entry, idx) => (
          <div
            key={entry.id}
            className="w-72 sm:w-88 aspect-16/10 rounded-2xl overflow-hidden bg-card border border-border group relative shrink-0 snap-start select-none shadow-xs hover:shadow-md transition-all duration-200"
          >
            {/* Click to details */}
            <Link
              href={getMediaHref(entry.media)}
              className="absolute inset-0 z-10 cursor-pointer"
              aria-label={`View details for ${entry.media.title}`}
            />

            {/* Backdrop / Poster Image */}
            <PosterImage
              src={entry.media.backdropUrl || entry.media.posterUrl}
              title={entry.media.title}
              mediaType={entry.media.mediaType}
              releaseYear={entry.media.releaseYear}
              sizes="(max-width: 640px) 288px, 352px"
              loading={idx < 2 ? "eager" : undefined}
              className="object-cover transition duration-500 group-hover:scale-105 pointer-events-none"
            />

            {/* Dark bottom gradient scrim */}
            <div className="absolute inset-0 bg-linear-to-t from-black/95 via-black/40 to-transparent pointer-events-none z-10" />

            {/* Top-left: Media Type Pill + Release Year */}
            <div className="absolute top-3 left-3 z-20 pointer-events-none flex items-center gap-1.5">
              <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-black/60 text-foreground border border-white/10 backdrop-blur-md flex items-center gap-1">
                <MediaTypeIcon type={entry.media.mediaType} className="size-3" />
                <span>{getMediaTypeLabel(entry.media.mediaType)}</span>
              </span>
              {entry.media.releaseYear && (
                <span className="text-[11px] font-mono tabular-nums text-white/80 bg-black/50 px-2 py-0.5 rounded-full backdrop-blur-md border border-white/10">
                  {entry.media.releaseYear}
                </span>
              )}
            </div>

            {/* Bottom Content & 1-click Mark Done */}
            <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-4 z-20 flex items-end justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-semibold text-white tracking-tight truncate drop-shadow-sm group-hover:text-brand transition-colors font-sans">
                  {entry.media.title}
                </h3>
                {entry.media.genres && entry.media.genres.length > 0 && (
                  <p className="text-[11px] text-white/70 truncate mt-0.5 font-medium">
                    {entry.media.genres.slice(0, 2).join(" · ")}
                  </p>
                )}
              </div>

              {/* 1-click Quick Complete Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkDone(entry);
                }}
                disabled={isPending}
                title="Mark as Completed"
                aria-label={`Mark ${entry.media.title} as completed`}
                className="z-30 p-2 rounded-xl bg-status-done text-background hover:bg-status-done/90 shadow-xs cursor-pointer transition active:scale-95 shrink-0 flex items-center justify-center font-bold"
              >
                <Check className="size-4 stroke-[2.75]" />
              </button>
            </div>
          </div>
        ))}
      </ScrollRow>
    </section>
  );
}
