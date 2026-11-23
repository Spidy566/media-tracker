"use client";

import { Check, Play, Plus, RotateCcw, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { PosterImage } from "@/components/poster-image";
import type { MediaStatus } from "@/db/schema";
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
  showStatusDot?: boolean;
  allowedStatuses?: ("want_to" | "doing" | "done")[];
  onQuickStatus?: (status: "want_to" | "doing" | "done") => void;
  onClick?: () => void;
  priority?: boolean;
  isAnchored?: boolean;
  onAnchor?: () => void;
}

// Traffic-light status dots (10px solid dot inside dark pill)
const STATUS_DOT_COLOR: Record<MediaStatus, string> = {
  want_to: "bg-[#8A8F98]", // Slate gray
  doing: "bg-[#E3A94B]", // Amber
  done: "bg-[#4FB286]", // Sage green
  dropped: "bg-[#6B6B76]", // Muted gray
};

const STATUS_LABELS: Record<MediaStatus, string> = {
  want_to: "Queue",
  doing: "In Progress",
  done: "Done",
  dropped: "Dropped",
};

export function MediaCard({
  title,
  mediaType,
  posterUrl,
  releaseYear,
  currentStatus,
  showStatusDot = true,
  onQuickStatus,
  onClick,
  priority = false,
  isAnchored = false,
  onAnchor,
}: MediaCardProps) {
  // One clean icon for the next logical action
  const getNextAction = () => {
    switch (currentStatus) {
      case "want_to":
        return {
          nextStatus: "doing" as const,
          label: "Start (Move to In Progress)",
          icon: Play,
        };
      case "doing":
        return {
          nextStatus: "done" as const,
          label: "Finish (Mark Done)",
          icon: Check,
        };
      case "done":
        return {
          nextStatus: "want_to" as const,
          label: "Undo (Move back to Queue)",
          icon: RotateCcw,
        };
      default:
        return {
          nextStatus: "want_to" as const,
          label: "Add to Queue",
          icon: Plus,
        };
    }
  };

  const action = getNextAction();
  const ActionIcon = action.icon;

  const handleAdvance = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onQuickStatus) {
      onQuickStatus(action.nextStatus);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onClick();
    }
  };

  const mediumLabel = mediaType === "movie" ? "Film" : mediaType === "tv" ? "TV" : "Game";

  return (
    <article
      className="group flex flex-col w-full select-none cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-brand rounded-xl"
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* 2:3 Poster Surface with dark glass aesthetic */}
      <div className="relative aspect-2/3 w-full overflow-hidden rounded-lg bg-[#16181D] ring-1 ring-inset ring-white/10 transition duration-150 group-hover:-translate-y-0.5 group-hover:ring-white/20">
        <PosterImage
          src={posterUrl}
          title={title}
          mediaType={mediaType}
          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 15vw"
          priority={priority}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-102"
        />

        {/* Top-Right: Traffic-Light Status Dot (Visible only when tracked and showStatusDot is enabled) */}
        {currentStatus && showStatusDot && (
          <span
            title={STATUS_LABELS[currentStatus]}
            className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-black/60 backdrop-blur-xs"
          >
            <span className={cn("h-2.5 w-2.5 rounded-full", STATUS_DOT_COLOR[currentStatus])} />
          </span>
        )}

        {/* Top-Left: Anchor / Related Action (Explore page only) */}
        {onAnchor && (
          <button
            type="button"
            title={isAnchored ? "Clear anchor" : "Find related titles"}
            onClick={(e) => {
              e.stopPropagation();
              onAnchor();
            }}
            className={cn(
              "absolute top-2 left-2 p-1.5 rounded-full transition backdrop-blur-md shadow-xs cursor-pointer z-10",
              isAnchored
                ? "bg-brand text-brand-foreground shadow-brand/40 opacity-100"
                : "bg-black/60 hover:bg-black/80 text-muted-foreground hover:text-white border border-white/10 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100",
            )}
          >
            <Sparkles className="size-3.5" />
          </button>
        )}

        {/* Bottom-Right: Dark Glass Circle with Thin White Line Icon */}
        {onQuickStatus && (
          <button
            type="button"
            aria-label={action.label}
            title={action.label}
            onClick={handleAdvance}
            className="absolute bottom-2 right-2 grid size-9 place-items-center rounded-full bg-black/60 text-white ring-1 ring-white/15 opacity-0 transition duration-150 hover:bg-black/80 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 cursor-pointer shadow-md active:scale-95 z-10"
          >
            <ActionIcon className="h-4 w-4" strokeWidth={1.75} />
          </button>
        )}
      </div>

      {/* Underneath: Title + Year / Medium line */}
      <h3 className="mt-2 truncate text-[13px] font-medium text-[#ECEDEF] tracking-tight font-sans">
        {title}
      </h3>
      <p className="text-xs text-[#A1A5AD] font-mono mt-0.5">
        {releaseYear || "TBA"} · {mediumLabel}
      </p>
    </article>
  );
}
