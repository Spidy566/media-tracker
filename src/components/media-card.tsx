"use client";

import { Bookmark, Check, Play, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { PosterImage } from "@/components/poster-image";
import type { MediaStatus } from "@/db/schema";
import { getMediaTypeLabel } from "@/lib/media-formatters";
import { cn } from "@/lib/utils";

export type { MediaStatus };

interface MediaCardProps {
  title: string;
  mediaType: "movie" | "tv" | "game";
  posterUrl: string | null;
  releaseYear?: number | null;
  badge?: ReactNode;
  rating?: number | null;
  subtitle?: string | null;
  currentStatus?: MediaStatus | null;
  allowedStatuses?: ("want_to" | "doing" | "done")[];
  onQuickStatus?: (status: "want_to" | "doing" | "done") => void;
  onClick?: () => void;
  priority?: boolean;
  isAnchored?: boolean;
  onAnchor?: () => void;
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
  allowedStatuses = ["want_to", "doing", "done"],
  onQuickStatus,
  onClick,
  priority = false,
  isAnchored = false,
  onAnchor,
}: MediaCardProps) {
  return (
    <div className="flex flex-col gap-2 w-full group select-none">
      {/* Poster Container */}
      <div
        className={cn(
          "relative aspect-2/3 w-full rounded-2xl overflow-hidden bg-muted border border-border group-hover:border-foreground/30 group-hover:shadow-lg transition-all duration-200",
          isAnchored && "ring-2 ring-brand shadow-2xl shadow-brand/20 scale-[1.02] z-20 border-brand",
        )}
      >
        {onClick && (
          <button
            type="button"
            aria-label={`View details for ${title}`}
            onClick={onClick}
            className="absolute inset-0 z-0 w-full h-full cursor-pointer focus:outline-none"
          />
        )}

        <PosterImage
          src={posterUrl}
          title={title}
          mediaType={mediaType}
          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 15vw"
          priority={priority}
          className="object-cover transition duration-300 group-hover:scale-103 pointer-events-none"
        />

        {/* Top Floating Badge & Anchor Button */}
        <div className="absolute top-2 inset-x-2 flex items-center justify-between gap-1 z-10 pointer-events-none">
          <div className="flex items-center gap-1">
            {badge && <div className="pointer-events-auto">{badge}</div>}
            {onAnchor && (
              <button
                type="button"
                title={isAnchored ? "Clear anchor" : "Find related titles"}
                onClick={(e) => {
                  e.stopPropagation();
                  onAnchor();
                }}
                className={cn(
                  "p-1.5 rounded-full transition cursor-pointer pointer-events-auto backdrop-blur-md shadow-xs",
                  isAnchored
                    ? "bg-brand text-brand-foreground shadow-brand/40"
                    : "bg-background/80 hover:bg-background text-muted-foreground hover:text-brand border border-border opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100",
                )}
              >
                <Sparkles className="size-3.5" />
              </button>
            )}
          </div>
          {rating ? (
            <span className="bg-background/90 text-rating font-bold font-mono tabular-nums text-[10px] px-2 py-0.5 rounded-full border border-border shadow-xs pointer-events-auto">
              ★ {rating}
            </span>
          ) : null}
        </div>

        {/* Quick Status Buttons */}
        {onQuickStatus && (
          <div className="absolute bottom-2 inset-x-2 z-20 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity duration-150">
            <div className="flex items-center gap-0.5 bg-background/95 backdrop-blur-md p-1 rounded-full border border-border shadow-lg">
              {allowedStatuses.includes("want_to") && (
                <button
                  type="button"
                  title="Add to Queue"
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuickStatus("want_to");
                  }}
                  className={`p-1.5 rounded-full transition cursor-pointer ${
                    currentStatus === "want_to"
                      ? "bg-status-queue/20 text-status-queue border border-status-queue/40 font-bold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                </button>
              )}

              {allowedStatuses.includes("doing") && (
                <button
                  type="button"
                  title="Currently In Progress"
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuickStatus("doing");
                  }}
                  className={`p-1.5 rounded-full transition cursor-pointer ${
                    currentStatus === "doing"
                      ? "bg-status-doing/20 text-status-doing border border-status-doing/40 font-bold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Play className="w-3.5 h-3.5" />
                </button>
              )}

              {allowedStatuses.includes("done") && (
                <button
                  type="button"
                  title="Completed"
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuickStatus("done");
                  }}
                  className={`p-1.5 rounded-full transition cursor-pointer ${
                    currentStatus === "done"
                      ? "bg-status-done/20 text-status-done border border-status-done/40 font-bold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Title & Metadata */}
      <div className="flex flex-col min-w-0">
        <h4 className="text-xs font-semibold text-foreground truncate group-hover:opacity-80 transition">
          {title}
        </h4>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
          <span className="font-mono tabular-nums">{releaseYear || "TBA"}</span>
          <span>•</span>
          <span>{getMediaTypeLabel(mediaType)}</span>
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
