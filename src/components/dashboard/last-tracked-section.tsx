"use client";

import { Clock, Star } from "lucide-react";
import Link from "next/link";
import { PosterImage } from "@/components/poster-image";
import {
  formatRelativeTime,
  getMediaTypeLabel,
  getStatusBadgeClasses,
  getStatusLabel,
  MediaTypeIcon,
} from "@/lib/media-formatters";
import { cn, getMediaHref } from "@/lib/utils";
import type { Entry } from "@/types/entry";

interface LastTrackedSectionProps {
  recentEntries: Entry[];
}

export function LastTrackedSection({ recentEntries }: LastTrackedSectionProps) {
  if (recentEntries.length === 0) return null;

  return (
    <section aria-label="Recent Activity" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2.5 font-sans">
          <Clock className="size-4.5 text-muted-foreground" />
          <span>Last Tracked</span>
        </h2>
        <Link
          href="/library"
          className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition flex items-center gap-1"
        >
          <span>Open library</span>
          <span className="text-muted-foreground">&rarr;</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {recentEntries.map((entry) => (
          <Link
            key={entry.id}
            href={getMediaHref(entry.media)}
            className="group p-3 rounded-2xl bg-card border border-border hover:border-border/80 transition-all flex items-start gap-3 cursor-pointer shadow-2xs hover:shadow-xs select-none block"
          >
            {/* Poster Thumbnail */}
            <div className="relative w-12 sm:w-14 aspect-2/3 rounded-xl overflow-hidden bg-muted border border-border shrink-0">
              <PosterImage
                src={entry.media.posterUrl}
                title={entry.media.title}
                mediaType={entry.media.mediaType}
                sizes="60px"
                className="object-cover transition duration-200 group-hover:scale-105"
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 self-stretch">
              <div>
                <h4 className="text-xs sm:text-sm font-semibold text-foreground truncate group-hover:text-brand transition-colors font-sans">
                  {entry.media.title}
                </h4>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                  <span className="flex items-center gap-1">
                    <MediaTypeIcon type={entry.media.mediaType} className="size-3" />
                    <span>{getMediaTypeLabel(entry.media.mediaType)}</span>
                  </span>
                  {entry.media.releaseYear && (
                    <>
                      <span>•</span>
                      <span className="font-mono tabular-nums">{entry.media.releaseYear}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Status pill + Rating + Time */}
              <div className="flex items-center justify-between gap-1 mt-2">
                <span
                  className={cn(
                    "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                    getStatusBadgeClasses(entry.status),
                  )}
                >
                  {getStatusLabel(entry.status)}
                </span>

                <div className="flex items-center gap-2">
                  {entry.rating && (
                    <span className="text-[10px] font-bold text-rating flex items-center gap-0.5 font-mono tabular-nums">
                      <Star className="size-3 fill-rating" />
                      <span>{entry.rating}</span>
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground/70 font-mono">
                    {formatRelativeTime(new Date(entry.updatedAt))}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
