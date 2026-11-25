"use client";

import { Anchor, Bookmark, Check, Play } from "lucide-react";
import Link from "next/link";
import { PosterImage } from "@/components/poster-image";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { MediaStatus } from "@/db/schema";
import { cn } from "@/lib/utils";

export type { MediaStatus };

type QuickStatus = "want_to" | "doing" | "done";

const STATUS_ACTIONS: Array<{
  status: QuickStatus;
  label: string;
  activeLabel: string;
  icon: typeof Bookmark;
  activeClass: string;
}> = [
  {
    status: "want_to",
    label: "Queue",
    activeLabel: "In Queue",
    icon: Bookmark,
    activeClass: "bg-foreground/15 text-foreground",
  },
  {
    status: "doing",
    label: "In Progress",
    activeLabel: "Playing / Watching",
    icon: Play,
    activeClass: "bg-status-doing/20 text-status-doing",
  },
  {
    status: "done",
    label: "Done",
    activeLabel: "Completed",
    icon: Check,
    activeClass: "bg-status-done/20 text-status-done",
  },
];

export interface MediaCardProps {
  title: string;
  mediaType: "movie" | "tv" | "game";
  posterUrl: string | null;
  releaseYear?: number | null;
  subtitle?: string | null;
  href?: string;
  currentStatus?: MediaStatus | null;
  /** Active library tab context: "all" displays action row on touch devices */
  activeTab?: string;
  allowedStatuses?: QuickStatus[];
  onQuickStatus?: (status: QuickStatus) => void;
  onRemove?: () => void;
  isAnchored?: boolean;
  onAnchor?: () => void;
  onClick?: () => void;
  priority?: boolean;
}

export function MediaCard({
  title,
  mediaType,
  posterUrl,
  releaseYear,
  subtitle,
  href,
  currentStatus = null,
  activeTab,
  allowedStatuses = ["want_to", "doing", "done"],
  onQuickStatus,
  onRemove,
  isAnchored = false,
  onAnchor,
  onClick,
  priority = false,
}: MediaCardProps) {
  const statusAttribute =
    currentStatus === "want_to"
      ? "queue"
      : currentStatus === "doing"
        ? "progress"
        : currentStatus === "done"
          ? "done"
          : "none";

  const touchActionClasses = activeTab === "all" ? "[@media(hover:none)]:opacity-100" : "";
  const fullTitle = `${title}${releaseYear ? ` (${releaseYear})` : ""}`;
  const visibleActions = STATUS_ACTIONS.filter((a) => allowedStatuses.includes(a.status));

  return (
    <TooltipProvider delayDuration={350}>
      <article
        data-status={statusAttribute}
        className="group relative flex flex-col w-full select-none"
      >
        {/* 2:3 Poster Frame */}
        <div className="relative aspect-2/3 w-full overflow-hidden rounded-md bg-card">
          <PosterImage
            src={posterUrl}
            title={title}
            mediaType={mediaType}
            releaseYear={releaseYear}
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 15vw"
            priority={priority}
            className="object-cover"
          />

          {/* Hairline Ring (highlights in brand color when anchored) */}
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-0 z-10 rounded-md transition-colors duration-150",
              isAnchored
                ? "ring-2 ring-inset ring-brand"
                : "ring-1 ring-inset ring-border group-hover:ring-foreground/25 group-focus-within:ring-foreground/25",
            )}
          />

          {/* Flat dark veil on hover */}
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-0 z-10 bg-black/40 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100",
              touchActionClasses,
            )}
          />

          {/* Primary Stretched Navigation Link with Tooltip */}
          <Tooltip>
            <TooltipTrigger asChild>
              {href ? (
                <Link
                  href={href}
                  aria-label={fullTitle}
                  className="absolute inset-0 z-10 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              ) : onClick ? (
                <button
                  type="button"
                  aria-label={fullTitle}
                  onClick={onClick}
                  className="absolute inset-0 z-10 w-full h-full cursor-pointer rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              ) : (
                <div className="absolute inset-0 z-10 rounded-md" />
              )}
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={6}>
              <div className="text-center">
                <span>{fullTitle}</span>
                {subtitle && (
                  <span className="block text-[10px] text-muted-foreground">{subtitle}</span>
                )}
              </div>
            </TooltipContent>
          </Tooltip>

          {/* Top-right Anchor trigger (Explore similarity mode) */}
          {onAnchor && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={isAnchored ? "Clear anchor" : `Find titles similar to ${title}`}
                  aria-pressed={isAnchored}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAnchor();
                  }}
                  className={cn(
                    "absolute top-2 right-2 z-20 grid size-7.5 place-items-center rounded-full border transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isAnchored
                      ? "bg-brand text-brand-foreground border-brand opacity-100 shadow-sm"
                      : "bg-background/90 border-border text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100",
                  )}
                >
                  <Anchor className="size-3.5" strokeWidth={1.75} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={6}>
                {isAnchored ? "Clear anchor" : "Find similar"}
              </TooltipContent>
            </Tooltip>
          )}

          {/* Quick-Status Icon Row */}
          {onQuickStatus && visibleActions.length > 0 && (
            <div
              className={cn(
                "pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100",
                touchActionClasses,
                activeTab === "all" ? "[@media(hover:none)]:pointer-events-auto" : "",
              )}
            >
              <div className="flex items-center gap-1 rounded-full bg-background/95 p-1 border border-border">
                {visibleActions.map((action) => {
                  const Icon = action.icon;
                  const isActive = currentStatus === action.status;
                  const tooltipText =
                    isActive && onRemove
                      ? "Remove from library"
                      : isActive
                        ? action.activeLabel
                        : action.label;

                  return (
                    <Tooltip key={action.status}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label={tooltipText}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isActive && onRemove) {
                              onRemove();
                              return;
                            }
                            onQuickStatus(action.status);
                          }}
                          className={cn(
                            "grid size-7.5 place-items-center rounded-full transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            isActive
                              ? action.activeClass
                              : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                        >
                          <Icon
                            className="size-3.5"
                            strokeWidth={action.status === "done" ? 2 : 1.75}
                          />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" sideOffset={8}>
                        {tooltipText}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </article>
    </TooltipProvider>
  );
}
