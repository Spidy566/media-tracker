"use client";

import { Bookmark, Check, Play } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";

export type MediaStatus = "want_to" | "doing" | "done" | "dropped";

interface MediaCardProps {
  title: string;
  mediaType: "movie" | "tv" | "game";
  posterUrl: string | null;
  releaseYear?: number | null;
  badge?: ReactNode;
  rating?: number | null;
  subtitle?: string | null;
  currentStatus?: MediaStatus | null;
  onQuickStatus?: (status: "want_to" | "doing" | "done") => void;
  onClick?: () => void;
  priority?: boolean;
}

const isStealthMode = process.env.NEXT_PUBLIC_STEALTH_MODE === "true";

export function MediaCard({
  title,
  mediaType,
  posterUrl,
  releaseYear,
  badge,
  rating,
  subtitle,
  currentStatus,
  onQuickStatus,
  onClick,
  priority = false,
}: MediaCardProps) {
  return (
    <div className="flex flex-col gap-2 w-full group select-none">
      {/* Poster Container */}
      <div className="relative aspect-2/3 w-full rounded-2xl overflow-hidden bg-muted border border-border group-hover:border-foreground/30 group-hover:shadow-lg transition-all duration-200">
        {onClick && (
          <button
            type="button"
            aria-label={`View details for ${title}`}
            onClick={onClick}
            className="absolute inset-0 z-0 w-full h-full cursor-pointer focus:outline-none"
          />
        )}

        {posterUrl && !isStealthMode ? (
          <Image
            src={posterUrl}
            alt={title}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 15vw"
            className="object-cover transition duration-300 group-hover:scale-103 pointer-events-none"
            priority={priority}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-muted pointer-events-none">
            <span className="font-semibold text-xs text-foreground line-clamp-2">{title}</span>
            <span className="text-[10px] text-muted-foreground mt-1 uppercase font-mono">
              {mediaType}
            </span>
          </div>
        )}

        {/* Top Floating Badge */}
        <div className="absolute top-2 inset-x-2 flex items-center justify-between gap-1 z-10 pointer-events-none">
          {badge ? <div className="pointer-events-auto">{badge}</div> : <div />}
          {rating ? (
            <span className="bg-background/90 text-amber-500 font-bold text-[10px] px-2 py-0.5 rounded-full border border-border shadow-xs pointer-events-auto">
              ★ {rating}
            </span>
          ) : null}
        </div>

        {/* Quick Status Buttons */}
        {onQuickStatus && (
          <div className="absolute bottom-2 inset-x-2 z-20 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <div className="flex items-center gap-0.5 bg-background/95 backdrop-blur-md p-1 rounded-full border border-border shadow-lg">
              <button
                type="button"
                title="Add to Queue"
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickStatus("want_to");
                }}
                className={`p-1.5 rounded-full transition cursor-pointer ${
                  currentStatus === "want_to"
                    ? "bg-amber-400 text-black font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                title="Currently In Progress"
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickStatus("doing");
                }}
                className={`p-1.5 rounded-full transition cursor-pointer ${
                  currentStatus === "doing"
                    ? "bg-sky-400 text-black font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Play className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                title="Completed"
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickStatus("done");
                }}
                className={`p-1.5 rounded-full transition cursor-pointer ${
                  currentStatus === "done"
                    ? "bg-emerald-400 text-black font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Title & Metadata */}
      <div className="flex flex-col min-w-0">
        <h4 className="text-xs font-bold text-foreground truncate group-hover:text-emerald-500 transition">
          {title}
        </h4>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
          <span>{releaseYear || "TBA"}</span>
          <span>•</span>
          <span className="uppercase text-[10px] font-mono tracking-wider font-semibold">
            {mediaType === "tv" ? "TV" : mediaType}
          </span>
          {subtitle && (
            <>
              <span>•</span>
              <span className="truncate text-foreground/80">{subtitle}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
