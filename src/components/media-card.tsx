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
    <div className="flex flex-col gap-1.5 w-full group select-none">
      {/* Poster Container */}
      <div className="relative aspect-2/3 w-full rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800/80 group-hover:border-zinc-700 transition-all duration-200">
        {/* Full-card click trigger for opening details (z-0) */}
        {onClick && (
          <button
            type="button"
            aria-label={`View details for ${title}`}
            onClick={onClick}
            className="absolute inset-0 z-0 w-full h-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
          />
        )}

        {/* Poster Artwork */}
        {posterUrl ? (
          <Image
            src={posterUrl}
            alt={title}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 15vw"
            className="object-cover transition duration-200 group-hover:scale-[1.02] pointer-events-none"
            priority={priority}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-zinc-900 pointer-events-none">
            <span className="font-medium text-xs text-zinc-400 line-clamp-2">{title}</span>
            <span className="text-[10px] text-zinc-600 mt-1 uppercase font-mono">{mediaType}</span>
          </div>
        )}

        {/* Top Floating Badge & Rating (z-10) */}
        <div className="absolute top-2 inset-x-2 flex items-center justify-between gap-1 z-10 pointer-events-none">
          {badge ? <div className="pointer-events-auto">{badge}</div> : <div />}
          {rating && (
            <span className="bg-zinc-950/80 backdrop-blur-md text-amber-400 font-semibold text-[11px] px-1.5 py-0.5 rounded border border-amber-500/20 flex items-center gap-0.5 shadow-xs pointer-events-auto">
              ★ {rating}
            </span>
          )}
        </div>

        {/* Letterboxd-Style 1-Click Hover Actions (z-20) */}
        {onQuickStatus && (
          <div className="absolute bottom-2 inset-x-2 z-20 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <div className="flex items-center gap-0.5 bg-zinc-950/90 backdrop-blur-md p-1 rounded-lg border border-zinc-800 shadow-xl">
              {/* 1. Queue / Backlog */}
              <button
                type="button"
                title="Add to Queue"
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickStatus("want_to");
                }}
                className={`p-1.5 rounded-md transition cursor-pointer ${
                  currentStatus === "want_to"
                    ? "bg-amber-500/20 text-amber-400"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
              </button>

              {/* 2. In Progress */}
              <button
                type="button"
                title="Currently Playing / Watching"
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickStatus("doing");
                }}
                className={`p-1.5 rounded-md transition cursor-pointer ${
                  currentStatus === "doing"
                    ? "bg-sky-500/20 text-sky-400"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                }`}
              >
                <Play className="w-3.5 h-3.5" />
              </button>

              {/* 3. Completed */}
              <button
                type="button"
                title="Finished"
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickStatus("done");
                }}
                className={`p-1.5 rounded-md transition cursor-pointer ${
                  currentStatus === "done"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                }`}
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Metadata Underneath */}
      <div className="flex flex-col min-w-0">
        <h4 className="text-xs font-medium text-zinc-200 truncate group-hover:text-white transition leading-tight">
          {title}
        </h4>
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mt-0.5">
          <span>{releaseYear || "TBA"}</span>
          <span>•</span>
          <span className="uppercase text-[10px] tracking-wider font-mono">
            {mediaType === "tv" ? "TV" : mediaType}
          </span>
          {subtitle && (
            <>
              <span>•</span>
              <span className="truncate text-zinc-400">{subtitle}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
